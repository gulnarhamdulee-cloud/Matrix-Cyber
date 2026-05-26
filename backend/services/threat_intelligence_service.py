import asyncio
import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import get_settings
from models.vulnerability import Vulnerability, VulnerabilityType
from agents.base_agent import AgentResult

settings = get_settings()

class ThreatIntelligenceService:
    """
    Service for aggregating real-time threat intelligence from NVD and CISA.
    Computes trend scores and generates AI-driven exploit summaries.
    """
    
    def __init__(self):
        self.cache_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
        os.makedirs(self.cache_dir, exist_ok=True)
        self.nvd_cache_file = os.path.join(self.cache_dir, "nvd_cache.json")
        self.cisa_cache_file = os.path.join(self.cache_dir, "cisa_cache.json")
        self.cache_ttl = settings.threat_intelligence_cache_ttl_hours * 3600
        
        # Mapping Matrix Vuln Types to NVD keyword searches
        self.vuln_type_keywords = {
            VulnerabilityType.SQL_INJECTION: ["SQL Injection", "SQLi"],
            VulnerabilityType.XSS_DOM: ["DOM XSS", "Cross-site Scripting"],
            VulnerabilityType.XSS_REFLECTED: ["Reflected XSS", "Cross-site Scripting"],
            VulnerabilityType.XSS_STORED: ["Stored XSS", "Cross-site Scripting"],
            VulnerabilityType.OS_COMMAND_INJECTION: ["Command Injection", "RCE"],
            VulnerabilityType.CODE_INJECTION: ["Code Injection", "RCE"],
            VulnerabilityType.CSRF: ["CSRF", "Cross-Site Request Forgery"],
            VulnerabilityType.SSRF: ["SSRF", "Server Side Request Forgery"],
            VulnerabilityType.BROKEN_AUTH: ["Authentication Bypass", "Broken Authentication"],
            VulnerabilityType.API_AUTH_BYPASS: ["API Authentication Bypass"],
        }

    async def _get_cached_data(self, cache_file: str) -> Optional[Dict]:
        """Retrieve data from local cache if valid."""
        if not os.path.exists(cache_file):
            return None
        
        try:
            with open(cache_file, 'r') as f:
                data = json.load(f)
                timestamp = data.get("timestamp", 0)
                if time.time() - timestamp < self.cache_ttl:
                    return data.get("content")
        except Exception as e:
            print(f"[ThreatIntel] Cache read error: {e}")
        return None

    async def _save_to_cache(self, cache_file: str, content: Any):
        """Save data to local cache."""
        try:
            with open(cache_file, 'w') as f:
                json.dump({
                    "timestamp": time.time(),
                    "content": content
                }, f)
        except Exception as e:
            print(f"[ThreatIntel] Cache write error: {e}")

    async def fetch_nvd_data(self) -> Dict:
        """Fetch last 30 days of vulnerabilities from NVD."""
        cached = await self._get_cached_data(self.nvd_cache_file)
        if cached:
            return cached

        print("[ThreatIntel] Refreshing NVD data...")
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=30)
        
        # NVD v2 API format: 2023-01-01T00:00:00.000
        date_format = "%Y-%m-%dT%H:%M:%S.000"
        url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate={start_date.strftime(date_format)}&pubEndDate={end_date.strftime(date_format)}"
        
        headers = {}
        if settings.nvd_api_key:
            headers["apiKey"] = settings.nvd_api_key

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                await self._save_to_cache(self.nvd_cache_file, data)
                return data
        except Exception as e:
            print(f"[ThreatIntel] NVD Fetch failed: {e}")
            return await self._get_cached_data(self.nvd_cache_file) or {}

    async def fetch_cisa_data(self) -> Dict:
        """Fetch CISA Known Exploited Vulnerabilities Catalog."""
        # 1. Check if a local file is configured and exists
        if settings.cisa_kev_file_path and os.path.exists(settings.cisa_kev_file_path):
            print(f"[ThreatIntel] Using local CISA data from {settings.cisa_kev_file_path}")
            try:
                with open(settings.cisa_kev_file_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[ThreatIntel] Failed to read local CISA file: {e}")

        # 2. Check cache
        cached = await self._get_cached_data(self.cisa_cache_file)
        if cached:
            return cached

        # 3. Fetch from remote
        print("[ThreatIntel] Refreshing CISA data from remote...")
        url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
        
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                await self._save_to_cache(self.cisa_cache_file, data)
                return data
        except Exception as e:
            print(f"[ThreatIntel] CISA Fetch failed: {e}")
            return await self._get_cached_data(self.cisa_cache_file) or {}

    def compute_trend_score(self, vuln_type: VulnerabilityType, nvd_data: Dict, cisa_data: Dict) -> Dict:
        """
        Determine trending status and score for a vulnerability type.
        """
        keywords = self.vuln_type_keywords.get(vuln_type, [vuln_type.value.replace('_', ' ')])
        
        # Filter NVD for matches
        vulnerabilities = nvd_data.get("vulnerabilities", [])
        matches = []
        cvss_scores = []
        
        for v in vulnerabilities:
            cve = v.get("cve", {})
            desc = ""
            for d in cve.get("descriptions", []):
                if d.get("lang") == "en":
                    desc = d.get("value", "")
                    break
            
            if any(kw.lower() in desc.lower() for kw in keywords):
                matches.append(cve.get("id"))
                # Extract CVSS
                metrics = cve.get("metrics", {})
                cvss_v3 = metrics.get("cvssMetricV31", []) or metrics.get("cvssMetricV30", [])
                if cvss_v3:
                    cvss_scores.append(cvss_v3[0].get("cvssData", {}).get("baseScore", 0))

        # Check CISA exploitation
        cisa_vulns = cisa_data.get("vulnerabilities", [])
        exploited_count = 0
        for cv in cisa_vulns:
            v_desc = cv.get("shortDescription", "")
            if any(kw.lower() in v_desc.lower() for kw in keywords):
                exploited_count += 1

        avg_cvss = sum(cvss_scores) / len(cvss_scores) if cvss_scores else 0
        freq = len(matches)
        
        # Weighted Scoring Model
        # frequency (0-40) + avg_cvss (0-30) + exploited_presence (0-30)
        norm_freq = min(freq * 2, 40) 
        norm_cvss = (avg_cvss / 10) * 30
        norm_exploited = 30 if exploited_count > 0 else 0
        
        trend_score = int(norm_freq + norm_cvss + norm_exploited)
        
        # Activity Level
        if trend_score > 80: activity = "Critical"
        elif trend_score > 60: activity = "High"
        elif trend_score > 40: activity = "Medium"
        else: activity = "Low"

        return {
            "trend_score": trend_score,
            "avg_cvss": round(avg_cvss, 1),
            "actively_exploited": exploited_count > 0,
            "activity_level": activity,
            "disclosure_count_30d": freq
        }

    async def get_threat_intelligence(self, vuln: Vulnerability) -> Dict:
        """Aggregate data and generate AI analysis for a specific vulnerability finding."""
        nvd_data = await self.fetch_nvd_data()
        cisa_data = await self.fetch_cisa_data()
        
        metrics = self.compute_trend_score(vuln.vulnerability_type, nvd_data, cisa_data)
        
        # Call Groq for deep analysis
        ai_analysis = await self._generate_ai_threat_analysis(vuln, metrics)
        
        result = {
            **metrics,
            **ai_analysis,
            "data_sources": ["NVD", "CISA", "Groq AI"]
        }
        
        return result

    async def _generate_ai_threat_analysis(self, vuln: Vulnerability, metrics: Dict) -> Dict:
        """Generate structured JSON analysis using Groq LLM."""
        
        prompt = f"""
        You are a Threat Intelligence Expert. Analyze the following detected vulnerability and its current threat landscape metrics.
        
        Vulnerability Type: {vuln.vulnerability_type}
        Detection Title: {vuln.title}
        Vulnerable Code Snippet: {vuln.evidence}
        Trend Score: {metrics['trend_score']}/100
        Exploitation Status: {"Actively Exploited (CISA)" if metrics['actively_exploited'] else "No Active Exploitation Reported"}
        Average CVSS: {metrics['avg_cvss']}
        
        Generate a deep technical analysis in JSON format:
        {{
          "attack_summary": "Concise technical summary of the attack vector",
          "why_trending": "Explain why this specific attack type is currently trending based on disclosures and real-world exploitation",
          "real_world_exploit_flow": [
              "Step 1: Description of initial reconnaissance/vector",
              "Step 2: Description of the application processing the malicious input",
              "Step 3: Description of the execution point or logic failure",
              "Impact: Technical result of successful exploitation"
          ],
          "business_impact": "How this affects business operations and data integrity",
          "technical_impact": "Direct technical consequences (e.g., identity theft, DB leak, RCE)"
        }}
        
        Ensure "real_world_exploit_flow" is a step-by-step sequence that matches the logic found in the code snippet.
        Output ONLY the JSON object.
        """
        
        try:
            return await self._call_groq(prompt)
        except Exception as e:
            print(f"[ThreatIntel] AI Analysis failed: {e}. Falling back to static profile.")
            return self._get_static_fallback(vuln.vulnerability_type, vuln.title)

    def _get_static_fallback(self, vuln_type: Any, title: str) -> Dict[str, Any]:
        """Provide high-quality predefined fallback analysis when LLM call fails or is not applicable."""
        type_str = vuln_type.value if hasattr(vuln_type, 'value') else str(vuln_type)
        
        fallbacks = {
            "sql_injection": {
                "attack_summary": "An attacker manipulates input parameters to execute arbitrary SQL commands on the backend database.",
                "why_trending": "SQL injection remains one of the most critical risks due to direct access to backend data warehouses.",
                "real_world_exploit_flow": [
                    "Step 1: Attacker identifies input fields or parameters that interact directly with database queries.",
                    "Step 2: Attacker inputs payload containing SQL control characters (e.g., `' OR '1'='1`).",
                    "Step 3: Database interprets payload as code, bypassing authentication or retrieving unauthorized records.",
                    "Impact: Complete compromise of database confidentiality, integrity, and availability."
                ],
                "business_impact": "Severe data breach, leakage of customer credentials, potential compliance fines, and brand destruction.",
                "technical_impact": "Unauthorized database read/write access, administrative bypass, and potential remote code execution via database functions."
            },
            "xss": {
                "attack_summary": "Malicious scripts are injected into trusted websites and executed in the victim's browser context.",
                "why_trending": "XSS is frequently exploited in session hijacking, CSRF preparation, and client-side defacement.",
                "real_world_exploit_flow": [
                    "Step 1: Attacker injects a malicious JavaScript payload into an input parameter or storage sink.",
                    "Step 2: Victim loads the affected page, causing the browser to render the unsanitized script.",
                    "Step 3: The payload executes, accessing session cookies or local storage data.",
                    "Impact: Browser session hijacking, credential theft, and unauthorized DOM manipulations."
                ],
                "business_impact": "User account compromise, brand reputation damage, and phishing campaigns targeting application users.",
                "technical_impact": "Arbitrary JavaScript execution, cookie access (unless HttpOnly), and local storage data extraction."
            },
            "csrf": {
                "attack_summary": "Forces an end user to execute unwanted actions on a web application in which they are currently authenticated.",
                "why_trending": "Often combined with social engineering or client-side flaws to execute critical transactions.",
                "real_world_exploit_flow": [
                    "Step 1: Attacker hosts a malicious page containing a hidden form targeting state-changing actions.",
                    "Step 2: Authenticated victim visits the malicious site while logged into the vulnerable application.",
                    "Step 3: The malicious site submits the hidden form automatically, and the browser attaches the victim's session cookies.",
                    "Impact: Unauthorized transactions or password modifications performed under the victim's identity."
                ],
                "business_impact": "Financial loss, unauthorized modifications to user profiles, and security policy bypass.",
                "technical_impact": "Bypass of transaction authorization, privilege abuse, and state-changing actions performed on behalf of the victim."
            },
            "ssrf": {
                "attack_summary": "Abuses server functionality to read or update internal resources that are otherwise inaccessible.",
                "why_trending": "SSRF has grown in prevalence with the shift to cloud infrastructure (e.g., targeting AWS metadata endpoints).",
                "real_world_exploit_flow": [
                    "Step 1: Attacker identifies an endpoint accepting user-supplied URLs to fetch remote resources.",
                    "Step 2: Attacker supplies an internal URL (e.g., `http://169.254.169.254/latest/meta-data/`).",
                    "Step 3: The backend server executes the request internally, bypassing external firewall restrictions.",
                    "Impact: Leakage of cloud credentials, internal port scanning, and access to private endpoints."
                ],
                "business_impact": "Exposure of proprietary cloud configurations, metadata leakage, and potential pivot point for internal network attacks.",
                "technical_impact": "Access to local and loopback services, configuration retrieval, and internal service exploitation."
            },
            "security_misconfiguration": {
                "attack_summary": "Security controls are missing, misconfigured, or left at default settings, creating entry points for attackers.",
                "why_trending": "One of the most common findings as application stacks grow in complexity.",
                "real_world_exploit_flow": [
                    "Step 1: Attacker performs reconnaissance to gather response headers and server details.",
                    "Step 2: Attacker identifies missing security headers (e.g., Content-Security-Policy, HSTS) or verbose error messages.",
                    "Step 3: Attacker leverages these misconfigurations to execute secondary client-side attacks (e.g., clickjacking, framing).",
                    "Impact: Security policies are bypassed, exposing users to client-side attacks."
                ],
                "business_impact": "Loss of user trust, compliance failure, and heightened risk of secondary exploitation.",
                "technical_impact": "Bypass of browser security controls, exposure of server info, and potential MIME sniffing."
            },
            "missing_security_headers": {
                "attack_summary": "The web server does not send security headers, leaving clients vulnerable to clickjacking or cross-site scripting.",
                "why_trending": "Security headers are basic defenses that are frequently overlooked during rapid deployment cycles.",
                "real_world_exploit_flow": [
                    "Step 1: Attacker inspects HTTP response headers of the target application.",
                    "Step 2: Attacker identifies missing security configurations (e.g., X-Frame-Options, Content-Security-Policy).",
                    "Step 3: Attacker hosts a malicious site containing an iframe that loads the vulnerable target.",
                    "Impact: User is tricked into executing actions, or sensitive cookies/data are exposed."
                ],
                "business_impact": "Brand damage, client-side session hijacking, and failure to comply with standards like OWASP/PCI-DSS.",
                "technical_impact": "Client-side security controls are bypassed, enabling framing, clickjacking, or cross-site scripting."
            }
        }
        
        # Generic fallback
        default_fallback = {
            "attack_summary": f"Exploitation of {title or type_str} vulnerability to compromise application security.",
            "why_trending": "This class of vulnerability represents a constant threat to modern web architectures.",
            "real_world_exploit_flow": [
                "Step 1: Attacker identifies the target endpoint or file path hosting the vulnerability.",
                "Step 2: Attacker crafts a custom payload designed to target the specific logic flaw.",
                "Step 3: The system processes the request, failing to safely filter or handle the input.",
                "Impact: Unauthorized state modification or access to system context."
            ],
            "business_impact": "Potential data exposure, user session compromise, and reputational damage.",
            "technical_impact": "Bypass of application control logic, exposure of endpoints, and unauthorized execution."
        }
        
        # Match closest key
        for key, val in fallbacks.items():
            if key in type_str.lower() or type_str.lower() in key:
                return val
                
        return default_fallback

    async def _call_groq(self, prompt: str) -> Dict:
        """Direct call to Groq API for structured output."""
        url = "https://api.groq.com/openai/v1/chat/completions"
        api_key = settings.groq_api_key_scanner or os.getenv("GROQ_API_KEY")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": settings.groq_model_scanner_primary,
            "messages": [
                {"role": "system", "content": "You are a lead security researcher providing structured threat intelligence."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            res_json = response.json()
            content = res_json["choices"][0]["message"]["content"]
            return json.loads(content)

# Singleton instance
threat_intel_service = ThreatIntelligenceService()

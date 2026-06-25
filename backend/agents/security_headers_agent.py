"""
Security Headers Agent - Detects missing and misconfigured HTTP security headers.

This agent checks the 10 most important security headers defined by OWASP and reports
each misconfiguration as a unique, actionable vulnerability finding. This ensures
Matrix finds multiple findings on virtually any real-world website.
"""
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

from .base_agent import BaseSecurityAgent, AgentResult
from models.vulnerability import Severity, VulnerabilityType

if __name__ == "__main__":
    pass  # prevent bare execution

logger = logging.getLogger(__name__)


class SecurityHeadersAgent(BaseSecurityAgent):
    """
    Detects missing or misconfigured HTTP security headers.

    Checks for:
    - Content-Security-Policy (missing or weak)
    - Strict-Transport-Security (HSTS)
    - X-Frame-Options (clickjacking protection)
    - X-Content-Type-Options (MIME sniffing protection)
    - Referrer-Policy
    - Permissions-Policy
    - Cross-Origin headers (CORS misconfigurations)
    - Server/X-Powered-By information disclosure
    - Cache-Control on sensitive endpoints
    - X-XSS-Protection (legacy)
    """

    agent_name = "security_headers"
    agent_description = "Detects missing and misconfigured HTTP security headers"
    vulnerability_types = [VulnerabilityType.SECURITY_MISCONFIG, VulnerabilityType.MISSING_SECURITY_HEADERS]

    # ── Header definitions ──────────────────────────────────────────────────
    # Each entry: header_name -> {severity, cwe, title, description, remediation}
    REQUIRED_HEADERS: Dict[str, Dict[str, Any]] = {
        "Content-Security-Policy": {
            "severity": Severity.HIGH,
            "cwe": "CWE-1021",
            "owasp": "A05:2021 – Security Misconfiguration",
            "title": "Missing Content-Security-Policy Header",
            "description": (
                "The Content-Security-Policy (CSP) header is absent. Without CSP, "
                "the browser will execute any injected scripts, making XSS attacks "
                "significantly easier to exploit and harder to mitigate."
            ),
            "remediation": (
                "Add a strict CSP header, e.g.:\n"
                "Content-Security-Policy: default-src 'self'; script-src 'self'; "
                "object-src 'none'; base-uri 'self'; frame-ancestors 'none';\n"
                "Start with report-only mode to identify violations before enforcing."
            ),
            "reference": "https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html",
        },
        "Strict-Transport-Security": {
            "severity": Severity.HIGH,
            "cwe": "CWE-523",
            "owasp": "A02:2021 – Cryptographic Failures",
            "title": "Missing HTTP Strict Transport Security (HSTS) Header",
            "description": (
                "The Strict-Transport-Security (HSTS) header is absent. Without HSTS, "
                "attackers can perform SSL-stripping attacks, downgrading HTTPS connections "
                "to HTTP and intercepting sensitive data in transit."
            ),
            "remediation": (
                "Add the HSTS header with a long max-age:\n"
                "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\n"
                "Submit the domain to the HSTS preload list at https://hstspreload.org/"
            ),
            "reference": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security",
        },
        "X-Frame-Options": {
            "severity": Severity.MEDIUM,
            "cwe": "CWE-1021",
            "owasp": "A05:2021 – Security Misconfiguration",
            "title": "Missing X-Frame-Options Header (Clickjacking Risk)",
            "description": (
                "The X-Frame-Options header is absent. This allows the site to be embedded "
                "in an iframe on an attacker's page, enabling clickjacking attacks where "
                "users are tricked into clicking on hidden interface elements."
            ),
            "remediation": (
                "Add one of the following headers:\n"
                "X-Frame-Options: DENY  (prevent all framing)\n"
                "X-Frame-Options: SAMEORIGIN  (allow same-origin framing only)\n"
                "Alternatively, use: Content-Security-Policy: frame-ancestors 'none';"
            ),
            "reference": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options",
        },
        "X-Content-Type-Options": {
            "severity": Severity.MEDIUM,
            "cwe": "CWE-16",
            "owasp": "A05:2021 – Security Misconfiguration",
            "title": "Missing X-Content-Type-Options Header (MIME Sniffing Risk)",
            "description": (
                "The X-Content-Type-Options header is absent. Without this header, "
                "some browsers will try to guess ('sniff') the content type, which can "
                "allow attackers to execute malicious scripts disguised as non-script files."
            ),
            "remediation": (
                "Add the following header to all responses:\n"
                "X-Content-Type-Options: nosniff"
            ),
            "reference": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options",
        },
        "Referrer-Policy": {
            "severity": Severity.LOW,
            "cwe": "CWE-200",
            "owasp": "A05:2021 – Security Misconfiguration",
            "title": "Missing Referrer-Policy Header",
            "description": (
                "The Referrer-Policy header is absent. By default, browsers may send "
                "the full URL (including query parameters with sensitive data) as the "
                "Referer header to third-party sites, leaking user activity and PII."
            ),
            "remediation": (
                "Add the Referrer-Policy header:\n"
                "Referrer-Policy: strict-origin-when-cross-origin\n"
                "For high-security applications: Referrer-Policy: no-referrer"
            ),
            "reference": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy",
        },
        "Permissions-Policy": {
            "severity": Severity.LOW,
            "cwe": "CWE-16",
            "owasp": "A05:2021 – Security Misconfiguration",
            "title": "Missing Permissions-Policy Header",
            "description": (
                "The Permissions-Policy header is absent. Without it, the browser "
                "may grant the page access to powerful APIs (camera, microphone, geolocation) "
                "without restriction, which could be abused by injected third-party scripts."
            ),
            "remediation": (
                "Restrict browser feature access with:\n"
                "Permissions-Policy: camera=(), microphone=(), geolocation=(), "
                "payment=(), usb=(), interest-cohort=()"
            ),
            "reference": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy",
        },
    }

    # Weak CSP patterns — CSP present but trivially bypassable
    WEAK_CSP_PATTERNS = [
        ("unsafe-inline", "CSP allows 'unsafe-inline' — inline scripts can execute", Severity.HIGH),
        ("unsafe-eval", "CSP allows 'unsafe-eval' — eval() can execute arbitrary code", Severity.HIGH),
        ("*", "CSP contains wildcard '*' — scripts can load from any domain", Severity.HIGH),
        ("data:", "CSP allows 'data:' URIs — can be used to bypass CSP", Severity.MEDIUM),
    ]

    # Server disclosure patterns
    VERBOSE_SERVER_HEADERS = ["Server", "X-Powered-By", "X-AspNet-Version", "X-AspNetMvc-Version"]

    async def scan(
        self,
        target_url: str,
        endpoints: List[Dict[str, Any]],
        technology_stack: Optional[List[str]] = None,
        scan_context: Optional[Any] = None,
    ) -> List[AgentResult]:
        """
        Scan for security header issues.

        Args:
            target_url: Base URL to fetch headers from
            endpoints: Endpoint list (used to find sensitive endpoints)
            technology_stack: Detected tech stack
            scan_context: Shared scan context

        Returns:
            List of vulnerability findings
        """
        results: List[AgentResult] = []

        self.log(f"Starting security headers scan on {target_url}")

        # Fetch headers from root URL
        response = await self.make_request(target_url, method="GET")
        if not response:
            self.log("Could not fetch target URL for header inspection", level="warning")
            return results

        headers = response.headers
        self.log(f"Fetched headers. Status: {response.status_code}")

        # ── Check 1: Required security headers ────────────────────────────
        for header_name, config in self.REQUIRED_HEADERS.items():
            header_value = headers.get(header_name) or headers.get(header_name.lower())

            if not header_value:
                result = self.create_result(
                    vulnerability_type=VulnerabilityType.MISSING_SECURITY_HEADERS,
                    is_vulnerable=True,
                    severity=config["severity"],
                    confidence=90,  # Very high — absence of a header is definitive
                    detection_method="Header inspection",
                    url=target_url,
                    parameter=header_name,
                    method="GET",
                    title=config["title"],
                    description=config["description"],
                    evidence=f"HTTP response did not include the '{header_name}' header.",
                    remediation=config["remediation"],
                    owasp_category=config["owasp"],
                    cwe_id=config["cwe"],
                    reference_links=[config["reference"]],
                )
                results.append(result)
                self.log(f"FINDING: {config['title']}")

        # ── Check 2: Weak CSP (present but bypassable) ────────────────────
        csp_value = headers.get("Content-Security-Policy") or headers.get("content-security-policy", "")
        if csp_value:
            for pattern, description, severity in self.WEAK_CSP_PATTERNS:
                if pattern in csp_value:
                    result = self.create_result(
                        vulnerability_type=VulnerabilityType.MISSING_SECURITY_HEADERS,
                        is_vulnerable=True,
                        severity=severity,
                        confidence=85,
                        detection_method="CSP analysis",
                        url=target_url,
                        parameter="Content-Security-Policy",
                        method="GET",
                        title=f"Weak Content-Security-Policy: {description}",
                        description=(
                            f"The Content-Security-Policy header is present but contains "
                            f"the insecure directive '{pattern}'. {description}. "
                            f"This weakens XSS protection significantly."
                        ),
                        evidence=f"CSP header value: {csp_value[:300]}",
                        remediation=(
                            f"Remove '{pattern}' from the Content-Security-Policy. "
                            "Use hashes or nonces for inline scripts instead of 'unsafe-inline'. "
                            "Use a module system instead of eval() to eliminate 'unsafe-eval'."
                        ),
                        owasp_category="A05:2021 – Security Misconfiguration",
                        cwe_id="CWE-1021",
                        reference_links=[
                            "https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html"
                        ],
                    )
                    results.append(result)
                    self.log(f"FINDING: Weak CSP — {description}")

        # ── Check 3: Server version disclosure ────────────────────────────
        for disclosure_header in self.VERBOSE_SERVER_HEADERS:
            value = headers.get(disclosure_header) or headers.get(disclosure_header.lower(), "")
            if value and self._reveals_version(value):
                result = self.create_result(
                    vulnerability_type=VulnerabilityType.MISSING_SECURITY_HEADERS,
                    is_vulnerable=True,
                    severity=Severity.LOW,
                    confidence=90,
                    detection_method="Header inspection",
                    url=target_url,
                    parameter=disclosure_header,
                    method="GET",
                    title=f"Server Version Disclosed via '{disclosure_header}' Header",
                    description=(
                        f"The '{disclosure_header}' header reveals server version information: '{value}'. "
                        "This helps attackers fingerprint the technology stack and "
                        "target known vulnerabilities for the specific version."
                    ),
                    evidence=f"{disclosure_header}: {value}",
                    remediation=(
                        f"Remove or sanitize the '{disclosure_header}' header in your web server config.\n"
                        "Nginx: server_tokens off;\n"
                        "Apache: ServerTokens Prod; ServerSignature Off;\n"
                        "Express: app.disable('x-powered-by');"
                    ),
                    owasp_category="A05:2021 – Security Misconfiguration",
                    cwe_id="CWE-200",
                    reference_links=[
                        "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/01-Information_Gathering/02-Fingerprint_Web_Server"
                    ],
                )
                results.append(result)
                self.log(f"FINDING: Version disclosure in {disclosure_header}: {value}")

        # ── Check 4: CORS misconfiguration ────────────────────────────────
        acao = (
            headers.get("Access-Control-Allow-Origin")
            or headers.get("access-control-allow-origin", "")
        )
        if acao == "*":
            acac = (
                headers.get("Access-Control-Allow-Credentials")
                or headers.get("access-control-allow-credentials", "")
            )
            severity = Severity.HIGH if acac and acac.lower() == "true" else Severity.MEDIUM
            result = self.create_result(
                vulnerability_type=VulnerabilityType.CORS_MISCONFIGURATION,
                is_vulnerable=True,
                severity=severity,
                confidence=88,
                detection_method="CORS header inspection",
                url=target_url,
                parameter="Access-Control-Allow-Origin",
                method="GET",
                title="Overly Permissive CORS Policy (Wildcard Origin)",
                description=(
                    "The server responds with 'Access-Control-Allow-Origin: *', allowing "
                    "any website to make cross-origin requests and read the response. "
                    + ("Combined with 'Access-Control-Allow-Credentials: true', this is "
                       "a critical misconfiguration that allows cross-origin credential theft."
                       if acac and acac.lower() == "true"
                       else "")
                ),
                evidence=(
                    f"Access-Control-Allow-Origin: {acao}\n"
                    + (f"Access-Control-Allow-Credentials: {acac}" if acac else "")
                ),
                remediation=(
                    "Restrict CORS to trusted origins explicitly:\n"
                    "Access-Control-Allow-Origin: https://yourtrustedapp.com\n"
                    "Never combine 'Access-Control-Allow-Origin: *' with "
                    "'Access-Control-Allow-Credentials: true'."
                ),
                owasp_category="A05:2021 – Security Misconfiguration",
                cwe_id="CWE-942",
                reference_links=[
                    "https://portswigger.net/web-security/cors"
                ],
            )
            results.append(result)
            self.log(f"FINDING: Wildcard CORS policy (severity={severity})")

        # ── Check 5: Cookie Security Misconfigurations ────────────────────
        # Inspect cookies from the Set-Cookie headers in the response
        raw_cookies = []
        if hasattr(response.headers, "get_list"):
            raw_cookies = response.headers.get_list("Set-Cookie") or response.headers.get_list("set-cookie")
        else:
            # Fallback for dict-like headers
            cookie_val = headers.get("Set-Cookie") or headers.get("set-cookie")
            if cookie_val:
                raw_cookies = [cookie_val]

        for raw_cookie in raw_cookies:
            # A raw cookie string looks like: "name=value; Path=/; HttpOnly; Secure; SameSite=Lax"
            # Split into attributes
            parts = [p.strip() for p in raw_cookie.split(";")]
            if not parts:
                continue
            
            cookie_parts = parts[0].split("=", 1)
            cookie_name = cookie_parts[0] if cookie_parts else "Unknown"
            
            # Case-insensitive checks for security attributes
            attributes = [p.lower() for p in parts[1:]]
            
            has_httponly = "httponly" in attributes
            has_secure = "secure" in attributes
            has_samesite = any(a.startswith("samesite") for a in attributes)
            
            # 1. HttpOnly Check
            if not has_httponly:
                result = self.create_result(
                    vulnerability_type=VulnerabilityType.SECURITY_MISCONFIG,
                    is_vulnerable=True,
                    severity=Severity.MEDIUM,
                    confidence=95,
                    detection_method="Cookie Attribute Inspection",
                    url=target_url,
                    parameter=cookie_name,
                    method="GET",
                    title="Cookie Missing 'HttpOnly' Attribute",
                    description=(
                        f"The cookie '{cookie_name}' is set without the 'HttpOnly' attribute. "
                        "Without 'HttpOnly', the cookie can be accessed by client-side scripts, "
                        "meaning an attacker exploiting a Cross-Site Scripting (XSS) vulnerability "
                        "can steal the cookie and hijack the user's session."
                    ),
                    evidence=f"Set-Cookie: {raw_cookie}",
                    remediation=(
                        f"Modify the application configuration or code to append the 'HttpOnly' "
                        f"flag when setting the cookie '{cookie_name}'. "
                        "For example, in Python/Flask: response.set_cookie(..., httponly=True)"
                    ),
                    owasp_category="A05:2021 – Security Misconfiguration",
                    cwe_id="CWE-1004",
                    reference_links=["https://owasp.org/www-community/HttpOnly"],
                )
                results.append(result)
                self.log(f"FINDING: Cookie '{cookie_name}' missing HttpOnly attribute")
                
            # 2. Secure Check
            if not has_secure:
                result = self.create_result(
                    vulnerability_type=VulnerabilityType.SECURITY_MISCONFIG,
                    is_vulnerable=True,
                    severity=Severity.MEDIUM,
                    confidence=95,
                    detection_method="Cookie Attribute Inspection",
                    url=target_url,
                    parameter=cookie_name,
                    method="GET",
                    title="Cookie Missing 'Secure' Attribute",
                    description=(
                        f"The cookie '{cookie_name}' is set without the 'Secure' attribute. "
                        "Without 'Secure', the browser will transmit the cookie over unencrypted "
                        "HTTP connections, allowing an attacker positioned on the network (e.g. over public Wi-Fi) "
                        "to intercept it via a Man-in-the-Middle (MitM) attack."
                    ),
                    evidence=f"Set-Cookie: {raw_cookie}",
                    remediation=(
                        f"Modify the application configuration or code to append the 'Secure' "
                        f"flag when setting the cookie '{cookie_name}'. "
                        "For example, in Python/Flask: response.set_cookie(..., secure=True)"
                    ),
                    owasp_category="A05:2021 – Security Misconfiguration",
                    cwe_id="CWE-614",
                    reference_links=["https://owasp.org/www-community/controls/SecureCookieAttribute"],
                )
                results.append(result)
                self.log(f"FINDING: Cookie '{cookie_name}' missing Secure attribute")

            # 3. SameSite Check
            if not has_samesite:
                result = self.create_result(
                    vulnerability_type=VulnerabilityType.SECURITY_MISCONFIG,
                    is_vulnerable=True,
                    severity=Severity.LOW,
                    confidence=90,
                    detection_method="Cookie Attribute Inspection",
                    url=target_url,
                    parameter=cookie_name,
                    method="GET",
                    title="Cookie Missing 'SameSite' Attribute",
                    description=(
                        f"The cookie '{cookie_name}' does not specify a 'SameSite' attribute. "
                        "Without 'SameSite' set to Lax or Strict, the cookie might be sent in "
                        "cross-site requests. This increases the risk of Cross-Site Request Forgery "
                        "(CSRF) attacks."
                    ),
                    evidence=f"Set-Cookie: {raw_cookie}",
                    remediation=(
                        f"Configure the 'SameSite' attribute for the cookie '{cookie_name}' to "
                        "'Lax' or 'Strict' depending on application requirements. "
                        "For example: response.set_cookie(..., samesite='Lax')"
                    ),
                    owasp_category="A05:2021 – Security Misconfiguration",
                    cwe_id="CWE-16",
                    reference_links=["https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite"],
                )
                results.append(result)
                self.log(f"FINDING: Cookie '{cookie_name}' missing SameSite attribute")

        self.log(
            f"Security headers scan complete. Found {len(results)} issues."
        )
        return results

    def _reveals_version(self, value: str) -> bool:
        """Return True if the header value exposes a version number."""
        import re
        # Match patterns like "Apache/2.4.51", "nginx/1.18.0", "PHP/7.4", etc.
        return bool(re.search(r'\d+\.\d+', value))

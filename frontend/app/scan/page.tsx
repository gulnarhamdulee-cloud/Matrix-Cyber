'use client';

import { useState, useEffect } from 'react';
import {
    Target, ArrowLeft, CheckCircle, AlertTriangle, XCircle,
    Shield, ShieldAlert, ShieldCheck, ShieldX, Clock, Globe, Code, FileText,
    Download, ChevronDown, ChevronUp, ExternalLink, Copy, Terminal, Activity,
    Zap, Database, Lock, Bug, Server, Eye
} from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { api, Scan, Vulnerability } from '../../lib/matrix_api';
import { useRouter, useSearchParams } from 'next/navigation';

import { Navbar } from '../../components/Navbar';
import { LiveAttackMap } from '../../components/LiveAttackMap';

// Agent status type
interface AgentStatus {
    name: string;
    status: 'pending' | 'active' | 'completed';
    icon: React.ReactNode;
    findings: number;
}

// Fix 2: Plain-English explanation helper component with dynamic Threat Intel (Groq) integration
function VulnerabilityMeaningBox({ vuln }: { vuln: Vulnerability }) {
    const [intel, setIntel] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Static beginner-friendly explanations
    const getDetailedFallback = (type: string) => {
        const fallbacks: Record<string, { summary: string; impact: string }> = {
            sql_injection: {
                summary: "This is like a lockpicker finding a master key hole. An attacker can write database commands into your website inputs to bypass logins, view confidential customer records, delete tables, or modify data.",
                impact: "High risk of database leaks, credential theft, and unauthorized data alterations."
            },
            xss: {
                summary: "This is like a vandal pasting a fake, malicious form over your real website. An attacker can inject code that runs in a user's browser, letting them steal passwords, hijack login sessions, or redirect users to scam pages.",
                impact: "Attackers can impersonate your users or steal their active session details."
            },
            csrf: {
                summary: "This is like a scammer tricking you into signing a bank transfer authorization while you are distracted. It allows malicious external sites to force your logged-in users to perform actions without their knowledge.",
                impact: "Users can be forced to change passwords, update profile details, or perform transaction actions."
            },
            ssrf: {
                summary: "This is like an intruder using your internal office intercom to access private server rooms. The attacker tricks your website server into contacting internal systems or cloud hosting control systems that should be private.",
                impact: "Leakage of cloud credentials or access to internal private services."
            },
            security_misconfiguration: {
                summary: "This is like leaving your front gate closed but unlocked. The server is missing standard protective headers, allowing attackers to clickjack the page or bypass browser security settings.",
                impact: "Vulnerability to iframe clickjacking, content sniffing, and credential compromise."
            },
            missing_security_headers: {
                summary: "Your web server isn't sending standard safety configuration headers. Without these, browsers won't enforce defenses like preventing other sites from framing your content or blocking untrusted scripts.",
                impact: "Increases user exposure to client-side attacks, site cloning, and clickjacking."
            }
        };
        
        const matched = Object.entries(fallbacks).find(([key]) => type.toLowerCase().includes(key));
        return matched ? matched[1] : {
            summary: "A vulnerability of this type allows attackers to bypass standard logic safeguards and interact directly with system functions or data.",
            impact: "Potential compromise of system confidentiality and authorization parameters."
        };
    };

    useEffect(() => {
        const fetchIntel = async () => {
            setLoading(true);
            try {
                const data = await api.getVulnerabilityIntelligence(vuln.id);
                if (data && data.attack_summary && data.attack_summary !== "Analysis unavailable") {
                    setIntel(data);
                }
            } catch (err) {
                console.error("Failed to load threat intel:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchIntel();
    }, [vuln.id]);

    const fallback = getDetailedFallback(vuln.vulnerability_type);

    return (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-md">
            <div className="flex gap-2">
                <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-bold text-blue-800 mb-1">What does this mean for you?</p>
                    {loading ? (
                        <div className="flex items-center gap-2 py-1">
                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-blue-600 font-mono">Asking Groq for simplified explanation...</span>
                        </div>
                    ) : intel ? (
                        <div className="space-y-2">
                            <p className="text-sm text-blue-900 leading-relaxed font-serif">
                                {intel.attack_summary}
                            </p>
                            {intel.why_trending && (
                                <p className="text-xs text-blue-700 bg-white/60 p-2 rounded border border-blue-100/50">
                                    <span className="font-semibold">Threat Context:</span> {intel.why_trending}
                                </p>
                            )}
                            <div className="text-xs text-blue-800">
                                <span className="font-semibold">Business Impact:</span> {intel.business_impact}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-blue-900 leading-relaxed font-serif">
                                {fallback.summary}
                            </p>
                            <div className="text-xs text-blue-800">
                                <span className="font-semibold">Potential Impact:</span> {fallback.impact}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ScanPage() {
    const { user, logout, isAuthenticated } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [targetUrl, setTargetUrl] = useState('');
    const [urlError, setUrlError] = useState<string | null>(null); // Fix 6: URL validation
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanResults, setScanResults] = useState<Scan | null>(null);
    const [findings, setFindings] = useState<Vulnerability[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [expandedVuln, setExpandedVuln] = useState<number | null>(null);
    const [tooltipVuln, setTooltipVuln] = useState<number | null>(null); // Fix 2: tooltip state
    const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'details'>('overview');
    const [terminalLogs, setTerminalLogs] = useState<{ type: string, message: string }[]>([]);
    const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([
        { name: 'SQL Injection', status: 'pending', icon: <Database className="w-4 h-4" />, findings: 0 },
        { name: 'XSS Detection', status: 'pending', icon: <Code className="w-4 h-4" />, findings: 0 },
        { name: 'CSRF Analysis', status: 'pending', icon: <Shield className="w-4 h-4" />, findings: 0 },
        { name: 'SSRF Scanner', status: 'pending', icon: <Server className="w-4 h-4" />, findings: 0 },
        { name: 'Auth Testing', status: 'pending', icon: <Lock className="w-4 h-4" />, findings: 0 },
        { name: 'API Security', status: 'pending', icon: <Globe className="w-4 h-4" />, findings: 0 },
        { name: 'Cmd Injection', status: 'pending', icon: <Terminal className="w-4 h-4" />, findings: 0 },
        { name: 'Sec Headers', status: 'pending', icon: <ShieldAlert className="w-4 h-4" />, findings: 0 },
    ]);

    // WAF Evasion opt-in (default: OFF)
    const [enableWafEvasion, setEnableWafEvasion] = useState(false);
    const [wafEvasionConsent, setWafEvasionConsent] = useState(false);
    const [showWafWarningModal, setShowWafWarningModal] = useState(false);

    // Pre-scan warning modal
    const [showPreScanWarning, setShowPreScanWarning] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    // Advanced Authentication
    const [customHeaders, setCustomHeaders] = useState('');
    const [customCookies, setCustomCookies] = useState('');
    const [showAdvancedAuth, setShowAdvancedAuth] = useState(false);


    // Load scan from URL on page mount
    useEffect(() => {
        const scanId = searchParams.get('id');
        if (scanId) {
            const loadScan = async () => {
                try {
                    const scanData = await api.getScan(Number(scanId));
                    setScanResults(scanData);
                    setTargetUrl(scanData.target_url);
                    setScanProgress(scanData.progress);
                    
                    const results = await api.getVulnerabilities(Number(scanId));
                    const currentFindings = results.items;
                    setFindings(currentFindings);

                    // Helper to get findings count for an agent
                    const getFindingsCountForAgent = (agentName: string) => {
                        const name = agentName.toLowerCase();
                        const typeMap: Record<string, string[]> = {
                            'sql injection': ['sql_injection', 'nosql_injection'],
                            'xss detection': ['xss', 'xss_reflected', 'xss_stored', 'xss_dom'],
                            'csrf analysis': ['csrf', 'clickjacking'],
                            'ssrf scanner': ['ssrf', 'server_side_request_forgery', 'open_redirect'],
                            'auth testing': ['broken_authentication', 'authentication', 'weak_password', 'broken_auth'],
                            'api security': ['api_security', 'api_rate_limit_missing', 'api_authentication_bypass', 'mass_assignment'],
                            'cmd injection': ['command_injection', 'code_injection'],
                            'sec headers': ['security_headers', 'missing_headers', 'security_misconfiguration', 'missing_security_headers', 'information_disclosure']
                        };
                        const types = typeMap[name] || [];
                        return currentFindings.filter(f => 
                            types.includes(f.vulnerability_type.toLowerCase()) ||
                            types.some(t => f.vulnerability_type.toLowerCase().includes(t))
                        ).length;
                    };

                    setAgentStatuses(prev => prev.map(agent => {
                        let status: 'pending' | 'active' | 'completed' = 'pending';
                        if (scanData.status === 'completed') {
                            status = 'completed';
                        } else if (scanData.status === 'running') {
                            // Map progress range to status (8 agents)
                            const name = agent.name.toLowerCase();
                            if (name.includes('sql')) {
                                if (scanData.progress >= 30) status = 'completed';
                                else if (scanData.progress >= 15) status = 'active';
                            } else if (name.includes('xss')) {
                                if (scanData.progress >= 45) status = 'completed';
                                else if (scanData.progress >= 30) status = 'active';
                            } else if (name.includes('csrf')) {
                                if (scanData.progress >= 55) status = 'completed';
                                else if (scanData.progress >= 45) status = 'active';
                            } else if (name.includes('ssrf')) {
                                if (scanData.progress >= 65) status = 'completed';
                                else if (scanData.progress >= 55) status = 'active';
                            } else if (name.includes('auth')) {
                                if (scanData.progress >= 75) status = 'completed';
                                else if (scanData.progress >= 65) status = 'active';
                            } else if (name.includes('api')) {
                                if (scanData.progress >= 83) status = 'completed';
                                else if (scanData.progress >= 75) status = 'active';
                            } else if (name.includes('cmd')) {
                                if (scanData.progress >= 90) status = 'completed';
                                else if (scanData.progress >= 83) status = 'active';
                            } else if (name.includes('sec')) {
                                if (scanData.progress >= 95) status = 'completed';
                                else if (scanData.progress >= 90) status = 'active';
                            }
                        }
                        return {
                            ...agent,
                            status,
                            findings: getFindingsCountForAgent(agent.name)
                        };
                    }));
                } catch (err) {
                    console.error('Failed to load scan from URL:', err);
                }
            };
            loadScan();
        }
    }, [searchParams]);

    const addLog = (type: string, message: string) => {
        setTerminalLogs(prev => [...prev.slice(-15), { type, message }]);
    };

    const parseHeaders = (str: string) => {
        const headers: Record<string, string> = {};
        str.split('\n').filter(line => line.trim()).forEach(line => {
            const index = line.indexOf(':');
            if (index !== -1) {
                headers[line.substring(0, index).trim()] = line.substring(index + 1).trim();
            }
        });
        return headers;
    };

    const parseCookies = (str: string) => {
        const cookies: Record<string, string> = {};
        str.split(';').filter(part => part.trim()).forEach(part => {
            const index = part.indexOf('=');
            if (index !== -1) {
                cookies[part.substring(0, index).trim()] = part.substring(index + 1).trim();
            }
        });
        return cookies;
    };

    // Fix 6: URL validation helper
    const isValidUrl = (url: string): boolean => {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    };

    // Fix 2: Plain-English meaning for each vulnerability type
    const getPlainEnglishMeaning = (vulnType: string, severity: string): string => {
        const meanings: Record<string, string> = {
            sql_injection: 'An attacker can read, modify, or delete your entire database using this vulnerability.',
            xss: 'An attacker can inject malicious scripts that run in your users\' browsers, stealing their sessions or data.',
            xss_reflected: 'Malicious code in a URL can be sent to users and executed in their browser — like a phishing attack.',
            xss_stored: 'An attacker can permanently store malicious code on your site that runs for every visitor.',
            csrf: 'An attacker can trick your logged-in users into performing actions they didn\'t intend, like changing their password.',
            ssrf: 'An attacker can make your server connect to internal systems or cloud metadata, leaking sensitive infrastructure details.',
            broken_authentication: 'Your login system has weaknesses that allow attackers to guess passwords or bypass authentication.',
            command_injection: 'An attacker can run system commands on your server — this is the worst type of vulnerability (full server takeover).',
            api_security: 'Your API endpoints expose data or allow actions that should be restricted to authorized users only.',
            security_misconfiguration: 'Your server is missing security settings that protect against common attacks.',
            information_disclosure: 'Your site is accidentally revealing technical details (like software versions) that help attackers plan their attack.',
            default: severity === 'critical' ? 'This is a serious security hole. An attacker can exploit this to harm your site or users.' : 'This issue could be exploited under the right conditions. It is worth reviewing and fixing.'
        };
        return meanings[vulnType.toLowerCase()] || meanings.default;
    };

    const handleScanButtonClick = () => {
        if (!targetUrl) return;

        // Fix 6: Validate URL format before showing warning
        if (!isValidUrl(targetUrl)) {
            setUrlError('Please enter a valid URL starting with http:// or https:// — Example: https://yourwebsite.com');
            return;
        }
        setUrlError(null);

        // Check if user has permanently disabled the warning
        const isPermanentlyDisabled = localStorage.getItem('matrix_skip_scan_warning') === 'true';

        if (!isPermanentlyDisabled) {
            setShowPreScanWarning(true);
        } else {
            handleStartScan();
        }
    };

    const handleStartScan = async () => {
        if (!targetUrl) return;

        setShowPreScanWarning(false);
        if (dontShowAgain) {
            localStorage.setItem('matrix_skip_scan_warning', 'true');
        }

        setIsScanning(true);
        setScanProgress(0);
        setScanResults(null);
        setFindings([]);
        setError(null);
        setTerminalLogs([]);

        addLog('cmd', 'Initializing security scan...');
        addLog('info', `Target: ${targetUrl}`);

        try {
            const newScan = await api.createScan({
                target_url: targetUrl,
                scan_type: 'FULL',
                enable_waf_evasion: enableWafEvasion,
                waf_evasion_consent: wafEvasionConsent,
                custom_headers: parseHeaders(customHeaders),
                custom_cookies: parseCookies(customCookies)
            });

            addLog('success', `Scan ID: ${newScan.id}`);
            addLog('scan', 'Running reconnaissance...');
            setScanResults(newScan);

            let failures = 0;
            const MAX_FAILURES = 20; // tolerate uvicorn --reload restarts (~3-5s gap)
            let lastProgress = 0;
            const interval = setInterval(async () => {
                try {
                    const statusUpdate = await api.getScan(newScan.id);
                    failures = 0;

                    // Fetch vulnerabilities to show them in real-time
                    const vulnResults = await api.getVulnerabilities(newScan.id);
                    const currentFindings = vulnResults.items;
                    setFindings(currentFindings);

                    setScanProgress(statusUpdate.progress);
                    setScanResults(statusUpdate);

                    // Helper to get findings count for an agent
                    const getFindingsCountForAgent = (agentName: string) => {
                        const name = agentName.toLowerCase();
                        const typeMap: Record<string, string[]> = {
                            'sql injection': ['sql_injection', 'nosql_injection'],
                            'xss detection': ['xss', 'xss_reflected', 'xss_stored', 'xss_dom'],
                            'csrf analysis': ['csrf', 'clickjacking'],
                            'ssrf scanner': ['ssrf', 'server_side_request_forgery', 'open_redirect'],
                            'auth testing': ['broken_authentication', 'authentication', 'weak_password', 'broken_auth'],
                            'api security': ['api_security', 'api_rate_limit_missing', 'api_authentication_bypass', 'mass_assignment'],
                            'cmd injection': ['command_injection', 'code_injection'],
                            'sec headers': ['security_headers', 'missing_headers', 'security_misconfiguration', 'missing_security_headers', 'information_disclosure']
                        };
                        const types = typeMap[name] || [];
                        return currentFindings.filter(f => 
                            types.includes(f.vulnerability_type.toLowerCase()) ||
                            types.some(t => f.vulnerability_type.toLowerCase().includes(t))
                        ).length;
                    };

                    // Dynamically map agent status and findings based on current scan progress
                    setAgentStatuses(prev => prev.map(agent => {
                        let status: 'pending' | 'active' | 'completed' = 'pending';
                        const name = agent.name.toLowerCase();
                        
                        if (statusUpdate.status === 'completed') {
                            status = 'completed';
                        } else if (statusUpdate.status === 'failed' || statusUpdate.status === 'cancelled') {
                            status = agent.status;
                        } else {
                            if (name.includes('sql')) {
                                if (statusUpdate.progress >= 30) status = 'completed';
                                else if (statusUpdate.progress >= 15) status = 'active';
                            } else if (name.includes('xss')) {
                                if (statusUpdate.progress >= 45) status = 'completed';
                                else if (statusUpdate.progress >= 30) status = 'active';
                            } else if (name.includes('csrf')) {
                                if (statusUpdate.progress >= 55) status = 'completed';
                                else if (statusUpdate.progress >= 45) status = 'active';
                            } else if (name.includes('ssrf')) {
                                if (statusUpdate.progress >= 65) status = 'completed';
                                else if (statusUpdate.progress >= 55) status = 'active';
                            } else if (name.includes('auth')) {
                                if (statusUpdate.progress >= 75) status = 'completed';
                                else if (statusUpdate.progress >= 65) status = 'active';
                            } else if (name.includes('api')) {
                                if (statusUpdate.progress >= 83) status = 'completed';
                                else if (statusUpdate.progress >= 75) status = 'active';
                            } else if (name.includes('cmd')) {
                                if (statusUpdate.progress >= 90) status = 'completed';
                                else if (statusUpdate.progress >= 83) status = 'active';
                            } else if (name.includes('sec')) {
                                if (statusUpdate.progress >= 95) status = 'completed';
                                else if (statusUpdate.progress >= 90) status = 'active';
                            }
                        }
                        
                        return {
                            ...agent,
                            status,
                            findings: getFindingsCountForAgent(agent.name)
                        };
                    }));

                    if (statusUpdate.progress > lastProgress) {
                        if (statusUpdate.progress >= 10 && lastProgress < 10) {
                            addLog('info', 'Resolving DNS and establishing connection...');
                        }
                        if (statusUpdate.progress >= 15 && lastProgress < 15) {
                            addLog('success', 'Target analysis complete - discovered endpoints');
                            addLog('scan', 'Deploying security agents...');
                        }
                        if (statusUpdate.progress >= 25 && lastProgress < 25) {
                            addLog('info', 'SQL Injection Agent: Testing input parameters...');
                        }
                        if (statusUpdate.progress >= 40 && lastProgress < 40) {
                            addLog('info', 'XSS Agent: Scanning for reflected/stored XSS vectors...');
                        }
                        if (statusUpdate.progress >= 55 && lastProgress < 55) {
                            addLog('info', 'CSRF Agent: Analyzing form submissions and tokens...');
                        }
                        if (statusUpdate.progress >= 70 && lastProgress < 70) {
                            addLog('info', 'SSRF Agent: Testing server-side request forgery paths...');
                        }
                        if (statusUpdate.progress >= 80 && lastProgress < 80) {
                            addLog('scan', 'Auth Agent: Checking authentication mechanisms...');
                        }
                        if (statusUpdate.progress >= 88 && lastProgress < 88) {
                            addLog('info', 'API Security Agent: Validating endpoints and headers...');
                        }
                        if (statusUpdate.progress >= 94 && lastProgress < 94) {
                            addLog('scan', 'AI Analysis: Correlating and deduplicating findings...');
                        }
                        lastProgress = statusUpdate.progress;
                    }

                    if (statusUpdate.status === 'completed') {
                        clearInterval(interval);
                        setIsScanning(false);
                        setAgentStatuses(prev => prev.map(agent => ({ ...agent, status: 'completed', findings: getFindingsCountForAgent(agent.name) })));
                        const results = await api.getVulnerabilities(newScan.id);
                        setFindings(results.items);
                        addLog('success', `Complete. ${results.total} vulnerabilities found.`);
                        router.push(`/scan?id=${newScan.id}`, { scroll: false });
                    } else if (statusUpdate.status === 'failed' || statusUpdate.status === 'cancelled') {
                        clearInterval(interval);
                        setIsScanning(false);
                        setError(statusUpdate.error_message || 'Scan terminated unexpectedly');
                        addLog('error', statusUpdate.error_message || 'Scan failed');
                    }
                } catch (err: any) {
                    console.error('Poll error:', err);
                    failures++;
                    addLog('warn', `Connection failed (${failures}/${MAX_FAILURES}) — scanner is busy`);
                    if (failures >= MAX_FAILURES) {
                        clearInterval(interval);
                        setIsScanning(false);
                        setError('Lost connection to scan server after 20 retries. The scan may still be running in the background.');
                        addLog('error', 'Connection timeout — check backend logs');
                    }
                }
            }, 3000); // 3s interval — gives uvicorn --reload time to recover
        } catch (err: any) {
            setIsScanning(false);
            setError(err.message || 'Failed to initialize scan');
            addLog('error', err.message || 'Initialization failed');
        }
    };

    // Helper functions - Professional severity styling
    const getSeverityClass = (severity: string) => {
        const classes: Record<string, string> = {
            critical: 'border-[#dc2626] text-[#dc2626]',
            high: 'border-[#ea580c] text-[#ea580c]',
            medium: 'border-[#ca8a04] text-[#ca8a04]',
            low: 'border-[#6b7280] text-[#6b7280]',
            info: 'border-[#9ca3af] text-[#9ca3af]'
        };
        return classes[severity] || classes.info;
    };

    const getSeverityBorder = (severity: string) => {
        const colors: Record<string, string> = {
            critical: 'border-l-[#dc2626]',
            high: 'border-l-[#ea580c]',
            medium: 'border-l-[#ca8a04]',
            low: 'border-l-[#6b7280]',
            info: 'border-l-[#9ca3af]'
        };
        return colors[severity] || colors.info;
    };

    const getCVSSScore = (severity: string): number => {
        const scores: Record<string, number> = {
            critical: 9.5,
            high: 7.5,
            medium: 5.5,
            low: 3.0,
            info: 0.0
        };
        return scores[severity] || 0;
    };

    const getCVSSVector = (severity: string): string => {
        const vectors: Record<string, string> = {
            critical: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
            high: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N',
            medium: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N',
            low: 'CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:L/I:N/A:N',
            info: 'CVSS:3.1/AV:N/AC:H/PR:H/UI:R/S:U/C:N/I:N/A:N'
        };
        return vectors[severity] || vectors.info;
    };

    const getCWEMapping = (vulnType: string): string => {
        const cweMap: Record<string, string> = {
            'sql_injection': 'CWE-89',
            'xss': 'CWE-79',
            'csrf': 'CWE-352',
            'ssrf': 'CWE-918',
            'broken_authentication': 'CWE-287',
            'sensitive_data_exposure': 'CWE-200',
            'command_injection': 'CWE-78',
            'path_traversal': 'CWE-22',
            'default': 'CWE-Unknown'
        };
        return cweMap[vulnType.toLowerCase()] || cweMap['default'];
    };

    const getRiskPosture = () => {
        if ((scanResults?.critical_count || 0) > 0) return { level: 'CRITICAL', class: 'risk-critical' };
        if ((scanResults?.high_count || 0) > 0) return { level: 'ELEVATED', class: 'risk-elevated' };
        if ((scanResults?.medium_count || 0) > 0) return { level: 'MODERATE', class: 'risk-moderate' };
        return { level: 'LOW', class: 'risk-low' };
    };

    const getExposureSummary = () => {
        const critical = scanResults?.critical_count || 0;
        const high = scanResults?.high_count || 0;
        const total = scanResults?.total_vulnerabilities || 0;

        if (critical > 0) {
            return `${critical} critical exposure${critical > 1 ? 's' : ''} requiring immediate remediation. ${total} total findings.`;
        }
        if (high > 0) {
            return `${high} high-severity finding${high > 1 ? 's' : ''} detected. ${total} total findings require attention.`;
        }
        if (total > 0) {
            return `${total} finding${total > 1 ? 's' : ''} identified. Review recommended.`;
        }
        return 'No security vulnerabilities detected in this assessment.';
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <ProtectedRoute>
            {/* Security scope wrapper for professional report styling */}
            <div className="security-scope min-h-screen">
                <Navbar />

                {/* Page Header - Minimal */}
                <section className="py-6 px-6 border-b border-gray-200 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <Link href="/hub" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-4">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Hub
                        </Link>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                                    Security Assessment
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Vulnerability analysis and risk assessment
                                </p>
                            </div>
                            {scanResults && (
                                <div className="text-xs text-gray-400 font-mono">
                                    ID: {scanResults.id}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Main Content */}
                <section className="py-6 px-6">
                    <div className="max-w-6xl mx-auto">
                        {/* Scan Input */}
                        <div className="bg-white rounded-md border border-gray-200 p-5 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Target className="w-5 h-5 text-gray-400" />
                                <div>
                                    <h2 className="text-sm font-medium text-gray-900">Target Configuration</h2>
                                    <p className="text-xs text-gray-500">Enter the URL to assess</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="flex-1 relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="url"
                                        placeholder="https://example.com"
                                        value={targetUrl}
                                        onChange={(e) => { setTargetUrl(e.target.value); setUrlError(null); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && targetUrl && !isScanning) handleScanButtonClick(); }}
                                        className={`w-full pl-10 pr-4 py-3 rounded-md border focus:ring-2 outline-none text-sm text-gray-900 placeholder:text-gray-400 bg-gray-50 transition-colors ${
                                            urlError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-gray-400 focus:ring-gray-100'
                                        }`}
                                        disabled={isScanning}
                                    />
                                </div>
                                {/* Fix 7: min-h-[44px] for mobile touch targets */}
                                <button
                                    onClick={handleScanButtonClick}
                                    disabled={!targetUrl || isScanning}
                                    className="px-6 py-3 min-h-[44px] bg-emerald-700 text-white font-medium rounded-md text-sm hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap shadow-md touch-manipulation"
                                >
                                    {isScanning ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Scanning...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            Scan
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Fix 6: URL Validation Error */}
                            {urlError && (
                                <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700">{urlError}</p>
                                </div>
                            )}

                            {/* Fix 3: Legal & Privacy Notice */}
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md flex items-start gap-2">
                                <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700">
                                    <span className="font-semibold">Legal & Privacy:</span> Matrix only scans URLs that you own or have explicit permission to test. No raw request/response data is stored permanently. By scanning, you confirm you have authorization over the target.
                                </p>
                            </div>

                            {/* Advanced Options - WAF Evasion */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400">
                                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                                        WAF Evasion
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!enableWafEvasion) {
                                                setShowWafWarningModal(true);
                                            } else {
                                                setEnableWafEvasion(false);
                                                setWafEvasionConsent(false);
                                            }
                                        }}
                                        disabled={isScanning}
                                        className={`px-2.5 py-0.5 text-xs font-medium rounded transition-colors ${enableWafEvasion
                                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                                            } disabled:opacity-50`}
                                    >
                                        {enableWafEvasion ? 'ON' : 'OFF'}
                                    </button>

                                    <div className="h-3 w-[1px] bg-gray-200 mx-1"></div>

                                    <button
                                        type="button"
                                        onClick={() => setShowAdvancedAuth(!showAdvancedAuth)}
                                        disabled={isScanning}
                                        className={`px-2.5 py-0.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${showAdvancedAuth
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                                            } disabled:opacity-50`}
                                    >
                                        <Lock className="w-3 h-3" />
                                        Advanced Authentication
                                        {showAdvancedAuth ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                </div>

                                {showAdvancedAuth && (
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Headers</label>
                                                <span className="text-[9px] text-gray-400">Key: Value (per line)</span>
                                            </div>
                                            <textarea
                                                value={customHeaders}
                                                onChange={(e) => setCustomHeaders(e.target.value)}
                                                placeholder="Authorization: Bearer token&#10;X-Custom-Header: value"
                                                className="w-full h-24 p-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-md focus:border-emerald-500 outline-none transition-colors"
                                                disabled={isScanning}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Cookies</label>
                                                <span className="text-[9px] text-gray-400">key=value; key2=value2</span>
                                            </div>
                                            <textarea
                                                value={customCookies}
                                                onChange={(e) => setCustomCookies(e.target.value)}
                                                placeholder="PHPSESSID=xxxxxx;&#10;security=low"
                                                className="w-full h-24 p-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-md focus:border-emerald-500 outline-none transition-colors"
                                                disabled={isScanning}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-medium text-red-900 text-sm">Scan Failed</div>
                                    <div className="text-xs text-red-700 mt-1">{error}</div>
                                </div>
                            </div>
                        )}

                        {/* Scanning Progress */}
                        {isScanning && (
                            <div className="bg-white rounded-md border border-gray-200 overflow-hidden mb-6">
                                <div className="p-5 border-b border-gray-100">
                                    {/* Fix 6: Live status text so user knows what's happening */}
                                    <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-md flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
                                        <p className="text-xs text-emerald-700 font-medium">
                                            {scanProgress < 15 ? 'Initializing agents and connecting to target...' :
                                             scanProgress < 30 ? 'Running reconnaissance — discovering endpoints...' :
                                             scanProgress < 45 ? 'Testing for SQL Injection vulnerabilities...' :
                                             scanProgress < 55 ? 'Scanning for XSS attack vectors...' :
                                             scanProgress < 65 ? 'Checking CSRF token protections...' :
                                             scanProgress < 75 ? 'Testing SSRF and server-side request paths...' :
                                             scanProgress < 85 ? 'Auditing authentication mechanisms...' :
                                             scanProgress < 95 ? 'Running API security and header checks...' :
                                             'AI is correlating findings and generating report...'}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <Activity className="w-5 h-5 text-gray-900 animate-pulse" />
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">Scan in Progress</h3>
                                                <p className="text-xs text-gray-500">{targetUrl}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            {scanResults && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Terminate this security audit?')) {
                                                            try {
                                                                await api.cancelScan(scanResults.id);
                                                                // The interval will catch the 'cancelled' status in next poll
                                                            } catch (err: any) {
                                                                alert(err.message || 'Cancellation failed');
                                                            }
                                                        }
                                                    }}
                                                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-all font-sans"
                                                >
                                                    Cancel Scan
                                                </button>
                                            )}
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-gray-900 font-mono">{Math.round(scanProgress)}%</div>
                                                <div className="text-[10px] text-gray-400 uppercase tracking-widest text-center">Complete</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gray-900 rounded-full transition-all duration-500"
                                            style={{ width: `${scanProgress}%` }}
                                        />
                                    </div>
                                </div>

                                {/* ─── Live Attack Map ─── */}
                                <div className="p-5 border-t border-gray-100 bg-white">
                                    <LiveAttackMap
                                        scanId={scanResults?.id ?? null}
                                        isScanning={isScanning}
                                        targetUrl={targetUrl}
                                        agentStatuses={agentStatuses}
                                        onEventReceived={(event) => {
                                            if (event.type === 'agent_start') {
                                                addLog('scan', `Agent launched: ${event.agent}`);
                                            } else if (event.type === 'vulnerability_found') {
                                                addLog('error', `VULN: ${event.title ?? event.vulnerability_type} [${event.severity}]`);
                                            } else if (event.type === 'agent_complete') {
                                                addLog('success', `Agent complete: ${event.agent} → ${event.vulnerabilities_found ?? 0} findings`);
                                            }
                                        }}
                                    />
                                </div>

                                {/* Agent Status Grid - Animated Cards */}
                                <div className="p-6 bg-gradient-to-br from-amber-50/50 to-green-50/50">
                                    <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Security Agents</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {agentStatuses.map((agent, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-4 rounded-xl border-2 transition-all duration-300 ${agent.status === 'active'
                                                    ? 'bg-gray-100 border-gray-400 shadow-lg shadow-gray-200/50'
                                                    : agent.status === 'completed'
                                                        ? 'bg-amber-50 border-amber-300'
                                                        : 'bg-white border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${agent.status === 'active'
                                                        ? 'bg-gray-600 text-white'
                                                        : agent.status === 'completed'
                                                            ? 'bg-amber-500 text-white'
                                                            : 'bg-gray-200 text-gray-500'
                                                        }`}>
                                                        {agent.status === 'active' ? (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : agent.status === 'completed' ? (
                                                            <CheckCircle className="w-4 h-4" />
                                                        ) : (
                                                            agent.icon
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-gray-800 text-sm truncate">{agent.name}</div>
                                                        <div className={`text-xs font-medium ${agent.status === 'active' ? 'text-gray-600' :
                                                            agent.status === 'completed' ? 'text-amber-700' : 'text-gray-400'
                                                            }`}>
                                                            {agent.status === 'active' ? 'Scanning...' :
                                                                agent.status === 'completed' ? 'Complete' : 'Queued'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Terminal Output - Warm Beige Theme with Border */}
                                <div className="p-5 bg-gradient-to-br from-amber-50 to-green-50 border-t-2 border-amber-300 font-mono text-sm rounded-b-md">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Terminal className="w-4 h-4 text-amber-600" />
                                        <span className="text-amber-700 text-xs uppercase tracking-wide font-semibold">Live Output</span>
                                    </div>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {terminalLogs.length === 0 ? (
                                            <p className="text-gray-500"><span className="text-amber-600">$</span> Awaiting scan initialization...</p>
                                        ) : (
                                            terminalLogs.map((log, idx) => (
                                                <p key={idx} className="text-gray-700">
                                                    {log.type === 'cmd' && <><span className="text-amber-600 font-bold">$</span> {log.message}</>}
                                                    {log.type === 'info' && <><span className="text-blue-600 font-semibold">[INFO]</span> {log.message}</>}
                                                    {log.type === 'scan' && <><span className="text-amber-600 font-semibold">[SCAN]</span> {log.message}</>}
                                                    {log.type === 'success' && <><span className="text-green-600 font-semibold">[OK]</span> {log.message}</>}
                                                    {log.type === 'warn' && <><span className="text-orange-600 font-semibold">[WARN]</span> {log.message}</>}
                                                    {log.type === 'error' && <><span className="text-red-600 font-semibold">[ERROR]</span> {log.message}</>}
                                                </p>
                                            ))
                                        )}
                                        {isScanning && <p className="text-amber-500 animate-pulse">▌</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ========================================
                            PROFESSIONAL SECURITY REPORT RESULTS
                            ======================================== */}
                        {scanResults && !isScanning && (
                            <div className="space-y-6">
                                {/* Attack Map — Completed State */}
                                <LiveAttackMap
                                    scanId={scanResults.id}
                                    isScanning={false}
                                    targetUrl={targetUrl}
                                    findings={findings}
                                    agentStatuses={agentStatuses}
                                />

                                {/* Fix 5: Plain-English Executive Summary Card */}
                                <div className={`rounded-xl p-5 border-2 ${(
                                    scanResults?.critical_count ?? 0) > 0
                                        ? 'bg-red-50 border-red-200'
                                        : (scanResults?.high_count ?? 0) > 0
                                            ? 'bg-orange-50 border-orange-200'
                                            : (scanResults?.total_vulnerabilities ?? 0) > 0
                                                ? 'bg-yellow-50 border-yellow-200'
                                                : 'bg-green-50 border-green-200'
                                }`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            (scanResults?.critical_count ?? 0) > 0 ? 'bg-red-100' :
                                            (scanResults?.high_count ?? 0) > 0 ? 'bg-orange-100' :
                                            (scanResults?.total_vulnerabilities ?? 0) > 0 ? 'bg-yellow-100' : 'bg-green-100'
                                        }`}>
                                            {(scanResults?.critical_count ?? 0) > 0
                                                ? <XCircle className="w-6 h-6 text-red-600" />
                                                : (scanResults?.total_vulnerabilities ?? 0) > 0
                                                    ? <AlertTriangle className="w-6 h-6 text-yellow-600" />
                                                    : <ShieldCheck className="w-6 h-6 text-green-600" />
                                            }
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Executive Summary — Plain English</p>
                                            <h3 className={`text-lg font-bold mb-1 ${
                                                (scanResults?.critical_count ?? 0) > 0 ? 'text-red-700' :
                                                (scanResults?.high_count ?? 0) > 0 ? 'text-orange-700' :
                                                (scanResults?.total_vulnerabilities ?? 0) > 0 ? 'text-yellow-700' : 'text-green-700'
                                            }`}>
                                                {(scanResults?.critical_count ?? 0) > 0
                                                    ? `⚠️ Your site has ${scanResults?.critical_count} critical security hole${(scanResults?.critical_count ?? 0) > 1 ? 's' : ''} — a hacker can exploit ${(scanResults?.critical_count ?? 0) > 1 ? 'these' : 'this'} right now.`
                                                    : (scanResults?.high_count ?? 0) > 0
                                                        ? `🔶 Your site has ${scanResults?.high_count} serious issue${(scanResults?.high_count ?? 0) > 1 ? 's' : ''} that need attention before going live.`
                                                        : (scanResults?.total_vulnerabilities ?? 0) > 0
                                                            ? `🔵 ${scanResults?.total_vulnerabilities} minor issue${(scanResults?.total_vulnerabilities ?? 0) > 1 ? 's' : ''} found. Low risk — review when convenient.`
                                                            : '✅ No security vulnerabilities found. Your site looks clean!'}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {(scanResults?.critical_count ?? 0) > 0
                                                    ? 'Scroll down to see each issue. Click any finding to expand it, then use the "Fix with AI" button to get step-by-step instructions on how to close the security hole.'
                                                    : (scanResults?.total_vulnerabilities ?? 0) > 0
                                                        ? 'No emergency action needed, but review the findings below when you get a chance. Each one explains what it means in plain terms.'
                                                        : 'Great job! Matrix tested your site with 8 specialized security agents and found nothing to worry about. Scan again after your next major update.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Report Header - Executive Summary */}
                                <header className="bg-white rounded-md border border-gray-200 p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest mb-2">
                                                <FileText className="w-3.5 h-3.5" />
                                                Security Assessment Report
                                            </div>
                                            <h2 className="report-title text-xl font-semibold text-gray-900 mb-1">
                                                Vulnerability Analysis
                                            </h2>
                                            <p className="text-sm text-gray-600 font-mono">{targetUrl}</p>
                                        </div>
                                        <div className="flex items-center gap-2 no-print">
                                            <button
                                                onClick={() => copyToClipboard(JSON.stringify(findings, null, 2))}
                                                className="p-2 hover:bg-gray-100 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700"
                                                title="Copy JSON"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => router.push(`/scans/${scanResults.id}`)}
                                                className="p-2 hover:bg-gray-100 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700"
                                                title="Download Report"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Risk Posture Statement */}
                                    <div className="p-4 bg-gray-50 rounded-md border border-gray-200 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-xs text-gray-500 uppercase tracking-wide">Risk Posture:</span>
                                                <span className={`ml-2 font-semibold ${getRiskPosture().class}`}>
                                                    {getRiskPosture().level}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-700 mt-2">
                                            {getExposureSummary()}
                                        </p>
                                    </div>

                                    {/* Severity Distribution - Compact Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr>
                                                    <th className="text-left">Severity</th>
                                                    <th className="text-center w-20">Count</th>
                                                    <th className="text-left">Distribution</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[
                                                    { severity: 'Critical', count: scanResults?.critical_count || 0, color: '#dc2626' },
                                                    { severity: 'High', count: scanResults?.high_count || 0, color: '#ea580c' },
                                                    { severity: 'Medium', count: scanResults?.medium_count || 0, color: '#ca8a04' },
                                                    { severity: 'Low', count: scanResults?.low_count || 0, color: '#6b7280' },
                                                ].map((item) => {
                                                    const total = scanResults?.total_vulnerabilities || 1;
                                                    const percentage = (item.count / total) * 100;
                                                    return (
                                                        <tr key={item.severity}>
                                                            <td className="font-medium">{item.severity}</td>
                                                            <td className="text-center font-mono">{item.count}</td>
                                                            <td>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full rounded-full"
                                                                            style={{
                                                                                width: `${Math.max(percentage, item.count > 0 ? 5 : 0)}%`,
                                                                                backgroundColor: item.color
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs text-gray-500 w-10">
                                                                        {percentage.toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </header>

                                {/* Tabs */}
                                <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                                    <div className="flex border-b border-gray-200">
                                        {[
                                            { id: 'findings', label: 'Findings', count: findings.length },
                                            { id: 'overview', label: 'Overview' },
                                            { id: 'details', label: 'Technical Details' }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === tab.id
                                                    ? 'border-gray-900 text-gray-900'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {tab.label}
                                                {tab.count !== undefined && (
                                                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {tab.count}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="p-6">
                                        {/* Findings Tab - TABLE BASED */}
                                        {activeTab === 'findings' && (
                                            <div>
                                                {findings.length === 0 ? (
                                                    <div className="text-center py-12">
                                                        <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Vulnerabilities Detected</h4>
                                                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                                                            The scan completed without detecting any security vulnerabilities.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                                                        <table className="w-full">
                                                            <thead>
                                                                <tr>
                                                                    <th className="w-8">#</th>
                                                                    <th className="text-left">Vulnerability</th>
                                                                    <th className="text-left w-24">Severity</th>
                                                                    <th className="text-left w-16">CVSS</th>
                                                                    <th className="text-left">Location</th>
                                                                    <th className="w-10"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {findings.map((vuln, i) => (
                                                                    <>
                                                                        <tr
                                                                            key={i}
                                                                            className={`cursor-pointer ${expandedVuln === i ? 'bg-gray-50' : ''}`}
                                                                            onClick={() => setExpandedVuln(expandedVuln === i ? null : i)}
                                                                        >
                                                                            <td className="text-center font-mono text-gray-400">{i + 1}</td>
                                                                            <td>
                                                                                <div className="font-medium text-gray-900 capitalize">
                                                                                    {vuln.vulnerability_type.replace(/_/g, ' ')}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                                    {getCWEMapping(vuln.vulnerability_type)}
                                                                                </div>
                                                                            </td>
                                                                            <td>
                                                                                <span className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wide rounded border ${getSeverityClass(vuln.severity)}`}>
                                                                                    {vuln.severity}
                                                                                </span>
                                                                            </td>
                                                                            <td className="font-mono">
                                                                                {getCVSSScore(vuln.severity).toFixed(1)}
                                                                            </td>
                                                                            <td className="font-mono text-xs text-gray-600 max-w-xs truncate">
                                                                                {vuln.url}
                                                                                {vuln.parameter && (
                                                                                    <span className="text-gray-400 ml-1">[{vuln.parameter}]</span>
                                                                                )}
                                                                            </td>
                                                                            <td>
                                                                                {expandedVuln === i ? (
                                                                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                                                                ) : (
                                                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                        {expandedVuln === i && (
                                                                            <tr>
                                                                                <td colSpan={6} className="p-0">
                                                                                    <div className={`p-5 bg-gray-50 border-l-4 ${getSeverityBorder(vuln.severity)}`}>
                                                                                        {/* Fix 2: Plain-English "What does this mean?" with dynamic LLM loading option */}
                                                                                        <VulnerabilityMeaningBox vuln={vuln} />

                                                                                        {/* CVSS Vector */}
                                                                                        <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                                                                                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">CVSS Vector</div>
                                                                                            <code className="text-xs text-gray-700 font-mono">
                                                                                                {getCVSSVector(vuln.severity)}
                                                                                            </code>
                                                                                        </div>

                                                                                        {/* Evidence */}
                                                                                        <div className="mb-4">
                                                                                            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Evidence</h5>
                                                                                            <pre className="p-3 bg-gray-900 rounded text-xs text-green-400 font-mono overflow-x-auto">
                                                                                                {vuln.evidence || 'Vulnerability detected through automated security analysis.'}
                                                                                            </pre>
                                                                                        </div>

                                                                                        {/* Description */}
                                                                                        <div className="mb-4">
                                                                                            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Description</h5>
                                                                                            <p className="text-sm text-gray-700 leading-relaxed">
                                                                                                {vuln.description || `A ${vuln.severity} severity ${vuln.vulnerability_type.replace(/_/g, ' ')} vulnerability was detected. This type of vulnerability can allow attackers to compromise application security.`}
                                                                                            </p>
                                                                                        </div>

                                                                                        {/* Remediation */}
                                                                                        <div className="mb-4">
                                                                                            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Remediation</h5>
                                                                                            <p className="text-sm text-gray-700 leading-relaxed p-3 bg-green-50 border border-green-200 rounded">
                                                                                                {vuln.remediation || 'Review and sanitize all user inputs. Implement proper input validation and output encoding following OWASP guidelines.'}
                                                                                            </p>
                                                                                        </div>

                                                                                        {/* References */}
                                                                                        <div className="flex items-center gap-4 text-xs">
                                                                                            <span className="text-gray-500">References:</span>
                                                                                            <a href="https://owasp.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                                                OWASP <ExternalLink className="w-3 h-3" />
                                                                                            </a>
                                                                                            <a href={`https://cwe.mitre.org/data/definitions/${getCWEMapping(vuln.vulnerability_type).split('-')[1]}.html`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                                                {getCWEMapping(vuln.vulnerability_type)} <ExternalLink className="w-3 h-3" />
                                                                                            </a>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Overview Tab */}
                                        {activeTab === 'overview' && (
                                            <div className="space-y-6">
                                                {/* Quick Actions */}
                                                <div>
                                                    <h4 className="section-header">Actions</h4>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <button
                                                            onClick={() => router.push(`/scans/${scanResults.id}`)}
                                                            className="p-4 bg-gray-50 rounded-md border border-gray-200 hover:border-gray-300 text-left"
                                                        >
                                                            <FileText className="w-5 h-5 text-gray-600 mb-2" />
                                                            <div className="text-sm font-medium text-gray-900">Export PDF</div>
                                                            <div className="text-xs text-gray-500">Download report</div>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const exportData = {
                                                                    scan: scanResults,
                                                                    findings: findings,
                                                                    exportedAt: new Date().toISOString(),
                                                                    version: '1.0'
                                                                };
                                                                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                                                                const url = URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `Matrix_Scan_${scanResults.id}_${new Date().toISOString().split('T')[0]}.json`;
                                                                a.click();
                                                                URL.revokeObjectURL(url);
                                                            }}
                                                            className="p-4 bg-gray-50 rounded-md border border-gray-200 hover:border-gray-300 text-left"
                                                        >
                                                            <Code className="w-5 h-5 text-gray-600 mb-2" />
                                                            <div className="text-sm font-medium text-gray-900">Export JSON</div>
                                                            <div className="text-xs text-gray-500">Machine-readable</div>
                                                        </button>
                                                        <Link
                                                            href={`/scans/${scanResults.id}`}
                                                            className="p-4 bg-gray-50 rounded-md border border-gray-200 hover:border-gray-300 text-left"
                                                        >
                                                            <Eye className="w-5 h-5 text-gray-600 mb-2" />
                                                            <div className="text-sm font-medium text-gray-900">Full Analysis</div>
                                                            <div className="text-xs text-gray-500">Detailed view</div>
                                                        </Link>
                                                    </div>
                                                </div>

                                                {/* Scan Metrics */}
                                                <div>
                                                    <h4 className="section-header">Scan Metrics</h4>
                                                    <div className="grid grid-cols-4 gap-4">
                                                        {[
                                                            { label: 'Total Findings', value: scanResults?.total_vulnerabilities || 0 },
                                                            { label: 'Critical', value: scanResults?.critical_count || 0 },
                                                            { label: 'High', value: scanResults?.high_count || 0 },
                                                            { label: 'Medium + Low', value: (scanResults?.medium_count || 0) + (scanResults?.low_count || 0) },
                                                        ].map((metric, i) => (
                                                            <div key={i} className="p-4 bg-gray-50 rounded-md border border-gray-200">
                                                                <div className="text-2xl font-bold text-gray-900 font-mono">{metric.value}</div>
                                                                <div className="text-xs text-gray-500 mt-1">{metric.label}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Technical Details Tab */}
                                        {activeTab === 'details' && (
                                            <div className="space-y-6">
                                                {/* Scan Configuration */}
                                                <div>
                                                    <h4 className="section-header">Scan Configuration</h4>
                                                    <div className="bg-gray-900 rounded-md p-4 font-mono text-xs">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-gray-400">Configuration & Results</span>
                                                            <button
                                                                onClick={() => copyToClipboard(JSON.stringify({
                                                                    scan_id: scanResults.id,
                                                                    target: targetUrl,
                                                                    status: scanResults.status,
                                                                    total_vulnerabilities: scanResults.total_vulnerabilities,
                                                                    severity_breakdown: {
                                                                        critical: scanResults.critical_count,
                                                                        high: scanResults.high_count,
                                                                        medium: scanResults.medium_count,
                                                                        low: scanResults.low_count
                                                                    }
                                                                }, null, 2))}
                                                                className="text-gray-500 hover:text-white flex items-center gap-1"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                                Copy
                                                            </button>
                                                        </div>
                                                        <pre className="text-green-400 overflow-x-auto">
                                                            {`{
  "scan_id": "${scanResults.id}",
  "target": "${targetUrl}",
  "status": "${scanResults.status}",
  "progress": ${scanResults.progress},
  "total_vulnerabilities": ${scanResults.total_vulnerabilities},
  "severity_breakdown": {
    "critical": ${scanResults.critical_count},
    "high": ${scanResults.high_count},
    "medium": ${scanResults.medium_count},
    "low": ${scanResults.low_count}
  },
  "scan_engine": "Matrix Security Platform v1.0"
}`}
                                                        </pre>
                                                    </div>
                                                </div>

                                                {/* Security Agents */}
                                                <div>
                                                    <h4 className="section-header">Security Agents Deployed</h4>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[
                                                            { name: 'SQL Injection Detector', icon: <Database className="w-4 h-4" /> },
                                                            { name: 'XSS Scanner', icon: <Code className="w-4 h-4" /> },
                                                            { name: 'CSRF Analyzer', icon: <Shield className="w-4 h-4" /> },
                                                            { name: 'SSRF Detector', icon: <Server className="w-4 h-4" /> },
                                                            { name: 'Auth Tester', icon: <Lock className="w-4 h-4" /> },
                                                            { name: 'API Security Auditor', icon: <Globe className="w-4 h-4" /> },
                                                        ].map((agent, i) => (
                                                            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                                                                <div className="text-gray-500">{agent.icon}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-medium text-gray-900 truncate">{agent.name}</div>
                                                                    <div className="text-xs text-green-600">✓ Completed</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!isScanning && !scanResults && (
                            <div className="bg-white rounded-md border border-gray-200 p-12 text-center">
                                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Scan</h3>
                                <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                                    Enter a target URL above to start the security assessment.
                                </p>

                                {/* Features Grid - Minimal */}
                                <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
                                    {[
                                        { icon: <Database className="w-4 h-4" />, label: 'SQL Injection' },
                                        { icon: <Code className="w-4 h-4" />, label: 'XSS Detection' },
                                        { icon: <Shield className="w-4 h-4" />, label: 'CSRF Analysis' },
                                        { icon: <Server className="w-4 h-4" />, label: 'SSRF Scanner' },
                                    ].map((feature, i) => (
                                        <div key={i} className="p-3 bg-gray-50 rounded-md text-center">
                                            <div className="text-gray-400 flex justify-center mb-1">{feature.icon}</div>
                                            <div className="text-xs text-gray-600">{feature.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div >

            {/* WAF Evasion Warning Modal */}
            {
                showWafWarningModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="bg-amber-50 border-b border-amber-200 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                                        <ShieldAlert className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Advanced WAF Evasion</h3>
                                        <p className="text-xs text-amber-700">Authorization Required</p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 overflow-y-auto flex-1">
                                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                                    <p className="text-sm text-red-800 font-medium mb-2">⚠️ Warning: Potential Risks</p>
                                    <ul className="text-xs text-red-700 space-y-1">
                                        <li>• May trigger security alerts on target systems</li>
                                        <li>• Could be flagged as malicious by WAFs and ISPs</li>
                                        <li>• May violate Terms of Service of target systems</li>
                                        <li>• Use only on systems you own or have written authorization</li>
                                    </ul>
                                </div>

                                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
                                    <p className="text-sm text-gray-800 font-medium mb-2">Terms of Use</p>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        By enabling this feature, you confirm that you have explicit written
                                        authorization to perform advanced security testing on the target system.
                                        You accept full responsibility for any consequences.
                                    </p>
                                </div>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={wafEvasionConsent}
                                        onChange={(e) => setWafEvasionConsent(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        I acknowledge the risks and confirm I have authorization to test this target
                                    </span>
                                </label>
                            </div>

                            {/* Footer */}
                            <div className="flex gap-3 p-4 bg-gray-50 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setShowWafWarningModal(false);
                                        setWafEvasionConsent(false);
                                    }}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (wafEvasionConsent) {
                                            setEnableWafEvasion(true);
                                            setShowWafWarningModal(false);
                                        }
                                    }}
                                    disabled={!wafEvasionConsent}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Enable WAF Evasion
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Pre-Scan Warning Modal */}
            {
                showPreScanWarning && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="bg-blue-50 border-b border-blue-200 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Scanner Best Practices</h3>
                                        <p className="text-xs text-blue-700">Optimize your scan results</p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-4 overflow-y-auto flex-1">
                                <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                                    <p className="text-sm text-amber-900 font-semibold mb-2">⚠️ Scanning Production Applications</p>
                                    <p className="text-sm text-amber-800 leading-relaxed">
                                        This scanner is optimized for <strong>less mature applications</strong> and development targets.
                                        Production-grade sites (like Instagram, Facebook, Google) have aggressive rate limiting
                                        that may result in:
                                    </p>
                                    <ul className="text-sm text-amber-800 mt-2 space-y-1 ml-4">
                                        <li>• <strong>False positives</strong> from rate limit responses</li>
                                        <li>• <strong>Very slow scans</strong> (10+ minutes per site)</li>
                                        <li>• <strong>Incomplete results</strong> due to timeouts</li>
                                    </ul>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                                    <p className="text-sm text-green-900 font-semibold mb-2">✅ Best Results On</p>
                                    <ul className="text-sm text-green-800 space-y-1">
                                        <li>• Small business websites</li>
                                        <li>• Internal/enterprise tools</li>
                                        <li>• Startup MVPs</li>
                                        <li>• Legacy applications</li>
                                        <li>• Development environments</li>
                                    </ul>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                    <p className="text-sm text-blue-900 font-semibold mb-2">🎯 Try the Demo Site</p>
                                    <p className="text-sm text-blue-800 mb-3">
                                        Test the scanner on a purposely vulnerable application:
                                    </p>
                                    <button
                                        onClick={async () => {
                                            setShowPreScanWarning(false);
                                            if (dontShowAgain) {
                                                localStorage.setItem('matrix_skip_scan_warning', 'true');
                                            }
                                            setTargetUrl('https://pentest-ground.com:4280');

                                            // Small delay for state update
                                            setTimeout(async () => {
                                                const demoUrl = 'https://pentest-ground.com:4280';
                                                setIsScanning(true);
                                                setScanProgress(0);
                                                setScanResults(null);
                                                setFindings([]);
                                                setError(null);
                                                setTerminalLogs([]);

                                                try {
                                                    const newScan = await api.createScan({
                                                        target_url: demoUrl,
                                                        scan_type: 'FULL',
                                                        enable_waf_evasion: enableWafEvasion,
                                                        waf_evasion_consent: wafEvasionConsent
                                                    });

                                                    setScanResults(newScan);

                                                    // Polling
                                                    let failures = 0;
                                                    const interval = setInterval(async () => {
                                                        try {
                                                            const statusUpdate = await api.getScan(newScan.id);
                                                            failures = 0;
                                                            setScanProgress(statusUpdate.progress);
                                                            setScanResults(statusUpdate);

                                                            if (statusUpdate.status === 'completed') {
                                                                clearInterval(interval);
                                                                setIsScanning(false);
                                                                const results = await api.getVulnerabilities(newScan.id);
                                                                setFindings(results.items);
                                                                router.push(`/scan?id=${newScan.id}`, { scroll: false });
                                                            } else if (statusUpdate.status === 'failed' || statusUpdate.status === 'cancelled') {
                                                                clearInterval(interval);
                                                                setIsScanning(false);
                                                                setError(statusUpdate.error_message || 'Scan failed');
                                                            }
                                                        } catch {
                                                            failures++;
                                                            if (failures >= 3) {
                                                                clearInterval(interval);
                                                                setIsScanning(false);
                                                                setError('Lost connection');
                                                            }
                                                        }
                                                    }, 2000);
                                                } catch (err: any) {
                                                    setIsScanning(false);
                                                    setError(err.message || 'Failed to start demo scan');
                                                }
                                            }, 100);
                                        }}
                                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                                    >
                                        <Zap className="w-4 h-4" />
                                        Start Demo Scan Now
                                    </button>
                                    <p className="text-xs text-blue-600 mt-2 text-center font-mono">
                                        pentest-ground.com:4280
                                    </p>
                                </div>

                                {/* Don't show again checkbox */}
                                <div className="px-1 mt-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={dontShowAgain}
                                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                                            />
                                        </div>
                                        <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                                            Don't show this warning again
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex gap-3 p-4 bg-gray-50 border-t border-gray-200">
                                <button
                                    onClick={() => setShowPreScanWarning(false)}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        handleStartScan();
                                    }}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                                >
                                    I Understand, Proceed Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </ProtectedRoute >
    );
}

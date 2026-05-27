'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useXPSystem } from '@/context/XPSystem';
import Link from 'next/link';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Heart, 
  Play, 
  Plus, 
  RefreshCw,
  Terminal,
  Activity,
  Award,
  AlertTriangle,
  Mail,
  Database,
  Lock,
  Wifi,
  Tv,
  HelpCircle,
  Info,
  Server,
  Monitor,
  Maximize2,
  Minimize2,
  X,
  Minus,
  Check,
  ChevronRight,
  ShieldAlert as AlertIcon,
  Search,
  CheckCircle,
  Radio,
  Power,
  FolderOpen,
  Globe,
  Cpu,
  FileText,
  AlertOctagon
} from 'lucide-react';

interface DefenseModule {
  id: string;
  name: string;
  cost: number;
  description: string;
  countertype: string;
}

const DEFENSES: DefenseModule[] = [
  { id: 'firewall', name: 'Web Application WAF', cost: 40, description: 'Auto-deflects database SQL Injection request queries.', countertype: 'sqli' },
  { id: 'antivirus', name: 'Premium Antivirus Guard', cost: 50, description: 'Automatically detects and quarantines malicious system binaries.', countertype: 'malware' },
  { id: '2fa', name: 'MFA Safeguard Engine', cost: 35, description: 'Automatically blocks incoming phishing session redirection attempts.', countertype: 'phishing' },
  { id: 'vpn', name: 'WireGuard Tunneling Module', cost: 40, description: 'Auto-routes network routes to protect against ARP and DNS redirection.', countertype: 'mitm' }
];

// Mock database structures for interactive challenges
interface EmailItem {
  id: string;
  sender: string;
  subject: string;
  headers: string;
  isPhishing: boolean;
}

interface SQLQueryItem {
  id: string;
  sourceIP: string;
  query: string;
  isMalicious: boolean;
}

interface ProcessItem {
  pid: number;
  name: string;
  path: string;
  cpu: string;
  signature: string;
  isMalicious: boolean;
}

interface NetworkRoute {
  gatewayIp: string;
  targetMac: string;
  type: string;
  isSpoofed: boolean;
}

interface ActiveChallenge {
  id: string;
  type: 'phishing' | 'sqli' | 'malware' | 'mitm';
  name: string;
  codebook: {
    classification: string;
    description: string;
    detection: string;
    mitigation: string;
  };
  alertMsg: string;
  hint: string;
  targetApp: 'email' | 'database' | 'antivirus' | 'vpn';
  
  // App states
  emails?: EmailItem[];
  queries?: SQLQueryItem[];
  processes?: ProcessItem[];
  routes?: NetworkRoute[];
}

interface BreachState {
  phase: 'encrypting' | 'exfiltrating';
  progress: number;
  encryptedCount: number;
}

// -------------------------------------------------------------
// HELPER SHUFFLER
// -------------------------------------------------------------
const shuffleArray = <T,>(arr: T[]): T[] => {
  return [...arr].sort(() => Math.random() - 0.5);
};

// -------------------------------------------------------------
// STANDARDIZED MOCK TRAFFIC DATA GENERATORS (CLEAN BACKUPS)
// -------------------------------------------------------------
const generateCleanEmails = (): EmailItem[] => [
  {
    id: 'clean_e1',
    sender: 'HR Operations <hr@matrix-global.com>',
    subject: 'Action Required: Submit Q2 Reimbursement Details',
    headers: 'From: "HR Operations" <hr@matrix-global.com>\nReply-To: hr@matrix-global.com\nReturn-Path: hr@matrix-global.com\nSPF: Pass\nDKIM: Pass',
    isPhishing: false
  },
  {
    id: 'clean_e2',
    sender: 'IT Admin <it-helpdesk@matrix-global.com>',
    subject: 'Weekly Server Backup Checklist',
    headers: 'From: "IT Helpdesk" <it-helpdesk@matrix-global.com>\nReply-To: it-helpdesk@matrix-global.com\nReturn-Path: it-helpdesk@matrix-global.com\nSPF: Pass\nDKIM: Pass',
    isPhishing: false
  },
  {
    id: 'clean_e3',
    sender: 'Finance Team <payroll@matrix-global.com>',
    subject: 'Your Monthly Salary Slip is Ready',
    headers: 'From: "Finance Team" <payroll@matrix-global.com>\nReply-To: payroll@matrix-global.com\nReturn-Path: payroll@matrix-global.com\nSPF: Pass\nDKIM: Pass',
    isPhishing: false
  },
  {
    id: 'clean_e4',
    sender: 'DevOps Alerts <grafana@matrix-ops.internal>',
    subject: 'Warning: High disk utilization on db-node-01',
    headers: 'From: "Grafana Agent" <grafana@matrix-ops.internal>\nReply-To: admin@matrix-ops.internal\nReturn-Path: root@matrix-ops.internal\nSPF: Pass',
    isPhishing: false
  },
  {
    id: 'clean_e5',
    sender: 'Legal Dept <legal-review@matrix-global.com>',
    subject: 'NDA Draft for External Contractors',
    headers: 'From: "Corporate Legal" <legal-review@matrix-global.com>\nReply-To: legal-review@matrix-global.com\nSPF: Pass\nDKIM: Pass',
    isPhishing: false
  }
];

const generateCleanQueries = (): SQLQueryItem[] => [
  {
    id: 'clean_q1',
    sourceIP: '10.0.12.85',
    query: "SELECT name, price FROM products WHERE status = 'active' AND price < 250;",
    isMalicious: false
  },
  {
    id: 'clean_q2',
    sourceIP: '10.0.12.99',
    query: "INSERT INTO system_logs (user_id, event) VALUES (108, 'Successful dashboard authentication');",
    isMalicious: false
  },
  {
    id: 'clean_q3',
    sourceIP: '10.0.12.110',
    query: "SELECT COUNT(*) FROM sessions WHERE active = true AND expires_at > NOW();",
    isMalicious: false
  },
  {
    id: 'clean_q4',
    sourceIP: '10.0.12.112',
    query: "UPDATE profile SET dark_mode = true WHERE user_id = 998;",
    isMalicious: false
  },
  {
    id: 'clean_q5',
    sourceIP: '10.0.12.50',
    query: "SELECT id, name FROM users WHERE email = 'johndoe@matrix-global.com';",
    isMalicious: false
  }
];

const generateCleanProcesses = (): ProcessItem[] => [
  { pid: 480, name: 'system_idle.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false },
  { pid: 1402, name: 'chrome.exe', path: 'C:\\Program Files\\Google\\', cpu: '4%', signature: 'Google Verified', isMalicious: false },
  { pid: 1022, name: 'svchost.exe', path: 'C:\\Windows\\System32\\', cpu: '2%', signature: 'Microsoft Verified', isMalicious: false },
  { pid: 3012, name: 'taskmgr.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false },
  { pid: 4120, name: 'slack.exe', path: 'C:\\Users\\User\\AppData\\Local\\Slack\\', cpu: '3%', signature: 'Slack Verified', isMalicious: false }
];

const generateCleanRoutes = (): NetworkRoute[] => [
  { gatewayIp: '192.168.1.1', targetMac: '00-14-22-01-EE-FF', type: 'ROUTER_DEFAULT', isSpoofed: false },
  { gatewayIp: '192.168.1.20', targetMac: '00-25-90-A8-11-22', type: 'INTERNAL_DHCP', isSpoofed: false },
  { gatewayIp: '192.168.1.100', targetMac: 'BC-EE-7B-D1-88-99', type: 'INTERNAL_WS', isSpoofed: false },
  { gatewayIp: '10.0.0.5', targetMac: '00-11-22-33-44-55', type: 'INT_DNS', isSpoofed: false }
];

// ---- DECOY APP DATA ----
// Corporate file system snapshot for the File Manager decoy app
const CORPORATE_FILES = [
  'Documents/Financial_Reports_Q2_2025.xlsx',
  'Documents/Employee_Database_HR.csv',
  'Documents/API_Keys_Production.txt',
  'Documents/Client_Contracts_NDA.pdf',
  'Projects/matrix-core/config.env',
  'Projects/api-gateway/secrets.json',
  'Desktop/Board_Meeting_Notes.docx',
  'Downloads/System_Backup_Nov.zip',
  'AppData/Chrome/Default/Login_Data',
  'AppData/Outlook/profile.ost',
  'Documents/Q3_Strategy_Confidential.pptx',
  'Desktop/SSH_Keys/id_rsa_prod',
];

// Browser tab mock data for the internal corporate browser decoy
const BROWSER_TABS = [
  { title: 'Confluence — Internal Wiki', url: 'https://wiki.matrix-global.internal/home', content: 'Internal knowledge base for project documentation, runbooks, and engineering procedures. Last edited by devops-team 4h ago.' },
  { title: 'JIRA — Sprint Board SEC', url: 'https://jira.matrix-global.internal/project/SEC', content: 'Active sprint: SEC-821 (Login rate limiter), SEC-889 (RBAC audit), SEC-904 (CVE patch review). 3 blockers flagged by QA.' },
  { title: 'GitHub — Matrix-Cyber', url: 'https://github.matrix-global.internal/matrix-cyber', content: 'Active PRs: #241 (API hardening), #248 (2FA impl). Last commit 2h ago by zahid@matrix-global.com. All CI checks pass.' },
  { title: 'Grafana — System Metrics', url: 'https://metrics.matrix-global.internal/dashboard', content: 'db-prod-01: CPU 42%, RAM 68%. API-GW: p99 312ms. Alert active: disk-node-03 at 89% capacity. Otherwise nominal.' },
];

// -------------------------------------------------------------
// STATIC REGISTRY OF 20 DIVERSE CYBERSECURITY ATTACK SCENARIOS
// -------------------------------------------------------------
interface ScenarioRegistryEntry {
  id: string;
  type: 'phishing' | 'sqli' | 'malware' | 'mitm';
  name: string;
  alertMsg: string;
  hint: string;
  targetApp: 'email' | 'database' | 'antivirus' | 'vpn';
  codebook: {
    classification: string;
    description: string;
    detection: string;
    mitigation: string;
  };
  generate: () => {
    emails?: EmailItem[];
    queries?: SQLQueryItem[];
    processes?: ProcessItem[];
    routes?: NetworkRoute[];
  };
}

const SCENARIOS_REGISTRY: ScenarioRegistryEntry[] = [
  // PHISHING (1-5)
  {
    id: 'phish_typosquat',
    type: 'phishing',
    name: 'Credential Harvesting Typosquatting',
    alertMsg: 'Suspicious incoming relay transmission captured by mail queue.',
    hint: 'Analyze return path header domains and SPF/DKIM flags to find Typosquatting mail indicators.',
    targetApp: 'email',
    codebook: {
      classification: 'Domain Typosquatting Phish',
      description: 'Attackers register domains similar to authentic services (e.g. matrix-portal-support.net instead of matrix-global.com) to deceive users into keying in credentials.',
      detection: 'Analyze return path header misalignment and SPF/DKIM validation failures. Legitimate domains will resolve with SPF: Pass.',
      mitigation: 'Quarantine and select "MARK AS PHISHING" on the credential-harvesting mail message.'
    },
    generate: () => ({
      emails: shuffleArray([
        {
          id: 'e_t1',
          sender: 'Accounts Verification <security-update@matrix-portal-support.net>',
          subject: 'WARNING: Account locked. Enter authentication keys immediately',
          headers: 'From: "Matrix Portal Support" <security-update@matrix-portal-support.net>\nReply-To: claims-hack@temporary-inbox.cc\nReturn-Path: bounce-daemon@evil-redirect.ru\nSPF: Fail (IP mismatch)\nDKIM: Fail\nWarning: Return-Path mismatch',
          isPhishing: true
        },
        {
          id: 'e_t2',
          sender: 'HR Operations <hr@matrix-global.com>',
          subject: 'Action Required: Submit Q2 Reimbursement Details',
          headers: 'From: "HR Operations" <hr@matrix-global.com>\nReply-To: hr@matrix-global.com\nReturn-Path: hr@matrix-global.com\nSPF: Pass\nDKIM: Pass',
          isPhishing: false
        },
        {
          id: 'e_t3',
          sender: 'IT Admin <it-helpdesk@matrix-global.com>',
          subject: 'Weekly Server Backup Checklist',
          headers: 'From: "IT Helpdesk" <it-helpdesk@matrix-global.com>\nReply-To: it-helpdesk@matrix-global.com\nReturn-Path: it-helpdesk@matrix-global.com\nSPF: Pass\nDKIM: Pass',
          isPhishing: false
        },
        {
          id: 'e_t4',
          sender: 'Finance Team <payroll@matrix-global.com>',
          subject: 'Your Monthly Salary Slip is Ready',
          headers: 'From: "Finance Team" <payroll@matrix-global.com>\nReply-To: payroll@matrix-global.com\nReturn-Path: payroll@matrix-global.com\nSPF: Pass\nDKIM: Pass',
          isPhishing: false
        },
        {
          id: 'e_t5',
          sender: 'DevOps Alerts <grafana@matrix-ops.internal>',
          subject: 'Warning: High disk utilization on db-node-01',
          headers: 'From: "Grafana Agent" <grafana@matrix-ops.internal>\nReply-To: admin@matrix-ops.internal\nReturn-Path: root@matrix-ops.internal\nSPF: Pass (internal lookup)',
          isPhishing: false
        }
      ])
    })
  },
  {
    id: 'phish_bec',
    type: 'phishing',
    name: 'Executive Identity Spoofing (BEC)',
    alertMsg: 'Direct routing intercept flags highly urgent executive transactional query.',
    hint: 'Analyze internal sender domains to identify spoofed executive emails requests.',
    targetApp: 'email',
    codebook: {
      classification: 'Business Email Compromise (BEC)',
      description: 'Attackers impersonate high-level executives (CEO, CFO) requesting urgent wire transfers or sensitive access authorization bypasses.',
      detection: 'Verify from the headers if the sender address utilizes a slightly modified external proxy domain (e.g. matrix-executive-team.com).',
      mitigation: 'Block the vector. Isolate the target mail, choose "MARK AS PHISHING" to restrict active links.'
    },
    generate: () => ({
      emails: shuffleArray([
        {
          id: 'e_b1',
          sender: 'CEO Office <ceo.office@matrix-executive-team.com>',
          subject: 'URGENT: Initiate immediate wire transfer for project acquisitions',
          headers: 'From: "CEO Office" <ceo.office@matrix-executive-team.com>\nReply-To: ceo-transfer@temporary-inbox.cc\nReturn-Path: random-relay@compromised-host.org\nSPF: Fail\nDKIM: None\nWarning: Domain typosquatting detected',
          isPhishing: true
        },
        {
          id: 'e_b2',
          sender: 'Product Marketing <marketing@matrix-global.com>',
          subject: 'Q3 Campaign Launch Assets',
          headers: 'From: "Marketing Team" <marketing@matrix-global.com>\nReply-To: marketing@matrix-global.com\nReturn-Path: marketing@matrix-global.com\nSPF: Pass\nDKIM: Pass',
          isPhishing: false
        },
        {
          id: 'e_b3',
          sender: 'Security Audit Team <audit@matrix-global.com>',
          subject: 'Quarterly Compliance Verification Details',
          headers: 'From: "Audit Lead" <audit@matrix-global.com>\nReply-To: audit@matrix-global.com\nReturn-Path: audit@matrix-global.com\nSPF: Pass\nDKIM: Pass',
          isPhishing: false
        },
        {
          id: 'e_b4',
          sender: 'Support Operations <support@matrix-global.com>',
          subject: 'Customer Ticket #48192 Escalated',
          headers: 'From: "Customer Support" <support@matrix-global.com>\nReply-To: support@matrix-global.com\nReturn-Path: support@matrix-global.com\nSPF: Pass\nDKIM: Pass',
          isPhishing: false
        },
        {
          id: 'e_b5',
          sender: 'Gitlab CI <gitlab-runner@matrix-ops.internal>',
          subject: 'Pipeline #98481 Passed for main branch build',
          headers: 'From: "GitLab CI" <gitlab-runner@matrix-ops.internal>\nSPF: Pass',
          isPhishing: false
        }
      ])
    })
  },
  {
    id: 'phish_invoice',
    type: 'phishing',
    name: 'Malicious Invoice Attachment Spearphish',
    alertMsg: 'Accounting gateway notes suspicious vendor invoice delivery alert.',
    hint: 'Locate domains mismatching standard corporate vendors to isolate malicious attachment links.',
    targetApp: 'email',
    codebook: {
      classification: 'Finance/Invoice Spear Phishing',
      description: 'Malicious attachments or links posing as invoice queries to deploy RAT payloads or lock operational endpoints.',
      detection: 'Reply-To and Return-Path domains point to malicious-redirect.cc with a mismatch from the official matrix domain.',
      mitigation: 'Select the invoice email message and click "MARK AS PHISHING".'
    },
    generate: () => ({
      emails: shuffleArray([
        {
          id: 'e_i1',
          sender: 'Accounts Payable <billing@matrix-finance-dept.org>',
          subject: 'Overdue Invoice: Payment required within 24 hours to avoid suspension',
          headers: 'From: "Accounts Payable" <billing@matrix-finance-dept.org>\nReply-To: ap-queries@malicious-redirect.cc\nReturn-Path: bounce@malicious-redirect.cc\nSPF: Neutral\nDKIM: Fail\nWarning: Domain mismatch detected',
          isPhishing: true
        },
        {
          id: 'e_i2',
          sender: 'Legal Dept <legal-review@matrix-global.com>',
          subject: 'NDA Draft for External Contractors',
          headers: 'From: "Corporate Legal" <legal-review@matrix-global.com>\nReply-To: legal-review@matrix-global.com\nSPF: Pass\nDKIM: Pass',
          isPhishing: false
        },
        {
          id: 'e_i3',
          sender: 'Office Admin <facilities@matrix-global.com>',
          subject: 'Office access schedule update during holiday',
          headers: 'From: "Facilities" <facilities@matrix-global.com>\nSPF: Pass',
          isPhishing: false
        },
        {
          id: 'e_i4',
          sender: 'Slack Notifications <no-reply@slack-mail.matrix-global.com>',
          subject: 'Daily Digest of active channels and mentions',
          headers: 'From: "Slack Mail Service" <no-reply@slack-mail.matrix-global.com>\nSPF: Pass\nDKIM: Pass',
          isPhishing: false
        },
        {
          id: 'e_i5',
          sender: 'Dev Team Leads <dev-leads@matrix-global.com>',
          subject: 'Sprint Planning Session Invites',
          headers: 'From: "Dev Leads" <dev-leads@matrix-global.com>\nSPF: Pass',
          isPhishing: false
        }
      ])
    })
  },
  {
    id: 'phish_package',
    type: 'phishing',
    name: 'Package Tracking Address Harvesting',
    alertMsg: 'Relay firewall flags external logistics credential harvesting attempt.',
    hint: 'Review tracking email return paths to find unverified brand identity redirects.',
    targetApp: 'email',
    codebook: {
      classification: 'Brand Impersonation Phish',
      description: 'Attackers masquerade as reputable delivery brands (DHL, UPS, FedEx) to extract active directory credentials via malicious update forms.',
      detection: 'The domain uses generic logistics lookalikes but SPF and DKIM verify as Hard Fail.',
      mitigation: 'Select the DHL Express entry and invoke the phishing block override.'
    },
    generate: () => ({
      emails: shuffleArray([
        {
          id: 'e_p1',
          sender: 'DHL Logistics <notification@dhl-express-tracking.net>',
          subject: 'Undelivered package notification - Please verify delivery address',
          headers: 'From: "DHL Express" <notification@dhl-express-tracking.net>\nReply-To: dhl-tracking@secure-portal-auth.cc\nReturn-Path: tracking-daemon@dhl-express-tracking.net\nSPF: Fail\nDKIM: Fail\nWarning: Untrusted domain',
          isPhishing: true
        },
        {
          id: 'e_p2',
          sender: 'Zoom Meetings <no-reply@zoom.matrix-global.com>',
          subject: 'Recurring Team Sync - New coordinates',
          headers: 'From: "Zoom Engine" <no-reply@zoom.matrix-global.com>\nSPF: Pass',
          isPhishing: false
        },
        {
          id: 'e_p3',
          sender: 'JIRA Cloud <jira@matrix-jira.internal>',
          subject: '[JIRA] (SEC-821) Implement rate limiter on login endpoints',
          headers: 'From: "JIRA Service" <jira@matrix-jira.internal>\nSPF: Pass',
          isPhishing: false
        },
        {
          id: 'e_p4',
          sender: 'HR Recruiting <careers@matrix-global.com>',
          subject: 'Candidate pipeline update for Senior Dev role',
          headers: 'From: "Careers Portal" <careers@matrix-global.com>\nSPF: Pass',
          isPhishing: false
        },
        {
          id: 'e_p5',
          sender: 'Internal Wiki <confluence@matrix-wiki.internal>',
          subject: 'Wiki page updated: API Documentation V3',
          headers: 'From: "Confluence" <confluence@matrix-wiki.internal>\nSPF: Pass',
          isPhishing: false
        }
      ])
    })
  },
  {
    id: 'phish_patch',
    type: 'phishing',
    name: 'Critical Security Update Phish',
    alertMsg: 'Suspicious IT security patch alert routed through external servers.',
    hint: 'Examine security bulletin headers and replies to confirm official IT origin.',
    targetApp: 'email',
    codebook: {
      classification: 'Internal IT Admin Impersonation',
      description: 'Attackers create fake security update mandates to convince employees to download trojan updates/patches.',
      detection: 'Analyze the domain string `matrix-security-portal.cc` (external) mimicking official IT channels. Return-Path points to root@untrusted-relay.cc.',
      mitigation: 'Select and quarantine the update patch notification by selecting "MARK AS PHISHING".'
    },
    generate: () => ({
      emails: shuffleArray([
        {
          id: 'e_a1',
          sender: 'Network Operations <admin-security@matrix-security-portal.cc>',
          subject: 'ACTION REQUIRED: Critical security hotfix update for workstation core',
          headers: 'From: "Matrix Security Hub" <admin-security@matrix-security-portal.cc>\nReply-To: patcher@matrix-security-portal.cc\nReturn-Path: root@untrusted-relay.cc\nSPF: Fail\nDKIM: None\nWarning: Untrusted domain link',
          isPhishing: true
        },
        {
          id: 'e_a2',
          sender: 'GitHub Alerts <noreply@github.com>',
          subject: '[GitHub] Security Alert: vulnerability in lodash version < 4.17.21',
          headers: 'From: "GitHub Security" <noreply@github.com>\nSPF: Pass\nDKIM: Pass',
          isPhishing: false
        },
        {
          id: 'e_a3',
          sender: 'AWS CloudWatch <alerts@aws.matrix-global.com>',
          subject: '[ALARM] RDS memory utilization exceeded 90%',
          headers: 'From: "AWS CloudWatch" <alerts@aws.matrix-global.com>\nSPF: Pass',
          isPhishing: false
        },
        {
          id: 'e_a4',
          sender: 'Devops On-Call <pagerduty@matrix-ops.internal>',
          subject: '[PagerDuty] Triggered: Incident #8210 - API response latency spikes',
          headers: 'From: "PagerDuty Router" <pagerduty@matrix-ops.internal>\nSPF: Pass',
          isPhishing: false
        },
        {
          id: 'e_a5',
          sender: 'IT Service Desk <helpdesk@matrix-global.com>',
          subject: 'Resolved: VPN connection instability issues resolved',
          headers: 'From: "IT Support" <helpdesk@matrix-global.com>\nSPF: Pass',
          isPhishing: false
        }
      ])
    })
  },

  // SQL INJECTION (6-10)
  {
    id: 'sqli_tautology',
    type: 'sqli',
    name: 'Tautology Authentication Bypass',
    alertMsg: 'Database server transaction monitors flag suspicious login query characters.',
    hint: 'Examine postgres-log for queries including unescaped strings or tautological assertions (`1=1` / OR conditions).',
    targetApp: 'database',
    codebook: {
      classification: 'SQLi - Tautological Bypass',
      description: 'Injecting expressions that always evaluate to true (`OR 1=1`) to trick the SQL parser into bypassing validation conditions.',
      detection: 'Search query arguments using quotes, comments (`--`), and boolean tautologies: `username = \'admin\' OR \'1\'=\'1\'`.',
      mitigation: 'Select the query in postgres-log and trigger "APPLY WAF BLOCK".'
    },
    generate: () => ({
      queries: shuffleArray([
        {
          id: 'q_s1',
          sourceIP: '185.220.101.44',
          query: "SELECT * FROM users WHERE username = 'admin' OR '1'='1' -- AND password = 'password';",
          isMalicious: true
        },
        {
          id: 'q_s2',
          sourceIP: '10.0.12.85',
          query: "SELECT name, price FROM products WHERE status = 'active' AND price < 250;",
          isMalicious: false
        },
        {
          id: 'q_s3',
          sourceIP: '10.0.12.99',
          query: "INSERT INTO system_logs (user_id, event) VALUES (108, 'Successful dashboard authentication');",
          isMalicious: false
        },
        {
          id: 'q_s4',
          sourceIP: '10.0.12.110',
          query: "SELECT COUNT(*) FROM sessions WHERE active = true AND expires_at > NOW();",
          isMalicious: false
        },
        {
          id: 'q_s5',
          sourceIP: '10.0.12.112',
          query: "UPDATE profile SET dark_mode = true WHERE user_id = 998;",
          isMalicious: false
        },
        {
          id: 'q_s6',
          sourceIP: '10.0.12.50',
          query: "SELECT id, name FROM users WHERE email = 'johndoe@matrix-global.com';",
          isMalicious: false
        }
      ])
    })
  },
  {
    id: 'sqli_union',
    type: 'sqli',
    name: 'UNION-Based Admin Exfiltration',
    alertMsg: 'Database audit reports log unauthorized table joining requests.',
    hint: 'Find queries joining database records from other tables (e.g. UNION SELECT).',
    targetApp: 'database',
    codebook: {
      classification: 'UNION SQL Injection',
      description: 'Leveraging the UNION operator to merge database records from another table (e.g., administrator tables) into standard output fields.',
      detection: 'Analyze incoming statements containing `UNION SELECT` commands attempting to extract unauthorized attributes.',
      mitigation: 'Select the statement and apply "APPLY WAF BLOCK" to isolate the source IP.'
    },
    generate: () => ({
      queries: shuffleArray([
        {
          id: 'q_u1',
          sourceIP: '91.240.118.89',
          query: "SELECT title, content FROM blog_posts WHERE category = 'tech' UNION SELECT username, password_hash FROM admin_users;",
          isMalicious: true
        },
        {
          id: 'q_u2',
          sourceIP: '10.0.12.20',
          query: "SELECT title, content FROM blog_posts WHERE category = 'tech' AND published = true ORDER BY created_at DESC;",
          isMalicious: false
        },
        {
          id: 'q_u3',
          sourceIP: '10.0.12.22',
          query: "SELECT id, quantity FROM inventory_stock WHERE warehouse_id = 12 AND SKU = 'SKU-88219';",
          isMalicious: false
        },
        {
          id: 'q_u4',
          sourceIP: '10.0.12.25',
          query: "INSERT INTO customer_support (subject, message) VALUES ('Ref: Ticket 28', 'API timeout error');",
          isMalicious: false
        },
        {
          id: 'q_u5',
          sourceIP: '10.0.12.30',
          query: "UPDATE users SET last_login = NOW() WHERE id = 482;",
          isMalicious: false
        },
        {
          id: 'q_u6',
          sourceIP: '10.0.12.44',
          query: "SELECT COUNT(*) FROM api_requests WHERE timestamp > NOW() - INTERVAL '1 hour';",
          isMalicious: false
        }
      ])
    })
  },
  {
    id: 'sqli_error',
    type: 'sqli',
    name: 'Error-Based Database Probing',
    alertMsg: 'System monitor notices abnormal query errors triggering db leak pathways.',
    hint: 'Examine inputs for functions designed to force SQL parser syntax exceptions.',
    targetApp: 'database',
    codebook: {
      classification: 'Error-Based SQLi',
      description: 'Intentionally forcing the database to throw an error containing sensitive information like the DB version or config tables.',
      detection: 'Search query lists for diagnostic functions (e.g. `extractvalue`, `updatexml`, or `convert`) appended to query variables.',
      mitigation: 'Locate the offending statement, select it, and trigger the defensive WAF rule.'
    },
    generate: () => ({
      queries: shuffleArray([
        {
          id: 'q_e1',
          sourceIP: '194.26.135.10',
          query: "SELECT * FROM article_nodes WHERE id = 1 AND extractvalue(1, concat(0x5c, (SELECT version())));",
          isMalicious: true
        },
        {
          id: 'q_e2',
          sourceIP: '10.0.12.1',
          query: "SELECT * FROM article_nodes WHERE id = 1 AND status = 'published' AND author_id = 104;",
          isMalicious: false
        },
        {
          id: 'q_e3',
          sourceIP: '10.0.12.5',
          query: "SELECT description, rating FROM review_stars WHERE item_id = 452 ORDER BY rating DESC LIMIT 5;",
          isMalicious: false
        },
        {
          id: 'q_e4',
          sourceIP: '10.0.12.8',
          query: "INSERT INTO newsletter_subscribers (email) VALUES ('test@matrix-global.com');",
          isMalicious: false
        },
        {
          id: 'q_e5',
          sourceIP: '10.0.12.12',
          query: "UPDATE jobs SET status = 'completed' WHERE job_id = 'j_88192';",
          isMalicious: false
        },
        {
          id: 'q_e6',
          sourceIP: '10.0.12.15',
          query: "SELECT key, value FROM app_settings WHERE active = true;",
          isMalicious: false
        }
      ])
    })
  },
  {
    id: 'sqli_stacked',
    type: 'sqli',
    name: 'Stacked Query Command Execution',
    alertMsg: 'PostgreSQL audit logger catches concurrent statement execution alert.',
    hint: 'Look for queries appending stacked commands using semicolons to manipulate schema records.',
    targetApp: 'database',
    codebook: {
      classification: 'Stacked Query SQL Injection',
      description: 'Terminating the primary query with a semicolon and appending a secondary, damaging command (e.g., DROP TABLE or updates).',
      detection: 'Search transaction logs for queries containing multiple actions divided by a semicolon: `SELECT * FROM ...; DROP TABLE ...;`.',
      mitigation: 'Select and quarantine the stacked command using "APPLY WAF BLOCK".'
    },
    generate: () => ({
      queries: shuffleArray([
        {
          id: 'q_st1',
          sourceIP: '203.0.113.88',
          query: "SELECT * FROM inventory_stock WHERE id = 48; DROP TABLE client_records; --",
          isMalicious: true
        },
        {
          id: 'q_st2',
          sourceIP: '10.0.12.91',
          query: "SELECT * FROM inventory_stock WHERE id = 48 AND section = 'aisle_4';",
          isMalicious: false
        },
        {
          id: 'q_st3',
          sourceIP: '10.0.12.92',
          query: "SELECT first_name, last_name FROM employees WHERE department_id = 3 AND role = 'Engineer';",
          isMalicious: false
        },
        {
          id: 'q_st4',
          sourceIP: '10.0.12.94',
          query: "INSERT INTO audits (admin_id, action) VALUES (5, 'Viewed accounting ledger');",
          isMalicious: false
        },
        {
          id: 'q_st5',
          sourceIP: '10.0.12.95',
          query: "UPDATE server_configs SET state = 'synced' WHERE node_ip = '10.0.0.4';",
          isMalicious: false
        },
        {
          id: 'q_st6',
          sourceIP: '10.0.12.96',
          query: "SELECT id, path FROM assets WHERE type = 'image/png' LIMIT 20;",
          isMalicious: false
        }
      ])
    })
  },
  {
    id: 'sqli_time',
    type: 'sqli',
    name: 'Blind Time-Based Exfiltration',
    alertMsg: 'Database response monitor logs high query execution latency.',
    hint: 'Isolate queries injecting timing delays (`SLEEP()` / `pg_sleep`) to verify parameter outcomes.',
    targetApp: 'database',
    codebook: {
      classification: 'Blind Time-Based SQLi',
      description: 'Used when the application does not return data or throw errors. Attackers use sleep commands to extract data based on wait time.',
      detection: 'Analyze postgres-logs for functions like `SLEEP(N)` or `pg_sleep(N)` embedded inside logical test parameters.',
      mitigation: 'Isolate the query, select it, and trigger "APPLY WAF BLOCK" to deny access.'
    },
    generate: () => ({
      queries: shuffleArray([
        {
          id: 'q_ti1',
          sourceIP: '185.220.101.50',
          query: "SELECT * FROM employees WHERE id = 1 AND IF(1=1, SLEEP(5), 0);",
          isMalicious: true
        },
        {
          id: 'q_ti2',
          sourceIP: '10.0.12.60',
          query: "SELECT * FROM employees WHERE id = 1 AND active = true AND clearance_level >= 3;",
          isMalicious: false
        },
        {
          id: 'q_ti3',
          sourceIP: '10.0.12.62',
          query: "SELECT product_id, stock FROM inventory WHERE warehouse_id = 2 AND stock < 10;",
          isMalicious: false
        },
        {
          id: 'q_ti4',
          sourceIP: '10.0.12.64',
          query: "INSERT INTO user_feedback (user_id, feedback) VALUES (881, 'Interface loads fast!');",
          isMalicious: false
        },
        {
          id: 'q_ti5',
          sourceIP: '10.0.12.66',
          query: "UPDATE active_tokens SET revoking = false WHERE id = 'token_abc123';",
          isMalicious: false
        },
        {
          id: 'q_ti6',
          sourceIP: '10.0.12.70',
          query: "SELECT version();",
          isMalicious: false
        }
      ])
    })
  },

  // MALWARE / ENDPOINT THREATS (11-15)
  {
    id: 'malware_keylog',
    type: 'malware',
    name: 'Trojan Keyboard Sniffer (Keylogger)',
    alertMsg: 'CPU spike alert. Suspicious system processes active.',
    hint: 'Initialize system scan. Examine signatures and run paths to locate background keystroke loggers.',
    targetApp: 'antivirus',
    codebook: {
      classification: 'Trojan Keylogger Binary',
      description: 'Spyware running in the background capturing local keyboard inputs to dump passwords and administrative secrets.',
      detection: 'Search the process list for UNSIGNED/ERROR certificates executing from C:\\Windows\\Temp\\.',
      mitigation: 'Isolate the malicious thread in the processes table, select it, and trigger "KILL PID & QUARANTINE".'
    },
    generate: () => ({
      processes: shuffleArray([
        { pid: 5410, name: 'win_service_keylog.exe', path: 'C:\\Windows\\Temp\\', cpu: '45%', signature: 'UNSIGNED / ERROR', isMalicious: true },
        { pid: 480, name: 'system_idle.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 1402, name: 'chrome.exe', path: 'C:\\Program Files\\Google\\', cpu: '4%', signature: 'Google Verified', isMalicious: false },
        { pid: 1022, name: 'svchost.exe', path: 'C:\\Windows\\System32\\', cpu: '2%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 3012, name: 'taskmgr.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 4120, name: 'slack.exe', path: 'C:\\Users\\User\\AppData\\Local\\Slack\\', cpu: '3%', signature: 'Slack Verified', isMalicious: false }
      ])
    })
  },
  {
    id: 'malware_miner',
    type: 'malware',
    name: 'Unregulated Cryptominer Hijacker',
    alertMsg: 'Host processor core operating at near maximum load.',
    hint: 'Scan processes list to find unsigned miner executables consuming excessive CPU resources.',
    targetApp: 'antivirus',
    codebook: {
      classification: 'Resource Hijacking Miner',
      description: 'Malware that uses the workstation\'s hardware capacity to mine cryptocurrency, causing massive CPU performance locks.',
      detection: 'Look for process names targeting crypto terms (e.g. monero_miner.exe) using massive CPU (e.g. 98%) with an UNSIGNED signature.',
      mitigation: 'Audit endpoint processes, locate high CPU unsigned binaries, and execute force shutdown termination.'
    },
    generate: () => ({
      processes: shuffleArray([
        { pid: 7810, name: 'monero_miner.exe', path: 'C:\\ProgramData\\', cpu: '98%', signature: 'UNSIGNED / ERROR', isMalicious: true },
        { pid: 120, name: 'explorer.exe', path: 'C:\\Windows\\', cpu: '5%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 2404, name: 'msedge.exe', path: 'C:\\Program Files\\Microsoft\\', cpu: '3%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 840, name: 'spoolsv.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 3410, name: 'teams.exe', path: 'C:\\Program Files\\Teams\\', cpu: '4%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 1102, name: 'lg_hub.exe', path: 'C:\\Program Files\\LGHUB\\', cpu: '2%', signature: 'Logitech Verified', isMalicious: false }
      ])
    })
  },
  {
    id: 'malware_rat',
    type: 'malware',
    name: 'Remote Access Trojan Backdoor',
    alertMsg: 'Unidentified shell connection detected on system loop.',
    hint: 'Scan host parameters to find active backdoor services spawned from temporary app data paths.',
    targetApp: 'antivirus',
    codebook: {
      classification: 'Remote Access Trojan (RAT)',
      description: 'Enables external attackers to gain full command execution access over the victim system.',
      detection: 'Audit the process table. Search for unsigned, unapproved tools acting from AppData\\Local\\Temp\\.',
      mitigation: 'Identify the spoofed handler PID, terminate execution, and dump the binary registry.'
    },
    generate: () => ({
      processes: shuffleArray([
        { pid: 8820, name: 'explorer_patch.exe', path: 'C:\\Users\\User\\AppData\\Local\\Temp\\', cpu: '88%', signature: 'UNSIGNED / ERROR', isMalicious: true },
        { pid: 120, name: 'explorer.exe', path: 'C:\\Windows\\', cpu: '2%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 2110, name: 'code.exe', path: 'C:\\Users\\User\\AppData\\Local\\Programs\\VSCode\\', cpu: '12%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 902, name: 'conhost.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 3105, name: 'spotify.exe', path: 'C:\\Users\\User\\AppData\\Roaming\\Spotify\\', cpu: '3%', signature: 'Spotify Verified', isMalicious: false },
        { pid: 740, name: 'winlogon.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false }
      ])
    })
  },
  {
    id: 'malware_stealer',
    type: 'malware',
    name: 'Credential Stealer & Registry Harvester',
    alertMsg: 'System monitors flag registry dump memory scans.',
    hint: 'Examine unsigned binary certificates executing from public downloads storage files.',
    targetApp: 'antivirus',
    codebook: {
      classification: 'Information Stealer Malware',
      description: 'Attempts to scrape browser session stores, cookies, and local database directories to extract admin keys.',
      detection: 'Verify process execution parameters. Look for tool payloads inside C:\\Users\\User\\Downloads\\ marked with signature ERROR.',
      mitigation: 'Shut down the processes thread manually using the process monitor quarantine interface.'
    },
    generate: () => ({
      processes: shuffleArray([
        { pid: 6112, name: 'credential_dump.exe', path: 'C:\\Users\\User\\Downloads\\', cpu: '75%', signature: 'UNSIGNED / ERROR', isMalicious: true },
        { pid: 810, name: 'cmd.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 4890, name: 'docker.exe', path: 'C:\\Program Files\\Docker\\', cpu: '8%', signature: 'Docker Verified', isMalicious: false },
        { pid: 602, name: 'services.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 3110, name: 'onedrive.exe', path: 'C:\\Program Files\\Microsoft OneDrive\\', cpu: '2%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 2190, name: 'discord.exe', path: 'C:\\Users\\User\\AppData\\Local\\Discord\\', cpu: '4%', signature: 'Discord Verified', isMalicious: false }
      ])
    })
  },
  {
    id: 'malware_ransom',
    type: 'malware',
    name: 'CryptoLocker Active Ransomware',
    alertMsg: 'Disk I/O spikes indicate unauthorized mass file modifications.',
    hint: 'Scan core filesystem drivers. Locate high CPU unsigned processes encrypting file systems.',
    targetApp: 'antivirus',
    codebook: {
      classification: 'Crypto-Ransomware Agent',
      description: 'Extremely critical threat. Searches workstation local folders and locks files using military-grade encryption.',
      detection: 'Analyze process listings for UNSIGNED binaries running with massive CPU (90%+) spawned on the Desktop path.',
      mitigation: 'Manually scan system processes, isolate the cryptolocker, and terminate its threads.'
    },
    generate: () => ({
      processes: shuffleArray([
        { pid: 9110, name: 'cryptolocker_payload.exe', path: 'C:\\Users\\User\\Desktop\\', cpu: '92%', signature: 'UNSIGNED / ERROR', isMalicious: true },
        { pid: 320, name: 'notepad.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 1890, name: 'git.exe', path: 'C:\\Program Files\\Git\\', cpu: '1%', signature: 'Software Freedom Verified', isMalicious: false },
        { pid: 512, name: 'lsass.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false },
        { pid: 4092, name: 'zoom.exe', path: 'C:\\Users\\User\\AppData\\Roaming\\Zoom\\', cpu: '6%', signature: 'Zoom Verified', isMalicious: false },
        { pid: 660, name: 'csrss.exe', path: 'C:\\Windows\\System32\\', cpu: '1%', signature: 'Microsoft Verified', isMalicious: false }
      ])
    })
  },

  // NETWORK MITM / REDIRECTION (16-20)
  {
    id: 'mitm_arp',
    type: 'mitm',
    name: 'ARP Gateway Poisoning Redirect',
    alertMsg: 'Router switches report IP gateway target MAC resolution conflict.',
    hint: 'Audit L2 subnet tables. Look for conflicting gateway IPs mapped to malicious spoofed MAC addresses.',
    targetApp: 'vpn',
    codebook: {
      classification: 'ARP Cache Poisoning MITM',
      description: 'Poisoning ARP cache tables to link default IP routing addresses with a rogue MAC address (00-AA-BB-CC-33-44).',
      detection: 'Search the L2 ARP Gateway tables for rows flagged with custom "REDIRECTED (ATTACKER)" type fields.',
      mitigation: 'Enable the secure WireGuard VPN Tunnel, engage active DNS security layers, and trigger RESTORE ROUTING.'
    },
    generate: () => ({
      routes: [
        { gatewayIp: '192.168.1.1', targetMac: '00-AA-BB-CC-33-44', type: 'REDIRECTED (ATTACKER)', isSpoofed: true },
        { gatewayIp: '192.168.1.1', targetMac: '00-14-22-01-EE-FF', type: 'ROUTER_DEFAULT', isSpoofed: false },
        { gatewayIp: '192.168.1.20', targetMac: '00-25-90-A8-11-22', type: 'INTERNAL_DHCP', isSpoofed: false },
        { gatewayIp: '192.168.1.100', targetMac: 'BC-EE-7B-D1-88-99', type: 'INTERNAL_WS', isSpoofed: false },
        { gatewayIp: '10.0.0.5', targetMac: '00-11-22-33-44-55', type: 'INT_DNS', isSpoofed: false }
      ]
    })
  },
  {
    id: 'mitm_dns',
    type: 'mitm',
    name: 'Rogue Domain Resolution Spoofing',
    alertMsg: 'Domain lookup logs show internal resolution queries hijacked.',
    hint: 'Inspect internal DNS gateways mapping tables to isolate duplicate spoofed server targets.',
    targetApp: 'vpn',
    codebook: {
      classification: 'DNS Cache Poisoning / Spoofing',
      description: 'Rogue domain spoofing tricks internal hosts into routing communication paths through attacker servers.',
      detection: 'Look for target DNS addresses (10.0.0.5) associated with a target SPOOFED_DNS gateway type.',
      mitigation: 'Activate standard WireGuard VPN tunneling and DNS-SEC verification, then restore gateway routing.'
    },
    generate: () => ({
      routes: [
        { gatewayIp: '10.0.0.5', targetMac: '00-AA-BB-CC-33-44', type: 'SPOOFED_DNS', isSpoofed: true },
        { gatewayIp: '192.168.1.1', targetMac: '00-14-22-01-EE-FF', type: 'ROUTER_DEFAULT', isSpoofed: false },
        { gatewayIp: '192.168.1.50', targetMac: '00-12-34-56-78-9A', type: 'STORAGE_NET', isSpoofed: false },
        { gatewayIp: '10.0.0.5', targetMac: '00-11-22-33-44-55', type: 'CORP_DNS', isSpoofed: false },
        { gatewayIp: '192.168.1.120', targetMac: '00-33-44-55-66-77', type: 'MAIL_GATEWAY', isSpoofed: false }
      ]
    })
  },
  {
    id: 'mitm_dhcp',
    type: 'mitm',
    name: 'Rogue DHCP Server Gateway Hijack',
    alertMsg: 'Duplicate gateway signals detected on network subnets.',
    hint: 'Verify subnet gateway configurations. Look for anomalous duplicate routing addresses.',
    targetApp: 'vpn',
    codebook: {
      classification: 'Rogue DHCP Gateway Sniffer',
      description: 'An unauthorized DHCP controller allocates conflicting routing targets to intercept corporate outbound traffic.',
      detection: 'Look for anomalous gateway IPs (e.g. 192.168.1.254) flagged with "DUP_ROUTER_ALERT".',
      mitigation: 'Switch VPN and DNS SEC protection switches to ACTIVE, then click "RESTORE ROUTING".'
    },
    generate: () => ({
      routes: [
        { gatewayIp: '192.168.1.254', targetMac: '00-AA-BB-CC-33-44', type: 'DUP_ROUTER_ALERT', isSpoofed: true },
        { gatewayIp: '192.168.1.1', targetMac: '00-14-22-01-EE-FF', type: 'ROUTER_DEFAULT', isSpoofed: false },
        { gatewayIp: '192.168.1.10', targetMac: '00-99-88-77-66-55', type: 'DMZ_HOST', isSpoofed: false },
        { gatewayIp: '192.168.1.102', targetMac: '11-22-33-44-55-66', type: 'DEV_HOST', isSpoofed: false }
      ]
    })
  },
  {
    id: 'mitm_ssl',
    type: 'mitm',
    name: 'SSL Stripping Credentials Interceptor',
    alertMsg: 'Firewall monitors notice unencrypted corporate password routing.',
    hint: 'Check VPN Gateway ARP mappings to find proxy redirection nodes.',
    targetApp: 'vpn',
    codebook: {
      classification: 'SSL Stripping HTTP Proxy',
      description: 'Downgrades secure HTTPS connections to cleartext HTTP to sniff passwords.',
      detection: 'Locate anomalous proxy addresses in network routes flagged with type "MITM_SSL_STRIP".',
      mitigation: 'Establish a WireGuard encrypted tunnel layer and run the restore routing trigger.'
    },
    generate: () => ({
      routes: [
        { gatewayIp: '192.168.1.80', targetMac: '00-AA-BB-CC-33-44', type: 'MITM_SSL_STRIP', isSpoofed: true },
        { gatewayIp: '192.168.1.1', targetMac: '00-14-22-01-EE-FF', type: 'ROUTER_DEFAULT', isSpoofed: false },
        { gatewayIp: '192.168.1.105', targetMac: 'AA-BB-CC-DD-EE-FF', type: 'MGR_WS', isSpoofed: false },
        { gatewayIp: '192.168.1.150', targetMac: '22-33-44-55-66-77', type: 'BACKUP_NAS', isSpoofed: false },
        { gatewayIp: '192.168.1.200', targetMac: '88-99-AA-BB-CC-DD', type: 'PRINT_SRV', isSpoofed: false }
      ]
    })
  },
  {
    id: 'mitm_wifi',
    type: 'mitm',
    name: 'Rogue Evil Twin Access Point Clone',
    alertMsg: 'Duplicate network SSID hardware signatures detected.',
    hint: 'Trace connection hardware interfaces. Find twin wireless access gateways spoofing corporate routers.',
    targetApp: 'vpn',
    codebook: {
      classification: 'Evil Twin Rogue Access Point',
      description: 'Setting up a rogue Wi-Fi access point with the same SSID name to hijack connections.',
      detection: 'Search local hardware mappings for rogue access nodes labeled "EVIL_TWIN_AP".',
      mitigation: 'Secure the client session using VPN encryption and restore corporate routing configurations.'
    },
    generate: () => ({
      routes: [
        { gatewayIp: '192.168.1.15', targetMac: '00-AA-BB-CC-33-44', type: 'EVIL_TWIN_AP', isSpoofed: true },
        { gatewayIp: '192.168.1.1', targetMac: '00-14-22-01-EE-FF', type: 'ROUTER_DEFAULT', isSpoofed: false },
        { gatewayIp: '192.168.1.75', targetMac: '33-44-55-66-77-88', type: 'SANDBOX_NET', isSpoofed: false },
        { gatewayIp: '192.168.1.85', targetMac: '44-55-66-77-88-99', type: 'HR_DATA', isSpoofed: false },
        { gatewayIp: '10.0.0.10', targetMac: '55-66-77-88-99-AA', type: 'CORP_AD', isSpoofed: false }
      ]
    })
  }
];

export default function ShieldProtocol() {
  const { addXP, removeXP, unlockAchievement } = useXPSystem();
  const screenRef = useRef<HTMLDivElement>(null);

  // General OS State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'game-over' | 'victory'>('idle');
  const [health, setHealth] = useState(3);
  const [credits, setCredits] = useState(60);
  const [activeDefenses, setActiveDefenses] = useState<string[]>([]);
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  const [waveCount, setWaveCount] = useState(0);

  // Challenge Registry & Shuffling
  const [shuffledScenarios, setShuffledScenarios] = useState<ScenarioRegistryEntry[]>([]);
  const [codebookChallenge, setCodebookChallenge] = useState<ActiveChallenge | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<ActiveChallenge | null>(null);
  
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [avScanProgress, setAvScanProgress] = useState<number>(-1); // -1 = not scanned, 0-100 = scanning

  // Active logs displayed inside applications at all times (loaded with mock data to avoid giving hints)
  const [activeEmails, setActiveEmails] = useState<EmailItem[]>([]);
  const [activeQueries, setActiveQueries] = useState<SQLQueryItem[]>([]);
  const [activeProcesses, setActiveProcesses] = useState<ProcessItem[]>([]);
  const [activeRoutes, setActiveRoutes] = useState<NetworkRoute[]>([]);

  // UI state
  const [showGuide, setShowGuide] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cpuUsage, setCpuUsage] = useState(12);
  const [netActivity, setNetActivity] = useState<number[]>([10, 15, 8, 12, 18, 9, 11]);
  const [osTime, setOsTime] = useState('12:00 PM');
  const [glitchActive, setGlitchActive] = useState(false);

  // Window states & drag support
  const [openWindows, setOpenWindows] = useState<Record<string, boolean>>({
    email: false,
    database: false,
    antivirus: false,
    vpn: false,
    terminal: true,
    installer: false,
    filemanager: false,
    browser: false,
    taskmonitor: false,
  });
  
  const [windowPositions, setWindowPositions] = useState<Record<string, { x: number; y: number }>>({
    email: { x: 50, y: 40 },
    database: { x: 90, y: 70 },
    antivirus: { x: 130, y: 100 },
    vpn: { x: 170, y: 130 },
    terminal: { x: 210, y: 160 },
    installer: { x: 110, y: 60 },
    filemanager: { x: 200, y: 45 },
    browser: { x: 240, y: 75 },
    taskmonitor: { x: 280, y: 55 },
  });

  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Breach animation
  const [breachState, setBreachState] = useState<BreachState | null>(null);
  const breachIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Decoy app state
  const [activeBrowserTab, setActiveBrowserTab] = useState(0);

  // Selected items inside individual applications
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [selectedProcessPid, setSelectedProcessPid] = useState<number | null>(null);
  const [vpnToggleActive, setVpnToggleActive] = useState<boolean>(false);
  const [dnsSecActive, setDnsSecActive] = useState<boolean>(false);

  // Update OS Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setOsTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // CPU and Net Metrics loops
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => {
        if (currentChallenge) return Math.min(prev + Math.floor(Math.random() * 20) + 15, 95);
        return Math.max(Math.min(prev + Math.floor(Math.random() * 4) - 2, 20), 8);
      });
      setNetActivity(prev => {
        const next = [...prev.slice(1)];
        next.push(currentChallenge ? Math.floor(Math.random() * 50) + 30 : Math.floor(Math.random() * 10) + 5);
        return next;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [currentChallenge]);

  // Alert Timer Countdown loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing' && currentChallenge && timeRemaining > 0) {
      timer = setTimeout(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleChallengeFail('Time expired! The attack successfully infiltrated host resources.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [gameState, currentChallenge, timeRemaining]);

  const addLog = (msg: string) => {
    setGameLogs(prev => [`[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`, ...prev]);
  };

  // Synthetic speech voiceover announcements
  const speakVoiceover = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Terminate previous queues immediately
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Slightly robotic/clinical cyber guide pace
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleWindow = (win: string) => {
    setOpenWindows(prev => {
      const nextState = !prev[win];
      if (nextState) {
        setWindowPositions(pos => ({
          ...pos,
          [win]: { x: 80 + Math.random() * 80, y: 50 + Math.random() * 60 }
        }));
      }
      return { ...prev, [win]: nextState };
    });
  };

  const startGame = () => {
    setHealth(3);
    setCredits(60);
    setActiveDefenses([]);
    setGameLogs([]);
    setWaveCount(0);
    setCurrentChallenge(null);
    setCodebookChallenge(null);

    // Shuffle the 20 attack scenarios
    const shuffled = shuffleArray(SCENARIOS_REGISTRY);
    setShuffledScenarios(shuffled);

    // Pre-populate all active app windows with realistic clean mock data to avoid giving hint of empty screens
    setActiveEmails(shuffleArray(generateCleanEmails()));
    setActiveQueries(shuffleArray(generateCleanQueries()));
    setActiveProcesses(shuffleArray(generateCleanProcesses()));
    setActiveRoutes(shuffleArray(generateCleanRoutes()));

    setGameState('playing');
    setShowGuide(false);
    setOpenWindows({
      email: false,
      database: false,
      antivirus: false,
      vpn: false,
      terminal: true,
      installer: false,
      filemanager: false,
      browser: false,
      taskmonitor: false,
    });
    addLog('SECUREOS [BOOT COMPLETED] : Node cybersecurity terminal online.');
    speakVoiceover('Secure Operating System booted. Incident response playbooks initialized.');
  };

  const triggerNextWave = () => {
    if (health <= 0) return;

    const currentWaveIndex = waveCount;
    // Clearing 7 waves secures operational victory
    if (currentWaveIndex >= 7) {
      setGameState('victory');
      addXP(80);
      unlockAchievement(
        'secureos_champion',
        'SecureOS Cyber Analyst',
        'Successfully completed virtual OS desktop incident responses.',
        '💻'
      );
      speakVoiceover('Incident response playbook complete. Workstation security verified.');
      return;
    }

    const nextScenario = shuffledScenarios[currentWaveIndex];
    if (!nextScenario) return;

    // Load active challenge structure
    const challengeData = nextScenario.generate();
    const activeChallengeObj: ActiveChallenge = {
      id: nextScenario.id,
      type: nextScenario.type,
      name: nextScenario.name,
      codebook: nextScenario.codebook,
      alertMsg: nextScenario.alertMsg,
      hint: nextScenario.hint,
      targetApp: nextScenario.targetApp,
      ...challengeData
    };

    // Check if auto-mitigated by purchased modules
    const matchedDef = DEFENSES.find(d => d.countertype === activeChallengeObj.type);
    if (matchedDef && activeDefenses.includes(matchedDef.id)) {
      addLog(`[AUTO-DEFENDED] ${matchedDef.name} automatically blocked: ${activeChallengeObj.name}.`);
      setCredits(prev => prev + 15);
      setWaveCount(prev => prev + 1);
      return;
    }

    // Reset challenge controls
    setSelectedEmailId(null);
    setSelectedQueryId(null);
    setSelectedProcessPid(null);
    setAvScanProgress(-1);
    setVpnToggleActive(false);
    setDnsSecActive(false);

    // Pause game timer, trigger Threat Intelligence Codebook Popup
    setCodebookChallenge(activeChallengeObj);
    speakVoiceover(`Alert! Suspicious operational activity detected. Threat classification: ${activeChallengeObj.name}. Open the codebook.`);
  };

  const startTriageProtocol = () => {
    if (!codebookChallenge) return;

    const active = codebookChallenge;
    setCurrentChallenge(active);
    setCodebookChallenge(null);
    setTimeRemaining(50); // Set countdown to 50s for advanced manual discovery

    // Setup active challenge datasets. Load target threat data for the breached app,
    // and refresh standard randomized clean mock traffic for all other applications!
    if (active.type === 'phishing') {
      setActiveEmails(active.emails || []);
    } else {
      setActiveEmails(shuffleArray(generateCleanEmails()));
    }

    if (active.type === 'sqli') {
      setActiveQueries(active.queries || []);
    } else {
      setActiveQueries(shuffleArray(generateCleanQueries()));
    }

    if (active.type === 'malware') {
      setActiveProcesses(active.processes || []);
    } else {
      setActiveProcesses(shuffleArray(generateCleanProcesses()));
    }

    if (active.type === 'mitm') {
      setActiveRoutes(active.routes || []);
    } else {
      setActiveRoutes(shuffleArray(generateCleanRoutes()));
    }

    // Generic intrusion alerts to keep users guessing and manually auditing
    addLog(`[SECURITY ALERT] Intrusion detection sensors flag system threat vectors active on workstation.`);
    addLog(`[INCIDENT MONITOR] Standard operations active. Probe mail records, SQL queries, system processes, and routing tables to isolate the payload.`);
    speakVoiceover('Intrusion alert! Workstation security compromised. Probe active directories and network interfaces immediately.');
  };

  const handleChallengeSuccess = () => {
    addLog(`[MITIGATION SECURED] Neutralized threat: ${currentChallenge?.name}.`);
    setCredits(prev => prev + 35);
    setWaveCount(prev => prev + 1);
    setCurrentChallenge(null);
    speakVoiceover('Threat neutralized. Core registries secure.');
  };

  const handleChallengeFail = (feedbackText: string) => {
    // Clear any prior breach animation
    if (breachIntervalRef.current) clearInterval(breachIntervalRef.current);

    // Points deduction
    removeXP(20);

    setGlitchActive(true);
    setTimeout(() => setGlitchActive(false), 900);
    addLog(`[CRITICAL BREACH] Threat payload reached core! ${feedbackText} (-20 XP)`);
    setCurrentChallenge(null);

    // Start dramatic breach consequence animation
    let prog = 0;
    setBreachState({ phase: 'encrypting', progress: 0, encryptedCount: 0 });
    speakVoiceover('Critical breach! Ransomware payload executing. Data is being encrypted and exfiltrated.');

    breachIntervalRef.current = setInterval(() => {
      prog += 5;
      const count = Math.floor((prog / 100) * CORPORATE_FILES.length);

      if (prog >= 100) {
        clearInterval(breachIntervalRef.current!);
        breachIntervalRef.current = null;
        setBreachState({ phase: 'exfiltrating', progress: 100, encryptedCount: CORPORATE_FILES.length });

        setTimeout(() => {
          setBreachState(null);
          setHealth(prev => {
            const next = prev - 1;
            if (next <= 0) {
              setGameState('game-over');
              speakVoiceover('System offline. All corporate data encrypted and exfiltrated to attacker servers.');
            } else {
              speakVoiceover('Breach contained. Integrity partially compromised. Continue response protocol.');
            }
            return next;
          });
          setWaveCount(prev => prev + 1);
        }, 2000);
      } else {
        setBreachState({ phase: 'encrypting', progress: prog, encryptedCount: count });
      }
    }, 120);
  };

  // Dynamic Trigger Wave Loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing' && !currentChallenge && !codebookChallenge) {
      timer = setTimeout(() => {
        triggerNextWave();
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [gameState, currentChallenge, codebookChallenge, waveCount]);

  // Window drag helper functions
  const startDrag = (win: string, e: React.MouseEvent) => {
    setActiveDrag(win);
    const pos = windowPositions[win];
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
  };

  const onDragMove = (e: React.MouseEvent) => {
    if (!activeDrag) return;
    setWindowPositions(prev => ({
      ...prev,
      [activeDrag]: {
        x: Math.max(10, Math.min(e.clientX - dragOffset.x, 850)),
        y: Math.max(10, Math.min(e.clientY - dragOffset.y, 450))
      }
    }));
  };

  const stopDrag = () => {
    setActiveDrag(null);
  };

  const toggleFullScreen = () => {
    const element = screenRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(() => setIsFullscreen(true));
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(() => setIsFullscreen(false));
      } else {
        setIsFullscreen(false);
      }
    }
  };

  // Sync fullscreen state on browser native transition events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === screenRef.current);
    };
    
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Action: Triage Email
  const processEmailTriage = () => {
    const selected = activeEmails.find(e => e.id === selectedEmailId);
    if (!selected) return;

    if (selected.isPhishing) {
      handleChallengeSuccess();
    } else {
      handleChallengeFail('Flagged a legitimate business communication email, interrupting workflow operations.');
    }
  };

  // Action: WAF database sanitize
  const processSQLTriage = () => {
    const selected = activeQueries.find(q => q.id === selectedQueryId);
    if (!selected) return;

    if (selected.isMalicious) {
      handleChallengeSuccess();
    } else {
      handleChallengeFail('Filtered a legitimate system database query, interrupting catalog operations.');
    }
  };

  // Action: Antivirus File Scan simulation
  const startAntivirusScan = () => {
    setAvScanProgress(0);
    const interval = setInterval(() => {
      setAvScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          addLog('[AV SCAN] Completed. Target threats identified. Review active process certificate metadata.');
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  // Action: Kill suspicious processes
  const processKillTask = () => {
    const selected = activeProcesses.find(p => p.pid === selectedProcessPid);
    if (!selected) return;

    if (selected.isMalicious) {
      handleChallengeSuccess();
    } else {
      handleChallengeFail('Terminated vital system svchost directory service thread, crashing core OS modules.');
    }
  };

  // Action: Re-Route VPN network redirection
  const processNetworkReroute = () => {
    const hasSpoofed = activeRoutes.some(r => r.isSpoofed);
    if (hasSpoofed) {
      if (vpnToggleActive && dnsSecActive) {
        handleChallengeSuccess();
      } else {
        handleChallengeFail('Applied insecure/incomplete proxy routes. The spoofed MAC redirect sniffing loop remains active.');
      }
    } else {
      handleChallengeFail('Initiated emergency VPN route override on a secure subnet gateway, disrupting network connections.');
    }
  };

  const handleInstallStoreModule = (defId: string, cost: number) => {
    if (credits < cost) {
      addLog('[STORE] Operation Denied: Insufficient Credits.');
      return;
    }
    setCredits(prev => prev - cost);
    setActiveDefenses(prev => [...prev, defId]);
    addLog(`[SYSTEM_CORE] Initialized auto-mitigation agent node: "${DEFENSES.find(d => d.id === defId)?.name}".`);
  };

  return (
    <div 
      ref={screenRef}
      onMouseMove={onDragMove}
      onMouseUp={stopDrag}
      className={`w-full flex flex-col font-mono select-none relative ${
        isFullscreen 
          ? 'fixed inset-0 z-[99999] h-screen w-screen bg-[#000000] text-slate-100 p-0 m-0' 
          : 'min-h-[640px] h-[670px] rounded-2xl border-2 border-slate-800 overflow-hidden bg-[#000000] text-slate-250 shadow-2xl shadow-red-950/20'
      }`}
      style={{ backgroundColor: '#000000' }}
    >
      
      {/* Glitch flash screen alert */}
      {glitchActive && (
        <div className="absolute inset-0 bg-red-950/70 border-4 border-red-500 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-red-500 text-2xl font-black tracking-widest uppercase animate-pulse">BREACH DETECTED - SYSTEM CORE COMPROMISED!</div>
        </div>
      )}

      {/* ====== BREACH CONSEQUENCE ANIMATION OVERLAY ====== */}
      {breachState && (
        <div className="absolute inset-0 z-[9999] bg-black flex flex-col overflow-hidden">
          {/* CRT scanlines */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.04) 0px, rgba(255,0,0,0.04) 1px, transparent 1px, transparent 3px)', zIndex: 1 }} />
          {/* Red glow border */}
          <div className="absolute inset-0 border-4 border-red-600 shadow-[inset_0_0_80px_rgba(239,68,68,0.25)] pointer-events-none" style={{ zIndex: 2 }} />

          {/* Header bar */}
          <div className="relative bg-red-950/90 border-b-2 border-red-600 px-5 py-3 flex items-center gap-3" style={{ zIndex: 3 }}>
            <AlertOctagon className="w-7 h-7 text-red-500 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[10px] text-red-400 font-black uppercase tracking-[0.35em]">CRITICAL SECURITY BREACH — SYSTEM COMPROMISED</div>
              <div className="text-white font-black text-sm uppercase tracking-widest mt-0.5">
                {breachState.phase === 'encrypting' ? '🔒 RANSOMWARE ENCRYPTING CORPORATE FILES...' : '📡 EXFILTRATING DATA TO ATTACKER C2 SERVER...'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-red-400 font-black text-xs animate-pulse">{breachState.progress}%</div>
              <div className="text-[10px] text-red-700 font-mono">PAYLOAD ACTIVE</div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex gap-3 p-4 overflow-hidden" style={{ zIndex: 3 }}>
            {/* File encryption column */}
            <div className="flex-1 bg-black/80 border border-red-900/60 rounded-lg p-3 overflow-hidden flex flex-col">
              <div className="text-[10px] text-red-400 font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                ENCRYPTING WORKSTATION FILE SYSTEM
              </div>
              <div className="flex-1 overflow-hidden space-y-0.5">
                {CORPORATE_FILES.map((file, idx) => {
                  const isLocked = idx < breachState.encryptedCount;
                  const isActive = idx === breachState.encryptedCount;
                  return (
                    <div key={file} className={`text-[10px] font-mono flex items-center gap-2 py-0.5 transition-all duration-200 ${
                      isLocked ? 'text-red-600 line-through opacity-80' :
                      isActive ? 'text-yellow-400 animate-pulse font-bold' :
                      'text-slate-600'
                    }`}>
                      <span className="w-4 text-center flex-shrink-0">{isLocked ? '🔒' : isActive ? '⚡' : '📄'}</span>
                      <span className="truncate">{isLocked ? file + '.MATRIX_LOCKED' : file}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right stats column */}
            <div className="w-52 flex flex-col gap-3">
              <div className="bg-black/80 border border-red-900/60 rounded-lg p-3">
                <div className="text-[10px] text-red-400 font-black uppercase tracking-wider mb-2">ENCRYPTION PROGRESS</div>
                <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-red-950 mb-1.5">
                  <div className="bg-gradient-to-r from-red-700 to-red-500 h-full transition-all duration-100 rounded-full" style={{ width: `${breachState.progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-red-400 font-black">{breachState.progress}% done</span>
                  <span className="text-red-700">{breachState.encryptedCount}/{CORPORATE_FILES.length} files</span>
                </div>
              </div>

              <div className="bg-black/80 border border-red-900/60 rounded-lg p-3 space-y-1.5">
                <div className="text-[10px] text-red-400 font-black uppercase tracking-wider mb-1">C2 EXFILTRATION STREAM</div>
                <div className="space-y-1 text-[10px] font-mono">
                  <div className="flex justify-between"><span className="text-slate-500">Target:</span><span className="text-red-400">185.220.101.44:443</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Protocol:</span><span className="text-red-400">TLS 1.3 HTTPS</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Sent:</span><span className="text-red-400 animate-pulse">{(breachState.progress * 3.8).toFixed(1)}MB</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Beacon:</span><span className="text-green-500 animate-pulse">ACTIVE</span></div>
                </div>
              </div>

              <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-3">
                <div className="text-[10px] text-red-300 font-black uppercase tracking-wider mb-1">💀 LESSON LEARNED</div>
                <div className="text-[10px] text-red-400 leading-relaxed">
                  Failure to detect the threat allowed attackers to deploy ransomware. Study the codebook carefully before triaging.
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative bg-black border-t border-red-900/50 px-4 py-2 flex justify-between items-center" style={{ zIndex: 3 }}>
            <div className="text-[10px] text-red-600 font-mono animate-pulse">ATTACK_PAYLOAD :: CRYPTO_RANSOM_V4 :: C2_BEACON_TX :: DATA_THEFT_ACTIVE</div>
            {breachState.phase === 'exfiltrating' && (
              <div className="text-[10px] text-slate-500 font-mono">Reverting system state in 2s...</div>
            )}
          </div>
        </div>
      )}

      {/* Guide Briefing screen */}
      {showGuide && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-40 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-[#08080a] border border-slate-800 rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-5 mb-5">
              <Tv className="w-9 h-9 text-red-500" />
              <div>
                <h3 className="text-lg font-black uppercase tracking-widest text-white">SECUREOS INCIDENT SIMULATOR</h3>
                <span className="text-xs text-slate-400 font-semibold">Security Operations Center Level: Advanced</span>
              </div>
            </div>
            
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>
                Welcome to the professional-tier cybersecurity incident responder desktop simulation.
              </p>
              
              <div className="bg-black/60 border border-slate-900 p-4 rounded-lg space-y-3.5">
                <span className="text-xs text-red-400 font-bold uppercase tracking-wider block">TACTICAL PROTOCOLS</span>
                <ul className="list-decimal pl-5 space-y-2 text-[13px] text-slate-300">
                  <li>
                    <strong>Threat Intelligence Codebooks:</strong> Before a threat triggers, you will receive an intelligence briefing outlining the attack vector, markers, and remediation. Use this time to learn!
                  </li>
                  <li>
                    <strong>No Hand-holding:</strong> Standard visual indicators (flashing, bouncing, auto-opened apps) are disabled. Read the incident logs to find out which application to inspect.
                  </li>
                  <li>
                    <strong>Manual Analysis:</strong> Each application logs tab contains 5-6 active nodes. Carefully audit headers, transactions, MAC fields, and certificates to find the malicious item.
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button 
                onClick={toggleFullScreen}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white uppercase transition-colors"
              >
                <Maximize2 className="w-4 h-4" /> Fullscreen Mode
              </button>
              <button 
                onClick={startGame}
                className="px-8 py-3 bg-red-700 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-all shadow-[0_0_12px_rgba(220,38,38,0.3)]"
              >
                Boot Workstation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THREAT INTELLIGENCE CODEBOOK MODAL POPUP */}
      {codebookChallenge && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6" style={{ zIndex: 50 }}>
          <div className="w-full max-w-xl bg-[#09090b] border-2 border-red-500/80 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(239,68,68,0.25)] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-950/40 border-b border-red-500/30 px-5 py-4 flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-red-500 animate-pulse" />
              <div className="flex-1">
                <h4 className="text-sm font-black text-white uppercase tracking-widest">THREAT INTEL CODEBOOK INCOMING</h4>
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Classification: {codebookChallenge.codebook.classification}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleFullScreen} title="Toggle Fullscreen" className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
                <Link href="/cyberverse" className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors" title="Exit Workstation">
                  <X className="w-4 h-4" />
                </Link>
              </div>
            </div>
            
            <div className="p-5 space-y-4 text-xs text-slate-300 leading-relaxed max-h-[380px] overflow-y-auto">
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-slate-400 font-black tracking-wider block">THREAT DESCRIPTION</span>
                <p className="bg-black/40 border border-slate-900 p-2.5 rounded text-slate-200">{codebookChallenge.codebook.description}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase text-slate-400 font-black tracking-wider block">DETECTION INDICATORS</span>
                <p className="bg-black/40 border border-slate-900 p-2.5 rounded text-slate-200">{codebookChallenge.codebook.detection}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase text-slate-400 font-black tracking-wider block">REMEDIATION PROTOCOL</span>
                <p className="bg-red-950/10 border border-red-900/30 p-2.5 rounded text-red-300 font-semibold">{codebookChallenge.codebook.mitigation}</p>
              </div>
            </div>

            <div className="bg-[#0c0c0e] border-t border-slate-900 p-4 flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Timer is frozen. Read briefing...</span>
              <button 
                onClick={startTriageProtocol}
                className="px-6 py-2.5 bg-red-700 hover:bg-red-655 text-white font-black text-[11px] uppercase tracking-widest rounded-lg transition-all shadow-[0_0_10px_rgba(220,38,38,0.4)]"
              >
                Start Triage Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP DESKTOP WORKSPACE */}
      <div 
        className="flex-1 relative p-6 select-none flex flex-col justify-between overflow-hidden" 
        style={{ backgroundColor: '#000000' }}
      >
        
        {/* Core metrics details bar */}
        {gameState === 'playing' && (
          <div className="absolute top-4 right-4 flex items-center gap-5 text-xs text-slate-200 bg-slate-950/90 px-4 py-2.5 rounded-lg border border-slate-850 z-10 shadow-lg">
            <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-red-500 fill-red-500" /> Integrity: {health}/3</span>
            <span className="flex items-center gap-1.5 text-yellow-400 font-bold"><Zap className="w-4 h-4" /> Credits: {credits} CR</span>
            <span className="text-red-500 font-black tracking-widest uppercase">Wave: {Math.min(waveCount + 1, 7)}/7</span>
            {currentChallenge && (
              <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${timeRemaining <= 12 ? 'bg-red-950 text-red-400 animate-pulse border border-red-500' : 'bg-slate-900 text-slate-350'}`}>
                Timer: {timeRemaining}s
              </span>
            )}
          </div>
        )}

        {/* Dynamic Intrusion Alert Banner (High Contrast, Top-Center) - No explicit app details */}
        {currentChallenge && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xl bg-black border border-red-500 rounded-xl p-4 shadow-[0_0_24px_rgba(239,68,68,0.3)] z-30 animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-red-500 font-black text-xs uppercase tracking-widest flex justify-between items-center">
                  <span>SECURITY INTRUSION WARNING</span>
                  <span className="bg-red-950 text-red-400 border border-red-500 px-2 py-0.5 rounded text-[10px] animate-pulse">
                    TIMER: {timeRemaining}s
                  </span>
                </div>
                <div className="text-white text-xs font-black mt-1 uppercase tracking-wider">ANOMALOUS WORKSTATION ACTIVITY FLAGGED</div>
                <div className="text-slate-450 text-[10px] mt-1 leading-normal">
                  <strong>Status Alert:</strong> Incident response sensors report unverified service thread behavior. Audit processes, SQL log entries, routing mac configurations, and SMTP headers manually to locate the compromise.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Application Icons Grid - Completely uniform, no highlights, no hand-holding */}
        {gameState === 'playing' && (
          <div className="absolute top-6 left-6 flex flex-col gap-4 z-10 w-28">
            
            {/* Outlook Inbox shortcut */}
            <button 
              onClick={() => toggleWindow('email')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-900/60 text-slate-300 text-center group transition-all"
            >
              <Mail className="w-9 h-9 text-cyan-400 group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-bold mt-1.5 text-slate-200 truncate w-full">outlook-mail</span>
              {openWindows.email && <span className="w-2.5 h-1 bg-cyan-400 mt-1 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)] animate-pulse" />}
            </button>

            {/* DB Portal log shortcut */}
            <button 
              onClick={() => toggleWindow('database')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-900/60 text-slate-300 text-center group transition-all"
            >
              <Database className="w-9 h-9 text-yellow-400 group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-bold mt-1.5 text-slate-200 truncate w-full">postgres-log</span>
              {openWindows.database && <span className="w-2.5 h-1 bg-yellow-400 mt-1 rounded-full shadow-[0_0_6px_rgba(250,204,21,0.8)] animate-pulse" />}
            </button>

            {/* Antivirus dashboard shortcut */}
            <button 
              onClick={() => toggleWindow('antivirus')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-900/60 text-slate-300 text-center group transition-all"
            >
              <ShieldCheck className="w-9 h-9 text-emerald-400 group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-bold mt-1.5 text-slate-200 truncate w-full">endpoint-av</span>
              {openWindows.antivirus && <span className="w-2.5 h-1 bg-emerald-400 mt-1 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />}
            </button>

            {/* VPN interface shortcut */}
            <button 
              onClick={() => toggleWindow('vpn')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-900/60 text-slate-300 text-center group transition-all"
            >
              <Wifi className="w-9 h-9 text-purple-400 group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-bold mt-1.5 text-slate-200 truncate w-full">vpn-gateway</span>
              {openWindows.vpn && <span className="w-2.5 h-1 bg-purple-400 mt-1 rounded-full shadow-[0_0_6px_rgba(192,132,252,0.8)] animate-pulse" />}
            </button>

            {/* Software install installer */}
            <button 
              onClick={() => toggleWindow('installer')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-900/60 text-slate-300 text-center group transition-all"
            >
              <Plus className="w-9 h-9 text-teal-400 group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-bold mt-1.5 text-slate-200 truncate w-full">install-apps</span>
              {openWindows.installer && <span className="w-2.5 h-1 bg-teal-400 mt-1 rounded-full shadow-[0_0_6px_rgba(45,212,191,0.8)] animate-pulse" />}
            </button>

            {/* File Manager decoy */}
            <button 
              onClick={() => toggleWindow('filemanager')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-900/60 text-slate-300 text-center group transition-all"
            >
              <FolderOpen className="w-9 h-9 text-amber-400 group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-bold mt-1.5 text-slate-200 truncate w-full">file-manager</span>
              {openWindows.filemanager && <span className="w-2.5 h-1 bg-amber-400 mt-1 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.8)] animate-pulse" />}
            </button>

            {/* Internal Browser decoy */}
            <button 
              onClick={() => toggleWindow('browser')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-900/60 text-slate-300 text-center group transition-all"
            >
              <Globe className="w-9 h-9 text-sky-400 group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-bold mt-1.5 text-slate-200 truncate w-full">sys-browser</span>
              {openWindows.browser && <span className="w-2.5 h-1 bg-sky-400 mt-1 rounded-full shadow-[0_0_6px_rgba(56,189,248,0.8)] animate-pulse" />}
            </button>

            {/* Task Monitor decoy */}
            <button 
              onClick={() => toggleWindow('taskmonitor')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-900/60 text-slate-300 text-center group transition-all"
            >
              <Cpu className="w-9 h-9 text-orange-400 group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-bold mt-1.5 text-slate-200 truncate w-full">task-monitor</span>
              {openWindows.taskmonitor && <span className="w-2.5 h-1 bg-orange-400 mt-1 rounded-full shadow-[0_0_6px_rgba(251,146,60,0.8)] animate-pulse" />}
            </button>

          </div>
        )}

        {/* ACTIVE WINDOWS OVERLAYS */}
        {gameState === 'playing' && (
          <div className="absolute inset-0 pointer-events-none z-20" style={{ zIndex: 20 }}>
            
            {/* 1. OUTLOOK EMAIL CLIENT DRAGGABLE WINDOW */}
            {openWindows.email && (
              <div 
                style={{ 
                  left: `${windowPositions.email.x}px`, 
                  top: `${windowPositions.email.y}px`, 
                  position: 'absolute' 
                }}
                className="w-96 md:w-[450px] bg-[#07070a] border border-slate-700 rounded-lg shadow-2xl pointer-events-auto flex flex-col z-20 overflow-hidden"
              >
                <div 
                  onMouseDown={(e) => startDrag('email', e)}
                  className="bg-slate-900 px-4 py-2 flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-200 border-b border-slate-700 cursor-move select-none"
                >
                  <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-cyan-400" /> outlook-mail.exe</span>
                  <button onClick={() => toggleWindow('email')} className="text-slate-400 hover:text-white p-0.5"><X className="w-4 h-4" /></button>
                </div>
                
                <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto text-xs text-slate-200">
                  {activeEmails.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Mail Queue (Audit SPF & Headers):</div>
                      
                      {/* Email Inbox Rows */}
                      <div className="border border-slate-800 rounded overflow-hidden">
                        {activeEmails.map((email) => (
                          <div 
                            key={email.id}
                            onClick={() => setSelectedEmailId(email.id)}
                            className={`p-2.5 border-b border-slate-855 cursor-pointer text-left transition-all ${
                              selectedEmailId === email.id ? 'bg-cyan-950/20 text-cyan-400 font-bold border-l-2 border-cyan-400' : 'hover:bg-slate-900/60 text-slate-350'
                            }`}
                          >
                            <div className="text-[11px] font-black">{email.sender}</div>
                            <div className="text-xs truncate text-slate-100">{email.subject}</div>
                          </div>
                        ))}
                      </div>

                      {/* Mail Detailed Panel */}
                      {selectedEmailId ? (
                        (() => {
                          const activeMail = activeEmails.find(e => e.id === selectedEmailId);
                          if (!activeMail) return null;
                          return (
                            <div className="bg-slate-950/70 border border-slate-850 p-3 rounded space-y-3">
                              <div className="bg-black border border-slate-900 p-2.5 rounded text-[10px] font-mono leading-relaxed text-slate-400 whitespace-pre-wrap">
                                {activeMail.headers}
                              </div>
                              <div className="text-slate-200 font-bold text-xs p-1">
                                Subject: {activeMail.subject}
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
                                <button 
                                  onClick={processEmailTriage}
                                  className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white uppercase text-[10px] font-black tracking-widest rounded transition-colors"
                                >
                                  MARK AS PHISHING
                                </button>
                                <button 
                                  onClick={() => {
                                    if (activeMail.isPhishing) {
                                      handleChallengeFail('Approved phishing request payload, causing a keylogger breach.');
                                    } else {
                                      addLog(`[MAIL OPERATIONS] Approved safe corporate mail message.`);
                                      setSelectedEmailId(null);
                                    }
                                  }}
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 uppercase text-[10px] font-black tracking-widest rounded transition-colors"
                                >
                                  Approve & Deliver
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-slate-505 text-center py-4 italic">Select a system mail block to audit routing parameters.</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-505 text-center py-12 font-bold font-mono">Mail client safe. No inbound threats identified.</div>
                  )}
                </div>
              </div>
            )}

            {/* 2. POSTGRES SQL MONITOR DRAGGABLE WINDOW */}
            {openWindows.database && (
              <div 
                style={{ 
                  left: `${windowPositions.database.x}px`, 
                  top: `${windowPositions.database.y}px`, 
                  position: 'absolute' 
                }}
                className="w-96 md:w-[450px] bg-[#07070a] border border-slate-700 rounded-lg shadow-2xl pointer-events-auto flex flex-col z-20 overflow-hidden"
              >
                <div 
                  onMouseDown={(e) => startDrag('database', e)}
                  className="bg-slate-900 px-4 py-2 flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-200 border-b border-slate-700 cursor-move select-none"
                >
                  <span className="flex items-center gap-1.5"><Database className="w-4 h-4 text-yellow-400" /> postgres-log.exe</span>
                  <button onClick={() => toggleWindow('database')} className="text-slate-400 hover:text-white p-0.5"><X className="w-4 h-4" /></button>
                </div>
                
                <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto text-xs text-slate-200">
                  {activeQueries.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">SQL Queries Ledger:</div>
                      
                      <div className="border border-slate-800 rounded overflow-hidden">
                        {activeQueries.map((q) => (
                          <div 
                            key={q.id}
                            onClick={() => setSelectedQueryId(q.id)}
                            className={`p-2.5 border-b border-slate-855 cursor-pointer transition-all ${
                              selectedQueryId === q.id ? 'bg-yellow-950/20 text-yellow-400 font-bold border-l-2 border-yellow-400' : 'hover:bg-slate-900/60 text-slate-350'
                            }`}
                          >
                            <div className="text-[9px] text-slate-400 font-mono">Host Origin: {q.sourceIP}</div>
                            <div className="text-[11px] font-mono truncate text-slate-100 mt-1 break-all">{q.query}</div>
                          </div>
                        ))}
                      </div>

                      {selectedQueryId ? (
                        (() => {
                          const activeQuery = activeQueries.find(q => q.id === selectedQueryId);
                          if (!activeQuery) return null;
                          return (
                            <div className="bg-slate-950/70 border border-slate-850 p-3 rounded space-y-3">
                              <div className="text-[11px] text-yellow-500 font-mono break-all bg-black p-2.5 rounded border border-slate-900 leading-normal">
                                {activeQuery.query}
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
                                <button 
                                  onClick={processSQLTriage}
                                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black uppercase text-[10px] font-black tracking-widest rounded transition-colors"
                                >
                                  APPLY WAF BLOCK
                                </button>
                                <button 
                                  onClick={() => {
                                    if (activeQuery.isMalicious) {
                                      handleChallengeFail('Allowed database SQL injection sequence, triggering a core DB leak.');
                                    } else {
                                      addLog(`[DATABASE AUDIT] Executed legitimate query transaction.`);
                                      setSelectedQueryId(null);
                                    }
                                  }}
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 uppercase text-[10px] font-black tracking-widest rounded transition-colors"
                                >
                                  Permit Statement
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-slate-505 text-center py-4 italic font-mono">Select a transaction query parameter to analyze query inputs.</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-505 text-center py-12 font-bold font-mono">SQL ledger normal. No suspicious queries registered.</div>
                  )}
                </div>
              </div>
            )}

            {/* 3. ENDPOINT ANTIVIRUS PROCESS MONITOR */}
            {openWindows.antivirus && (
              <div 
                style={{ 
                  left: `${windowPositions.antivirus.x}px`, 
                  top: `${windowPositions.antivirus.y}px`, 
                  position: 'absolute' 
                }}
                className="w-96 md:w-[450px] bg-[#07070a] border border-slate-700 rounded-lg shadow-2xl pointer-events-auto flex flex-col z-20 overflow-hidden"
              >
                <div 
                  onMouseDown={(e) => startDrag('antivirus', e)}
                  className="bg-slate-900 px-4 py-2 flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-200 border-b border-slate-700 cursor-move select-none"
                >
                  <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> endpoint-av.exe</span>
                  <button onClick={() => toggleWindow('antivirus')} className="text-slate-400 hover:text-white p-0.5"><X className="w-4 h-4" /></button>
                </div>
                
                <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto text-xs text-slate-200">
                  {activeProcesses.length > 0 ? (
                    <div className="space-y-4">
                      {avScanProgress === -1 ? (
                        <div className="py-10 text-center space-y-4">
                          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto animate-pulse" />
                          <div className="text-slate-355 font-bold font-mono">Workstation file system requires scan to analyze signatures.</div>
                          <button 
                            onClick={startAntivirusScan}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest rounded-lg transition-colors"
                          >
                            RUN FULL SYSTEM SCAN
                          </button>
                        </div>
                      ) : avScanProgress < 100 ? (
                        <div className="py-12 text-center space-y-3">
                          <Search className="w-10 h-10 text-emerald-400 mx-auto animate-spin" />
                          <div className="text-slate-400 font-bold font-mono">Analyzing running certificates: {avScanProgress}%</div>
                          <div className="w-full bg-slate-950 h-2 rounded overflow-hidden max-w-xs mx-auto border border-slate-800">
                            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${avScanProgress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Active System Executables:</div>
                          
                          {/* Processes table */}
                          <div className="border border-slate-800 rounded overflow-hidden font-mono text-[10px]">
                            <div className="bg-[#0c0c10] p-1.5 flex justify-between border-b border-slate-800 text-slate-450 font-bold text-[9px] uppercase tracking-wider">
                              <span className="w-12">PID</span>
                              <span className="w-28">NAME</span>
                              <span className="w-12">CPU</span>
                              <span className="flex-1 text-right">SIGNATURE</span>
                            </div>
                            {activeProcesses.map((p) => (
                              <div 
                                key={p.pid}
                                onClick={() => setSelectedProcessPid(p.pid)}
                                className={`p-2 flex justify-between items-center cursor-pointer border-b border-slate-900 transition-all ${
                                  selectedProcessPid === p.pid ? 'bg-red-950/20 text-red-400 font-bold border-l-2 border-red-500' : 'hover:bg-slate-900/60 text-slate-355'
                                }`}
                              >
                                <span className="w-12">{p.pid}</span>
                                <span className="w-28 truncate">{p.name}</span>
                                <span className="w-12">{p.cpu}</span>
                                <span className={`flex-1 text-right truncate text-[9px] ${p.signature.includes('ERROR') ? 'text-red-400 font-bold' : 'text-slate-500'}`}>{p.signature}</span>
                              </div>
                            ))}
                          </div>

                          {selectedProcessPid ? (
                            (() => {
                              const activeProc = activeProcesses.find(p => p.pid === selectedProcessPid);
                              if (!activeProc) return null;
                              return (
                                <div className="bg-slate-950 border border-slate-850 p-3 rounded space-y-2">
                                  <div className="text-[11px] font-mono leading-relaxed space-y-1 text-slate-300">
                                    <div><strong>Executable Path:</strong> {activeProc.path}{activeProc.name}</div>
                                    <div><strong>System Load Rate:</strong> {activeProc.cpu}</div>
                                    <div><strong>Developer Certificate:</strong> {activeProc.signature}</div>
                                  </div>
                                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
                                    <button 
                                      onClick={processKillTask}
                                      className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white uppercase text-[10px] font-black tracking-widest rounded transition-all"
                                    >
                                      KILL PID & QUARANTINE
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (activeProc.isMalicious) {
                                          handleChallengeFail('Allowed Trojan executable access to disk sectors.');
                                        } else {
                                          addLog(`[PROCESS AUDIT] Approved valid background executable.`);
                                          setSelectedProcessPid(null);
                                        }
                                      }}
                                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 uppercase text-[10px] font-black tracking-widest rounded transition-colors"
                                    >
                                      Allow Process
                                    </button>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-slate-505 text-center py-2 italic text-[10px] font-mono">Select a running binary node to view signature details.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-505 text-center py-12 font-bold font-mono">Threat tables clear. Core processes verified authentic.</div>
                  )}
                </div>
              </div>
            )}

            {/* 4. VPN CLIENT DRAGGABLE WINDOW */}
            {openWindows.vpn && (
              <div 
                style={{ 
                  left: `${windowPositions.vpn.x}px`, 
                  top: `${windowPositions.vpn.y}px`, 
                  position: 'absolute' 
                }}
                className="w-96 md:w-[450px] bg-[#07070a] border border-slate-700 rounded-lg shadow-2xl pointer-events-auto flex flex-col z-20 overflow-hidden"
              >
                <div 
                  onMouseDown={(e) => startDrag('vpn', e)}
                  className="bg-slate-900 px-4 py-2 flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-200 border-b border-slate-700 cursor-move select-none"
                >
                  <span className="flex items-center gap-1.5"><Wifi className="w-4 h-4 text-purple-400" /> vpn-gateway.exe</span>
                  <button onClick={() => toggleWindow('vpn')} className="text-slate-400 hover:text-white p-0.5"><X className="w-4 h-4" /></button>
                </div>
                
                <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto text-xs text-slate-200 font-mono">
                  {activeRoutes.length > 0 ? (
                    <div className="space-y-4 text-[11px]">
                      <div className="text-slate-455 uppercase tracking-wider font-bold">Active Subnet Gateways (ARP & MAC mapping):</div>
                      
                      <div className="bg-black/60 p-3 border border-slate-900 rounded space-y-2.5">
                        {activeRoutes.map((route, idx) => (
                          <div key={idx} className={`flex justify-between border-b border-slate-900 pb-2 ${route.isSpoofed ? 'text-red-400 font-black' : 'text-slate-350'}`}>
                            <span>IP: {route.gatewayIp}</span>
                            <span>MAC: {route.targetMac}</span>
                            <span className="text-[9px] uppercase">{route.type}</span>
                          </div>
                        ))}
                      </div>

                      {/* Interactive Controls */}
                      <div className="bg-slate-950 border border-slate-850 p-4 rounded space-y-4">
                        <div className="text-[10px] uppercase font-black tracking-wider border-b border-slate-900 pb-1.5 text-slate-400">Tunnel Routing Console</div>
                        
                        <div className="flex justify-between items-center">
                          <span>Secure WireGuard Tunnel:</span>
                          <button 
                            onClick={() => setVpnToggleActive(!vpnToggleActive)}
                            className={`px-3 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1 transition-colors ${
                              vpnToggleActive ? 'bg-purple-800 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Power className="w-3 h-3" /> {vpnToggleActive ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </div>

                        <div className="flex justify-between items-center">
                          <span>Verify DNS-SEC Keys:</span>
                          <button 
                            onClick={() => setDnsSecActive(!dnsSecActive)}
                            className={`px-3 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1 transition-colors ${
                              dnsSecActive ? 'bg-purple-800 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Radio className="w-3 h-3" /> {dnsSecActive ? 'VERIFIED' : 'UNVERIFIED'}
                          </button>
                        </div>

                        <button 
                          onClick={processNetworkReroute}
                          className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white uppercase text-[10px] font-black tracking-widest rounded mt-3 transition-colors"
                        >
                          RESTORE GATEWAY ROUTING
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-505 text-center py-12 font-bold font-mono">Routing maps clean. Local VPN gateways operating normal.</div>
                  )}
                </div>
              </div>
            )}

            {/* 5. SOFTWARE STORE INSTALLER WINDOW */}
            {/* ====== 6. FILE MANAGER DECOY WINDOW ====== */}
            {openWindows.filemanager && (
              <div
                style={{ left: `${windowPositions.filemanager.x}px`, top: `${windowPositions.filemanager.y}px`, position: 'absolute' }}
                className="w-80 bg-[#07070a] border border-slate-700 rounded-lg shadow-2xl pointer-events-auto flex flex-col z-20 overflow-hidden"
              >
                <div onMouseDown={(e) => startDrag('filemanager', e)}
                  className="bg-slate-900 px-4 py-2 flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-200 border-b border-slate-700 cursor-move select-none"
                >
                  <span className="flex items-center gap-1.5"><FolderOpen className="w-4 h-4 text-amber-400" /> file-manager.exe</span>
                  <button onClick={() => toggleWindow('filemanager')} className="text-slate-400 hover:text-white p-0.5"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-3 max-h-[320px] overflow-y-auto">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-2">C:\Users\User\ — Corporate Workstation FS</div>
                  <div className="space-y-0.5">
                    {CORPORATE_FILES.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-slate-900/60 cursor-default transition-colors">
                        <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <span className="text-[10px] font-mono text-slate-300 truncate">{file}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-900 text-[9px] text-slate-600 font-mono">12 items &bull; 4.2 GB used &bull; 120 GB free</div>
                </div>
              </div>
            )}

            {/* ====== 7. INTERNAL BROWSER DECOY WINDOW ====== */}
            {openWindows.browser && (
              <div
                style={{ left: `${windowPositions.browser.x}px`, top: `${windowPositions.browser.y}px`, position: 'absolute' }}
                className="w-[450px] bg-[#07070a] border border-slate-700 rounded-lg shadow-2xl pointer-events-auto flex flex-col z-20 overflow-hidden"
              >
                <div onMouseDown={(e) => startDrag('browser', e)}
                  className="bg-slate-900 px-4 py-2 flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-200 border-b border-slate-700 cursor-move select-none"
                >
                  <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-sky-400" /> sys-browser.exe — Internal Portal</span>
                  <button onClick={() => toggleWindow('browser')} className="text-slate-400 hover:text-white p-0.5"><X className="w-4 h-4" /></button>
                </div>
                {/* Tab strip */}
                <div className="flex bg-slate-950 border-b border-slate-800 overflow-x-auto">
                  {BROWSER_TABS.map((tab, idx) => (
                    <button key={idx} onClick={() => setActiveBrowserTab(idx)}
                      className={`px-3 py-1.5 text-[9px] font-bold whitespace-nowrap border-r border-slate-800 transition-colors flex-shrink-0 ${
                        activeBrowserTab === idx ? 'bg-[#07070a] text-sky-400 border-t-2 border-t-sky-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/60'
                      }`}
                    >
                      {tab.title.split('\u2014')[0].trim().substring(0, 14)}{tab.title.length > 14 ? '…' : ''}
                    </button>
                  ))}
                </div>
                {/* Address bar */}
                <div className="px-3 py-1.5 bg-black/60 border-b border-slate-900">
                  <div className="text-[9px] text-slate-400 font-mono bg-slate-950 border border-slate-800 rounded px-2 py-0.5 flex items-center gap-1.5">
                    <span className="text-green-500">🔒</span> {BROWSER_TABS[activeBrowserTab]?.url}
                  </div>
                </div>
                {/* Page content */}
                <div className="p-4 max-h-[240px] overflow-y-auto">
                  <div className="text-sky-400 font-black text-xs mb-2">{BROWSER_TABS[activeBrowserTab]?.title}</div>
                  <div className="text-slate-400 text-[11px] leading-relaxed">{BROWSER_TABS[activeBrowserTab]?.content}</div>
                  <div className="mt-4 pt-3 border-t border-slate-900 text-[9px] text-slate-600 font-mono">Matrix Internal Network — Secure Corporate Intranet — Authenticated Session</div>
                </div>
              </div>
            )}

            {/* ====== 8. TASK MONITOR DECOY WINDOW ====== */}
            {openWindows.taskmonitor && (
              <div
                style={{ left: `${windowPositions.taskmonitor.x}px`, top: `${windowPositions.taskmonitor.y}px`, position: 'absolute' }}
                className="w-[480px] bg-[#07070a] border border-slate-700 rounded-lg shadow-2xl pointer-events-auto flex flex-col z-20 overflow-hidden"
              >
                <div onMouseDown={(e) => startDrag('taskmonitor', e)}
                  className="bg-slate-900 px-4 py-2 flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-200 border-b border-slate-700 cursor-move select-none"
                >
                  <span className="flex items-center gap-1.5"><Cpu className="w-4 h-4 text-orange-400" /> task-monitor.exe</span>
                  <button onClick={() => toggleWindow('taskmonitor')} className="text-slate-400 hover:text-white p-0.5"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-3 max-h-[300px] overflow-y-auto">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-2">System Process Overview — Active Terminals</div>
                  <div className="border border-slate-800 rounded overflow-hidden font-mono text-[10px]">
                    <div className="bg-[#0c0c10] p-1.5 flex gap-2 border-b border-slate-800 text-slate-500 font-bold text-[9px] uppercase tracking-wider">
                      <span className="w-10">PID</span>
                      <span className="w-40">PROCESS</span>
                      <span className="w-10">CPU</span>
                      <span className="flex-1 text-right">STATUS</span>
                    </div>
                    {activeProcesses.map(p => (
                      <div 
                        key={p.pid} 
                        onClick={() => setSelectedProcessPid(p.pid)}
                        className={`p-1.5 flex gap-2 items-center border-b border-slate-900 transition-colors cursor-pointer ${
                          selectedProcessPid === p.pid ? 'bg-orange-900/40 text-white' : 'hover:bg-slate-900/30'
                        }`}
                      >
                        <span className={`w-10 ${selectedProcessPid === p.pid ? 'text-orange-300' : 'text-slate-500'}`}>{p.pid}</span>
                        <span className={`w-40 truncate ${selectedProcessPid === p.pid ? 'text-white' : 'text-slate-300'}`}>{p.name}</span>
                        <span className={`w-10 ${parseInt(p.cpu) > 50 ? 'text-orange-400 font-bold' : selectedProcessPid === p.pid ? 'text-white' : 'text-slate-400'}`}>{p.cpu}</span>
                        <span className={`flex-1 text-right text-[9px] ${p.signature.includes('ERROR') ? 'text-yellow-500 font-bold' : selectedProcessPid === p.pid ? 'text-slate-300' : 'text-slate-600'}`}>
                          {p.signature.includes('ERROR') ? '⚠ UNVERIFIED' : 'RUNNING'}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-[9px] text-slate-600 italic font-mono">
                      {selectedProcessPid ? `Selected: PID ${selectedProcessPid}` : 'Select a process to manage.'}
                    </div>
                    <button
                      disabled={!selectedProcessPid}
                      onClick={processKillTask}
                      className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-colors ${
                        selectedProcessPid 
                          ? 'bg-red-700 hover:bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.4)]'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      End Process
                    </button>
                  </div>

                </div>
              </div>
            )}

            {openWindows.installer && (
              <div 
                style={{ 
                  left: `${windowPositions.installer.x}px`, 
                  top: `${windowPositions.installer.y}px`, 
                  position: 'absolute' 
                }}
                className="w-96 bg-[#07070a] border border-slate-700 rounded-lg shadow-2xl pointer-events-auto flex flex-col z-20 overflow-hidden"
              >
                <div 
                  onMouseDown={(e) => startDrag('installer', e)}
                  className="bg-slate-900 px-4 py-2 flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-200 border-b border-slate-700 cursor-move select-none"
                >
                  <span className="flex items-center gap-1.5"><Plus className="w-4 h-4 text-teal-400" /> install-apps.exe</span>
                  <button onClick={() => toggleWindow('installer')} className="text-slate-400 hover:text-white p-0.5"><X className="w-4 h-4" /></button>
                </div>
                
                <div className="p-4 space-y-3.5 max-h-[350px] overflow-y-auto text-xs text-slate-200">
                  <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase tracking-widest pb-1.5 border-b border-slate-800">
                    <span>Defense System Upgrades</span>
                    <span className="text-yellow-400 font-bold font-mono">{credits} CR</span>
                  </div>
                  {DEFENSES.map((def) => {
                    const installed = activeDefenses.includes(def.id);
                    return (
                      <div key={def.id} className="p-3 border border-slate-850 rounded bg-black/40 flex justify-between items-center gap-3.5">
                        <div className="flex-1">
                          <div className="text-slate-100 font-black">{def.name}</div>
                          <div className="text-slate-400 text-[10px] mt-0.5 leading-normal">{def.description}</div>
                        </div>
                        <button
                          disabled={installed || credits < def.cost}
                          onClick={() => handleInstallStoreModule(def.id, def.cost)}
                          className={`px-3 py-1.5 text-[9px] font-black uppercase rounded transition-colors ${
                            installed 
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40' 
                              : credits >= def.cost 
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                : 'bg-slate-900 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {installed ? 'Active' : `${def.cost} CR`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* VIRTUAL PC IDLE CONSOLE SCREEN */}
        {gameState === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[420px]">
            <Monitor className="w-20 h-20 text-slate-700 animate-pulse" />
            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase text-slate-150 tracking-widest font-mono">Secure Workstation Console</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-mono">
                Initialize simulated tactical cyber incident remediation playbooks. Learn to analyze routing, evaluate signatures, filter queries, and verify SMTP authenticity under real time constraints.
              </p>
            </div>
            <button 
              onClick={startGame}
              className="px-8 py-3 bg-red-700 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-all shadow-[0_0_12px_rgba(185,28,28,0.35)]"
            >
              Boot Incident Console
            </button>
          </div>
        )}

        {/* WORKSTATION COMPROMISED SCREEN */}
        {gameState === 'game-over' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[420px]">
            <ShieldAlert className="w-20 h-20 text-red-500 animate-bounce" />
            <div className="space-y-2">
              <h3 className="text-base font-black text-red-500 uppercase tracking-widest font-mono">incident fail: registry encryption breach</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed font-mono">
                System records successfully locked by encryption payload. Review threat codebook briefs closely to isolate infected entities quickly.
              </p>
            </div>
            <button 
              onClick={startGame}
              className="px-8 py-3 bg-red-650 hover:bg-red-555 text-white font-black rounded-lg text-xs uppercase tracking-widest transition-all"
            >
              Reboot workstation core
            </button>
          </div>
        )}

        {/* AUDIT VICTORY STATE */}
        {gameState === 'victory' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[420px]">
            <ShieldCheck className="w-20 h-20 text-emerald-400 animate-pulse" />
            <div className="space-y-2">
              <h3 className="text-base font-black text-emerald-400 uppercase tracking-widest font-mono font-bold">incident remediation complete: secure</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-mono">
                Workstation verified secure. You successfully completed 7 randomized high-tier security threat remediation vectors (+80 XP recorded).
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/20 border border-emerald-400 text-emerald-400 rounded-lg text-xs font-black uppercase tracking-widest mx-auto max-w-max">
              <Award className="w-5 h-5 text-emerald-400 animate-bounce" /> SECUREOS CHAMPION REGISTERED
            </div>
            <button 
              onClick={startGame}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs uppercase tracking-widest transition-all"
            >
              Re-run simulation
            </button>
          </div>
        )}

        {/* BOTTOM FIXED SYSTEM LOGS TERMINAL */}
        {gameState === 'playing' && openWindows.terminal && (
          <div className="absolute bottom-2 left-6 right-6 z-10 pointer-events-auto">
            <div className="border border-slate-800 bg-[#040406] rounded-lg shadow-2xl p-4 flex flex-col h-32">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-1.5 text-[9px] tracking-widest font-black uppercase text-slate-400">
                <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-red-500" /> system debug console logging pipeline</span>
                <button onClick={() => toggleWindow('terminal')} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 text-[10px] text-slate-355 font-mono">
                {gameLogs.length === 0 ? (
                  <div className="text-slate-500">Initializing OS debugger log pipeline...</div>
                ) : (
                  gameLogs.map((log, idx) => (
                    <div key={idx} className="truncate">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SYSTEM OS TASKBAR */}
      <footer className="h-12 bg-[#08080b] border-t border-slate-800 flex items-center justify-between px-5 text-xs relative z-30">
        
        {/* Left taskbar controls */}
        <div className="flex items-center gap-4">
          <button 
            onClick={startGame}
            className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded text-xs flex items-center gap-1.5 shadow-[0_0_8px_rgba(220,38,38,0.2)] transition-colors"
          >
            <Tv className="w-4 h-4" /> SecureOS
          </button>
          
          {gameState === 'playing' && (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <button 
                onClick={() => toggleWindow('email')} 
                className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors ${openWindows.email ? 'bg-slate-900 text-cyan-400 border border-slate-700' : 'border border-transparent'}`} 
                title="Open outlook-mail"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button 
                onClick={() => toggleWindow('database')} 
                className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors ${openWindows.database ? 'bg-slate-900 text-yellow-400 border border-slate-700' : 'border border-transparent'}`} 
                title="Open postgres-log"
              >
                <Database className="w-4 h-4" />
              </button>
              <button 
                onClick={() => toggleWindow('antivirus')} 
                className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors ${openWindows.antivirus ? 'bg-slate-900 text-emerald-400 border border-slate-700' : 'border border-transparent'}`} 
                title="Open endpoint-av"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
              <button 
                onClick={() => toggleWindow('vpn')} 
                className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors ${openWindows.vpn ? 'bg-slate-900 text-purple-400 border border-slate-700' : 'border border-transparent'}`} 
                title="Open vpn-gateway"
              >
                <Wifi className="w-4 h-4" />
              </button>
              <button 
                onClick={() => toggleWindow('terminal')} 
                className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors ${openWindows.terminal ? 'bg-slate-900 text-slate-200 border border-slate-700' : 'border border-transparent'}`} 
                title="Open debug console"
              >
                <Terminal className="w-4 h-4" />
              </button>
              <button 
                onClick={() => toggleWindow('installer')} 
                className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors ${openWindows.installer ? 'bg-slate-900 text-teal-400 border border-slate-700' : 'border border-transparent'}`} 
                title="Install auto-agents"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => toggleWindow('filemanager')} 
                className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors ${openWindows.filemanager ? 'bg-slate-900 text-amber-400 border border-slate-700' : 'border border-transparent'}`} 
                title="Open file-manager"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <button 
                onClick={() => toggleWindow('browser')} 
                className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors ${openWindows.browser ? 'bg-slate-900 text-sky-400 border border-slate-700' : 'border border-transparent'}`} 
                title="Open sys-browser"
              >
                <Globe className="w-4 h-4" />
              </button>
              <button 
                onClick={() => toggleWindow('taskmonitor')} 
                className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors ${openWindows.taskmonitor ? 'bg-slate-900 text-orange-400 border border-slate-700' : 'border border-transparent'}`} 
                title="Open task-monitor"
              >
                <Cpu className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Center: exit options */}
        <div className="flex items-center">
          <Link 
            href="/cyberverse" 
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 hover:text-white font-bold uppercase tracking-wider rounded text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Exit Workstation
          </Link>
        </div>

        {/* Right taskbar controls */}
        <div className="flex items-center gap-5 text-slate-450 font-bold">
          
          <div className="hidden md:flex items-center gap-4 border-r border-slate-850 pr-5">
            <span className="flex items-center gap-1.5 text-xs"><Activity className="w-3.5 h-3.5 text-red-500" /> CPU: {cpuUsage}%</span>
            <span className="flex items-center gap-1.5 text-xs">NET: {netActivity[netActivity.length - 1]}kb/s</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleFullScreen} 
              className="text-slate-400 hover:text-white p-1 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4.5 h-4.5 text-red-500" /> : <Maximize2 className="w-4.5 h-4.5" />}
            </button>
            <span className="text-xs text-slate-300 font-mono tracking-wider">{osTime}</span>
          </div>

        </div>

      </footer>

    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useXPSystem } from '@/context/XPSystem';
import { 
  History, 
  DollarSign, 
  UserMinus, 
  AlertTriangle,
  Award,
  CheckCircle,
  TrendingUp,
  Bookmark,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Activity,
  Terminal,
  Database,
  Shield,
  Zap,
  Lock,
  Skull
} from 'lucide-react';

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  narrative: string;
  impactText: string;
  visualId: string;
  imageUrl: string;
  hackerStatus: string;
  statChange: {
    label: string;
    value: string;
  };
}

interface HistoricBreach {
  id: string;
  companyName: string;
  industry: string;
  summary: string;
  xpReward: number;
  achievementId: string;
  achievementTitle: string;
  achievementDesc: string;
  achievementIcon: string;
  stats: {
    financialDamage: string;
    recordsStolen: string;
    daysToResolve: string;
  };
  events: TimelineEvent[];
}

const BREACHES: Record<string, HistoricBreach> = {
  equifax: {
    id: 'equifax',
    companyName: 'Equifax Data Leak (2017)',
    industry: 'Credit Reporting Agency',
    summary: 'A critical patch failure on a public online portal exposed the financial records of over 140 million consumers.',
    xpReward: 50,
    achievementId: 'equifax_completed',
    achievementTitle: 'Equifax Auditor',
    achievementDesc: 'Analyzed the Equifax data breach case study',
    achievementIcon: '💳',
    stats: {
      financialDamage: '$1.4 Billion',
      recordsStolen: '147 Million',
      daysToResolve: '76 Days'
    },
    events: [
      {
        date: 'March 2017',
        title: 'Vulnerability Disclosed',
        description: 'US-CERT publishes warning regarding Apache Struts vulnerability.',
        narrative: 'In March 2017, US-CERT warned of a critical remote code execution flaw in the Apache Struts web framework. Equifax relied on this portal framework but failed to apply the security update, leaving their database portal completely unpatched.',
        impactText: 'Database portal server is vulnerable, but patch is not applied in time.',
        visualId: 'equifax_vuln',
        imageUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'SCANNING FOR PORT 8080...',
        statChange: { label: 'Unpatched Nodes', value: '1 Web portal API' }
      },
      {
        date: 'May 2017',
        title: 'Initial Intrusion',
        description: 'Attacker leverages struts API to gain entrance and install shell backdoors.',
        narrative: 'By May 2017, threat actors discovered the unpatched portal and gained remote shell command access. They installed persistent web shell scripts to maintain backdoor access and began scanning backend subnets.',
        impactText: 'Attacker installs web shells to maintain persistent operational control.',
        visualId: 'equifax_shell',
        imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'SHELL ACTIVATED. TUNNEL OPEN.',
        statChange: { label: 'Active Shells', value: '3 Backdoors' }
      },
      {
        date: 'June 2017',
        title: 'Database Exfiltration',
        description: 'Attacker database querying loop extracts millions of consumer credentials.',
        narrative: 'The attackers hijacked database credentials and began executing slow database query loops. Over the course of 76 days, they exfiltrated names, Social Security numbers, and credit files of 147 million victims.',
        impactText: '147 million records read and transferred off-network in encrypted chunks.',
        visualId: 'equifax_exfil',
        imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'DUMPING PROFILE RECORD DATABASE...',
        statChange: { label: 'Data Exfiltrated', value: '147 Million IDs' }
      },
      {
        date: 'July 2017',
        title: 'Breach Discovered',
        description: 'Security team detects suspicious outbound database records transfers.',
        narrative: 'On July 29, Equifax security analysts detected abnormal database traffic outbound. The compromised servers were taken offline, and internal incident response began cataloging the historic exfiltration scope.',
        impactText: 'Database connections suspended. Assessment and forensic audit begins.',
        visualId: 'equifax_discover',
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'ALERT: LOGS SUSPENDED. HALTING STREAM.',
        statChange: { label: 'Response Cost', value: '+$200M initial' }
      },
      {
        date: 'September 2017',
        title: 'Public Disclosure',
        description: 'Announcement triggers immediate regulatory reviews, stock fall, and litigation.',
        narrative: 'In September, Equifax publicly announced the security breach. The disclosure triggered immense public backlash, class-action lawsuits, executive resignations, and a global regulatory settlement of 1.4 billion dollars.',
        impactText: 'Class-action litigation, federal fines, and permanent audit penalties.',
        visualId: 'equifax_disclosure',
        imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'SESSION SHUTDOWN. TRACES CLEANED.',
        statChange: { label: 'Settlement Cost', value: '$1.4 Billion' }
      }
    ]
  },
  wannacry: {
    id: 'wannacry',
    companyName: 'WannaCry Ransomware (2017)',
    industry: 'Global Infrastructure & Health',
    summary: 'A massive global ransomware attack exploiting a leaked Windows SMB exploit (EternalBlue) to shut down hospitals, utilities, and businesses worldwide.',
    xpReward: 60,
    achievementId: 'wannacry_completed',
    achievementTitle: 'WannaCry Analyzer',
    achievementDesc: 'Dissected the WannaCry global crisis case study',
    achievementIcon: '☠️',
    stats: {
      financialDamage: '$4 Billion est.',
      recordsStolen: '0 (Files Encrypted)',
      daysToResolve: '4 Days'
    },
    events: [
      {
        date: 'April 2017',
        title: 'Exploit Leak',
        description: 'The Shadow Brokers group leaks NSA weaponized exploit EternalBlue.',
        narrative: 'A hacking group leaked ETERNALBLUE, an advanced NSA exploit targeting a vulnerability in Windows SMB servers. Despite a Microsoft patch being available, millions of internet-connected hosts remained unpatched.',
        impactText: 'Millions of unpatched Windows machines globally are vulnerable on port 445.',
        visualId: 'wannacry_leak',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'PARSING LEAKED PACKS...',
        statChange: { label: 'Exploit Availability', value: 'Publicly Released' }
      },
      {
        date: 'May 12, 2017',
        title: 'Global Outbreak Begins',
        description: 'Malware propagates autonomously through port 445 globally.',
        narrative: 'The WannaCry worm spread autonomously across the globe via port 445. Within hours, the malware encrypted 230,000 systems, locking up NHS hospitals, railways, and telecom systems worldwide.',
        impactText: 'NHS hospitals, Telefonica, and Renault assembly plants forced offline.',
        visualId: 'wannacry_outbreak',
        imageUrl: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'PROPAGATING NETWORK CRYPTOR...',
        statChange: { label: 'Infected Systems', value: '230,000+ computers' }
      },
      {
        date: 'May 13, 2017',
        title: 'The Killswitch Discovery',
        description: 'Marcus Hutchins registers a hardcoded check domain, halting propagation.',
        narrative: 'Security researcher Marcus Hutchins found a hardcoded domain check in the malware source code. By registering this domain, he triggered an internal killswitch that stopped the worm from infecting new systems.',
        impactText: 'Worm self-propagation halted. New machine locks prevented.',
        visualId: 'wannacry_killswitch',
        imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'DOMAIN HIJACKED. PROPAGATION FAILS.',
        statChange: { label: 'Propagation Rate', value: 'Halted' }
      },
      {
        date: 'May 15, 2017',
        title: 'Recovery & Fallout',
        description: 'Systems restored from backup. Global damages reach billions.',
        narrative: 'Organizations refused ransom payouts and restored files using offline backups. The total damage surpassed 4 billion dollars, highlighting the urgent need for strict security updates and patch compliance.',
        impactText: 'Enterprises reconstruct systems. Regulatory pressure on patching updates spikes.',
        visualId: 'wannacry_fallout',
        imageUrl: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'DISCONNECTING WORM THREADS.',
        statChange: { label: 'Financial Impact', value: '$4 Billion' }
      }
    ]
  },
  colonial: {
    id: 'colonial',
    companyName: 'Colonial Pipeline (2021)',
    industry: 'Energy & Fuel Utilities',
    summary: 'A ransomware attack on the largest US refined products pipeline, forcing operational closures triggered by a single compromised VPN password.',
    xpReward: 55,
    achievementId: 'colonial_completed',
    achievementTitle: 'Utility Defender',
    achievementDesc: 'Analyzed the Colonial Pipeline ransomware incident',
    achievementIcon: '⛽',
    stats: {
      financialDamage: '$5 Million Paid',
      recordsStolen: '100 GB Leaked',
      daysToResolve: '6 Days'
    },
    events: [
      {
        date: 'May 6, 2021',
        title: 'Credential Access',
        description: 'Attackers locate colonial VPN credentials lacking Multi-Factor auth.',
        narrative: 'Attackers obtained administrative VPN passwords leaked in dark-web dumps. The legacy VPN portal lacked Multi-Factor Authentication, allowing the hackers to authenticate with a single credential.',
        impactText: 'Attacker authenticates directly into corporate networks via remote gateway.',
        visualId: 'colonial_creds',
        imageUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'LOGGING INTO VPN GATEWAY...',
        statChange: { label: 'Intrusion Path', value: 'Compromised VPN' }
      },
      {
        date: 'May 7, 2021',
        title: 'Ransomware Execution',
        description: 'DarkSide encrypts billing server. Pipeline shut down as precaution.',
        narrative: 'The DarkSide group executed ransomware, encrypting Colonial\'s billing network and exfiltrating data. To safeguard operational SCADA grids, Colonial authorities shut down the pipeline completely.',
        impactText: 'Decision made to halt operational flow to safeguard pipeline SCADA nodes.',
        visualId: 'colonial_darkside',
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'ENCRYPTING BILLING DATABASES...',
        statChange: { label: 'Pipeline Operations', value: 'Shut Down' }
      },
      {
        date: 'May 8, 2021',
        title: 'Fuel Shortages',
        description: 'Pipeline closure triggers supply crunch and gasoline retail panic buying.',
        narrative: 'The shutdown triggered panic fuel buying across the eastern United States, causing gas prices to spike. The federal government declared a state of emergency to lift shipping restrictions.',
        impactText: 'Emergency declarations issued to transport fuel via highways.',
        visualId: 'colonial_panic',
        imageUrl: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'MONITORING GAS INFRASTRUCTURE PANIC...',
        statChange: { label: 'Gas Stations Empty', value: 'Thousands of locations' }
      },
      {
        date: 'May 9, 2021',
        title: 'Ransom Negotiation',
        description: 'Colonial authorities pay $4.4 million ransom for slow decryption utility.',
        narrative: 'Colonial paid DarkSide 75 Bitcoins, roughly 4.4 million dollars, for a decryption tool. The decryptor was slow, requiring recovery teams to rely on secure backups anyway.',
        impactText: 'Negotiation completed. Decryptor provided but backup restoration relied upon.',
        visualId: 'colonial_ransom',
        imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'RECEIVING WALLET PAYMENT. DECKEY SENT.',
        statChange: { label: 'Ransom Paid', value: '75 Bitcoins' }
      },
      {
        date: 'May 12, 2021',
        title: 'Restart Completed',
        description: 'Operational grids resume transport. Scrutiny on infrastructure spikes.',
        narrative: 'The pipeline system was restarted, and fuel grids resumed normal flow. The incident forced new federal directives mandating Multi-Factor Authentication across all critical US utilities.',
        impactText: 'Pipeline transport active. Federal oversight guidelines upgraded.',
        visualId: 'colonial_restart',
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        hackerStatus: 'EXITING NODE. SHELL TERMINATED.',
        statChange: { label: 'Decryption Recovered', value: 'Fully Functional' }
      }
    ]
  }
};

// Custom interactive SVG component illustrating each breach stage
function HistoricVisual({ visualId }: { visualId: string }) {
  const [pulse, setPulse] = useState(false);
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
      setTicks(t => t + 1);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  switch (visualId) {
    case 'equifax_vuln':
      return (
        <div className="w-full h-44 bg-slate-950 border border-emerald-500/50 rounded-xl relative overflow-hidden flex flex-col justify-between p-3 font-mono text-[10px]">
          <div className="flex items-center justify-between border-b border-emerald-500/40 pb-1.5">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 animate-pulse" /> NETWORK PACKET ANALYZER</span>
            <span className="text-red-400 font-bold border border-red-500/60 px-1.5 py-0.5 rounded bg-red-950/40 animate-pulse">EXPLOIT DETECTED</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center gap-1 relative">
            <div className="w-44 h-8 border border-emerald-500/70 rounded flex items-center justify-center bg-emerald-950/40 text-emerald-200 relative text-[9px] font-bold">
              <span>Apache Struts Endpoint</span>
              {pulse && <div className="absolute inset-0 border border-red-400 rounded animate-ping pointer-events-none" />}
            </div>
            <div className="w-0.5 h-6 border-l border-dashed border-red-400 relative">
              <span className="absolute left-2 top-1 text-red-400 animate-bounce text-[9px] font-bold">CVE-2017-5638</span>
            </div>
            <div className="w-36 h-7 border border-red-500/70 rounded flex items-center justify-center bg-red-950/50 text-red-300 text-center font-bold text-[9px]">
              INJECT: #cmd=whoami
            </div>
          </div>
          <div className="text-slate-300 text-[8px]">Content-Type: %{(ticks % 2 === 0) ? '#multipart/form-data' : '#ognl-expression-payload'}</div>
        </div>
      );

    case 'equifax_shell':
      return (
        <div className="w-full h-44 bg-slate-950 border border-emerald-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="text-emerald-400 font-bold flex items-center gap-1 border-b border-emerald-500/40 pb-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-300" /> PERSISTENT SHELLS ESTABLISHED
          </div>
          <div className="flex-1 space-y-1 py-2">
            <div className="text-emerald-300 font-bold">&gt; ls -la /var/www/html/disputes/</div>
            <div className="text-slate-300 text-[8px] font-bold">drwxr-xr-x  2 root root   4096 Jul 27 10:14 .</div>
            <div className="text-emerald-300 font-bold flex justify-between text-[9px]">
              <span>-rwxr-xr-x  cmd.jsp</span>
              <span className="text-red-400 animate-pulse font-black">[SHELL ACTIVE]</span>
            </div>
            <div className="text-emerald-300 font-bold flex justify-between text-[9px]">
              <span>-rw-r--r--  backup.war</span>
              <span className="text-red-400 animate-pulse font-black">[BACKDOOR OPEN]</span>
            </div>
          </div>
          <div className="bg-red-950/50 border border-red-500/50 rounded p-1 text-red-300 text-[8px] font-bold">
            Established tunnel to: C2_SERVER_IP:4444
          </div>
        </div>
      );

    case 'equifax_exfil':
      return (
        <div className="w-full h-44 bg-slate-950 border border-emerald-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-emerald-500/40 pb-1.5 z-10">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> DUMPING DATABASE</span>
            <span className="text-cyan-300 font-bold">EXFIL DATA</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center gap-1.5 z-10">
            <div className="text-[18px] font-black text-emerald-300 font-mono tracking-wider">
              {((140 + (ticks % 8)) * 1000000).toLocaleString()} / 147,000,000
            </div>
            <div className="text-slate-300 text-[8px] uppercase tracking-widest font-bold">Profiles Leaked</div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-emerald-800">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full transition-all duration-500" 
                style={{ width: `${90 + (ticks % 11)}%` }}
              />
            </div>
          </div>
          <div className="text-slate-300 text-[8px] truncate">
            QUERY: SELECT SSN, NAME, DOB, ADDR FROM profiles LIMIT {(ticks + 10) * 1000}
          </div>
        </div>
      );

    case 'equifax_discover':
      return (
        <div className="w-full h-44 bg-slate-950 border border-emerald-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-emerald-500/40 pb-1.5">
            <span className="text-red-400 font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" /> NETWORK ANOMALY AUDIT</span>
            <span className="text-red-400 border border-red-500/60 px-1.5 py-0.5 rounded bg-red-950/40 animate-pulse">ALERT CRITICAL</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between bg-slate-900 border border-emerald-800 p-1.5 rounded text-[9px] font-bold">
              <span className="text-slate-200">Outbound data threshold:</span>
              <span className="text-red-400 font-bold">&gt; 12.4 GB/hr</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900 border border-emerald-800 p-1.5 rounded text-[9px] font-bold">
              <span className="text-slate-200">Database server status:</span>
              <span className="text-red-400 font-bold animate-pulse">SUSPENDED</span>
            </div>
          </div>
          <div className="text-slate-300 text-[8px] uppercase tracking-wider font-bold">
            Log: Outbound exfiltration query forced administrative lock.
          </div>
        </div>
      );

    case 'equifax_disclosure':
      return (
        <div className="w-full h-44 bg-slate-950 border border-emerald-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-emerald-500/40 pb-1.5">
            <span className="text-red-400 font-bold flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-red-400" /> SEC DISCLOSURE & FINES</span>
            <span className="text-slate-300 font-bold">POST-MORTEM</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center gap-1">
            <span className="text-red-400 font-black text-2xl font-mono tracking-tight">$1.4B</span>
            <span className="text-slate-300 uppercase tracking-widest text-[8px] font-bold">Fines & Settlement Fines</span>
            <div className="text-[8px] text-emerald-300 border border-emerald-400/50 px-2 py-0.5 rounded bg-emerald-950/40 mt-1 font-bold">
              Lesson: Implement automated patch workflows.
            </div>
          </div>
        </div>
      );

    case 'wannacry_leak':
      return (
        <div className="w-full h-44 bg-slate-950 border border-red-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-red-500/40 pb-1.5">
            <span className="text-red-400 flex items-center gap-1.5"><Skull className="w-3.5 h-3.5 text-red-400" /> NSA EXPLOIT LEAK</span>
            <span className="text-yellow-400 border border-yellow-500/50 px-1 py-0.5 rounded bg-yellow-950/20 font-bold">SHADOW BROKERS</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1.5">
            <div className="bg-red-950/40 border border-red-500/50 p-1.5 rounded text-red-300 text-[9px] font-bold">
              <strong>EXPLOIT: ETERNALBLUE</strong>
              <div className="text-slate-200 text-[8px] mt-0.5 font-bold">Windows SMBv1 CVE-2017-0144</div>
            </div>
            <div className="bg-slate-900 border border-emerald-800 p-1 rounded text-emerald-300 text-[8px] font-bold">
              DoublePulsar payload installation backdoor module
            </div>
          </div>
        </div>
      );

    case 'wannacry_outbreak':
      return (
        <div className="w-full h-44 bg-slate-950 border border-red-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-red-500/40 pb-1.5 z-10">
            <span className="text-red-400 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" /> WORM ACTIVE</span>
            <span className="text-red-400 font-bold animate-pulse text-[9px]">PORT 445</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center gap-1 z-10">
            <span className="text-[20px] font-black text-red-400">{(200000 + (ticks * 4500)).toLocaleString()}+</span>
            <span className="text-slate-300 text-[8px] uppercase tracking-widest font-bold">Infected Global Nodes</span>
            <div className="text-center text-red-300 text-[8px] font-bold mt-1 animate-pulse">
              [!] LOCKING SYSTEM FILES...
            </div>
          </div>
        </div>
      );

    case 'wannacry_killswitch':
      return (
        <div className="w-full h-44 bg-slate-950 border border-emerald-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-emerald-500/40 pb-1.5">
            <span className="text-emerald-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-emerald-400" /> REVERSE ENGINEERING LOGS</span>
            <span className="text-emerald-300 font-bold border border-emerald-500/50 px-1 py-0.5 rounded bg-emerald-950/40">DNS QUERY</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1">
            <div className="text-slate-200 text-[8px] font-bold">Malware domain ping test:</div>
            <div className="bg-slate-900 border border-emerald-800 p-1.5 rounded text-emerald-300 truncate text-[9px] font-bold">
              iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea.com
            </div>
            <div className="text-[8px] text-emerald-300 font-bold text-center">
              KILLSWITCH: REGISTERED (PROPAGATION HALTED)
            </div>
          </div>
        </div>
      );

    case 'wannacry_fallout':
      return (
        <div className="w-full h-44 bg-slate-950 border border-red-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-red-500/40 pb-1.5">
            <span className="text-red-400 flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-red-500" /> GLOBAL DAMAGE</span>
            <span className="text-slate-300 font-bold">ANALYSIS</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <span className="text-red-400 font-black text-2xl font-mono tracking-tight">$4,000,000,000+</span>
            <span className="text-slate-300 uppercase tracking-widest text-[8px] mt-0.5 font-bold">Total Worldwide Losses</span>
          </div>
        </div>
      );

    case 'colonial_creds':
      return (
        <div className="w-full h-44 bg-slate-950 border border-purple-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-purple-500/40 pb-1.5">
            <span className="text-purple-400 flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-purple-400" /> ACCESS GATEWAY LOG</span>
            <span className="text-red-400 font-bold border border-red-500/60 px-1 py-0.5 rounded bg-red-950/40">NO MFA</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-2">
            <div className="bg-slate-900 border border-emerald-800 p-1.5 rounded text-[9px] font-bold">
              <div className="text-emerald-300 font-bold">ID: internal_network_vpn</div>
              <div className="text-emerald-300 font-bold">PASS: ******** [EXPOSED PASSWORD]</div>
            </div>
            <div className="text-red-400 font-bold text-[8px] animate-pulse text-center">
              ACCESS STATUS: GRANTED
            </div>
          </div>
        </div>
      );

    case 'colonial_darkside':
      return (
        <div className="w-full h-44 bg-slate-950 border border-purple-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-purple-500/40 pb-1.5">
            <span className="text-purple-400 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> SCADA FLOW RATE</span>
            <span className="text-red-400 font-bold border border-red-500/60 px-1.5 py-0.5 rounded bg-red-950/40">CLOSED</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="text-red-400 text-[22px] font-black tracking-widest animate-pulse">0.0 GALLONS/MIN</div>
            <div className="text-slate-300 text-[8px] uppercase tracking-widest font-bold">Colonial Pipeline flow rate</div>
          </div>
        </div>
      );

    case 'colonial_panic':
      return (
        <div className="w-full h-44 bg-slate-950 border border-purple-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-purple-500/40 pb-1.5">
            <span className="text-yellow-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> INFRASTRUCTURE PANIC</span>
            <span className="text-slate-300 font-bold">SUPPLY</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1.5">
            <div className="flex justify-between items-center text-slate-200 text-[9px] font-bold">
              <span>East Coast Fuel Shortage:</span>
              <span className="text-red-400 font-bold">45% supply deficit</span>
            </div>
            <div className="flex justify-between items-center text-slate-200 text-[9px] font-bold">
              <span>Gas Stations Empty:</span>
              <span className="text-red-400 font-bold animate-pulse">70% OUT OF STOCK</span>
            </div>
          </div>
        </div>
      );

    case 'colonial_ransom':
      return (
        <div className="w-full h-44 bg-slate-950 border border-purple-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-purple-500/40 pb-1.5">
            <span className="text-purple-400 flex items-center gap-1.5"><Skull className="w-3.5 h-3.5 text-purple-400" /> RANSOM TRANSACTION</span>
            <span className="text-red-400 border border-red-500/60 px-1 py-0.5 rounded bg-red-950/40">PAID</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="text-emerald-400 font-black text-2xl font-mono tracking-tight">75.0 BTC</div>
            <span className="text-slate-300 uppercase tracking-widest text-[8px] font-bold">($4.4 Million paid to DarkSide)</span>
          </div>
        </div>
      );

    case 'colonial_restart':
      return (
        <div className="w-full h-44 bg-slate-950 border border-emerald-500/50 rounded-xl p-3 font-mono text-[10px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-emerald-500/40 pb-1.5">
            <span className="text-emerald-400 flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-emerald-400" /> SCADA ONLINE STATUS</span>
            <span className="text-emerald-300 font-bold border border-emerald-500/50 px-1.5 py-0.5 rounded bg-emerald-950/20">ONLINE</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <span className="text-emerald-400 font-black text-[18px] font-mono tracking-wide">PRESSURE NORMAL</span>
            <span className="text-slate-300 uppercase tracking-widest text-[8px] mt-0.5 font-bold">Pipeline routes transport functional</span>
          </div>
        </div>
      );

    default:
      return <div className="w-full h-44 bg-slate-950 border border-emerald-950 rounded-xl flex items-center justify-center text-emerald-400 font-mono text-xs">Awaiting Data...</div>;
  }
}

export default function BreachTimeline({ breachId, onClose }: { breachId: string; onClose: () => void }) {
  const { addXP, unlockAchievement } = useXPSystem();
  const breach = BREACHES[breachId];

  const [activeEventIdx, setActiveEventIdx] = useState(0);
  const [timelineCompleted, setTimelineCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [hackerAvatarText, setHackerAvatarText] = useState('');
  const [triggerGlitch, setTriggerGlitch] = useState(false);

  const activeEvent = breach.events[activeEventIdx];

  // Dynamic Audio length check based on text length
  const words = activeEvent.narrative.split(' ');
  const calculatedDuration = Math.ceil(words.length * 0.45); // Average words-per-second rate
  const [progressSec, setProgressSec] = useState(0);

  // Trigger screen flash/glitch effect when step changes
  useEffect(() => {
    setTriggerGlitch(true);
    const timer = setTimeout(() => setTriggerGlitch(false), 800);
    return () => clearTimeout(timer);
  }, [activeEventIdx]);

  // Typing effect for the hacker status console
  useEffect(() => {
    setHackerAvatarText('');
    let idx = 0;
    const txt = activeEvent.hackerStatus;
    const interval = setInterval(() => {
      setHackerAvatarText(txt.substring(0, idx + 1));
      idx++;
      if (idx >= txt.length) {
        clearInterval(interval);
      }
    }, 45);
    return () => clearInterval(interval);
  }, [activeEventIdx, activeEvent.hackerStatus]);

  // Track completion when user reaches last slide
  useEffect(() => {
    if (activeEventIdx === breach.events.length - 1 && !timelineCompleted) {
      setTimelineCompleted(true);
      addXP(breach.xpReward);
      unlockAchievement(
        breach.achievementId,
        breach.achievementTitle,
        breach.achievementDesc,
        breach.achievementIcon
      );
    }
  }, [activeEventIdx, breach, timelineCompleted, addXP, unlockAchievement]);

  // Unified Audio playback & slide advance control loop
  useEffect(() => {
    if (!isPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    let advanceTimer: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const handleAdvance = () => {
      if (activeEventIdx < breach.events.length - 1) {
        setActiveEventIdx(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };

    setProgressSec(0);
    progressInterval = setInterval(() => {
      setProgressSec(p => Math.min(p + 0.2, calculatedDuration));
    }, 200);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeEvent.narrative);
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(
        v => v.lang.startsWith('en-IN') || v.lang.startsWith('en-in') || v.name.includes('India') || v.name.includes('Indian')
      );
      if (indianVoice) {
        utterance.voice = indianVoice;
      }
      utterance.rate = 0.95; // Slightly slower, cinematic documentary rate
      
      // EXCLUSIVE ADVANCE ROUTINE: ONLY advance when the speech synthesises explicitly fires onend
      utterance.onend = () => {
        advanceTimer = setTimeout(handleAdvance, 1000);
      };

      // Safeguard is set very high (40s) so it never cuts off normal reading loops early
      const safeguardTimer = setTimeout(handleAdvance, 40000);

      window.speechSynthesis.speak(utterance);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(advanceTimer);
        clearTimeout(safeguardTimer);
        window.speechSynthesis.cancel();
      };
    } else {
      // Muted / fallback path: advance based on calculated duration + delay
      advanceTimer = setTimeout(handleAdvance, (calculatedDuration * 1000) + 1000);
      return () => {
        clearInterval(progressInterval);
        clearTimeout(advanceTimer);
      };
    }
  }, [activeEventIdx, isPlaying, isMuted, breach, calculatedDuration]);

  const handleRestart = () => {
    setActiveEventIdx(0);
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020205] flex flex-col font-mono text-slate-100 overflow-hidden select-none">
      
      {/* Glitch & Red Alert screen flash overlay */}
      {triggerGlitch && (
        <div className="absolute inset-0 bg-red-900/30 z-50 pointer-events-none animate-pulse border-4 border-red-500" />
      )}

      {/* CRT Scanline & Grid Effect */}
      <div className="absolute inset-0 bg-crt-scanlines opacity-15 pointer-events-none z-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#000_100%)] pointer-events-none z-30" />
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent animate-scanline z-30 pointer-events-none" />

      {/* Header */}
      <header className="p-4 border-b border-emerald-500/40 bg-black/95 flex items-center justify-between shadow-2xl relative z-20">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-emerald-400 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-widest">{breach.companyName}</h2>
              <span className="text-[9px] bg-red-950/80 text-red-400 border border-red-500/50 px-2 py-0.5 rounded font-black tracking-widest animate-pulse">CLASSIFIED INTEL</span>
            </div>
            <p className="text-[10px] text-emerald-300 uppercase tracking-widest font-black mt-0.5">{breach.industry}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mute and Play Controls */}
          <div className="flex items-center gap-1.5 bg-[#08080f] border border-emerald-500/40 rounded-lg p-1.5">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 hover:text-emerald-400 transition-colors text-slate-100"
              title={isPlaying ? "Pause Narration" : "Play Narration"}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 hover:text-emerald-400 transition-colors text-slate-100 border-l border-emerald-500/20 pl-2"
              title={isMuted ? "Unmute Voiceover" : "Mute Voiceover"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400 animate-pulse" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={handleRestart}
              className="p-1.5 hover:text-emerald-400 transition-colors text-slate-100 border-l border-emerald-500/20 pl-2"
              title="Restart Story"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={onClose}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-lg text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_12px_rgba(239,68,68,0.4)] border-none"
          >
            Exit Archive
          </button>
        </div>
      </header>

      {/* Main page content split */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 p-6 gap-6 overflow-y-auto lg:overflow-hidden bg-[#030308] relative z-20">
        
        {/* Left Side: Summary, Stats, and Interactive Hacker Avatar Console */}
        <div className="space-y-6 flex flex-col justify-between lg:overflow-y-auto pr-1">
          
          {/* Incident Case Profile Card */}
          <div className="bg-black/95 border border-emerald-500/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
            
            <h3 className="text-xs font-black text-emerald-300 flex items-center gap-2 uppercase tracking-widest border-b border-emerald-500/30 pb-3 mb-3">
              <Bookmark className="w-4 h-4 text-emerald-400 animate-pulse" /> incident case profile
            </h3>
            <p className="text-[12px] text-white leading-relaxed font-bold font-mono">
              {breach.summary}
            </p>

            <div className="space-y-3 pt-4 border-t border-emerald-500/30 mt-4">
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-300 font-bold block">Exfiltration Impact Logs</span>
              
              <div className="bg-slate-950 border border-emerald-500/40 rounded-lg p-3 flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
                <div className="flex-1">
                  <div className="text-[9px] text-slate-300 font-black uppercase tracking-wider">Financial Damage</div>
                  <div className="text-xs font-black text-white">{breach.stats.financialDamage}</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-emerald-500/40 rounded-lg p-3 flex items-center gap-3">
                <UserMinus className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]" />
                <div className="flex-1">
                  <div className="text-[9px] text-slate-300 font-black uppercase tracking-wider">Compromised Credentials</div>
                  <div className="text-xs font-black text-white">{breach.stats.recordsStolen}</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-emerald-500/40 rounded-lg p-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 drop-shadow-[0_0_6px_rgba(249,115,22,0.4)]" />
                <div className="flex-1">
                  <div className="text-[9px] text-slate-300 font-black uppercase tracking-wider">Resolution Period</div>
                  <div className="text-xs font-black text-white">{breach.stats.daysToResolve}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Hacker Avatar Console Widget */}
          <div className="bg-black/95 border border-red-500/50 rounded-xl p-5 shadow-2xl relative overflow-hidden flex items-center gap-4">
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-400" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-400" />
            
            {/* Hacker Image representation */}
            <div className="w-20 h-20 relative rounded-lg overflow-hidden border border-red-500/60 flex-shrink-0 bg-slate-900 group">
              <img 
                src="/hacker-avatar.png" 
                alt="Hacker Avatar" 
                className="w-full h-full object-cover opacity-100 group-hover:scale-115 transition-transform duration-500"
              />
              <div className="absolute inset-0 border border-red-500/40 rounded-lg pointer-events-none" />
            </div>

            <div className="flex-1 space-y-1 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-widest text-red-400">OPERATOR ACTIVE</span>
              </div>
              <div className="text-[10px] text-white font-black uppercase tracking-wide">SYSTEM INTRUSION HOST</div>
              <div className="bg-[#0b0303] border border-red-500/30 rounded p-1.5 mt-1 font-mono text-[9px] text-red-400 min-h-[30px] flex items-center font-bold">
                <span>&gt; {hackerAvatarText}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Center & Right Combined: Interactive timeline map & documentary visuals */}
        <div className="lg:col-span-2 bg-black/95 border border-emerald-500/40 rounded-xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />

          {/* Top Stage tracker */}
          <div className="flex justify-between gap-2 overflow-x-auto pb-3 border-b border-emerald-500/30">
            {breach.events.map((evt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveEventIdx(idx);
                  setIsPlaying(true);
                }}
                className={`px-4 py-2 text-[10px] font-black rounded border transition-all text-left min-w-[130px] ${
                  activeEventIdx === idx 
                    ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]' 
                    : 'bg-[#05050c] border-emerald-500/40 text-slate-300 hover:text-white hover:border-emerald-400'
                }`}
              >
                <div className="font-black text-emerald-400 text-[10px] tracking-widest">{evt.date}</div>
                <div className="text-[9px] uppercase tracking-wider truncate max-w-[110px] mt-0.5 font-black text-white">{evt.title}</div>
              </button>
            ))}
          </div>

          {/* Documentary presentation area */}
          <div className="flex-1 py-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* Left: Documentary detailed narration text */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 font-bold">{activeEvent.date}</span>
                <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                  {activeEvent.title}
                </h3>
              </div>
              
              <div className="relative p-4 bg-slate-950/90 border border-emerald-500/40 rounded-lg flex-1 flex flex-col justify-center">
                <p className="text-[12px] md:text-[13px] text-white leading-relaxed font-bold font-mono">
                  {activeEvent.narrative}
                </p>
                {isPlaying && !isMuted && (
                  <div className="absolute bottom-2 right-3 flex items-center gap-1 text-[8px] text-emerald-400 font-bold uppercase tracking-widest">
                    <span className="w-1 h-3 bg-emerald-400 animate-pulse inline-block" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1 h-4 bg-emerald-400 animate-pulse inline-block" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1 h-2 bg-emerald-400 animate-pulse inline-block" style={{ animationDelay: '0.3s' }} />
                    audio stream active
                  </div>
                )}
              </div>

              <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg space-y-1">
                <span className="text-[9px] uppercase tracking-widest text-red-400 font-black block">Incident Impact Log</span>
                <p className="text-[11px] text-white font-bold">{activeEvent.impactText}</p>
              </div>
            </div>

            {/* Right: Immersive graphic visual & Internet photo compilation */}
            <div className="flex flex-col justify-between gap-4">
              
              {/* Animated Interactive hacking SVG */}
              <HistoricVisual visualId={activeEvent.visualId} />

              {/* High-quality internet photographic source matching the step */}
              <div className="flex-1 min-h-[120px] bg-slate-950 rounded-xl overflow-hidden border border-emerald-500/40 relative group">
                <img 
                  src={activeEvent.imageUrl} 
                  alt={activeEvent.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute bottom-2 left-3 text-[8px] text-slate-100 font-bold uppercase tracking-widest bg-black/80 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Documentary Source Footage
                </div>
              </div>

            </div>

          </div>

          {/* Bottom active status / progress controls */}
          <div className="space-y-3 mt-2">
            {/* Voice progression bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[8px] text-slate-400 uppercase tracking-widest font-black">
                <span>narration timeline progress</span>
                <span>{progressSec.toFixed(1)}s / {calculatedDuration}s</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-emerald-500/30">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${(progressSec / calculatedDuration) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-950 border border-emerald-500/40 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-[9px] text-slate-300 uppercase font-black tracking-wider">Active Counter Change</span>
                  <div className="text-[10px] font-black text-white mt-0.5">{activeEvent.statChange.label}</div>
                </div>
              </div>
              <div className="text-xs font-black text-emerald-400 font-mono tracking-wide">
                {activeEvent.statChange.value}
              </div>
            </div>
          </div>

          {/* Timeline completion overlay/banner */}
          {timelineCompleted && activeEventIdx === breach.events.length - 1 && (
            <div className="mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-950/50 border border-emerald-400 text-emerald-300 rounded-lg text-[10px] font-black animate-pulse uppercase tracking-widest">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400" /> SYSTEM AUDIT COMPLETE. LEVEL XP REWARD CLAIMED (+{breach.xpReward} XP)
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

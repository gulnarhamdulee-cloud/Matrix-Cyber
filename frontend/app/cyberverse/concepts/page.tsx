'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useXPSystem } from '@/context/XPSystem';
import { 
  ArrowLeft, 
  BookOpen, 
  HelpCircle, 
  Shield, 
  Cpu, 
  Award, 
  CheckCircle,
  Eye
} from 'lucide-react';
import Link from 'next/link';

interface Concept {
  id: string;
  title: string;
  analogyTitle: string;
  analogyText: string;
  microscopeDetail: string;
  steps: string[];
  defenseTip: string;
  complexity: 'Low' | 'Medium' | 'High' | 'Critical';
  riskRating: number; // Out of 5
}

const CONCEPTS: Concept[] = [
  {
    id: 'phishing',
    title: 'Phishing Vectors',
    analogyTitle: 'The Counterfeit Delivery Agent',
    analogyText: 'It is like a messenger knocking on your door wearing a FedEx uniform. They hand you a package and ask you to write down your credit card number to confirm delivery. The uniform is fake, and once they get your card number, they vanish.',
    microscopeDetail: 'Phishing leverages urgent, forged messages to trick operators into revealing high-value credentials or opening malicious macro scripts.',
    steps: [
      'Spoof sender address identities',
      'Create high-urgency request script template',
      'Inject harvest link redirection path',
      'Log submitted credentials'
    ],
    defenseTip: 'Verify sender domains and always enforce hardware-based Multi-Factor Authentication.',
    complexity: 'Low',
    riskRating: 5
  },
  {
    id: 'sqli',
    title: 'SQL Injection (SQLi)',
    analogyTitle: 'The Mailroom Instruction Exploit',
    analogyText: 'Imagine sending a letter to a corporate archive department asking for: "Files for Client A, AND also bring me all administrative tax files." The sorting clerk doesn\'t verify the commands, executes the command, and returns all documents.',
    microscopeDetail: 'SQL Injection feeds unexpected syntax parameters to form fields to trick the back-end compiler into running database queries without validation.',
    steps: [
      'Locate unsanitized search input parameter',
      'Inject query breaking characters like \'',
      'Apply database UNION instructions',
      'Exfiltrate system user schemas'
    ],
    defenseTip: 'Enforce parameterized queries, ORM systems, and input data sanitize filters.',
    complexity: 'Medium',
    riskRating: 4
  },
  {
    id: 'xss',
    title: 'Cross-Site Scripting (XSS)',
    analogyTitle: 'The Bulletin Board Post-It Hack',
    analogyText: 'It is like placing a Post-It note on a public library bulletin board that has glue on the back. When another reader pulls the note, it sticks to their hand and steals a key card from their pocket.',
    microscopeDetail: 'XSS injects executable scripts into trusted web responses, stealing visitor cookies and executing client-side functions.',
    steps: [
      'Locate form submitting message input vectors',
      'Inject raw JavaScript script tags',
      'Store execution scripts in database',
      'Exfiltrate visitor browser cookies'
    ],
    defenseTip: 'Sanitize server reflections, escape HTML character outputs, and implement strict CSP policies.',
    complexity: 'Medium',
    riskRating: 4
  },
  {
    id: 'ransomware',
    title: 'Ransomware Cryptors',
    analogyTitle: 'The Mailbox Padlock Attack',
    analogyText: 'An intruder breaks into your private filing room, locking all filing cabinets with unbreakable padlocks. They leave a note stating they will give you the keys only if you drop off money in a dark alley.',
    microscopeDetail: 'Ransomware executes multi-threaded filesystem encryption, dropping system recovery instructions and holding decryption keys hostage.',
    steps: [
      'Staging macro-enabled file payloads',
      'Executing sandbox detection audits',
      'Generating unique target encryption key',
      'Performing filesystem AES lock sweep'
    ],
    defenseTip: 'Perform daily offline cloud backups and maintain zero-trust folder access restrictions.',
    complexity: 'High',
    riskRating: 5
  },
  {
    id: 'mitm',
    title: 'Man-in-the-Middle (MitM)',
    analogyTitle: 'The Eavesdropping Switchboard operator',
    analogyText: 'Imagine writing letters to your banker, but your landlord opens the envelope, writes down your bank details, reseals the envelope, and forwards it to the bank. Neither you nor the bank realize the letters were read.',
    microscopeDetail: 'MitM positions the interceptor node between client and server, reading, modifying, or spoofing traffic details without detection.',
    steps: [
      'Perform ARP spoofing in local network subnet',
      'Redirect router target default gateway',
      'Intercept unencrypted traffic packets',
      'Exfiltrate sensitive session data tokens'
    ],
    defenseTip: 'Always enforce HTTPS, restrict public WiFi usage, and activate reliable VPN tunnels.',
    complexity: 'Medium',
    riskRating: 3
  },
  {
    id: 'ddos',
    title: 'Distributed Denial of Service (DDoS)',
    analogyTitle: 'The Highway Traffic Jam',
    analogyText: 'Imagine 10,000 empty cars blocking all lanes leading to a single toll booth simultaneously. Legitimate travelers trying to drive home cannot reach the booth because the highway is blocked.',
    microscopeDetail: 'DDoS coordinates thousands of zombie botnet devices to overwhelm target networks, making applications unavailable.',
    steps: [
      'Infect unsecured IoT nodes with command script',
      'Establish central C2 coordinator controls',
      'Flood target with UDP/TCP/HTTP packets',
      'Saturate system bandwidth capacity'
    ],
    defenseTip: 'Deploy edge traffic filtering services, redundant scale servers, and rate limiters.',
    complexity: 'Low',
    riskRating: 4
  },
  {
    id: 'zeroday',
    title: 'Zero-Day Exploitation',
    analogyTitle: 'The Unlocked Vault Door Flaw',
    analogyText: 'It is like discovering that a bank vault lock mechanism has a manufacturing defect where turning it twice counter-clockwise opens it without a code. The manufacturer has not found this out, but you have.',
    microscopeDetail: 'Zero-Days represent software vulnerabilities known only to attackers, leaving zero days for defense teams to issue patches.',
    steps: [
      'Analyze binary code structures for memory bugs',
      'Locate buffer overflow opportunities',
      'Craft payload evading existing firewalls',
      'Execute attack before patch release'
    ],
    defenseTip: 'Enforce real-time behavior analytics, system memory shields, and rapid patch cycles.',
    complexity: 'Critical',
    riskRating: 5
  },
  {
    id: 'stuffing',
    title: 'Credential Stuffing',
    analogyTitle: 'The Global Key Ring Attack',
    analogyText: 'An intruder steals a key ring containing a key labeled "Front Door." Instead of trying it on only one house, they walk around the entire city testing the same key on every front door to see which ones open.',
    microscopeDetail: 'Credential Stuffing automated bots test millions of leaked passwords against separate web portals to exploit credential reuse.',
    steps: [
      'Collect credentials list leaked from target breaches',
      'Configure proxy automation testing bots',
      'Test credential inputs on multiple web logins',
      'Extract successfully authorized accounts'
    ],
    defenseTip: 'Never reuse passwords. Employ modern unique password vaults and enable 2FA alerts.',
    complexity: 'Low',
    riskRating: 4
  }
];

export default function ConceptMicroscopePage() {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [readConcepts, setReadConcepts] = useState<string[]>([]);
  const { addXP, unlockAchievement } = useXPSystem();

  const handleConceptSelect = (concept: Concept) => {
    setSelectedConcept(concept);
    
    if (!readConcepts.includes(concept.id)) {
      const updated = [...readConcepts, concept.id];
      setReadConcepts(updated);
      
      // Reward XP for studying the concept
      addXP(15);
      
      // If user reviews 4 concepts, unlock Microscope Master achievement
      if (updated.length === 4) {
        unlockAchievement(
          'microscope_master',
          'Concept Inspector',
          'Studied 4 core cyber concepts in the Concept Microscope',
          '🔬'
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans relative overflow-hidden pattern-bg">
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        
        {/* Back Link */}
        <Link 
          href="/cyberverse" 
          className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-accent-primary transition-colors uppercase font-bold tracking-widest mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> CyberVerse Hub
        </Link>

        {/* Header */}
        <div className="space-y-3 mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-medium text-text-primary tracking-tight">
            Concept <span className="text-accent-primary">Microscope</span>
          </h1>
          <p className="text-text-secondary max-w-xl text-sm md:text-base leading-relaxed">
            Deconstruct complex cybersecurity terminologies. View structural attack mechanisms, defensive requirements, and real-world analogies.
          </p>
        </div>

        {/* Split UI or List Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Interactive list of concept files */}
          <div className="space-y-3 lg:col-span-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-accent-primary block mb-2">Target Concept List</span>
            
            {CONCEPTS.map((concept) => {
              const studied = readConcepts.includes(concept.id);
              return (
                <button
                  key={concept.id}
                  onClick={() => handleConceptSelect(concept)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                    selectedConcept?.id === concept.id
                      ? 'bg-warm-200 border-accent-primary/30 text-text-primary shadow-sm'
                      : 'bg-white/70 border-warm-300 text-text-secondary hover:text-text-primary hover:border-warm-400'
                  }`}
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      {concept.title}
                      {studied && <CheckCircle className="w-3.5 h-3.5 text-accent-primary" />}
                    </h3>
                    <div className="flex gap-2">
                      <span className="text-[9px] uppercase font-bold text-text-muted">Complexity: {concept.complexity}</span>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-accent-primary/50" />
                </button>
              );
            })}
          </div>

          {/* Right: Microscope view details */}
          <div className="lg:col-span-2">
            {selectedConcept ? (
              <div className="bg-white/90 border border-warm-300 rounded-2xl p-8 space-y-6 shadow-md animate-in fade-in duration-300">
                
                {/* Topic Header */}
                <div className="flex justify-between items-start border-b border-warm-200 pb-5">
                  <div>
                    <h2 className="text-2xl font-serif font-medium text-text-primary">{selectedConcept.title}</h2>
                    <p className="text-xs text-accent-primary font-semibold mt-1">Status: Inspected (+15 XP Earned)</p>
                  </div>
                  <div className="flex items-center gap-2 bg-warm-50 border border-warm-200 px-3 py-1.5 rounded-lg text-xs">
                    <span className="text-text-muted font-bold uppercase">Risk Index:</span>
                    <span className="text-red-600 font-bold">{'★'.repeat(selectedConcept.riskRating)}{'☆'.repeat(5 - selectedConcept.riskRating)}</span>
                  </div>
                </div>

                {/* Analogy Box */}
                <div className="p-5 bg-warm-100 border border-warm-200 rounded-xl space-y-2">
                  <h4 className="text-xs uppercase tracking-wider text-accent-primary font-bold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-accent-primary" />
                    Analogy: {selectedConcept.analogyTitle}
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed font-medium">
                    {selectedConcept.analogyText}
                  </p>
                </div>

                {/* Scope details */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-black tracking-widest text-accent-primary block">Microscope Details</span>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {selectedConcept.microscopeDetail}
                  </p>
                </div>

                {/* Step Attack loop */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-black tracking-widest text-red-700 block">Attack Path Steps</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedConcept.steps.map((st, idx) => (
                      <div key={idx} className="bg-warm-50/50 border border-warm-200 rounded-lg p-3 flex items-start gap-2.5">
                        <span className="text-xs text-red-600 font-mono font-bold">{idx + 1}.</span>
                        <span className="text-xs text-text-secondary leading-normal">{st}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Defense Tip block */}
                <div className="p-4 bg-emerald-50 border border-emerald-200/50 rounded-xl flex items-center gap-3">
                  <Shield className="w-5 h-5 text-accent-primary shrink-0" />
                  <div>
                    <span className="text-[10px] text-accent-primary uppercase font-black tracking-wider">Defensive Countermeasures</span>
                    <p className="text-xs text-text-secondary mt-0.5">{selectedConcept.defenseTip}</p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full min-h-[300px] border border-dashed border-warm-300 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-warm-50/20">
                <Cpu className="w-12 h-12 text-accent-primary/20 animate-pulse mb-4" />
                <h3 className="text-base font-serif font-medium text-text-muted">Select a Concept Target</h3>
                <p className="text-xs text-text-muted mt-1 max-w-xs">
                  Review concepts from the left directory to examine microscopic details, steps, analogies, and defense tactics.
                </p>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}

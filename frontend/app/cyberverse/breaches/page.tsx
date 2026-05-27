'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import BreachTimeline from '@/components/cyberverse/BreachTimeline';
import { useXPSystem } from '@/context/XPSystem';
import { History, ArrowLeft, ShieldAlert, Award, FileText } from 'lucide-react';
import Link from 'next/link';

export default function BreachArchivePage() {
  const [activeBreachId, setActiveBreachId] = useState<string | null>(null);
  const { achievements } = useXPSystem();

  const cases = [
    {
      id: 'equifax',
      companyName: 'Equifax Leak (2017)',
      description: 'Analyze the unpatched Struts application flaw that leaked 147 million financial profiles.',
      color: 'from-cyan-950/40 via-cyan-900/10 border-cyan-800/30 text-cyan-400',
      tag: 'Patch Management Failure',
      xpReward: 50,
      completed: achievements.some(a => a.id === 'equifax_completed')
    },
    {
      id: 'wannacry',
      companyName: 'WannaCry Attack (2017)',
      description: 'Investigate the NSA-leaked EternalBlue exploit that crippled health services globally.',
      color: 'from-red-950/40 via-red-900/10 border-red-800/30 text-red-400',
      tag: 'Exploit Worm propagation',
      xpReward: 60,
      completed: achievements.some(a => a.id === 'wannacry_completed')
    },
    {
      id: 'colonial',
      companyName: 'Colonial Pipeline (2021)',
      description: 'Trace the utility shutoff caused by a compromised VPN lacking Multi-Factor authentication.',
      color: 'from-purple-950/40 via-purple-900/10 border-purple-800/30 text-purple-400',
      tag: 'Credentials Leak',
      xpReward: 55,
      completed: achievements.some(a => a.id === 'colonial_completed')
    }
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans relative overflow-hidden pattern-bg">
      {/* Visual background glows */}
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent-gold/5 rounded-full blur-[100px] pointer-events-none" />

      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        
        {/* Back link */}
        <Link 
          href="/cyberverse" 
          className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-accent-primary transition-colors uppercase font-bold tracking-widest mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> CyberVerse Hub
        </Link>

        {/* Header */}
        <div className="space-y-3 mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-medium text-text-primary tracking-tight">
            Breach Story <span className="text-accent-primary">Archive</span>
          </h1>
          <p className="text-text-secondary max-w-xl text-sm md:text-base leading-relaxed">
            Historical incident visual post-mortems. Map key operational weaknesses, timelines, exfiltration indicators, and resolution details.
          </p>
        </div>

        {/* Cases timeline selectors list */}
        <div className="grid md:grid-cols-3 gap-8">
          {cases.map((cs) => (
            <div 
              key={cs.id}
              className={`bg-white/70 border border-warm-300 rounded-2xl p-6 flex flex-col justify-between hover:border-accent-primary/30 transition-all duration-300 hover:shadow-card relative group overflow-hidden`}
            >
              {cs.completed && (
                <div className="absolute top-4 right-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                  Completed
                </div>
              )}

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-warm-100 border border-warm-300 flex items-center justify-center text-accent-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-accent-primary font-bold block">{cs.tag}</span>
                  <h3 className="text-xl font-serif font-medium text-text-primary mt-1 group-hover:text-accent-primary transition-colors">
                    {cs.companyName}
                  </h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {cs.description}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-warm-200 flex items-center justify-between text-xs text-text-muted">
                <span className="flex items-center gap-1 font-bold text-accent-primary">
                  <Award className="w-3.5 h-3.5 text-accent-gold" />
                  +{cs.xpReward} XP Reward
                </span>
                <button
                  onClick={() => setActiveBreachId(cs.id)}
                  className="px-4 py-2 bg-warm-100 hover:bg-accent-primary hover:text-white border border-warm-300 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300 text-text-primary"
                >
                  Dissect Incident
                </button>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* Timeline Player Overlay Modal */}
      {activeBreachId && (
        <BreachTimeline 
          breachId={activeBreachId} 
          onClose={() => setActiveBreachId(null)} 
        />
      )}
    </div>
  );
}

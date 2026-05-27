'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useXPSystem } from '@/context/XPSystem';
import { 
  Play, 
  BookOpen, 
  ShieldAlert, 
  History, 
  Award, 
  TrendingUp, 
  Sparkles, 
  RefreshCw 
} from 'lucide-react';

export default function CyberVersePage() {
  const { xp, level, levelTitle, achievements, xpNeededForNextLevel, resetProgress } = useXPSystem();

  const percentage = Math.min(Math.floor((xp / xpNeededForNextLevel) * 100), 100);

  const modules = [
    {
      title: 'Attack Cinema',
      description: 'Step into the projector room. Watch simulated cyber attacks unfold dynamically with split-screen Attacker vs. Victim perspectives.',
      icon: Play,
      href: '/cyberverse/cinema',
      color: 'from-emerald-600 to-teal-700',
      badge: 'Interactive Movie'
    },
    {
      title: 'Breach Archive',
      description: 'Dissect historical security breaches. Track timeline event lines, real impact calculations, and post-incident lessons.',
      icon: History,
      href: '/cyberverse/breaches',
      color: 'from-amber-600 to-yellow-700',
      badge: 'Case Studies'
    },
    {
      title: 'Concept Microscope',
      description: 'Under the lens. Deep visual explanations of core cybersecurity terminology using interactive diagrams and real-world analogies.',
      icon: BookOpen,
      href: '/cyberverse/concepts',
      color: 'from-emerald-700 to-green-800',
      badge: 'Visual Library'
    },
    {
      title: 'Shield Protocol',
      description: 'Operational defense simulation. Play a tactical tower-defense mini-game deploying firewalls, VPNs, and 2FA guards.',
      icon: ShieldAlert,
      href: '/cyberverse/shield-protocol',
      color: 'from-red-700 to-orange-800',
      badge: 'Defense Game'
    }
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans relative overflow-hidden pattern-bg">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-accent-gold/5 rounded-full blur-[140px] pointer-events-none" />

      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        
        {/* Hub Header & User Profile Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center mb-16">
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-warm-200 border border-warm-300 rounded-full text-accent-primary text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-accent-gold" />
              Matrix Visual Dimension
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-text-primary tracking-tight">
              Cyber<span className="text-accent-primary">Verse</span> Hub
            </h1>
            <p className="text-text-secondary max-w-xl leading-relaxed text-sm md:text-base">
              Simplifying the complex matrix of cybersecurity. Experience interactive attack simulations, historical post-mortems, and defense strategy gaming.
            </p>
          </div>

          {/* Gamified Level Card */}
          <div className="glass-card p-6 border border-warm-300 shadow-soft">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-text-muted font-bold">OPERATOR PROFILE</span>
                <h3 className="text-xl font-serif font-medium text-text-primary mt-1">{levelTitle}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-warm-200 flex items-center justify-center border border-warm-300 text-accent-primary font-black">
                {level}
              </div>
            </div>

            {/* XP progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-text-secondary">
                <span>XP Progress</span>
                <span>{xp} / {xpNeededForNextLevel} XP</span>
              </div>
              <div className="w-full h-2.5 bg-warm-200 rounded-full overflow-hidden border border-warm-300">
                <div 
                  className="h-full bg-gradient-to-r from-accent-primary to-accent-gold transition-all duration-500" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-accent-gold" />
                {achievements.length} Achievements Unlocked
              </span>
              <button 
                onClick={() => { if(confirm('Reset all CyberVerse levels & XP?')) resetProgress(); }}
                className="text-[10px] text-text-muted hover:text-red-600 flex items-center gap-1 transition-colors"
                title="Reset Level Progress"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Modules grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {modules.map((m, idx) => {
            const Icon = m.icon;
            return (
              <Link 
                key={idx} 
                href={m.href}
                className="group relative overflow-hidden rounded-2xl bg-white/70 border border-warm-300/60 p-8 hover:border-accent-primary/40 hover:bg-white/95 transition-all duration-300 hover:shadow-card hover:-translate-y-1 flex flex-col h-full"
              >
                {/* Decorative background glow on hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-warm-200/40 rounded-full blur-2xl group-hover:bg-warm-200/80 transition-all duration-300 pointer-events-none" />
                
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${m.color} text-white shadow-md`}>
                    <Icon className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 bg-warm-100 text-text-muted border border-warm-300/50 rounded-full">
                    {m.badge}
                  </span>
                </div>

                <h3 className="text-2xl font-serif font-medium text-text-primary mb-3 group-hover:text-accent-primary transition-colors">
                  {m.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-6 flex-1">
                  {m.description}
                </p>

                <div className="flex items-center gap-2 text-accent-primary text-sm font-bold tracking-wider uppercase opacity-80 group-hover:opacity-100 transition-opacity">
                  Launch Visualizer &rarr;
                </div>
              </Link>
            );
          })}
        </div>

        {/* Achievements section */}
        <div className="glass-card p-8 border border-warm-300">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-accent-gold" />
            <h3 className="text-xl font-serif font-medium text-text-primary">Your Achievements</h3>
          </div>

          {achievements.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-warm-300 rounded-xl bg-warm-50 text-text-muted text-sm">
              No achievements unlocked yet. Explore CyberVerse modules to earn achievements!
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {achievements.map((ach, idx) => (
                <div key={idx} className="bg-white/80 border border-warm-300 rounded-xl p-4 flex flex-col items-center text-center shadow-sm">
                  <span className="text-3xl mb-2">{ach.icon}</span>
                  <h4 className="text-sm font-semibold text-text-primary line-clamp-1">{ach.title}</h4>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-tight">{ach.description}</p>
                  <span className="text-[9px] text-accent-primary mt-3 font-semibold uppercase">{ach.unlockedAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import CinemaPlayer from '@/components/cyberverse/CinemaPlayer';
import { useXPSystem } from '@/context/XPSystem';
import { Mail, Lock, Database, ArrowLeft, Award, Clock } from 'lucide-react';
import Link from 'next/link';

export default function CinemaGalleryPage() {
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const { achievements } = useXPSystem();

  const stories = [
    {
      id: 'phishing',
      title: 'Phishing Credential Harvest',
      description: 'An interactive exploration detailing clone deployment, target credential spoofing, and administrative token hijacking.',
      icon: Mail,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-accent-primary',
      badge: 'Email Vectors',
      duration: '45 seconds',
      xpReward: 50,
      completed: achievements.some(a => a.id === 'phishing_explorer')
    },
    {
      id: 'ransomware',
      title: 'Ransomware Infection Lifecycle',
      description: 'Trace how local malware bypasses antivirus sandboxes, executes multi-threaded filesystem encryption, and renders blockages.',
      icon: Lock,
      color: 'from-red-500/20 to-orange-500/10 border-red-500/30 text-red-700',
      badge: 'Malware DNA',
      duration: '50 seconds',
      xpReward: 60,
      completed: achievements.some(a => a.id === 'ransomware_explorer')
    },
    {
      id: 'sqli',
      title: 'SQL Database Bypass & Hijack',
      description: 'Observe query parsing errors, parameter exploitation to log into systems, and schema table exfiltration.',
      icon: Database,
      color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-accent-gold',
      badge: 'Databases',
      duration: '45 seconds',
      xpReward: 55,
      completed: achievements.some(a => a.id === 'sqli_explorer')
    }
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans relative overflow-hidden pattern-bg">
      {/* Background overlay decorations */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-accent-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        
        {/* Back Link */}
        <Link 
          href="/cyberverse" 
          className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-accent-primary transition-colors uppercase font-bold tracking-widest mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> CyberVerse Hub
        </Link>

        {/* Header Title */}
        <div className="space-y-3 mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-medium text-text-primary tracking-tight">
            Attack <span className="text-accent-primary">Cinema</span> Player
          </h1>
          <p className="text-text-secondary max-w-xl text-sm md:text-base leading-relaxed">
            Step-by-step cinematic visualizations of cyber-attack pathways. Experience attacker console queries side-by-side with target endpoint screens.
          </p>
        </div>

        {/* Stories list layout */}
        <div className="grid md:grid-cols-3 gap-8">
          {stories.map((story) => {
            const Icon = story.icon;
            return (
              <div 
                key={story.id} 
                className="bg-white/70 border border-warm-300 rounded-2xl p-6 flex flex-col justify-between hover:border-accent-primary/30 transition-all duration-300 hover:shadow-card relative group"
              >
                {/* Completed stamp overlay */}
                {story.completed && (
                  <div className="absolute top-4 right-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                    Completed
                  </div>
                )}

                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${story.color} flex items-center justify-center border`}>
                    <Icon className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-accent-primary font-bold">{story.badge}</span>
                    <h3 className="text-xl font-serif font-medium text-text-primary mt-1 group-hover:text-accent-primary transition-colors">
                      {story.title}
                    </h3>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {story.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-warm-200 flex items-center justify-between text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {story.duration}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-accent-primary">
                    <Award className="w-3.5 h-3.5 text-accent-gold" />
                    +{story.xpReward} XP
                  </span>
                </div>

                <button
                  onClick={() => setActiveStoryId(story.id)}
                  className="w-full mt-4 py-2.5 bg-warm-100 hover:bg-accent-primary hover:text-white border border-warm-300 hover:border-accent-primary/30 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 text-text-primary"
                >
                  Start Demo View
                </button>
              </div>
            );
          })}
        </div>

      </main>

      {/* Render Cinema Player Modal Overlay */}
      {activeStoryId && (
        <CinemaPlayer 
          storyId={activeStoryId} 
          onClose={() => setActiveStoryId(null)} 
        />
      )}
    </div>
  );
}

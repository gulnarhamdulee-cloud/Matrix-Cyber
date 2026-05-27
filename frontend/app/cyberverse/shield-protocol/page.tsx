'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import ShieldProtocol from '@/components/cyberverse/ShieldProtocol';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ShieldProtocolPage() {
  return (
    <div className="min-h-screen bg-black text-text-primary font-sans relative overflow-hidden">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        
        {/* Back Link */}
        <Link 
          href="/cyberverse" 
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-accent-primary transition-colors uppercase font-bold tracking-widest mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> CyberVerse Hub
        </Link>

        {/* Header Title */}
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-serif font-medium text-white tracking-tight">
            Shield <span className="text-red-600">Protocol</span> Workstation
          </h1>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
            Incident Response virtual desktop simulator. Inspect alert files, analyze email headers, SQL logs, process lists, and network traces to defend the OS.
          </p>
        </div>

        {/* Deploy game console */}
        <ShieldProtocol />

      </main>
    </div>
  );
}

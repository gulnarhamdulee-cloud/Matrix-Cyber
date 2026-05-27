'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { SpiderWeb } from '@/components/SpiderWeb';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const controlNavbar = () => {
            if (window.scrollY > lastScrollY && window.scrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            setLastScrollY(window.scrollY);
        };

        window.addEventListener('scroll', controlNavbar);
        return () => window.removeEventListener('scroll', controlNavbar);
    }, [lastScrollY]);

    return (
        <header className={`glass-nav sticky top-0 z-50 transition-transform duration-500 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="max-w-[90rem] mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4 lg:gap-8">
                <Link href="/" className="flex items-center gap-3 group shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center shadow-soft group-hover:shadow-card transition-all">
                        <SpiderWeb className="w-6 h-6 text-accent-primary" />
                    </div>
                    <h1 className="text-xl font-serif font-medium text-text-primary whitespace-nowrap">
                        <span className="text-accent-primary">M</span>atrix
                    </h1>
                </Link>

                <nav className="hidden lg:flex items-center gap-4 xl:gap-6 flex-wrap justify-center">
                    <Link href="/" className="text-text-secondary hover:text-accent-primary transition-colors text-sm font-medium whitespace-nowrap">
                        About
                    </Link>
                    <Link href="/scan" className="text-text-secondary hover:text-accent-primary transition-colors text-sm font-medium whitespace-nowrap">
                        Scan
                    </Link>
                    <Link href="/repo" className="text-text-secondary hover:text-accent-primary transition-colors text-sm font-medium whitespace-nowrap">
                        Repository
                    </Link>
                    <Link href="/labs" className="text-text-secondary hover:text-accent-primary transition-colors text-sm font-medium whitespace-nowrap">
                        Labs
                    </Link>
                    <Link href="/hub" className="text-text-secondary hover:text-accent-primary transition-colors text-sm font-medium whitespace-nowrap">
                        Features
                    </Link>
                    <Link href="/cyberverse" className="text-text-secondary hover:text-accent-primary transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-1.5 group/cv">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                        CyberVerse
                    </Link>
                    <Link href="/forensics" className="text-text-secondary hover:text-accent-primary transition-colors text-sm font-medium whitespace-nowrap">
                        Forensics
                    </Link>
                    <Link href="/marketplace" className="text-text-secondary hover:text-accent-primary transition-colors text-sm font-medium whitespace-nowrap">
                        Market Analysis
                    </Link>
                    <Link href="/docs" className="text-text-secondary hover:text-accent-primary transition-colors text-sm font-medium whitespace-nowrap">
                        Docs
                    </Link>
                    {isAuthenticated && (
                        <Link href="/settings" className="text-text-secondary hover:text-accent-primary transition-colors text-sm font-medium whitespace-nowrap">
                            Settings
                        </Link>
                    )}
                </nav>

                <div className="flex items-center gap-4 shrink-0">
                    {isAuthenticated && (
                        <div className="flex items-center gap-3 animate-fade-in">
                            {/* User Avatar & Name */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-warm-50/50 rounded-xl border border-warm-200/50 hover:border-accent-primary/30 transition-all">
                                <div className="w-7 h-7 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary shadow-sm">
                                    <User className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-text-primary font-semibold text-sm whitespace-nowrap">
                                    {user?.username}
                                </span>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={logout}
                                className="group p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all hover:shadow-sm border border-transparent hover:border-red-100"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

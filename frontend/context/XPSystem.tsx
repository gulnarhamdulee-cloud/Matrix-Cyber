'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface XPSystemContextType {
  xp: number;
  level: number;
  achievements: Achievement[];
  levelTitle: string;
  xpNeededForNextLevel: number;
  addXP: (amount: number) => void;
  removeXP: (amount: number) => void;
  unlockAchievement: (id: string, title: string, description: string, icon: string) => void;
  resetProgress: () => void;
}

const LEVEL_TITLES = [
  'Script Kiddie',
  'Security Novice',
  'Defense Analyst',
  'Intrusion Analyst',
  'Penetration Tester',
  'Security Consultant',
  'Red Teamer',
  'Zero-Day Hunter',
  'Cyber Guardian',
  'Cyber Sovereign'
];

const XP_BASE = 100;
const XP_MULTIPLIER = 1.5;

const XPSystemContext = createContext<XPSystemContextType | undefined>(undefined);

export function XPSystemProvider({ children }: { children: React.ReactNode }) {
  const [xp, setXp] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedXp = localStorage.getItem('matrix_cyberverse_xp');
    const savedLevel = localStorage.getItem('matrix_cyberverse_level');
    const savedAchievements = localStorage.getItem('matrix_cyberverse_achievements');

    if (savedXp) setXp(parseInt(savedXp, 10));
    if (savedLevel) setLevel(parseInt(savedLevel, 10));
    if (savedAchievements) {
      try {
        setAchievements(JSON.parse(savedAchievements));
      } catch (e) {
        console.error('Failed to parse achievements from localStorage', e);
      }
    }
  }, []);

  // Save to localStorage when values change
  const saveToStorage = (newXp: number, newLevel: number, newAchievements: Achievement[]) => {
    localStorage.setItem('matrix_cyberverse_xp', newXp.toString());
    localStorage.setItem('matrix_cyberverse_level', newLevel.toString());
    localStorage.setItem('matrix_cyberverse_achievements', JSON.stringify(newAchievements));
  };

  const getXPNeededForLevel = (lvl: number) => {
    return Math.floor(XP_BASE * Math.pow(XP_MULTIPLIER, lvl - 1));
  };

  const xpNeededForNextLevel = getXPNeededForLevel(level);

  const addXP = (amount: number) => {
    setXp(prevXp => {
      let currentXp = prevXp + amount;
      let currentLevel = level;
      let needed = getXPNeededForLevel(currentLevel);

      while (currentXp >= needed && currentLevel < LEVEL_TITLES.length) {
        currentXp -= needed;
        currentLevel += 1;
        needed = getXPNeededForLevel(currentLevel);
      }

      setLevel(currentLevel);
      saveToStorage(currentXp, currentLevel, achievements);
      return currentXp;
    });
  };

  const removeXP = (amount: number) => {
    setXp(prevXp => {
      let newXp = Math.max(0, prevXp - amount);
      saveToStorage(newXp, level, achievements);
      return newXp;
    });
  };

  const unlockAchievement = (id: string, title: string, description: string, icon: string) => {
    setAchievements(prev => {
      if (prev.some(a => a.id === id)) return prev;
      const newAchievements = [
        ...prev,
        {
          id,
          title,
          description,
          icon,
          unlockedAt: new Date().toLocaleDateString()
        }
      ];
      saveToStorage(xp, level, newAchievements);
      return newAchievements;
    });
  };

  const resetProgress = () => {
    setXp(0);
    setLevel(1);
    setAchievements([]);
    localStorage.removeItem('matrix_cyberverse_xp');
    localStorage.removeItem('matrix_cyberverse_level');
    localStorage.removeItem('matrix_cyberverse_achievements');
  };

  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  return (
    <XPSystemContext.Provider
      value={{
        xp,
        level,
        achievements,
        levelTitle,
        xpNeededForNextLevel,
        addXP,
        removeXP,
        unlockAchievement,
        resetProgress
      }}
    >
      {children}
    </XPSystemContext.Provider>
  );
}

export function useXPSystem() {
  const context = useContext(XPSystemContext);
  if (context === undefined) {
    throw new Error('useXPSystem must be used within an XPSystemProvider');
  }
  return context;
}

import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, migrateFromLocalStorage } from '../db';
import { UserStats, Task, Guild } from '../types';

const INITIAL_USER: UserStats = {
  level: 1, currentExp: 0, nextLevelExp: 100, streak: 0, class: 'Rogue',
  displayName: '', avatar: '',
  monkMode: { isActive: false, durationLabel: '', totalDays: 0, minSuccessRate: 50 },
  unlockedMonkModes: []
};

export function useGameEngine() {
  const [now, setNow] = useState(Date.now());

  // 1. Database Initialization & Migration
  useEffect(() => {
    migrateFromLocalStorage();
  }, []);

  // 2. Live Data Subscriptions
  // We explicitly subscribe to the singleton 'user' record
  const userStatsRaw = useLiveQuery(() => db.userStats.get('user'));
  const userStats = userStatsRaw ? (userStatsRaw as unknown as UserStats) : INITIAL_USER;
  
  const guild = useLiveQuery(() => db.guild.orderBy('id').first()) || null;
  const dbTasks = useLiveQuery(() => db.tasks.toArray()) || [];

  // 3. Visual Timer Logic (Runs every second)
  // Updates local state to force re-render of timers without writing to DB
  useEffect(() => {
    const tick = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // 4. Background Sync Logic (Runs every 30 seconds)
  // Saves progress of running tasks to DB to prevent data loss on crash
  useEffect(() => {
    const sync = setInterval(() => {
      const currentTime = Date.now();
      const runningTasks = dbTasks.filter(t => t.isRunning);
      
      if (runningTasks.length > 0) {
        db.transaction('rw', db.tasks, async () => {
          for (const task of runningTasks) {
            if (task.lastUpdated) {
              const delta = (currentTime - task.lastUpdated) / 1000;
              await db.tasks.update(task.id, {
                timeSpent: (task.timeSpent || 0) + delta,
                lastUpdated: currentTime
              });
            }
          }
        });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(sync);
  }, [dbTasks]);

  // 5. Task State Derivation
  // Combines DB data with live local timer deltas for UI display
  const tasks = dbTasks.map(t => {
    if (t.isRunning && t.lastUpdated) {
      const delta = (now - t.lastUpdated) / 1000;
      return { 
        ...t, 
        timeSpent: (t.timeSpent || 0) + (delta > 0 ? delta : 0) 
      };
    }
    return t;
  });

  // 6. Actions
  const setUserStats = useCallback((valOrFn: React.SetStateAction<UserStats>) => {
    // Handle both functional updates and direct values
    const newStats = typeof valOrFn === 'function' 
      ? valOrFn(userStats) 
      : valOrFn;
    db.userStats.put({ ...newStats, id: 'user' } as any);
  }, [userStats]);

  const setGuild = useCallback((valOrFn: React.SetStateAction<Guild | null>) => {
    // Helper to allow MultiplayerHub to update guild easily
    // In a real app this might need more robust handling
    const val = typeof valOrFn === 'function' && guild ? valOrFn(guild) : valOrFn;
    if (val === null) {
      db.guild.clear();
    } else if (val) { // Check if val is Guild, not function
       db.guild.put(val as Guild);
    }
  }, [guild]);

  const addExp = useCallback((amount: number) => {
    let currentExp = userStats.currentExp + amount;
    let level = userStats.level;
    let nextLevelExp = userStats.nextLevelExp;
    
    while (currentExp >= nextLevelExp) {
      currentExp -= nextLevelExp;
      level++;
      nextLevelExp = Math.floor(nextLevelExp * 1.5);
    }
    
    db.userStats.update('user', { level, currentExp, nextLevelExp });
  }, [userStats]);

  return { 
    userStats, 
    setUserStats, 
    tasks, 
    guild, 
    setGuild, 
    addExp 
  };
}
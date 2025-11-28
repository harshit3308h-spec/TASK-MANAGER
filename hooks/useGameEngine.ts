import { useState, useEffect, useCallback } from 'react';
import { UserStats, Task, Guild } from '../types';

const INITIAL_USER: UserStats = {
  level: 1, currentExp: 0, nextLevelExp: 100, streak: 0, class: 'Rogue',
  displayName: '', avatar: '',
  monkMode: { isActive: false, durationLabel: '', totalDays: 0, minSuccessRate: 50 },
  unlockedMonkModes: []
};

export function useGameEngine() {
  // --- Persistent State Helper ---
  // A concise hook to sync state with localStorage and handle initialization logic
  function usePersistent<T>(key: string, init: T | (() => T)) {
    const [value, setValue] = useState<T>(() => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : (typeof init === 'function' ? (init as () => T)() : init);
      } catch (e) {
        console.error(`Error parsing ${key} from localStorage`, e);
        return typeof init === 'function' ? (init as () => T)() : init;
      }
    });
    useEffect(() => { 
        try {
            localStorage.setItem(key, JSON.stringify(value)); 
        } catch (e) {
            console.error(`Error saving ${key} to localStorage`, e);
        }
    }, [key, value]);
    return [value, setValue] as const;
  }

  const [userStats, setUserStats] = usePersistent<UserStats>('taskquest_user', INITIAL_USER);
  const [guild, setGuild] = usePersistent<Guild | null>('taskquest_guild', null);

  // --- Task Engine (The Core Database) ---
  const [tasks, setTasks] = usePersistent<Task[]>('taskquest_tasks', () => {
    // Smart Recovery: Calculate elapsed time if app was killed while timers were running
    const stored = localStorage.getItem('taskquest_tasks');
    if (!stored) return [];
    try {
      const parsed: Task[] = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      
      const now = Date.now();
      return parsed.map(t => {
        // Validation: Ensure basic fields exist
        if (!t.id || !t.title) return t;

        // Timer Recovery
        if (t.isRunning && t.lastUpdated) {
          const last = typeof t.lastUpdated === 'number' ? t.lastUpdated : now;
          const delta = (now - last) / 1000;
          
          // Sanity check: If delta is negative (clock skew) or massive (>1 year), ignore it
          const safeDelta = (delta > 0 && delta < 31536000) ? delta : 0;
          const currentSpent = (typeof t.timeSpent === 'number' && !isNaN(t.timeSpent)) ? t.timeSpent : 0;

          return { 
            ...t, 
            timeSpent: currentSpent + safeDelta, 
            lastUpdated: now 
          };
        }
        // Ensure timeSpent is always a number
        if (typeof t.timeSpent !== 'number' || isNaN(t.timeSpent)) {
            return { ...t, timeSpent: 0 };
        }
        return t;
      });
    } catch (e) { 
        console.error("Failed to recover tasks", e);
        return []; 
    }
  });

  // --- Game Loop (Runs every second) ---
  useEffect(() => {
    if (Notification.permission === 'default') {
        Notification.requestPermission().catch(console.error);
    }

    const tick = setInterval(() => {
      const now = Date.now();
      setTasks(current => {
        // Optimization: Only update state if absolutely necessary to save resources
        const needsUpdate = current.some(t => t.isRunning || (t.reminder && !t.reminderFired && new Date(t.reminder).getTime() <= now));
        if (!needsUpdate) return current;

        return current.map(t => {
          // 1. Stopwatch Logic
          if (t.isRunning) {
            const last = t.lastUpdated || now;
            const delta = (now - last) / 1000;
            // Prevent negative delta if system clock acts weird
            const safeDelta = delta > 0 ? delta : 0;
            
            return { 
                ...t, 
                timeSpent: (t.timeSpent || 0) + safeDelta, 
                lastUpdated: now 
            };
          }
          // 2. Reminder Logic
          if (t.reminder && !t.reminderFired) {
             const reminderTime = new Date(t.reminder).getTime();
             if (!isNaN(reminderTime) && reminderTime <= now) {
                if (Notification.permission === 'granted') {
                    try {
                        new Notification(`Quest Due: ${t.title}`, { body: t.description || 'Time to complete this quest!' });
                    } catch (e) {
                        console.error("Notification failed", e);
                    }
                }
                return { ...t, reminderFired: true };
             }
          }
          return t;
        });
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [setTasks]);

  // --- Game Mechanics ---
  const addExp = useCallback((amount: number) => {
    setUserStats(prev => {
      let { currentExp, level, nextLevelExp } = { ...prev, currentExp: prev.currentExp + amount };
      // Safety check for NaN
      if (isNaN(currentExp)) currentExp = 0;
      
      while (currentExp >= nextLevelExp) {
        currentExp -= nextLevelExp;
        level++;
        nextLevelExp = Math.floor(nextLevelExp * 1.5);
      }
      return { ...prev, level, currentExp, nextLevelExp };
    });
  }, [setUserStats]);

  return { userStats, setUserStats, tasks, setTasks, guild, setGuild, addExp };
}
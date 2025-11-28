import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, Zap, Star, Trophy, Activity, BarChart3, ChevronDown, Brain, Skull, AlertTriangle, Check, Lock, Unlock, Flame, Target, AlertOctagon, X, Swords, Edit2, Camera, Save } from 'lucide-react';
import { UserStats, Task, Priority } from '../types';

type TimeRange = '7D' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

interface ProfileProps {
  stats: UserStats;
  updateStats: React.Dispatch<React.SetStateAction<UserStats>>;
  tasks: Task[];
}

const MONK_MILESTONES = [
  { l: '7 Days', d: 7, rank: 'Novice' },
  { l: '28 Days', d: 28, rank: 'Apprentice' },
  { l: '3 Months', d: 90, rank: 'Adept' },
  { l: '6 Months', d: 180, rank: 'Expert' },
  { l: '1 Year', d: 365, rank: 'Master' },
  { l: '5 Years', d: 1825, rank: 'Grandmaster' }
];

export default function Profile({ stats, updateStats, tasks }: ProfileProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');
  const [monkModeNow, setMonkModeNow] = useState(Date.now());
  const [confirmBreach, setConfirmBreach] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Failure Dialog State
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const breachTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up breach timeout on unmount
  useEffect(() => {
    return () => {
        if (breachTimeout.current) clearTimeout(breachTimeout.current);
    };
  }, []);

  // Timer for Monk Mode UI updates
  useEffect(() => {
    if (stats.monkMode?.isActive) {
      const interval = setInterval(() => setMonkModeNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [stats.monkMode?.isActive]);

  const progress = stats.nextLevelExp > 0 ? (stats.currentExp / stats.nextLevelExp) * 100 : 0;
  
  // Calculate global stats
  const completedTasks = tasks.filter(t => t.completed).length; // Successful completions
  const abandonedTasks = tasks.filter(t => t.deleted).length; // Abandoned / Failed
  const totalAttempts = completedTasks + abandonedTasks;
  
  const onTimeQuests = tasks.filter(t => t.completed && t.completedOnTime !== false).length;
  
  // Success Rate = On Time / (Completed + Abandoned). Abandoning reduces success rate.
  const successRate = totalAttempts > 0 ? Math.round((onTimeQuests / totalAttempts) * 100) : 100;

  // Calculate Total Lifetime XP based on geometric progression
  const getTotalLifetimeXP = () => {
    let total = 0;
    let required = 100; // Initial requirement for Level 1 -> 2
    for (let l = 1; l < stats.level; l++) {
        total += required;
        required = Math.floor(required * 1.5);
    }
    return total + stats.currentExp;
  };

  // Calculate Attributes based on Task History
  const highCount = tasks.filter(t => t.completed && t.priority === Priority.HIGH).length;
  const medCount = tasks.filter(t => t.completed && t.priority === Priority.MEDIUM).length;
  const lowCount = tasks.filter(t => t.completed && t.priority === Priority.LOW).length;

  const attributes = [
    { 
        label: 'Discipline', 
        val: successRate, 
        color: 'bg-indigo-500', 
        sub: 'On-time Completion Rate'
    },
    { 
        label: 'Strength', 
        val: Math.min(100, highCount * 5), 
        color: 'bg-rose-500',
        sub: `${highCount} High Priority Quests`
    },
    { 
        label: 'Intellect', 
        val: Math.min(100, medCount * 5), 
        color: 'bg-purple-500',
        sub: `${medCount} Medium Priority Quests`
    },
    { 
        label: 'Agility', 
        val: Math.min(100, lowCount * 5), 
        color: 'bg-emerald-500',
        sub: `${lowCount} Low Priority Quests`
    },
  ];

  // Calculate Active Session Stats for Monk Mode
  const getSessionStats = () => {
      if (!stats.monkMode?.startDate) return { total: 0, onTime: 0, rate: 100 };
      
      const startDate = new Date(stats.monkMode.startDate);
      if (isNaN(startDate.getTime())) return { total: 0, onTime: 0, rate: 100 };

      const sessionTasks = tasks.filter(t => {
          if (!t.completedAt) return false;
          const completedDate = new Date(t.completedAt);
          if (isNaN(completedDate.getTime())) return false;
          return (t.completed || t.deleted) && completedDate > startDate;
      });
      
      const total = sessionTasks.length;
      if (total === 0) return { total: 0, onTime: 0, rate: 100 };
      
      const onTime = sessionTasks.filter(t => t.completed && t.completedOnTime !== false).length;
      return {
          total,
          onTime,
          rate: Math.round((onTime / total) * 100)
      };
  };

  const sessionStats = getSessionStats();
  const minRate = stats.monkMode?.minSuccessRate || 50;

  // Calculate 7-day history graph
  const dailyStats = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i)); 
      const dayStart = new Date(date.setHours(0,0,0,0)).getTime();
      const dayEnd = new Date(date.setHours(23,59,59,999)).getTime();
      
      const dayTasks = tasks.filter(t => {
          if (!t.completedAt) return false;
          const tTime = new Date(t.completedAt).getTime();
          if (isNaN(tTime)) return false;
          return tTime >= dayStart && tTime <= dayEnd;
      });

      if (dayTasks.length === 0) return { day: date.toLocaleDateString(undefined, {weekday: 'short'}), rate: 0, count: 0 };
      
      const onTime = dayTasks.filter(t => t.completed && t.completedOnTime !== false).length;
      return {
          day: date.toLocaleDateString(undefined, {weekday: 'short'}),
          rate: Math.round((onTime / dayTasks.length) * 100),
          count: dayTasks.length
      };
  });

  // MONK MODE LOGIC
  useEffect(() => {
    if (stats.monkMode?.isActive && stats.monkMode.startDate && sessionStats.total > 0) {
        if (sessionStats.rate < minRate) {
            updateStats(prev => ({
                ...prev,
                monkMode: { ...prev.monkMode!, isActive: false }
            }));
            setShowFailureDialog(true);
        }
    }
  }, [tasks, stats.monkMode?.isActive, stats.monkMode?.startDate, sessionStats.total, sessionStats.rate, minRate, updateStats]);

  useEffect(() => {
    if (stats.monkMode?.isActive && stats.monkMode.startDate) {
        const start = new Date(stats.monkMode.startDate);
        if (isNaN(start.getTime())) return;

        const now = Date.now();
        const diffTime = Math.abs(now - start.getTime());
        const elapsedDays = diffTime / (1000 * 60 * 60 * 24);

        let updatesNeeded = false;
        let newUnlocked = [...(stats.unlockedMonkModes || [])];

        MONK_MILESTONES.forEach(m => {
            if (elapsedDays >= m.d && !newUnlocked.includes(m.d)) {
                newUnlocked.push(m.d);
                updatesNeeded = true;
            }
        });

        if (elapsedDays >= stats.monkMode.totalDays) {
            updateStats(prev => ({
                ...prev,
                monkMode: { ...prev.monkMode!, isActive: false },
                unlockedMonkModes: newUnlocked
            }));
            alert(`Protocol Complete!\n\nYou have mastered the ${stats.monkMode.durationLabel} protocol.`);
        } else if (updatesNeeded) {
            updateStats(prev => ({ ...prev, unlockedMonkModes: newUnlocked }));
        }
    }
  }, [monkModeNow, stats.monkMode?.isActive, stats.monkMode?.startDate, stats.monkMode?.totalDays, stats.monkMode?.durationLabel, stats.unlockedMonkModes, updateStats]);

  const startMonkMode = (days: number, label: string) => {
    updateStats(prev => ({
      ...prev,
      monkMode: {
        isActive: true,
        startDate: new Date().toISOString(),
        durationLabel: label,
        totalDays: days,
        minSuccessRate: 50,
        endDate: new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString()
      }
    }));
    setShowFailureDialog(false);
  };

  const handleBreachClick = () => {
    if (confirmBreach) {
        updateStats(prev => ({
          ...prev,
          monkMode: { ...prev.monkMode!, isActive: false }
        }));
        setConfirmBreach(false);
    } else {
        setConfirmBreach(true);
        // Clear existing timeout if any
        if (breachTimeout.current) clearTimeout(breachTimeout.current);
        breachTimeout.current = setTimeout(() => {
             setConfirmBreach(false); 
        }, 3000);
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Safety Limit: 500KB to prevent LocalStorage crash
    if (file.size > 500000) {
        alert("Image too large! Please choose an image under 500KB.");
        // Clear input so user can try again with same file if they resized it
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        if (ev.target?.result) {
            updateStats(prev => ({ ...prev, avatar: ev.target!.result as string }));
        }
    };
    reader.onerror = () => {
        alert("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const formatCountdown = () => {
    if (!stats.monkMode?.startDate || !stats.monkMode?.isActive) return null;
    const start = new Date(stats.monkMode.startDate).getTime();
    if (isNaN(start)) return null;

    const now = monkModeNow;
    const elapsed = now - start;
    
    const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
    const hours = Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  };

  const timer = formatCountdown();
  const getRateColorClass = (rate: number) => {
      if (rate < minRate) return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
      if (rate < minRate + 5) return 'text-amber-500';
      return 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]';
  };
  const getRateBgClass = (rate: number) => {
      if (rate < minRate) return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
      if (rate < minRate + 5) return 'bg-amber-500';
      return 'bg-emerald-500 shadow-[0_0_15px_rgba(52,211,153,0.4)]';
  };

  const timeProgress = stats.monkMode?.startDate && stats.monkMode?.endDate 
      ? Math.min(100, Math.max(0, ((monkModeNow - new Date(stats.monkMode.startDate).getTime()) / (new Date(stats.monkMode.endDate).getTime() - new Date(stats.monkMode.startDate).getTime())) * 100))
      : 0;
  
  const safeTimeProgress = isNaN(timeProgress) ? 0 : timeProgress;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 relative">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Failure Notification Modal */}
      {showFailureDialog && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-red-500 rounded-2xl max-w-md w-full shadow-[0_0_100px_rgba(239,68,68,0.4)] overflow-hidden transform scale-100">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500 animate-pulse">
                        <Skull size={40} className="text-red-500" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Protocol Failed</h3>
                    <p className="text-zinc-400 text-sm mb-6">
                        Your discipline accuracy dropped to <span className="text-red-500 font-bold text-lg">{sessionStats.rate}%</span>. 
                        <br/>
                        The minimum requirement was <span className="text-white font-bold">{minRate}%</span>.
                    </p>
                    <div className="bg-red-950/30 border border-red-900 rounded-lg p-4 text-xs text-red-300 mb-8 leading-relaxed">
                        The Monk Mode protocol has been automatically terminated due to lack of consistency. You must restart the challenge to prove your resolve.
                    </div>
                    <button 
                        onClick={() => setShowFailureDialog(false)}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg hover:shadow-red-500/25"
                    >
                        Acknowledge Failure
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <User className="text-indigo-400" /> Character Profile
          </h2>
          <p className="text-zinc-400">View your stats and manage your discipline.</p>
        </div>
        <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isEditing 
                ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
        >
            {isEditing ? <Save size={16} /> : <Edit2 size={16} />}
            {isEditing ? "Save Profile" : "Edit Profile"}
        </button>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Character Card */}
        <div className="bg-zinc-900/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-5">
                        {/* High-Tech Level Avatar */}
                        <div 
                            className={`relative w-24 h-24 shrink-0 ${isEditing ? 'cursor-pointer' : ''}`}
                            onClick={() => isEditing && fileInputRef.current?.click()}
                            title={isEditing ? "Click to change logo" : ""}
                        >
                            {/* Animated Glow */}
                            <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-2xl opacity-20 animate-pulse group-hover:opacity-40 transition-opacity" />
                            
                            {/* Hexagon/Square Shape Container */}
                            <div className="relative w-full h-full bg-zinc-950 rounded-2xl border border-indigo-500/30 flex flex-col items-center justify-center shadow-2xl overflow-hidden group-hover:border-indigo-400/50 transition-colors">
                                {/* User Custom Image or Default */}
                                {stats.avatar ? (
                                    <img src={stats.avatar} alt="Profile" className="absolute inset-0 w-full h-full object-cover z-0" />
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.2),transparent_70%)]" />
                                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay" />
                                        <Swords className="absolute -bottom-3 -right-3 w-14 h-14 text-indigo-500/10 rotate-12" />
                                    </>
                                )}
                                
                                {isEditing && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm">
                                        <Camera className="text-white" size={24} />
                                    </div>
                                )}

                                {!stats.avatar && (
                                    <>
                                        <span className="relative z-10 text-[10px] font-bold text-indigo-400 tracking-widest uppercase mb-0.5">Level</span>
                                        <span className="relative z-10 text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.8)] leading-none">{stats.level}</span>
                                    </>
                                )}
                                
                                {/* Corner Accents */}
                                <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-indigo-500/60 z-20" />
                                <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-indigo-500/60 z-20" />
                                <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-indigo-500/60 z-20" />
                                <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-indigo-500/60 z-20" />
                            </div>
                        </div>

                        <div className="pt-1 flex-1">
                            {isEditing ? (
                                <input 
                                    value={stats.displayName || stats.class}
                                    onChange={(e) => updateStats(prev => ({ ...prev, displayName: e.target.value }))}
                                    className="bg-black/50 border-b border-indigo-500 text-3xl font-black text-white w-full outline-none mb-2 px-1 rounded-t"
                                    placeholder="Enter Name"
                                    autoFocus
                                />
                            ) : (
                                <h3 className="text-3xl font-black text-white tracking-tight leading-none mb-2 truncate max-w-[180px]">
                                    {stats.displayName || stats.class}
                                </h3>
                            )}
                            
                            <div className="flex items-center gap-2">
                                <div className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] text-indigo-300 font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                                    {stats.level < 5 ? "Novice" : stats.level < 10 ? "Adept" : stats.level < 20 ? "Expert" : "Master"}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* XP Shield Indicator */}
                    <div className="flex flex-col items-center mt-1">
                         <div className="relative inline-flex items-center justify-center text-zinc-800 group-hover:text-zinc-700 transition-colors">
                             <Shield size={48} strokeWidth={1.5} className="drop-shadow-lg" />
                             <span className="absolute text-[9px] font-bold text-zinc-500 pt-0.5">XP</span>
                         </div>
                         <div className="text-[10px] font-mono text-zinc-500 mt-1">
                             {stats.currentExp} / {stats.nextLevelExp}
                         </div>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-zinc-400 text-xs font-bold uppercase">Progress</span>
                            <span className="text-white font-mono text-xs">{Math.floor(progress)}%</span>
                        </div>
                        <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                            {/* Animated sheen on bar */}
                            <div className="absolute inset-0 z-10 w-full h-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)] translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                            <div className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.6)] transition-all duration-500 relative" style={{ width: `${progress}%` }}>
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-300/50" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Total XP</div>
                            <div className="text-lg font-bold text-white tabular-nums">{getTotalLifetimeXP().toLocaleString()}</div> 
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Streak</div>
                            <div className="text-lg font-bold text-amber-500 flex items-center gap-1">
                                <Flame size={16} fill="currentColor" /> {stats.streak}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Global Performance */}
        <div className="bg-zinc-900/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
            <div>
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-emerald-400" /> Career Stats
                 </h3>
                 <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-black text-white">{successRate}%</span>
                    <span className="text-zinc-500 font-medium mb-2">Success Rate</span>
                 </div>
                 <p className="text-xs text-zinc-400">
                    Lifetime: {completedTasks} completed. {abandonedTasks > 0 && <span className="text-red-400/80">{abandonedTasks} abandoned.</span>}
                    <span className="text-red-400 block mt-1">
                        {(completedTasks - onTimeQuests)} late penalties applied.
                    </span>
                 </p>
            </div>
            <div className="mt-6">
                <div className="flex justify-between text-xs text-zinc-500 mb-2 uppercase font-bold">
                    <span>Consistency (7 Days)</span>
                    <span>Discipline</span>
                </div>
                <div className="flex gap-1 h-12 items-end">
                    {dailyStats.map((stat, i) => {
                        const isToday = i === 6;
                        let barColor = 'bg-white/5';
                        if (stat.count > 0) {
                            if (stat.rate >= 80) barColor = isToday ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-emerald-500/40 group-hover:bg-emerald-500/60';
                            else if (stat.rate >= 50) barColor = isToday ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-amber-500/40 group-hover:bg-amber-500/60';
                            else barColor = isToday ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-red-500/40 group-hover:bg-red-500/60';
                        }
                        
                        return (
                            <div key={i} className="flex-1 flex flex-col justify-end h-full group relative cursor-help">
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/20 text-white text-[10px] px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl backdrop-blur-md">
                                    <div className="font-bold text-indigo-300 mb-0.5">{stat.day}</div>
                                    {stat.count > 0 ? (
                                        <>
                                            <div className="font-medium">{stat.rate}% Success</div>
                                            <div className="text-zinc-500">{stat.count} Quests</div>
                                        </>
                                    ) : (
                                        <div className="text-zinc-500 italic">No Activity</div>
                                    )}
                                </div>
                                <div className={`w-full rounded-sm transition-all duration-500 ${barColor}`} style={{ height: stat.count > 0 ? `${Math.max(15, stat.rate)}%` : '4px' }} />
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        {/* Attributes (Dynamic) */}
        <div className="bg-zinc-900/40 backdrop-blur-md p-6 rounded-2xl border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Zap size={18} className="text-amber-400" /> Attributes
            </h3>
            <div className="space-y-5">
                {attributes.map(attr => (
                    <div key={attr.label}>
                        <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-zinc-300 font-medium">{attr.label}</span>
                            <span className="text-zinc-400 font-mono">{attr.val}%</span>
                        </div>
                        <div className="h-1.5 bg-black/50 rounded-full overflow-hidden mb-1">
                            <div className={`h-full ${attr.color} rounded-full transition-all duration-1000`} style={{ width: `${attr.val}%` }} />
                        </div>
                        <div className="text-[10px] text-zinc-500 text-right">{attr.sub}</div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Monk Mode Section */}
      <section>
         <div className={`relative rounded-3xl overflow-hidden border transition-all duration-500 ${
             stats.monkMode?.isActive 
                ? 'bg-zinc-950 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]' 
                : 'bg-zinc-900/40 border-white/10'
         }`}>
            {/* Background Effects */}
            {stats.monkMode?.isActive && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-50%] left-[-20%] w-[600px] h-[600px] bg-cyan-900/20 blur-[100px] rounded-full mix-blend-screen" />
                    <div className="absolute bottom-[-50%] right-[-20%] w-[600px] h-[600px] bg-indigo-900/20 blur-[100px] rounded-full mix-blend-screen" />
                </div>
            )}
            
            <div className="relative p-8 md:p-10 z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <Brain className={`transition-colors ${stats.monkMode?.isActive ? 'text-cyan-400' : 'text-zinc-600'}`} size={32} />
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Monk Mode Protocol</h2>
                            <p className="text-zinc-400 text-sm">Strict discipline. High stakes. Accelerated growth.</p>
                        </div>
                    </div>
                    
                    {stats.monkMode?.isActive && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/50 border border-cyan-500/30 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_5px_cyan]" />
                            <span className="text-xs font-bold text-cyan-400 tracking-wider">PROTOCOL ACTIVE</span>
                        </div>
                    )}
                </div>

                {stats.monkMode?.isActive ? (
                    // ACTIVE STATE
                    <div className="flex flex-col items-center justify-center py-4 relative">
                        {/* Big Brain Watermark */}
                        <Brain className="absolute right-0 top-1/2 -translate-y-1/2 text-cyan-900/20 pointer-events-none" size={300} strokeWidth={1} />
                        
                        <div className="text-center relative z-10 w-full max-w-md mx-auto">
                             {/* Progress Circle (Simplified for new layout) */}
                             <div className="w-24 h-24 rounded-full border-4 border-zinc-800 flex items-center justify-center mb-6 mx-auto relative group">
                                <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-[spin_3s_linear_infinite]" />
                                <span className="text-xl font-bold text-white">
                                    {Math.floor(safeTimeProgress)}%
                                </span>
                             </div>

                             <div className="text-cyan-400 text-sm font-bold tracking-[0.2em] uppercase mb-1">
                                {stats.monkMode.durationLabel} PROTOCOL ACTIVE
                             </div>
                             
                             <div className="font-mono text-5xl md:text-6xl font-bold text-white tracking-tighter mb-8 tabular-nums text-shadow-glow">
                                {timer?.days}d {timer?.hours}h {timer?.minutes}m
                             </div>
                             
                             {/* VISUAL ACCURACY GAUGE */}
                             <div className="w-full mb-8 bg-black/40 border border-white/5 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden text-left shadow-lg">
                                {/* Pulse warning if low */}
                                {sessionStats.rate < minRate + 5 && (
                                    <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                                )}

                                <div className="relative z-10">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
                                                <Target size={14} className={getRateColorClass(sessionStats.rate)} /> 
                                                Discipline Accuracy
                                            </span>
                                            <span className="text-[10px] text-zinc-600">
                                                Maintain &gt;{minRate}% success rate to survive
                                            </span>
                                        </div>
                                        <span className={`text-2xl font-black ${getRateColorClass(sessionStats.rate)}`}>
                                            {sessionStats.rate}%
                                        </span>
                                    </div>
                                    
                                    {/* Bar Container */}
                                    <div className="h-3 bg-zinc-800/80 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
                                        {/* Threshold Marker Line */}
                                        <div 
                                            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 flex flex-col items-center" 
                                            style={{ left: `${minRate}%` }}
                                        />
                                        
                                        {/* Fill */}
                                        <div 
                                            className={`h-full transition-all duration-700 ease-out ${getRateBgClass(sessionStats.rate)} relative`} 
                                            style={{ width: `${sessionStats.rate}%` }} 
                                        >
                                            {/* Shine effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full opacity-30" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between mt-1.5 text-[10px] font-mono font-medium text-zinc-500">
                                        <span>0%</span>
                                        <span className="text-red-400 absolute transform -translate-x-1/2" style={{ left: `${minRate}%` }}>
                                            <span className="block -mt-4 text-red-500/80 mb-1">▼</span>
                                            REQ
                                        </span>
                                        <span>100%</span>
                                    </div>
                                </div>
                             </div>

                             {/* TIMELINE PROGRESS */}
                             <div className="w-full mb-8 space-y-1.5 text-left">
                                <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                                     <span>Timeline Progress</span>
                                </div>
                                
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                                    <div 
                                        className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all duration-1000"
                                        style={{width: `${safeTimeProgress}%`}} 
                                    />
                                </div>
                                
                                <div className="flex justify-between text-[10px] text-zinc-600 font-mono uppercase">
                                    <span>Start: {stats.monkMode.startDate ? new Date(stats.monkMode.startDate).toLocaleDateString() : 'N/A'}</span>
                                    <span>Goal: {stats.monkMode.endDate ? new Date(stats.monkMode.endDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                             </div>

                             <button 
                                onClick={handleBreachClick}
                                className={`group relative px-6 py-2 border rounded-lg transition-all text-xs font-bold uppercase tracking-widest z-50 ${
                                    confirmBreach 
                                        ? 'bg-red-600 text-white border-red-500 hover:bg-red-700' 
                                        : 'bg-red-950/30 text-red-400 border-red-900/50 hover:bg-red-900/30 hover:text-red-300 hover:border-red-500/50'
                                }`}
                             >
                                <span className="flex items-center gap-2">
                                    <Skull size={14} className={confirmBreach ? "animate-pulse" : ""} /> 
                                    {confirmBreach ? "Confirm Give Up?" : "Breach Protocol (Give Up)"}
                                </span>
                             </button>
                        </div>

                        {/* Milestones Visualizer */}
                        <div className="w-full mt-12">
                            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 text-center">Protocol Milestones</div>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                                {MONK_MILESTONES.map((milestone) => {
                                    const isUnlocked = (stats.unlockedMonkModes || []).includes(milestone.d);
                                    const isTarget = stats.monkMode?.totalDays === milestone.d;
                                    const isUnreachable = stats.monkMode?.totalDays ? milestone.d > stats.monkMode.totalDays : false;
                                    
                                    return (
                                        <div key={milestone.d} className={`
                                            relative p-3 rounded-lg border text-center flex flex-col items-center justify-center gap-1 overflow-hidden transition-all
                                            ${isUnlocked 
                                                ? 'bg-amber-900/10 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                                                : isTarget
                                                    ? 'bg-cyan-900/10 border-cyan-500 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                                    : 'bg-black/20 border-white/5 text-zinc-600'
                                            }
                                            ${isUnreachable ? 'opacity-30 grayscale' : ''}
                                        `}>
                                            {isUnlocked ? (
                                                <>
                                                    <Trophy size={16} className="text-amber-400 mb-1" />
                                                    <div className="text-[9px] font-bold text-amber-500 absolute top-1 right-1">✓</div>
                                                </>
                                            ) : isTarget ? (
                                                <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-1" />
                                            ) : (
                                                <Lock size={16} className="mb-1 opacity-50" />
                                            )}
                                            
                                            <div className="text-xs font-bold">{milestone.l}</div>
                                            <div className="text-[9px] opacity-60 uppercase">{milestone.rank}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    // INACTIVE / SELECTION STATE
                    <div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
                            {MONK_MILESTONES.map((m) => {
                                const isUnlocked = (stats.unlockedMonkModes || []).includes(m.d);
                                return (
                                    <button
                                        key={m.d}
                                        onClick={() => startMonkMode(m.d, m.l)}
                                        className={`group relative p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-1
                                            ${isUnlocked 
                                                ? 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-900/30' 
                                                : 'bg-zinc-900/50 border-white/10 hover:border-indigo-500/50 hover:bg-zinc-800'
                                            }
                                        `}
                                    >
                                        {isUnlocked && <div className="absolute top-2 right-2 text-amber-500"><Check size={12} strokeWidth={4} /></div>}
                                        
                                        <div className={`p-3 rounded-full ${isUnlocked ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-zinc-500 group-hover:text-indigo-400 group-hover:bg-indigo-500/10'} transition-colors`}>
                                            {isUnlocked ? <Trophy size={20} /> : <Lock size={20} />}
                                        </div>
                                        <div className="text-center">
                                            <div className={`font-bold text-sm ${isUnlocked ? 'text-amber-200' : 'text-zinc-300'}`}>{m.l}</div>
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{m.rank}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-sm text-zinc-400 flex items-start gap-3">
                            <AlertTriangle className="shrink-0 text-amber-500" size={18} />
                            <p>
                                <strong className="text-amber-500">Warning:</strong> Monk Mode requires maintaining an <span className="text-white">50% success rate</span> on all quests. 
                                Completing tasks late or missing deadlines will reduce your rate. If you drop below 50%, the protocol fails immediately.
                            </p>
                        </div>
                    </div>
                )}
            </div>
         </div>
      </section>
    </div>
  );
}
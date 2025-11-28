import React, { useState, useEffect, useRef } from 'react';
import { Users, Trophy, Shield, Copy, Plus, Crown, UserPlus, Trash2, CheckCircle2 } from 'lucide-react';
import { Guild, UserStats, GuildMember } from '../types';

interface MultiplayerHubProps {
  userStats: UserStats;
  guild: Guild | null;
  setGuild: React.Dispatch<React.SetStateAction<Guild | null>>;
}

export default function MultiplayerHub({ userStats, guild, setGuild }: MultiplayerHubProps) {
  const [newGuildName, setNewGuildName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberLevel, setNewMemberLevel] = useState('1');
  const [newMemberClass, setNewMemberClass] = useState<'Warrior' | 'Mage' | 'Rogue'>('Warrior');
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
        if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  // Auto-update user's stats in the guild list
  useEffect(() => {
    if (guild) {
      const updatedMembers = guild.members.map(m => 
        m.isUser ? { ...m, level: userStats.level, class: userStats.class } : m
      );
      
      // Only update if changes detected to avoid loop
      const currentUserMember = guild.members.find(m => m.isUser);
      if (currentUserMember && (currentUserMember.level !== userStats.level || currentUserMember.class !== userStats.class)) {
         setGuild({ ...guild, members: updatedMembers });
      }
    }
  }, [userStats, guild, setGuild]);

  const createGuild = () => {
    if (!newGuildName.trim()) return;
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newGuild: Guild = {
      id: Date.now().toString(),
      name: newGuildName,
      code: code,
      members: [
        {
          id: 'user',
          name: 'You',
          level: userStats.level,
          class: userStats.class,
          isUser: true
        }
      ]
    };
    setGuild(newGuild);
  };

  const joinGuild = () => {
    // In a real app with backend, this would fetch guild by code.
    // For local party mode, we simulate creating a new view or alerting limitation.
    if (!joinCode.trim()) return;
    alert("In Local Party Mode, please ask your Party Leader to add you to their device manually!");
  };

  const addMember = () => {
    if (!guild || !newMemberName.trim()) return;
    
    const newMember: GuildMember = {
        id: Date.now().toString(),
        name: newMemberName,
        level: parseInt(newMemberLevel) || 1,
        class: newMemberClass,
        isUser: false
    };

    setGuild({
        ...guild,
        members: [...guild.members, newMember]
    });
    
    setNewMemberName('');
    setNewMemberLevel('1');
    setShowAddMember(false);
  };

  const removeMember = (id: string) => {
    if (!guild) return;
    setGuild({
        ...guild,
        members: guild.members.filter(m => m.id !== id)
    });
  };

  const copyInvite = async () => {
    if (!guild) return;
    const text = `Join my TaskQuest Guild "${guild.name}"! Code: ${guild.code}`;
    
    try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (copyTimeout.current) clearTimeout(copyTimeout.current);
        copyTimeout.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
        console.error("Failed to copy", err);
        // Fallback or user alert could go here
    }
  };

  if (!guild) {
    return (
      <div className="p-6 max-w-4xl mx-auto h-full flex flex-col justify-center items-center">
        <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                <Users size={40} className="text-indigo-500" /> Guild Hall
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto">
                Form a party with friends, track each other's progress, and compete for the top spot on the leaderboard.
            </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 w-full max-w-2xl">
            {/* Create Guild */}
            <div className="bg-zinc-900/40 backdrop-blur-md p-8 rounded-2xl border border-indigo-500/20 hover:border-indigo-500/50 transition-all shadow-xl group">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Crown className="text-indigo-400" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Create Guild</h3>
                <p className="text-zinc-500 text-sm mb-6">Start a new party and invite your friends to join your leaderboard.</p>
                
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Guild Name (e.g. CyberSamurais)"
                        value={newGuildName}
                        onChange={(e) => setNewGuildName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
                    />
                    <button 
                        onClick={createGuild}
                        disabled={!newGuildName.trim()}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    >
                        Form Party
                    </button>
                </div>
            </div>

            {/* Join Guild (Mock) */}
            <div className="bg-zinc-900/40 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:border-white/20 transition-all shadow-xl">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6">
                    <UserPlus className="text-emerald-400" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Join Guild</h3>
                <p className="text-zinc-500 text-sm mb-6">Have an invite code? Enter it here to join an existing squad.</p>
                
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Enter Guild Code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                    />
                    <button 
                        onClick={joinGuild}
                        className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-all"
                    >
                        Find Guild
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  const sortedMembers = [...guild.members].sort((a, b) => b.level - a.level);
  const userRank = sortedMembers.findIndex(m => m.isUser) + 1;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Guild Header */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900/20 to-transparent p-6 rounded-2xl border border-white/5">
        <div>
            <div className="flex items-center gap-3 mb-1">
                <Crown className="text-amber-400" size={24} />
                <h2 className="text-3xl font-bold text-white">{guild.name}</h2>
            </div>
            <p className="text-zinc-400 text-sm">Guild Code: <span className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{guild.code}</span></p>
        </div>
        
        <div className="flex gap-3">
             <button 
                onClick={() => setGuild(null)}
                className="px-4 py-2 bg-red-950/30 text-red-400 hover:bg-red-900/50 rounded-lg text-sm font-bold transition-colors border border-red-900/50"
             >
                Leave Guild
             </button>
             <button 
                onClick={copyInvite}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
             >
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                {copied ? "Copied!" : "Copy Invite"}
             </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-zinc-900/30 backdrop-blur-md p-6 rounded-xl border border-white/10 text-center hover:bg-zinc-900/50 transition-colors group">
            <Trophy className="mx-auto text-amber-400 mb-2 group-hover:scale-110 transition-transform" size={32} />
            <div className="text-2xl font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">Rank #{userRank}</div>
            <div className="text-sm text-zinc-500">Your Standing</div>
         </div>
         <div className="bg-zinc-900/30 backdrop-blur-md p-6 rounded-xl border border-white/10 text-center hover:bg-zinc-900/50 transition-colors group">
            <Users className="mx-auto text-indigo-400 mb-2 group-hover:scale-110 transition-transform" size={32} />
            <div className="text-2xl font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{guild.members.length}</div>
            <div className="text-sm text-zinc-500">Active Members</div>
         </div>
         <div className="bg-zinc-900/30 backdrop-blur-md p-6 rounded-xl border border-white/10 text-center hover:bg-zinc-900/50 transition-colors group">
            <Shield className="mx-auto text-emerald-400 mb-2 group-hover:scale-110 transition-transform" size={32} />
            <div className="text-2xl font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">Open</div>
            <div className="text-sm text-zinc-500">Guild Status</div>
         </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-zinc-900/20 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
            <h3 className="font-bold text-white flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" /> Leaderboard
            </h3>
            <button 
                onClick={() => setShowAddMember(true)}
                className="text-xs bg-indigo-500/10 text-indigo-400 hover:text-white hover:bg-indigo-500 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
            >
                <Plus size={14} /> Recruit Friend (Manual)
            </button>
        </div>

        {/* Add Member Form */}
        {showAddMember && (
            <div className="p-4 bg-indigo-900/10 border-b border-indigo-500/20 animate-in slide-in-from-top-2">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs text-zinc-400 mb-1 block">Friend's Name</label>
                        <input 
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            placeholder="Player Name"
                            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <div className="w-24">
                        <label className="text-xs text-zinc-400 mb-1 block">Level</label>
                        <input 
                            type="number"
                            value={newMemberLevel}
                            onChange={(e) => setNewMemberLevel(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <div className="w-32">
                        <label className="text-xs text-zinc-400 mb-1 block">Class</label>
                        <select 
                            value={newMemberClass}
                            onChange={(e) => setNewMemberClass(e.target.value as 'Warrior' | 'Mage' | 'Rogue')}
                            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                        >
                            <option value="Warrior">Warrior</option>
                            <option value="Mage">Mage</option>
                            <option value="Rogue">Rogue</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowAddMember(false)}
                            className="px-3 py-2 text-zinc-400 hover:text-white text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={addMember}
                            disabled={!newMemberName.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-bold shadow-lg"
                        >
                            Add
                        </button>
                    </div>
                </div>
                <div className="mt-2 text-[10px] text-indigo-300 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Since this is a local party, add your friends manually to track them!
                </div>
            </div>
        )}

        <table className="w-full text-left">
            <thead className="bg-black/40 text-zinc-400 uppercase text-xs font-bold border-b border-white/10">
                <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Adventurer</th>
                    <th className="p-4">Class</th>
                    <th className="p-4 text-right">Level</th>
                    <th className="p-4 w-10"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {sortedMembers.map((member, idx) => (
                    <tr key={member.id} className={member.isUser ? 'bg-indigo-500/10' : 'hover:bg-white/5 transition-colors group'}>
                        <td className="p-4 text-zinc-500">
                            {idx === 0 ? <Crown size={18} className="text-amber-400" /> : `#${idx + 1}`}
                        </td>
                        <td className="p-4 font-medium text-white">
                            {member.name} 
                            {member.isUser && <span className="ml-2 text-xs bg-indigo-500/80 text-white px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(99,102,241,0.4)]">YOU</span>}
                        </td>
                        <td className="p-4 text-zinc-400">{member.class}</td>
                        <td className="p-4 text-right font-bold text-amber-500">{member.level}</td>
                        <td className="p-4 text-right">
                            {!member.isUser && (
                                <button 
                                    onClick={() => removeMember(member.id)}
                                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    title="Remove Member"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
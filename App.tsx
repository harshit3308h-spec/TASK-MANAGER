import React, { useState } from 'react';
import { LayoutDashboard, Swords, Users, User, History } from 'lucide-react';
import { useGameEngine } from './hooks/useGameEngine';
import TaskDashboard from './components/TaskDashboard';
import MultiplayerHub from './components/MultiplayerHub';
import Profile from './components/Profile';
import CompletedTasks from './components/CompletedTasks';

// Defined outside to prevent re-creation on every render
const NavItem = ({ to, icon: Icon, label, active, onClick }: { to: string; icon: React.ElementType; label: string; active: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center space-x-2 p-3 rounded-lg transition-all w-full text-left ${
      active 
        ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/10' 
        : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'
    }`}
  >
    <Icon size={20} />
    <span className="hidden md:block">{label}</span>
  </button>
);

export default function App() {
  const [currentView, setCurrentView] = useState('/');
  // The engine handles all persistence, background timers, and game logic
  const { userStats, setUserStats, tasks, setTasks, guild, setGuild, addExp } = useGameEngine();

  const renderContent = () => {
    switch (currentView) {
      case '/': return <TaskDashboard onAddExp={addExp} tasks={tasks} setTasks={setTasks} />;
      case '/history': return <CompletedTasks tasks={tasks} />;
      case '/multiplayer': return <MultiplayerHub userStats={userStats} guild={guild} setGuild={setGuild} />;
      case '/profile': return <Profile stats={userStats} updateStats={setUserStats} tasks={tasks} />;
      default: return <TaskDashboard onAddExp={addExp} tasks={tasks} setTasks={setTasks} />;
    }
  };

  return (
    <div className="flex h-screen bg-black text-zinc-100 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1a1a1a,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-900/10 blur-[120px] pointer-events-none" />

      <nav className="w-20 md:w-64 border-r border-white/5 flex flex-col p-2 md:p-4 bg-black/50 backdrop-blur-xl z-50 relative transition-all duration-300">
        <div className="flex items-center justify-center md:justify-start space-x-2 mb-8 px-0 md:px-2">
          <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg border border-white/10">
            <Swords className="text-indigo-400" size={24} />
          </div>
          <h1 className="text-xl font-bold hidden md:block bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">TaskQuest</h1>
        </div>

        <div className="space-y-2 flex-1">
          <NavItem to="/" icon={LayoutDashboard} label="Quest Board" active={currentView === '/'} onClick={() => setCurrentView('/')} />
          <NavItem to="/history" icon={History} label="Quest History" active={currentView === '/history'} onClick={() => setCurrentView('/history')} />
          <NavItem to="/multiplayer" icon={Users} label="Guild Hall" active={currentView === '/multiplayer'} onClick={() => setCurrentView('/multiplayer')} />
          <NavItem to="/profile" icon={User} label="Profile" active={currentView === '/profile'} onClick={() => setCurrentView('/profile')} />
        </div>

        <div className="mt-auto p-2 md:p-4 bg-zinc-900/40 backdrop-blur-md rounded-xl border border-white/10">
          <div className="hidden md:block">
            <div className="flex justify-between items-baseline mb-1 text-zinc-300">
              <span className="font-bold text-sm">Lvl {userStats.level}</span>
              <span className="text-xs text-zinc-400">{userStats.currentExp}/{userStats.nextLevelExp}</span>
            </div>
            <div className="text-xs text-zinc-500 font-medium mb-2">{userStats.class}XP</div>
            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500" style={{ width: `${(userStats.currentExp / userStats.nextLevelExp) * 100}%` }} />
            </div>
          </div>
          <div className="md:hidden flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-zinc-400">Lvl {userStats.level}</span>
            <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${(userStats.currentExp / userStats.nextLevelExp) * 100}%` }} />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto relative z-10">
         {renderContent()}
      </main>
    </div>
  );
}
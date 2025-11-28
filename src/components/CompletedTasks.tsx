import React from 'react';
import { History, Calendar, Clock, Trophy, AlertTriangle } from 'lucide-react';
import { Task } from '../types';

export default function CompletedTasks({ tasks }: { tasks: Task[] }) {
  // Show completed OR deleted (abandoned) tasks
  const historyTasks = tasks.filter(t => t.completed || t.deleted).sort((a, b) => {
    // Sort by completion date descending with safety checks
    const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    
    // Handle invalid dates (NaN) by treating them as 0 (oldest)
    const validA = isNaN(dateA) ? 0 : dateA;
    const validB = isNaN(dateB) ? 0 : dateB;

    return validB - validA;
  });

  const formatTime = (seconds?: number) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
          <History className="text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" /> Quest History
        </h2>
        <p className="text-zinc-400">Review your past conquests and performance.</p>
      </header>

      {historyTasks.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/20 backdrop-blur-sm rounded-xl border border-dashed border-white/10">
           <History className="mx-auto text-zinc-600 mb-4" size={48} />
           <p className="text-zinc-400">No quests in history yet.</p>
           <p className="text-sm text-zinc-500 mt-2">Go back to the Quest Board to start your journey.</p>
        </div>
      ) : (
        <div className="bg-zinc-900/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-black/40 border-b border-white/10">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Quest</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Clock size={14} /> Time Taken
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                <span className="flex items-center gap-2"><Trophy size={14} /> EXP Earned</span>
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                <span className="flex items-center gap-2"><Calendar size={14} /> Finished At</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {historyTasks.map((task) => (
                            <tr key={task.id} className={`hover:bg-white/5 transition-colors group ${task.deleted ? 'bg-red-950/10' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className={`font-medium transition-colors ${task.deleted ? 'text-zinc-500 line-through' : 'text-zinc-200 group-hover:text-white'}`}>{task.title}</div>
                                    <div className="text-xs text-zinc-500 truncate max-w-xs">{task.description}</div>
                                    {task.deleted ? (
                                        <div className="text-xs text-red-500/80 font-bold mt-1 flex items-center gap-1">
                                            <AlertTriangle size={10} /> Abandoned
                                        </div>
                                    ) : task.completedOnTime === false && (
                                        <div className="text-xs text-red-400 font-bold mt-1 flex items-center gap-1">
                                            <AlertTriangle size={10} /> Completed Late
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-zinc-300 font-mono">
                                    {formatTime(task.timeSpent)}
                                </td>
                                <td className="px-6 py-4">
                                    {task.deleted ? (
                                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-900/20 text-red-500 border-red-900/30">
                                            Void
                                        </span>
                                    ) : (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            task.completedOnTime === false 
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                : 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_5px_rgba(245,158,11,0.2)]'
                                        }`}>
                                            +{task.exp} XP
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-zinc-400">
                                    {formatDate(task.completedAt)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Play, Pause, Plus, Trash2, ArrowUpDown, Edit2, Save, X, Sparkles, Bell, Timer, Mic, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Task, TaskType, Priority } from '../types';

interface TaskDashboardProps {
  onAddExp: (amount: number) => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

type SortOption = 'newest' | 'priority' | 'reminder' | 'exp' | 'az';

export default function TaskDashboard({ onAddExp, tasks, setTasks }: TaskDashboardProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [flash, setFlash] = useState(false);
  
  // Delete Confirmation State
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Safety ref to prevent state updates on unmounted component
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string, description: string, priority: Priority, reminder: string, deadline: string } | null>(null);

  // Completion Animation State - Array to support multiple concurrent animations
  const [finishingTaskIds, setFinishingTaskIds] = useState<string[]>([]);

  const handleCompleteTask = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Prevent double-clicks or interactions with already finishing tasks
    if (finishingTaskIds.includes(id)) return;

    const task = tasks.find(t => t.id === id);
    if (!task || task.completed) return;

    // Check Deadline for Penalty
    let earnedExp = task.exp;
    let isOnTime = true;
    
    if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        const now = new Date();
        if (!isNaN(deadlineDate.getTime()) && now > deadlineDate) {
            earnedExp = Math.floor(task.exp / 2);
            isOnTime = false;
        }
    }

    // 0. Effects (Flash only)
    if (isMounted.current) {
        setFlash(true);
        setTimeout(() => {
            if (isMounted.current) setFlash(false);
        }, 300);
    }

    // 1. Trigger Animation
    setFinishingTaskIds(prev => [...prev, id]);

    // 2. Update State after animation delay to move to History
    setTimeout(() => {
        // Award Exp safely
        onAddExp(earnedExp);

        setTasks(prev => prev.map(t => 
          t.id === id ? { 
            ...t, 
            completed: true, 
            completedAt: new Date().toISOString(), 
            isRunning: false, // Stop the timer
            lastUpdated: undefined, // Clear timer tracking
            completedOnTime: isOnTime,
            exp: earnedExp // Update stored exp to reflect actual earned amount
          } : t
        ));
        
        // Clean up animation state only if still mounted
        if (isMounted.current) {
            setFinishingTaskIds(prev => prev.filter(taskId => taskId !== id));
        }
    }, 1200);
  };

  const initiateDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTaskToDelete(id);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
        // Soft delete: Mark as deleted but keep in DB for history/stats
        setTasks(prev => prev.map(t => 
            t.id === taskToDelete 
                ? { 
                    ...t, 
                    deleted: true, 
                    completedAt: new Date().toISOString(),
                    isRunning: false,
                    lastUpdated: undefined 
                  } 
                : t
        ));
        setTaskToDelete(null);
    }
  };

  const addTask = (title: string) => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: title || 'New Quest',
      description: 'Added manually',
      completed: false,
      exp: newTaskPriority === Priority.HIGH ? 100 : newTaskPriority === Priority.MEDIUM ? 50 : 25,
      type: TaskType.QUEST,
      priority: newTaskPriority,
      timeSpent: 0,
      isRunning: false,
      deadline: newTaskDeadline || undefined,
      reminder: newTaskDeadline || undefined // Sync reminder with deadline for notifications
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setNewTaskDeadline('');
  };

  const toggleTimer = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTasks(prev => prev.map(t => {
        if (t.id === id) {
            const isStarting = !t.isRunning;
            return { 
                ...t, 
                isRunning: isStarting,
                // Initialize lastUpdated if starting, clear if stopping
                lastUpdated: isStarting ? Date.now() : undefined
            };
        }
        return t;
    }));
  };

  // Edit Functions
  const startEditing = (task: Task) => {
    if (task.completed) return;
    setEditingTaskId(task.id);
    setEditForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        reminder: task.reminder || '',
        deadline: task.deadline || ''
    });
  };

  const cancelEdit = () => {
      setEditingTaskId(null);
      setEditForm(null);
  };

  const saveEdit = () => {
      if (!editingTaskId || !editForm) return;
      
      // Validation: Prevent saving empty titles
      if (!editForm.title.trim()) {
          alert("Quest title cannot be empty!");
          return;
      }
      
      setTasks(prev => prev.map(t => 
          t.id === editingTaskId 
            ? { 
                ...t, 
                title: editForm.title, 
                description: editForm.description, 
                priority: editForm.priority,
                exp: editForm.priority === Priority.HIGH ? 100 : editForm.priority === Priority.MEDIUM ? 50 : 25,
                reminder: editForm.reminder,
                deadline: editForm.deadline,
                reminderFired: t.reminder !== editForm.reminder ? false : t.reminderFired
              } 
            : t
      ));
      setEditingTaskId(null);
      setEditForm(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        saveEdit();
    } else if (e.key === 'Escape') {
        cancelEdit();
    }
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
        case Priority.HIGH: return 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]';
        case Priority.MEDIUM: return 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]';
        case Priority.LOW: return 'text-zinc-400 bg-white/5 border-white/10';
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60); // Math.floor handles float seconds from precision timer
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter Active Tasks: Show only uncompleted AND non-deleted tasks OR tasks that are currently animating (finishing)
  const activeTasks = tasks.filter(t => (!t.completed && !t.deleted) || finishingTaskIds.includes(t.id));

  // Sorting Logic
  const sortedTasks = [...activeTasks].sort((a, b) => {
    switch (sortBy) {
        case 'priority':
            const pMap = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
            if (pMap[b.priority] !== pMap[a.priority]) {
                 return pMap[b.priority] - pMap[a.priority];
            }
            break;
        case 'reminder':
            // Robust date parsing for safety
            const dateA = a.deadline || a.reminder ? new Date(a.deadline || a.reminder || '').getTime() : 0;
            const dateB = b.deadline || b.reminder ? new Date(b.deadline || b.reminder || '').getTime() : 0;
            const validA = isNaN(dateA) ? 0 : dateA;
            const validB = isNaN(dateB) ? 0 : dateB;
            
            if (validA && validB) return validA - validB;
            if (validA) return -1;
            if (validB) return 1;
            break;
        case 'exp':
            // Highest XP first
            if (b.exp !== a.exp) return b.exp - a.exp;
            break;
        case 'az':
            // Alphabetical
            return a.title.localeCompare(b.title);
        case 'newest':
        default:
            return Number(b.id) - Number(a.id);
    }
    // Secondary fallback to ID for stable sort
    return Number(b.id) - Number(a.id);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto relative">
      {/* Screen Flash Overlay */}
      <div 
        className={`fixed inset-0 bg-white/10 pointer-events-none transition-opacity duration-300 ease-out z-[100] ${
            flash ? 'opacity-100' : 'opacity-0'
        }`} 
      />

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 p-6 rounded-xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4 text-red-400">
                    <div className="p-2 bg-red-500/10 rounded-full">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Abandon Quest?</h3>
                </div>
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
                    Are you sure you want to abandon this task? It will be marked as failed in your history and will negatively impact your stats.
                </p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setTaskToDelete(null)}
                        className="px-4 py-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.6)]"
                    >
                        Abandon Quest
                    </button>
                </div>
            </div>
        </div>
      )}

      <header className="mb-8">
        <h2 className="text-3xl font-bold mb-2 text-white tracking-tight drop-shadow-md">Quest Board</h2>
        <p className="text-zinc-400">Complete tasks to earn EXP and level up.</p>
      </header>

      {/* Input Area */}
      <div className="bg-zinc-900/40 backdrop-blur-md p-5 rounded-xl border border-white/10 mb-8 shadow-xl">
        <div className="flex flex-col gap-4">
          <input 
            type="text" 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask(newTaskTitle)}
            placeholder="Add a new quest..."
            className="w-full bg-transparent border-none text-lg text-white placeholder-zinc-500 focus:ring-0 outline-none"
          />
          
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                        className="bg-black/40 text-zinc-300 rounded-lg pl-3 pr-8 py-2 border border-white/10 hover:border-white/20 focus:ring-1 focus:ring-indigo-500/50 text-xs font-medium outline-none cursor-pointer transition-colors appearance-none"
                    >
                        <option value={Priority.LOW}>Low Priority</option>
                        <option value={Priority.MEDIUM}>Medium</option>
                        <option value={Priority.HIGH}>High Priority</option>
                    </select>
                    <ArrowUpDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>

                <div className="relative group">
                    <input 
                        type="datetime-local"
                        value={newTaskDeadline}
                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                        className="bg-black/40 text-zinc-300 rounded-lg px-3 py-1.5 border border-white/10 hover:border-white/20 focus:ring-1 focus:ring-indigo-500/50 text-xs font-medium outline-none cursor-pointer transition-colors"
                    />
                    {!newTaskDeadline && (
                        <span className="absolute inset-0 flex items-center px-3 pointer-events-none text-zinc-500 text-xs">
                             <Clock size={14} className="mr-2" /> Set time limit
                        </span>
                    )}
                </div>
            </div>

            <button 
                onClick={() => addTask(newTaskTitle)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg p-2 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-95"
                title="Add Quest"
            >
                <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter/Sort Bar */}
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Active Quests</h3>
        
        <div className="flex items-center gap-2 bg-zinc-900/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors group">
            <ArrowUpDown size={14} className="text-indigo-400 group-hover:text-indigo-300" />
            <label htmlFor="sort-select" className="text-xs font-bold text-zinc-400">Sort by:</label>
            <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent border-none outline-none cursor-pointer text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase transition-colors"
            >
                <option value="newest" className="bg-zinc-900">Newest</option>
                <option value="priority" className="bg-zinc-900">Priority</option>
                <option value="reminder" className="bg-zinc-900">Due Date</option>
                <option value="exp" className="bg-zinc-900">XP Reward</option>
                <option value="az" className="bg-zinc-900">A-Z</option>
            </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {sortedTasks.length === 0 && (
            <div className="text-center py-12 text-zinc-600 border border-dashed border-white/10 rounded-xl bg-zinc-900/20 backdrop-blur-sm">
                <p>No active quests. You are free!</p>
            </div>
        )}
        {sortedTasks.map(task => {
          const isEditing = editingTaskId === task.id;
          const isFinishing = finishingTaskIds.includes(task.id);
          const isRunning = task.isRunning;
          
          // Check if overdue
          const isOverdue = task.deadline && new Date() > new Date(task.deadline) && !isFinishing;
          
          if (isEditing && editForm) {
              return (
                <div key={task.id} className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-indigo-500/50 shadow-2xl flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between gap-2 w-full">
                        <input 
                            value={editForm.title}
                            onChange={e => setEditForm({...editForm, title: e.target.value})}
                            onKeyDown={handleEditKeyDown}
                            className="flex-1 bg-transparent border-b border-indigo-500/30 px-1 py-1 text-white focus:border-indigo-500 outline-none font-medium text-lg placeholder-zinc-600 transition-colors"
                            placeholder="Quest Title"
                            autoFocus
                        />
                         <select 
                            value={editForm.priority}
                            onChange={e => setEditForm({...editForm, priority: e.target.value as Priority})}
                            className="bg-black text-xs text-zinc-300 rounded px-2 py-1 border border-zinc-800 outline-none focus:border-indigo-500 cursor-pointer"
                        >
                            <option value={Priority.LOW}>Low</option>
                            <option value={Priority.MEDIUM}>Medium</option>
                            <option value={Priority.HIGH}>High</option>
                        </select>
                    </div>
                    
                    <input 
                        value={editForm.description}
                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                        onKeyDown={handleEditKeyDown}
                        className="bg-transparent border-b border-white/5 px-1 py-1 text-zinc-300 text-sm focus:border-indigo-500 outline-none w-full placeholder-zinc-600 transition-colors"
                        placeholder="Description"
                    />

                    {/* Deadline Input */}
                    <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1">
                            <Clock size={12} /> Time Limit:
                        </span>
                        <input 
                            type="datetime-local"
                            value={editForm.deadline}
                            onChange={e => setEditForm({...editForm, deadline: e.target.value})}
                            className="bg-black/50 text-xs text-zinc-300 rounded px-2 py-1 border border-white/10 outline-none focus:border-indigo-500"
                        />
                    </div>
                    
                    <div className="flex justify-end items-center pt-2 gap-2">
                        <button 
                            onClick={cancelEdit}
                            className="flex items-center gap-1 px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg text-xs font-bold transition-all"
                            title="Cancel (Esc)"
                        >
                            <X size={14} /> Cancel
                        </button>
                        <button 
                            onClick={saveEdit}
                            className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                            title="Save Changes (Enter)"
                        >
                            <Save size={14} /> Save
                        </button>
                    </div>
                </div>
              );
          }

          return (
            <div 
                key={task.id}
                className={`relative flex flex-col p-4 rounded-xl border transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden ${
                isFinishing 
                    ? 'bg-emerald-900/20 border-emerald-400/50 shadow-[0_0_50px_rgba(16,185,129,0.2)] opacity-0 translate-x-[150%] rotate-12 scale-90 brightness-150' 
                    : isOverdue
                        ? 'bg-red-950/20 border-red-500/20 hover:border-red-500/40'
                        : isRunning
                             ? 'bg-indigo-900/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                             : 'bg-zinc-900/20 backdrop-blur-sm border-white/5 hover:bg-zinc-900/40 hover:border-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                }`}
            >
                {/* Completion Visual Effects */}
                {isFinishing && (
                    <>
                        {/* Shockwave Ring */}
                        <div className="absolute inset-0 bg-emerald-400/10 animate-[ping_0.8s_ease-out_forwards] rounded-xl z-0" />
                        
                        {/* Background Flash Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-[pulse_0.5s_ease-in-out] z-10" />

                        {/* XP Reward Text */}
                        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                             <div className="transform scale-150 animate-[bounce_0.8s_infinite]">
                                <span className={`text-5xl font-black text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] ${
                                    isOverdue ? 'bg-gradient-to-b from-red-300 to-red-500' : 'bg-gradient-to-b from-yellow-300 to-amber-500'
                                }`}>
                                    +{isOverdue ? Math.floor(task.exp / 2) : task.exp} XP
                                </span>
                             </div>
                        </div>
                        
                        {/* Sparkle Icons */}
                        <div className="absolute top-2 right-10 z-20 text-yellow-300 animate-[spin_1s_ease-out_forwards]">
                            <Sparkles size={32} />
                        </div>
                        <div className="absolute bottom-2 left-10 z-20 text-emerald-300 animate-[pulse_0.5s_ease-in-out_infinite]">
                            <Sparkles size={24} />
                        </div>
                    </>
                )}

                <div className="flex items-start z-20">
                    <button 
                    onClick={(e) => handleCompleteTask(task.id, e)} 
                    className={`mt-1 mr-4 transition-colors ${
                        isFinishing ? 'cursor-default text-emerald-500' : 
                        isOverdue ? 'text-red-500 hover:text-red-400' :
                        'text-zinc-600 hover:text-emerald-400'
                    }`}
                    disabled={isFinishing}
                    title={isOverdue ? "Complete overdue task (50% XP)" : "Complete task"}
                    >
                    {isFinishing ? <CheckCircle2 size={24} className="animate-bounce" /> : <Circle size={24} />}
                    </button>
                    
                    <div className="flex-1 min-w-0 mr-4 group cursor-pointer" onDoubleClick={() => startEditing(task)}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded border backdrop-blur-sm flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                            </span>
                            <h3 className={`font-medium truncate transition-all duration-500 ${isFinishing ? 'line-through text-emerald-300/50 decoration-emerald-500/50 decoration-2' : 'text-zinc-200'}`}>
                                {task.title}
                            </h3>
                            {isOverdue && (
                                <span className="text-xs font-bold text-red-500 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <AlertTriangle size={10} /> Overdue
                                </span>
                            )}
                        </div>
                    
                        <p className="text-sm text-zinc-400 truncate">{task.description}</p>
                        
                        {/* Stats Row */}
                        <div className="flex gap-4 mt-2 items-center">
                            {task.voiceNote && (
                                <span className="text-xs text-indigo-400 flex items-center">
                                    <Mic size={10} className="mr-1"/> Transcribed
                                </span>
                            )}
                            {task.deadline && (
                                <span className={`text-xs flex items-center ${isOverdue ? 'text-red-400 font-bold' : 'text-zinc-500'}`} title={new Date(task.deadline).toLocaleString()}>
                                    <Clock size={10} className="mr-1"/> 
                                    {isOverdue ? "Late: " : "Due: "} 
                                    {new Date(task.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            )}
                            <span className={`text-xs flex items-center font-mono transition-all duration-300 ${
                                task.isRunning 
                                    ? 'text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                    : 'text-zinc-500'
                            }`}>
                                <Timer size={12} className={`mr-1.5 ${task.isRunning ? 'animate-pulse' : ''}`} />
                                {formatTime(task.timeSpent)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold px-2 py-1 rounded hidden sm:inline-block transition-colors ${
                            isFinishing 
                                ? 'text-emerald-300 bg-emerald-500/20 opacity-0' 
                                : isOverdue
                                    ? 'text-red-400 bg-red-500/10 border border-red-500/20'
                                    : 'text-amber-500 bg-amber-500/10 border border-amber-500/20'
                        }`}>
                            +{isOverdue ? Math.floor(task.exp / 2) : task.exp} XP
                        </span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); startEditing(task); }}
                            className="p-2 text-zinc-600 hover:text-indigo-400 transition-colors disabled:opacity-0"
                            title="Edit Quest"
                            disabled={isFinishing}
                        >
                            <Edit2 size={16} />
                        </button>
                        
                        {/* Stopwatch Button */}
                        <button 
                            onClick={(e) => toggleTimer(task.id, e)}
                            className={`p-2 transition-colors disabled:opacity-0 ${task.isRunning ? 'text-indigo-400 hover:text-indigo-300 animate-pulse drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]' : 'text-zinc-600 hover:text-indigo-400'}`}
                            title={task.isRunning ? "Pause Timer" : "Start Timer"}
                            disabled={isFinishing}
                        >
                            {task.isRunning ? <Pause size={16} /> : <Play size={16} />}
                        </button>

                        <button 
                            onClick={(e) => initiateDelete(task.id, e)}
                            className="p-2 text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-0"
                            title="Abandon Quest"
                            disabled={isFinishing}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
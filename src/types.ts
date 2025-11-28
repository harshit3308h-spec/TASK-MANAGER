export enum TaskType {
  DAILY = 'DAILY',
  QUEST = 'QUEST',
  BOSS = 'BOSS'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  exp: number;
  type: TaskType;
  priority: Priority;
  voiceNote?: string; // Kept for backward compatibility with existing data
  reminder?: string; // ISO-like date string from datetime-local input
  reminderFired?: boolean; // Track if notification has been sent
  
  // Time tracking
  timeSpent?: number; // duration in seconds
  isRunning?: boolean; // is stopwatch active
  lastUpdated?: number; // Timestamp of the last timer tick for accurate delta calculation
  completedAt?: string; // ISO date string of completion
  deleted?: boolean; // Soft delete flag
  
  // Deadline & Penalty
  deadline?: string; // ISO date string for the time limit
  completedOnTime?: boolean; // True if completed before deadline
}

export interface MonkMode {
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  durationLabel: string; // e.g. '7 Days'
  totalDays: number;
  minSuccessRate?: number; // Percentage required to maintain protocol
}

export interface UserStats {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  streak: number;
  class: 'Warrior' | 'Mage' | 'Rogue';
  displayName?: string; // Custom user name
  avatar?: string; // Base64 image string
  monkMode?: MonkMode;
  unlockedMonkModes: number[]; // Array of duration days (e.g. [7, 28])
}

export interface GuildMember {
  id: string;
  name: string;
  level: number;
  class: 'Warrior' | 'Mage' | 'Rogue';
  isUser: boolean; // To identify the current user
}

export interface Guild {
  id: string;
  name: string;
  code: string;
  members: GuildMember[];
}
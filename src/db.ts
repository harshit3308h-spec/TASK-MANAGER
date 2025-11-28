import Dexie, { Table } from 'dexie';
import { Task, UserStats, Guild } from './types';

export type TaskQuestDB = Dexie & {
  tasks: Table<Task>;
  userStats: Table<UserStats>;
  guild: Table<Guild>;
};

const db = new Dexie('TaskQuestDB') as TaskQuestDB;

db.version(1).stores({
  tasks: 'id, priority, completed, deleted', // Primary key and indexes
  userStats: 'id', // Singleton store
  guild: 'id'
});

export { db };

// Migration Helper
export const migrateFromLocalStorage = async () => {
  const MIGRATION_KEY = 'taskquest_migrated_v1';
  if (localStorage.getItem(MIGRATION_KEY)) return;

  const tasksRaw = localStorage.getItem('taskquest_tasks');
  const userRaw = localStorage.getItem('taskquest_user');
  const guildRaw = localStorage.getItem('taskquest_guild');

  try {
    await db.transaction('rw', db.tasks, db.userStats, db.guild, async () => {
      if (tasksRaw) {
        const tasks: Task[] = JSON.parse(tasksRaw);
        if (Array.isArray(tasks) && tasks.length > 0) {
          // Ensure all tasks have valid IDs, though they should from LS
          await db.tasks.bulkPut(tasks);
        }
      }

      if (userRaw) {
        const user: UserStats = JSON.parse(userRaw);
        // UserStats in types.ts doesn't have an ID, we assign a singleton ID 'user'
        await db.userStats.put({ ...user, id: 'user' } as any);
      }

      if (guildRaw) {
        const guild: Guild = JSON.parse(guildRaw);
        await db.guild.put(guild);
      }
    });

    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log("Migration from LocalStorage successful.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
};
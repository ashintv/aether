export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  emoji?: string;
  cover?: string;
  favorite?: boolean;
  archived?: boolean;
  tags: string[];
  folder?: string; // Folder path (e.g., "work/project-a" or "personal")
}

export interface DailyLogItem {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  status: "todo" | "in_progress" | "done";
  createdAt: number;
}

export interface DailyNote {
  date: string; // YYYY-MM-DD
  summary: string; // Markdown summary of the day
  mood?: string;
  completedTasksCount?: number;
  totalTasksCount?: number;
}

export interface QuickStat {
  label: string;
  value: string | number;
  description: string;
  icon: string;
}

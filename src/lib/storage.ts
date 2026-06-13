import { Note, DailyLogItem, DailyNote } from "../types";

const NOTES_KEY = "aethernote_notes";
const DAILY_LOGS_KEY = "aethernote_daily_logs";
const DAILY_NOTES_KEY = "aethernote_daily_notes";

const SEED_NOTES: Note[] = [
  {
    id: "seed-personal-1",
    title: "Personal Learning Goals 2026",
    content: `# Personal Development & Learning Goals for 2026

It's going to be an exciting year. Here are the core areas I want to dive deep into:

## 1. Advanced Web Tech & Frameworks
- [ ] Learn **Rust** and compile modules to **WebAssembly** for performance-critical UI components.
- [x] Experiment with **Bun** & **Tailwind CSS v4** in project boilerplates.
- [ ] Understand the mechanics of **CRDTs (Conflict-free Replicated Data Types)** for real-time collaborative applications.

## 2. System Architecture & Performance
- Dive deep into browser performance optimizations: Largest Contentful Paint (LCP), Interaction to Next Paint (INP).
- Study distributed system patterns (Event sourcing, Saga pattern).

## 3. Reading List
- *Designing Data-Intensive Applications* by Martin Kleppmann.
- *Refactoring* by Martin Fowler.

> "Live as if you were to die tomorrow. Learn as if you were to live forever." — Mahatma Gandhi`,
    createdAt: Date.now() - 3600000 * 24, // 1 day ago
    updatedAt: Date.now() - 3600000 * 12, // 12 hours ago
    favorite: true,
    tags: ["Self-Improvement", "Study", "Coding"],
    folder: "Personal",
  },
  {
    id: "seed-personal-2",
    title: "App Idea: AetherNote brainstorming",
    content: `# AetherNote — Brainstorming & Architecture

A sleek, local-first markdown note-taking app with a Notion-like visual interface.

## Key Focus Areas:
- **Clean Sidebar**: Quick organization, group by Personal/Meetings, favorites list.
- **Rich Editor**: Inline properties, custom covers/emojis, Markdown side-by-side or preview.
- **Daily Tasks Log**: A special view to log "done" tasks day-by-day.
- **Clean Storage**: Local-first with local storage backup export/import.

## Tech Stack:
- React + TypeScript
- Tailwind CSS v4 for clean, modern style rules
- Lucide React for crisp icons
- Marked.js for fast markdown parsing`,
    createdAt: Date.now() - 3600000 * 4, // 4 hours ago
    updatedAt: Date.now() - 3600000 * 4,
    favorite: false,
    tags: ["Side Projects", "React", "Design"],
    folder: "Work/Ideas",
  },
];

const SEED_DAILY_LOGS: DailyLogItem[] = [
  {
    id: "seed-log-1",
    date: new Date().toISOString().split("T")[0],
    text: "Configured local storage persistence and seeded example notes in AetherNote",
    status: "done",
    createdAt: Date.now() - 60000 * 30,
  },
  {
    id: "seed-log-2",
    date: new Date().toISOString().split("T")[0],
    text: "Design UI layouts for Notion-like editor properties panel",
    status: "in_progress",
    createdAt: Date.now() - 60000 * 20,
  },
  {
    id: "seed-log-3",
    date: new Date().toISOString().split("T")[0],
    text: "Add theme toggle (Light / Dark mode) with standard Tailwind transition classes",
    status: "todo",
    createdAt: Date.now() - 60000 * 10,
  },
];

const SEED_DAILY_NOTES: DailyNote[] = [
  {
    date: new Date().toISOString().split("T")[0],
    summary: "Today was focused on laying the foundation of the note-taking application. Successfully installed marked, setup the project structures, and designed a rich typography system. Next is to build the sidebar navigation and wire up the main editor views.",
  },
];

export function getNotes(): Note[] {
  const data = localStorage.getItem(NOTES_KEY);
  if (!data) {
    saveNotes(SEED_NOTES);
    return SEED_NOTES;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse notes from local storage, loading seed notes.", e);
    return SEED_NOTES;
  }
}

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function getDailyLogs(): DailyLogItem[] {
  const data = localStorage.getItem(DAILY_LOGS_KEY);
  if (!data) {
    saveDailyLogs(SEED_DAILY_LOGS);
    return SEED_DAILY_LOGS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse daily logs from local storage.", e);
    return SEED_DAILY_LOGS;
  }
}

export function saveDailyLogs(logs: DailyLogItem[]): void {
  localStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
}

export function getDailyNotes(): DailyNote[] {
  const data = localStorage.getItem(DAILY_NOTES_KEY);
  if (!data) {
    saveDailyNotes(SEED_DAILY_NOTES);
    return SEED_DAILY_NOTES;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse daily notes from local storage.", e);
    return SEED_DAILY_NOTES;
  }
}

export function saveDailyNotes(notes: DailyNote[]): void {
  localStorage.setItem(DAILY_NOTES_KEY, JSON.stringify(notes));
}

export function exportWorkspace(): string {
  const data = {
    notes: getNotes(),
    dailyLogs: getDailyLogs(),
    dailyNotes: getDailyNotes(),
    exportedAt: Date.now(),
  };
  return JSON.stringify(data, null, 2);
}

export function importWorkspace(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data && (Array.isArray(data.notes) || Array.isArray(data.dailyLogs) || Array.isArray(data.dailyNotes))) {
      if (Array.isArray(data.notes)) saveNotes(data.notes);
      if (Array.isArray(data.dailyLogs)) saveDailyLogs(data.dailyLogs);
      if (Array.isArray(data.dailyNotes)) saveDailyNotes(data.dailyNotes);
      return true;
    }
    return false;
  } catch (e) {
    console.error("Failed to import backup data", e);
    return false;
  }
}

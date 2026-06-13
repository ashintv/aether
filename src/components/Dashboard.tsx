import React from "react";
import { Note, DailyLogItem, DailyNote } from "../types";
import {
  FileText,
  Plus,
  FolderPlus,
  Upload,
  Download,
  Clock,
  Sparkles,
  ArrowRight,
  Keyboard,
  Info,
  CalendarCheck,
} from "lucide-react";
import { Button } from "./ui/button";

interface DashboardProps {
  notes: Note[];
  dailyLogs?: DailyLogItem[];
  dailyNotes: DailyNote[];
  onSelectTab: (tab: string) => void;
  onSelectNote: (id: string) => void;
  onAddNote: () => void;
  onToggleTaskStatus?: (id: string) => void;
  onCreateFolder: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Dashboard({
  notes,
  dailyLogs,
  dailyNotes,
  onSelectTab,
  onSelectNote,
  onAddNote,
  onToggleTaskStatus,
  onCreateFolder,
  onExport,
  onImport,
}: DashboardProps) {
  // Get current date string
  const todayStr = new Date().toISOString().split("T")[0];
  const todayNote = dailyNotes.find((n) => n.date === todayStr);
  const todayContent = todayNote?.summary || "";
  const checkboxes = todayContent.match(/- \[[ xX]\]/g) || [];
  const checked = todayContent.match(/- \[[xX]\]/g) || [];
  const todayTotal = checkboxes.length;
  const todayDone = checked.length;
  const taskProgress = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  // Recent files list (notes + log files) sorted by modification time
  const getRecentFiles = () => {
    const activeNotes = notes.filter((n) => !n.archived);
    const sortedNotes = [...activeNotes].sort((a, b) => b.updatedAt - a.updatedAt);
    
    const logDates = Array.from(new Set(dailyNotes.map((l) => l.date)))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 3);

    const files: {
      type: "note" | "log";
      id: string;
      name: string;
      path: string;
      updatedAt: number;
      date?: string;
    }[] = [];

    sortedNotes.slice(0, 4).forEach((note) => {
      files.push({
        type: "note",
        id: note.id,
        name: `${note.title || "Untitled"}.md`,
        path: note.folder ? `${note.folder}/` : "",
        updatedAt: note.updatedAt,
      });
    });

    logDates.forEach((date) => {
      files.push({
        type: "log",
        id: `log-${date}`,
        name: `${date}.log`,
        path: "daily_logs/",
        updatedAt: new Date(date).getTime() || Date.now(),
        date,
      });
    });

    return files.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  };

  const recentFiles = getRecentFiles();

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10 space-y-8 w-full select-none">
      
      {/* VS Code Welcome Header */}
      <div className="border-b border-border pb-6 space-y-2.5">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <Sparkles className="h-4 w-4 shrink-0" />
          AetherNote Editor
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">
          AetherNote
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Visual Studio Code styled markdown workspace. Write markdown notes in folders, track daily checklists, and review productivity stats in a clean, soft-slate environment.
        </p>
      </div>

      {/* Main VS Code Layout Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Section: Start & Recents (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Start Actions */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Start</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* New File */}
              <button
                onClick={onAddNote}
                className="flex items-center gap-3.5 p-3.5 rounded-lg border border-border bg-card/40 hover:bg-accent/40 text-left cursor-pointer transition-all hover:border-primary/50 group"
              >
                <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                  <Plus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-all">New File</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Create a markdown document (.md) in notes</p>
                </div>
              </button>

              {/* New Folder */}
              <button
                onClick={onCreateFolder}
                className="flex items-center gap-3.5 p-3.5 rounded-lg border border-border bg-card/40 hover:bg-accent/40 text-left cursor-pointer transition-all hover:border-primary/50 group"
              >
                <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                  <FolderPlus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-all">New Folder</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Add a new workspace sub-directory</p>
                </div>
              </button>

              {/* Open Logs */}
              <button
                onClick={() => onSelectTab("dailylog")}
                className="flex items-center gap-3.5 p-3.5 rounded-lg border border-border bg-card/40 hover:bg-accent/40 text-left cursor-pointer transition-all hover:border-primary/50 group"
              >
                <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                  <CalendarCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-all">Daily Logs</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Open calendar planner tasks</p>
                </div>
              </button>

              {/* Import JSON */}
              <div className="relative">
                <label className="flex items-center gap-3.5 p-3.5 rounded-lg border border-border bg-card/40 hover:bg-accent/40 text-left cursor-pointer transition-all hover:border-primary/50 group h-full">
                  <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                    <Upload className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-all">Import Workspace</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Load database files from disk JSON</p>
                  </div>
                  <input type="file" accept=".json" onChange={onImport} className="hidden" />
                </label>
              </div>

            </div>
          </div>

          {/* Recent Files */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Files
              </h2>
            </div>
            
            {recentFiles.length === 0 ? (
              <div className="p-8 rounded-lg border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                No recent files opened. Create a note to see them here.
              </div>
            ) : (
              <div className="space-y-1">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      if (file.type === "note") {
                        onSelectNote(file.id);
                        onSelectTab("editor");
                      } else if (file.type === "log" && file.date) {
                        onSelectTab("dailylog");
                        // Date selection logic will run in parent
                        const btn = document.querySelector(`[title="Import Backup JSON"]`); // dummy
                        // Let's hook clicking
                        window.dispatchEvent(new CustomEvent("select-sidebar-date", { detail: file.date }));
                      }
                    }}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/40 cursor-pointer group transition-all text-xs font-medium"
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <span className="font-mono text-xs opacity-70">
                        {file.type === "note" ? "📄" : "📅"}
                      </span>
                      <span className="text-muted-foreground truncate max-w-[200px] font-mono">
                        {file.path}
                      </span>
                      <span className="text-foreground group-hover:text-primary transition-all font-semibold truncate">
                        {file.name}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-4">
                      {formatRelativeTime(file.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Section: Keyboard Shortcuts & Help (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Keyboard Shortcuts Card */}
          <div className="border border-border bg-card/20 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pb-2 border-b border-border/40">
              <Keyboard className="h-4.5 w-4.5 text-primary" />
              Keyboard Shortcuts
            </h2>

            <div className="space-y-3 text-xs">
              
              {/* Cmd Shift M */}
              <div className="flex items-center justify-between py-0.5 border-b border-border/10">
                <span className="text-muted-foreground font-semibold">Toggle Editor Preview</span>
                <span className="flex items-center gap-1 shrink-0 select-none">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">Cmd</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">Shift</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">M</kbd>
                </span>
              </div>

              {/* Cmd N */}
              <div className="flex items-center justify-between py-0.5 border-b border-border/10">
                <span className="text-muted-foreground font-semibold">New Note File</span>
                <span className="flex items-center gap-1 shrink-0 select-none">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">Cmd</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">N</kbd>
                </span>
              </div>

              {/* Cmd Shift F */}
              <div className="flex items-center justify-between py-0.5 border-b border-border/10">
                <span className="text-muted-foreground font-semibold">Search File Tree</span>
                <span className="flex items-center gap-1 shrink-0 select-none">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">Cmd</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">Shift</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">F</kbd>
                </span>
              </div>

              {/* Alt D */}
              <div className="flex items-center justify-between py-0.5 border-b border-border/10">
                <span className="text-muted-foreground font-semibold">Open Welcome Screen</span>
                <span className="flex items-center gap-1 shrink-0 select-none">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">Alt</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">D</kbd>
                </span>
              </div>

              {/* Alt L */}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground font-semibold">Open Daily Logs</span>
                <span className="flex items-center gap-1 shrink-0 select-none">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">Alt</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-foreground bg-muted border border-border/80 rounded shadow-xs">L</kbd>
                </span>
              </div>

            </div>
          </div>

          {/* Quick Help Markdown Sheet */}
          <div className="border border-border bg-card/20 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pb-2 border-b border-border/40">
              <Info className="h-4.5 w-4.5 text-primary" />
              Markdown Reference
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs text-muted-foreground font-mono select-text">
              <div>
                <p className="font-bold text-foreground text-[10px] uppercase font-sans mb-1">Headers</p>
                <p># Heading 1</p>
                <p>## Heading 2</p>
              </div>
              <div>
                <p className="font-bold text-foreground text-[10px] uppercase font-sans mb-1">Emphasis</p>
                <p>**bold text**</p>
                <p>*italic text*</p>
              </div>
              <div>
                <p className="font-bold text-foreground text-[10px] uppercase font-sans mb-1">Checklists</p>
                <p>- [ ] Todo Item</p>
                <p>- [x] Done Item</p>
              </div>
              <div>
                <p className="font-bold text-foreground text-[10px] uppercase font-sans mb-1">Links & Code</p>
                <p>[title](https://)</p>
                <p>`code block`</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Footer statistics band */}
      <div className="pt-8 border-t border-border flex flex-wrap gap-x-8 gap-y-3.5 text-xs text-muted-foreground/80 font-bold">
        <div className="flex items-center gap-1.5">
          <span className="text-foreground">{notes.length}</span> markdown files
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-foreground">
            {dailyNotes.length}
          </span> active days logged
        </div>
        {todayTotal > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-foreground">{todayTotal}</span> tasks in today's log
            <span className="text-primary">({taskProgress}% complete)</span>
          </div>
        )}
      </div>

    </div>
  );
}

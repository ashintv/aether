import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { NoteEditor } from "./components/NoteEditor";
import { DailyLog } from "./components/DailyLog";
import { Note, DailyLogItem, DailyNote } from "./types";
import {
  getNotes,
  saveNotes,
  getDailyLogs,
  saveDailyLogs,
  getDailyNotes,
  saveDailyNotes,
  exportWorkspace,
  importWorkspace,
} from "./lib/storage";
import { Menu, ChevronLeft, X, Sparkles, FileText, CalendarCheck } from "lucide-react";
import { Button } from "./components/ui/button";
import { cn } from "@/lib/utils";
import "./index.css";

export function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLogItem[]>([]);
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editorMode, setEditorMode] = useState<"edit" | "preview" | "split">("split");

  // Load state on mount
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const res = await fetch("/api/workspace");
        const data = await res.json();
        setNotes(data.notes || []);
        setDailyNotes(data.dailyNotes || []);
        setTheme(data.theme || "dark");
      } catch (e) {
        console.error("Failed to fetch workspace from server, falling back to local storage", e);
        setNotes(getNotes());
        setDailyLogs(getDailyLogs());
        setDailyNotes(getDailyNotes());
        const savedTheme = localStorage.getItem("aethernote_theme") as "light" | "dark";
        setTheme(savedTheme || "dark");
      }
    };
    fetchWorkspace();
  }, []);

  // Update DOM when theme changes
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("aethernote_theme", theme);
    fetch("/api/theme/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    }).catch((err) => console.error("Failed to save theme to server", err));
  }, [theme]);

  // Listen for date select events from Dashboard
  useEffect(() => {
    const handleSelectSidebarDate = (e: Event) => {
      const date = (e as CustomEvent).detail;
      if (date) {
        setSelectedDate(date);
      }
    };
    window.addEventListener("select-sidebar-date", handleSelectSidebarDate);
    return () => window.removeEventListener("select-sidebar-date", handleSelectSidebarDate);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      // Cmd/Ctrl + Shift + M -> Toggle Preview Mode
      if (isMod && isShift && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setActiveTab((prev) => {
          if (prev !== "editor" && activeNoteId) {
            return "editor";
          }
          return prev;
        });
        setEditorMode((prevMode) => {
          if (prevMode === "edit") return "preview";
          if (prevMode === "preview") return "split";
          return "edit";
        });
      }

      // Cmd/Ctrl + N -> New Note File
      if (isMod && !isShift && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleAddNote();
      }

      // Alt + D -> Open Welcome Screen
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setActiveTab("dashboard");
        setActiveNoteId(null);
      }

      // Alt + L -> Open Daily Logs
      if (e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setActiveTab("dailylog");
        setActiveNoteId(null);
      }

      // Cmd/Ctrl + Shift + F -> Focus Sidebar Search Input
      if (isMod && isShift && e.key.toLowerCase() === "f") {
        e.preventDefault();
        const searchInput = document.getElementById("sidebar-search") as HTMLInputElement;
        if (searchInput) {
          setIsSidebarOpen(true);
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNoteId]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "dark"));
  };

  const saveNoteToServer = async (note: Note) => {
    try {
      await fetch("/api/notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
    } catch (e) {
      console.error("Failed to save note to server", e);
    }
  };

  const deleteNoteFromServer = async (id: string) => {
    try {
      await fetch("/api/notes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      console.error("Failed to delete note from server", e);
    }
  };

  const saveDailyNoteToServer = async (note: DailyNote) => {
    try {
      await fetch("/api/logs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: note.date, summary: note.summary }),
      });
    } catch (e) {
      console.error("Failed to save daily note to server", e);
    }
  };

  // Add a new note at root
  const handleAddNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: "Untitled Note",
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      favorite: false,
      tags: [],
      folder: "",
    };

    setNotes((prevNotes) => {
      const updatedNotes = [newNote, ...prevNotes];
      saveNotes(updatedNotes);
      return updatedNotes;
    });
    saveNoteToServer(newNote);

    setActiveNoteId(newNote.id);
    setActiveTab("editor");
  };

  // Add a new note inside a specific folder
  const handleAddNoteInFolder = (folderPath: string) => {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: "Untitled Note",
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      favorite: false,
      tags: [],
      folder: folderPath,
    };

    setNotes((prevNotes) => {
      const updatedNotes = [newNote, ...prevNotes];
      saveNotes(updatedNotes);
      return updatedNotes;
    });
    saveNoteToServer(newNote);

    setActiveNoteId(newNote.id);
    setActiveTab("editor");
  };

  // Create new folder (by creating a dummy note inside it)
  const handleCreateFolder = () => {
    const folderName = prompt("Enter folder path (e.g., Personal, Work/Ideas):");
    if (!folderName || !folderName.trim()) return;
    handleAddNoteInFolder(folderName.trim());
  };

  // Update existing note
  const handleUpdateNote = (updatedNote: Note) => {
    const noteWithTimestamp = {
      ...updatedNote,
      updatedAt: Date.now(),
    };
    setNotes((prevNotes) => {
      const updatedNotes = prevNotes.map((n) => (n.id === updatedNote.id ? noteWithTimestamp : n));
      saveNotes(updatedNotes);
      return updatedNotes;
    });
    saveNoteToServer(noteWithTimestamp);
  };

  // Delete note
  const handleDeleteNote = (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      setNotes((prevNotes) => {
        const updatedNotes = prevNotes.filter((n) => n.id !== id);
        saveNotes(updatedNotes);
        return updatedNotes;
      });
      deleteNoteFromServer(id);

      if (activeNoteId === id) {
        setActiveNoteId(null);
        setActiveTab("dashboard");
      }
    }
  };

  // Toggle tasks check status (no-op since checklists are simplified, but kept for interface/Dashboard compatibility)
  const handleToggleTaskStatus = (taskId: string) => {
    setDailyLogs((prevLogs) => {
      const updatedLogs = prevLogs.map((log) => {
        if (log.id === taskId) {
          return {
            ...log,
            status: log.status === "done" ? ("todo" as const) : ("done" as const),
          };
        }
        return log;
      });
      saveDailyLogs(updatedLogs);
      return updatedLogs;
    });
  };

  // Daily log actions (no-ops)
  const handleAddLogItem = (date: string, text: string) => {
    const newItem: DailyLogItem = {
      id: `log-${Date.now()}`,
      date,
      text,
      status: "todo",
      createdAt: Date.now(),
    };
    setDailyLogs((prevLogs) => {
      const updatedLogs = [newItem, ...prevLogs];
      saveDailyLogs(updatedLogs);
      return updatedLogs;
    });
  };

  const handleUpdateLogItem = (updatedItem: DailyLogItem) => {
    setDailyLogs((prevLogs) => {
      const updatedLogs = prevLogs.map((log) => (log.id === updatedItem.id ? updatedItem : log));
      saveDailyLogs(updatedLogs);
      return updatedLogs;
    });
  };

  const handleDeleteLogItem = (id: string) => {
    setDailyLogs((prevLogs) => {
      const updatedLogs = prevLogs.filter((log) => log.id !== id);
      saveDailyLogs(updatedLogs);
      return updatedLogs;
    });
  };

  const handleUpdateDailyNote = (updatedNote: DailyNote) => {
    setDailyNotes((prevDailyNotes) => {
      const exists = prevDailyNotes.some((n) => n.date === updatedNote.date);
      let updatedNotes = [];
      if (exists) {
        updatedNotes = prevDailyNotes.map((n) => (n.date === updatedNote.date ? updatedNote : n));
      } else {
        updatedNotes = [...prevDailyNotes, updatedNote];
      }
      saveDailyNotes(updatedNotes);
      return updatedNotes;
    });
    saveDailyNoteToServer(updatedNote);
  };

  // Export database
  const handleExport = () => {
    const dataStr = JSON.stringify({
      notes,
      dailyNotes,
      exportedAt: Date.now()
    }, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `aethernote_backup_${new Date().toISOString().split("T")[0]}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Import database
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files.length > 0) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        const targetResult = event.target?.result;
        if (typeof targetResult === "string") {
          try {
            const data = JSON.parse(targetResult);
            if (data && (Array.isArray(data.notes) || Array.isArray(data.dailyNotes))) {
              // Reset workspace first
              await fetch("/api/workspace/reset", { method: "POST" });
              
              // Save each note to the server
              if (Array.isArray(data.notes)) {
                for (const note of data.notes) {
                  await fetch("/api/notes/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(note),
                  });
                }
              }
              
              // Save each daily note/log to the server
              const dailyNotesList = data.dailyNotes || data.dailyLogs || [];
              if (Array.isArray(dailyNotesList)) {
                for (const item of dailyNotesList) {
                  const date = item.date;
                  const summary = item.summary || item.text || "";
                  await fetch("/api/logs/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ date, summary }),
                  });
                }
              }

              // Reload workspace
              const res = await fetch("/api/workspace");
              const freshData = await res.json();
              setNotes(freshData.notes || []);
              setDailyNotes(freshData.dailyNotes || []);
              setTheme(freshData.theme || "dark");
              alert("Backup imported successfully!");
              setActiveTab("dashboard");
              setActiveNoteId(null);
            } else {
              alert("Failed to import. Invalid backup file format.");
            }
          } catch (e) {
            console.error("Failed to import backup data", e);
            alert("Failed to import backup data.");
          }
        }
      };
    }
  };

  // Clear database
  const handleClearData = () => {
    if (
      confirm("WARNING: This will permanently delete all your personal notes, directories, and daily logs. Are you sure you want to proceed?")
    ) {
      localStorage.clear();
      // Also reset on server
      fetch("/api/workspace/reset", { method: "POST" })
        .then(() => fetch("/api/workspace"))
        .then((res) => res.json())
        .then((data) => {
          setNotes(data.notes || []);
          setDailyNotes(data.dailyNotes || []);
          setTheme(data.theme || "dark");
          alert("Workspace reset successfully.");
        })
        .catch((err) => {
          console.error("Failed to reset server workspace", err);
          alert("Local database reset successfully, but failed to reset server.");
        });

      setActiveTab("dashboard");
      setActiveNoteId(null);
    }
  };

  const activeNote = notes.find((n) => n.id === activeNoteId) || null;

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden relative font-sans text-foreground">
      
      {/* Collapsible Sidebar */}
      <div
        className={cn(
          "transition-all duration-300 flex z-30 shrink-0",
          isSidebarOpen ? "w-64" : "w-0 -translate-x-full"
        )}
      >
        <Sidebar
          notes={notes}
          dailyLogs={dailyLogs}
          dailyNotes={dailyNotes}
          activeTab={activeTab}
          activeNoteId={activeNoteId}
          selectedDate={selectedDate}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab !== "editor") setActiveNoteId(null);
          }}
          onSelectNote={setActiveNoteId}
          onSelectDate={setSelectedDate}
          onAddNote={handleAddNote}
          onAddNoteInFolder={handleAddNoteInFolder}
          onDeleteNote={handleDeleteNote}
          theme={theme}
          onToggleTheme={toggleTheme}
          onExport={handleExport}
          onImport={handleImport}
          onClearData={handleClearData}
          onCreateFolder={handleCreateFolder}
        />
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-background z-10">
        
        {/* Floating Sidebar Toggle and Header Area */}
        <header className="h-12 border-b border-border/40 px-4 flex items-center justify-between shrink-0 bg-background/40 backdrop-blur-xs relative z-20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="h-8 w-8 hover:bg-accent/40 text-muted-foreground hover:text-foreground"
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {isSidebarOpen ? <ChevronLeft className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </Button>
            <div className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-1.5">
              <span>Workspace</span>
              <span>/</span>
              <span className="capitalize text-foreground font-bold">
                {activeTab === "editor"
                  ? activeNote
                    ? `${activeNote.folder ? `${activeNote.folder}/` : ""}${activeNote.title || "Editor"}`
                    : "Editor"
                  : activeTab === "dailylog"
                  ? `daily_logs/${selectedDate}.log`
                  : activeTab}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider bg-muted/30 px-2 py-0.5 rounded border border-border/40">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Local Sync Active</span>
          </div>
        </header>

        {/* VS Code Style Tab Bar */}
        <div className="h-9 bg-sidebar/20 border-b border-border/40 flex items-center shrink-0 text-xs overflow-x-auto select-none">
          <div className="flex items-center">
            
            {/* Tab 1: Welcome / Dashboard */}
            {activeTab === "dashboard" && (
              <div className="h-9 px-4 border-r border-border/40 bg-background text-foreground flex items-center gap-1.5 font-semibold border-t-2 border-t-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Welcome</span>
              </div>
            )}
            
            {/* Tab 2: Daily Logs */}
            {activeTab === "dailylog" && (
              <div className="h-9 px-4 border-r border-border/40 bg-background text-foreground flex items-center gap-1.5 font-semibold border-t-2 border-t-primary">
                <CalendarCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{selectedDate}.log</span>
                <button
                  onClick={() => {
                    setActiveTab("dashboard");
                    setActiveNoteId(null);
                  }}
                  className="hover:bg-muted p-0.5 rounded ml-1.5"
                  title="Close Tab"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )}

            {/* Tab 3: Markdown Note Editor */}
            {activeTab === "editor" && activeNote && (
              <div className="h-9 px-4 border-r border-border/40 bg-background text-foreground flex items-center gap-1.5 font-semibold border-t-2 border-t-primary">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[200px]">
                  {activeNote.title || "Untitled"}.md
                </span>
                <button
                  onClick={() => {
                    setActiveTab("dashboard");
                    setActiveNoteId(null);
                  }}
                  className="hover:bg-muted p-0.5 rounded ml-1.5"
                  title="Close Tab"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Tab View Routing */}
        <main className="flex-1 min-h-0 flex flex-col relative bg-background">
          {activeTab === "dashboard" && (
            <Dashboard
              notes={notes}
              dailyLogs={dailyLogs}
              dailyNotes={dailyNotes}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                if (tab !== "editor") setActiveNoteId(null);
              }}
              onSelectNote={(id) => {
                setActiveNoteId(id);
                setActiveTab("editor");
              }}
              onAddNote={handleAddNote}
              onToggleTaskStatus={handleToggleTaskStatus}
              onCreateFolder={handleCreateFolder}
              onExport={handleExport}
              onImport={handleImport}
            />
          )}

          {activeTab === "dailylog" && (
            <DailyLog
              dailyLogs={dailyLogs}
              dailyNotes={dailyNotes}
              onAddLogItem={handleAddLogItem}
              onUpdateLogItem={handleUpdateLogItem}
              onDeleteLogItem={handleDeleteLogItem}
              onUpdateDailyNote={handleUpdateDailyNote}
              theme={theme}
            />
          )}

          {activeTab === "editor" && (
            <NoteEditor
              note={activeNote}
              onUpdateNote={handleUpdateNote}
              onClose={() => {
                setActiveTab("dashboard");
                setActiveNoteId(null);
              }}
              editorMode={editorMode}
              onSetEditorMode={setEditorMode}
              theme={theme}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

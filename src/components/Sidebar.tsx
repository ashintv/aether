import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Star,
  Trash2,
  FileText,
  Sun,
  Moon,
  Download,
  Upload,
  FolderPlus,
  FilePlus,
} from "lucide-react";
import { Note, DailyLogItem, DailyNote } from "../types";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

interface SidebarProps {
  notes: Note[];
  dailyLogs: DailyLogItem[];
  dailyNotes: DailyNote[];
  activeTab: string;
  activeNoteId: string | null;
  selectedDate: string;
  onSelectTab: (tab: string) => void;
  onSelectNote: (id: string) => void;
  onSelectDate: (date: string) => void;
  onAddNote: () => void;
  onAddNoteInFolder: (folderPath: string) => void;
  onDeleteNote: (id: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearData: () => void;
  onCreateFolder: () => void;
}

interface FileItem {
  id: string;
  name: string;
  type: "file";
  note: Note;
}

interface LogItem {
  date: string;
  name: string;
  type: "log";
}

interface FolderItem {
  name: string;
  type: "folder";
  path: string; // unique path (e.g. WORKSPACE/Work)
  children: (FileItem | LogItem | FolderItem)[];
}

type TreeItem = FileItem | LogItem | FolderItem;

export function Sidebar({
  notes,
  dailyLogs,
  dailyNotes,
  activeTab,
  activeNoteId,
  selectedDate,
  onSelectTab,
  onSelectNote,
  onSelectDate,
  onAddNote,
  onAddNoteInFolder,
  onDeleteNote,
  theme,
  onToggleTheme,
  onExport,
  onImport,
  onClearData,
  onCreateFolder,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    WORKSPACE: true,
    "WORKSPACE/daily_logs": true,
    "WORKSPACE/Personal": true,
    "WORKSPACE/Work": true,
  });

  // Toggle folder expansion
  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Build hierarchical folder tree
  const buildTree = () => {
    const root: FolderItem = { name: "WORKSPACE", type: "folder", path: "WORKSPACE", children: [] };

    // 1. Virtual daily_logs folder
    const dailyLogsFolder: FolderItem = {
      name: "daily_logs",
      type: "folder",
      path: "WORKSPACE/daily_logs",
      children: [],
    };

    const logDates = Array.from(
      new Set([
        ...dailyLogs.map((log) => log.date),
        ...dailyNotes.map((note) => note.date),
        new Date().toISOString().split("T")[0],
      ])
    ).sort((a, b) => b.localeCompare(a));

    logDates.forEach((date) => {
      // If we are searching, check if date contains search query
      if (searchQuery && !date.includes(searchQuery)) return;

      dailyLogsFolder.children.push({
        date,
        name: `${date}.log`,
        type: "log",
      });
    });

    if (dailyLogsFolder.children.length > 0 || !searchQuery) {
      root.children.push(dailyLogsFolder);
    }

    // 2. User notes files & directories
    const filteredNotes = notes.filter(
      (note) =>
        !note.archived &&
        (note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (note.folder && note.folder.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    filteredNotes.forEach((note) => {
      const folderPath = note.folder ? note.folder.trim() : "";
      const parts = folderPath ? folderPath.split("/").filter(Boolean) : [];

      let currentFolder = root;
      let pathAcc = "WORKSPACE";

      parts.forEach((part) => {
        pathAcc = `${pathAcc}/${part}`;
        let folder = currentFolder.children.find(
          (child) => child.type === "folder" && child.name === part
        ) as FolderItem;

        if (!folder) {
          folder = {
            name: part,
            type: "folder",
            path: pathAcc,
            children: [],
          };
          currentFolder.children.push(folder);
        }
        currentFolder = folder;
      });

      currentFolder.children.push({
        id: note.id,
        name: `${note.title || "Untitled"}.md`,
        type: "file",
        note,
      });
    });

    // Recursive sort helper (folders first, then files alphabetically)
    const sortTree = (folder: FolderItem) => {
      folder.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      folder.children.forEach((child) => {
        if (child.type === "folder") {
          sortTree(child);
        }
      });
    };

    sortTree(root);
    return root;
  };

  const tree = buildTree();

  // Recursively render tree nodes
  const renderNode = (node: TreeItem, depth = 0) => {
    const indent = depth * 12; // pixels indent

    if (node.type === "folder") {
      const isExpanded = expandedFolders[node.path] ?? false;
      const isDailyLogs = node.name === "daily_logs";

      return (
        <div key={node.path} className="select-none">
          <div
            className="flex items-center justify-between group/folder py-1 px-2 hover:bg-accent/40 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-all"
            style={{ paddingLeft: `${indent + 8}px` }}
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(node.path);
            }}
          >
            <span className="flex items-center gap-1.5 truncate">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              ) : (
                <Folder className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
            </span>

            {/* Folder action buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover/folder:opacity-100 transition-opacity pr-1">
              {!isDailyLogs && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Strip the "WORKSPACE/" prefix to get correct relative path
                    const relativePath = node.path.replace(/^WORKSPACE\/?/, "");
                    onAddNoteInFolder(relativePath);
                  }}
                  title="New File in this folder"
                  className="hover:bg-accent p-0.5 rounded text-muted-foreground hover:text-foreground transition-all"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    if (node.type === "log") {
      const isActive = activeTab === "dailylog" && selectedDate === node.date;

      return (
        <div
          key={node.date}
          onClick={(e) => {
            e.stopPropagation();
            onSelectTab("dailylog");
            onSelectDate(node.date);
          }}
          className={cn(
            "flex items-center justify-between py-1 px-2 text-xs rounded-md cursor-pointer transition-all group/log select-none",
            isActive
              ? "bg-accent text-accent-foreground font-semibold border-l-2 border-l-primary rounded-l-none"
              : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
          )}
          style={{ paddingLeft: `${indent + 24}px` }}
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-amber-500/80 font-mono text-[10px] shrink-0 font-bold">📅</span>
            <span className="truncate">{node.name}</span>
          </span>
        </div>
      );
    }

    // MD Files
    const isActive = activeTab === "editor" && activeNoteId === node.id;
    const isFavorite = node.note.favorite;

    return (
      <div
        key={node.id}
        onClick={(e) => {
          e.stopPropagation();
          onSelectTab("editor");
          onSelectNote(node.id);
        }}
        className={cn(
          "flex items-center justify-between py-1 px-2 text-xs rounded-md cursor-pointer transition-all group/file select-none",
          isActive
            ? "bg-accent text-accent-foreground font-semibold border-l-2 border-l-primary rounded-l-none"
            : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
        )}
        style={{ paddingLeft: `${indent + 24}px` }}
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-primary/80 font-mono text-[10px] shrink-0 font-bold">📄</span>
          <span className="truncate">{node.name}</span>
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity pr-1">
          {isFavorite && (
            <span className="p-0.5" title="Favorite">
              <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(node.id);
            }}
            title="Delete Note"
            className="hover:bg-destructive/10 hover:text-destructive p-0.5 rounded text-muted-foreground transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-64 border-r border-border/80 bg-sidebar/50 dark:bg-sidebar/30 flex flex-col h-screen shrink-0 backdrop-blur-md">
      {/* Explorer Title Header */}
      <div className="p-3.5 border-b border-border/40 flex items-center justify-between">
        <h1 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">Explorer</h1>
        
        {/* Explorer Tool Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onAddNote}
            title="New File (.md) at root"
            className="p-1 rounded hover:bg-accent hover:text-foreground text-muted-foreground transition-all"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onCreateFolder}
            title="New Folder..."
            className="p-1 rounded hover:bg-accent hover:text-foreground text-muted-foreground transition-all"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            id="sidebar-search"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8.5 h-8 bg-muted/40 hover:bg-muted/60 focus:bg-background border-none rounded-md text-xs focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Navigation Shortcuts */}
      <div className="px-2 py-1.5 flex gap-1 border-b border-border/20 shrink-0">
        <button
          onClick={() => onSelectTab("dashboard")}
          className={cn(
            "flex-1 text-center py-1 text-[10px] font-bold uppercase rounded transition-all",
            activeTab === "dashboard"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          )}
        >
          Welcome
        </button>
        <button
          onClick={() => {
            onSelectTab("dailylog");
          }}
          className={cn(
            "flex-1 text-center py-1 text-[10px] font-bold uppercase rounded transition-all",
            activeTab === "dailylog"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          )}
        >
          Daily Logs
        </button>
      </div>

      {/* Directory File Tree View */}
      <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-0.5">
        {tree.children.map((child) => renderNode(child, 0))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/40 bg-muted/10 dark:bg-muted/5 flex items-center justify-between shrink-0">
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md hover:bg-accent hover:text-foreground text-muted-foreground transition-all"
          title={theme === "light" ? "Dark Mode" : "Light Mode"}
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onExport}
            className="p-1.5 rounded-md hover:bg-accent hover:text-foreground text-muted-foreground transition-all"
            title="Export Backup JSON"
          >
            <Download className="h-4 w-4" />
          </button>
          <label
            className="p-1.5 rounded-md hover:bg-accent hover:text-foreground text-muted-foreground transition-all cursor-pointer flex items-center justify-center"
            title="Import Backup JSON"
          >
            <Upload className="h-4 w-4" />
            <input type="file" accept=".json" onChange={onImport} className="hidden" />
          </label>
          <button
            onClick={onClearData}
            className="p-1.5 rounded-md hover:bg-accent hover:text-destructive text-muted-foreground transition-all"
            title="Clear All Data"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

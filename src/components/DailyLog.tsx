import React, { useState, useRef } from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/vs2015.css";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  TrendingUp,
  Edit,
  Edit2,
  Eye,
  Zap,
  ChevronUp,
  ChevronDown,
  X,
  FileText,
  Bold,
  Italic,
  Code,
  Quote,
  Heading1,
  Heading2,
  List as ListIcon,
  ListTodo,
  Link,
  Columns,
} from "lucide-react";
import { DailyLogItem, DailyNote } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader } from "./ui/card";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";

interface DailyLogProps {
  dailyLogs?: DailyLogItem[];
  dailyNotes: DailyNote[];
  onAddLogItem?: (date: string, text: string) => void;
  onUpdateLogItem?: (item: DailyLogItem) => void;
  onDeleteLogItem?: (id: string) => void;
  onUpdateDailyNote: (note: DailyNote) => void;
  theme: "light" | "dark";
}

export function DailyLog({
  dailyNotes,
  onUpdateDailyNote,
  theme,
}: DailyLogProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [editorMode, setEditorMode] = useState<"edit" | "preview" | "split">("edit");
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [isFloatingPreviewOpen, setIsFloatingPreviewOpen] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const editorRef = useRef<any>(null);

  // Listen for sidebar date changes
  React.useEffect(() => {
    const handleSelectSidebarDate = (e: Event) => {
      const date = (e as CustomEvent).detail;
      if (date) {
        setSelectedDate(date);
      }
    };
    window.addEventListener("select-sidebar-date", handleSelectSidebarDate);
    return () => window.removeEventListener("select-sidebar-date", handleSelectSidebarDate);
  }, []);

  // Get current note for selected date
  const currentNote = dailyNotes.find((n) => n.date === selectedDate) || {
    date: selectedDate,
    summary: "",
  };

  // Calculate 7-day ribbon navigation centered around selectedDate
  const getWeeklyDates = () => {
    const dates = [];
    const baseDate = new Date(selectedDate);
    for (let i = -3; i <= 3; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setSelectedDate(e.target.value);
    }
  };

  // Update daily note
  const handleContentChange = (value: string) => {
    setSaveStatus("saving");
    onUpdateDailyNote({
      ...currentNote,
      summary: value,
    });
    setTimeout(() => setSaveStatus("saved"), 800);
  };

  // Monaco Editor did mount callback
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
  };

  // Monaco-compatible Markdown injection helper
  const insertMarkdown = (syntaxBefore: string, syntaxAfter = "") => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;

    const selectedText = model.getValueInRange(selection);
    const replacementText = syntaxBefore + selectedText + syntaxAfter;

    // Execute edit block preserving Monaco undo stack
    const op = { range: selection, text: replacementText, forceMoveMarkers: true };
    editor.executeEdits("markdown-toolbar", [op]);

    // Update state value
    const newValue = editor.getValue();
    handleContentChange(newValue);

    // Focus editor back
    editor.focus();
  };

  // Parse markdown headings for Outline Map
  const getHeadings = () => {
    if (!currentNote || !currentNote.summary) return [];
    const lines = currentNote.summary.split("\n");
    const list: { text: string; level: number; line: number }[] = [];
    lines.forEach((line, idx) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        list.push({
          level: match[1].length,
          text: match[2].replace(/[*_`#]/g, "").trim(),
          line: idx + 1,
        });
      }
    });
    return list;
  };

  const headings = getHeadings();

  // Scroll editor viewport center to selected outline line
  const handleOutlineClick = (lineNumber: number) => {
    const editor = editorRef.current;
    if (editor) {
      editor.revealLineInCenter(lineNumber);
      editor.setPosition({ lineNumber, column: 1 });
      editor.focus();
    }
  };

  // Render markdown safely
  const renderMarkdown = (md: string) => {
    try {
      return marked.parse(md) as string;
    } catch {
      return md;
    }
  };

  // Human readable date formatting
  const formatHumanDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";

    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative z-10 px-6 md:px-12 pb-6 pt-3 select-none">
      
      {/* Page Navigation Header (Collapsible Accordion Style) */}
      <div className="border border-border/40 bg-muted/10 dark:bg-muted/5 rounded-lg mb-3 shrink-0">
        
        {/* Accordion Trigger Header */}
        <div
          className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-muted/20 transition-all rounded-lg"
          onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="text-xs">📅</span>
            <span className="font-mono text-foreground font-bold truncate max-w-[200px]">
              daily_logs/{selectedDate}.log
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span>{formatHumanDate(selectedDate)}</span>
            <span className="text-muted-foreground/40">•</span>
            {saveStatus === "saving" ? (
              <span className="text-primary font-bold animate-pulse">Saving...</span>
            ) : (
              <span className="text-muted-foreground/50">Saved</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Date Selector when expanded/collapsed */}
            <div className="flex items-center gap-1.5 bg-background/50 border border-border/40 px-2 py-0.5 rounded text-[10px]" onClick={(e) => e.stopPropagation()}>
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="bg-transparent font-bold outline-hidden border-none text-foreground cursor-pointer text-[10px]"
              />
            </div>

            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-muted-foreground bg-muted border border-border/40 px-2 py-0.5 rounded">
              <span>Navigation</span>
              {isHeaderCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </div>
          </div>
        </div>

        {/* Weekly Ribbon Navigation Drawer */}
        {!isHeaderCollapsed && (
          <div className="p-2.5 border-t border-border/30 flex items-center justify-between gap-2 bg-background/10">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-7 w-7 hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 grid grid-cols-7 gap-1 mx-1.5">
              {getWeeklyDates().map((date, idx) => {
                const dateStr = date.toISOString().split("T")[0];
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "flex flex-col items-center py-1 rounded transition-all border text-center relative",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground font-bold"
                        : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="text-[8px] uppercase tracking-wider font-semibold opacity-75">
                      {date.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className="text-xs font-extrabold mt-0.5">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-7 w-7 hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

      </div>

      {/* Editor Toolbar & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border border-border/40 bg-muted/5 p-2 rounded-t-lg gap-2 shrink-0">
        
        {/* Formatting Shortcuts */}
        <div className="flex flex-wrap items-center gap-0.5">
          <button
            onClick={() => insertMarkdown("**", "**")}
            title="Bold"
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("*", "*")}
            title="Italic"
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("`", "`")}
            title="Code"
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <Code className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("\n> ", "")}
            title="Quote"
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <Quote className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("\n# ", "")}
            title="Heading 1"
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("\n## ", "")}
            title="Heading 2"
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("\n- ", "")}
            title="Bullet List"
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <ListIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("\n- [ ] ", "")}
            title="Checkbox"
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <ListTodo className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("[", "](https://)")}
            title="Link"
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <Link className="h-4 w-4" />
          </button>
        </div>

        {/* View toggles & Outline Drawer button */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          
          {/* Floating Live Preview Map Toggle - Only in Edit mode */}
          {editorMode === "edit" && (
            <button
              onClick={() => setIsFloatingPreviewOpen(!isFloatingPreviewOpen)}
              title={isFloatingPreviewOpen ? "Hide Live Preview Map overlay" : "Show Live Preview Map overlay"}
              className={cn(
                "px-2.5 py-0.5 text-xs font-bold rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1 border border-transparent transition-all h-7",
                isFloatingPreviewOpen ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" : ""
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Preview Map</span>
            </button>
          )}

          {/* Outline Drawer Toggle */}
          <button
            onClick={() => setIsOutlineOpen(!isOutlineOpen)}
            title={isOutlineOpen ? "Hide Outline Map" : "Show Outline Map"}
            className={cn(
              "px-2.5 py-0.5 text-xs font-bold rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1 border border-transparent transition-all h-7",
              isOutlineOpen ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" : ""
            )}
          >
            <ListIcon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{isOutlineOpen ? "Hide Outline" : "Show Outline"}</span>
          </button>

          {/* Mode Toggles */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md shrink-0 border border-border/20">
            <button
              onClick={() => setEditorMode("edit")}
              className={cn(
                "px-2.5 py-0.5 text-xs font-bold rounded-sm flex items-center gap-1 transition-all",
                editorMode === "edit" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Edit2 className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={() => setEditorMode("preview")}
              className={cn(
                "px-2.5 py-0.5 text-xs font-bold rounded-sm flex items-center gap-1 transition-all",
                editorMode === "preview" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="h-3 w-3" /> Preview
            </button>
            <button
              onClick={() => setEditorMode("split")}
              className={cn(
                "px-2.5 py-0.5 text-xs font-bold rounded-sm flex items-center gap-1 transition-all",
                editorMode === "split" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Columns className="h-3 w-3" /> Split
            </button>
          </div>
        </div>
      </div>

      {/* Content Editor Body (VS Code style viewport layout) */}
      <div className="flex-1 min-h-0 border border-t-0 border-border/40 rounded-b-lg overflow-hidden bg-card/10 flex h-full relative">
        
        {/* Monaco Editor Frame */}
        {(editorMode === "edit" || editorMode === "split") && (
          <div className="flex-1 relative h-full">
            <Editor
              height="100%"
              language="markdown"
              theme={theme === "dark" ? "vs-dark" : "light"}
              value={currentNote.summary}
              onChange={(val) => handleContentChange(val || "")}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                wordWrap: "on",
                lineNumbers: "on",
                fontSize: 13.5,
                automaticLayout: true,
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                renderLineHighlight: "all",
                padding: { top: 12 },
                scrollbar: {
                  vertical: "auto",
                  horizontal: "auto",
                },
              }}
            />
          </div>
        )}

        {/* Split screen divider */}
        {editorMode === "split" && (
          <div className="w-[1px] bg-border/40 h-stretch" />
        )}

        {/* Live Preview Frame */}
        {(editorMode === "preview" || editorMode === "split") && (
          <div className="flex-1 p-5 overflow-y-auto h-full bg-muted/5 select-text">
            {currentNote.summary.trim() === "" ? (
              <p className="text-xs text-muted-foreground/50 italic text-center py-10">Empty log entry</p>
            ) : (
              <div
                className="prose dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(currentNote.summary),
                }}
              />
            )}
          </div>
        )}

        {/* Document Outline Map Panel (Right side) */}
        {isOutlineOpen && headings.length > 0 && (
          <div className="w-52 border-l border-border/40 bg-muted/10 shrink-0 h-full flex flex-col p-3 select-none">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground/75 mb-3 flex items-center justify-between pb-1.5 border-b border-border/20">
              <span>Outline Map</span>
              <span className="px-1 bg-muted rounded font-mono text-[9px]">{headings.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-0.5">
              {headings.map((h, i) => (
                <div
                  key={i}
                  onClick={() => handleOutlineClick(h.line)}
                  className="hover:text-primary hover:bg-accent/40 rounded px-1.5 py-1 cursor-pointer transition-all text-muted-foreground truncate leading-snug"
                  style={{ paddingLeft: `${(h.level - 1) * 8 + 4}px` }}
                  title={`Jump to line ${h.line}`}
                >
                  <span className="opacity-40 mr-1 text-[9px]">{"#".repeat(h.level)}</span>
                  <span>{h.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Live Preview Map (Bottom Right Overlay) */}
        {editorMode === "edit" && isFloatingPreviewOpen && (
          <div className="absolute bottom-4 right-4 w-96 h-72 rounded-xl border border-border/60 bg-card/90 dark:bg-card/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden z-20 transition-all duration-300">
            {/* Title Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/30 shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground select-none">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live Preview Map
              </span>
              <button
                onClick={() => setIsFloatingPreviewOpen(false)}
                className="hover:bg-muted p-0.5 rounded text-muted-foreground transition-all hover:text-foreground"
                title="Hide Preview Map"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            
            {/* Rendered Markdown Preview Area */}
            <div className="flex-1 p-3.5 overflow-y-auto select-text text-xs leading-normal bg-muted/5">
              {currentNote.summary.trim() === "" ? (
                <p className="text-[10px] text-muted-foreground/40 italic text-center py-10">Empty log entry</p>
              ) : (
                <div
                  className="prose dark:prose-invert text-[11px] leading-relaxed scale-95 origin-top-left"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(currentNote.summary),
                  }}
                />
              )}
            </div>
          </div>
        )}

      </div>

      {/* Grid of recent logged active days */}
      <div className="space-y-3 select-none mt-6 shrink-0">
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
          <TrendingUp className="h-4.5 w-4.5" />
          Workspace Log History
        </h3>

        {dailyNotes.length === 0 ? (
          <div className="text-xs text-muted-foreground italic bg-muted/5 p-3 rounded-lg border border-dashed border-border text-center">
            No log entries recorded. Start writing above to generate history.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {dailyNotes
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 3)
              .map((note) => {
                return (
                  <Card
                    key={note.date}
                    onClick={() => setSelectedDate(note.date)}
                    className={cn(
                      "hover:border-primary/50 transition-all duration-200 border-border bg-card shadow-none cursor-pointer flex flex-col justify-between group",
                      note.date === selectedDate ? "border-primary shadow-xs" : ""
                    )}
                  >
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between shrink-0">
                      <div>
                        <span className="text-xs font-bold text-foreground">
                          {new Date(note.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground bg-muted border border-border/40 px-2 py-0.5 rounded-md">
                        Log
                      </span>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-1">
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                        {note.summary || "No log entry."}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

    </div>
  );
}

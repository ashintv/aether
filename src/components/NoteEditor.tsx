import React, { useState, useRef, useEffect } from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/vs2015.css";
import {
  Star,
  Clock,
  Tag,
  Plus,
  X,
  Eye,
  Edit2,
  Columns,
  Bold,
  Italic,
  Code,
  Quote,
  Heading1,
  Heading2,
  List,
  ListTodo,
  Link,
  Info,
  ChevronUp,
  ChevronDown,
  FileText,
} from "lucide-react";
import { Note } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";

// Setup marked syntax highlighting using highlight.js
const renderer = new marked.Renderer();
const originalCode = renderer.code.bind(renderer);
renderer.code = function (token) {
  let text = "";
  let lang = "";
  if (typeof token === "object" && token !== null) {
    text = token.text;
    lang = token.lang || "";
  } else if (arguments.length >= 1) {
    text = arguments[0];
    lang = arguments[1] || "";
  }

  try {
    const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
    const highlighted = hljs.highlight(text, { language }).value;
    return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
  } catch (err) {
    if (typeof token === "object" && token !== null) {
      return originalCode(token);
    } else {
      return originalCode(text, lang);
    }
  }
};
marked.use({ renderer });

interface NoteEditorProps {
  note: Note | null;
  onUpdateNote: (note: Note) => void;
  onClose: () => void;
  editorMode: "edit" | "preview" | "split";
  onSetEditorMode: (mode: "edit" | "preview" | "split") => void;
  theme: "light" | "dark";
}

export function NoteEditor({
  note,
  onUpdateNote,
  onClose,
  editorMode,
  onSetEditorMode,
  theme,
}: NoteEditorProps) {
  const [newTag, setNewTag] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState<"saved" | "saving">("saved");
  const [isPropertiesExpanded, setIsPropertiesExpanded] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [isFloatingPreviewOpen, setIsFloatingPreviewOpen] = useState(true);
  const editorRef = useRef<any>(null);

  // If no note is selected, return fallback
  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground h-full bg-background select-none">
        <div className="text-center">
          <Info className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-semibold">No note selected</p>
          <p className="text-xs text-muted-foreground mt-1">Select a note from the sidebar to start writing.</p>
        </div>
      </div>
    );
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutosaveStatus("saving");
    onUpdateNote({
      ...note,
      title: e.target.value,
      updatedAt: Date.now(),
    });
    setTimeout(() => setAutosaveStatus("saved"), 800);
  };

  const handleContentChange = (value: string) => {
    setAutosaveStatus("saving");
    onUpdateNote({
      ...note,
      content: value,
      updatedAt: Date.now(),
    });
    setTimeout(() => setAutosaveStatus("saved"), 800);
  };

  const toggleFavorite = () => {
    onUpdateNote({
      ...note,
      favorite: !note.favorite,
      updatedAt: Date.now(),
    });
  };

  // Tag manipulation
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    const tag = newTag.trim();
    if (!note.tags.includes(tag)) {
      onUpdateNote({
        ...note,
        tags: [...note.tags, tag],
        updatedAt: Date.now(),
      });
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote({
      ...note,
      tags: note.tags.filter((t) => t !== tagToRemove),
      updatedAt: Date.now(),
    });
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
    if (!note || !note.content) return [];
    const lines = note.content.split("\n");
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
    } catch (e) {
      console.error("Markdown rendering error", e);
      return `<p class="text-red-500 font-bold">Error rendering markdown contents</p>`;
    }
  };

  // Formatting date string
  const formatFullDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative z-10 px-6 md:px-12 pb-6 pt-3 select-none">
      
      {/* Collapsible Metadata Accordion at Top */}
      <div className="border border-border/40 bg-muted/10 dark:bg-muted/5 rounded-lg mb-3 shrink-0">
        
        {/* Accordion Trigger Header */}
        <div
          className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-muted/20 transition-all rounded-lg"
          onClick={() => setIsPropertiesExpanded(!isPropertiesExpanded)}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="text-xs">📁</span>
            <span className="font-mono text-foreground font-bold truncate max-w-[200px]">
              {note.folder ? `${note.folder}/` : ""}{note.title || "Untitled"}.md
            </span>
            <span className="text-muted-foreground/40">•</span>
            {autosaveStatus === "saving" ? (
              <span className="text-primary font-bold animate-pulse">Saving...</span>
            ) : (
              <span className="text-muted-foreground/50">Saved</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite();
              }}
              title={note.favorite ? "Remove from Favorites" : "Add to Favorites"}
              className="h-6.5 w-6.5"
            >
              <Star className={cn("h-3.5 w-3.5", note.favorite ? "fill-amber-400 stroke-amber-400" : "text-muted-foreground")} />
            </Button>
            
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-muted-foreground bg-muted border border-border/40 px-2 py-0.5 rounded">
              <span>Properties</span>
              {isPropertiesExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </div>
          </div>
        </div>

        {/* Properties Drawer Details */}
        {isPropertiesExpanded && (
          <div className="p-3.5 border-t border-border/30 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-foreground/85">
            {/* Title / File name Edit */}
            <div className="flex items-center gap-3">
              <span className="w-20 font-bold text-muted-foreground shrink-0">File Name:</span>
              <input
                type="text"
                value={note.title}
                onChange={handleTitleChange}
                placeholder="Untitled Note"
                className="bg-transparent border-none outline-hidden p-0 font-bold text-foreground focus:ring-0 w-full text-xs"
              />
            </div>

            {/* Folder / Directory Path Edit */}
            <div className="flex items-center gap-3">
              <span className="w-20 font-bold text-muted-foreground shrink-0">Folder:</span>
              <Input
                placeholder="e.g. personal, work/projects"
                value={note.folder || ""}
                onChange={(e) => {
                  setAutosaveStatus("saving");
                  onUpdateNote({
                    ...note,
                    folder: e.target.value,
                    updatedAt: Date.now(),
                  });
                  setTimeout(() => setAutosaveStatus("saved"), 800);
                }}
                className="h-7 bg-background/50 border border-border hover:border-primary/50 focus:border-primary rounded-md text-xs px-2 flex-1"
              />
            </div>

            {/* Created timestamp */}
            <div className="flex items-center gap-3">
              <span className="w-20 font-bold text-muted-foreground shrink-0">Created At:</span>
              <span className="text-muted-foreground font-mono">{new Date(note.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Last updated timestamp */}
            <div className="flex items-center gap-3">
              <span className="w-20 font-bold text-muted-foreground shrink-0">Last Edited:</span>
              <span className="text-muted-foreground font-mono">{formatFullDate(note.updatedAt)}</span>
            </div>

            {/* Tags Property */}
            <div className="flex items-start gap-3 sm:col-span-2 border-t border-border/20 pt-3">
              <span className="w-20 font-bold text-muted-foreground mt-0.5 shrink-0">Tags:</span>
              <div className="flex flex-wrap gap-1.5 items-center">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted text-muted-foreground px-2 py-0.5 rounded-md flex items-center gap-1.5 font-bold border border-border/40 text-xs"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <form onSubmit={handleAddTag} className="inline-flex">
                  <Input
                    placeholder="+ Tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="h-6 w-16 bg-transparent border-dashed border-border hover:border-foreground rounded-md text-[10px] px-1.5 py-0"
                  />
                </form>
              </div>
            </div>
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
            <List className="h-4 w-4" />
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
          
          {/* Floating Live Preview Map (Bottom Right Overlay) Toggle - Only in Edit mode */}
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
            <List className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{isOutlineOpen ? "Hide Outline" : "Show Outline"}</span>
          </button>

          {/* Mode Toggles */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md shrink-0 border border-border/20">
            <button
              onClick={() => onSetEditorMode("edit")}
              className={cn(
                "px-2.5 py-0.5 text-xs font-bold rounded-sm flex items-center gap-1 transition-all",
                editorMode === "edit" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Edit2 className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={() => onSetEditorMode("preview")}
              className={cn(
                "px-2.5 py-0.5 text-xs font-bold rounded-sm flex items-center gap-1 transition-all",
                editorMode === "preview" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="h-3 w-3" /> Preview
            </button>
            <button
              onClick={() => onSetEditorMode("split")}
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
              value={note.content}
              onChange={(val) => handleContentChange(val || "")}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true }, // NATIVE VS CODE MINIMAP
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
            {note.content.trim() === "" ? (
              <p className="text-xs text-muted-foreground/50 italic text-center py-10">Empty document</p>
            ) : (
              <div
                className="prose dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(note.content),
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
              {note.content.trim() === "" ? (
                <p className="text-[10px] text-muted-foreground/40 italic text-center py-10">Empty document</p>
              ) : (
                <div
                  className="prose dark:prose-invert text-[11px] leading-relaxed scale-95 origin-top-left"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(note.content),
                  }}
                />
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

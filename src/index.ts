import { serve } from "bun";
import index from "./index.html";
import { join } from "path";
import { homedir } from "os";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "fs";

// Base directory path: ./user/.aethernote
const BASE_DIR = join(process.cwd(), "user", ".aethernote");
const NOTES_DIR = join(BASE_DIR, "notes");
const LOGS_DIR = join(BASE_DIR, "daily_logs");
const METADATA_PATH = join(BASE_DIR, "metadata.json");

// Ensure system directories exist
if (!existsSync(BASE_DIR)) mkdirSync(BASE_DIR, { recursive: true });
if (!existsSync(NOTES_DIR)) mkdirSync(NOTES_DIR, { recursive: true });
if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });

// Read metadata JSON file
function readMetadata() {
  if (!existsSync(METADATA_PATH)) {
    return { notes: {}, theme: "dark" };
  }
  try {
    return JSON.parse(readFileSync(METADATA_PATH, "utf-8"));
  } catch (e) {
    return { notes: {}, theme: "dark" };
  }
}

// Write metadata JSON file
function writeMetadata(data: any) {
  writeFileSync(METADATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// Recursively scan directories for markdown files
function scanDirectory(dir: string, relativePath = ""): { title: string; folder: string; content: string }[] {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir);
  let results: { title: string; folder: string; content: string }[] = [];

  for (const file of files) {
    const fullPath = join(dir, file);
    const rel = relativePath ? join(relativePath, file) : file;
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(scanDirectory(fullPath, rel));
    } else if (file.endsWith(".md")) {
      const title = file.substring(0, file.length - 3); // strip .md extension
      const folder = relativePath.replace(/\\/g, "/"); // normalize paths
      const content = readFileSync(fullPath, "utf-8");
      results.push({ title, folder, content });
    }
  }
  return results;
}

// Seed the folder structure on first boot
function seedWorkspaceIfEmpty() {
  const metadata = readMetadata();
  if (!metadata.notes || Object.keys(metadata.notes).length === 0) {
    console.log(`🌱 Seeding first-boot files inside ${BASE_DIR}...`);

    // Note 1
    const note1 = {
      id: "seed-personal-1",
      title: "Personal Learning Goals 2026",
      content: `# Personal Development & Learning Goals for 2026

It's going to be an exciting year. Here are the core areas I want to dive deep into:

## 1. Advanced Web Tech & Frameworks
- [ ] Learn **Rust** and compile modules to **WebAssembly** for performance-critical UI components.
- [x] Experiment with **Bun** & **Tailwind CSS v4** in project boilerplates.
- [ ] Understand the mechanics of **CRDTs (Conflict-free Replicated Data Types)** for real-time collaborative applications.

## 2. Reading List
- *Designing Data-Intensive Applications* by Martin Kleppmann.`,
      createdAt: Date.now() - 3600000 * 24,
      updatedAt: Date.now() - 3600000 * 12,
      favorite: true,
      tags: ["Self-Improvement", "Study"],
      folder: "Personal",
    };

    // Note 2
    const note2 = {
      id: "seed-personal-2",
      title: "App Idea: AetherNote brainstorming",
      content: `# AetherNote — Brainstorming & Architecture

A sleek, local-first markdown note-taking app with a VS Code like editor structure.

## Key Focus Areas:
- **Collapsible Layouts**: Clean Accordion top panel metadata drawer.
- **Widescreen Editor**: Monaco Editor engine with code minimap.
- **Outline Map Panel**: Headers Table of Contents navigation on click.`,
      createdAt: Date.now() - 3600000 * 4,
      updatedAt: Date.now() - 3600000 * 4,
      favorite: false,
      tags: ["Side Projects", "React"],
      folder: "Work/Ideas",
    };

    // Write note 1 to disk
    const note1Dir = join(NOTES_DIR, note1.folder);
    if (!existsSync(note1Dir)) mkdirSync(note1Dir, { recursive: true });
    writeFileSync(join(note1Dir, `${note1.title}.md`), note1.content, "utf-8");

    // Write note 2 to disk
    const note2Dir = join(NOTES_DIR, note2.folder);
    if (!existsSync(note2Dir)) mkdirSync(note2Dir, { recursive: true });
    writeFileSync(join(note2Dir, `${note2.title}.md`), note2.content, "utf-8");

    // Seed log note
    const todayStr = new Date().toISOString().split("T")[0];
    writeFileSync(join(LOGS_DIR, `${todayStr}.log`), `# Log entry for ${todayStr}\n\nToday was focused on setting up local system disk persistence!`, "utf-8");

    // Save metadata
    metadata.notes = {
      [note1.id]: {
        id: note1.id,
        title: note1.title,
        folder: note1.folder,
        createdAt: note1.createdAt,
        updatedAt: note1.updatedAt,
        favorite: note1.favorite,
        tags: note1.tags,
      },
      [note2.id]: {
        id: note2.id,
        title: note2.title,
        folder: note2.folder,
        createdAt: note2.createdAt,
        updatedAt: note2.updatedAt,
        favorite: note2.favorite,
        tags: note2.tags,
      },
    };
    writeMetadata(metadata);
  }
}

// Initialize seed check
seedWorkspaceIfEmpty();

// Clean up unsafe filename characters
function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3323;

const server = serve({
  port: PORT,
  routes: {
    // GET Workspace data (Notes, daily log notes, theme)
    "/api/workspace": async () => {
      const metadata = readMetadata();
      const scannedNotes = scanDirectory(NOTES_DIR);
      const notesList: any[] = [];

      scannedNotes.forEach((scanned) => {
        // Find existing metadata entry
        let meta = Object.values(metadata.notes).find(
          (m: any) => m.title === scanned.title && m.folder === scanned.folder
        ) as any;

        if (!meta) {
          // Create orphan metadata entry
          const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          meta = {
            id,
            title: scanned.title,
            folder: scanned.folder,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            favorite: false,
            tags: [],
          };
          metadata.notes[id] = meta;
        }

        notesList.push({
          ...meta,
          content: scanned.content,
        });
      });

      // Save metadata in case we created new keys for newly scanned orphans
      writeMetadata(metadata);

      // Load all daily logs from directory
      const dailyNotesList: any[] = [];
      if (existsSync(LOGS_DIR)) {
        const logFiles = readdirSync(LOGS_DIR);
        logFiles.forEach((file) => {
          if (file.endsWith(".log")) {
            const date = file.substring(0, file.length - 4);
            const content = readFileSync(join(LOGS_DIR, file), "utf-8");
            dailyNotesList.push({
              date,
              summary: content,
            });
          }
        });
      }

      return Response.json({
        notes: notesList,
        dailyNotes: dailyNotesList,
        theme: metadata.theme || "dark",
      });
    },

    // SAVE Note
    "/api/notes/save": {
      async POST(req) {
        const payload = await req.json();
        const { id, title, content, folder, favorite, tags, createdAt, updatedAt } = payload;
        
        const metadata = readMetadata();
        
        // Check if file is renamed/moved to clean up old path
        const oldNote = metadata.notes[id];
        if (oldNote && (oldNote.title !== title || oldNote.folder !== folder)) {
          const oldFileDir = join(NOTES_DIR, oldNote.folder || "");
          const oldFilePath = join(oldFileDir, `${sanitizeFilename(oldNote.title)}.md`);
          if (existsSync(oldFilePath)) {
            try {
              rmSync(oldFilePath);
            } catch (e) {
              console.error("Clean up renaming error", e);
            }
          }
        }

        // Create new directory path if doesn't exist
        const targetDir = join(NOTES_DIR, folder || "");
        if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

        // Save content to markdown file
        const sanitizedTitle = sanitizeFilename(title || "Untitled");
        const filePath = join(targetDir, `${sanitizedTitle}.md`);
        writeFileSync(filePath, content || "", "utf-8");

        // Save metadata entry
        metadata.notes[id] = {
          id,
          title,
          folder: folder || "",
          favorite: !!favorite,
          tags: tags || [],
          createdAt: createdAt || Date.now(),
          updatedAt: updatedAt || Date.now(),
        };

        writeMetadata(metadata);
        return Response.json({ success: true });
      },
    },

    // DELETE Note
    "/api/notes/delete": {
      async POST(req) {
        const { id } = await req.json();
        const metadata = readMetadata();
        const note = metadata.notes[id];

        if (note) {
          const filePath = join(NOTES_DIR, note.folder || "", `${sanitizeFilename(note.title)}.md`);
          if (existsSync(filePath)) {
            try {
              rmSync(filePath);
            } catch (e) {
              console.error("Failed deleting note file on disk", e);
            }
          }
          delete metadata.notes[id];
          writeMetadata(metadata);
        }

        return Response.json({ success: true });
      },
    },

    // SAVE Daily Log Note
    "/api/logs/save": {
      async POST(req) {
        const { date, summary } = await req.json();
        
        // Ensure folder directory exists
        if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });

        const filePath = join(LOGS_DIR, `${date}.log`);
        writeFileSync(filePath, summary || "", "utf-8");

        return Response.json({ success: true });
      },
    },

    // SAVE Active UI Theme
    "/api/theme/save": {
      async POST(req) {
        const { theme } = await req.json();
        const metadata = readMetadata();
        metadata.theme = theme;
        writeMetadata(metadata);
        return Response.json({ success: true });
      },
    },

    // RESET Database
    "/api/workspace/reset": {
      async POST() {
        if (existsSync(METADATA_PATH)) rmSync(METADATA_PATH);
        
        // Clean folders recursively
        if (existsSync(NOTES_DIR)) {
          rmSync(NOTES_DIR, { recursive: true });
          mkdirSync(NOTES_DIR, { recursive: true });
        }
        if (existsSync(LOGS_DIR)) {
          rmSync(LOGS_DIR, { recursive: true });
          mkdirSync(LOGS_DIR, { recursive: true });
        }

        // Reseed initial seed contents
        seedWorkspaceIfEmpty();

        return Response.json({ success: true });
      },
    },

    // Serve static files and fallback to index.html
    "/*": async (req) => {
      const url = new URL(req.url);
      const pathname = url.pathname;
      
      // Serve static assets from dist/ if they exist
      const distFilePath = join(import.meta.dir, "..", "dist", pathname);
      if (pathname !== "/" && existsSync(distFilePath) && !statSync(distFilePath).isDirectory()) {
        return new Response(Bun.file(distFilePath));
      }
      
      const isProduction = process.env.NODE_ENV === "production";
      const indexPath = isProduction 
        ? join(import.meta.dir, "..", "dist", "index.html")
        : join(import.meta.dir, "index.html");
        
      if (existsSync(indexPath)) {
        return new Response(Bun.file(indexPath));
      }
      
      return new Response("Not Found", { status: 404 });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 System Server running at ${server.url}`);
console.log(`📂 System Workspace directory points to: ${BASE_DIR}`);

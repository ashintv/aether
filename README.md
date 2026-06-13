# AetherNote

A sleek, VS Code styled local-first markdown note-taking and daily log workspace built with Bun, React, Tailwind CSS, and Monaco Editor.

## 🚀 Global Terminal Installation & Usage

You can install and run AetherNote globally directly from your terminal.

### 1. Installation
Install the application globally via npm:
```bash
npm install -g https://github.com/ashintv/aether.git
```
*(Or if you use Bun, run `bun install -g https://github.com/ashintv/aether.git`)*

### 2. Usage
Run AetherNote from any terminal directory:
```bash
aethernote
```
By default, the server runs on port **3323** and sets up the workspace directory under the current working directory at `./user/.aethernote` (relative to where you started the command).

To override the default port, specify the `AETHERNOTE_PORT` environment variable:
```bash
AETHERNOTE_PORT=8080 aethernote
```

---

## 🛠️ Local Development & Contributing

To build and run the application locally for development:

1. **Install dependencies**:
   ```bash
   bun install
   ```
2. **Build frontend assets**:
   ```bash
   bun run build
   ```
3. **Start the development server**:
   ```bash
   bun run dev
   ```
4. Open the application at [http://localhost:3323](http://localhost:3323).

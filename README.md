# GitVibes — Git for Vibe Coders

An interactive, visual guide to Git for developers who use AI-assisted coding tools like GitHub Copilot, Cursor, and Claude Code.

**[Live Site →](https://neovand.github.io/gitvibes/)**

![GitVibes — Git for Vibe Coders](static/images/Hero.webp)

## What is this?

GitVibes teaches Git through the lens of AI-assisted development. Instead of dry reference docs, it walks through real scenarios — _"the AI just changed 10 files, what do I do?"_ — with cinematic section banners, interactive playgrounds, Mermaid diagrams, and step-by-step VS Code screenshots.

### Curriculum

| Part                         | Topics                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Introduction**             | What Git is, installing Git, what a repository is                                                                  |
| **1. Enterprise Onboarding** | Git config, authentication, cloning, `.gitignore` & secrets hygiene, Git hooks                                     |
| **2. Core Safety Loop**      | `git status` → stage → commit, reviewing AI changes                                                                |
| **3. Branching & PRs**       | Branches, fetch/pull/push, pull requests                                                                           |
| **4. Undo Toolkit**          | Restore, unstage, amend, reset, revert, force-with-lease, recovery matrix, detached HEAD, reflog rescue            |
| **5. Advanced Workflows**    | Stash, rebase vs merge, merge conflicts, cherry-pick, rebase conflict recovery, tags & releases                    |
| **6. VS Code Cockpit**       | Source Control, Timeline & GitLens, 3-way merge editor                                                             |
| **7. Conclusion**            | AI-first workflow, quick reference card, teaching agents Git (`AGENTS.md`, skills), parallel agents with worktrees |

### Features

- **Git Playground** — run real Git commands in the browser (isomorphic-git), opened as a sidebar panel from anywhere on the site
- **Try it yourself** — embedded playground tabs in hands-on lessons (Parts 2–5)
- **Expandable banners** — click any section poster to open a full-screen lightbox
- **VS Code screenshots** — real UI with hover-to-expand and captions
- **Vibe prompts** — copy-paste AI prompts for common Git workflows
- **Search** — `⌘K` / `Ctrl+K` command palette across the whole tutorial
- **Cheat sheet** — quick command reference from the header
- **Light / dark theme**
- **Fully static** — no backend; deploys to GitHub Pages

## How the Git Playground works

The playground lets you run real Git commands in the browser — no server, no sandboxed iframe. It pairs [isomorphic-git](https://isomorphic-git.org/) (a full Git implementation in JavaScript) with [LightningFS](https://github.com/nicolo-ribaudo/lightning-fs) (an in-memory virtual filesystem backed by IndexedDB) so every `git commit`, `git merge`, and `git stash` behaves like the real thing.

```mermaid
flowchart TD
    subgraph Browser["Browser (no backend)"]
        Input["⌨️ User types a command\n<code>git commit -m 'fix bug'</code>"]
        Parse["Parse & dispatch\n<b>commands.ts</b>"]
        Engine["Run Git operation\n<b>git-engine.ts</b>"]

        subgraph VFS["Virtual Filesystem (LightningFS)"]
            FS["In-memory <code>/repo</code>\nfiles, staging area, .git/"]
        end

        subgraph GitImpl["Git Implementation (isomorphic-git)"]
            Ops["init · add · commit\nmerge · rebase · stash\nbranch · checkout · …"]
        end

        Remote["Simulated origin remote\n<b>remote-state.ts</b>\n(fetch / push without network)"]

        Output["Format & colorize output\nHTML-styled terminal lines"]
        Graph["Build Mermaid git graph\n<b>git-graph.ts</b>"]
        Terminal["🖥️ Terminal output"]
        Diagram["📊 Live commit graph (SVG)"]
    end

    Input --> Parse
    Parse --> Engine
    Engine <--> FS
    Engine <--> Ops
    Engine <--> Remote
    Engine --> Output
    Engine --> Graph
    Output --> Terminal
    Graph --> Diagram

    style Browser fill:transparent,stroke:#555,stroke-width:1px
    style VFS fill:transparent,stroke:#7aa2f7,stroke-width:1px,stroke-dasharray:5
    style GitImpl fill:transparent,stroke:#9ece6a,stroke-width:1px,stroke-dasharray:5
```

After every command, both the terminal and the commit graph update in sync — so you can see the effect of each operation instantly. Scenarios pre-seed the virtual repo with commits, branches, and working-tree changes to set up each lesson.

## Tech stack

| Layer          | Tool                                          |
| -------------- | --------------------------------------------- |
| Framework      | [SvelteKit](https://svelte.dev) (Svelte 5)    |
| Styling        | [Tailwind CSS](https://tailwindcss.com) v4    |
| In-browser Git | [isomorphic-git](https://isomorphic-git.org/) |
| Diagrams       | [Mermaid.js](https://mermaid.js.org)          |
| Icons          | [Lucide](https://lucide.dev)                  |
| Testing        | [Playwright](https://playwright.dev)          |
| Hosting        | GitHub Pages (`@sveltejs/adapter-static`)     |

## Getting started

```bash
git clone https://github.com/NeoVand/gitvibes.git
cd gitvibes
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start dev server                   |
| `npm run build`   | Production build → `build/`        |
| `npm run preview` | Preview production build           |
| `npm run check`   | Type-check                         |
| `npm run lint`    | Prettier + ESLint                  |
| `npm run test`    | Vitest unit + Playwright e2e tests |

## Assets

Section banner images live in `static/images/` (kebab-case filenames). Image generation prompts for creating or updating posters are in [`docs/IMAGE_PROMPTS.md`](docs/IMAGE_PROMPTS.md). Drop new art in as PNG and run `node scripts/optimize-images.mjs` to convert it to WebP.

VS Code screenshots under `static/images/vscode/` are from the [Visual Studio Code documentation](https://code.visualstudio.com/docs/sourcecontrol/overview) (© Microsoft, [CC BY 3.0](https://github.com/microsoft/vscode-docs/blob/main/License.md)), vendored so the site has no runtime dependency on the docs CDN.

## Deployment

Pushes to `main` deploy automatically to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## License

MIT

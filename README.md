# GitVibes — Git for Vibe Coders

An interactive, visual guide to Git and version control for developers who use AI-assisted coding tools like GitHub Copilot, Cursor, and Claude Code.

**[Live Site →](https://neovand.github.io/gitvibes/)**

## What is this?

GitVibes is a beginner-friendly tutorial that teaches Git through the lens of AI-assisted development. Instead of dry reference docs, it walks you through real scenarios — "the AI just changed 10 files, what do I do?" — with interactive sandboxes, Mermaid diagrams, and step-by-step VS Code screenshots.

### Topics covered

1. **Enterprise Onboarding** — Cloning repos, authentication, SSH vs HTTPS
2. **The Core Safety Loop** — Status → Stage → Commit, reviewing AI changes
3. **Branching & PRs** — Creating branches, syncing, pull requests
4. **The Undo Toolkit** — Checkout, revert, reset, amending commits
5. **Advanced Workflows** — Stash, rebase vs merge, conflict resolution
6. **VS Code Cockpit** — Source Control view, Timeline, GitLens, 3-way merge editor
7. **Cheat Sheet** — Quick reference for common commands

### Features

- Interactive Git sandboxes that simulate real workflows
- Real VS Code screenshots with step-by-step instructions
- Mermaid diagrams for visualizing branching and commit history
- Light/dark theme support
- Searchable command reference
- Fully static — no backend required

## Tech stack

| Layer | Tool |
|-------|------|
| Framework | [SvelteKit](https://svelte.dev) (Svelte 5) |
| Styling | [Tailwind CSS](https://tailwindcss.com) v4 |
| Diagrams | [Mermaid.js](https://mermaid.js.org) |
| Icons | [Lucide](https://lucide.dev) |
| Markdown | [mdsvex](https://mdsvex.pngwn.io) |
| Hosting | GitHub Pages (static adapter) |

## Getting started

```bash
# Clone the repo
git clone https://github.com/NeoVand/gitvibes.git
cd gitvibes

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view it locally.

## Building

```bash
npm run build
npm run preview  # preview the production build
```

The static site is output to the `build/` directory.

## Deployment

This project deploys automatically to GitHub Pages on every push to `main` via GitHub Actions. The workflow is defined in `.github/workflows/deploy.yml`.

## License

MIT

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

This is a new project directory under the `VibeCoding` workspace. The parent workspace (`C:\Users\User\Desktop\VibeCoding`) contains related learning projects (Study-01~04, DailyTask) whose architecture patterns are documented in the parent `CLAUDE.md`.

## Shared patterns from the parent workspace

When this project is built as a **Python/Tkinter app**, follow these conventions established by Study-01~04:

- Split model/logic into a plain class, mount it inside a `*App(tk.Tk)` class
- Long operations go in `threading.Thread(daemon=True)`; UI callbacks always via `root.after(0, fn)`
- Dark theme: Catppuccin Mocha (`base #1e1e2e`, `surface #313244`) defined in a `COLORS` or `C` dict at module top
- Entry point: `main()` creates `tk.Tk()`, instantiates the app class, calls `mainloop()`, guarded by `if __name__ == "__main__"`

When this project is built as a **vanilla web app** (like DailyTask), follow these conventions:

- Plain HTML/CSS/JS — no build step, no framework
- State is persisted in `localStorage`
- UI updates are driven by a single `render()` call after every state mutation

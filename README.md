# Microsoft To Do Clone

A modern, responsive, client-side clone of Microsoft To Do. Built purely with semantic HTML5, vanilla CSS, and vanilla JavaScript—running completely in the browser with zero backend dependencies.

---

## 🌟 Key Features

- **Personal & Smart Lists**: Manage built-in lists (Tasks, Important) along with custom user-created lists.
- **Task Management**: Create, toggle completion, star as important, and delete tasks.
- **Inline Editing**: Double-click any task title to edit it inline with an auto-resizing input box.
- **Global Search**: Search globally across all lists. When search is active, the workspace presents a clean results view with badges indicating each item's originating list.
- **Drag and Drop**: Drag tasks from the viewport and drop them onto sidebar list items to reorganize them.
- **State Persistence**: State is automatically persisted in the browser's `localStorage` (under the key `ms_todo_clone_state`), preserving your lists and tasks between page reloads.
- **Premium Design System**: Clean visual layouts featuring modern typography, hover animations, glassmorphism overlays, custom scrollbars, and a signature Royal Blue theme.

---

## 🚀 Getting Started

Since this project has no build steps or external package dependencies, you can run it directly:

1. Clone or download this repository.
2. Open [`index.html`](file:///Users/russell/personal/repos/web-todo-like-mstodo/index.html) directly in any modern web browser.
3. *Alternative (Recommended)*: Serve it locally using a simple HTTP dev server for optimal performance and console logging:
   ```bash
   npx serve .
   ```

---

## 📂 Project Structure

- [`index.html`](file:///Users/russell/personal/repos/web-todo-like-mstodo/index.html): Core page layout, sidebar structure, and modal controls.
- [`style.css`](file:///Users/russell/personal/repos/web-todo-like-mstodo/style.css): Custom design system tokens, responsive styling, active layout cards, and transitions.
- [`app.js`](file:///Users/russell/personal/repos/web-todo-like-mstodo/app.js): Application logic, drag-and-drop handlers, local persistence, and viewport rendering.
- [`AGENTS.md`](file:///Users/russell/personal/repos/web-todo-like-mstodo/AGENTS.md): Architecture constraints and development workflows for AI code assistants working on the repository.

---

## 📜 License

This project is licensed under the **GNU General Public License v3 (GPL v3)**. See the license details for copyleft and distribution terms.

# To Do - Agent Guidelines

This file defines the project architecture, constraints, state management patterns, and guidelines for AI agents working on this repository.

---

## 1. Project Overview & Tech Stack
This project is a client-side version of To Do. It is a single-page application with no backend dependencies.
- **Markup**: Semantic HTML5 in [`index.html`](file:///Users/russell/personal/repos/web-todo-like-mstodo/index.html)
- **Styling**: Vanilla CSS in [`style.css`](file:///Users/russell/personal/repos/web-todo-like-mstodo/style.css). Features a modern, vibrant blue design with hover transitions and micro-animations.
- **Logic**: Pure client-side JavaScript in [`app.js`](file:///Users/russell/personal/repos/web-todo-like-mstodo/app.js)

---

## 2. State & Persistence
All data is stored in the browser's `localStorage` under the key `ms_todo_state`.
- **State Object Structure**:
  ```javascript
  const state = {
    lists: [
      { id: 'tasks', name: 'Tasks', theme: 'theme-default', isDefault: true },
      { id: 'personal', name: 'Personal 🏠', theme: 'theme-default', isDefault: false },
      // ...
    ],
    todos: [
      { id: 'todo-1', listId: 'tasks', text: 'Task text 🌟', completed: false, starred: true, createdAt: 123456789 },
      // ...
    ],
    activeListId: 'tasks',
    editingTodoId: null,
    searchQuery: ''
  };
  ```

### Development Guidelines for State Changes:
1. **Never modify DOM nodes directly** to add/remove todo cards or list nav links.
2. Update the `state` object first.
3. Call `saveState()` to persist modifications.
4. Call `render()` to update the sidebar and workspace viewports.

---

## 3. UI & Styling Rules
- **CSS Variable Guidelines**: Follow the design system tokens defined at the top of [`style.css`](file:///Users/russell/personal/repos/web-todo-like-mstodo/style.css).
- **Theme Constraints**: The application forces a default Royal Blue theme (`theme-default`) on the body element. Do not introduce new theme overlays without explicit user request.
- **Emoji Support**: All input elements (list titles, task items) use native text inputs, textareas, or `contenteditable` nodes. Emojis must be supported out of the box using native OS emoji shortcuts (e.g., `Cmd + Ctrl + Space` on macOS) or copy-paste.

---

## 4. Key Functional Workflows

### Global Search
- When a search query is active (`state.searchQuery` is non-empty):
  - Search results are fetched **globally** across all lists.
  - The main header title changes to `"Search Results"`.
  - The sub-header shows the query context: `"Showing matches for \"[query]\""`.
  - The new-task input bar (`.todo-input-bar`) is hidden.
  - Todo cards render list name badges with the class `.todo-list-badge.search-result-badge` (styled at `12px` font size for readability).
- Clearing the search input immediately restores the active list view, header metadata, and task input bar.

### Inline Editing
- Double-clicking a task title (`.todo-text`) renders an inline textarea (`.todo-edit-input`) using auto-resizing height to let users edit the task description in place.

### Drag and Drop
- User lists in the sidebar act as HTML5 drag-and-drop target containers. Dragging a todo item and dropping it on a sidebar list item moves that todo to the corresponding list.

---

## 5. Coding Standards for Agents
- **Clean Code & Comments**: Keep inline documentation clean. Retain any existing comments or structures that are unrelated to your changes.
- **No Build Tools**: Do not add build scripts, minifiers, bundlers, or packages unless explicitly requested. The project is designed to run directly via browser index loading or simple HTTP dev servers.

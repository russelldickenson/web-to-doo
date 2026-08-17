// Application State and Persistence
const OLD_STORAGE_KEY = 'ms_todo_clone_state';
const STORAGE_KEY = 'ms_todo_state';

// Migrate legacy state if present
if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(OLD_STORAGE_KEY)) {
  localStorage.setItem(STORAGE_KEY, localStorage.getItem(OLD_STORAGE_KEY));
  localStorage.removeItem(OLD_STORAGE_KEY);
}

const defaultState = {
  lists: [
    { id: 'tasks', name: 'All', theme: 'theme-default', isDefault: true },
    { id: 'personal', name: 'Personal 🏠', theme: 'theme-default', isDefault: false },
    { id: 'work', name: 'Work 💼', theme: 'theme-default', isDefault: false }
  ],
  todos: [
    { id: 'todo-1', listId: 'tasks', text: 'Welcome to To Do! 🌟', completed: false, starred: true, createdAt: Date.now() - 3600000, steps: [] },
    { id: 'todo-2', listId: 'tasks', text: 'Double-click/click this task title to edit inline ✏️', completed: false, starred: false, createdAt: Date.now() - 1800000, steps: [] },
    { id: 'todo-3', listId: 'personal', text: 'Buy fresh groceries', completed: false, starred: false, createdAt: Date.now(), steps: [] },
    { id: 'todo-4', listId: 'work', text: 'Schedule product review session', completed: true, starred: true, createdAt: Date.now() - 7200000, steps: [] }
  ],
  activeListId: 'tasks',
  editingTodoId: null,
  creatingListId: null,
  selectedTodoId: null,
  searchQuery: ''
};

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure all fields are present and valid
      if (parsed && Array.isArray(parsed.lists) && Array.isArray(parsed.todos)) {
        parsed.searchQuery = '';
        parsed.editingTodoId = null;
        parsed.creatingListId = null;
        parsed.selectedTodoId = null; // Close detail panel on reload/fresh start
        
        // Migrate legacy default list name from Tasks to All
        parsed.lists.forEach(l => {
          if (l.id === 'tasks' && l.name === 'Tasks') {
            l.name = 'All';
          }
        });

        // Ensure steps is defined on all loaded todos
        parsed.todos.forEach(t => {
          if (!t.steps) t.steps = [];
        });

        // Verify activeListId exists, otherwise reset to default
        const listExists = parsed.lists.some(l => l.id === parsed.activeListId) || parsed.activeListId === 'important';
        if (!listExists) {
          parsed.activeListId = 'tasks';
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load local storage state, using default:", e);
  }
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state to local storage:", e);
  }
}

// Dialog Controller Promises
let deleteConfirmResolver = null;
let deleteListConfirmResolver = null;
let moveSelectResolver = null;

// DOM Elements Cache
const sidebar = document.getElementById('sidebar');
const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
const sidebarExpandBtn = document.getElementById('sidebarExpandBtn');
const searchInput = document.getElementById('searchInput');
const customListsContainer = document.getElementById('customListsContainer');
const newListBtn = document.getElementById('newListBtn');

const mainContent = document.getElementById('mainContent');
const activeListTitle = document.getElementById('activeListTitle');
const editListTitleBtn = document.getElementById('editListTitleBtn');
const listSubtitle = document.getElementById('listSubtitle');
const deleteListBtn = document.getElementById('deleteListBtn');

const newTodoForm = document.getElementById('newTodoForm');
const newTodoInput = document.getElementById('newTodoInput');
const activeTodoList = document.getElementById('activeTodoList');
const completedSection = document.getElementById('completedSection');
const completedHeader = document.getElementById('completedHeader');
const completedBadge = document.getElementById('completedBadge');
const completedTodoList = document.getElementById('completedTodoList');
const emptyState = document.getElementById('emptyState');

// Detail Panel DOM Elements Cache
const detailPanel = document.getElementById('detailPanel');
const detailCloseBtn = document.getElementById('detailCloseBtn');
const detailProgressContainer = document.getElementById('detailProgressContainer');
const detailProgressBar = document.getElementById('detailProgressBar');
const detailTodoCheckbox = document.getElementById('detailTodoCheckbox');
const detailTodoText = document.getElementById('detailTodoText');
const detailStarBtn = document.getElementById('detailStarBtn');
const detailStepsList = document.getElementById('detailStepsList');
const newStepForm = document.getElementById('newStepForm');
const newStepInput = document.getElementById('newStepInput');
const detailCreatedDate = document.getElementById('detailCreatedDate');
const detailDeleteTaskBtn = document.getElementById('detailDeleteTaskBtn');

// Modals
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');

const deleteListConfirmModal = document.getElementById('deleteListConfirmModal');
const deleteListCancelBtn = document.getElementById('deleteListCancelBtn');
const deleteListConfirmBtn = document.getElementById('deleteListConfirmBtn');

const moveTaskModal = document.getElementById('moveTaskModal');
const moveSelectListOptions = document.getElementById('moveSelectListOptions');
const moveCancelBtn = document.getElementById('moveCancelBtn');

// Initialize App
function init() {
  setupEventListeners();
  render();
}

// Add new todo action
function addNewTodo() {
  const text = newTodoInput.value.trim();
  if (!text) return;

  const id = 'todo-' + Date.now();
  
  // To Do: Adding task in "Starred" puts it in All & stars it
  let targetListId = state.activeListId;
  let starredState = false;
  
  if (state.activeListId === 'important') {
    targetListId = 'tasks';
    starredState = true;
  }

  state.todos.push({
    id: id,
    listId: targetListId,
    text: text,
    completed: false,
    starred: starredState,
    createdAt: Date.now(),
    steps: []
  });

  newTodoInput.value = '';
  saveState();
  render();
}

// Setup Global Event Listeners
function setupEventListeners() {
  // Sidebar Collapse / Expand Toggle
  sidebarCollapseBtn.addEventListener('click', () => {
    sidebar.classList.remove('show');
  });
  
  sidebarExpandBtn.addEventListener('click', () => {
    sidebar.classList.add('show');
  });

  // Search input change handler
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    state.selectedTodoId = null; // Close detail panel when searching
    renderWorkspace();
  });

  // Custom List creation button
  newListBtn.addEventListener('click', () => {
    if (state.creatingListId) return;
    
    const id = 'list-' + Date.now();
    state.lists.push({
      id: id,
      name: '',
      theme: getRandomTheme(),
      isDefault: false
    });

    state.activeListId = id;
    state.creatingListId = id;
    saveState();
    renderSidebar();
    focusNewListInput();
  });

  // Built-in lists navigation
  document.getElementById('navImportant').addEventListener('click', (e) => {
    e.preventDefault();
    setActiveList('important');
  });

  document.getElementById('navTasks').addEventListener('click', (e) => {
    e.preventDefault();
    setActiveList('tasks');
  });

  // Event delegation for custom lists selection
  customListsContainer.addEventListener('click', (e) => {
    const navLink = e.target.closest('.nav-link');
    if (!navLink) return;
    
    e.preventDefault();
    const item = navLink.closest('.nav-item');
    const listId = item.dataset.listId;
    setActiveList(listId);
  });

  // Add new todo form submit
  newTodoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addNewTodo();
  });

  // Enter keydown backup for cross-browser reliability
  newTodoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewTodo();
    }
  });

  // Completed Section Expand/Collapse Toggle
  completedHeader.addEventListener('click', () => {
    const isExpanded = completedHeader.getAttribute('aria-expanded') === 'true';
    completedHeader.setAttribute('aria-expanded', !isExpanded);
  });

  // (Theme customization listeners removed)

  // Edit list title behavior
  editListTitleBtn.addEventListener('click', () => {
    enableListTitleEditing();
  });

  activeListTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      activeListTitle.blur();
    }
  });

  activeListTitle.addEventListener('blur', () => {
    saveListTitleRename();
  });

  // Delete current active list button
  deleteListBtn.addEventListener('click', () => {
    const activeList = state.lists.find(l => l.id === state.activeListId);
    if (!activeList || activeList.isDefault) return;

    showListDeleteConfirmModal(activeList.name).then(confirmed => {
      if (confirmed) {
        // Delete all todos belonging to this list
        state.todos = state.todos.filter(t => t.listId !== activeList.id);
        // Delete list itself
        state.lists = state.lists.filter(l => l.id !== activeList.id);
        // Reset active list to default tasks
        state.activeListId = 'tasks';
        saveState();
        render();
      }
    });
  });

  // Delete Task Modal button listeners
  deleteConfirmBtn.addEventListener('click', () => {
    closeDeleteConfirmModal(true);
  });
  deleteCancelBtn.addEventListener('click', () => {
    closeDeleteConfirmModal(false);
  });

  // Delete List Modal button listeners
  deleteListConfirmBtn.addEventListener('click', () => {
    closeDeleteListConfirmModal(true);
  });
  deleteListCancelBtn.addEventListener('click', () => {
    closeDeleteListConfirmModal(false);
  });

  // Move Task Modal button listeners
  moveCancelBtn.addEventListener('click', () => {
    closeMoveTaskModal(null);
  });
  moveSelectListOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.select-option-btn');
    if (!btn) return;
    closeMoveTaskModal(btn.dataset.listId);
  });

  // Sidebar HTML5 Drag and Drop Target Listeners
  sidebar.addEventListener('dragover', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
      e.preventDefault(); // crucial to allow drop!
      e.dataTransfer.dropEffect = 'move';
      const current = document.querySelector('.sidebar .nav-item.drag-hover');
      if (current !== navItem) {
        if (current) current.classList.remove('drag-hover');
        navItem.classList.add('drag-hover');
      }
    }
  });

  sidebar.addEventListener('dragenter', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
      e.preventDefault();
      const current = document.querySelector('.sidebar .nav-item.drag-hover');
      if (current !== navItem) {
        if (current) current.classList.remove('drag-hover');
        navItem.classList.add('drag-hover');
      }
    }
  });

  sidebar.addEventListener('dragleave', (e) => {
    // Only remove if leaving the sidebar completely
    if (!e.relatedTarget || !sidebar.contains(e.relatedTarget)) {
      document.querySelectorAll('.sidebar .nav-item.drag-hover').forEach(el => el.classList.remove('drag-hover'));
    }
  });

  sidebar.addEventListener('drop', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
      e.preventDefault();
      navItem.classList.remove('drag-hover');
      const todoId = e.dataTransfer.getData('text/plain');
      const targetListId = navItem.dataset.listId;
      
      if (todoId && targetListId) {
        moveTodoToList(todoId, targetListId);
      }
    }
    document.querySelectorAll('.sidebar .nav-item.drag-hover').forEach(el => el.classList.remove('drag-hover'));
    document.body.classList.remove('is-dragging');
  });

  // Detail Panel Listeners
  detailCloseBtn.addEventListener('click', () => {
    state.selectedTodoId = null;
    saveState();
    render();
  });

  detailTodoCheckbox.addEventListener('click', () => {
    if (!state.selectedTodoId) return;
    const todo = state.todos.find(t => t.id === state.selectedTodoId);
    if (todo) {
      todo.completed = !todo.completed;
      saveState();
      render();
    }
  });

  detailStarBtn.addEventListener('click', () => {
    if (!state.selectedTodoId) return;
    const todo = state.todos.find(t => t.id === state.selectedTodoId);
    if (todo) {
      todo.starred = !todo.starred;
      saveState();
      render();
    }
  });

  detailTodoText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      detailTodoText.blur();
    }
  });

  detailTodoText.addEventListener('blur', () => {
    if (!state.selectedTodoId) return;
    const todo = state.todos.find(t => t.id === state.selectedTodoId);
    const val = detailTodoText.value.trim();
    if (todo && val && val !== todo.text) {
      todo.text = val;
      saveState();
      render();
    } else if (todo) {
      detailTodoText.value = todo.text;
    }
  });

  detailTodoText.addEventListener('input', () => {
    detailTodoText.style.height = 'auto';
    detailTodoText.style.height = detailTodoText.scrollHeight + 'px';
  });

  detailDeleteTaskBtn.addEventListener('click', () => {
    if (!state.selectedTodoId) return;
    const todo = state.todos.find(t => t.id === state.selectedTodoId);
    if (!todo) return;
    showDeleteConfirmModal(todo.text).then(confirmed => {
      if (confirmed) {
        state.todos = state.todos.filter(t => t.id !== todo.id);
        state.selectedTodoId = null;
        saveState();
        render();
      }
    });
  });

  newStepForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = newStepInput.value.trim();
    if (!val || !state.selectedTodoId) return;
    const todo = state.todos.find(t => t.id === state.selectedTodoId);
    if (todo) {
      if (!todo.steps) todo.steps = [];
      todo.steps.push({
        id: 'step-' + Date.now(),
        text: val,
        completed: false
      });
      newStepInput.value = '';
      saveState();
      renderDetailPanel();
    }
  });
}

function moveTodoToList(todoId, targetListId) {
  const todo = state.todos.find(t => t.id === todoId);
  if (!todo) return;

  if (targetListId === 'important') {
    todo.starred = true;
  } else {
    todo.listId = targetListId;
  }
  
  saveState();
  render();
}

// Focus the inline editor for a list currently being created
function focusNewListInput() {
  if (!state.creatingListId) return;
  const input = customListsContainer.querySelector('.new-list-edit-input');
  if (input) {
    input.focus();
    input.select();
  }
}

// Save a freshly created list, or cancel it if the name is empty
function finalizeNewList(name) {
  if (!state.creatingListId) return;
  const listId = state.creatingListId;
  state.creatingListId = null;

  const list = state.lists.find(l => l.id === listId);
  if (list && name) {
    list.name = name;
  } else {
    // Empty name -> cancel creation
    state.lists = state.lists.filter(l => l.id !== listId);
    if (state.activeListId === listId) {
      state.activeListId = 'tasks';
    }
  }

  saveState();
  render();
}

// Cancel list creation and remove the placeholder list
function cancelNewList() {
  if (!state.creatingListId) return;
  const listId = state.creatingListId;
  state.creatingListId = null;
  state.lists = state.lists.filter(l => l.id !== listId);
  if (state.activeListId === listId) {
    state.activeListId = 'tasks';
  }
  saveState();
  render();
}

// Navigation list select controller
function setActiveList(listId) {
  state.activeListId = listId;
  state.editingTodoId = null; // reset edits
  state.selectedTodoId = null; // close detail panel on list change
  saveState();
  render();

  // On Mobile, close sidebar drawer
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('show');
  }
}

// Get default theme class
function getRandomTheme() {
  return 'theme-default';
}

// Enable inline editable list title in header
function enableListTitleEditing() {
  const isCustom = !['tasks', 'important'].includes(state.activeListId);
  if (!isCustom) return;

  activeListTitle.contentEditable = true;
  activeListTitle.focus();
  
  // Select all text
  const range = document.createRange();
  range.selectNodeContents(activeListTitle);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

// Save list title modification
function saveListTitleRename() {
  activeListTitle.contentEditable = false;
  const newName = activeListTitle.textContent.trim();
  const activeList = state.lists.find(l => l.id === state.activeListId);
  
  if (activeList && newName && newName !== activeList.name) {
    activeList.name = newName;
    saveState();
    renderSidebar();
  } else if (activeList) {
    // Revert visually if empty
    activeListTitle.textContent = activeList.name;
  }
}

// Delete Task Modal logic
function showDeleteConfirmModal() {
  deleteConfirmModal.classList.add('show');
  return new Promise((resolve) => {
    deleteConfirmResolver = resolve;
  });
}

function closeDeleteConfirmModal(confirmed) {
  deleteConfirmModal.classList.remove('show');
  if (deleteConfirmResolver) {
    deleteConfirmResolver(confirmed);
    deleteConfirmResolver = null;
  }
}

// Delete List Modal logic
function showListDeleteConfirmModal() {
  deleteListConfirmModal.classList.add('show');
  return new Promise((resolve) => {
    deleteListConfirmResolver = resolve;
  });
}

function closeDeleteListConfirmModal(confirmed) {
  deleteListConfirmModal.classList.remove('show');
  if (deleteListConfirmResolver) {
    deleteListConfirmResolver(confirmed);
    deleteListConfirmResolver = null;
  }
}

// Move Task Modal Logic
function showMoveTaskModal(todoItem) {
  moveSelectListOptions.innerHTML = '';
  
  // Gather available target lists (exclude dynamic dynamic 'important' list and the item's current list)
  const availableLists = state.lists.filter(l => l.id !== todoItem.listId);
  
  availableLists.forEach(list => {
    const btn = document.createElement('button');
    btn.className = 'select-option-btn';
    btn.dataset.listId = list.id;
    
    // Set appropriate list icon inside target list selector
    const iconSvg = list.isDefault 
      ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`
      : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"></line><line x1="9" y1="12" x2="20" y2="12"></line><line x1="9" y1="18" x2="20" y2="18"></line><circle cx="4" cy="6" r="1.5"></circle><circle cx="4" cy="12" r="1.5"></circle><circle cx="4" cy="18" r="1.5"></circle></svg>`;

    btn.innerHTML = `${iconSvg} <span>${list.name}</span>`;
    moveSelectListOptions.appendChild(btn);
  });

  if (availableLists.length === 0) {
    moveSelectListOptions.innerHTML = '<p style="text-align: center; color: #6b7280; font-size: 13px; padding: 10px;">No other lists available. Create one first!</p>';
  }

  moveTaskModal.classList.add('show');
  return new Promise((resolve) => {
    moveSelectResolver = resolve;
  });
}

function closeMoveTaskModal(targetListId) {
  moveTaskModal.classList.remove('show');
  if (moveSelectResolver) {
    moveSelectResolver(targetListId);
    moveSelectResolver = null;
  }
}

// -------------------------------------------------------------
// Core Render Cycles
// -------------------------------------------------------------
function render() {
  renderSidebar();
  renderWorkspace();
  renderDetailPanel();
}

function renderSidebar() {
  // Update smart list counts
  const countImportant = state.todos.filter(t => t.starred && !t.completed).length;
  const countTasks = state.todos.filter(t => t.listId === 'tasks' && !t.completed).length;
  
  document.getElementById('countImportant').textContent = countImportant;
  document.getElementById('countTasks').textContent = countTasks;

  // Selected link highlighting
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    if (item.dataset.listId === state.activeListId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Render Custom User Lists
  customListsContainer.innerHTML = '';
  
  const customLists = state.lists.filter(l => !l.isDefault);
  customLists.forEach(list => {
    // Show an inline name editor when this list is being created
    if (list.id === state.creatingListId) {
      const li = document.createElement('li');
      li.className = 'nav-item new-list-edit-row active';
      li.dataset.listId = list.id;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'new-list-edit-input';
      input.placeholder = 'List name';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', 'Name your new list');

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur();
        } else if (e.key === 'Escape') {
          cancelNewList();
        }
      });

      input.addEventListener('blur', () => {
        finalizeNewList(input.value.trim());
      });

      li.appendChild(input);
      customListsContainer.appendChild(li);
      return;
    }

    const listCount = state.todos.filter(t => t.listId === list.id && !t.completed).length;
    
    const li = document.createElement('li');
    li.className = `nav-item ${state.activeListId === list.id ? 'active' : ''}`;
    li.dataset.listId = list.id;
    
    li.innerHTML = `
      <a href="#" class="nav-link">
        <svg class="nav-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="9" y1="6" x2="20" y2="6"></line>
          <line x1="9" y1="12" x2="20" y2="12"></line>
          <line x1="9" y1="18" x2="20" y2="18"></line>
          <circle cx="4" cy="6" r="1.5"></circle>
          <circle cx="4" cy="12" r="1.5"></circle>
          <circle cx="4" cy="18" r="1.5"></circle>
        </svg>
        <span class="nav-text">${list.name}</span>
        <span class="nav-count">${listCount}</span>
        <button class="sidebar-delete-list-btn" title="Delete list" aria-label="Delete list">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </a>
    `;

    // Sidebar list delete click with modal confirmation
    const deleteBtn = li.querySelector('.sidebar-delete-list-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent list navigation selection
      showListDeleteConfirmModal(list.name).then(confirmed => {
        if (confirmed) {
          state.todos = state.todos.filter(t => t.listId !== list.id);
          state.lists = state.lists.filter(l => l.id !== list.id);
          if (state.activeListId === list.id) {
            state.activeListId = 'tasks';
          }
          saveState();
          render();
        }
      });
    });

    customListsContainer.appendChild(li);
  });
}

function renderWorkspace() {
  // Determine header attributes
  const isCustomList = !['tasks', 'important'].includes(state.activeListId);
  
  let listName = 'All';
  const isSearching = state.searchQuery && state.searchQuery.trim() !== '';
  
  if (isSearching) {
    listName = 'Search Results';
    editListTitleBtn.style.display = 'none';
    deleteListBtn.style.display = 'none';
    document.querySelector('.todo-input-bar').style.display = 'none';
    listSubtitle.textContent = `Showing matches for "${state.searchQuery}"`;
    listSubtitle.style.display = 'block';
  } else {
    document.querySelector('.todo-input-bar').style.display = 'flex';
    listSubtitle.textContent = '';
    listSubtitle.style.display = 'none';
    if (state.activeListId === 'important') {
      listName = 'Starred';
      editListTitleBtn.style.display = 'none';
      deleteListBtn.style.display = 'none';
    } else {
      const activeList = state.lists.find(l => l.id === state.activeListId);
      if (activeList) {
        listName = activeList.name;
        
        if (activeList.isDefault) {
          editListTitleBtn.style.display = 'none';
          deleteListBtn.style.display = 'none';
        } else {
          editListTitleBtn.style.display = 'inline-flex';
          deleteListBtn.style.display = 'inline-flex';
        }
      }
    }
  }

  // Force default Royal Blue theme class on body
  document.body.className = 'theme-default';
  
  // Set title
  if (activeListTitle.contentEditable !== 'true') {
    activeListTitle.textContent = listName;
  }

  // Compute Task items list
  let filteredTodos = [];
  if (isSearching) {
    const q = state.searchQuery.toLowerCase();
    filteredTodos = state.todos.filter(t => t.text.toLowerCase().includes(q));
  } else if (state.activeListId === 'important') {
    filteredTodos = state.todos.filter(t => t.starred);
  } else {
    filteredTodos = state.todos.filter(t => t.listId === state.activeListId);
  }

  // Split into active and completed
  const activeTodos = filteredTodos.filter(t => !t.completed);
  const completedTodos = filteredTodos.filter(t => t.completed);

  // Render lists
  activeTodoList.innerHTML = '';
  completedTodoList.innerHTML = '';

  if (filteredTodos.length === 0) {
    emptyState.style.display = 'flex';
    completedSection.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    
    // Render Active
    activeTodos.forEach(todo => {
      activeTodoList.appendChild(createTodoDOM(todo));
    });

    // Render Completed
    if (completedTodos.length > 0) {
      completedSection.style.display = 'block';
      completedBadge.textContent = completedTodos.length;
      completedTodos.forEach(todo => {
        completedTodoList.appendChild(createTodoDOM(todo));
      });
    } else {
      completedSection.style.display = 'none';
    }
  }

  // Refocus input if editing a task inline
  if (state.editingTodoId) {
    const input = document.querySelector(`.todo-item[data-todo-id="${state.editingTodoId}"] .todo-edit-input`);
    if (input) {
      input.focus();
      // place cursor at end
      const val = input.value;
      input.value = '';
      input.value = val;
      // Auto-resize height to content scroll height
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
    }
  }
}

// Create a DOM node element for a single Todo item card
function createTodoDOM(todo) {
  const li = document.createElement('li');
  li.className = `todo-item ${todo.completed ? 'completed' : ''} ${todo.starred ? 'starred' : ''} ${state.selectedTodoId === todo.id ? 'selected' : ''}`;
  li.dataset.todoId = todo.id;

  // HTML5 Drag and Drop Handlers
  li.draggable = true;
  li.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', todo.id);
    e.dataTransfer.effectAllowed = 'move';
    li.classList.add('dragging');
    document.body.classList.add('is-dragging');
  });

  li.addEventListener('dragend', () => {
    li.classList.remove('dragging');
    document.body.classList.remove('is-dragging');
    // Clear any drag hovers on sidebar
    document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('drag-hover'));
  });

  // Drag only via the drag-handle (avoids selecting text/checking checkbox issues)
  li.addEventListener('mousedown', (e) => {
    if (e.target.closest('.todo-drag-handle')) {
      li.draggable = true;
    } else {
      li.draggable = false;
    }
  });



  // Drag handle element
  const handleDiv = document.createElement('div');
  handleDiv.className = 'todo-drag-handle';
  handleDiv.title = 'Drag task to sidebar list to move it';
  handleDiv.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <circle cx="9" cy="5" r="1.5"></circle>
      <circle cx="9" cy="12" r="1.5"></circle>
      <circle cx="9" cy="19" r="1.5"></circle>
      <circle cx="15" cy="5" r="1.5"></circle>
      <circle cx="15" cy="12" r="1.5"></circle>
      <circle cx="15" cy="19" r="1.5"></circle>
    </svg>
  `;
  li.appendChild(handleDiv);

  // Checkbox content
  const checkboxDiv = document.createElement('div');
  checkboxDiv.className = 'todo-checkbox';
  checkboxDiv.innerHTML = `
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  checkboxDiv.addEventListener('click', (e) => {
    e.stopPropagation();
    todo.completed = !todo.completed;
    saveState();
    render();
  });
  li.appendChild(checkboxDiv);

  // Content wrapper (Text or Editor Input + list badge + steps indicator)
  const wrapper = document.createElement('div');
  wrapper.className = 'todo-content-wrapper';

  if (state.editingTodoId === todo.id) {
    // Input Mode (Textarea for multiline wrapping)
    const editInput = document.createElement('textarea');
    editInput.className = 'todo-edit-input';
    editInput.value = todo.text;
    editInput.rows = 1;
    
    // Auto-resize height to content scroll height
    const resizeInput = () => {
      editInput.style.height = 'auto';
      editInput.style.height = editInput.scrollHeight + 'px';
    };
    editInput.addEventListener('input', resizeInput);
    
    // Save on Enter (without Shift), revert on Escape
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveInlineEdit(todo.id, editInput.value.trim());
      } else if (e.key === 'Escape') {
        state.editingTodoId = null;
        renderWorkspace();
      }
    });

    editInput.addEventListener('blur', () => {
      saveInlineEdit(todo.id, editInput.value.trim());
    });

    wrapper.appendChild(editInput);
  } else {
    // Normal Text Mode
    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    textSpan.textContent = todo.text;
    
    // Double click to edit inline
    textSpan.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      state.editingTodoId = todo.id;
      renderWorkspace();
    });
    wrapper.appendChild(textSpan);
  }

  // Create badges container
  const badgesContainer = document.createElement('div');
  badgesContainer.className = 'todo-badges-container';
  let hasBadges = false;

  // Show list badge when in "All", "Starred" smart lists or when search is active (tells where task belongs)
  const isSearching = state.searchQuery && state.searchQuery.trim() !== '';
  if (state.activeListId === 'tasks' || state.activeListId === 'important' || isSearching) {
    const list = state.lists.find(l => l.id === todo.listId);
    if (list) {
      const badge = document.createElement('span');
      badge.className = 'todo-list-badge';
      if (isSearching) {
        badge.classList.add('search-result-badge');
      }
      badge.textContent = list.name;
      badgesContainer.appendChild(badge);
      hasBadges = true;
    }
  }



  if (hasBadges) {
    wrapper.appendChild(badgesContainer);
  }

  li.appendChild(wrapper);

  // Hover Actions panel
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'item-actions';

  // Move List Button
  const moveBtn = document.createElement('button');
  moveBtn.className = 'action-btn move-btn';
  moveBtn.title = 'Move to another list';
  moveBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 17l5-5-5-5M4 12h11"/>
    </svg>
  `;
  moveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showMoveTaskModal(todo).then(targetListId => {
      if (targetListId) {
        todo.listId = targetListId;
        // Close detail panel if moving the currently selected task
        if (state.selectedTodoId === todo.id) {
          state.selectedTodoId = null;
        }
        saveState();
        render();
      }
    });
  });
  actionsDiv.appendChild(moveBtn);

  // Delete Button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-btn delete-btn';
  deleteBtn.title = 'Delete task';
  deleteBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showDeleteConfirmModal(todo.text).then(confirmed => {
      if (confirmed) {
        state.todos = state.todos.filter(t => t.id !== todo.id);
        // Close detail panel if deleting the currently selected task
        if (state.selectedTodoId === todo.id) {
          state.selectedTodoId = null;
        }
        saveState();
        render();
      }
    });
  });
  actionsDiv.appendChild(deleteBtn);
  
  li.appendChild(actionsDiv);

  // Important / Star Toggle Button
  const starBtn = document.createElement('button');
  starBtn.className = 'star-btn';
  starBtn.title = todo.starred ? 'Remove importance' : 'Mark as important';
  starBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="${todo.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  `;
  starBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    todo.starred = !todo.starred;
    saveState();
    render();
  });
  li.appendChild(starBtn);

  // Subtasks/Details Panel Toggle Button
  const detailsBtn = document.createElement('button');
  detailsBtn.className = 'details-trigger-btn';
  detailsBtn.title = 'Show task details & subtasks';
  detailsBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  `;
  detailsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.selectedTodoId === todo.id) {
      state.selectedTodoId = null;
    } else {
      state.selectedTodoId = todo.id;
    }
    saveState();
    render();
  });
  li.appendChild(detailsBtn);

  return li;
}

// Save Inline Edit Action
function saveInlineEdit(id, newText) {
  state.editingTodoId = null;
  const todo = state.todos.find(t => t.id === id);
  if (todo) {
    if (newText) {
      todo.text = newText;
      saveState();
    }
  }
  renderWorkspace();
}



function renderDetailPanel() {
  if (!state.selectedTodoId) {
    detailPanel.classList.add('hidden');
    // Remove highlighted selected item in main list
    document.querySelectorAll('.todo-item').forEach(item => item.classList.remove('selected'));
    return;
  }

  const todo = state.todos.find(t => t.id === state.selectedTodoId);
  if (!todo) {
    state.selectedTodoId = null;
    detailPanel.classList.add('hidden');
    saveState();
    return;
  }

  detailPanel.classList.remove('hidden');

  // Highlight selected task in main checklist
  document.querySelectorAll('.todo-item').forEach(item => {
    if (item.dataset.todoId === todo.id) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });

  // Render steps header progress bar
  if (todo.steps && todo.steps.length > 0) {
    const total = todo.steps.length;
    const completed = todo.steps.filter(s => s.completed).length;
    const percentage = Math.round((completed / total) * 100);
    detailProgressBar.style.width = `${percentage}%`;
    detailProgressContainer.style.display = 'block';
  } else {
    detailProgressBar.style.width = '0%';
    detailProgressContainer.style.display = 'none';
  }

  // Render Parent Card elements in detail view
  const detailCard = document.querySelector('.detail-todo-card');
  if (todo.completed) {
    detailCard.classList.add('completed');
  } else {
    detailCard.classList.remove('completed');
  }

  if (todo.starred) {
    detailCard.classList.add('starred');
  } else {
    detailCard.classList.remove('starred');
  }

  detailTodoText.value = todo.text;
  // Trigger height auto-resize for title textarea
  detailTodoText.style.height = 'auto';
  detailTodoText.style.height = detailTodoText.scrollHeight + 'px';

  // Format creation date
  const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  const createdDateStr = new Date(todo.createdAt).toLocaleDateString(undefined, dateOptions);
  detailCreatedDate.textContent = `Created on ${createdDateStr}`;

  // Render Subtasks list
  detailStepsList.innerHTML = '';
  if (!todo.steps) todo.steps = [];

  todo.steps.forEach(step => {
    const li = document.createElement('li');
    li.className = `step-item ${step.completed ? 'completed' : ''}`;
    li.dataset.stepId = step.id;

    // Checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'step-checkbox';
    checkbox.innerHTML = `
      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    checkbox.addEventListener('click', () => {
      step.completed = !step.completed;
      saveState();
      renderDetailPanel();
    });
    li.appendChild(checkbox);

    // Text Input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'step-text-input';
    input.value = step.text;
    input.placeholder = 'Step description';
    
    // Save step on blur or enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });

    input.addEventListener('blur', () => {
      const val = input.value.trim();
      if (!val) {
        // Delete if empty
        todo.steps = todo.steps.filter(s => s.id !== step.id);
      } else {
        step.text = val;
      }
      saveState();
      renderDetailPanel();
    });
    li.appendChild(input);

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'step-delete-btn';
    deleteBtn.title = 'Delete step';
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    deleteBtn.addEventListener('click', () => {
      todo.steps = todo.steps.filter(s => s.id !== step.id);
      saveState();
      renderDetailPanel();
    });
    li.appendChild(deleteBtn);

    detailStepsList.appendChild(li);
  });
}

// Run initializer
init();

// ===== State Management =====
let todos = [];
let currentFilter = 'all';
let searchQuery = '';
let currentTheme = 'dark';
let editingId = null;
let currentDate = new Date();

// ===== DOM Elements =====
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const totalTasksEl = document.getElementById('total-tasks');
const completedTasksEl = document.getElementById('completed-tasks');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clear-completed');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const themeToggleBtn = document.getElementById('theme-toggle');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');

// ===== Initialize App =====
function init() {
    loadTodos();
    loadTheme();
    updateCalendar();
    renderTodos();
    updateStats();
    updateProgressBar();
    attachEventListeners();

    // Update calendar every minute
    setInterval(updateCalendar, 60000);
}

// ===== Event Listeners =====
function attachEventListeners() {
    todoForm.addEventListener('submit', handleAddTodo);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });

    clearCompletedBtn.addEventListener('click', handleClearCompleted);

    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    themeToggleBtn.addEventListener('click', toggleTheme);
}

// ===== Add Todo =====
function handleAddTodo(e) {
    e.preventDefault();

    const text = todoInput.value.trim();
    if (!text) return;

    const todo = {
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };

    todos.unshift(todo);
    saveTodos();
    renderTodos();
    updateStats();
    updateProgressBar();

    todoInput.value = '';
    todoInput.focus();

    // Add animation feedback
    const firstItem = todoList.querySelector('.todo-item');
    if (firstItem) {
        firstItem.style.animation = 'none';
        setTimeout(() => {
            firstItem.style.animation = '';
        }, 10);
    }
}

// ===== Toggle Todo Completion =====
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
        updateStats();
        updateProgressBar();
    }
}

// ===== Delete Todo =====
function deleteTodo(id) {
    const todoElement = document.querySelector(`[data-id="${id}"]`);

    if (todoElement) {
        todoElement.style.animation = 'slideOut 0.3s ease';

        setTimeout(() => {
            todos = todos.filter(t => t.id !== id);
            saveTodos();
            renderTodos();
            updateStats();
            updateProgressBar();
        }, 300);
    }
}

// ===== Filter Change =====
function handleFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    currentFilter = filter;

    filterBtns.forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');

    renderTodos();
}

// ===== Clear Completed =====
function handleClearCompleted() {
    const hasCompleted = todos.some(t => t.completed);
    if (!hasCompleted) return;

    if (confirm('완료된 모든 항목을 삭제하시겠습니까?')) {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderTodos();
        updateStats();
        updateProgressBar();
    }
}

// ===== Render Todos =====
function renderTodos() {
    const filteredTodos = getFilteredTodos();

    if (filteredTodos.length === 0) {
        todoList.innerHTML = '';
        emptyState.classList.add('show');
        return;
    }

    emptyState.classList.remove('show');

    todoList.innerHTML = filteredTodos.map(todo => `
        <li class="todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo.id ? 'editing' : ''}" data-id="${todo.id}">
            <div class="todo-checkbox" onclick="toggleTodo(${todo.id})">
                <i class="fas fa-check"></i>
            </div>
            <span class="todo-text" ondblclick="editTodo(${todo.id})">${escapeHtml(todo.text)}</span>
            <input type="text" class="edit-input" id="edit-input-${todo.id}" value="${escapeHtml(todo.text)}">
            <div class="edit-actions">
                <button class="save-edit-btn" onclick="saveEdit(${todo.id})" aria-label="저장">
                    <i class="fas fa-check"></i>
                </button>
                <button class="cancel-edit-btn" onclick="cancelEdit()" aria-label="취소">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <button class="edit-btn" onclick="editTodo(${todo.id})" aria-label="편집">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" onclick="deleteTodo(${todo.id})" aria-label="삭제">
                <i class="fas fa-trash"></i>
            </button>
        </li>
    `).join('');

    // Focus edit input if in edit mode
    if (editingId !== null) {
        const editInput = document.getElementById(`edit-input-${editingId}`);
        if (editInput) {
            editInput.focus();
            editInput.select();
        }
    }
}

// ===== Get Filtered Todos =====
function getFilteredTodos() {
    let filtered = todos;

    // Apply status filter
    switch (currentFilter) {
        case 'active':
            filtered = filtered.filter(t => !t.completed);
            break;
        case 'completed':
            filtered = filtered.filter(t => t.completed);
            break;
    }

    // Apply search filter
    if (searchQuery) {
        filtered = filtered.filter(t =>
            t.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    return filtered;
}

// ===== Update Statistics =====
function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;

    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;

    // Update clear button state
    clearCompletedBtn.disabled = completed === 0;
}

// ===== Local Storage =====
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function loadTodos() {
    const stored = localStorage.getItem('todos');
    if (stored) {
        try {
            todos = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to load todos:', e);
            todos = [];
        }
    }
}

// ===== Edit Functionality =====
function editTodo(id) {
    editingId = id;
    renderTodos();
}

function saveEdit(id) {
    const editInput = document.getElementById(`edit-input-${id}`);
    const newText = editInput.value.trim();

    if (!newText) {
        alert('할 일 내용을 입력해주세요.');
        return;
    }

    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.text = newText;
        saveTodos();
    }

    editingId = null;
    renderTodos();
}

function cancelEdit() {
    editingId = null;
    renderTodos();
}

// ===== Search Functionality =====
function handleSearch(e) {
    searchQuery = e.target.value.trim();
    const searchWrapper = document.querySelector('.search-wrapper');

    if (searchQuery) {
        searchWrapper.classList.add('has-text');
    } else {
        searchWrapper.classList.remove('has-text');
    }

    renderTodos();
}

function clearSearch() {
    searchQuery = '';
    searchInput.value = '';
    document.querySelector('.search-wrapper').classList.remove('has-text');
    renderTodos();
}

// ===== Theme Toggle =====
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveTheme();
}

function applyTheme() {
    if (currentTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function loadTheme() {
    const stored = localStorage.getItem('theme');
    if (stored) {
        currentTheme = stored;
    }
    applyTheme();
}

function saveTheme() {
    localStorage.setItem('theme', currentTheme);
}

// ===== Progress Bar =====
function updateProgressBar() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressBar.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;
}

// ===== Calendar =====
function updateCalendar() {
    currentDate = new Date();

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    const dayOfWeek = days[currentDate.getDay()];
    const dayOfMonth = currentDate.getDate();
    const month = months[currentDate.getMonth()];
    const year = currentDate.getFullYear();

    document.getElementById('calendar-day').textContent = dayOfWeek;
    document.getElementById('calendar-number').textContent = dayOfMonth;
    document.getElementById('calendar-month').textContent = month;
    document.getElementById('calendar-year').textContent = year;
}

// ===== Utility Functions =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Animation for deletion =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0) rotate(0deg);
        }
        to {
            opacity: 0;
            transform: translateX(100%) rotate(3deg);
        }
    }
`;
document.head.appendChild(style);

// ===== Initialize on DOM Ready =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

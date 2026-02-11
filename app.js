// ===== State Management =====
let todos = [];
let currentFilter = 'all';
let searchQuery = '';
let currentTheme = 'dark';
let editingId = null;
let currentDate = new Date();
let selectedDate = null;
let calendarViewDate = new Date();
let selectedTag = 'none';

// Tag colors
const TAG_COLORS = {
    pink: '#f4c2c2',
    blue: '#b8d4e8',
    green: '#c8d5b9',
    peach: '#f4d4c2',
    purple: '#d4c2f4'
};

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
const calendarWidget = document.getElementById('calendar-widget');
const calendarDropdown = document.getElementById('calendar-dropdown');
const calendarDays = document.getElementById('calendar-days');
const calendarTitle = document.getElementById('calendar-title');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const todayBtn = document.getElementById('today-btn');
const clearDateBtn = document.getElementById('clear-date-btn');
const tagOptions = document.querySelectorAll('.tag-option');


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

    // Calendar picker events
    calendarWidget.addEventListener('click', toggleCalendarDropdown);
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    todayBtn.addEventListener('click', selectToday);
    clearDateBtn.addEventListener('click', clearSelectedDate);

    // Close calendar when clicking outside
    document.addEventListener('click', (e) => {
        if (!calendarWidget.contains(e.target) && !calendarDropdown.contains(e.target)) {
            closeCalendarDropdown();
        }
    });

    // Tag selection events
    tagOptions.forEach(option => {
        option.addEventListener('click', handleTagSelection);
    });
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
        createdAt: new Date().toISOString(),
        date: selectedDate ? selectedDate.toISOString() : null
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

    todoList.innerHTML = filteredTodos.map(todo => {
        const tagHtml = todo.tag && TAG_COLORS[todo.tag]
            ? `<span class="todo-tag" style="background: ${TAG_COLORS[todo.tag]};" title="${todo.tag}"></span>`
            : '';

        return `
        <li class="todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo.id ? 'editing' : ''}" data-id="${todo.id}">
            <div class="todo-checkbox" onclick="toggleTodo(${todo.id})">
                <i class="fas fa-check"></i>
            </div>
            ${tagHtml}
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
    `;
    }).join('');

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

    // Apply date filter
    if (selectedDate) {
        const selectedDateStr = formatDateForComparison(selectedDate);
        filtered = filtered.filter(t => {
            if (!t.date) return false;
            return formatDateForComparison(new Date(t.date)) === selectedDateStr;
        });
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

// ===== Calendar Picker =====
function toggleCalendarDropdown() {
    const isOpen = calendarDropdown.classList.contains('show');
    if (isOpen) {
        closeCalendarDropdown();
    } else {
        openCalendarDropdown();
    }
}

function openCalendarDropdown() {
    calendarDropdown.classList.add('show');
    calendarWidget.classList.add('active');
    calendarViewDate = selectedDate ? new Date(selectedDate) : new Date();
    renderCalendarDays();
}

function closeCalendarDropdown() {
    calendarDropdown.classList.remove('show');
    calendarWidget.classList.remove('active');
}

function renderCalendarDays() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    // Update title
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    calendarTitle.textContent = `${year}년 ${months[month]}`;

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    calendarDays.innerHTML = '';

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const cell = createDayCell(day, true, year, month - 1);
        calendarDays.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = createDayCell(day, false, year, month);
        calendarDays.appendChild(cell);
    }

    // Next month days
    const totalCells = calendarDays.children.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const cell = createDayCell(day, true, year, month + 1);
        calendarDays.appendChild(cell);
    }
}

function createDayCell(day, isOtherMonth, year, month) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.textContent = day;

    const cellDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    cellDate.setHours(0, 0, 0, 0);

    if (isOtherMonth) {
        cell.classList.add('other-month');
    }

    // Check if today
    if (cellDate.getTime() === today.getTime()) {
        cell.classList.add('today');
    }

    // Check if selected
    if (selectedDate) {
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);
        if (cellDate.getTime() === selected.getTime()) {
            cell.classList.add('selected');
        }
    }

    // Check if has todos
    const dateStr = formatDateForComparison(cellDate);
    const todosOnDate = todos.filter(todo => {
        if (!todo.date) return false;
        return formatDateForComparison(new Date(todo.date)) === dateStr;
    });

    if (todosOnDate.length > 0) {
        cell.classList.add('has-todos');
    }

    cell.addEventListener('click', () => selectDate(cellDate));

    return cell;
}

function selectDate(date) {
    selectedDate = new Date(date);
    renderCalendarDays();
    updateCalendar(); // Update header to show selected date
    renderTodos();
    closeCalendarDropdown();
}

function changeMonth(delta) {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + delta);
    renderCalendarDays();
}

function selectToday() {
    selectedDate = new Date();
    calendarViewDate = new Date();
    renderCalendarDays();
    updateCalendar(); // Update header to show today
    renderTodos();
    closeCalendarDropdown();
}

function clearSelectedDate() {
    selectedDate = null;
    renderCalendarDays();
    updateCalendar(); // Update header to show current date
    renderTodos();
    closeCalendarDropdown();
}

function formatDateForComparison(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

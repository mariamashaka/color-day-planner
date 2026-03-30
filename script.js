// ==================== ГЛОБАЛЬНОЕ СОСТОЯНИЕ ====================
let state = {
    workspaces: [],
    categories: [],
    tasks: [],
    projects: [],
    weeklyRoutines: [],
    dailyRoutines: { morning: [], evening: [] },
    currentWorkspaceId: null,
    currentMonth: null
};

// Цвета по умолчанию для палитры
const COLOR_PALETTE = [
    '#4A90D9', '#E67E22', '#9B59B6', '#E74C3C',
    '#2ECC71', '#F39C12', '#1ABC9C', '#95A5A6'
];

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// ==================== ЗАГРУЗКА / СОХРАНЕНИЕ ====================
function loadData() {
    const saved = localStorage.getItem('planner_data');
    if (saved) {
        state = JSON.parse(saved);
    } else {
        loadDefaultData();
    }
}

function saveData() {
    localStorage.setItem('planner_data', JSON.stringify(state));
}

function loadDefaultData() {
    const today = getTodayDate();
    state = {
        workspaces: [
            { id: 'ws_all', name: 'All', isAll: true },
            { id: 'ws_work', name: 'Work (Nesuda)' },
            { id: 'ws_home', name: 'Home' }
        ],
        categories: [
            { id: 'cat_letters', name: 'Letters', color: '#4A90D9', workspaceId: 'ws_work' },
            { id: 'cat_staff', name: 'Staff', color: '#E67E22', workspaceId: 'ws_work' },
            { id: 'cat_family', name: 'Family', color: '#2ECC71', workspaceId: 'ws_home' }
        ],
        tasks: [
            { id: generateId(), title: 'Welcome! Click to edit', date: today, categoryId: 'cat_letters', workspaceId: 'ws_work', projectId: null, done: false, note: '' }
        ],
        projects: [
            { id: 'proj_antibiotic', name: 'Antibiotic course', color: '#9B59B6' }
        ],
        weeklyRoutines: [
            { id: 'wr_exercise', title: 'Exercise', targetCount: 3, currentCount: 0, workspaceId: 'ws_work' }
        ],
        dailyRoutines: {
            morning: [
                { id: 'mr_med', title: 'Medication', done: false }
            ],
            evening: [
                { id: 'er_journal', title: 'Journal', done: false }
            ]
        },
        currentWorkspaceId: 'ws_all',
        currentMonth: '2026-03'
    };
    saveData();
}

// ==================== РЕНДЕРИНГ (заглушки, будем заполнять) ====================
function renderAll() {
    renderWorkspaceTabs();
    renderLeftPanel();
    renderCalendar();
    lucide.createIcons();
}

function renderWorkspaceTabs() {
    // TODO: отрисовать вкладки
    console.log('renderWorkspaceTabs');
}

function renderLeftPanel() {
    renderWeeklyRoutines();
    renderProjects();
    renderDailyRoutines();
}

function renderWeeklyRoutines() {
    // TODO
}

function renderProjects() {
    // TODO
}

function renderDailyRoutines() {
    // TODO
}

function renderCalendar() {
    // TODO
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderAll();
    
    // Навешивание обработчиков (TODO: добавить позже)
    console.log('App initialized');
});

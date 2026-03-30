/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const STORAGE_KEY = 'planner_data';
const COLORS = ['#4A90D9','#E07B3A','#9B59B6','#C0392B','#27AE60','#D4AC0D','#16A085','#7F8C8D'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
let data = {};
let activePopup = null;
let editingId = null;        // id текущего редактируемого объекта
let selectedColor = COLORS[0];
let movingTaskIds = [];      // для popup-move

/* ═══════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════ */
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { data = JSON.parse(raw); return; } catch(e) {}
  }
  loadDefaultData();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadDefaultData() {
  const today = todayStr();
  data = {
    workspaces: [
      { id: 'ws_all',   name: 'All',           isAll: true },
      { id: 'ws_work',  name: 'Work (Nesuda)'               },
      { id: 'ws_home',  name: 'Home'                        },
      { id: 'ws_study', name: 'Study'                       },
    ],
    categories: [
      { id: 'cat_1', name: 'Letters',     color: '#4A90D9', workspaceId: 'ws_work' },
      { id: 'cat_2', name: 'Staff',       color: '#E07B3A', workspaceId: 'ws_work' },
      { id: 'cat_3', name: 'Supervision', color: '#9B59B6', workspaceId: 'ws_work' },
      { id: 'cat_4', name: 'NHIF',        color: '#C0392B', workspaceId: 'ws_work' },
      { id: 'cat_5', name: 'Family',      color: '#27AE60', workspaceId: 'ws_home' },
      { id: 'cat_6', name: 'Errands',     color: '#D4AC0D', workspaceId: 'ws_home' },
    ],
    tasks: [
      {
        id: genId(), title: 'Welcome! Click to edit',
        date: today, categoryId: 'cat_1', workspaceId: 'ws_work',
        projectId: '', done: false, note: ''
      }
    ],
    projects: [
      { id: 'proj_1', name: 'Antibiotic course', color: '#9B59B6' },
      { id: 'proj_2', name: 'Pollen trap',        color: '#16A085' },
    ],
    weeklyRoutines: [
      { id: 'wr_1', title: 'Exercise', targetCount: 3, currentCount: 0, workspaceId: 'ws_work' },
      { id: 'wr_2', title: 'Reading',  targetCount: 5, currentCount: 2, workspaceId: 'ws_home' },
    ],
    dailyRoutines: {
      morning: [
        { id: 'mr_1', title: 'Medication', done: false },
        { id: 'mr_2', title: 'Breakfast',  done: false },
      ],
      evening: [
        { id: 'er_1', title: 'Journal',   done: false },
        { id: 'er_2', title: 'Skincare',  done: false },
      ]
    },
    currentWorkspaceId: 'ws_all',
    currentMonth: today.slice(0, 7),  // "YYYY-MM"
  };
  saveData();
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function genId() {
  return '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function parseMonth(ym) {
  // "YYYY-MM" → { year, month (0-based) }
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m - 1 };
}

function formatMonthLabel(ym) {
  const { year, month } = parseMonth(ym);
  return MONTH_NAMES[month] + ' ' + year;
}

function shiftMonth(ym, delta) {
  let { year, month } = parseMonth(ym);
  month += delta;
  if (month < 0)  { month = 11; year--; }
  if (month > 11) { month = 0;  year++; }
  return year + '-' + String(month + 1).padStart(2, '0');
}

function dateStr(year, month, day) {
  // month is 0-based here
  return year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function shiftDate(ds, delta) {
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function getCategoryColor(categoryId) {
  const cat = data.categories.find(c => c.id === categoryId);
  return cat ? cat.color : '#AAA49C';
}

function getProjectColor(projectId) {
  const p = data.projects.find(x => x.id === projectId);
  return p ? p.color : '#AAA49C';
}

function currentWs() {
  return data.workspaces.find(w => w.id === data.currentWorkspaceId);
}

function isAll() {
  return currentWs()?.isAll === true;
}

/* ═══════════════════════════════════════════
   FILTER HELPERS
═══════════════════════════════════════════ */
function getTasksForDate(ds) {
  return data.tasks.filter(t => {
    if (t.date !== ds) return false;
    if (isAll()) return true;
    return t.workspaceId === data.currentWorkspaceId;
  });
}

function getVisibleRoutines() {
  if (isAll()) return data.weeklyRoutines;
  return data.weeklyRoutines.filter(r => r.workspaceId === data.currentWorkspaceId);
}

function getCategoriesForWorkspace(wsId) {
  if (!wsId || wsId === 'ws_all') return data.categories;
  return data.categories.filter(c => c.workspaceId === wsId);
}

/* ═══════════════════════════════════════════
   RENDER ALL
═══════════════════════════════════════════ */
function renderAll() {
  renderWorkspaceTabs();
  renderWeeklyRoutines();
  renderProjects();
  renderDailyRoutines();
  renderCalendar();
  lucide.createIcons();
}

/* ═══════════════════════════════════════════
   RENDER: WORKSPACE TABS
═══════════════════════════════════════════ */
function renderWorkspaceTabs() {
  const container = document.getElementById('workspace-tabs');
  container.innerHTML = '';
  data.workspaces.forEach(ws => {
    const btn = document.createElement('button');
    btn.className = 'ws-tab' + (ws.id === data.currentWorkspaceId ? ' active' : '');
    btn.textContent = ws.name;
    btn.addEventListener('click', (e) => {
      if (ws.isAll) {
        switchWorkspace(ws.id);
        return;
      }
      // show dropdown for non-All workspaces
      const existing = document.querySelector('.ws-dropdown');
      if (existing) existing.remove();
      if (btn.classList.contains('active')) {
        // already active: show edit dropdown
        showWsDropdown(btn, ws);
      } else {
        switchWorkspace(ws.id);
      }
    });
    // right-click to edit
    btn.addEventListener('contextmenu', (e) => {
      if (ws.isAll) return;
      e.preventDefault();
      showWsDropdown(btn, ws);
    });
    container.appendChild(btn);
  });
}

function showWsDropdown(anchorBtn, ws) {
  const existing = document.querySelector('.ws-dropdown');
  if (existing) { existing.remove(); return; }

  const dd = document.createElement('div');
  dd.className = 'ws-dropdown';

  const renameBtn = document.createElement('button');
  renameBtn.textContent = 'Rename';
  renameBtn.addEventListener('click', () => { dd.remove(); openWorkspacePopup(ws.id); });

  const addCatBtn = document.createElement('button');
  addCatBtn.textContent = 'Add Category';
  addCatBtn.addEventListener('click', () => { dd.remove(); openCategoryPopup(null, ws.id); });

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.className = 'danger';
  delBtn.addEventListener('click', () => { dd.remove(); deleteWorkspace(ws.id); });

  dd.appendChild(renameBtn);
  dd.appendChild(addCatBtn);
  dd.appendChild(delBtn);
  anchorBtn.style.position = 'relative';
  anchorBtn.appendChild(dd);

  // close on outside click
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', handler); }
    });
  }, 0);
}

/* ═══════════════════════════════════════════
   RENDER: WEEKLY ROUTINES
═══════════════════════════════════════════ */
function renderWeeklyRoutines() {
  const list = document.getElementById('weekly-routines-list');
  list.innerHTML = '';
  const routines = getVisibleRoutines();
  if (routines.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.textContent = 'No routines yet';
    list.appendChild(hint);
    return;
  }
  routines.forEach(r => {
    const item = document.createElement('div');
    item.className = 'routine-item';

    const name = document.createElement('span');
    name.className = 'routine-name';
    name.textContent = r.title;
    name.title = r.title;
    name.addEventListener('click', () => openRoutinePopup(r.id));

    const counter = document.createElement('span');
    counter.className = 'routine-counter' + (r.currentCount >= r.targetCount ? ' done' : '');
    counter.textContent = r.currentCount + '/' + r.targetCount;

    const minusBtn = document.createElement('button');
    minusBtn.className = 'routine-btn';
    minusBtn.textContent = '−';
    minusBtn.addEventListener('click', () => decrementRoutine(r.id));

    const plusBtn = document.createElement('button');
    plusBtn.className = 'routine-btn';
    plusBtn.textContent = '+';
    plusBtn.addEventListener('click', () => incrementRoutine(r.id));

    item.appendChild(name);
    item.appendChild(counter);
    item.appendChild(minusBtn);
    item.appendChild(plusBtn);
    list.appendChild(item);
  });
}

/* ═══════════════════════════════════════════
   RENDER: PROJECTS
═══════════════════════════════════════════ */
function renderProjects() {
  const list = document.getElementById('projects-list');
  list.innerHTML = '';
  if (data.projects.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.textContent = 'No projects yet';
    list.appendChild(hint);
    return;
  }
  data.projects.forEach(p => {
    const item = document.createElement('div');
    item.className = 'project-item';

    const dot = document.createElement('div');
    dot.className = 'project-dot';
    dot.style.background = p.color;

    const name = document.createElement('span');
    name.className = 'project-name';
    name.textContent = p.name;
    name.title = p.name;

    const editBtn = document.createElement('button');
    editBtn.className = 'project-edit-btn';
    editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
    editBtn.addEventListener('click', () => openProjectPopup(p.id));

    item.appendChild(dot);
    item.appendChild(name);
    item.appendChild(editBtn);
    list.appendChild(item);
  });
}

/* ═══════════════════════════════════════════
   RENDER: DAILY ROUTINES
═══════════════════════════════════════════ */
function renderDailyRoutines() {
  renderDailyList('morning', 'morning-list');
  renderDailyList('evening', 'evening-list');
}

function renderDailyList(type, containerId) {
  const list = document.getElementById(containerId);
  list.innerHTML = '';
  const items = data.dailyRoutines[type];
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'daily-item';

    const box = document.createElement('div');
    box.className = 'daily-checkbox' + (item.done ? ' checked' : '');
    box.addEventListener('click', () => toggleDailyRoutine(type, item.id));

    const label = document.createElement('span');
    label.className = 'daily-label' + (item.done ? ' done' : '');
    label.textContent = item.title;

    row.appendChild(box);
    row.appendChild(label);
    list.appendChild(row);
  });
}

/* ═══════════════════════════════════════════
   RENDER: CALENDAR
═══════════════════════════════════════════ */
function renderCalendar() {
  document.getElementById('calendar-month-label').textContent = formatMonthLabel(data.currentMonth);

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const { year, month } = parseMonth(data.currentMonth);
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const today    = todayStr();

  // Day of week for first day: Mon=0 … Sun=6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  // Cells from previous month
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, 1 - (startDow - i));
    const ds = dateStr(d.getFullYear(), d.getMonth(), d.getDate());
    grid.appendChild(buildCell(ds, true));
  }

  // Cells of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const ds = dateStr(year, month, day);
    const cell = buildCell(ds, false);
    if (ds === today) cell.classList.add('today');
    grid.appendChild(cell);
  }

  // Fill remaining cells to complete last row
  const totalCells = grid.children.length;
  const remainder = totalCells % 7;
  if (remainder !== 0) {
    const fill = 7 - remainder;
    for (let i = 1; i <= fill; i++) {
      const d = new Date(year, month + 1, i);
      const ds = dateStr(d.getFullYear(), d.getMonth(), d.getDate());
      grid.appendChild(buildCell(ds, true));
    }
  }
}

function buildCell(ds, otherMonth) {
  const cell = document.createElement('div');
  cell.className = 'cal-cell' + (otherMonth ? ' other-month' : '');

  // Day number
  const dayNum = document.createElement('div');
  dayNum.className = 'cal-day-num';
  dayNum.textContent = parseInt(ds.slice(8));
  cell.appendChild(dayNum);

  // Tasks
  const tasks = getTasksForDate(ds);
  tasks.forEach(t => {
    const chip = document.createElement('div');
    chip.className = 'task-chip' + (t.done ? ' done' : '');

    const dot = document.createElement('div');
    dot.className = 'task-dot';
    // color: category first, then project, then grey
    if (t.categoryId) {
      dot.style.background = getCategoryColor(t.categoryId);
    } else if (t.projectId) {
      dot.style.background = getProjectColor(t.projectId);
    } else {
      dot.style.background = '#AAA49C';
    }

    const label = document.createElement('span');
    label.className = 'task-chip-label';
    label.textContent = t.title;

    chip.appendChild(dot);
    chip.appendChild(label);

    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskPopup(t.id, null);
    });

    cell.appendChild(chip);
  });

  // Bottom actions
  const actions = document.createElement('div');
  actions.className = 'cal-cell-actions';

  // ← move back
  const leftBtn = document.createElement('button');
  leftBtn.className = 'cell-action-btn';
  leftBtn.title = 'Move task back one day';
  leftBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
  leftBtn.addEventListener('click', (e) => { e.stopPropagation(); handleMoveClick(ds, -1); });

  // → move forward
  const rightBtn = document.createElement('button');
  rightBtn.className = 'cell-action-btn';
  rightBtn.title = 'Move task forward one day';
  rightBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
  rightBtn.addEventListener('click', (e) => { e.stopPropagation(); handleMoveClick(ds, 1); });

  // + add task
  const addBtn = document.createElement('button');
  addBtn.className = 'cell-action-btn cell-add-btn';
  addBtn.title = 'Add task';
  addBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
  addBtn.addEventListener('click', (e) => { e.stopPropagation(); openTaskPopup(null, ds); });

  actions.appendChild(leftBtn);
  actions.appendChild(rightBtn);
  actions.appendChild(addBtn);
  cell.appendChild(actions);

  return cell;
}

/* ═══════════════════════════════════════════
   MOVE TASK CLICK HANDLER
═══════════════════════════════════════════ */
function handleMoveClick(ds, delta) {
  const tasks = getTasksForDate(ds).filter(t => !t.done);
  if (tasks.length === 0) return;
  if (tasks.length === 1) {
    moveTask(tasks[0].id, shiftDate(ds, delta));
    return;
  }
  // multiple tasks → open move popup
  openMovePopup(tasks, shiftDate(ds, delta));
}

/* ═══════════════════════════════════════════
   WORKSPACE ACTIONS
═══════════════════════════════════════════ */
function switchWorkspace(wsId) {
  data.currentWorkspaceId = wsId;
  saveData();
  renderAll();
}

function createWorkspace(name) {
  const ws = { id: genId(), name: name.trim() };
  data.workspaces.push(ws);
  saveData();
  renderAll();
}

function updateWorkspace(id, name) {
  const ws = data.workspaces.find(w => w.id === id);
  if (ws) { ws.name = name.trim(); saveData(); renderAll(); }
}

function deleteWorkspace(id) {
  // reassign tasks to null workspace, delete routines & categories
  data.tasks.forEach(t => { if (t.workspaceId === id) t.workspaceId = 'ws_all'; });
  data.weeklyRoutines = data.weeklyRoutines.filter(r => r.workspaceId !== id);
  const catIds = data.categories.filter(c => c.workspaceId === id).map(c => c.id);
  data.tasks.forEach(t => { if (catIds.includes(t.categoryId)) t.categoryId = ''; });
  data.categories = data.categories.filter(c => c.workspaceId !== id);
  data.workspaces = data.workspaces.filter(w => w.id !== id);
  if (data.currentWorkspaceId === id) data.currentWorkspaceId = 'ws_all';
  saveData();
  renderAll();
}

/* ═══════════════════════════════════════════
   TASK ACTIONS
═══════════════════════════════════════════ */
function createTask(t) {
  data.tasks.push({ id: genId(), ...t, done: false });
  saveData(); renderAll();
}

function updateTask(id, fields) {
  const t = data.tasks.find(x => x.id === id);
  if (t) { Object.assign(t, fields); saveData(); renderAll(); }
}

function deleteTask(id) {
  data.tasks = data.tasks.filter(x => x.id !== id);
  saveData(); renderAll();
}

function toggleTaskDone(id) {
  const t = data.tasks.find(x => x.id === id);
  if (t) { t.done = !t.done; saveData(); renderAll(); }
}

function moveTask(id, newDate) {
  const t = data.tasks.find(x => x.id === id);
  if (t) { t.date = newDate; saveData(); renderAll(); }
}

/* ═══════════════════════════════════════════
   ROUTINE ACTIONS
═══════════════════════════════════════════ */
function incrementRoutine(id) {
  const r = data.weeklyRoutines.find(x => x.id === id);
  if (r && r.currentCount < r.targetCount) { r.currentCount++; saveData(); renderWeeklyRoutines(); }
}

function decrementRoutine(id) {
  const r = data.weeklyRoutines.find(x => x.id === id);
  if (r && r.currentCount > 0) { r.currentCount--; saveData(); renderWeeklyRoutines(); }
}

function resetWeeklyRoutines() {
  getVisibleRoutines().forEach(r => { r.currentCount = 0; });
  saveData(); renderWeeklyRoutines();
}

function toggleDailyRoutine(type, id) {
  const item = data.dailyRoutines[type].find(x => x.id === id);
  if (item) { item.done = !item.done; saveData(); renderDailyRoutines(); }
}

function resetDailyRoutines() {
  ['morning','evening'].forEach(type => {
    data.dailyRoutines[type].forEach(x => x.done = false);
  });
  saveData(); renderDailyRoutines();
}

function addDailyRoutine(type, title) {
  if (!title.trim()) return;
  const prefix = type === 'morning' ? 'mr_' : 'er_';
  data.dailyRoutines[type].push({ id: prefix + genId(), title: title.trim(), done: false });
  saveData(); renderDailyRoutines();
}

/* ═══════════════════════════════════════════
   CALENDAR NAVIGATION
═══════════════════════════════════════════ */
function prevMonth() {
  data.currentMonth = shiftMonth(data.currentMonth, -1);
  saveData(); renderCalendar();
}

function nextMonth() {
  data.currentMonth = shiftMonth(data.currentMonth, 1);
  saveData(); renderCalendar();
}

/* ═══════════════════════════════════════════
   POPUP SYSTEM
═══════════════════════════════════════════ */
function openPopup(id) {
  if (activePopup) closePopup(activePopup);
  activePopup = id;
  document.getElementById(id).classList.add('active');
  document.getElementById('overlay').classList.add('active');
  lucide.createIcons();
}

function closePopup(id) {
  document.getElementById(id).classList.remove('active');
  document.getElementById('overlay').classList.remove('active');
  activePopup = null;
  editingId = null;
}

function closeActivePopup() {
  if (activePopup) closePopup(activePopup);
}

/* ═══════════════════════════════════════════
   POPUP: TASK
═══════════════════════════════════════════ */
function openTaskPopup(taskId, prefillDate) {
  editingId = taskId;
  const isNew = !taskId;
  document.getElementById('popup-task-title').textContent = isNew ? 'New Task' : 'Edit Task';
  document.getElementById('btn-task-delete').style.display = isNew ? 'none' : '';

  // populate workspace select
  const wsSelect = document.getElementById('task-input-workspace');
  wsSelect.innerHTML = '';
  data.workspaces.filter(w => !w.isAll).forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id;
    opt.textContent = ws.name;
    wsSelect.appendChild(opt);
  });

  // populate project select
  const projSelect = document.getElementById('task-input-project');
  projSelect.innerHTML = '<option value="">— No project —</option>';
  data.projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    projSelect.appendChild(opt);
  });

  if (isNew) {
    document.getElementById('task-input-title').value = '';
    document.getElementById('task-input-date').value  = prefillDate || todayStr();
    document.getElementById('task-input-note').value  = '';
    // default workspace: current (if not All)
    const defWs = isAll() ? data.workspaces.find(w => !w.isAll)?.id || '' : data.currentWorkspaceId;
    wsSelect.value = defWs;
    populateCategorySelect(defWs, '');
    projSelect.value = '';
  } else {
    const t = data.tasks.find(x => x.id === taskId);
    document.getElementById('task-input-title').value = t.title;
    document.getElementById('task-input-date').value  = t.date;
    document.getElementById('task-input-note').value  = t.note || '';
    wsSelect.value = t.workspaceId || '';
    populateCategorySelect(t.workspaceId, t.categoryId);
    projSelect.value = t.projectId || '';
  }

  openPopup('popup-task');
}

function populateCategorySelect(wsId, selectedCatId) {
  const catSelect = document.getElementById('task-input-category');
  catSelect.innerHTML = '<option value="">— No category —</option>';
  getCategoriesForWorkspace(wsId).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    catSelect.appendChild(opt);
  });
  catSelect.value = selectedCatId || '';
}

function saveTask() {
  const title = document.getElementById('task-input-title').value.trim();
  if (!title) { document.getElementById('task-input-title').focus(); return; }

  const fields = {
    title,
    date:        document.getElementById('task-input-date').value,
    workspaceId: document.getElementById('task-input-workspace').value,
    categoryId:  document.getElementById('task-input-category').value,
    projectId:   document.getElementById('task-input-project').value,
    note:        document.getElementById('task-input-note').value,
  };

  if (editingId) {
    updateTask(editingId, fields);
  } else {
    createTask(fields);
  }
  closePopup('popup-task');
}

/* ═══════════════════════════════════════════
   POPUP: WORKSPACE
═══════════════════════════════════════════ */
function openWorkspacePopup(wsId) {
  editingId = wsId;
  const isNew = !wsId;
  document.getElementById('popup-workspace-title').textContent = isNew ? 'New Workspace' : 'Rename Workspace';
  document.getElementById('btn-workspace-delete').style.display = isNew ? 'none' : '';
  document.getElementById('workspace-input-name').value = isNew ? '' : data.workspaces.find(w => w.id === wsId)?.name || '';
  openPopup('popup-workspace');
  setTimeout(() => document.getElementById('workspace-input-name').focus(), 50);
}

function saveWorkspace() {
  const name = document.getElementById('workspace-input-name').value.trim();
  if (!name) return;
  if (editingId) { updateWorkspace(editingId, name); }
  else           { createWorkspace(name); }
  closePopup('popup-workspace');
}

/* ═══════════════════════════════════════════
   POPUP: WEEKLY ROUTINE
═══════════════════════════════════════════ */
function openRoutinePopup(routineId) {
  editingId = routineId;
  const isNew = !routineId;
  document.getElementById('popup-routine-title').textContent = isNew ? 'New Routine' : 'Edit Routine';
  document.getElementById('btn-routine-delete').style.display = isNew ? 'none' : '';

  const wsSelect = document.getElementById('routine-input-workspace');
  wsSelect.innerHTML = '';
  data.workspaces.filter(w => !w.isAll).forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id;
    opt.textContent = ws.name;
    wsSelect.appendChild(opt);
  });

  if (isNew) {
    document.getElementById('routine-input-title').value = '';
    document.getElementById('routine-input-count').value = 3;
    const defWs = isAll() ? data.workspaces.find(w => !w.isAll)?.id || '' : data.currentWorkspaceId;
    wsSelect.value = defWs;
  } else {
    const r = data.weeklyRoutines.find(x => x.id === routineId);
    document.getElementById('routine-input-title').value = r.title;
    document.getElementById('routine-input-count').value = r.targetCount;
    wsSelect.value = r.workspaceId;
  }
  openPopup('popup-routine');
}

function saveRoutine() {
  const title = document.getElementById('routine-input-title').value.trim();
  if (!title) return;
  const targetCount = parseInt(document.getElementById('routine-input-count').value) || 1;
  const workspaceId = document.getElementById('routine-input-workspace').value;

  if (editingId) {
    const r = data.weeklyRoutines.find(x => x.id === editingId);
    if (r) { r.title = title; r.targetCount = targetCount; r.workspaceId = workspaceId; }
  } else {
    data.weeklyRoutines.push({ id: genId(), title, targetCount, currentCount: 0, workspaceId });
  }
  saveData(); renderAll();
  closePopup('popup-routine');
}

function deleteRoutine(id) {
  data.weeklyRoutines = data.weeklyRoutines.filter(x => x.id !== id);
  saveData(); renderAll();
}

/* ═══════════════════════════════════════════
   POPUP: PROJECT
═══════════════════════════════════════════ */
function openProjectPopup(projectId) {
  editingId = projectId;
  const isNew = !projectId;
  document.getElementById('popup-project-title').textContent = isNew ? 'New Project' : 'Edit Project';
  document.getElementById('btn-project-delete').style.display = isNew ? 'none' : '';

  const proj = isNew ? null : data.projects.find(x => x.id === projectId);
  document.getElementById('project-input-name').value = proj ? proj.name : '';
  selectedColor = proj ? proj.color : COLORS[0];
  renderColorSwatches('project-color-swatches', selectedColor, (c) => { selectedColor = c; });

  openPopup('popup-project');
}

function saveProject() {
  const name = document.getElementById('project-input-name').value.trim();
  if (!name) return;
  if (editingId) {
    const p = data.projects.find(x => x.id === editingId);
    if (p) { p.name = name; p.color = selectedColor; }
  } else {
    data.projects.push({ id: genId(), name, color: selectedColor });
  }
  saveData(); renderAll();
  closePopup('popup-project');
}

function deleteProject(id) {
  data.tasks.forEach(t => { if (t.projectId === id) t.projectId = ''; });
  data.projects = data.projects.filter(x => x.id !== id);
  saveData(); renderAll();
}

/* ═══════════════════════════════════════════
   POPUP: CATEGORY
═══════════════════════════════════════════ */
function openCategoryPopup(categoryId, prefillWsId) {
  editingId = categoryId;
  const isNew = !categoryId;
  document.getElementById('popup-category-title').textContent = isNew ? 'New Category' : 'Edit Category';
  document.getElementById('btn-category-delete').style.display = isNew ? 'none' : '';

  const wsSelect = document.getElementById('category-input-workspace');
  wsSelect.innerHTML = '';
  data.workspaces.filter(w => !w.isAll).forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id;
    opt.textContent = ws.name;
    wsSelect.appendChild(opt);
  });

  const cat = isNew ? null : data.categories.find(x => x.id === categoryId);
  document.getElementById('category-input-name').value = cat ? cat.name : '';
  selectedColor = cat ? cat.color : COLORS[0];
  renderColorSwatches('category-color-swatches', selectedColor, (c) => { selectedColor = c; });

  if (cat) { wsSelect.value = cat.workspaceId; }
  else if (prefillWsId) { wsSelect.value = prefillWsId; }
  else {
    const defWs = isAll() ? data.workspaces.find(w => !w.isAll)?.id || '' : data.currentWorkspaceId;
    wsSelect.value = defWs;
  }

  openPopup('popup-category');
}

function saveCategory() {
  const name = document.getElementById('category-input-name').value.trim();
  if (!name) return;
  const workspaceId = document.getElementById('category-input-workspace').value;

  if (editingId) {
    const c = data.categories.find(x => x.id === editingId);
    if (c) { c.name = name; c.color = selectedColor; c.workspaceId = workspaceId; }
  } else {
    data.categories.push({ id: genId(), name, color: selectedColor, workspaceId });
  }
  saveData(); renderAll();
  closePopup('popup-category');
}

function deleteCategory(id) {
  data.tasks.forEach(t => { if (t.categoryId === id) t.categoryId = ''; });
  data.categories = data.categories.filter(x => x.id !== id);
  saveData(); renderAll();
}

/* ═══════════════════════════════════════════
   POPUP: MOVE TASK
═══════════════════════════════════════════ */
function openMovePopup(tasks, defaultDate) {
  movingTaskIds = tasks.map(t => t.id);
  const listEl = document.getElementById('move-task-list');
  listEl.innerHTML = '';

  tasks.forEach(t => {
    const row = document.createElement('div');
    row.className = 'move-task-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.dataset.id = t.id;
    const lbl = document.createElement('span');
    lbl.textContent = t.title;
    row.appendChild(cb);
    row.appendChild(lbl);
    listEl.appendChild(row);
  });

  document.getElementById('move-input-date').value = defaultDate;
  openPopup('popup-move');
}

function saveMove() {
  const newDate = document.getElementById('move-input-date').value;
  if (!newDate) return;
  const checkboxes = document.querySelectorAll('#move-task-list input[type="checkbox"]');
  checkboxes.forEach(cb => {
    if (cb.checked) moveTask(cb.dataset.id, newDate);
  });
  closePopup('popup-move');
}

/* ═══════════════════════════════════════════
   COLOR SWATCHES RENDERER
═══════════════════════════════════════════ */
function renderColorSwatches(containerId, current, onChange) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  COLORS.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (color === current ? ' selected' : '');
    sw.style.background = color;
    sw.addEventListener('click', () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      onChange(color);
    });
    container.appendChild(sw);
  });
}

/* ═══════════════════════════════════════════
   INLINE ADD: DAILY ROUTINES
═══════════════════════════════════════════ */
function showInlineAdd(type, afterBtnId) {
  // Remove any existing inline input first
  const existing = document.querySelector('.daily-inline-input');
  if (existing) existing.remove();

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'daily-inline-input';
  input.placeholder = 'Add routine...';

  const btn = document.getElementById(afterBtnId);
  btn.parentNode.insertBefore(input, btn.nextSibling);
  input.focus();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addDailyRoutine(type, input.value);
      input.remove();
    }
    if (e.key === 'Escape') { input.remove(); }
  });
  input.addEventListener('blur', () => {
    if (input.value.trim()) addDailyRoutine(type, input.value);
    input.remove();
  });
}

/* ═══════════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════════ */
function initEventListeners() {
  // Overlay: close popup
  document.getElementById('overlay').addEventListener('click', closeActivePopup);

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeActivePopup();
  });

  // Top bar
  document.getElementById('btn-add-workspace').addEventListener('click', () => openWorkspacePopup(null));
  document.getElementById('btn-create-task').addEventListener('click', () => openTaskPopup(null, null));

  // Left panel
  document.getElementById('btn-add-routine').addEventListener('click',  () => openRoutinePopup(null));
  document.getElementById('btn-reset-routines').addEventListener('click', resetWeeklyRoutines);
  document.getElementById('btn-add-project').addEventListener('click',  () => openProjectPopup(null));
  document.getElementById('btn-add-morning').addEventListener('click',  () => showInlineAdd('morning', 'btn-add-morning'));
  document.getElementById('btn-add-evening').addEventListener('click',  () => showInlineAdd('evening', 'btn-add-evening'));
  document.getElementById('btn-reset-day').addEventListener('click',    resetDailyRoutines);

  // Calendar nav
  document.getElementById('btn-prev-month').addEventListener('click', prevMonth);
  document.getElementById('btn-next-month').addEventListener('click', nextMonth);

  // Popup close buttons (data-popup attribute)
  document.querySelectorAll('.popup-close').forEach(btn => {
    btn.addEventListener('click', () => closePopup(btn.dataset.popup));
  });

  // Task popup
  document.getElementById('task-input-workspace').addEventListener('change', (e) => {
    const catId = document.getElementById('task-input-category').value;
    populateCategorySelect(e.target.value, catId);
  });
  document.getElementById('btn-task-save').addEventListener('click', saveTask);
  document.getElementById('btn-task-delete').addEventListener('click', () => {
    if (editingId) { deleteTask(editingId); closePopup('popup-task'); }
  });
  // Toggle done from task popup: double-click chip already closes, but let's add a done checkbox
  // Actually done is toggled by clicking the chip label — simpler to do via edit popup
  // We'll add a "Mark done" toggle inside popup
  addDoneToggleToTaskPopup();

  // Workspace popup
  document.getElementById('btn-workspace-save').addEventListener('click', saveWorkspace);
  document.getElementById('btn-workspace-delete').addEventListener('click', () => {
    if (editingId) { deleteWorkspace(editingId); closePopup('popup-workspace'); }
  });
  document.getElementById('workspace-input-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveWorkspace();
  });

  // Routine popup
  document.getElementById('btn-routine-save').addEventListener('click', saveRoutine);
  document.getElementById('btn-routine-delete').addEventListener('click', () => {
    if (editingId) { deleteRoutine(editingId); closePopup('popup-routine'); }
  });

  // Project popup
  document.getElementById('btn-project-save').addEventListener('click', saveProject);
  document.getElementById('btn-project-delete').addEventListener('click', () => {
    if (editingId) { deleteProject(editingId); closePopup('popup-project'); }
  });

  // Category popup
  document.getElementById('btn-category-save').addEventListener('click', saveCategory);
  document.getElementById('btn-category-delete').addEventListener('click', () => {
    if (editingId) { deleteCategory(editingId); closePopup('popup-category'); }
  });

  // Move popup
  document.getElementById('btn-move-save').addEventListener('click', saveMove);
}

/* ═══════════════════════════════════════════
   DONE TOGGLE IN TASK POPUP
═══════════════════════════════════════════ */
function addDoneToggleToTaskPopup() {
  // Insert a "Done" toggle into task popup body
  const body = document.querySelector('#popup-task .popup-body');
  const row = document.createElement('div');
  row.id = 'task-done-row';
  row.style.cssText = 'display:flex;align-items:center;gap:10px;';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'task-input-done';
  cb.style.cssText = 'width:16px;height:16px;accent-color:var(--accent);cursor:pointer;';

  const lbl = document.createElement('label');
  lbl.htmlFor = 'task-input-done';
  lbl.textContent = 'Mark as done';
  lbl.style.cssText = 'font-size:13px;color:var(--text-secondary);cursor:pointer;text-transform:none;letter-spacing:0;font-weight:400;';

  row.appendChild(cb);
  row.appendChild(lbl);
  body.appendChild(row);

  // Update done state when saving
  const origSave = saveTask;
  // We override via the btn listener — done checkbox value is read in saveTask
}

// Override saveTask to include done
function saveTask() {
  const title = document.getElementById('task-input-title').value.trim();
  if (!title) { document.getElementById('task-input-title').focus(); return; }

  const fields = {
    title,
    date:        document.getElementById('task-input-date').value,
    workspaceId: document.getElementById('task-input-workspace').value,
    categoryId:  document.getElementById('task-input-category').value,
    projectId:   document.getElementById('task-input-project').value,
    note:        document.getElementById('task-input-note').value,
    done:        document.getElementById('task-input-done')?.checked || false,
  };

  if (editingId) {
    updateTask(editingId, fields);
  } else {
    createTask(fields);
  }
  closePopup('popup-task');
}

// Also update openTaskPopup to set done checkbox
const _origOpenTaskPopup = openTaskPopup;
function openTaskPopup(taskId, prefillDate) {
  editingId = taskId;
  const isNew = !taskId;
  document.getElementById('popup-task-title').textContent = isNew ? 'New Task' : 'Edit Task';
  document.getElementById('btn-task-delete').style.display = isNew ? 'none' : '';

  const wsSelect = document.getElementById('task-input-workspace');
  wsSelect.innerHTML = '';
  data.workspaces.filter(w => !w.isAll).forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id;
    opt.textContent = ws.name;
    wsSelect.appendChild(opt);
  });

  const projSelect = document.getElementById('task-input-project');
  projSelect.innerHTML = '<option value="">— No project —</option>';
  data.projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    projSelect.appendChild(opt);
  });

  const doneCb = document.getElementById('task-input-done');

  if (isNew) {
    document.getElementById('task-input-title').value = '';
    document.getElementById('task-input-date').value  = prefillDate || todayStr();
    document.getElementById('task-input-note').value  = '';
    const defWs = isAll() ? data.workspaces.find(w => !w.isAll)?.id || '' : data.currentWorkspaceId;
    wsSelect.value = defWs;
    populateCategorySelect(defWs, '');
    projSelect.value = '';
    if (doneCb) doneCb.checked = false;
  } else {
    const t = data.tasks.find(x => x.id === taskId);
    document.getElementById('task-input-title').value = t.title;
    document.getElementById('task-input-date').value  = t.date;
    document.getElementById('task-input-note').value  = t.note || '';
    wsSelect.value = t.workspaceId || '';
    populateCategorySelect(t.workspaceId, t.categoryId);
    projSelect.value = t.projectId || '';
    if (doneCb) doneCb.checked = t.done || false;
  }

  openPopup('popup-task');
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initEventListeners();
  renderAll();
});

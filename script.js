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
let activePopup  = null;
let editingId    = null;
let selectedColor = COLORS[0];

/* ═══════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════ */
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { data = JSON.parse(raw); return; } catch(e) {} }
  loadDefaultData();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadDefaultData() {
  const today = todayStr();
  data = {
    workspaces: [
      { id: 'ws_all',   name: 'All',          isAll: true },
      { id: 'ws_work',  name: 'Work (Nesuda)'              },
      { id: 'ws_home',  name: 'Home'                       },
      { id: 'ws_study', name: 'Study'                      },
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
        { id: 'er_1', title: 'Journal',  done: false },
        { id: 'er_2', title: 'Skincare', done: false },
      ]
    },
    currentWorkspaceId: 'ws_all',
    currentMonth: today.slice(0, 7),
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

function makeDateStr(year, month0, day) {
  return year + '-' + String(month0 + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
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

function isAll() {
  const ws = data.workspaces.find(w => w.id === data.currentWorkspaceId);
  return ws ? ws.isAll === true : false;
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
  renderCategories();
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
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:flex;align-items:center;';

    const btn = document.createElement('button');
    btn.className = 'ws-tab' + (ws.id === data.currentWorkspaceId ? ' active' : '');
    btn.textContent = ws.name;
    btn.addEventListener('click', () => {
      document.querySelector('.ws-dropdown')?.remove();
      switchWorkspace(ws.id);
    });

    wrap.appendChild(btn);

    // Edit button for non-All workspaces
    if (!ws.isAll) {
      const editBtn = document.createElement('button');
      editBtn.className = 'ws-edit-btn';
      editBtn.title = 'Edit workspace';
      editBtn.innerHTML = '···';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelector('.ws-dropdown')?.remove();
        showWsDropdown(wrap, ws);
      });
      wrap.appendChild(editBtn);
    }

    container.appendChild(wrap);
  });
}

function showWsDropdown(anchorBtn, ws) {
  const dd = document.createElement('div');
  dd.className = 'ws-dropdown';

  const renameBtn = document.createElement('button');
  renameBtn.textContent = 'Rename';
  renameBtn.addEventListener('click', () => { dd.remove(); openWorkspacePopup(ws.id); });

  const addCatBtn = document.createElement('button');
  addCatBtn.textContent = 'Add Category';
  addCatBtn.addEventListener('click', () => { dd.remove(); openCategoryPopup(null, ws.id); });

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete workspace';
  delBtn.className = 'danger';
  delBtn.addEventListener('click', () => { dd.remove(); deleteWorkspace(ws.id); });

  dd.appendChild(renameBtn);
  dd.appendChild(addCatBtn);
  dd.appendChild(delBtn);
  anchorBtn.style.position = 'relative';
  anchorBtn.appendChild(dd);

  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!dd.contains(e.target)) {
        dd.remove();
        document.removeEventListener('click', handler);
      }
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

  // Sort: incomplete first, completed last
  const sorted = [...routines].sort((a, b) => {
    const aDone = a.currentCount >= a.targetCount;
    const bDone = b.currentCount >= b.targetCount;
    if (aDone !== bDone) return aDone ? 1 : -1;
    return 0;
  });

  sorted.forEach(r => {
    const completed = r.currentCount >= r.targetCount;
    const item = document.createElement('div');
    item.className = 'routine-item' + (completed ? ' routine-done' : '');

    const name = document.createElement('span');
    name.className = 'routine-name';
    name.textContent = r.title;
    name.title = r.title;
    name.addEventListener('click', () => { if (!completed) openRoutinePopup(r.id); });

    const counter = document.createElement('span');
    counter.className = 'routine-counter' + (completed ? ' done' : '');
    counter.textContent = r.currentCount + '/' + r.targetCount;

    const minusBtn = document.createElement('button');
    minusBtn.className = 'routine-btn';
    minusBtn.textContent = '−';
    minusBtn.disabled = completed;
    minusBtn.addEventListener('click', () => decrementRoutine(r.id));

    const plusBtn = document.createElement('button');
    plusBtn.className = 'routine-btn';
    plusBtn.textContent = '+';
    plusBtn.disabled = completed;
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
    editBtn.title = 'Edit project';
    editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
    editBtn.addEventListener('click', () => openProjectPopup(p.id));

    item.appendChild(dot);
    item.appendChild(name);
    item.appendChild(editBtn);
    list.appendChild(item);
  });
}

/* ═══════════════════════════════════════════
   RENDER: CATEGORIES
═══════════════════════════════════════════ */
function renderCategories() {
  const list = document.getElementById('categories-list');
  list.innerHTML = '';

  // show categories filtered by current workspace
  const cats = isAll() ? data.categories : data.categories.filter(c => c.workspaceId === data.currentWorkspaceId);

  if (cats.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.textContent = isAll() ? 'No categories yet' : 'No categories in this workspace';
    list.appendChild(hint);
    return;
  }

  cats.forEach(c => {
    const item = document.createElement('div');
    item.className = 'project-item'; // reuse same style

    const dot = document.createElement('div');
    dot.className = 'project-dot';
    dot.style.background = c.color;

    const name = document.createElement('span');
    name.className = 'project-name';
    name.textContent = c.name;
    name.title = c.name;

    // show workspace label when in All view
    if (isAll()) {
      const ws = data.workspaces.find(w => w.id === c.workspaceId);
      if (ws) {
        const wsLabel = document.createElement('span');
        wsLabel.style.cssText = 'font-size:10px;color:var(--text-muted);flex-shrink:0;';
        wsLabel.textContent = ws.name.split(' ')[0]; // short name
        item.appendChild(dot);
        item.appendChild(name);
        item.appendChild(wsLabel);
      }
    } else {
      item.appendChild(dot);
      item.appendChild(name);
    }

    const editBtn = document.createElement('button');
    editBtn.className = 'project-edit-btn';
    editBtn.title = 'Edit category';
    editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
    editBtn.addEventListener('click', () => openCategoryPopup(c.id, null));
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

  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'daily-item';

    // Checkbox
    const box = document.createElement('div');
    box.className = 'daily-checkbox' + (item.done ? ' checked' : '');
    box.addEventListener('click', () => toggleDailyRoutine(type, item.id));

    // Label (click to edit inline)
    const label = document.createElement('span');
    label.className = 'daily-label' + (item.done ? ' done' : '');
    label.textContent = item.title;
    label.title = 'Click to edit';
    label.style.cursor = 'text';
    label.addEventListener('click', () => startInlineEdit(type, item.id, label));

    // Up button
    const upBtn = document.createElement('button');
    upBtn.className = 'daily-order-btn';
    upBtn.textContent = '↑';
    upBtn.title = 'Move up';
    upBtn.style.display = idx === 0 ? 'none' : '';
    upBtn.addEventListener('click', () => moveDailyRoutine(type, idx, -1));

    // Down button
    const downBtn = document.createElement('button');
    downBtn.className = 'daily-order-btn';
    downBtn.textContent = '↓';
    downBtn.title = 'Move down';
    downBtn.style.display = idx === items.length - 1 ? 'none' : '';
    downBtn.addEventListener('click', () => moveDailyRoutine(type, idx, 1));

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'daily-order-btn daily-del-btn';
    delBtn.textContent = '×';
    delBtn.title = 'Delete';
    delBtn.addEventListener('click', () => deleteDailyRoutine(type, item.id));

    row.appendChild(box);
    row.appendChild(label);
    row.appendChild(upBtn);
    row.appendChild(downBtn);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

function startInlineEdit(type, id, labelEl) {
  const item = data.dailyRoutines[type].find(x => x.id === id);
  if (!item) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = item.title;
  input.className = 'daily-inline-input';
  input.style.flex = '1';

  labelEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const val = input.value.trim();
    if (val) { item.title = val; saveData(); }
    renderDailyRoutines();
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') renderDailyRoutines();
  });
  input.addEventListener('blur', commit);
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

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, 1 - (startDow - i));
    grid.appendChild(buildCell(makeDateStr(d.getFullYear(), d.getMonth(), d.getDate()), true));
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const ds   = makeDateStr(year, month, day);
    const cell = buildCell(ds, false);
    if (ds === today) cell.classList.add('today');
    grid.appendChild(cell);
  }

  const total = grid.children.length;
  const rem   = total % 7;
  if (rem !== 0) {
    for (let i = 1; i <= 7 - rem; i++) {
      const d = new Date(year, month + 1, i);
      grid.appendChild(buildCell(makeDateStr(d.getFullYear(), d.getMonth(), d.getDate()), true));
    }
  }
}

function buildCell(ds, otherMonth) {
  const cell = document.createElement('div');
  cell.className = 'cal-cell' + (otherMonth ? ' other-month' : '');

  const dayNum = document.createElement('div');
  dayNum.className = 'cal-day-num';
  dayNum.textContent = parseInt(ds.slice(8));
  cell.appendChild(dayNum);

  // Sort: priority first, then normal, done always last
  const tasks = getTasksForDate(ds).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return 0;
  });

  const taskList = document.createElement('div');
  taskList.className = 'cell-task-list';

  tasks.forEach(t => {
    const chip = document.createElement('div');
    chip.className = 'task-chip'
      + (t.done ? ' done' : '')
      + (t.recurringTemplateId ? ' recurring' : '');

    const dot = document.createElement('div');
    dot.className = 'task-dot';
    dot.style.background = t.categoryId
      ? getCategoryColor(t.categoryId)
      : (t.projectId ? getProjectColor(t.projectId) : '#AAA49C');

    chip.appendChild(dot);

    if (t.priority && !t.done) {
      const excl = document.createElement('span');
      excl.className = 'task-priority-icon';
      excl.textContent = '!';
      chip.appendChild(excl);
    }

    const label = document.createElement('span');
    label.className = 'task-chip-label';
    label.textContent = t.title;
    chip.appendChild(label);

    chip.addEventListener('click', e => { e.stopPropagation(); openTaskPopup(t.id, null); });
    taskList.appendChild(chip);
  });

  cell.appendChild(taskList);

  const actions = document.createElement('div');
  actions.className = 'cal-cell-actions';

  const leftBtn = document.createElement('button');
  leftBtn.className = 'cell-action-btn';
  leftBtn.title = 'Move back one day';
  leftBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
  leftBtn.addEventListener('click', e => { e.stopPropagation(); handleMoveClick(ds, -1); });

  const rightBtn = document.createElement('button');
  rightBtn.className = 'cell-action-btn';
  rightBtn.title = 'Move forward one day';
  rightBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
  rightBtn.addEventListener('click', e => { e.stopPropagation(); handleMoveClick(ds, 1); });

  const addBtn = document.createElement('button');
  addBtn.className = 'cell-action-btn cell-add-btn';
  addBtn.title = 'Add task';
  addBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
  addBtn.addEventListener('click', e => { e.stopPropagation(); openTaskPopup(null, ds); });

  actions.appendChild(leftBtn);
  actions.appendChild(rightBtn);
  actions.appendChild(addBtn);
  cell.appendChild(actions);

  return cell;
}

/* ═══════════════════════════════════════════
   MOVE CLICK
═══════════════════════════════════════════ */
function handleMoveClick(ds, delta) {
  const tasks = getTasksForDate(ds).filter(t => !t.done);
  if (tasks.length === 0) return;
  if (tasks.length === 1) { moveTask(tasks[0].id, shiftDate(ds, delta)); return; }
  openMovePopup(tasks, shiftDate(ds, delta));
}

/* ═══════════════════════════════════════════
   WORKSPACE ACTIONS
═══════════════════════════════════════════ */
function switchWorkspace(wsId) {
  data.currentWorkspaceId = wsId;
  saveData(); renderAll();
}

function createWorkspace(name) {
  data.workspaces.push({ id: genId(), name: name.trim() });
  saveData(); renderAll();
}

function updateWorkspace(id, name) {
  const ws = data.workspaces.find(w => w.id === id);
  if (ws) { ws.name = name.trim(); saveData(); renderAll(); }
}

function deleteWorkspace(id) {
  data.tasks.forEach(t => { if (t.workspaceId === id) t.workspaceId = 'ws_all'; });
  data.weeklyRoutines = data.weeklyRoutines.filter(r => r.workspaceId !== id);
  const catIds = data.categories.filter(c => c.workspaceId === id).map(c => c.id);
  data.tasks.forEach(t => { if (catIds.includes(t.categoryId)) t.categoryId = ''; });
  data.categories = data.categories.filter(c => c.workspaceId !== id);
  data.workspaces  = data.workspaces.filter(w => w.id !== id);
  if (data.currentWorkspaceId === id) data.currentWorkspaceId = 'ws_all';
  saveData(); renderAll();
}

/* ═══════════════════════════════════════════
   TASK ACTIONS
═══════════════════════════════════════════ */
function createTask(fields) {
  data.tasks.push({ id: genId(), done: false, ...fields });
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

function moveTask(id, newDate) {
  const t = data.tasks.find(x => x.id === id);
  if (t) { t.date = newDate; saveData(); renderAll(); }
}

/* ═══════════════════════════════════════════
   RECURRENCE ENGINE
═══════════════════════════════════════════ */

// Returns array of "YYYY-MM-DD" strings that a recurrence rule fires on,
// between startDate (inclusive) and endDate (inclusive).
function getRecurrenceDates(rule, startDate, endDate) {
  const dates = [];
  const end   = new Date(endDate   + 'T00:00:00');
  const cur   = new Date(startDate + 'T00:00:00');
  const until = rule.until ? new Date(rule.until + 'T00:00:00') : end;
  const stop  = until < end ? until : end;

  while (cur <= stop) {
    const ds = cur.toISOString().slice(0, 10);
    if (matchesRule(rule, cur)) dates.push(ds);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function matchesRule(rule, date) {
  const dow  = date.getDay(); // 0=Sun … 6=Sat
  const dom  = date.getDate();
  const month = date.getMonth();
  const year  = date.getFullYear();

  switch (rule.type) {
    case 'daily':
      return true;

    case 'weekly':
      // rule.dayOfWeek: 0=Sun…6=Sat
      return dow === rule.dayOfWeek;

    case 'nweekly': {
      // every N weeks on a specific day, anchored to rule.anchor date
      if (dow !== rule.dayOfWeek) return false;
      const anchor = new Date(rule.anchor + 'T00:00:00');
      const diffMs = date - anchor;
      const diffWeeks = Math.round(diffMs / (7 * 86400000));
      return diffWeeks >= 0 && diffWeeks % rule.interval === 0;
    }

    case 'monthly-date':
      return dom === rule.dayOfMonth;

    case 'monthly-dow': {
      // e.g. "2nd Tuesday" or "Last Friday"
      if (dow !== rule.dayOfWeek) return false;
      if (rule.weekOfMonth === -1) {
        // last occurrence of this weekday in the month
        const lastDay = new Date(year, month + 1, 0).getDate();
        return dom > lastDay - 7;
      }
      // Nth occurrence: count how many times this weekday has appeared so far
      const occurrence = Math.ceil(dom / 7);
      return occurrence === rule.weekOfMonth;
    }

    default:
      return false;
  }
}

// Called on init and when navigating months — generates instances for next 90 days
function generateRecurringInstances() {
  const today  = todayStr();
  const future = shiftDate(today, 90);

  // Find all template tasks (have recurrence, not themselves instances)
  const templates = data.tasks.filter(t => t.recurrence && !t.recurringTemplateId);

  templates.forEach(tmpl => {
    const dates = getRecurrenceDates(tmpl.recurrence, today, future);
    dates.forEach(ds => {
      // Skip if instance already exists for this date
      const exists = data.tasks.some(t =>
        t.recurringTemplateId === tmpl.id && t.date === ds
      );
      if (!exists) {
        data.tasks.push({
          id:                  genId(),
          title:               tmpl.title,
          date:                ds,
          categoryId:          tmpl.categoryId,
          workspaceId:         tmpl.workspaceId,
          projectId:           tmpl.projectId,
          note:                '',
          done:                false,
          priority:            tmpl.priority || false,
          recurringTemplateId: tmpl.id,   // link back to template
        });
      }
    });
  });
  saveData();
}

// Delete options for recurring task
function deleteRecurringTask(taskId) {
  const t = data.tasks.find(x => x.id === taskId);
  if (!t) return;

  if (t.recurringTemplateId) {
    // It's an instance — ask: just this, or this + future
    showDeleteRecurModal(t);
  } else if (t.recurrence) {
    // It's the template itself — delete template + all future instances
    if (confirm('Delete this recurring task and all its future instances?')) {
      const today = todayStr();
      data.tasks = data.tasks.filter(x =>
        x.id !== taskId &&
        !(x.recurringTemplateId === taskId && x.date >= today && !x.done)
      );
      saveData(); renderAll();
    }
  } else {
    deleteTask(taskId);
  }
}

function showDeleteRecurModal(instance) {
  // Simple confirm-based choice (no extra popup needed)
  const choice = confirm(
    'Delete just this occurrence?\n\nOK = only this date\nCancel = this + all future instances'
  );
  if (choice) {
    // just this one
    data.tasks = data.tasks.filter(x => x.id !== instance.id);
  } else {
    // this + all future not-done instances of same template
    data.tasks = data.tasks.filter(x =>
      x.id !== instance.id &&
      !(x.recurringTemplateId === instance.recurringTemplateId &&
        x.date >= instance.date && !x.done)
    );
  }
  saveData(); renderAll();
  closePopup('popup-task');
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
  ['morning', 'evening'].forEach(type => {
    data.dailyRoutines[type].forEach(x => { x.done = false; });
  });
  saveData(); renderDailyRoutines();
}

function addDailyRoutine(type, title) {
  if (!title.trim()) return;
  const prefix = type === 'morning' ? 'mr_' : 'er_';
  data.dailyRoutines[type].push({ id: prefix + genId(), title: title.trim(), done: false });
  saveData(); renderDailyRoutines();
}

function deleteDailyRoutine(type, id) {
  data.dailyRoutines[type] = data.dailyRoutines[type].filter(x => x.id !== id);
  saveData(); renderDailyRoutines();
}

function moveDailyRoutine(type, idx, delta) {
  const arr = data.dailyRoutines[type];
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= arr.length) return;
  const tmp = arr[idx];
  arr[idx] = arr[newIdx];
  arr[newIdx] = tmp;
  saveData(); renderDailyRoutines();
}

/* ═══════════════════════════════════════════
   CALENDAR NAVIGATION
═══════════════════════════════════════════ */
function prevMonth() { data.currentMonth = shiftMonth(data.currentMonth, -1); saveData(); renderCalendar(); }
function nextMonth() { data.currentMonth = shiftMonth(data.currentMonth,  1); saveData(); renderCalendar(); }

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
  editingId   = null;
}

function closeActivePopup() { if (activePopup) closePopup(activePopup); }

/* ═══════════════════════════════════════════
   POPUP: TASK
═══════════════════════════════════════════ */
function openTaskPopup(taskId, prefillDate) {
  editingId   = taskId;
  const isNew = !taskId;

  document.getElementById('popup-task-title').textContent  = isNew ? 'New Task' : 'Edit Task';
  document.getElementById('btn-task-delete').style.display = isNew ? 'none' : '';

  const wsSelect = document.getElementById('task-input-workspace');
  wsSelect.innerHTML = '';
  data.workspaces.filter(w => !w.isAll).forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id; opt.textContent = ws.name;
    wsSelect.appendChild(opt);
  });

  const projSelect = document.getElementById('task-input-project');
  projSelect.innerHTML = '<option value="">— No project —</option>';
  data.projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.textContent = p.name;
    projSelect.appendChild(opt);
  });

  const doneCb     = document.getElementById('task-input-done');
  const priorityCb = document.getElementById('task-input-priority');

  if (isNew) {
    document.getElementById('task-input-title').value = '';
    document.getElementById('task-input-date').value  = prefillDate || todayStr();
    document.getElementById('task-input-note').value  = '';
    const defWs = isAll()
      ? (data.workspaces.find(w => !w.isAll)?.id || '')
      : data.currentWorkspaceId;
    wsSelect.value = defWs;
    populateCategorySelect(defWs, '');
    projSelect.value = '';
    if (doneCb)     doneCb.checked     = false;
    if (priorityCb) priorityCb.checked = false;
  } else {
    const t = data.tasks.find(x => x.id === taskId);
    document.getElementById('task-input-title').value = t.title;
    document.getElementById('task-input-date').value  = t.date;
    document.getElementById('task-input-note').value  = t.note || '';
    wsSelect.value   = t.workspaceId || '';
    projSelect.value = t.projectId   || '';
    populateCategorySelect(t.workspaceId, t.categoryId);
    if (doneCb)     doneCb.checked     = t.done     || false;
    if (priorityCb) priorityCb.checked = t.priority || false;
  }

  openPopup('popup-task');
  document.getElementById('task-input-title').focus();

  // Load recurrence UI state
  const repeatCb = document.getElementById('task-input-repeat');
  if (isNew || !editingId) {
    repeatCb.checked = false;
    showRecurrenceOptions(false);
    resetRecurrenceUI(null);
  } else {
    const t = data.tasks.find(x => x.id === editingId);
    const hasRecur = !!(t && t.recurrence && !t.recurringTemplateId);
    repeatCb.checked = hasRecur;
    showRecurrenceOptions(hasRecur);
    resetRecurrenceUI(hasRecur ? t.recurrence : null);
  }
}

function populateCategorySelect(wsId, selectedCatId) {
  const catSelect = document.getElementById('task-input-category');
  catSelect.innerHTML = '<option value="">— No category —</option>';
  getCategoriesForWorkspace(wsId).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    catSelect.appendChild(opt);
  });
  catSelect.value = selectedCatId || '';
}

function saveTask() {
  const title = document.getElementById('task-input-title').value.trim();
  if (!title) { document.getElementById('task-input-title').focus(); return; }

  const doneCb     = document.getElementById('task-input-done');
  const priorityCb = document.getElementById('task-input-priority');
  const repeatCb   = document.getElementById('task-input-repeat');

  const fields = {
    title,
    date:        document.getElementById('task-input-date').value || todayStr(),
    workspaceId: document.getElementById('task-input-workspace').value,
    categoryId:  document.getElementById('task-input-category').value,
    projectId:   document.getElementById('task-input-project').value,
    note:        document.getElementById('task-input-note').value,
    done:        doneCb     ? doneCb.checked     : false,
    priority:    priorityCb ? priorityCb.checked : false,
    recurrence:  (repeatCb && repeatCb.checked) ? buildRecurrenceRule() : null,
  };

  if (editingId) {
    updateTask(editingId, fields);
    // Regenerate instances if recurrence changed
    if (fields.recurrence) generateRecurringInstances();
  } else {
    createTask(fields);
    if (fields.recurrence) generateRecurringInstances();
  }
  closePopup('popup-task');
}

/* ═══════════════════════════════════════════
   POPUP: WORKSPACE
═══════════════════════════════════════════ */
function openWorkspacePopup(wsId) {
  editingId   = wsId;
  const isNew = !wsId;
  document.getElementById('popup-workspace-title').textContent  = isNew ? 'New Workspace' : 'Rename Workspace';
  document.getElementById('btn-workspace-delete').style.display = isNew ? 'none' : '';
  const ws = isNew ? null : data.workspaces.find(w => w.id === wsId);
  document.getElementById('workspace-input-name').value = ws ? ws.name : '';
  openPopup('popup-workspace');
  setTimeout(() => document.getElementById('workspace-input-name').focus(), 60);
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
  editingId   = routineId;
  const isNew = !routineId;
  document.getElementById('popup-routine-title').textContent  = isNew ? 'New Routine' : 'Edit Routine';
  document.getElementById('btn-routine-delete').style.display = isNew ? 'none' : '';

  const wsSelect = document.getElementById('routine-input-workspace');
  wsSelect.innerHTML = '';
  data.workspaces.filter(w => !w.isAll).forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id; opt.textContent = ws.name;
    wsSelect.appendChild(opt);
  });

  if (isNew) {
    document.getElementById('routine-input-title').value = '';
    document.getElementById('routine-input-count').value = 3;
    const defWs = isAll()
      ? (data.workspaces.find(w => !w.isAll)?.id || '')
      : data.currentWorkspaceId;
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
  editingId   = projectId;
  const isNew = !projectId;
  document.getElementById('popup-project-title').textContent  = isNew ? 'New Project' : 'Edit Project';
  document.getElementById('btn-project-delete').style.display = isNew ? 'none' : '';

  const proj = isNew ? null : data.projects.find(x => x.id === projectId);
  document.getElementById('project-input-name').value = proj ? proj.name : '';
  selectedColor = proj ? proj.color : COLORS[0];
  renderColorSwatches('project-color-swatches', selectedColor, c => { selectedColor = c; });
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
  editingId   = categoryId;
  const isNew = !categoryId;
  document.getElementById('popup-category-title').textContent  = isNew ? 'New Category' : 'Edit Category';
  document.getElementById('btn-category-delete').style.display = isNew ? 'none' : '';

  const wsSelect = document.getElementById('category-input-workspace');
  wsSelect.innerHTML = '';
  data.workspaces.filter(w => !w.isAll).forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id; opt.textContent = ws.name;
    wsSelect.appendChild(opt);
  });

  const cat = isNew ? null : data.categories.find(x => x.id === categoryId);
  document.getElementById('category-input-name').value = cat ? cat.name : '';
  selectedColor = cat ? cat.color : COLORS[0];
  renderColorSwatches('category-color-swatches', selectedColor, c => { selectedColor = c; });

  if (cat) { wsSelect.value = cat.workspaceId; }
  else if (prefillWsId) { wsSelect.value = prefillWsId; }
  else {
    wsSelect.value = isAll()
      ? (data.workspaces.find(w => !w.isAll)?.id || '')
      : data.currentWorkspaceId;
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
  const listEl = document.getElementById('move-task-list');
  listEl.innerHTML = '';
  tasks.forEach(t => {
    const row = document.createElement('div');
    row.className = 'move-task-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = true; cb.dataset.id = t.id;
    const lbl = document.createElement('span');
    lbl.textContent = t.title;
    row.appendChild(cb); row.appendChild(lbl);
    listEl.appendChild(row);
  });
  document.getElementById('move-input-date').value = defaultDate;
  openPopup('popup-move');
}

function saveMove() {
  const newDate = document.getElementById('move-input-date').value;
  if (!newDate) return;
  document.querySelectorAll('#move-task-list input[type="checkbox"]').forEach(cb => {
    if (cb.checked) moveTask(cb.dataset.id, newDate);
  });
  closePopup('popup-move');
}

/* ═══════════════════════════════════════════
   COLOR SWATCHES
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
  document.querySelector('.daily-inline-input')?.remove();
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'daily-inline-input';
  input.placeholder = 'Type and press Enter...';
  const btn = document.getElementById(afterBtnId);
  btn.parentNode.insertBefore(input, btn);
  input.focus();
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { addDailyRoutine(type, input.value); input.remove(); }
    if (e.key === 'Escape') { input.remove(); }
  });
  input.addEventListener('blur', () => {
    if (input.value.trim()) addDailyRoutine(type, input.value);
    setTimeout(() => input.remove(), 100);
  });
}

/* ═══════════════════════════════════════════
   INJECT DONE TOGGLE (once, on page load)
═══════════════════════════════════════════ */
function injectDoneToggle() {
  if (document.getElementById('task-input-done')) return;
  const body = document.querySelector('#popup-task .popup-body');

  // Priority row
  const priorityRow = document.createElement('div');
  priorityRow.style.cssText = 'display:flex;align-items:center;gap:10px;padding:2px 0;';

  const priorityCb = document.createElement('input');
  priorityCb.type = 'checkbox';
  priorityCb.id   = 'task-input-priority';
  priorityCb.style.cssText = 'width:16px;height:16px;accent-color:#D4AC0D;cursor:pointer;flex-shrink:0;';

  const priorityLbl = document.createElement('label');
  priorityLbl.htmlFor     = 'task-input-priority';
  priorityLbl.innerHTML   = '<span style="color:#D4AC0D;font-weight:700;margin-right:4px;">!</span> Priority';
  priorityLbl.style.cssText = 'font-size:13px;color:var(--text-secondary);cursor:pointer;'
    + 'text-transform:none;letter-spacing:0;font-weight:400;display:flex;align-items:center;';

  priorityRow.appendChild(priorityCb);
  priorityRow.appendChild(priorityLbl);
  body.appendChild(priorityRow);

  // Done row
  const doneRow = document.createElement('div');
  doneRow.style.cssText = 'display:flex;align-items:center;gap:10px;padding:2px 0;';

  const doneCb = document.createElement('input');
  doneCb.type = 'checkbox';
  doneCb.id   = 'task-input-done';
  doneCb.style.cssText = 'width:16px;height:16px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;';

  const doneLbl = document.createElement('label');
  doneLbl.htmlFor     = 'task-input-done';
  doneLbl.textContent = 'Mark as done';
  doneLbl.style.cssText = 'font-size:13px;color:var(--text-secondary);cursor:pointer;'
    + 'text-transform:none;letter-spacing:0;font-weight:400;';

  doneRow.appendChild(doneCb);
  doneRow.appendChild(doneLbl);
  body.appendChild(doneRow);
}

/* ═══════════════════════════════════════════
   RECURRENCE UI
═══════════════════════════════════════════ */
const DOW_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function initRecurrenceUI() {
  // Build day-of-week button groups
  buildDowBtns('recur-dow-btns');
  buildDowBtns('recur-mdow-btns');

  // Toggle options visibility
  document.getElementById('task-input-repeat').addEventListener('change', e => {
    showRecurrenceOptions(e.target.checked);
  });

  // Type change
  document.getElementById('recur-type').addEventListener('change', updateRecurrenceRows);
}

function buildDowBtns(containerId) {
  const container = document.getElementById(containerId);
  DOW_LABELS.forEach((lbl, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = lbl;
    btn.dataset.dow = idx;
    btn.className = 'dow-btn';
    btn.addEventListener('click', () => {
      // single select within this group
      container.querySelectorAll('.dow-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    container.appendChild(btn);
  });
}

function showRecurrenceOptions(show) {
  const opts = document.getElementById('recurrence-options');
  opts.style.display = show ? 'flex' : 'none';
  if (show) updateRecurrenceRows();
}

function updateRecurrenceRows() {
  const type = document.getElementById('recur-type').value;
  document.getElementById('recur-dow-row').style.display =
    (type === 'weekly' || type === 'nweekly') ? 'flex' : 'none';
  document.getElementById('recur-interval-row').style.display =
    type === 'nweekly' ? 'flex' : 'none';
  document.getElementById('recur-mday-row').style.display =
    type === 'monthly-date' ? 'flex' : 'none';
  document.getElementById('recur-mdow-row').style.display =
    type === 'monthly-dow' ? 'flex' : 'none';
}

function resetRecurrenceUI(rule) {
  const typeEl = document.getElementById('recur-type');
  if (!rule) {
    typeEl.value = 'weekly';
    selectDow('recur-dow-btns', 1); // Monday default
    selectDow('recur-mdow-btns', 1);
    document.getElementById('recur-interval').value = 2;
    document.getElementById('recur-mday').value = 1;
    document.getElementById('recur-week-of-month').value = 1;
    document.getElementById('recur-until').value = '';
    updateRecurrenceRows();
    return;
  }
  typeEl.value = rule.type;
  document.getElementById('recur-interval').value = rule.interval || 2;
  document.getElementById('recur-mday').value = rule.dayOfMonth || 1;
  document.getElementById('recur-week-of-month').value = rule.weekOfMonth || 1;
  document.getElementById('recur-until').value = rule.until || '';
  if (rule.dayOfWeek !== undefined) {
    selectDow('recur-dow-btns',  rule.dayOfWeek);
    selectDow('recur-mdow-btns', rule.dayOfWeek);
  }
  updateRecurrenceRows();
}

function selectDow(containerId, dow) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.dow-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.dataset.dow) === dow);
  });
}

function getSelectedDow(containerId) {
  const sel = document.getElementById(containerId).querySelector('.dow-btn.selected');
  return sel ? parseInt(sel.dataset.dow) : 1;
}

function buildRecurrenceRule() {
  const type     = document.getElementById('recur-type').value;
  const until    = document.getElementById('recur-until').value || null;
  const startDate = document.getElementById('task-input-date').value || todayStr();

  switch (type) {
    case 'daily':
      return { type: 'daily', until };

    case 'weekly':
      return { type: 'weekly', dayOfWeek: getSelectedDow('recur-dow-btns'), until };

    case 'nweekly':
      return {
        type: 'nweekly',
        dayOfWeek: getSelectedDow('recur-dow-btns'),
        interval:  parseInt(document.getElementById('recur-interval').value) || 2,
        anchor:    startDate,
        until,
      };

    case 'monthly-date':
      return {
        type: 'monthly-date',
        dayOfMonth: parseInt(document.getElementById('recur-mday').value) || 1,
        until,
      };

    case 'monthly-dow':
      return {
        type: 'monthly-dow',
        weekOfMonth: parseInt(document.getElementById('recur-week-of-month').value),
        dayOfWeek:   getSelectedDow('recur-mdow-btns'),
        until,
      };
  }
}
function initEventListeners() {
  document.getElementById('overlay').addEventListener('click', closeActivePopup);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeActivePopup(); });

  // Top bar
  document.getElementById('btn-add-workspace').addEventListener('click', () => openWorkspacePopup(null));
  document.getElementById('btn-create-task').addEventListener('click',   () => openTaskPopup(null, null));

  // Left panel
  document.getElementById('btn-add-routine').addEventListener('click',    () => openRoutinePopup(null));
  document.getElementById('btn-reset-routines').addEventListener('click', resetWeeklyRoutines);
  document.getElementById('btn-add-project').addEventListener('click',    () => openProjectPopup(null));
  document.getElementById('btn-add-category').addEventListener('click',   () => openCategoryPopup(null, null));
  document.getElementById('btn-add-morning').addEventListener('click',    () => showInlineAdd('morning', 'btn-add-morning'));
  document.getElementById('btn-add-evening').addEventListener('click',    () => showInlineAdd('evening', 'btn-add-evening'));
  document.getElementById('btn-reset-day').addEventListener('click',      resetDailyRoutines);

  // Calendar
  document.getElementById('btn-prev-month').addEventListener('click', prevMonth);
  document.getElementById('btn-next-month').addEventListener('click', nextMonth);

  // Popup close buttons
  document.querySelectorAll('.popup-close').forEach(btn => {
    btn.addEventListener('click', () => closePopup(btn.dataset.popup));
  });

  // Task popup
  document.getElementById('task-input-workspace').addEventListener('change', e => {
    populateCategorySelect(e.target.value, document.getElementById('task-input-category').value);
  });
  document.getElementById('btn-task-save').addEventListener('click', saveTask);
  document.getElementById('btn-task-delete').addEventListener('click', () => {
    if (editingId) deleteRecurringTask(editingId);
  });

  // Workspace popup
  document.getElementById('btn-workspace-save').addEventListener('click', saveWorkspace);
  document.getElementById('btn-workspace-delete').addEventListener('click', () => {
    if (editingId) { deleteWorkspace(editingId); closePopup('popup-workspace'); }
  });
  document.getElementById('workspace-input-name').addEventListener('keydown', e => {
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
   INIT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  injectDoneToggle();
  initEventListeners();
  initRecurrenceUI();
  generateRecurringInstances();
  renderAll();
});

/* ═══════════════════════════════════════════
   ARCHIVE.JS
   Reads from shared localStorage 'planner_data'
═══════════════════════════════════════════ */

const STORAGE_KEY = 'planner_data';

let data    = {};
let filters = {
  dateFrom:  '',
  dateTo:    '',
  workspace: 'all',
  status:    'all',
  moves:     'all',
  view:      'list',
};

/* ─── Storage ─── */
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { data = JSON.parse(raw); } catch(e) {} }
  if (!data.tasks)      data.tasks      = [];
  if (!data.workspaces) data.workspaces = [];
}

/* ─── Helpers ─── */
function getCategoryColor(categoryId) {
  const cat = (data.categories || []).find(c => c.id === categoryId);
  return cat ? cat.color : '#AAA49C';
}

function getWorkspaceName(wsId) {
  const ws = (data.workspaces || []).find(w => w.id === wsId);
  return ws ? ws.name : wsId || '—';
}

function moveCount(task) {
  return (task.moveHistory || []).length;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ─── Filter ─── */
function getFilteredTasks() {
  return data.tasks.filter(t => {
    // Skip recurring template tasks (they have no date of their own to show)
    if (t.recurrence && !t.recurringTemplateId) return false;

    // Date range — use task date
    if (filters.dateFrom && t.date < filters.dateFrom) return false;
    if (filters.dateTo   && t.date > filters.dateTo)   return false;

    // Workspace
    if (filters.workspace !== 'all' && t.workspaceId !== filters.workspace) return false;

    // Status
    if (filters.status === 'done'    && !t.done)  return false;
    if (filters.status === 'pending' &&  t.done)  return false;

    // Moves
    const mc = moveCount(t);
    if (filters.moves === 'moved'  && mc < 1) return false;
    if (filters.moves === 'stuck'  && mc < 3) return false;
    if (filters.moves === 'never'  && mc > 0) return false;

    return true;
  }).sort((a, b) => {
    // Sort by date desc, done last within same date
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.done !== b.done) return a.done ? 1 : -1;
    return 0;
  });
}

/* ─── Stats ─── */
function updateStats(tasks) {
  const total    = tasks.length;
  const done     = tasks.filter(t => t.done).length;
  const rate     = total > 0 ? Math.round((done / total) * 100) : 0;
  const moved    = tasks.filter(t => moveCount(t) > 0).length;
  const totalMoves = tasks.reduce((sum, t) => sum + moveCount(t), 0);
  const avgMoves = moved > 0 ? (totalMoves / moved).toFixed(1) : '0';
  const priorityTasks = tasks.filter(t => t.priority);
  const priorityDone  = priorityTasks.filter(t => t.done).length;
  const priorityRate  = priorityTasks.length > 0
    ? Math.round((priorityDone / priorityTasks.length) * 100) : 0;

  document.getElementById('stat-total').textContent        = total;
  document.getElementById('stat-done').textContent         = done;
  document.getElementById('stat-rate').textContent         = rate + '%';
  document.getElementById('stat-moved').textContent        = moved;
  document.getElementById('stat-avg-moves').textContent    = avgMoves;
  document.getElementById('stat-priority-done').textContent = priorityRate + '%';
}

/* ─── Render ─── */
function renderArchive() {
  const tasks = getFilteredTasks();
  updateStats(tasks);
  const main = document.getElementById('archive-main');
  main.innerHTML = '';

  if (tasks.length === 0) {
    main.innerHTML = '<div class="archive-empty">No tasks match your filters</div>';
    return;
  }

  if (filters.view === 'grouped') {
    renderGrouped(tasks, main);
  } else {
    renderList(tasks, main);
  }

  lucide.createIcons();
}

function renderList(tasks, container) {
  tasks.forEach(t => container.appendChild(buildRow(t)));
}

function renderGrouped(tasks, container) {
  // Group by workspace
  const groups = {};
  tasks.forEach(t => {
    const key = t.workspaceId || 'none';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  Object.entries(groups).forEach(([wsId, wsTasks]) => {
    const header = document.createElement('div');
    header.className = 'archive-group-header';
    header.textContent = getWorkspaceName(wsId)
      + '  —  ' + wsTasks.length + ' tasks'
      + '  (' + wsTasks.filter(t => t.done).length + ' done)';
    container.appendChild(header);
    wsTasks.forEach(t => container.appendChild(buildRow(t)));
  });
}

function buildRow(t) {
  const row = document.createElement('div');
  row.className = 'archive-row';

  // Title + priority icon
  const titleWrap = document.createElement('div');
  titleWrap.style.cssText = 'display:flex;align-items:center;gap:5px;min-width:0;';

  const dot = document.createElement('div');
  dot.className = 'archive-cat-dot';
  dot.style.background = getCategoryColor(t.categoryId);
  dot.style.flexShrink = '0';

  if (t.priority && !t.done) {
    const excl = document.createElement('span');
    excl.className = 'archive-priority-icon';
    excl.textContent = '!';
    titleWrap.appendChild(dot);
    titleWrap.appendChild(excl);
  } else {
    titleWrap.appendChild(dot);
  }

  const title = document.createElement('span');
  title.className = 'archive-row-title' + (t.done ? ' done' : '');
  title.textContent = t.title;
  title.title = t.title;
  titleWrap.appendChild(title);

  // Date info
  const dateEl = document.createElement('span');
  dateEl.className = 'archive-meta';
  const dateParts = [t.date || '—'];
  if (t.completedAt && t.completedAt !== t.date) dateParts.push('✓ ' + t.completedAt);
  dateEl.textContent = dateParts.join(' → ');

  // Workspace badge
  const wsBadge = document.createElement('span');
  wsBadge.className = 'archive-ws-badge';
  wsBadge.textContent = getWorkspaceName(t.workspaceId)?.split(' ')[0] || '—';

  // Move count
  const mc = moveCount(t);
  const movesEl = document.createElement('span');
  movesEl.className = 'archive-moves' + (mc >= 3 ? ' many' : '');
  movesEl.title = buildMoveTooltip(t);
  movesEl.textContent = mc === 0 ? '—' : '↻ ' + mc + (mc === 1 ? ' move' : ' moves');

  // Created date
  const createdEl = document.createElement('span');
  createdEl.className = 'archive-meta';
  createdEl.textContent = t.createdAt ? 'created ' + t.createdAt : '';

  row.appendChild(titleWrap);
  row.appendChild(dateEl);
  row.appendChild(wsBadge);
  row.appendChild(movesEl);
  row.appendChild(createdEl);

  return row;
}

function buildMoveTooltip(t) {
  if (!t.moveHistory || t.moveHistory.length === 0) return 'Never moved';
  return t.moveHistory.map(m => m.from + ' → ' + m.to + ' (on ' + m.on + ')').join('\n');
}

/* ─── CSV Export ─── */
function exportCSV() {
  const tasks = getFilteredTasks();

  const headers = [
    'Title', 'Date', 'Workspace', 'Category', 'Project',
    'Priority', 'Done', 'Created at', 'Completed at',
    'Times moved', 'Move history', 'Note'
  ];

  const rows = tasks.map(t => {
    const cat  = (data.categories || []).find(c => c.id === t.categoryId);
    const proj = (data.projects   || []).find(p => p.id === t.projectId);
    const ws   = (data.workspaces || []).find(w => w.id === t.workspaceId);
    const moves = (t.moveHistory || [])
      .map(m => m.from + '>' + m.to + '(' + m.on + ')')
      .join('; ');

    return [
      csvEscape(t.title),
      t.date || '',
      csvEscape(ws?.name || ''),
      csvEscape(cat?.name || ''),
      csvEscape(proj?.name || ''),
      t.priority ? 'yes' : 'no',
      t.done     ? 'yes' : 'no',
      t.createdAt   || '',
      t.completedAt || '',
      (t.moveHistory || []).length,
      csvEscape(moves),
      csvEscape(t.note || ''),
    ];
  });

  const csv = [headers, ...rows]
    .map(r => r.join(','))
    .join('\n');

  // Add BOM for Excel UTF-8
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'planner-archive-' + todayStr() + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(str) {
  if (!str) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/* ─── Init filters UI ─── */
function initFilters() {
  // Default dates: last 30 days to today
  const today = todayStr();
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().slice(0, 10);

  document.getElementById('filter-date-from').value = monthAgoStr;
  document.getElementById('filter-date-to').value   = today;
  filters.dateFrom = monthAgoStr;
  filters.dateTo   = today;

  // Populate workspace select
  const wsSelect = document.getElementById('filter-workspace');
  wsSelect.innerHTML = '<option value="all">All workspaces</option>';
  (data.workspaces || []).filter(w => !w.isAll).forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id; opt.textContent = ws.name;
    wsSelect.appendChild(opt);
  });

  // Event listeners
  document.getElementById('filter-date-from').addEventListener('change', e => {
    filters.dateFrom = e.target.value; renderArchive();
  });
  document.getElementById('filter-date-to').addEventListener('change', e => {
    filters.dateTo = e.target.value; renderArchive();
  });
  document.getElementById('filter-workspace').addEventListener('change', e => {
    filters.workspace = e.target.value; renderArchive();
  });
  document.getElementById('filter-status').addEventListener('change', e => {
    filters.status = e.target.value; renderArchive();
  });
  document.getElementById('filter-moves').addEventListener('change', e => {
    filters.moves = e.target.value; renderArchive();
  });

  // View tabs
  document.querySelectorAll('.view-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filters.view = btn.dataset.view;
      renderArchive();
    });
  });

  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initFilters();
  renderArchive();
  lucide.createIcons();
});

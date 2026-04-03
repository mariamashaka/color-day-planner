/* ═══════════════════════════════════════════
   SETTINGS.JS
   Shares localStorage 'planner_data' with planner
═══════════════════════════════════════════ */

const STORAGE_KEY = 'planner_data';
const COLORS = ['#4A90D9','#E07B3A','#9B59B6','#C0392B','#27AE60','#D4AC0D','#16A085','#7F8C8D'];

let data         = {};
let activePopup  = null;
let editingWsId  = null;
let editingCatId = null;
let selectedColor = COLORS[0];

/* ─── Storage ─── */
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { data = JSON.parse(raw); } catch(e) {} }
  if (!data.workspaces)    data.workspaces    = [];
  if (!data.categories)    data.categories    = [];
  if (!data.tasks)         data.tasks         = [];
  if (!data.dailyRoutines) data.dailyRoutines = { morning: [], evening: [] };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ─── Helpers ─── */
function genId() {
  return '_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36);
}

function getWsName(wsId) {
  return data.workspaces.find(w => w.id === wsId)?.name || '—';
}

/* ─── RENDER ─── */
function renderAll() {
  renderWorkspaces();
  renderCategories();
  lucide.createIcons();
}

/* ─── WORKSPACES ─── */
function renderWorkspaces() {
  const list = document.getElementById('workspaces-list');
  list.innerHTML = '';

  data.workspaces.forEach(ws => {
    const item = document.createElement('div');
    item.className = 'ws-settings-item';

    const name = document.createElement('span');
    name.className = 'ws-settings-name';
    name.textContent = ws.name;

    if (ws.isAll) {
      const badge = document.createElement('span');
      badge.className = 'ws-settings-badge';
      badge.textContent = 'System';
      item.appendChild(name);
      item.appendChild(badge);
      list.appendChild(item);
      return;
    }

    // Category count
    const catCount = data.categories.filter(c => c.workspaceId === ws.id).length;
    const taskCount = data.tasks.filter(t => t.workspaceId === ws.id).length;
    const meta = document.createElement('span');
    meta.style.cssText = 'font-size:11px;color:var(--text-muted);font-family:var(--font-mono);';
    meta.textContent = catCount + ' cat · ' + taskCount + ' tasks';

    const actions = document.createElement('div');
    actions.className = 'ws-item-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'ws-action-btn';
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', () => openWsPopup(ws.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'ws-action-btn danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deleteWorkspace(ws.id));

    actions.appendChild(renameBtn);
    actions.appendChild(delBtn);

    item.appendChild(name);
    item.appendChild(meta);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

/* ─── CATEGORIES (grouped by workspace) ─── */
function renderCategories() {
  const list = document.getElementById('categories-list');
  list.innerHTML = '';

  // Group categories by workspace
  const wsOrder = data.workspaces.filter(w => !w.isAll);

  if (wsOrder.length === 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'padding:14px 18px;font-size:13px;color:var(--text-muted);font-style:italic;';
    hint.textContent = 'Create a workspace first';
    list.appendChild(hint);
    return;
  }

  wsOrder.forEach(ws => {
    const cats = data.categories.filter(c => c.workspaceId === ws.id);

    const group = document.createElement('div');
    group.className = 'cat-workspace-group';

    // Group header
    const groupHeader = document.createElement('div');
    groupHeader.className = 'cat-workspace-label';

    const wsLabel = document.createElement('span');
    wsLabel.textContent = ws.name.toUpperCase();

    const addCatBtn = document.createElement('button');
    addCatBtn.className = 'cat-add-btn';
    addCatBtn.textContent = '+ Add';
    addCatBtn.addEventListener('click', () => openCatPopup(null, ws.id));

    groupHeader.appendChild(wsLabel);
    groupHeader.appendChild(addCatBtn);
    group.appendChild(groupHeader);

    if (cats.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:10px 18px;font-size:12px;color:var(--text-muted);font-style:italic;';
      empty.textContent = 'No categories yet';
      group.appendChild(empty);
    } else {
      cats.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'cat-settings-item';

        const dot = document.createElement('div');
        dot.className = 'cat-color-dot';
        dot.style.background = cat.color;

        const name = document.createElement('span');
        name.className = 'cat-name';
        name.textContent = cat.name;

        const taskCount = data.tasks.filter(t => t.categoryId === cat.id).length;
        const countEl = document.createElement('span');
        countEl.style.cssText = 'font-size:11px;color:var(--text-muted);font-family:var(--font-mono);';
        countEl.textContent = taskCount > 0 ? taskCount + ' tasks' : '';

        const actions = document.createElement('div');
        actions.className = 'cat-item-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'ws-action-btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => openCatPopup(cat.id, null));

        const delBtn = document.createElement('button');
        delBtn.className = 'ws-action-btn danger';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => deleteCategory(cat.id));

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        item.appendChild(dot);
        item.appendChild(name);
        item.appendChild(countEl);
        item.appendChild(actions);
        group.appendChild(item);
      });
    }

    list.appendChild(group);
  });
}

/* ─── WORKSPACE CRUD ─── */
function openWsPopup(wsId) {
  editingWsId = wsId;
  const isNew = !wsId;
  document.getElementById('popup-ws-title').textContent  = isNew ? 'New Workspace' : 'Rename Workspace';
  document.getElementById('btn-ws-delete').style.display = isNew ? 'none' : '';
  const ws = isNew ? null : data.workspaces.find(w => w.id === wsId);
  document.getElementById('ws-input-name').value = ws?.name || '';
  openPopup('popup-workspace');
  setTimeout(() => document.getElementById('ws-input-name').focus(), 60);
}

function saveWorkspace() {
  const name = document.getElementById('ws-input-name').value.trim();
  if (!name) return;

  if (editingWsId) {
    const ws = data.workspaces.find(w => w.id === editingWsId);
    if (ws) ws.name = name;
  } else {
    data.workspaces.push({ id: genId(), name });
  }

  saveData();
  renderAll();
  closePopup('popup-workspace');
}

function deleteWorkspace(id) {
  const ws = data.workspaces.find(w => w.id === id);
  const catCount  = data.categories.filter(c => c.workspaceId === id).length;
  const taskCount = data.tasks.filter(t => t.workspaceId === id).length;

  const msg = `Delete workspace "${ws?.name}"?\n\n` +
    `This will also affect:\n` +
    `• ${catCount} categories (will be deleted)\n` +
    `• ${taskCount} tasks (will move to All)\n\n` +
    `This cannot be undone.`;

  if (!confirm(msg)) return;

  // Move tasks to All
  data.tasks.forEach(t => { if (t.workspaceId === id) t.workspaceId = 'ws_all'; });
  // Delete routines
  data.weeklyRoutines = (data.weeklyRoutines || []).filter(r => r.workspaceId !== id);
  // Delete categories + clear from tasks
  const catIds = data.categories.filter(c => c.workspaceId === id).map(c => c.id);
  data.tasks.forEach(t => { if (catIds.includes(t.categoryId)) t.categoryId = ''; });
  data.categories = data.categories.filter(c => c.workspaceId !== id);
  // Delete workspace
  data.workspaces = data.workspaces.filter(w => w.id !== id);

  saveData();
  renderAll();
  closePopup('popup-workspace');
}

/* ─── CATEGORY CRUD ─── */
function openCatPopup(catId, prefillWsId) {
  editingCatId = catId;
  const isNew = !catId;
  document.getElementById('popup-cat-title').textContent  = isNew ? 'New Category' : 'Edit Category';
  document.getElementById('btn-cat-delete').style.display = isNew ? 'none' : '';

  // Populate workspace select
  const wsSelect = document.getElementById('cat-input-workspace');
  wsSelect.innerHTML = '';
  data.workspaces.filter(w => !w.isAll).forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id; opt.textContent = ws.name;
    wsSelect.appendChild(opt);
  });

  const cat = isNew ? null : data.categories.find(c => c.id === catId);
  document.getElementById('cat-input-name').value = cat?.name || '';
  selectedColor = cat?.color || COLORS[0];
  renderColorSwatches('cat-color-swatches', selectedColor, c => { selectedColor = c; });

  if (cat) {
    wsSelect.value = cat.workspaceId;
  } else if (prefillWsId) {
    wsSelect.value = prefillWsId;
  }

  openPopup('popup-category');
  setTimeout(() => document.getElementById('cat-input-name').focus(), 60);
}

function saveCategory() {
  const name = document.getElementById('cat-input-name').value.trim();
  if (!name) return;
  const workspaceId = document.getElementById('cat-input-workspace').value;

  if (editingCatId) {
    const cat = data.categories.find(c => c.id === editingCatId);
    if (cat) { cat.name = name; cat.color = selectedColor; cat.workspaceId = workspaceId; }
  } else {
    data.categories.push({ id: genId(), name, color: selectedColor, workspaceId });
  }

  saveData();
  renderAll();
  closePopup('popup-category');
}

function deleteCategory(id) {
  const cat = data.categories.find(c => c.id === id);
  const taskCount = data.tasks.filter(t => t.categoryId === id).length;

  const msg = `Delete category "${cat?.name}"?\n` +
    (taskCount > 0 ? `${taskCount} tasks will lose this category.\n` : '') +
    'This cannot be undone.';

  if (!confirm(msg)) return;

  data.tasks.forEach(t => { if (t.categoryId === id) t.categoryId = ''; });
  data.categories = data.categories.filter(c => c.id !== id);
  saveData();
  renderAll();
}

/* ─── COLOR SWATCHES ─── */
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

/* ─── DATA EXPORT / IMPORT ─── */
function exportJSON() {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'planner-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.workspaces || !imported.tasks) {
        alert('Invalid backup file — missing required data.');
        return;
      }
      if (!confirm('This will replace ALL current data with the backup. Continue?')) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      data = imported;
      renderAll();
      showToast('Data imported successfully!');
    } catch(err) {
      alert('Could not read file. Make sure it is a valid JSON backup.');
    }
  };
  reader.readAsText(file);
}

/* ─── DANGER ZONE ACTIONS ─── */
function clearAllTasks() {
  if (!confirm('Delete ALL tasks? This cannot be undone.')) return;
  data.tasks = [];
  saveData();
  showToast('All tasks cleared.');
}

function resetDailyRoutines() {
  if (!confirm('Mark all daily routines as not done?')) return;
  ['morning','evening'].forEach(type => {
    (data.dailyRoutines[type] || []).forEach(r => { r.done = false; });
  });
  saveData();
  showToast('Daily routines reset.');
}

function resetAllData() {
  if (!confirm('⚠️ This will DELETE ALL DATA and reset to defaults.\n\nAre you absolutely sure?')) return;
  if (!confirm('Last chance — this cannot be undone. Reset everything?')) return;
  localStorage.removeItem(STORAGE_KEY);
  showToast('All data reset. Redirecting...');
  setTimeout(() => { window.location.href = 'index.html'; }, 1200);
}

/* ─── TOAST ─── */
function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--text-primary);
    color: var(--surface);
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    z-index: 9999;
    animation: fadeIn 0.2s ease;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

/* ─── POPUP SYSTEM ─── */
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
  activePopup  = null;
  editingWsId  = null;
  editingCatId = null;
}

function closeActivePopup() { if (activePopup) closePopup(activePopup); }

/* ─── EVENT LISTENERS ─── */
function initEvents() {
  document.getElementById('overlay').addEventListener('click', closeActivePopup);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeActivePopup(); });

  // Popup close buttons
  document.querySelectorAll('.popup-close').forEach(btn => {
    btn.addEventListener('click', () => closePopup(btn.dataset.popup));
  });

  // Workspace
  document.getElementById('btn-new-workspace').addEventListener('click', () => openWsPopup(null));
  document.getElementById('btn-ws-save').addEventListener('click', saveWorkspace);
  document.getElementById('btn-ws-delete').addEventListener('click', () => {
    if (editingWsId) deleteWorkspace(editingWsId);
  });
  document.getElementById('ws-input-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveWorkspace();
  });

  // Category
  document.getElementById('btn-new-category').addEventListener('click', () => openCatPopup(null, null));
  document.getElementById('btn-cat-save').addEventListener('click', saveCategory);
  document.getElementById('btn-cat-delete').addEventListener('click', () => {
    if (editingCatId) deleteCategory(editingCatId);
  });
  document.getElementById('cat-input-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveCategory();
  });

  // Data
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('btn-import-json').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });
  document.getElementById('import-file-input').addEventListener('change', e => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  });

  // Danger zone
  document.getElementById('btn-clear-tasks').addEventListener('click', clearAllTasks);
  document.getElementById('btn-reset-daily').addEventListener('click', resetDailyRoutines);
  document.getElementById('btn-reset-all').addEventListener('click', resetAllData);
}

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initEvents();
  renderAll();
});

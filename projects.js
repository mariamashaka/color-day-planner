/* ═══════════════════════════════════════════
   PROJECTS.JS
   Shares localStorage 'planner_data' with planner
═══════════════════════════════════════════ */

const STORAGE_KEY = 'planner_data';
const COLORS = ['#4A90D9','#E07B3A','#9B59B6','#C0392B','#27AE60','#D4AC0D','#16A085','#7F8C8D'];

const BLOCK_TYPES = {
  stages:   { icon: '✅', label: 'Stages & Tasks' },
  notes:    { icon: '📝', label: 'Notes' },
  budget:   { icon: '💰', label: 'Budget' },
  checklist:{ icon: '👜', label: 'Checklist' },
  contacts: { icon: '📞', label: 'Contacts' },
  links:    { icon: '🔗', label: 'Links' },
  route:    { icon: '📍', label: 'Route' },
};

let data          = {};
let activePopup   = null;
let editingProjId = null;
let currentProjId = null;
let selectedColor = COLORS[0];
let sidebarStatus = 'active';

// For send-to-planner
let sendingTaskTitle = '';
let sendingTaskId    = null; // project task id for reference

/* ─── Storage ─── */
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { data = JSON.parse(raw); } catch(e) {} }
  if (!data.projects2)   data.projects2   = []; // separate from old projects list
  if (!data.tasks)       data.tasks       = [];
  if (!data.workspaces)  data.workspaces  = [];
  if (!data.categories)  data.categories  = [];
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ─── Helpers ─── */
function genId() {
  return '_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getProject(id) {
  return data.projects2.find(p => p.id === id);
}

function calcProgress(proj) {
  if (!proj.blocks) return 0;
  const stagesBlock = proj.blocks.find(b => b.type === 'stages');
  if (!stagesBlock || !stagesBlock.stages) return 0;
  let total = 0, done = 0;
  stagesBlock.stages.forEach(s => {
    (s.tasks || []).forEach(t => {
      total++;
      if (t.done) done++;
      (t.subtasks || []).forEach(st => {
        total++;
        if (st.done) done++;
      });
    });
  });
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return dateStr < todayStr();
}

/* ─── RENDER ALL ─── */
function renderAll() {
  renderSidebar();
  if (currentProjId) renderProject(currentProjId);
  lucide.createIcons();
}

/* ─── SIDEBAR ─── */
function renderSidebar() {
  const list = document.getElementById('project-list');
  list.innerHTML = '';

  const filtered = data.projects2.filter(p =>
    sidebarStatus === 'all' ? true : p.status === sidebarStatus
  );

  if (filtered.length === 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'padding:14px 12px;font-size:12px;color:var(--text-muted);font-style:italic;';
    hint.textContent = sidebarStatus === 'active' ? 'No active projects' : 'Nothing here';
    list.appendChild(hint);
    return;
  }

  filtered.forEach(p => {
    const progress = calcProgress(p);
    const item = document.createElement('div');
    item.className = 'project-list-item' + (p.id === currentProjId ? ' active' : '');

    const top = document.createElement('div');
    top.className = 'project-list-top';

    const dot = document.createElement('div');
    dot.className = 'project-list-dot';
    dot.style.background = p.color;

    const name = document.createElement('span');
    name.className = 'project-list-name';
    name.textContent = p.name;
    name.title = p.name;

    const statusBadge = document.createElement('span');
    statusBadge.className = 'project-list-status ' +
      (p.status === 'active' ? 'active-s' : p.status === 'paused' ? 'paused' : 'done-s');
    statusBadge.textContent = p.status === 'active' ? 'Active' :
                              p.status === 'paused' ? 'Paused' : 'Done';

    top.appendChild(dot);
    top.appendChild(name);
    top.appendChild(statusBadge);

    const bar = document.createElement('div');
    bar.className = 'project-progress-bar';
    const fill = document.createElement('div');
    fill.className = 'project-progress-fill';
    fill.style.width = progress + '%';
    bar.appendChild(fill);

    item.appendChild(top);
    item.appendChild(bar);
    item.addEventListener('click', () => selectProject(p.id));
    list.appendChild(item);
  });
}

/* ─── SELECT PROJECT ─── */
function selectProject(projId) {
  currentProjId = projId;
  document.getElementById('project-placeholder').style.display = 'none';
  document.getElementById('project-header').style.display = 'flex';
  document.getElementById('project-content').style.display = 'flex';
  renderSidebar();
  renderProject(projId);
  lucide.createIcons();
}

/* ─── RENDER PROJECT ─── */
function renderProject(projId) {
  const proj = getProject(projId);
  if (!proj) return;

  // Header
  document.getElementById('project-header-dot').style.background = proj.color;
  document.getElementById('project-header-name').textContent = proj.name;

  const statusEl = document.getElementById('project-header-status');
  statusEl.textContent = proj.status === 'active' ? 'Active' :
                         proj.status === 'paused' ? 'Paused' : 'Done';
  statusEl.className = 'project-list-status ' +
    (proj.status === 'active' ? 'active-s' : proj.status === 'paused' ? 'paused' : 'done-s');

  // Blocks
  const content = document.getElementById('project-content');
  content.innerHTML = '';

  if (!proj.blocks || proj.blocks.length === 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'color:var(--text-muted);font-size:13px;font-style:italic;padding:8px 0;';
    hint.textContent = 'No blocks yet — click "+ Add block" to start';
    content.appendChild(hint);
  } else {
    proj.blocks.forEach(block => {
      content.appendChild(buildBlock(proj, block));
    });
  }

  lucide.createIcons();
}

/* ─── BUILD BLOCK ─── */
function buildBlock(proj, block) {
  const wrap = document.createElement('div');
  wrap.className = 'project-block';
  wrap.dataset.blockId = block.id;

  const meta = BLOCK_TYPES[block.type] || { icon: '📄', label: block.type };

  // Header
  const header = document.createElement('div');
  header.className = 'block-header';

  const icon = document.createElement('span');
  icon.className = 'block-icon';
  icon.textContent = meta.icon;

  const title = document.createElement('span');
  title.className = 'block-title';
  title.textContent = block.label || meta.label;

  const delBtn = document.createElement('button');
  delBtn.className = 'block-delete-btn';
  delBtn.textContent = '×';
  delBtn.title = 'Remove block';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeBlock(proj.id, block.id);
  });

  const toggle = document.createElement('div');
  toggle.className = 'block-toggle';
  toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(delBtn);
  header.appendChild(toggle);

  // Body
  const body = document.createElement('div');
  body.className = 'block-body' + (block.collapsed ? ' collapsed' : '');

  // Toggle collapse
  header.addEventListener('click', (e) => {
    if (e.target === delBtn) return;
    block.collapsed = !block.collapsed;
    body.classList.toggle('collapsed', block.collapsed);
    const svg = toggle.querySelector('svg');
    svg.style.transform = block.collapsed ? 'rotate(180deg)' : '';
    saveData();
  });

  // Fill body based on type
  switch (block.type) {
    case 'stages':   fillStagesBlock(proj, block, body);   break;
    case 'notes':    fillNotesBlock(proj, block, body);    break;
    case 'budget':   fillBudgetBlock(proj, block, body);   break;
    case 'checklist':fillChecklistBlock(proj, block, body);break;
    case 'contacts': fillContactsBlock(proj, block, body); break;
    case 'links':    fillLinksBlock(proj, block, body);    break;
    case 'route':    fillRouteBlock(proj, block, body);    break;
  }

  wrap.appendChild(header);
  wrap.appendChild(body);
  return wrap;
}

/* ─── STAGES BLOCK ─── */
function fillStagesBlock(proj, block, body) {
  if (!block.stages) block.stages = [];

  block.stages.forEach((stage, stageIdx) => {
    const stageEl = buildStageEl(proj, block, stage, stageIdx);
    body.appendChild(stageEl);
  });

  // Add stage button
  const addStageBtn = document.createElement('button');
  addStageBtn.className = 'add-stage-btn';
  addStageBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Add stage';
  addStageBtn.addEventListener('click', () => addStage(proj, block, body, addStageBtn));
  body.appendChild(addStageBtn);
}

function buildStageEl(proj, block, stage, stageIdx) {
  const el = document.createElement('div');
  el.className = 'stage';

  // Stage header
  const header = document.createElement('div');
  header.className = 'stage-header';

  const name = document.createElement('span');
  name.className = 'stage-name';
  name.textContent = stage.name || 'Stage ' + (stageIdx + 1);
  name.addEventListener('click', () => startInlineEdit(name, stage.name, val => {
    stage.name = val; saveData();
  }));

  const actions = document.createElement('div');
  actions.className = 'stage-actions';

  const addTaskBtn = document.createElement('button');
  addTaskBtn.className = 'stage-btn';
  addTaskBtn.title = 'Add task';
  addTaskBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
  addTaskBtn.addEventListener('click', () => addTaskToStage(proj, block, stage, el));

  const delBtn = document.createElement('button');
  delBtn.className = 'stage-btn danger';
  delBtn.title = 'Delete stage';
  delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
  delBtn.addEventListener('click', () => {
    block.stages = block.stages.filter(s => s.id !== stage.id);
    saveData();
    el.remove();
    updateSidebarProgress();
  });

  actions.appendChild(addTaskBtn);
  actions.appendChild(delBtn);
  header.appendChild(name);
  header.appendChild(actions);

  // Tasks
  const taskList = document.createElement('div');
  taskList.className = 'stage-tasks';

  (stage.tasks || []).forEach(task => {
    taskList.appendChild(buildTaskRow(proj, block, stage, task, false));
    (task.subtasks || []).forEach(sub => {
      taskList.appendChild(buildTaskRow(proj, block, stage, sub, true, task));
    });
  });

  el.appendChild(header);
  el.appendChild(taskList);
  return el;
}

function buildTaskRow(proj, block, stage, task, isSubtask, parentTask) {
  const row = document.createElement('div');
  row.className = 'ptask-row' + (isSubtask ? ' subtask' : '');

  const check = document.createElement('div');
  check.className = 'ptask-check' + (task.done ? ' checked' : '');
  check.addEventListener('click', () => {
    task.done = !task.done;
    check.classList.toggle('checked', task.done);
    label.classList.toggle('done', task.done);
    saveData();
    updateSidebarProgress();
  });

  const label = document.createElement('span');
  label.className = 'ptask-label' + (task.done ? ' done' : '');
  label.textContent = task.title;
  label.addEventListener('click', () => startInlineEdit(label, task.title, val => {
    task.title = val; saveData();
  }));

  const deadline = document.createElement('span');
  deadline.className = 'ptask-deadline' + (isOverdue(task.deadline) && !task.done ? ' overdue' : '');
  deadline.textContent = task.deadline || '';
  deadline.title = task.deadline ? 'Deadline: ' + task.deadline : 'No deadline';

  const actions = document.createElement('div');
  actions.className = 'ptask-actions';

  // Set deadline
  const deadlineBtn = document.createElement('button');
  deadlineBtn.className = 'ptask-btn';
  deadlineBtn.title = 'Set deadline';
  deadlineBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  deadlineBtn.addEventListener('click', () => {
    const d = prompt('Deadline (YYYY-MM-DD):', task.deadline || todayStr());
    if (d !== null) {
      task.deadline = d.trim() || null;
      deadline.textContent = task.deadline || '';
      deadline.className = 'ptask-deadline' + (isOverdue(task.deadline) && !task.done ? ' overdue' : '');
      saveData();
    }
  });

  // Add subtask (only for non-subtasks)
  if (!isSubtask) {
    const subBtn = document.createElement('button');
    subBtn.className = 'ptask-btn';
    subBtn.title = 'Add subtask';
    subBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>';
    subBtn.addEventListener('click', () => {
      if (!task.subtasks) task.subtasks = [];
      const title = prompt('Subtask name:');
      if (title && title.trim()) {
        task.subtasks.push({ id: genId(), title: title.trim(), done: false, deadline: null });
        saveData();
        renderProject(proj.id);
      }
    });
    actions.appendChild(subBtn);
  }

  // Send to planner
  const sendBtn = document.createElement('button');
  sendBtn.className = 'ptask-btn';
  sendBtn.title = 'Send to Planner';
  sendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
  sendBtn.addEventListener('click', () => openSendToPlanner(task.title, task.deadline));

  // Delete
  const delBtn = document.createElement('button');
  delBtn.className = 'ptask-btn danger';
  delBtn.title = 'Delete';
  delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  delBtn.addEventListener('click', () => {
    if (isSubtask) {
      parentTask.subtasks = parentTask.subtasks.filter(s => s.id !== task.id);
    } else {
      stage.tasks = stage.tasks.filter(t => t.id !== task.id);
    }
    saveData();
    row.remove();
    updateSidebarProgress();
  });

  actions.appendChild(deadlineBtn);
  actions.appendChild(sendBtn);
  actions.appendChild(delBtn);

  row.appendChild(check);
  row.appendChild(label);
  row.appendChild(deadline);
  row.appendChild(actions);
  return row;
}

function addStage(proj, block, body, addStageBtn) {
  const name = prompt('Stage name:');
  if (!name || !name.trim()) return;
  const stage = { id: genId(), name: name.trim(), tasks: [] };
  block.stages.push(stage);
  saveData();
  const stageEl = buildStageEl(proj, block, stage, block.stages.length - 1);
  body.insertBefore(stageEl, addStageBtn);
  lucide.createIcons();
}

function addTaskToStage(proj, block, stage, stageEl) {
  const title = prompt('Task name:');
  if (!title || !title.trim()) return;
  if (!stage.tasks) stage.tasks = [];
  const task = { id: genId(), title: title.trim(), done: false, deadline: null, subtasks: [] };
  stage.tasks.push(task);
  saveData();

  const taskList = stageEl.querySelector('.stage-tasks');
  taskList.appendChild(buildTaskRow(proj, block, stage, task, false));
  lucide.createIcons();
  updateSidebarProgress();
}

/* ─── NOTES BLOCK ─── */
function fillNotesBlock(proj, block, body) {
  if (!block.content) block.content = '';
  const ta = document.createElement('textarea');
  ta.className = 'notes-textarea';
  ta.value = block.content;
  ta.placeholder = 'Write your notes here...';
  ta.addEventListener('input', () => { block.content = ta.value; saveData(); });
  body.appendChild(ta);
}

/* ─── BUDGET BLOCK ─── */
function fillBudgetBlock(proj, block, body) {
  if (!block.items) block.items = [];

  // Summary cards
  const planned = block.items.filter(i => i.type === 'planned').reduce((s, i) => s + (i.amount || 0), 0);
  const spent   = block.items.filter(i => i.type === 'spent').reduce((s, i) => s + (i.amount || 0), 0);
  const remain  = planned - spent;

  const grid = document.createElement('div');
  grid.className = 'budget-grid';

  const makeCard = (label, value, cls) => {
    const card = document.createElement('div');
    card.className = 'budget-card ' + cls;
    card.innerHTML = `<div class="budget-card-label">${label}</div>
      <div class="budget-card-value">${value.toLocaleString()}</div>`;
    return card;
  };

  grid.appendChild(makeCard('Planned', planned, 'planned'));
  grid.appendChild(makeCard('Spent',   spent,   'spent'));
  grid.appendChild(makeCard('Remains', remain,  'remain'));
  body.appendChild(grid);

  // Items list
  const itemsList = document.createElement('div');
  itemsList.className = 'budget-items';

  const renderItems = () => {
    itemsList.innerHTML = '';
    block.items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'budget-item-row';

      const nameEl = document.createElement('span');
      nameEl.className = 'budget-item-name';
      nameEl.textContent = item.name;
      nameEl.addEventListener('click', () => startInlineEdit(nameEl, item.name, val => {
        item.name = val; saveData(); refreshBudgetSummary();
      }));

      const amountEl = document.createElement('span');
      amountEl.className = 'budget-item-amount';
      amountEl.textContent = (item.amount || 0).toLocaleString();
      amountEl.addEventListener('click', () => {
        const val = prompt('Amount:', item.amount || 0);
        if (val !== null) {
          item.amount = parseFloat(val) || 0;
          amountEl.textContent = item.amount.toLocaleString();
          saveData(); refreshBudgetSummary();
        }
      });

      const typeEl = document.createElement('span');
      typeEl.className = 'budget-item-type ' + item.type;
      typeEl.textContent = item.type === 'planned' ? 'Planned' : 'Spent';
      typeEl.style.cursor = 'pointer';
      typeEl.addEventListener('click', () => {
        item.type = item.type === 'planned' ? 'spent' : 'planned';
        typeEl.className = 'budget-item-type ' + item.type;
        typeEl.textContent = item.type === 'planned' ? 'Planned' : 'Spent';
        saveData(); refreshBudgetSummary();
      });

      const delEl = document.createElement('button');
      delEl.className = 'budget-item-del';
      delEl.textContent = '×';
      delEl.addEventListener('click', () => {
        block.items.splice(idx, 1);
        saveData(); renderItems(); refreshBudgetSummary();
      });

      row.appendChild(nameEl);
      row.appendChild(amountEl);
      row.appendChild(typeEl);
      row.appendChild(delEl);
      itemsList.appendChild(row);
    });
  };

  const refreshBudgetSummary = () => {
    const p = block.items.filter(i => i.type === 'planned').reduce((s, i) => s + (i.amount || 0), 0);
    const s = block.items.filter(i => i.type === 'spent').reduce((s, i) => s + (i.amount || 0), 0);
    const r = p - s;
    grid.children[0].querySelector('.budget-card-value').textContent = p.toLocaleString();
    grid.children[1].querySelector('.budget-card-value').textContent = s.toLocaleString();
    grid.children[2].querySelector('.budget-card-value').textContent = r.toLocaleString();
  };

  renderItems();
  body.appendChild(itemsList);

  // Add item row
  const addRow = document.createElement('div');
  addRow.className = 'add-budget-row';

  const nameInput   = document.createElement('input');
  nameInput.className = 'name-input';
  nameInput.placeholder = 'Item name...';

  const amountInput = document.createElement('input');
  amountInput.className = 'amount-input';
  amountInput.type = 'number';
  amountInput.placeholder = '0';

  const typeSelect  = document.createElement('select');
  const optP = document.createElement('option');
  optP.value = 'planned'; optP.textContent = 'Planned';
  const optS = document.createElement('option');
  optS.value = 'spent'; optS.textContent = 'Spent';
  typeSelect.appendChild(optP); typeSelect.appendChild(optS);

  const addBtn = document.createElement('button');
  addBtn.className = 'primary-btn';
  addBtn.style.cssText = 'padding:5px 12px;font-size:12px;';
  addBtn.textContent = '+ Add';
  addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    block.items.push({
      id: genId(),
      name,
      amount: parseFloat(amountInput.value) || 0,
      type: typeSelect.value,
    });
    nameInput.value = '';
    amountInput.value = '';
    saveData(); renderItems(); refreshBudgetSummary();
  });

  addRow.appendChild(nameInput);
  addRow.appendChild(amountInput);
  addRow.appendChild(typeSelect);
  addRow.appendChild(addBtn);
  body.appendChild(addRow);
}

/* ─── CHECKLIST BLOCK ─── */
function fillChecklistBlock(proj, block, body) {
  if (!block.items) block.items = [];

  const list = document.createElement('div');

  const renderItems = () => {
    list.innerHTML = '';
    block.items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'checklist-item';

      const cb = document.createElement('div');
      cb.className = 'checklist-cb' + (item.done ? ' checked' : '');
      cb.addEventListener('click', () => {
        item.done = !item.done;
        cb.classList.toggle('checked', item.done);
        label.classList.toggle('done', item.done);
        saveData();
      });

      const label = document.createElement('span');
      label.className = 'checklist-label' + (item.done ? ' done' : '');
      label.textContent = item.text;
      label.addEventListener('click', () => startInlineEdit(label, item.text, val => {
        item.text = val; saveData();
      }));

      const del = document.createElement('button');
      del.className = 'checklist-del';
      del.textContent = '×';
      del.addEventListener('click', () => {
        block.items.splice(idx, 1);
        saveData(); renderItems();
      });

      row.appendChild(cb); row.appendChild(label); row.appendChild(del);
      list.appendChild(row);
    });

    // Add input
    const addRow = document.createElement('div');
    addRow.style.cssText = 'padding:6px 0;';
    const input = document.createElement('input');
    input.placeholder = 'Add item... (Enter to save)';
    input.style.cssText = 'width:100%;font-size:13px;font-family:var(--font-body);border:none;border-bottom:1px solid var(--border);background:transparent;padding:3px 0;color:var(--text-primary);';
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) {
        block.items.push({ id: genId(), text: input.value.trim(), done: false });
        saveData(); renderItems();
      }
    });
    addRow.appendChild(input);
    list.appendChild(addRow);
  };

  renderItems();
  body.appendChild(list);
}

/* ─── CONTACTS BLOCK ─── */
function fillContactsBlock(proj, block, body) {
  if (!block.contacts) block.contacts = [];

  const list = document.createElement('div');

  const renderContacts = () => {
    list.innerHTML = '';
    block.contacts.forEach((c, idx) => {
      const row = document.createElement('div');
      row.className = 'contact-row';

      const avatar = document.createElement('div');
      avatar.className = 'contact-avatar';
      avatar.textContent = (c.name || '?')[0].toUpperCase();

      const info = document.createElement('div');
      info.className = 'contact-info';

      const name = document.createElement('div');
      name.className = 'contact-name';
      name.textContent = c.name;
      name.addEventListener('click', () => startInlineEdit(name, c.name, val => {
        c.name = val; avatar.textContent = (val || '?')[0].toUpperCase(); saveData();
      }));

      const detail = document.createElement('div');
      detail.className = 'contact-detail';
      detail.textContent = [c.phone, c.note].filter(Boolean).join(' · ');
      detail.addEventListener('click', () => {
        const phone = prompt('Phone:', c.phone || '');
        if (phone !== null) c.phone = phone.trim();
        const note  = prompt('Note:',  c.note  || '');
        if (note  !== null) c.note  = note.trim();
        detail.textContent = [c.phone, c.note].filter(Boolean).join(' · ');
        saveData();
      });

      const del = document.createElement('button');
      del.className = 'contact-del';
      del.textContent = '×';
      del.addEventListener('click', () => {
        block.contacts.splice(idx, 1);
        saveData(); renderContacts();
      });

      info.appendChild(name); info.appendChild(detail);
      row.appendChild(avatar); row.appendChild(info); row.appendChild(del);
      list.appendChild(row);
    });

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-stage-btn';
    addBtn.style.marginTop = '6px';
    addBtn.innerHTML = '+ Add contact';
    addBtn.addEventListener('click', () => {
      const name = prompt('Name:');
      if (!name || !name.trim()) return;
      block.contacts.push({ id: genId(), name: name.trim(), phone: '', note: '' });
      saveData(); renderContacts();
    });
    list.appendChild(addBtn);
  };

  renderContacts();
  body.appendChild(list);
}

/* ─── LINKS BLOCK ─── */
function fillLinksBlock(proj, block, body) {
  if (!block.links) block.links = [];

  const list = document.createElement('div');

  const renderLinks = () => {
    list.innerHTML = '';
    block.links.forEach((lk, idx) => {
      const row = document.createElement('div');
      row.className = 'link-row';

      const icon = document.createElement('span');
      icon.className = 'link-icon';
      icon.textContent = '🔗';

      const label = document.createElement('a');
      label.className = 'link-label';
      label.textContent = lk.label || lk.url;
      label.href = lk.url;
      label.target = '_blank';

      const del = document.createElement('button');
      del.className = 'link-del';
      del.textContent = '×';
      del.addEventListener('click', () => {
        block.links.splice(idx, 1);
        saveData(); renderLinks();
      });

      row.appendChild(icon); row.appendChild(label); row.appendChild(del);
      list.appendChild(row);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-stage-btn';
    addBtn.style.marginTop = '6px';
    addBtn.innerHTML = '+ Add link';
    addBtn.addEventListener('click', () => {
      const url   = prompt('URL:');
      if (!url || !url.trim()) return;
      const label = prompt('Label (optional):', url);
      block.links.push({ id: genId(), url: url.trim(), label: label?.trim() || url.trim() });
      saveData(); renderLinks();
    });
    list.appendChild(addBtn);
  };

  renderLinks();
  body.appendChild(list);
}

/* ─── ROUTE BLOCK ─── */
function fillRouteBlock(proj, block, body) {
  if (!block.places) block.places = [];

  const list = document.createElement('div');

  const renderPlaces = () => {
    list.innerHTML = '';
    block.places.forEach((pl, idx) => {
      const row = document.createElement('div');
      row.className = 'route-item';

      const num = document.createElement('div');
      num.className = 'route-num';
      num.textContent = idx + 1;

      const info = document.createElement('div');
      info.className = 'route-info';

      const place = document.createElement('div');
      place.className = 'route-place';
      place.textContent = pl.name;
      place.addEventListener('click', () => startInlineEdit(place, pl.name, val => {
        pl.name = val; saveData();
      }));

      const note = document.createElement('div');
      note.className = 'route-note';
      note.textContent = pl.note || 'Click to add note';
      note.style.color = pl.note ? '' : 'var(--text-muted)';
      note.addEventListener('click', () => startInlineEdit(note, pl.note || '', val => {
        pl.note = val; note.textContent = val || 'Click to add note';
        note.style.color = val ? '' : 'var(--text-muted)';
        saveData();
      }));

      const del = document.createElement('button');
      del.className = 'route-del';
      del.textContent = '×';
      del.addEventListener('click', () => {
        block.places.splice(idx, 1);
        saveData(); renderPlaces();
      });

      info.appendChild(place); info.appendChild(note);
      row.appendChild(num); row.appendChild(info); row.appendChild(del);
      list.appendChild(row);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-stage-btn';
    addBtn.style.marginTop = '6px';
    addBtn.innerHTML = '+ Add place';
    addBtn.addEventListener('click', () => {
      const name = prompt('Place name:');
      if (!name || !name.trim()) return;
      block.places.push({ id: genId(), name: name.trim(), note: '' });
      saveData(); renderPlaces();
    });
    list.appendChild(addBtn);
  };

  renderPlaces();
  body.appendChild(list);
}

/* ─── ADD BLOCK DROPDOWN ─── */
function showAddBlockDropdown(anchorBtn) {
  document.querySelector('.add-block-dropdown')?.remove();

  const proj = getProject(currentProjId);
  if (!proj) return;

  const dd = document.createElement('div');
  dd.className = 'add-block-dropdown';

  // Position near button
  const rect = anchorBtn.getBoundingClientRect();
  dd.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;`;

  Object.entries(BLOCK_TYPES).forEach(([type, meta]) => {
    const btn = document.createElement('button');
    btn.className = 'add-block-option';
    btn.innerHTML = `<span class="opt-icon">${meta.icon}</span> ${meta.label}`;
    btn.addEventListener('click', () => {
      dd.remove();
      addBlock(proj, type);
    });
    dd.appendChild(btn);
  });

  document.body.appendChild(dd);

  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', handler); }
    });
  }, 0);
}

function addBlock(proj, type) {
  if (!proj.blocks) proj.blocks = [];
  const block = { id: genId(), type, collapsed: false };
  proj.blocks.push(block);
  saveData();
  renderProject(proj.id);
}

function removeBlock(projId, blockId) {
  const proj = getProject(projId);
  if (!proj) return;
  proj.blocks = proj.blocks.filter(b => b.id !== blockId);
  saveData();
  renderProject(projId);
}

/* ─── SEND TO PLANNER ─── */
function openSendToPlanner(taskTitle, prefillDate) {
  sendingTaskTitle = taskTitle;

  document.getElementById('send-task-title-preview').textContent = '📋 ' + taskTitle;
  document.getElementById('send-input-date').value = prefillDate || todayStr();

  // Populate workspace select
  const wsSelect = document.getElementById('send-input-workspace');
  wsSelect.innerHTML = '';
  (data.workspaces || []).filter(w => !w.isAll).forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id; opt.textContent = ws.name;
    wsSelect.appendChild(opt);
  });

  // Populate category select
  populateSendCategorySelect(wsSelect.value);

  wsSelect.addEventListener('change', () => populateSendCategorySelect(wsSelect.value));

  openPopup('popup-send-to-planner');
}

function populateSendCategorySelect(wsId) {
  const catSelect = document.getElementById('send-input-category');
  catSelect.innerHTML = '<option value="">— No category —</option>';
  (data.categories || []).filter(c => c.workspaceId === wsId).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    catSelect.appendChild(opt);
  });
}

function confirmSendToPlanner() {
  const date        = document.getElementById('send-input-date').value || todayStr();
  const workspaceId = document.getElementById('send-input-workspace').value;
  const categoryId  = document.getElementById('send-input-category').value;

  // Create task in planner data
  if (!data.tasks) data.tasks = [];
  data.tasks.push({
    id:          genId(),
    title:       sendingTaskTitle,
    date,
    workspaceId,
    categoryId,
    projectId:   '',
    note:        'From project: ' + (getProject(currentProjId)?.name || ''),
    done:        false,
    priority:    false,
    createdAt:   todayStr(),
    moveHistory: [],
    completedAt: null,
  });

  saveData();
  closePopup('popup-send-to-planner');

  // Visual feedback
  const btn = document.getElementById('btn-send-confirm');
  const orig = btn.textContent;
  btn.textContent = '✓ Sent!';
  btn.style.background = '#27AE60';
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.background = '';
  }, 1500);
}

/* ─── PROJECT CRUD ─── */
function openProjectPopup(projId) {
  editingProjId = projId;
  const isNew = !projId;
  document.getElementById('popup-project-edit-title').textContent = isNew ? 'New Project' : 'Edit Project';
  document.getElementById('btn-proj-delete').style.display = isNew ? 'none' : '';

  const proj = isNew ? null : getProject(projId);
  document.getElementById('proj-input-name').value     = proj?.name     || '';
  document.getElementById('proj-input-status').value   = proj?.status   || 'active';
  document.getElementById('proj-input-deadline').value = proj?.deadline || '';
  document.getElementById('proj-input-goal').value     = proj?.goal     || '';
  selectedColor = proj?.color || COLORS[0];
  renderColorSwatches('proj-color-swatches', selectedColor, c => { selectedColor = c; });

  openPopup('popup-project-edit');
  setTimeout(() => document.getElementById('proj-input-name').focus(), 60);
}

function saveProject() {
  const name = document.getElementById('proj-input-name').value.trim();
  if (!name) return;

  const fields = {
    name,
    color:    selectedColor,
    status:   document.getElementById('proj-input-status').value,
    deadline: document.getElementById('proj-input-deadline').value,
    goal:     document.getElementById('proj-input-goal').value,
  };

  if (editingProjId) {
    const proj = getProject(editingProjId);
    if (proj) Object.assign(proj, fields);
  } else {
    data.projects2.push({ id: genId(), blocks: [], ...fields });
  }

  saveData();
  renderAll();
  closePopup('popup-project-edit');

  // Auto-select newly created project
  if (!editingProjId) {
    const newest = data.projects2[data.projects2.length - 1];
    selectProject(newest.id);
  }
}

function deleteProject(id) {
  if (!confirm('Delete this project and all its data?')) return;
  data.projects2 = data.projects2.filter(p => p.id !== id);
  if (currentProjId === id) {
    currentProjId = null;
    document.getElementById('project-placeholder').style.display = 'flex';
    document.getElementById('project-header').style.display = 'none';
    document.getElementById('project-content').style.display = 'none';
  }
  saveData(); renderAll();
  closePopup('popup-project-edit');
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

/* ─── INLINE EDIT ─── */
function startInlineEdit(el, currentVal, onSave) {
  const input = document.createElement('input');
  input.className = 'inline-edit';
  input.value = currentVal || '';
  el.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const val = input.value.trim();
    if (val) { onSave(val); el.textContent = val; }
    input.replaceWith(el);
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') input.replaceWith(el);
  });
  input.addEventListener('blur', commit);
}

/* ─── SIDEBAR PROGRESS UPDATE ─── */
function updateSidebarProgress() {
  if (currentProjId) {
    const proj = getProject(currentProjId);
    if (proj) {
      const fill = document.querySelector('.project-list-item.active .project-progress-fill');
      if (fill) fill.style.width = calcProgress(proj) + '%';
    }
  }
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
  activePopup = null;
  editingProjId = null;
}

function closeActivePopup() { if (activePopup) closePopup(activePopup); }

/* ─── EVENT LISTENERS ─── */
function initEvents() {
  document.getElementById('overlay').addEventListener('click', closeActivePopup);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeActivePopup(); });

  document.getElementById('btn-new-project').addEventListener('click', () => openProjectPopup(null));
  document.getElementById('btn-edit-project').addEventListener('click', () => {
    if (currentProjId) openProjectPopup(currentProjId);
  });
  document.getElementById('btn-add-block').addEventListener('click', (e) => {
    showAddBlockDropdown(e.currentTarget);
  });

  // Sidebar status tabs
  document.querySelectorAll('.sidebar-status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-status-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      sidebarStatus = tab.dataset.status;
      renderSidebar();
    });
  });

  // Popup close buttons
  document.querySelectorAll('.popup-close').forEach(btn => {
    btn.addEventListener('click', () => closePopup(btn.dataset.popup));
  });

  // Project popup
  document.getElementById('btn-proj-save').addEventListener('click', saveProject);
  document.getElementById('btn-proj-delete').addEventListener('click', () => {
    if (editingProjId) deleteProject(editingProjId);
  });
  document.getElementById('proj-input-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveProject();
  });

  // Send to planner
  document.getElementById('btn-send-confirm').addEventListener('click', confirmSendToPlanner);
}

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initEvents();
  renderAll();
});

/* ═══════════════════════════════════════════
   TRACKER.JS — standalone logic for tracker.html
   Shares localStorage key 'planner_data' with planner
═══════════════════════════════════════════ */

const STORAGE_KEY = 'planner_data';
const COLORS = ['#4A90D9','#E07B3A','#9B59B6','#C0392B','#27AE60','#D4AC0D','#16A085','#7F8C8D'];

let data = {};
let activePopup    = null;
let editingId      = null;
let selectedColor  = COLORS[0];
let currentTypeId  = null;
let currentFilter  = 'all';
let currentRating  = 0;

/* ─── Storage ─── */
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { data = JSON.parse(raw); } catch(e) {} }
  if (!data.trackerTypes)   data.trackerTypes   = [];
  if (!data.trackerEntries) data.trackerEntries = [];
  // Seed example trackers if empty
  if (data.trackerTypes.length === 0) {
    data.trackerTypes = [
      { id: 'tt_1', name: 'Books',  color: '#4A90D9', icon: '📚' },
      { id: 'tt_2', name: 'Movies', color: '#9B59B6', icon: '🎬' },
      { id: 'tt_3', name: 'Trips',  color: '#27AE60', icon: '✈️' },
    ];
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ─── Helpers ─── */
function genId() {
  return '_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36);
}

function getEntries(typeId, filter) {
  return data.trackerEntries.filter(e => {
    if (e.typeId !== typeId) return false;
    if (filter === 'all') return true;
    return e.status === filter;
  }).sort((a, b) => {
    // done goes last
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    // want first
    if (a.status === 'want' && b.status !== 'want') return -1;
    if (b.status === 'want' && a.status !== 'want') return 1;
    return 0;
  });
}

/* ─── Render ─── */
function renderAll() {
  renderTrackerTypes();
  renderEntries();
  lucide.createIcons();
}

function renderTrackerTypes() {
  const list = document.getElementById('tracker-types-list');
  list.innerHTML = '';

  if (data.trackerTypes.length === 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'padding:12px;font-size:12px;color:var(--text-muted);font-style:italic;';
    hint.textContent = 'No trackers yet';
    list.appendChild(hint);
    return;
  }

  data.trackerTypes.forEach(tt => {
    const tab = document.createElement('div');
    tab.className = 'tracker-tab' + (tt.id === currentTypeId ? ' active' : '');

    const dot = document.createElement('div');
    dot.className = 'tracker-tab-dot';
    dot.style.background = tt.color;

    const icon = document.createElement('span');
    icon.style.fontSize = '14px';
    icon.textContent = tt.icon || '•';

    const name = document.createElement('span');
    name.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    name.textContent = tt.name;

    // Count entries
    const count = data.trackerEntries.filter(e => e.typeId === tt.id).length;
    const countEl = document.createElement('span');
    countEl.className = 'tracker-tab-count';
    countEl.textContent = count > 0 ? count : '';

    const editBtn = document.createElement('button');
    editBtn.className = 'tracker-tab-edit';
    editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); openTrackerTypePopup(tt.id); });

    tab.appendChild(icon);
    tab.appendChild(name);
    tab.appendChild(countEl);
    tab.appendChild(editBtn);

    tab.addEventListener('click', () => selectTracker(tt.id));
    list.appendChild(tab);
  });
}

function renderEntries() {
  const area = document.getElementById('entries-area');
  area.innerHTML = '';

  if (!currentTypeId) {
    area.innerHTML = '<div class="entries-empty">← Select or create a tracker</div>';
    return;
  }

  const entries = getEntries(currentTypeId, currentFilter);

  if (entries.length === 0) {
    area.innerHTML = '<div class="entries-empty">Nothing here yet — add your first entry!</div>';
    return;
  }

  entries.forEach(e => {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.dataset.done = e.status === 'done';

    const dot = document.createElement('div');
    dot.className = 'entry-status-dot';
    dot.dataset.status = e.status;

    const info = document.createElement('div');
    info.className = 'entry-info';

    const title = document.createElement('div');
    title.className = 'entry-title';
    title.textContent = e.title;

    const meta = document.createElement('div');
    meta.className = 'entry-meta';
    const parts = [];
    if (e.date) parts.push(e.date);
    if (e.withKids) parts.push('👧 with kids');
    if (e.rating) parts.push('★'.repeat(e.rating) + '☆'.repeat(5 - e.rating));
    meta.textContent = parts.join(' · ');

    if (e.note) {
      const note = document.createElement('div');
      note.className = 'entry-note';
      note.textContent = e.note;
      info.appendChild(title);
      info.appendChild(meta);
      info.appendChild(note);
    } else {
      info.appendChild(title);
      info.appendChild(meta);
    }

    const badge = document.createElement('div');
    badge.className = 'entry-status-badge';
    badge.dataset.status = e.status;
    badge.textContent = e.status === 'want' ? 'Want' : e.status === 'doing' ? 'Doing' : 'Done';

    card.appendChild(dot);
    card.appendChild(info);
    card.appendChild(badge);

    card.addEventListener('click', () => openEntryPopup(e.id));
    area.appendChild(card);
  });
}

function renderStars(currentRating, onSelect) {
  const container = document.getElementById('entry-rating-stars');
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('button');
    star.type = 'button';
    star.textContent = i <= currentRating ? '★' : '☆';
    star.style.cssText = 'font-size:20px;cursor:pointer;background:none;border:none;'
      + 'color:' + (i <= currentRating ? '#D4AC0D' : 'var(--text-muted)') + ';'
      + 'transition:color 0.1s;padding:0 2px;';
    star.addEventListener('click', () => { onSelect(i); renderStars(i, onSelect); });
    star.addEventListener('mouseenter', () => {
      container.querySelectorAll('button').forEach((s, idx) => {
        s.textContent = idx < i ? '★' : '☆';
        s.style.color = idx < i ? '#D4AC0D' : 'var(--text-muted)';
      });
    });
    container.appendChild(star);
  }
  // Reset on mouse leave
  container.addEventListener('mouseleave', () => renderStars(currentRating, onSelect));
}

/* ─── Actions ─── */
function selectTracker(typeId) {
  currentTypeId = typeId;
  currentFilter = 'all';

  // Update status pills
  document.querySelectorAll('.status-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.status === 'all');
  });

  const tt = data.trackerTypes.find(t => t.id === typeId);
  document.getElementById('tracker-title').textContent = (tt?.icon || '') + ' ' + (tt?.name || '');
  document.getElementById('btn-add-entry').disabled = false;

  renderAll();
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.status-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.status === filter);
  });
  renderEntries();
}

/* ─── Tracker Type CRUD ─── */
function openTrackerTypePopup(typeId) {
  editingId = typeId;
  const isNew = !typeId;
  document.getElementById('popup-tracker-type-title').textContent = isNew ? 'New Tracker' : 'Edit Tracker';
  document.getElementById('btn-ttype-delete').style.display = isNew ? 'none' : '';

  const tt = isNew ? null : data.trackerTypes.find(t => t.id === typeId);
  document.getElementById('ttype-input-name').value = tt?.name || '';
  document.getElementById('ttype-input-icon').value = tt?.icon || '';
  selectedColor = tt?.color || COLORS[0];
  renderColorSwatches('ttype-color-swatches', selectedColor, c => { selectedColor = c; });

  openPopup('popup-tracker-type');
  setTimeout(() => document.getElementById('ttype-input-name').focus(), 60);
}

function saveTrackerType() {
  const name = document.getElementById('ttype-input-name').value.trim();
  if (!name) return;
  const icon = document.getElementById('ttype-input-icon').value.trim() || '•';

  if (editingId) {
    const tt = data.trackerTypes.find(t => t.id === editingId);
    if (tt) { tt.name = name; tt.color = selectedColor; tt.icon = icon; }
  } else {
    data.trackerTypes.push({ id: genId(), name, color: selectedColor, icon });
  }
  saveData(); renderAll();
  closePopup('popup-tracker-type');
}

function deleteTrackerType(id) {
  if (!confirm('Delete this tracker and all its entries?')) return;
  data.trackerEntries = data.trackerEntries.filter(e => e.typeId !== id);
  data.trackerTypes   = data.trackerTypes.filter(t => t.id !== id);
  if (currentTypeId === id) {
    currentTypeId = null;
    document.getElementById('tracker-title').textContent = 'Select a tracker';
    document.getElementById('btn-add-entry').disabled = true;
  }
  saveData(); renderAll();
}

/* ─── Entry CRUD ─── */
function openEntryPopup(entryId) {
  editingId = entryId;
  const isNew = !entryId;
  document.getElementById('popup-entry-title').textContent = isNew ? 'New Entry' : 'Edit Entry';
  document.getElementById('btn-entry-delete').style.display = isNew ? 'none' : '';

  const e = isNew ? null : data.trackerEntries.find(x => x.id === entryId);
  document.getElementById('entry-input-title').value  = e?.title  || '';
  document.getElementById('entry-input-status').value = e?.status || 'want';
  document.getElementById('entry-input-date').value   = e?.date   || '';
  document.getElementById('entry-input-note').value   = e?.note   || '';
  document.getElementById('entry-input-kids').checked = e?.withKids || false;

  currentRating = e?.rating || 0;
  renderStars(currentRating, (r) => { currentRating = r; });

  openPopup('popup-entry');
  setTimeout(() => document.getElementById('entry-input-title').focus(), 60);
}

function saveEntry() {
  const title = document.getElementById('entry-input-title').value.trim();
  if (!title) { document.getElementById('entry-input-title').focus(); return; }
  if (!currentTypeId) return;

  const fields = {
    title,
    typeId:   currentTypeId,
    status:   document.getElementById('entry-input-status').value,
    date:     document.getElementById('entry-input-date').value,
    note:     document.getElementById('entry-input-note').value,
    withKids: document.getElementById('entry-input-kids').checked,
    rating:   currentRating,
  };

  if (editingId) {
    const e = data.trackerEntries.find(x => x.id === editingId);
    if (e) Object.assign(e, fields);
  } else {
    data.trackerEntries.push({ id: genId(), ...fields });
  }
  saveData(); renderAll();
  closePopup('popup-entry');
}

function deleteEntry(id) {
  data.trackerEntries = data.trackerEntries.filter(x => x.id !== id);
  saveData(); renderAll();
  closePopup('popup-entry');
}

/* ─── Color swatches ─── */
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

/* ─── Popup system ─── */
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

/* ─── Event Listeners ─── */
function initEvents() {
  document.getElementById('overlay').addEventListener('click', closeActivePopup);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeActivePopup(); });

  document.getElementById('btn-add-tracker-type').addEventListener('click', () => openTrackerTypePopup(null));
  document.getElementById('btn-add-entry').addEventListener('click', () => openEntryPopup(null));

  // Status filter pills
  document.querySelectorAll('.status-pill').forEach(pill => {
    pill.addEventListener('click', () => setFilter(pill.dataset.status));
  });

  // Popup close buttons
  document.querySelectorAll('.popup-close').forEach(btn => {
    btn.addEventListener('click', () => closePopup(btn.dataset.popup));
  });

  // Tracker type popup
  document.getElementById('btn-ttype-save').addEventListener('click', saveTrackerType);
  document.getElementById('btn-ttype-delete').addEventListener('click', () => {
    if (editingId) deleteTrackerType(editingId);
  });
  document.getElementById('ttype-input-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveTrackerType();
  });

  // Entry popup
  document.getElementById('btn-entry-save').addEventListener('click', saveEntry);
  document.getElementById('btn-entry-delete').addEventListener('click', () => {
    if (editingId) deleteEntry(editingId);
  });
}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initEvents();
  renderAll();
});

/* ══════════════════════════════════════════════
   FalcoDigi Works — Dashboard Script
   Google Sheets Integration
   ══════════════════════════════════════════════ */

'use strict';

// ── Credentials ──────────────────────────────
const USERS = [
  { id: 'ayaan_fdw123', password: '123456', name: 'Ayaan' },
  { id: 'rahil_fdw123', password: '123456', name: 'Rahil' },
];

// ── API ───────────────────────────────────────
const API_URL = 'https://script.google.com/macros/s/AKfycbyd1MqdmxwVHTBON6lZfvc9CiaeOnELb4nMnZXYnf8Gbz2xsjCrJuCSN4xyZQ4fHnU/exec';

// ── Storage Keys ─────────────────────────────
const KEY_USER = 'fdw_user';

// ── State ─────────────────────────────────────
let clients = [];
let currentUser = null;

// ══════════════════════════════════════════════
//   INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem(KEY_USER);
  if (saved) {
    currentUser = JSON.parse(saved);
    showDashboard();
  } else {
    showLogin();
  }

  const passEl = document.getElementById('loginPass');
  const idEl   = document.getElementById('loginId');
  if (passEl) passEl.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  if (idEl)   idEl.addEventListener('keydown',   e => { if (e.key === 'Enter') handleLogin(); });
});

// ══════════════════════════════════════════════
//   LOGIN
// ══════════════════════════════════════════════
function handleLogin() {
  const id    = document.getElementById('loginId').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');

  const user = USERS.find(u => u.id === id && u.password === pass);

  if (!user) {
    errEl.classList.remove('hidden');
    errEl.style.animation = 'none';
    void errEl.offsetWidth;
    errEl.style.animation = '';
    return;
  }

  errEl.classList.add('hidden');
  currentUser = user;
  localStorage.setItem(KEY_USER, JSON.stringify(user));
  showDashboard();
}

function handleLogout() {
  localStorage.removeItem(KEY_USER);
  currentUser = null;
  clients = [];
  document.getElementById('dashboardScreen').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginId').value   = '';
  document.getElementById('loginPass').value = '';
}

// ══════════════════════════════════════════════
//   SHOW SCREENS
// ══════════════════════════════════════════════
function showLogin() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboardScreen').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('dashboardScreen').classList.remove('hidden');

  const nameEl = document.getElementById('welcomeName');
  const dateEl = document.getElementById('todayDate');
  if (nameEl) nameEl.textContent = currentUser.name;
  if (dateEl) dateEl.textContent = formatDateLong(new Date());

  loadClients();
}

// ══════════════════════════════════════════════
//   SECTIONS (Sidebar Nav)
// ══════════════════════════════════════════════
function showSection(name, el) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const target = document.getElementById('section-' + name);
  if (target) target.classList.remove('hidden');
  if (el) el.classList.add('active');

  if (name === 'clients') {
    renderTable();
  } else if (name === 'overview') {
    renderRecent();
    updateStats();
  }
}

// ══════════════════════════════════════════════
//   GOOGLE SHEETS — LOAD CLIENTS (GET)
// ══════════════════════════════════════════════
function loadClients() {
  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      console.log('Fetched clients from Google Sheets:', data);
      clients = Array.isArray(data) ? data : [];
      updateStats();
      renderTable();
      renderRecent();
    })
    .catch(err => {
      console.error('Failed to load clients:', err);
      clients = [];
      updateStats();
      renderTable();
      renderRecent();
    });
}

// ══════════════════════════════════════════════
//   GOOGLE SHEETS — ADD CLIENT (POST)
// ══════════════════════════════════════════════
function addClient() {
  const name     = document.getElementById('clientName').value.trim();
  const phone    = document.getElementById('clientPhone').value.trim();
  const status   = document.getElementById('clientStatus').value;
  const priority = document.getElementById('clientPriority').value;
  const followUp = document.getElementById('clientFollowup').value;
  const notes    = document.getElementById('clientNotes').value.trim();
  const errEl    = document.getElementById('formError');

  if (!name || !phone || !status || !priority) {
    errEl.classList.remove('hidden');
    return;
  }

  errEl.classList.add('hidden');

  const formData = new FormData();
  formData.append('name',     name);
  formData.append('phone',    phone);
  formData.append('status',   status);
  formData.append('priority', priority);
  formData.append('followUp', followUp);
  formData.append('notes',    notes);

  showToast('Saving client…');

  fetch(API_URL, {
    method: 'POST',
    body:   formData,
  })
    .then(res => res.json())
    .then(data => {
      console.log('Client saved to Google Sheets:', data);

      ['clientName', 'clientPhone', 'clientNotes', 'clientFollowup'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      document.getElementById('clientStatus').value   = '';
      document.getElementById('clientPriority').value = '';

      loadClients();
      showToast('Client added successfully ✦');

      const navClients = document.querySelector('.nav-item:nth-child(3)');
      showSection('clients', navClients);
    })
    .catch(err => {
      console.error('Failed to save client:', err);
      showToast('Error saving client. Please try again.');
    });
}

// ══════════════════════════════════════════════
//   DELETE CLIENT
// ══════════════════════════════════════════════
function deleteClient(index) {
  const c = clients[index];
  if (!c) return;
  if (!confirm('Remove "' + c.name + '" from records?')) return;

  const formData = new FormData();
  formData.append('action',   'delete');
  formData.append('rowIndex', c.rowIndex || '');
  formData.append('name',     c.name);

  fetch(API_URL, {
    method: 'POST',
    body:   formData,
  })
    .then(res => res.json())
    .then(() => {
      loadClients();
      showToast('Client removed.');
    })
    .catch(err => {
      console.error('Failed to delete client:', err);
      clients.splice(index, 1);
      updateStats();
      renderTable();
      renderRecent();
      showToast('Client removed (local).');
    });
}

// ══════════════════════════════════════════════
//   EDIT CLIENT
// ══════════════════════════════════════════════
function openEdit(index) {
  const c = clients[index];
  if (!c) return;
  document.getElementById('editIndex').value    = index;
  document.getElementById('editName').value     = c.name     || '';
  document.getElementById('editPhone').value    = c.phone    || '';
  document.getElementById('editStatus').value   = c.status   || '';
  document.getElementById('editPriority').value = c.priority || '';
  document.getElementById('editFollowup').value = c.followUp || c.followup || '';
  document.getElementById('editNotes').value    = c.notes    || '';
  document.getElementById('editModal').classList.remove('hidden');
}

function saveEdit() {
  const index    = parseInt(document.getElementById('editIndex').value);
  const c        = clients[index];
  const name     = document.getElementById('editName').value.trim();
  const phone    = document.getElementById('editPhone').value.trim();
  const status   = document.getElementById('editStatus').value;
  const priority = document.getElementById('editPriority').value;
  const followUp = document.getElementById('editFollowup').value;
  const notes    = document.getElementById('editNotes').value.trim();

  const formData = new FormData();
  formData.append('action',   'update');
  formData.append('rowIndex', (c && c.rowIndex) ? c.rowIndex : '');
  formData.append('name',     name);
  formData.append('phone',    phone);
  formData.append('status',   status);
  formData.append('priority', priority);
  formData.append('followUp', followUp);
  formData.append('notes',    notes);

  closeModal();

  fetch(API_URL, {
    method: 'POST',
    body:   formData,
  })
    .then(res => res.json())
    .then(() => {
      loadClients();
      showToast('Client updated ✦');
    })
    .catch(err => {
      console.error('Failed to update client:', err);
      if (c) clients[index] = { ...c, name, phone, status, priority, followUp, notes };
      updateStats();
      renderTable();
      renderRecent();
      showToast('Client updated (local).');
    });
}

function closeModal() {
  document.getElementById('editModal').classList.add('hidden');
}

document.addEventListener('click', e => {
  if (e.target.id === 'editModal') closeModal();
});

// ══════════════════════════════════════════════
//   RENDER TABLE
// ══════════════════════════════════════════════
function renderTable(data) {
  const rows    = data !== undefined ? data : clients;
  const tbody   = document.getElementById('clientTableBody');
  const empty   = document.getElementById('emptyState');
  const countEl = document.getElementById('clientCount');

  if (!tbody) return;

  tbody.innerHTML = '';
  if (countEl) countEl.textContent = rows.length;

  if (!rows.length) {
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  rows.forEach((c) => {
    const actualIdx = clients.indexOf(c);
    const fu = c.followUp || c.followup || '';
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + escHtml(c.name || '') + '</strong></td>' +
      '<td>' + escHtml(c.phone || '') + '</td>' +
      '<td>' + statusBadge(c.status || '') + '</td>' +
      '<td>' + followupBadge(fu) + '</td>' +
      '<td>' + priorityBadge(c.priority || '') + '</td>' +
      '<td><div class="action-btns">' +
        '<button class="btn-edit"   onclick="openEdit('  + actualIdx + ')">Edit</button>' +
        '<button class="btn-delete" onclick="deleteClient(' + actualIdx + ')">Delete</button>' +
      '</div></td>';
    tbody.appendChild(tr);
  });
}

// ══════════════════════════════════════════════
//   RENDER RECENT
// ══════════════════════════════════════════════
function renderRecent() {
  const el = document.getElementById('recentClients');
  if (!el) return;
  el.innerHTML = '';

  const recent = clients.slice(0, 5);

  if (!recent.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:12px 0;">No clients yet. Add your first client!</p>';
    return;
  }

  recent.forEach(c => {
    const div = document.createElement('div');
    div.className = 'recent-item';
    div.innerHTML =
      '<div class="recent-avatar">' + (c.name || '?').charAt(0).toUpperCase() + '</div>' +
      '<div class="recent-info">' +
        '<div class="recent-name">' + escHtml(c.name || '') + '</div>' +
        '<div class="recent-meta">' + escHtml(c.phone || '') + ' · ' + (c.status || '') + '</div>' +
      '</div>' +
      priorityBadge(c.priority || '');
    el.appendChild(div);
  });
}

// ══════════════════════════════════════════════
//   UPDATE STATS
// ══════════════════════════════════════════════
function updateStats() {
  const total   = clients.length;
  const today   = todayStr();
  const pending = clients.filter(c => {
    const fu = c.followUp || c.followup || '';
    return fu && fu >= today;
  }).length;
  const ongoing = clients.filter(c =>
    ['New Lead', 'Contacted', 'Interested'].includes(c.status)
  ).length;

  const t = document.getElementById('totalClients');
  const p = document.getElementById('pendingFollowups');
  const o = document.getElementById('ongoingWork');
  if (t) t.textContent = total;
  if (p) p.textContent = pending;
  if (o) o.textContent = ongoing;
}

// ══════════════════════════════════════════════
//   SEARCH / FILTER
// ══════════════════════════════════════════════
function filterClients() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();

  if (!q) {
    renderTable();
    return;
  }

  const filtered = clients.filter(c =>
    (c.name   || '').toLowerCase().includes(q) ||
    (c.phone  || '').toLowerCase().includes(q) ||
    (c.status || '').toLowerCase().includes(q) ||
    (c.notes  || '').toLowerCase().includes(q)
  );

  renderTable(filtered);

  const clientsSec = document.getElementById('section-clients');
  if (clientsSec && clientsSec.classList.contains('hidden')) {
    const navClients = document.querySelector('.nav-item:nth-child(3)');
    showSection('clients', navClients);
  }
}

// ══════════════════════════════════════════════
//   BADGE HELPERS
// ══════════════════════════════════════════════
function followupBadge(date) {
  if (!date) return '<span style="color:#B8A48A">—</span>';
  const today = todayStr();
  let cls, label;
  if (date < today) {
    cls = 'fu-overdue'; label = '⚠ ' + formatDate(date);
  } else if (date === today) {
    cls = 'fu-today'; label = '● Today';
  } else {
    cls = 'fu-upcoming'; label = '✓ ' + formatDate(date);
  }
  return '<span class="' + cls + '">' + label + '</span>';
}

function priorityBadge(p) {
  if (!p) return '';
  return '<span class="priority-badge priority-' + p + '">' + p + '</span>';
}

function statusBadge(s) {
  if (!s) return '';
  const map = {
    'New Lead':       'new-lead',
    'Contacted':      'contacted',
    'Interested':     'interested',
    'Converted':      'converted',
    'Not Interested': 'not-interested',
  };
  const cls = map[s] || '';
  return '<span class="status-badge ' + cls + '">' + s + '</span>';
}

// ══════════════════════════════════════════════
//   TOAST
// ══════════════════════════════════════════════
function showToast(msg) {
  const old = document.getElementById('fdwToast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'fdwToast';
  toast.textContent = msg;
  Object.assign(toast.style, {
    position:      'fixed',
    bottom:        '28px',
    right:         '28px',
    background:    '#3E2F1C',
    color:         '#F5E9D8',
    padding:       '13px 24px',
    borderRadius:  '10px',
    fontSize:      '0.87rem',
    fontFamily:    "'Jost', sans-serif",
    letterSpacing: '0.5px',
    boxShadow:     '0 8px 28px rgba(62,47,28,0.25)',
    borderLeft:    '3px solid #C6A86B',
    zIndex:        '9999',
    animation:     'fadeSlideUp 0.3s ease both',
    cursor:        'default',
  });
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease';
    toast.style.opacity    = '0';
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

// ══════════════════════════════════════════════
//   DATE UTILITIES
// ══════════════════════════════════════════════
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(str) {
  if (!str) return '';
  const parts = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0];
}

function formatDateLong(date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ══════════════════════════════════════════════
//   SECURITY
// ══════════════════════════════════════════════
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
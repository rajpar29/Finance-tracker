'use strict';

// ── Default categories ───────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: 'food',          label: 'Food',        icon: '🍔' },
  { id: 'transport',     label: 'Transport',   icon: '🚗' },
  { id: 'shopping',      label: 'Shopping',    icon: '🛍️' },
  { id: 'health',        label: 'Health',      icon: '💊' },
  { id: 'bills',         label: 'Bills',       icon: '🧾' },
  { id: 'entertainment', label: 'Fun',         icon: '🎬' },
  { id: 'education',     label: 'Education',   icon: '📚' },
  { id: 'other',         label: 'Other',       icon: '💡' },
];

const STORAGE_KEY = 'spend_tracker_expenses';
const CAT_KEY     = 'spend_tracker_cats';

// ── State ───────────────────────────────────────────────
let expenses       = loadExpenses();
let categories     = loadCategories();
let selectedCategory = null;
let viewDate       = todayStr();
let summaryDate    = new Date();

// ── Helpers ─────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function loadExpenses() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}
function loadCategories() {
  try {
    const custom = JSON.parse(localStorage.getItem(CAT_KEY)) || [];
    return [...DEFAULT_CATEGORIES, ...custom];
  } catch { return [...DEFAULT_CATEGORIES]; }
}
function saveCustomCategories() {
  localStorage.setItem(CAT_KEY, JSON.stringify(categories.filter(c => c.custom)));
}
function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function monthLabel(date) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function dayLabel(dateStr) {
  const today = todayStr();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return parseDate(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function getCat(id) {
  return categories.find(c => c.id === id) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Tabs ────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === tab + '-view'));
      if (tab === 'expenses') renderExpenseList();
      if (tab === 'summary')  renderSummary();
    });
  });
}

// ── Category grid ────────────────────────────────────────
function renderCategoryGrid() {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-btn' + (cat.custom ? ' custom-cat' : '');
    btn.dataset.id = cat.id;
    btn.innerHTML = `<span class="cat-icon">${cat.icon}</span><span>${escHtml(cat.label)}</span>`;
    if (selectedCategory === cat.id) btn.classList.add('selected');

    if (cat.custom) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'cat-del-btn';
      del.title = 'Delete category';
      del.textContent = '×';
      del.addEventListener('click', e => { e.stopPropagation(); deleteCategory(cat.id); });
      btn.appendChild(del);
    }

    btn.addEventListener('click', () => {
      selectedCategory = cat.id;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('selected', b.dataset.id === cat.id));
    });
    grid.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'cat-btn cat-add-btn';
  addBtn.innerHTML = '<span class="cat-icon">➕</span><span>New</span>';
  addBtn.addEventListener('click', () => {
    const form = document.getElementById('add-cat-form');
    const isOpen = form.style.display !== 'none';
    form.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) document.getElementById('new-cat-icon').focus();
  });
  grid.appendChild(addBtn);
}

function addCategory(icon, label) {
  const id = 'c_' + Date.now();
  categories.push({ id, icon: icon.trim() || '🏷️', label: label.trim(), custom: true });
  saveCustomCategories();
  renderCategoryGrid();
}

function deleteCategory(id) {
  categories = categories.filter(c => c.id !== id);
  saveCustomCategories();
  if (selectedCategory === id) selectedCategory = null;
  renderCategoryGrid();
  showToast('Category deleted');
}

// ── Add Expense Form ─────────────────────────────────────
function initAddForm() {
  renderCategoryGrid();
  document.getElementById('exp-date').value = todayStr();

  document.getElementById('save-cat-btn').addEventListener('click', () => {
    const icon  = document.getElementById('new-cat-icon').value.trim();
    const label = document.getElementById('new-cat-name').value.trim();
    if (!label) { showToast('Enter a category name'); return; }
    addCategory(icon || '🏷️', label);
    document.getElementById('new-cat-icon').value = '';
    document.getElementById('new-cat-name').value = '';
    document.getElementById('add-cat-form').style.display = 'none';
    showToast('Category added!');
  });
  document.getElementById('cancel-cat-btn').addEventListener('click', () => {
    document.getElementById('add-cat-form').style.display = 'none';
  });

  document.getElementById('add-form').addEventListener('submit', e => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const desc   = document.getElementById('exp-desc').value.trim();
    const date   = document.getElementById('exp-date').value;
    if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
    if (!selectedCategory)      { showToast('Pick a category'); return; }
    if (!date)                  { showToast('Select a date'); return; }
    expenses.unshift({ id: Date.now().toString(), amount, desc: desc || getCat(selectedCategory).label, category: selectedCategory, date });
    saveExpenses();
    showToast('Expense added!');
    document.getElementById('exp-amount').value = '';
    document.getElementById('exp-desc').value = '';
    document.getElementById('exp-date').value = todayStr();
    selectedCategory = null;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  });
}

// ── Expenses View ─────────────────────────────────────────
function initExpensesView() {
  document.getElementById('prev-day').addEventListener('click', () => {
    const d = parseDate(viewDate); d.setDate(d.getDate() - 1);
    viewDate = d.toISOString().slice(0, 10); renderExpenseList();
  });
  document.getElementById('next-day').addEventListener('click', () => {
    const d = parseDate(viewDate); d.setDate(d.getDate() + 1);
    if (d > parseDate(todayStr())) return;
    viewDate = d.toISOString().slice(0, 10); renderExpenseList();
  });
  renderExpenseList();
}

function renderExpenseList() {
  const dayExpenses = expenses.filter(e => e.date === viewDate);
  const total = dayExpenses.reduce((s, e) => s + e.amount, 0);
  document.getElementById('view-date-label').textContent = dayLabel(viewDate);
  document.getElementById('day-total-amount').textContent = fmt(total);
  document.getElementById('next-day').disabled = viewDate === todayStr();
  const list = document.getElementById('expense-list');
  if (dayExpenses.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌿</div><p>No expenses recorded for this day.</p></div>`;
    return;
  }
  list.innerHTML = dayExpenses.map(e => {
    const cat = getCat(e.category);
    return `<div class="expense-item">
      <span class="cat-emoji">${cat.icon}</span>
      <div class="details">
        <div class="name">${escHtml(e.desc)}</div>
        <div class="cat-label">${escHtml(cat.label)}</div>
      </div>
      <span class="item-amount">−${fmt(e.amount)}</span>
      <button class="delete-btn" title="Delete" onclick="deleteExpense('${e.id}')">&#x1F5D1;&#xFE0F;</button>
    </div>`;
  }).join('');
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses(); renderExpenseList(); showToast('Deleted');
}

// ── Summary View ─────────────────────────────────────────
function initSummaryView() {
  document.getElementById('prev-month').addEventListener('click', () => {
    summaryDate.setMonth(summaryDate.getMonth() - 1); renderSummary();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    const now = new Date();
    if (summaryDate.getFullYear() === now.getFullYear() && summaryDate.getMonth() === now.getMonth()) return;
    summaryDate.setMonth(summaryDate.getMonth() + 1); renderSummary();
  });
}

function renderSummary() {
  const y = summaryDate.getFullYear(), m = summaryDate.getMonth();
  const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
  document.getElementById('summary-month-label').textContent = monthLabel(summaryDate);
  const monthExpenses = expenses.filter(e => e.date.startsWith(monthStr));
  const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
  document.getElementById('summary-total-amount').textContent = fmt(total);
  document.getElementById('summary-txn-count').textContent =
    `${monthExpenses.length} transaction${monthExpenses.length !== 1 ? 's' : ''}`;
  const byCat = {};
  monthExpenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const catBreakdown = document.getElementById('cat-breakdown');
  if (Object.keys(byCat).length === 0) {
    catBreakdown.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>No data for this month.</p></div>';
  } else {
    catBreakdown.innerHTML = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([id, amt]) => {
      const cat = getCat(id);
      const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
      return `<div class="cat-row">
        <span class="emoji">${cat.icon}</span>
        <div class="info">
          <div class="name">${escHtml(cat.label)}</div>
          <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
        </div>
        <span class="cat-amt">${fmt(amt)}</span>
        <span class="cat-pct">${pct}%</span>
      </div>`;
    }).join('');
  }
  const byDay = {};
  monthExpenses.forEach(e => {
    byDay[e.date] = { total: (byDay[e.date]?.total || 0) + e.amount, count: (byDay[e.date]?.count || 0) + 1 };
  });
  const dailyEl = document.getElementById('daily-breakdown');
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));
  dailyEl.innerHTML = days.length === 0 ? '' :
    `<div class="card-title" style="margin-bottom:10px">Daily Breakdown</div><div class="daily-list">` +
    days.map(([date, data]) =>
      `<div class="daily-row" onclick="jumpToDay('${date}')">
        <div><div class="day-label">${dayLabel(date)}</div><div class="day-txns">${data.count} txn${data.count !== 1 ? 's' : ''}</div></div>
        <span class="day-amt">${fmt(data.total)}</span>
      </div>`).join('') + `</div>`;
}

function jumpToDay(dateStr) {
  viewDate = dateStr;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'expenses'));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'expenses-view'));
  renderExpenseList();
}

// ── Export / Import ──────────────────────────────────────
function initDataActions() {
  document.getElementById('export-btn').addEventListener('click', () => {
    const data = { version: 1, exported: new Date().toISOString(), expenses };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `spendtrack-${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast('Exported!');
  });
  const fileInput = document.getElementById('import-file');
  document.getElementById('import-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const imported = Array.isArray(data) ? data : (data.expenses || []);
        if (!Array.isArray(imported)) throw new Error();
        const existingIds = new Set(expenses.map(e => e.id));
        const newOnes = imported.filter(e => e.id && e.amount && e.date && !existingIds.has(e.id));
        expenses = [...newOnes, ...expenses];
        saveExpenses();
        showToast(`Imported ${newOnes.length} expense${newOnes.length !== 1 ? 's' : ''}`);
        renderSummary();
      } catch { showToast('Invalid file'); }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
}

// ── PWA Install ────────────────────────────────────────────
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  document.getElementById('install-banner').style.display = 'block';
  document.getElementById('install-btn').addEventListener('click', () => {
    deferredInstall.prompt();
    document.getElementById('install-banner').style.display = 'none';
  });
});

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initAddForm();
  initExpensesView();
  initSummaryView();
  initDataActions();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // Check for updates on load and when app is resumed
      reg.update();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update();
      });
    }).catch(() => {});

    // SW posts SW_UPDATED when it activates and finds a stale cache
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'SW_UPDATED') {
        const banner = document.getElementById('update-banner');
        banner.style.display = 'flex';
        document.getElementById('update-btn').addEventListener('click', () => window.location.reload());
        document.getElementById('dismiss-update-btn').addEventListener('click', () => {
          banner.style.display = 'none';
        });
      }
    });
  }
});

window.deleteExpense = deleteExpense;
window.jumpToDay = jumpToDay;

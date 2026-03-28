'use strict';

// ── Constants ──────────────────────────────────────────────
const CATEGORIES = [
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

// ── State ──────────────────────────────────────────────────
let expenses = loadExpenses();
let selectedCategory = null;
let viewDate = todayStr();          // yyyy-mm-dd shown in Expenses tab
let summaryDate = new Date();       // month shown in Summary tab

// ── Helpers ───────────────────────────────────────────────
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
  const d = parseDate(dateStr);
  const today = todayStr();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yStr)  return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getCat(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Tab navigation ─────────────────────────────────────────
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

// ── Add Expense Form ───────────────────────────────────────
function initAddForm() {
  // Category grid
  const grid = document.getElementById('category-grid');
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-btn';
    btn.dataset.id = cat.id;
    btn.innerHTML = `<span class="cat-icon">${cat.icon}</span><span>${cat.label}</span>`;
    btn.addEventListener('click', () => {
      selectedCategory = cat.id;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('selected', b.dataset.id === cat.id));
    });
    grid.appendChild(btn);
  });

  // Date default
  document.getElementById('exp-date').value = todayStr();

  // Form submit
  document.getElementById('add-form').addEventListener('submit', e => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const desc   = document.getElementById('exp-desc').value.trim();
    const date   = document.getElementById('exp-date').value;

    if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
    if (!selectedCategory)      { showToast('Pick a category'); return; }
    if (!date)                  { showToast('Select a date'); return; }

    const expense = {
      id: Date.now().toString(),
      amount,
      desc: desc || getCat(selectedCategory).label,
      category: selectedCategory,
      date,
    };

    expenses.unshift(expense);
    saveExpenses();
    showToast('Expense added!');

    // Reset form
    document.getElementById('exp-amount').value = '';
    document.getElementById('exp-desc').value = '';
    document.getElementById('exp-date').value = todayStr();
    selectedCategory = null;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  });
}

// ── Expenses View ──────────────────────────────────────────
function initExpensesView() {
  document.getElementById('prev-day').addEventListener('click', () => {
    const d = parseDate(viewDate);
    d.setDate(d.getDate() - 1);
    viewDate = d.toISOString().slice(0, 10);
    renderExpenseList();
  });
  document.getElementById('next-day').addEventListener('click', () => {
    const d = parseDate(viewDate);
    d.setDate(d.getDate() + 1);
    const today = parseDate(todayStr());
    if (d > today) return;
    viewDate = d.toISOString().slice(0, 10);
    renderExpenseList();
  });
  renderExpenseList();
}

function renderExpenseList() {
  const dayExpenses = expenses.filter(e => e.date === viewDate);
  const total = dayExpenses.reduce((s, e) => s + e.amount, 0);

  document.getElementById('view-date-label').textContent = dayLabel(viewDate);
  document.getElementById('day-total-amount').textContent = fmt(total);

  // Disable next if today
  document.getElementById('next-day').disabled = viewDate === todayStr();

  const list = document.getElementById('expense-list');
  if (dayExpenses.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🌿</div>
      <p>No expenses recorded for this day.</p>
    </div>`;
    return;
  }

  list.innerHTML = dayExpenses.map(e => {
    const cat = getCat(e.category);
    return `<div class="expense-item" data-id="${e.id}">
      <span class="cat-emoji">${cat.icon}</span>
      <div class="details">
        <div class="name">${escHtml(e.desc)}</div>
        <div class="cat-label">${cat.label}</div>
      </div>
      <span class="item-amount">−${fmt(e.amount)}</span>
      <button class="delete-btn" title="Delete" onclick="deleteExpense('${e.id}')">🗑️</button>
    </div>`;
  }).join('');
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses();
  renderExpenseList();
  showToast('Deleted');
}

// ── Summary View ───────────────────────────────────────────
function initSummaryView() {
  document.getElementById('prev-month').addEventListener('click', () => {
    summaryDate.setMonth(summaryDate.getMonth() - 1);
    renderSummary();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    const now = new Date();
    if (summaryDate.getFullYear() === now.getFullYear() && summaryDate.getMonth() === now.getMonth()) return;
    summaryDate.setMonth(summaryDate.getMonth() + 1);
    renderSummary();
  });
}

function renderSummary() {
  const y = summaryDate.getFullYear();
  const m = summaryDate.getMonth();
  const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;

  document.getElementById('summary-month-label').textContent = monthLabel(summaryDate);

  const monthExpenses = expenses.filter(e => e.date.startsWith(monthStr));
  const total = monthExpenses.reduce((s, e) => s + e.amount, 0);

  document.getElementById('summary-total-amount').textContent = fmt(total);
  document.getElementById('summary-txn-count').textContent =
    `${monthExpenses.length} transaction${monthExpenses.length !== 1 ? 's' : ''}`;

  // By category
  const byCat = {};
  monthExpenses.forEach(e => {
    byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  });

  const catBreakdown = document.getElementById('cat-breakdown');
  if (Object.keys(byCat).length === 0) {
    catBreakdown.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>No data for this month.</p></div>';
  } else {
    const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    catBreakdown.innerHTML = sorted.map(([id, amt]) => {
      const cat = getCat(id);
      const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
      return `<div class="cat-row">
        <span class="emoji">${cat.icon}</span>
        <div class="info">
          <div class="name">${cat.label}</div>
          <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
        </div>
        <span class="cat-amt">${fmt(amt)}</span>
        <span class="cat-pct">${pct}%</span>
      </div>`;
    }).join('');
  }

  // Daily breakdown
  const byDay = {};
  monthExpenses.forEach(e => {
    byDay[e.date] = { total: (byDay[e.date]?.total || 0) + e.amount, count: (byDay[e.date]?.count || 0) + 1 };
  });
  const dailyEl = document.getElementById('daily-breakdown');
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));
  if (days.length === 0) {
    dailyEl.innerHTML = '';
  } else {
    dailyEl.innerHTML = `<div class="card-title" style="margin-bottom:10px">Daily Breakdown</div>` +
      `<div class="daily-list">` +
      days.map(([date, data]) =>
        `<div class="daily-row" onclick="jumpToDay('${date}')">
          <div>
            <div class="day-label">${dayLabel(date)}</div>
            <div class="day-txns">${data.count} txn${data.count !== 1 ? 's' : ''}</div>
          </div>
          <span class="day-amt">${fmt(data.total)}</span>
        </div>`
      ).join('') +
      `</div>`;
  }
}

function jumpToDay(dateStr) {
  viewDate = dateStr;
  // Switch to expenses tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'expenses'));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'expenses-view'));
  renderExpenseList();
}

// ── Utility ────────────────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── PWA install prompt ─────────────────────────────────────
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  const banner = document.getElementById('install-banner');
  banner.style.display = 'block';
  document.getElementById('install-btn').addEventListener('click', () => {
    deferredInstall.prompt();
    banner.style.display = 'none';
  });
});

// ── Boot ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initAddForm();
  initExpensesView();
  initSummaryView();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});

// expose for inline handlers
window.deleteExpense = deleteExpense;
window.jumpToDay = jumpToDay;

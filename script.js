'use strict';

// ===== Constants =====
const STORAGE_KEY = 'dailytodo_v2';

const CAT_LABELS = {
  work:     '💼 업무',
  personal: '🏠 개인',
  study:    '📚 공부',
};

// ===== Keyword-based Auto Classification =====
const CAT_KEYWORDS = {
  work: [
    '회의', '미팅', '보고서', '발표', '기획', '프로젝트', '업무', '메일', '이메일',
    '계약', '클라이언트', '출장', '마감', '제안서', '견적', '고객', '팀장', '결재',
    '검토', '회사', '직장', '취업', '면접', '야근', '출근', '퇴근', '거래처',
    'meeting', 'report', 'project', 'email', 'deadline', 'client', 'presentation',
  ],
  personal: [
    '헬스', '운동', '병원', '약속', '친구', '가족', '청소', '쇼핑', '요리', '식사',
    '여행', '산책', '취미', '세탁', '장보기', '영화', '데이트', '휴가', '생일',
    '결혼', '이사', '집안일', '청구서', '납부', '보험', '적금', '저축', '용돈',
    '부모님', '형제', '자취', '반려', '강아지', '고양이',
    'gym', 'hospital', 'shopping', 'travel', 'movie', 'birthday',
  ],
  study: [
    '공부', '학습', '과제', '시험', '독서', '책', '강의', '수업', '코딩', '프로그래밍',
    '자격증', '영어', '단어', '문법', '스터디', '연구', '논문', '학교', '복습',
    '예습', '인강', '강좌', '토익', '토플', '수능', '알고리즘', '개발', '디자인',
    'study', 'read', 'book', 'lecture', 'exam', 'coding', 'learn',
  ],
};

function autoDetectCategory(text) {
  if (!text.trim()) return null;

  const lower  = text.toLowerCase();
  const scores = { work: 0, personal: 0, study: 0 };

  for (const [cat, keywords] of Object.entries(CAT_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) scores[cat]++;
    }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : null;
}

// ===== State =====
let todos        = [];
let activeFilter = 'all';
let editingId    = null;

// ===== DOM References =====
const addForm          = document.getElementById('addForm');
const catSelect        = document.getElementById('catSelect');
const todoInput        = document.getElementById('todoInput');
const dueDateInput     = document.getElementById('dueDateInput');
const todoList         = document.getElementById('todoList');
const emptyState       = document.getElementById('emptyState');
const clearBtn         = document.getElementById('clearCompleted');
const dateLabel        = document.getElementById('dateLabel');
const filterBtns       = document.querySelectorAll('.filter-btn');
const modalOverlay     = document.getElementById('modalOverlay');
const editInput        = document.getElementById('editInput');
const editCatSel       = document.getElementById('editCatSelect');
const editDueDateInput = document.getElementById('editDueDateInput');
const editCancel       = document.getElementById('editCancel');
const editSave         = document.getElementById('editSave');
const autoHint         = document.getElementById('autoHint');

// ===== Storage =====
function load() {
  try { todos = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; }
  catch { todos = []; }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// ===== CRUD =====
function addTodo(text, cat, dueDate) {
  todos.unshift({
    id:        Date.now(),
    text:      text.trim(),
    category:  cat,
    completed: false,
    createdAt: new Date().toISOString(),
    dueDate:   dueDate || null,
  });
  save();
}

function toggleTodo(id) {
  const t = todos.find(t => t.id === id);
  if (t) { t.completed = !t.completed; save(); }
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  save();
}

function updateTodo(id, text, cat, dueDate) {
  const t = todos.find(t => t.id === id);
  if (t) { t.text = text.trim(); t.category = cat; t.dueDate = dueDate || null; save(); }
}

function clearCompleted() {
  const count = todos.filter(t => t.completed).length;
  if (!count) return;
  if (!confirm(`완료된 항목 ${count}개를 삭제할까요?`)) return;
  todos = todos.filter(t => !t.completed);
  save();
  render();
}

// ===== D-day =====
function calcDday(dueDate) {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diff === 0) return { label: 'D-Day', type: 'today' };
  if (diff > 0)  return { label: `D-${diff}`, type: diff <= 3 ? 'soon' : 'future' };
  return { label: `D+${Math.abs(diff)}`, type: 'overdue' };
}

// ===== Progress =====
function calcPct(list) {
  if (!list.length) return { pct: 0, done: 0, total: 0 };
  const done = list.filter(t => t.completed).length;
  return { pct: Math.round(done / list.length * 100), done, total: list.length };
}

function setBar(key, pct, sub) {
  document.getElementById(`${key}Bar`).style.width   = `${pct}%`;
  document.getElementById(`${key}Value`).textContent = `${pct}%`;
  document.getElementById(`${key}Sub`).textContent   = sub;
}

function updateProgress() {
  const all  = calcPct(todos);
  const work = calcPct(todos.filter(t => t.category === 'work'));
  const pers = calcPct(todos.filter(t => t.category === 'personal'));
  const stud = calcPct(todos.filter(t => t.category === 'study'));

  setBar('overall',  all.pct,  `${all.done} / ${all.total}개 완료`);
  setBar('work',     work.pct, `${work.done} / ${work.total}개`);
  setBar('personal', pers.pct, `${pers.done} / ${pers.total}개`);
  setBar('study',    stud.pct, `${stud.done} / ${stud.total}개`);
}

// ===== Render =====
function escapeHtml(s) {
  return s
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function makeTodoEl(todo) {
  const li = document.createElement('li');
  li.className   = 'todo-item item-enter';
  li.dataset.id  = todo.id;
  li.dataset.cat = todo.category;
  if (todo.completed) li.classList.add('completed');

  const dday = calcDday(todo.dueDate);
  const ddayHtml = dday
    ? `<span class="dday-badge ${dday.type}">${dday.label}</span>`
    : '';

  li.innerHTML = `
    <input type="checkbox" class="todo-checkbox" aria-label="완료 표시" ${todo.completed ? 'checked' : ''} />
    <div class="todo-content">
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <div class="todo-meta">
        <span class="cat-badge ${todo.category}">${CAT_LABELS[todo.category]}</span>
        ${ddayHtml}
        <span class="todo-date">${formatDate(todo.createdAt)}</span>
        <span class="double-click-hint">더블클릭으로 수정</span>
      </div>
    </div>
    <div class="todo-actions">
      <button class="btn-icon edit"   aria-label="수정">✏️</button>
      <button class="btn-icon delete" aria-label="삭제">🗑️</button>
    </div>
  `;

  li.querySelector('.todo-checkbox').addEventListener('change', () => { toggleTodo(todo.id); render(); });
  li.querySelector('.todo-text').addEventListener('dblclick',   () => openModal(todo.id));
  li.querySelector('.btn-icon.edit').addEventListener('click',  () => openModal(todo.id));
  li.querySelector('.btn-icon.delete').addEventListener('click', () => { deleteTodo(todo.id); render(); });

  return li;
}

function render() {
  const list = activeFilter === 'all'
    ? todos
    : todos.filter(t => t.category === activeFilter);

  todoList.innerHTML = '';

  if (!list.length) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
    const frag = document.createDocumentFragment();
    list.forEach(t => frag.appendChild(makeTodoEl(t)));
    todoList.appendChild(frag);
  }

  updateProgress();
}

// ===== Modal =====
function openModal(id) {
  const t = todos.find(t => t.id === id);
  if (!t) return;
  editingId              = id;
  editInput.value        = t.text;
  editCatSel.value       = t.category;
  editDueDateInput.value = t.dueDate ?? '';
  modalOverlay.classList.add('open');
  setTimeout(() => editInput.focus(), 50);
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

function saveEdit() {
  if (editingId === null) return;
  const text = editInput.value.trim();
  if (!text) { editInput.focus(); return; }
  updateTodo(editingId, text, editCatSel.value, editDueDateInput.value);
  closeModal();
  render();
}

// ===== Date Label =====
function setDateLabel() {
  const now  = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  dateLabel.textContent =
    `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

// ===== Event Listeners =====
todoInput.addEventListener('input', () => {
  const detected = autoDetectCategory(todoInput.value);
  if (detected) {
    catSelect.value = detected;
    catSelect.dataset.auto = 'true';
    autoHint.textContent = `자동 분류: ${CAT_LABELS[detected]}`;
    autoHint.className   = `auto-hint visible ${detected}`;
  } else {
    delete catSelect.dataset.auto;
    autoHint.className = 'auto-hint';
  }
});

addForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = todoInput.value.trim();
  if (!text) return;
  addTodo(text, catSelect.value, dueDateInput.value);
  todoInput.value    = '';
  dueDateInput.value = '';
  autoHint.className = 'auto-hint';
  delete catSelect.dataset.auto;
  todoInput.focus();
  render();
});

filterBtns.forEach(btn => btn.addEventListener('click', () => {
  activeFilter = btn.dataset.filter;
  filterBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}));

clearBtn.addEventListener('click', clearCompleted);
editCancel.addEventListener('click', closeModal);
editSave.addEventListener('click', saveEdit);

editInput.addEventListener('keydown', e => {
  if (e.key === 'Enter')  saveEdit();
  if (e.key === 'Escape') closeModal();
});

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

// ===== Init =====
(function init() {
  load();
  setDateLabel();
  render();
})();

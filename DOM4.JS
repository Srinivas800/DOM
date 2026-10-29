const USER_NAME = 'Buddy'; // shown in the greeting

const input = document.getElementById('input');
const add = document.getElementById('add');
const taskList = document.getElementById('tasklist');
const countEl = document.getElementById('count');
const messageEl = document.getElementById('message');
const fillEl = document.getElementById('fill');
const emptyEl = document.getElementById('empty');
const themeBtn = document.getElementById('theme');
const filterBtns = document.querySelectorAll('.filters button');
const greetingEl = document.getElementById('greeting');
const todayEl = document.getElementById('today');
const streakEl = document.getElementById('streak');
const weekEl = document.getElementById('week');
const weekTotalEl = document.getElementById('week-total');
const toastEl = document.getElementById('toast');
const toastText = document.getElementById('toast-text');
const undoBtn = document.getElementById('undo');

// ---------- Theme (dark / light) ----------
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeBtn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    localStorage.setItem('theme', theme);
}

setTheme(
    localStorage.getItem('theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);

themeBtn.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

// ---------- Data ----------
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// migrate old plain-string tasks
tasks = tasks.map((t) =>
    typeof t === 'string' ? { id: Date.now() + Math.random(), text: t, done: false } : t
);

let filter = 'all';

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// ---------- Dates + history (for streak and weekly stats) ----------
function keyFor(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

function todayKey() {
    return keyFor(new Date());
}

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem('history')) || {};
    } catch (e) {
        return {};
    }
}

// remember how many tasks were done today: { "2026-10-29": { done: 3, total: 5 } }
function recordToday() {
    // wait until the daily reset has run, so yesterday's ticks aren't counted as today's
    if (localStorage.getItem('lastReset') !== todayKey()) return;

    const history = loadHistory();
    history[todayKey()] = {
        done: tasks.filter((t) => t.done).length,
        total: tasks.length,
    };

    // keep only the last 60 days
    Object.keys(history).sort().slice(0, -60).forEach((k) => delete history[k]);
    localStorage.setItem('history', JSON.stringify(history));
}

function calcStreak() {
    const history = loadHistory();
    const isComplete = (key) => {
        const h = history[key];
        return h && h.total > 0 && h.done === h.total;
    };

    const d = new Date();
    // today still in progress? count from yesterday instead
    if (!isComplete(keyFor(d))) d.setDate(d.getDate() - 1);

    let streak = 0;
    while (isComplete(keyFor(d))) {
        streak++;
        d.setDate(d.getDate() - 1);
    }
    return streak;
}

// ---------- Greeting, streak, message, weekly chart ----------
function updateGreeting() {
    const now = new Date();
    const h = now.getHours();
    const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    greetingEl.textContent = part + ', ' + USER_NAME;
    todayEl.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric',
    });
}

function renderStreak() {
    const n = calcStreak();
    streakEl.textContent = '🔥 ' + n + '-day streak';
    streakEl.classList.toggle('active', n > 0);
}

function getMessage(done, total) {
    if (total === 0) return 'Add your first task to begin.';
    if (done === total) return 'All done. Great job!';
    const pct = done / total;
    if (pct >= 0.75) return 'Almost there!';
    if (pct >= 0.5) return 'Halfway there.';
    if (done > 0) return 'Good start, keep going.';
    return "Let's get started.";
}

function renderWeek() {
    const history = loadHistory();
    weekEl.innerHTML = '';
    let completed = 0;

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const h = history[keyFor(d)] || { done: 0, total: 0 };
        completed += h.done;

        const col = document.createElement('div');
        col.className = 'col' + (i === 0 ? ' today' : '');
        col.title = h.total ? h.done + ' of ' + h.total + ' done' : 'No tasks';

        const count = document.createElement('span');
        count.textContent = h.done;

        const track = document.createElement('div');
        track.className = 'track';
        const level = document.createElement('div');
        level.className = 'level';
        level.style.height = (h.total ? (h.done / h.total) * 100 : 0) + '%';
        track.append(level);

        const label = document.createElement('span');
        label.className = 'label';
        const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
           label.textContent = names[d.getDay()];

        col.append(count, track, label);
        weekEl.append(col);
    }

    weekTotalEl.textContent = completed + ' completed';
}

// ---------- Rendering ----------
function isVisible(task) {
    if (filter === 'active') return !task.done;
    if (filter === 'completed') return task.done;
    return true;
}

function render(newId) {
    taskList.innerHTML = '';
    // reordering only makes sense when every task is shown
    taskList.classList.toggle('no-drag', filter !== 'all');
    const visible = tasks.filter(isVisible);
    visible.forEach((t) => renderTask(t, t.id === newId));
    updateStatus(visible.length);
}

function renderTask(task, animate) {
    const litem = document.createElement('li');
    litem.dataset.id = task.id;
    litem.classList.toggle('done', task.done);
    if (animate) litem.classList.add('enter');

    // drag handle
    const handle = document.createElement('span');
    handle.className = 'handle';
    handle.textContent = '⋮⋮';
    handle.setAttribute('aria-hidden', 'true');
    handle.addEventListener('pointerdown', (e) => startDrag(e, litem, handle));

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', 'Mark "' + task.text + '" as done');

    const spanitem = document.createElement('span');
    spanitem.className = 'text';
    spanitem.textContent = task.text;
    spanitem.title = 'Double-click to edit';

    checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
        litem.classList.toggle('done', task.done);
        saveTasks();
        updateStatus(tasks.filter(isVisible).length);

        if (task.done && tasks.every((t) => t.done)) confetti();

        // under Active/Completed filters the item no longer belongs
        if (filter !== 'all') setTimeout(() => render(), 300);
    });

    // ----- edit -----
    function startEdit() {
        if (litem.classList.contains('editing')) return;
        litem.classList.add('editing');

        const field = document.createElement('input');
        field.type = 'text';
        field.className = 'edit-input';
        field.value = task.text;
        field.setAttribute('aria-label', 'Edit task');

        let finished = false;
        function finish(save) {
            if (finished) return;
            finished = true;
            const value = field.value.trim();
            if (save && value) {
                task.text = value;
                saveTasks();
                spanitem.textContent = value;
                checkbox.setAttribute('aria-label', 'Mark "' + value + '" as done');
            }
            litem.classList.remove('editing');
            field.replaceWith(spanitem);
        }

        field.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finish(true);
            if (e.key === 'Escape') finish(false);
        });
        field.addEventListener('blur', () => finish(true));

        spanitem.replaceWith(field);
        field.focus();
        field.select();
    }

    spanitem.addEventListener('dblclick', startEdit);

    const editbutton = document.createElement('button');
    editbutton.type = 'button';
    editbutton.className = 'action';
    editbutton.textContent = 'Edit';
    editbutton.addEventListener('click', startEdit);

    // ----- delete (with undo) -----
    const deletebutton = document.createElement('button');
    deletebutton.type = 'button';
    deletebutton.className = 'action';
    deletebutton.textContent = 'Delete';
    deletebutton.addEventListener('click', () => {
        deletebutton.disabled = true;
        litem.classList.add('leaving');
        litem.addEventListener('animationend', () => {
            const index = tasks.findIndex((t) => t.id === task.id);
            if (index === -1) return;
            const removed = tasks.splice(index, 1)[0];
            saveTasks();
            render();
            showUndo(removed, index);
        }, { once: true });
    });

    litem.append(handle, checkbox, spanitem, editbutton, deletebutton);
    taskList.append(litem);
}

// ---------- Progress + empty state ----------
function updateStatus(visibleCount) {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;

    countEl.textContent = done + ' of ' + total + ' done';
    messageEl.textContent = getMessage(done, total);
    fillEl.style.width = (total ? (done / total) * 100 : 0) + '%';

    if (visibleCount > 0) {
        emptyEl.textContent = '';
    } else if (total === 0) {
        emptyEl.textContent = 'No tasks yet. Add one above.';
    } else if (filter === 'active') {
        emptyEl.textContent = 'Nothing left to do.';
    } else {
        emptyEl.textContent = 'No completed tasks yet.';
    }

    recordToday();
    renderStreak();
    renderWeek();
}

// ---------- Undo delete ----------
let undoState = null;
let toastTimer = null;

function showUndo(task, index) {
    undoState = { task, index };
    toastText.textContent = 'Task deleted.';
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
    toastEl.classList.remove('show');
    undoState = null;
}

undoBtn.addEventListener('click', () => {
    if (!undoState) return;
    const task = undoState.task;
    const index = undoState.index;
    clearTimeout(toastTimer);
    hideToast();

    tasks.splice(Math.min(index, tasks.length), 0, task);
    saveTasks();
    render(task.id);
});

// ---------- Drag and drop (mouse + touch, using the ⋮⋮ handle) ----------
function startDrag(e, litem, handle) {
    if (filter !== 'all' || litem.classList.contains('editing')) return;
    e.preventDefault();

    handle.setPointerCapture(e.pointerId);
    litem.classList.add('dragging');
    document.body.classList.add('is-dragging');

    function onMove(ev) {
        const kids = Array.from(taskList.children);
        const from = kids.indexOf(litem);

        // first other item whose middle is below the pointer = where we belong
        const next = kids.find((el) => {
            if (el === litem) return false;
            const r = el.getBoundingClientRect();
            return ev.clientY < r.top + r.height / 2;
        });
        const to = next ? kids.indexOf(next) : kids.length;

        // move the neighbours around the dragged item, so the item itself never leaves the DOM
        if (to > from + 1) {
            for (let i = from + 1; i < to; i++) taskList.insertBefore(kids[i], litem);
        } else if (to < from) {
            const after = litem.nextSibling;
            for (let i = to; i < from; i++) taskList.insertBefore(kids[i], after);
        }
    }

    function onEnd() {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onEnd);
        handle.removeEventListener('pointercancel', onEnd);
        litem.classList.remove('dragging');
        document.body.classList.remove('is-dragging');

        // save the new order
        const order = Array.from(taskList.children).map((el) => el.dataset.id);
        tasks = order
            .map((id) => tasks.find((t) => String(t.id) === id))
            .filter(Boolean);
        saveTasks();
    }

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
}

// ---------- Filters ----------
filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        render();
    });
});

// ---------- Add task ----------
add.addEventListener('click', () => {
    const text = input.value.trim();
    if (text === '') {
        input.focus();
        return;
    }

    const task = { id: Date.now(), text, done: false };
    tasks.push(task);
    saveTasks();
    render(task.id);

    input.value = '';
    input.focus();
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') add.click();
});

// ---------- Confetti ----------
function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');
    canvas.width = innerWidth;
    canvas.height = innerHeight;

    const colors = ['#3a5bff', '#ffb454', '#ff5d8f', '#2ec4b6', '#9b5de5'];
    const pieces = Array.from({ length: 120 }, () => ({
        x: innerWidth / 2,
        y: innerHeight / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: Math.random() * -14 - 4,
        size: Math.random() * 6 + 4,
        rot: Math.random() * 6,
        vrot: (Math.random() - 0.5) * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let frames = 0;
    (function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach((p) => {
            p.vy += 0.35;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vrot;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });
        if (++frames < 140) requestAnimationFrame(tick);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })();
}

// ---------- Daily reset (uncheck completed tasks) ----------
function resetIfNewDay() {
    const last = localStorage.getItem('lastReset');

    // first run: just remember today
    if (!last) {
        localStorage.setItem('lastReset', todayKey());
        return;
    }
    if (last === todayKey()) return;

    tasks.forEach((t) => (t.done = false)); // tasks stay, checkboxes reset
    saveTasks();
    localStorage.setItem('lastReset', todayKey());
    render();
}

// ---------- Start ----------
resetIfNewDay();
updateGreeting();
render();
setInterval(() => {
    resetIfNewDay();
    updateGreeting();
}, 60000); // also handles the tab staying open past midnight

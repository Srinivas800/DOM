const input = document.getElementById('input');
const add = document.getElementById('add');
const taskList = document.getElementById('tasklist');
const countEl = document.getElementById('count');
const fillEl = document.getElementById('fill');
const emptyEl = document.getElementById('empty');
const themeBtn = document.getElementById('theme');
const filterBtns = document.querySelectorAll('.filters button');

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

// ---------- Rendering ----------
function isVisible(task) {
    if (filter === 'active') return !task.done;
    if (filter === 'completed') return task.done;
    return true;
}

function render(newId) {
    taskList.innerHTML = '';
    const visible = tasks.filter(isVisible);
    visible.forEach((t) => renderTask(t, t.id === newId));
    updateStatus(visible.length);
}

function renderTask(task, animate) {
    const litem = document.createElement('li');
    litem.classList.toggle('done', task.done);
    if (animate) litem.classList.add('enter');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', 'Mark "' + task.text + '" as done');

    const spanitem = document.createElement('span');
    spanitem.className = 'text';
    spanitem.textContent = task.text;

    checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
        litem.classList.toggle('done', task.done);
        saveTasks();
        updateStatus(tasks.filter(isVisible).length);

        if (task.done && tasks.every((t) => t.done)) confetti();

        // under Active/Completed filters the item no longer belongs
        if (filter !== 'all') setTimeout(() => render(), 300);
    });

    const deletebutton = document.createElement('button');
    deletebutton.type = 'button';
    deletebutton.className = 'delete';
    deletebutton.textContent = 'Delete';
    deletebutton.addEventListener('click', () => {
        litem.classList.add('leaving');
        litem.addEventListener('animationend', () => {
            tasks = tasks.filter((t) => t.id !== task.id);
            saveTasks();
            render();
        }, { once: true });
    });

    litem.append(checkbox, spanitem, deletebutton);
    taskList.append(litem);
}

// ---------- Progress + empty state ----------
function updateStatus(visibleCount) {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;

    countEl.textContent = done + ' of ' + total + ' done';
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
function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

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
render();
setInterval(resetIfNewDay, 60000); // also resets if the tab stays open past midnight
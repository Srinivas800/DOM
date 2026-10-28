const input = document.getElementById('input');
const add = document.getElementById('add');
const taskList = document.getElementById('tasklist');

// Each task is now an object: { id, text, done }
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// Migrate old data (plain strings) to the new object format
tasks = tasks.map((t) =>
    typeof t === 'string'
        ? { id: Date.now() + Math.random(), text: t, done: false }
        : t
);

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function inputchange() {
    console.log("something entered");
}

function renderTask(task) {
    const litem = document.createElement('li');

    // checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;

    // task text
    const spanitem = document.createElement('span');
    spanitem.textContent = task.text;
    spanitem.classList.toggle('done', task.done);

    checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;               // update the object
        spanitem.classList.toggle('done', task.done); // strike-through
        saveTasks();
    });

    // delete button
    const deletebutton = document.createElement('button');
    deletebutton.textContent = 'Delete';
    deletebutton.addEventListener('click', () => {
        litem.remove();
        tasks = tasks.filter((t) => t.id !== task.id); // remove by id
        saveTasks();
    });

    litem.append(checkbox, spanitem, deletebutton);
    taskList.append(litem);
}

// show saved tasks when the page loads
tasks.forEach(renderTask);

add.addEventListener('click', () => {
    const text = input.value.trim();
    if (text === '') {
        console.log("please enter a task");
        return;
    }

    const task = { id: Date.now(), text, done: false };
    tasks.push(task);
    saveTasks();
    renderTask(task);

    input.value = '';
    input.focus();
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') add.click();
});

    const input = document.getElementById('input');
    const add = document.getElementById('add');
    const taskList = document.getElementById('tasklist');

    // load saved tasks (or start with an empty array)
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function inputchange() {
        console.log("something entered");
    }

    function renderTask(text) {
        const litem = document.createElement('li');

        const spanitem = document.createElement('span');
        spanitem.textContent = text;

        const deletebutton = document.createElement('button');
        deletebutton.textContent = 'Delete';
        deletebutton.addEventListener('click', () => {
            litem.remove();
            tasks.splice(tasks.indexOf(text), 1);  // remove from array
            saveTasks();                           // update storage
        });

        litem.append(spanitem);
        litem.append(deletebutton);
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

        tasks.push(text);    // add to array
        saveTasks();         // save to storage
        renderTask(text);    // show on screen

        input.value = '';
        input.focus();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') add.click();
    });

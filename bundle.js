// My Bundle: save links, files (PDF, images, docs...) and notes on this device.
// Everything is stored in the browser (IndexedDB), nothing is uploaded anywhere.
(function () {
    const MAX_FILE_MB = 50;
    const DB_NAME = 'todoBundle';
    const STORE = 'items';

    const toggleBtn = document.getElementById('bundle-toggle');
    if (!toggleBtn) return; // bundle section isn't on this page

    const panel = document.getElementById('bundle-panel');
    const countEl = document.getElementById('bundle-count');
    const addTabs = document.querySelectorAll('[data-add]');
    const fieldBoxes = document.querySelectorAll('[data-field]');
    const filterBtns = document.querySelectorAll('[data-bfilter]');
    const form = document.getElementById('bundle-form');
    const titleIn = document.getElementById('b-title');
    const urlIn = document.getElementById('b-url');
    const fileIn = document.getElementById('b-file');
    const textIn = document.getElementById('b-text');
    const msgEl = document.getElementById('b-msg');
    const searchIn = document.getElementById('b-search');
    const listEl = document.getElementById('b-list');
    const emptyEl = document.getElementById('b-empty');

    let items = [];
    let addType = 'link';
    let filter = 'all';
    let query = '';
    let msgTimer = null;
    let askedPersist = false;

    // ---------- IndexedDB ----------
    let dbPromise;
    try {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        dbPromise = Promise.reject(e);
    }

    function request(mode, action) {
        return dbPromise.then((db) => new Promise((resolve, reject) => {
            const t = db.transaction(STORE, mode);
            const req = action(t.objectStore(STORE));
            t.oncomplete = () => resolve(req ? req.result : undefined);
            t.onerror = () => reject(t.error);
            t.onabort = () => reject(t.error);
        }));
    }

    const getAll = () => request('readonly', (s) => s.getAll());
    const putItem = (item) => request('readwrite', (s) => s.put(item));
    const deleteItem = (id) => request('readwrite', (s) => s.delete(id));

    // ---------- helpers ----------
    function newId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function showMsg(text) {
        msgEl.textContent = text;
        clearTimeout(msgTimer);
        if (text) msgTimer = setTimeout(() => (msgEl.textContent = ''), 4000);
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDate(ts) {
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    function host(url) {
        try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
    }

    function extension(name) {
        const m = /\.([a-z0-9]{1,5})$/i.exec(name || '');
        return m ? m[1].toUpperCase() : 'FILE';
    }

    // only show types that can't run scripts; everything else is download-only
    function canView(mime) {
        return /^(application\/pdf|image\/(png|jpe?g|gif|webp|avif|bmp)|text\/plain|audio\/|video\/)/i.test(mime || '');
    }

    // ---------- open / save / copy ----------
    function openFile(item) {
        const url = URL.createObjectURL(item.blob);
        const w = window.open(url, '_blank');
        if (!w) saveFile(item); // popup blocked: download instead
        setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    }

    function saveFile(item) {
        const url = URL.createObjectURL(item.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name || item.title;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve, reject) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.append(ta);
            ta.select();
            try {
                document.execCommand('copy') ? resolve() : reject();
            } catch (e) {
                reject(e);
            }
            ta.remove();
        });
    }

    // ---------- rendering ----------
    function button(label, onClick, extraClass) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'b-btn' + (extraClass ? ' ' + extraClass : '');
        b.textContent = label;
        b.addEventListener('click', onClick);
        return b;
    }

    function buildItem(item) {
        const li = document.createElement('li');
        li.className = 'b-item';

        const top = document.createElement('div');
        top.className = 'b-top';
        const badge = document.createElement('span');
        badge.className = 'b-badge' + (item.type === 'link' ? ' link' : '');
        badge.textContent = item.type === 'link' ? 'LINK' : item.type === 'note' ? 'NOTE' : extension(item.name);
        const name = document.createElement('span');
        name.className = 'b-name';
        name.textContent = item.title;
        name.title = item.title;
        top.append(badge, name);
        li.append(top);

        const actions = document.createElement('div');
        actions.className = 'b-actions';

        if (item.type === 'link') {
            const meta = document.createElement('p');
            meta.className = 'b-meta';
            meta.textContent = host(item.url) + ' · ' + formatDate(item.added);
            li.append(meta);

            const open = document.createElement('a');
            open.className = 'b-btn';
            open.href = item.url;
            open.target = '_blank';
            open.rel = 'noopener noreferrer';
            open.textContent = 'Open';
            actions.append(open, button('Copy link', function () { flash(this, copyText(item.url)); }));
        } else if (item.type === 'file') {
            const meta = document.createElement('p');
            meta.className = 'b-meta';
            meta.textContent = formatSize(item.size) + ' · ' + formatDate(item.added);
            li.append(meta);

            if (canView(item.mime)) actions.append(button('Open', () => openFile(item)));
            actions.append(button('Save', () => saveFile(item)));
        } else {
            const note = document.createElement('p');
            note.className = 'b-note';
            note.textContent = item.text;
            li.append(note);

            actions.append(
                button('Read', function () {
                    const open = li.classList.toggle('expanded');
                    this.textContent = open ? 'Less' : 'Read';
                }),
                button('Copy', function () { flash(this, copyText(item.text)); })
            );
        }

        actions.append(button('Delete', () => removeItem(item), 'danger'));
        li.append(actions);
        return li;
    }

    function flash(btn, promise) {
        const old = btn.textContent;
        promise.then(() => (btn.textContent = 'Copied'), () => (btn.textContent = 'Failed'));
        setTimeout(() => (btn.textContent = old), 1200);
    }

    function render() {
        countEl.textContent = items.length;
        listEl.innerHTML = '';

        const q = query.trim().toLowerCase();
        const shown = items
            .filter((i) => filter === 'all' || i.type === filter)
            .filter((i) => !q || [i.title, i.url, i.name, i.text].join(' ').toLowerCase().includes(q))
            .sort((a, b) => b.added - a.added);

        shown.forEach((i) => listEl.append(buildItem(i)));

        if (shown.length) emptyEl.textContent = '';
        else if (!items.length) emptyEl.textContent = 'Nothing saved yet. Add a link, file or note above.';
        else emptyEl.textContent = 'No matches.';
    }

    // ---------- add / delete ----------
    async function save(item) {
        await putItem(item);
        items.push(item);
    }

    function removeItem(item) {
        if (!confirm('Delete "' + item.title + '" from your bundle?')) return;
        deleteItem(item.id).then(() => {
            items = items.filter((i) => i.id !== item.id);
            render();
        }).catch(() => showMsg('Could not delete that item.'));
    }

    async function addLink() {
        let raw = urlIn.value.trim();
        if (!raw) return showMsg('Enter a web address.');
        if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = 'https://' + raw;

        let url;
        try { url = new URL(raw); } catch (e) { return showMsg("That doesn't look like a valid link."); }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return showMsg('Only http and https links are supported.');
        }

        await save({
            id: newId(),
            type: 'link',
            title: titleIn.value.trim() || host(url.href),
            url: url.href,
            added: Date.now(),
        });
        resetForm('Link saved.');
    }

    async function addFiles() {
        const files = Array.from(fileIn.files || []);
        if (!files.length) return showMsg('Choose a file first.');

        let saved = 0;
        let tooBig = 0;
        for (const file of files) {
            if (file.size > MAX_FILE_MB * 1024 * 1024) { tooBig++; continue; }

            let blob = file;
            if (!file.type && /\.pdf$/i.test(file.name)) {
                blob = new Blob([file], { type: 'application/pdf' });
            }
            await save({
                id: newId(),
                type: 'file',
                title: (files.length === 1 && titleIn.value.trim()) || file.name,
                name: file.name,
                mime: blob.type,
                size: file.size,
                blob: blob,
                added: Date.now(),
            });
            saved++;
        }

        // ask the browser not to clear saved files when the phone is low on space
        if (saved && !askedPersist && navigator.storage && navigator.storage.persist) {
            askedPersist = true;
            navigator.storage.persist().catch(() => {});
        }

        let message = saved ? saved + (saved === 1 ? ' file saved.' : ' files saved.') : '';
        if (tooBig) message += ' ' + tooBig + ' skipped (over ' + MAX_FILE_MB + ' MB).';
        resetForm(message.trim());
    }

    async function addNote() {
        const text = textIn.value.trim();
        if (!text) return showMsg('Write something first.');

        const firstLine = text.split('\n')[0];
        await save({
            id: newId(),
            type: 'note',
            title: titleIn.value.trim() || (firstLine.length > 40 ? firstLine.slice(0, 37) + '…' : firstLine),
            text: text,
            added: Date.now(),
        });
        resetForm('Note saved.');
    }

    function resetForm(message) {
        titleIn.value = '';
        urlIn.value = '';
        fileIn.value = '';
        textIn.value = '';
        showMsg(message);
        render();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            if (addType === 'link') await addLink();
            else if (addType === 'file') await addFiles();
            else await addNote();
        } catch (err) {
            showMsg('Could not save. Storage may be full or blocked in this browser mode.');
        }
    });

    // ---------- UI wiring ----------
    function setAddType(type) {
        addType = type;
        addTabs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.add === type)));
        fieldBoxes.forEach((box) => (box.hidden = box.dataset.field !== type));
        showMsg('');
    }

    addTabs.forEach((b) => b.addEventListener('click', () => setAddType(b.dataset.add)));

    filterBtns.forEach((b) => b.addEventListener('click', () => {
        filter = b.dataset.bfilter;
        filterBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        render();
    }));

    searchIn.addEventListener('input', () => {
        query = searchIn.value;
        render();
    });

    function setOpen(open) {
        panel.hidden = !open;
        toggleBtn.setAttribute('aria-expanded', String(open));
        localStorage.setItem('bundleOpen', open ? '1' : '0');
    }

    toggleBtn.addEventListener('click', () => setOpen(panel.hidden));

    // ---------- start ----------
    setAddType('link');
    setOpen(localStorage.getItem('bundleOpen') === '1');
    render();

    getAll()
        .then((rows) => {
            items = rows || [];
            render();
        })
        .catch(() => {
            emptyEl.textContent = "Saving isn't available here (private browsing?).";
        });
})();

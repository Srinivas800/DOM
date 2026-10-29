// Focus (Pomodoro) timer with your own custom times
(function () {
    const DEFAULTS = { focus: 25, short: 5, long: 15, custom: 45 }; // minutes
    const LABELS = { focus: 'Focus', short: 'Short break', long: 'Long break', custom: 'Custom' };
    const RING = 2 * Math.PI * 52; // circle length for the progress ring
    const BASE_TITLE = document.title;

    const modeBtns = document.querySelectorAll('.modes button');
    const timeEl = document.getElementById('time');
    const ringEl = document.getElementById('ring');
    const startBtn = document.getElementById('t-start');
    const resetBtn = document.getElementById('t-reset');
    const statusEl = document.getElementById('t-status');
    const sessionsEl = document.getElementById('sessions');
    const fields = {};
    Object.keys(DEFAULTS).forEach((k) => (fields[k] = document.getElementById('set-' + k)));

    // ---------- storage helpers ----------
    function load(key, fallback) {
        try {
            const v = JSON.parse(localStorage.getItem(key));
            return v === null || v === undefined ? fallback : v;
        } catch (e) {
            return fallback;
        }
    }
    function save(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function clampMinutes(value, fallback) {
        const n = Math.round(Number(value));
        if (!n || n < 1) return fallback;
        return Math.min(n, 180);
    }

    // ---------- settings ----------
    const settings = Object.assign({}, DEFAULTS, load('timerSettings', {}));
    Object.keys(DEFAULTS).forEach((k) => {
        settings[k] = clampMinutes(settings[k], DEFAULTS[k]);
    });

    // ---------- sessions completed today ----------
    function dayKey() {
        const d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }
    function getSessions() {
        const s = load('pomodoroSessions', null);
        return s && s.date === dayKey() ? s.count : 0;
    }
    function addSession() {
        const count = getSessions() + 1;
        save('pomodoroSessions', { date: dayKey(), count: count });
        return count;
    }
    function renderSessions() {
        sessionsEl.textContent = '🍅 ' + getSessions() + ' today';
    }

    // ---------- timer state ----------
    let mode = 'focus';
    let remainingMs = settings.focus * 60000;
    let endAt = null; // timestamp when the timer will finish (only while running)
    let timer = null;
    let audioCtx = null;

    function totalMs() {
        return settings[mode] * 60000;
    }
    function isRunning() {
        return endAt !== null;
    }
    function persist() {
        save('timerState', { mode: mode, endAt: endAt, remainingMs: remainingMs });
    }

    function render() {
        const ms = Math.max(0, Math.min(remainingMs, totalMs()));
        const secs = Math.ceil(ms / 1000);
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');

        timeEl.textContent = mm + ':' + ss;
        ringEl.style.strokeDashoffset = RING * (1 - ms / totalMs());
        document.title = isRunning() ? mm + ':' + ss + ' · ' + LABELS[mode] : BASE_TITLE;
        startBtn.textContent = isRunning() ? 'Pause' : (ms < totalMs() ? 'Resume' : 'Start');
        modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    }

    // ---------- alerts (sound, vibration, notification) ----------
    function unlockAudio() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            audioCtx = audioCtx || new AC();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { /* sound is optional */ }
    }

    function beep() {
        if (!audioCtx) return;
        [0, 0.3, 0.6].forEach((delay, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const t = audioCtx.currentTime + delay;
            osc.type = 'sine';
            osc.frequency.value = i === 2 ? 880 : 660;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(t);
            osc.stop(t + 0.25);
        });
    }

    function notify(message) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        if (document.visibilityState === 'visible') return; // already looking at the app
        const options = { body: message, icon: 'icon-192.png' };
        const fallback = () => {
            try { new Notification('My Todo List', options); } catch (e) { /* ignore */ }
        };
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready
                .then((reg) => reg.showNotification('My Todo List', options))
                .catch(fallback);
        } else {
            fallback();
        }
    }

    function alertUser(message) {
        beep();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        notify(message);
    }

    // ---------- controls ----------
    function update() {
        remainingMs = endAt - Date.now();
        if (remainingMs <= 0) {
            complete(false);
            return;
        }
        render();
    }

    function start() {
        if (isRunning()) return;
        unlockAudio();
        try {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        } catch (e) { /* ignore */ }

        endAt = Date.now() + remainingMs;
        timer = setInterval(update, 250);
        statusEl.textContent = LABELS[mode] + ' in progress.';
        persist();
        render();
    }

    function pause() {
        if (!isRunning()) return;
        remainingMs = endAt - Date.now();
        endAt = null;
        clearInterval(timer);
        timer = null;
        statusEl.textContent = 'Paused.';
        persist();
        render();
    }

    function setMode(m, message) {
        clearInterval(timer);
        timer = null;
        endAt = null;
        mode = m;
        remainingMs = settings[m] * 60000;
        statusEl.textContent = message || '';
        persist();
        render();
    }

    function complete(silent) {
        clearInterval(timer);
        timer = null;
        endAt = null;

        const finished = mode;
        let next = 'focus';
        let message;

        if (finished === 'focus') {
            const n = addSession();
            renderSessions();
            next = n % 4 === 0 ? 'long' : 'short'; // long break after every 4th focus
            message = 'Focus session done! Time for a ' + (next === 'long' ? 'long' : 'short') + ' break.';
        } else if (finished === 'custom') {
            next = 'custom';
            message = 'Your timer is done!';
        } else {
            message = 'Break over. Ready to focus?';
        }

        if (silent) message = 'Your timer finished while you were away.';
        setMode(next, message);
        if (!silent) alertUser(message);
    }

    startBtn.addEventListener('click', () => (isRunning() ? pause() : start()));
    resetBtn.addEventListener('click', () => setMode(mode));
    modeBtns.forEach((btn) => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

    // ---------- custom times ----------
    Object.keys(fields).forEach((k) => {
        fields[k].value = settings[k];
        fields[k].addEventListener('change', () => {
            settings[k] = clampMinutes(fields[k].value, settings[k]);
            fields[k].value = settings[k];
            save('timerSettings', settings);
            // apply right away unless that timer is currently running
            if (k === mode && !isRunning()) {
                remainingMs = settings[k] * 60000;
                persist();
                render();
            }
        });
    });

    // browsers only allow sound after a tap, so unlock it on the first one
    document.addEventListener('pointerdown', unlockAudio, { once: true });

    // ---------- restore after refresh / reopening the app ----------
    ringEl.style.strokeDasharray = RING;
    const saved = load('timerState', null);
    if (saved && settings[saved.mode]) {
        mode = saved.mode;
        remainingMs = settings[mode] * 60000;

        if (saved.endAt) {
            if (saved.endAt > Date.now()) {
                remainingMs = saved.endAt - Date.now();
                endAt = saved.endAt;
                timer = setInterval(update, 250);
                statusEl.textContent = LABELS[mode] + ' in progress.';
            } else {
                complete(true);
            }
        } else if (typeof saved.remainingMs === 'number') {
            remainingMs = Math.min(saved.remainingMs, remainingMs);
        }
    }

    renderSessions();
    render();
})();

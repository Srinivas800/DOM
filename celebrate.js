// Celebration: when every task is checked, the whole page is replaced by a
// 5-second full-screen animation (fireworks, confetti and a happy tomato).
(function () {
    const DURATION = 5000; // how long the celebration lasts (ms)
    const FADE = 500;      // fade-out time at the very end (ms)

    const list = document.getElementById('tasklist');
    if (!list) return;

    let running = false;

    // The checkbox change bubbles up to the list AFTER DOM4.js has saved the task,
    // so reading the saved tasks here always gives the up-to-date answer.
    list.addEventListener('change', (e) => {
        const box = e.target;
        if (!box.matches || !box.matches('input[type="checkbox"]') || !box.checked) return;

        let tasks = [];
        try {
            tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        } catch (err) {
            return;
        }
        if (tasks.length > 0 && tasks.every((t) => t.done)) celebrate();
    });

    function celebrate() {
        if (running) return;
        running = true;

        const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

        const overlay = document.createElement('div');
        overlay.className = 'celebrate';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'All tasks completed');
        overlay.style.setProperty('--dur', DURATION + 'ms');
        overlay.innerHTML =
            '<canvas class="cele-canvas"></canvas>' +
            '<div class="cele-center">' +
                '<div class="cele-stage">' +
                    '<span class="cele-glow"></span>' +
                    '<span class="cele-ring"></span>' +
                    '<span class="cele-ring two"></span>' +
                    '<img class="cele-tomato" src="icon-512.png" alt="">' +
                '</div>' +
                '<h2 class="cele-title">All tasks done!</h2>' +
                '<p class="cele-sub"></p>' +
            '</div>' +
            '<div class="cele-bar"><span></span></div>' +
            '<p class="cele-skip">Tap anywhere to continue</p>';

        // USER_NAME comes from DOM4.js (the name used in the greeting)
        const name = typeof USER_NAME === 'string' ? USER_NAME : '';
        overlay.querySelector('.cele-sub').textContent =
            (name ? 'Great job, ' + name + '! ' : 'Great job! ') + 'Everything on your list is done.';

        document.body.append(overlay);
        document.body.classList.add('celebrating');

        const stopAnimation = reduceMotion ? () => {} : fireworks(overlay.querySelector('.cele-canvas'));

        let closed = false;
        let timer = null;

        function onKey(e) {
            if (e.key === 'Escape') close();
        }

        function close() {
            if (closed) return;
            closed = true;
            clearTimeout(timer);
            document.removeEventListener('keydown', onKey);
            overlay.classList.add('leaving');
            setTimeout(() => {
                stopAnimation();
                overlay.remove();
                document.body.classList.remove('celebrating');
                running = false;
            }, FADE);
        }

        timer = setTimeout(close, DURATION - FADE);
        overlay.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
    }

    // ---------- fireworks + falling confetti on a canvas ----------
    function fireworks(canvas) {
        const ctx = canvas.getContext && canvas.getContext('2d');
        if (!ctx) return () => {};

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = window.innerWidth;
        const H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const colors = ['#ff5d8f', '#ffb454', '#3a5bff', '#2ec4b6', '#9b5de5', '#ff6b4a', '#ffffff'];
        const pick = () => colors[Math.floor(Math.random() * colors.length)];

        const sparks = [];
        const bits = [];
        let start = null;
        let last = null;
        let nextBurst = 300;
        let raf = 0;
        let stopped = false;

        function burst(x, y) {
            const color = pick();
            const n = 55;
            for (let i = 0; i < n; i++) {
                const angle = (Math.PI * 2 * i) / n + Math.random() * 0.2;
                const speed = 2 + Math.random() * 4.5;
                sparks.push({
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    decay: 0.012 + Math.random() * 0.012,
                    size: 2 + Math.random() * 2,
                    color: color,
                });
            }
        }

        function spawnBit() {
            bits.push({
                x: Math.random() * W,
                y: -12,
                vy: 1.5 + Math.random() * 2.5,
                sway: Math.random() * Math.PI * 2,
                swaySpeed: 0.03 + Math.random() * 0.04,
                rot: Math.random() * 6,
                vrot: (Math.random() - 0.5) * 0.25,
                size: 6 + Math.random() * 6,
                color: pick(),
            });
        }

        function frame(now) {
            if (stopped) return;
            if (start === null) { start = now; last = now; }

            const elapsed = now - start;
            const k = Math.min(Math.max((now - last) / 16.67, 0), 3); // 1 = one frame at 60fps
            last = now;

            ctx.clearRect(0, 0, W, H);

            // new firework every ~half second, and confetti, until the last second
            if (elapsed < DURATION - 1000 && elapsed >= nextBurst) {
                burst(W * (0.15 + Math.random() * 0.7), H * (0.12 + Math.random() * 0.45));
                nextBurst = elapsed + 350 + Math.random() * 300;
            }
            if (elapsed < DURATION - 1200) {
                for (let i = 0; i < 2; i++) if (Math.random() < 0.7) spawnBit();
            }

            for (let i = sparks.length - 1; i >= 0; i--) {
                const s = sparks[i];
                s.x += s.vx * k;
                s.y += s.vy * k;
                s.vy += 0.07 * k;
                s.vx *= 0.992;
                s.life -= s.decay * k;
                if (s.life <= 0) { sparks.splice(i, 1); continue; }
                ctx.globalAlpha = s.life;
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            for (let i = bits.length - 1; i >= 0; i--) {
                const b = bits[i];
                b.y += b.vy * k;
                b.sway += b.swaySpeed * k;
                b.x += Math.sin(b.sway) * 1.2 * k;
                b.rot += b.vrot * k;
                if (b.y > H + 20) { bits.splice(i, 1); continue; }
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.rot);
                ctx.fillStyle = b.color;
                ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size * 0.6);
                ctx.restore();
            }

            raf = requestAnimationFrame(frame);
        }

        raf = requestAnimationFrame(frame);
        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
        };
    }
})();

// Feedback pop-up: rating + message, sent to you through Netlify Forms.
(function () {
    const openBtn = document.getElementById('feedback-open');
    const dialog = document.getElementById('feedback-dialog');
    if (!openBtn || !dialog) return;

    const form = document.getElementById('feedback-form');
    const thanks = document.getElementById('fb-thanks');
    const closeBtn = document.getElementById('fb-close');
    const doneBtn = document.getElementById('fb-done');
    const sendBtn = document.getElementById('fb-send');
    const msgEl = document.getElementById('fb-msg');

    function showMsg(text, isError) {
        msgEl.textContent = text;
        msgEl.classList.toggle('error', !!isError);
    }

    // Netlify only receives forms on the real (deployed) site
    function isLiveSite() {
        return /^https?:$/.test(location.protocol) &&
            !/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|\[::1\])/.test(location.hostname);
    }

    openBtn.addEventListener('click', () => {
        dialog.showModal();
        const message = form.elements.message;
        if (message) message.focus();
    });

    closeBtn.addEventListener('click', () => dialog.close());
    doneBtn.addEventListener('click', () => dialog.close());

    // click on the dark area outside the box closes it
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });

    // start fresh every time it closes
    dialog.addEventListener('close', () => {
        form.reset();
        form.hidden = false;
        thanks.hidden = true;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send feedback';
        showMsg('');
    });

    function showThanks() {
        form.hidden = true;
        thanks.hidden = false;
        setTimeout(() => {
            if (dialog.open) dialog.close();
        }, 3500);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = form.elements.message.value.trim();
        if (!message) {
            showMsg('Please write a short message.', true);
            return;
        }

        // a bot filled the hidden trap field: pretend it worked, send nothing
        if (form.elements['bot-field'] && form.elements['bot-field'].value) {
            showThanks();
            return;
        }

        if (!isLiveSite()) {
            showMsg('Feedback can only be sent from the live site, not from your computer.', true);
            return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending…';
        showMsg('');

        try {
            const body = new URLSearchParams(new FormData(form)).toString();
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body,
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            showThanks();
        } catch (err) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send feedback';
            showMsg("Couldn't send it. Check your internet and try again.", true);
        }
    });
})();

(() => {
    let lastSelection = '';

    async function getTheme() {
        try {
            const { theme = 'light' } = await chrome.storage.sync.get(['theme']);
            return theme === 'dark' ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    }

    async function isEnabledForSite() {
        if (!chrome.storage || !chrome.storage.sync) return false;
        try {
            const { enabledSites = {} } = await chrome.storage.sync.get(['enabledSites']);
            return enabledSites[location.hostname] === true;
        } catch {
            return false;
        }
    }

    document.addEventListener('mouseup', async e => {
        if (!(await isEnabledForSite())) return;
        handleSelection(e.pageX, e.pageY, window.getSelection().toString());
    });

    chrome.runtime.onMessage.addListener(async (msg) => {
        if (msg.type !== 'GPT_CONTEXT_SEARCH') return;
        if (!(await isEnabledForSite())) return;
        const sel = msg.selection;
        handleSelection(null, null, sel);
    });

    async function handleSelection(pageX, pageY, raw) {
        const selection = raw.trim();
        if (!selection || selection === lastSelection) return;
        lastSelection = selection;

        let apiKey, model, maxTokens;
        try {
            ({ apiKey, model, maxTokens } = await chrome.storage.sync.get(['apiKey', 'model', 'maxTokens']));
        } catch {
            showPopup(pageX, pageY, 'Failed to load API key.');
            return;
        }
        if (!apiKey) {
            showPopup(pageX, pageY, 'OpenAI API key not set. Click extension icon to set it.');
            return;
        }

        const url = 'https://api.openai.com/v1/chat/completions';
        const payload = {
            model: model || 'o4-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are helping user to pass an exam. Your answer to the question should be short and clear.'
                },
                {
                    role: 'user',
                    content: selection
                }
            ],
            max_completion_tokens: Math.max(100, Math.min(2500, maxTokens || 256)),
        };

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const text = data.choices?.[0]?.message?.content || 'No response';
            showPopup(pageX, pageY, text);
        } catch (err) {
            console.error('OpenAI request failed:', err);
            showPopup(pageX, pageY, 'OpenAI request failed: ' + (err.message || err));
        }
    }

    async function showPopup(pageX, pageY, text) {
        removePopup();
        const popup = document.createElement('div');
        const randomId = Math.random().toString(36).substring(2, 15);
        popup.id = 'ollama-popup-' + randomId;
        popup.className = 'ollama-popup';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'ollama-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = 'Close';
        closeBtn.onclick = e => {
            e.stopPropagation();
            animateRemovePopup(randomId);
        };
        popup.appendChild(closeBtn);

        const formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\`(.*?)`/g, '<code>$1</code>');
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = formatted;
        popup.appendChild(contentDiv);

        if (pageX == null && pageY == null) {
            popup.style.bottom = '18px';
            popup.style.left = '18px';
        } else {
            popup.style.top = `${pageY + 12}px`;
            popup.style.left = `${pageX + 12}px`;
        }

        const theme = await getTheme();
        if (theme === 'light') popup.classList.add('light');

        setTimeout(() => popup.classList.add('show'), 10);

        popup.addEventListener('click', () => animateRemovePopup(randomId));
        document.body.appendChild(popup);
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => removePopup(randomId), 220);
        }, 15000);
    }

    function animateRemovePopup(id) {
        const popup = document.getElementById('ollama-popup-' + id);
        if (popup && popup.classList.contains('show')) {
            popup.classList.remove('show');
            setTimeout(() => removePopup(id), 220);
        } else {
            removePopup(id);
        }
    }

    function removePopup(id) {
        if (!id) {
            document.querySelectorAll('[id^="ollama-popup-"]').forEach(el => el.remove());
        } else {
            const old = document.getElementById('ollama-popup-' + id);
            if (old) old.remove();
        }
    }
})();

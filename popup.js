document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const enableSiteInput = document.getElementById('enableSite');
    const status = document.getElementById('status');
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    const themeIcon = document.getElementById('themeIcon');
    const modelSelect = document.getElementById('modelSelect');
    const maxTokensInput = document.getElementById('maxTokens');

    try {
        const { theme = 'light' } = await chrome.storage.sync.get(['theme']);
        setTheme(theme);
        updateThemeIcon(theme);
        themeLabel.textContent = theme === 'dark' ? 'Dark' : 'Light';

        themeToggleBtn.addEventListener('click', async () => {
            const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
            setTheme(newTheme);
            updateThemeIcon(newTheme);
            themeLabel.textContent = newTheme === 'dark' ? 'Dark' : 'Light';
            try {
                await chrome.storage.sync.set({ theme: newTheme });
            } catch (err) {
                status.textContent = 'Theme save failed!';
            }
        });

        function setTheme(theme) {
            document.body.classList.toggle('dark', theme === 'dark');
            const popup = document.querySelector('.popup-container');
            if (popup) popup.classList.toggle('dark', theme === 'dark');
        }

        function updateThemeIcon(theme) {
            themeIcon.innerHTML = theme === 'dark'
                ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15.5 13.5A7 7 0 0 1 6.5 4.5a7 7 0 1 0 9 9z" fill="#f5f6fa"/>
                   </svg>`
                : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="5" fill="#f5f6fa"/>
                    <g stroke="#f5f6fa" stroke-width="2">
                        <line x1="10" y1="1" x2="10" y2="4"/>
                        <line x1="10" y1="16" x2="10" y2="19"/>
                        <line x1="1" y1="10" x2="4" y2="10"/>
                        <line x1="16" y1="10" x2="19" y2="10"/>
                        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>
                        <line x1="13.66" y1="13.66" x2="15.78" y2="15.78"/>
                        <line x1="4.22" y1="15.78" x2="6.34" y2="13.66"/>
                        <line x1="13.66" y1="6.34" x2="15.78" y2="4.22"/>
                    </g>
                   </svg>`;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let hostname = '';
        try {
            hostname = new URL(tab.url).hostname;
        } catch {
            hostname = '';
        }

        const { apiKey = '', enabledSites = {}, model = 'o4-mini', maxTokens = 256 } = await chrome.storage.sync.get(['apiKey', 'enabledSites', 'model', 'maxTokens']);
        apiKeyInput.value = apiKey;
        enableSiteInput.checked = !!enabledSites[hostname];
        modelSelect.value = model || 'o4-mini';
        maxTokensInput.value = maxTokens || 256;

        document.getElementById('save').addEventListener('click', async () => {
            const newApiKey = apiKeyInput.value.trim();
            const newEnabledSites = { ...enabledSites, [hostname]: enableSiteInput.checked };
            const newModel = modelSelect.value;
            let newMaxTokens = parseInt(maxTokensInput.value, 10);
            if (isNaN(newMaxTokens)) newMaxTokens = 256;
            newMaxTokens = Math.max(100, Math.min(2500, newMaxTokens));
            maxTokensInput.value = newMaxTokens; // update UI if clamped
            try {
                await chrome.storage.sync.set({
                    apiKey: newApiKey,
                    enabledSites: newEnabledSites,
                    model: newModel,
                    maxTokens: newMaxTokens
                });
                status.textContent = 'Saved!';
            } catch (err) {
                status.textContent = 'Save failed!';
            }
            setTimeout(() => (status.textContent = ''), 2000);
        });
    } catch (err) {
        status.textContent = 'Failed to load settings!';
    }
});

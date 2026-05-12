const ext = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const enableSiteInput = document.getElementById('enableSite');
    const status = document.getElementById('status');
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    const themeIcon = document.getElementById('themeIcon');
    const modelSelect = document.getElementById('modelSelect');
    const modelLabel = document.getElementById('modelLabel');
    const modelStatus = document.getElementById('modelStatus');
    const clearModelCacheBtn = document.getElementById('clearModelCache');
    const maxTokensInput = document.getElementById('maxTokens');
    const MODEL_CACHE_KEY = 'modelCache';
    const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
    let modelLoadTimer = null;

    try {
        const { theme = 'light' } = await ext.storage.sync.get(['theme']);
        setTheme(theme);
        updateThemeIcon(theme);
        themeLabel.textContent = theme === 'dark' ? 'Dark' : 'Light';

        themeToggleBtn.addEventListener('click', async () => {
            const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
            setTheme(newTheme);
            updateThemeIcon(newTheme);
            themeLabel.textContent = newTheme === 'dark' ? 'Dark' : 'Light';
            try {
                await ext.storage.sync.set({ theme: newTheme });
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
                ? `<svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
                    <path d='M15.5 13.5A7 7 0 0 1 6.5 4.5a7 7 0 1 0 9 9z' fill='#f5f6fa'/>
                   </svg>`
                : `<svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
                    <circle cx='10' cy='10' r='5' fill='#f5f6fa'/>
                    <g stroke='#f5f6fa' stroke-width='2'>
                        <line x1='10' y1='1' x2='10' y2='4'/>
                        <line x1='10' y1='16' x2='10' y2='19'/>
                        <line x1='1' y1='10' x2='4' y2='10'/>
                        <line x1='16' y1='10' x2='19' y2='10'/>
                        <line x1='4.22' y1='4.22' x2='6.34' y2='6.34'/>
                        <line x1='13.66' y1='13.66' x2='15.78' y2='15.78'/>
                        <line x1='4.22' y1='15.78' x2='6.34' y2='13.66'/>
                        <line x1='13.66' y1='6.34' x2='15.78' y2='4.22'/>
                    </g>
                   </svg>`;
        }

        const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
        let hostname = '';
        try {
            hostname = new URL(tab.url).hostname;
        } catch {
            hostname = '';
        }

        const { apiKey = '', enabledSites = {}, model = '', maxTokens = 256 } = await ext.storage.sync.get(['apiKey', 'enabledSites', 'model', 'maxTokens']);
        apiKeyInput.value = apiKey;
        enableSiteInput.checked = !!enabledSites[hostname];
        maxTokensInput.value = maxTokens || 256;

        await loadModelsForKey(apiKey, model);

        apiKeyInput.addEventListener('input', () => {
            if (modelLoadTimer) clearTimeout(modelLoadTimer);
            modelLoadTimer = setTimeout(() => {
                loadModelsForKey(apiKeyInput.value.trim(), modelSelect.value);
            }, 400);
        });

        clearModelCacheBtn.addEventListener('click', async () => {
            try {
                await ext.storage.local.remove(MODEL_CACHE_KEY);
                setModelStatus('Model cache cleared. Reloading...');
                await loadModelsForKey(apiKeyInput.value.trim(), modelSelect.value);
            } catch (err) {
                console.error('Failed to clear model cache:', err);
                setModelStatus('Failed to clear cache.');
            }
        });

        document.getElementById('save').addEventListener('click', async () => {
            const newApiKey = apiKeyInput.value.trim();
            const newEnabledSites = { ...enabledSites, [hostname]: enableSiteInput.checked };
            const newModel = modelSelect.value;
            let newMaxTokens = parseInt(maxTokensInput.value, 10);
            if (isNaN(newMaxTokens)) newMaxTokens = 256;
            newMaxTokens = Math.max(100, Math.min(2500, newMaxTokens));
            maxTokensInput.value = newMaxTokens; // update UI if clamped
            try {
                await ext.storage.sync.set({
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

    function setModelStatus(message, isLoading = false) {
        modelStatus.textContent = message || '';
        modelStatus.classList.toggle('loading', !!isLoading);
    }

    function showModelPicker(show) {
        modelLabel.style.display = show ? 'flex' : 'none';
    }

    function clearModelOptions() {
        modelSelect.innerHTML = '';
    }

    function renderModelOptions(models, preferredModel) {
        clearModelOptions();
        for (const modelId of models) {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelId;
            modelSelect.appendChild(option);
        }

        const hasPreferred = preferredModel && models.includes(preferredModel);
        modelSelect.value = hasPreferred ? preferredModel : models[0] || '';
        modelSelect.disabled = models.length === 0;
    }

    function filterTextModels(models) {
        const blockedFragments = ['realtime', 'audio', 'speech', 'whisper', 'dall-e', 'vision', 'image', 'embedding', 'moderation', 'transcribe', 'tts'];
        return models.filter((model) => {
            const id = model.id || '';
            const lowerId = id.toLowerCase();
            if (!(id.startsWith('gpt-') || /^o\d/.test(id))) return false;
            return !blockedFragments.some(fragment => lowerId.includes(fragment));
        });
    }

    async function getKeyHash(apiKey) {
        const data = new TextEncoder().encode(apiKey);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const bytes = Array.from(new Uint8Array(digest));
        const base64 = btoa(String.fromCharCode(...bytes));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    async function getCachedModels(apiKey) {
        const keyHash = await getKeyHash(apiKey);
        const { modelCache = {} } = await ext.storage.local.get([MODEL_CACHE_KEY]);
        const entry = modelCache[keyHash];
        if (!entry) return null;
        if (Date.now() - entry.fetchedAt > MODEL_CACHE_TTL_MS) return null;
        return entry.models || null;
    }

    async function setCachedModels(apiKey, models) {
        const keyHash = await getKeyHash(apiKey);
        const { modelCache = {} } = await ext.storage.local.get([MODEL_CACHE_KEY]);
        modelCache[keyHash] = {
            fetchedAt: Date.now(),
            models
        };
        await ext.storage.local.set({ modelCache });
    }

    async function loadModelsForKey(apiKey, preferredModel) {
        if (!apiKey) {
            showModelPicker(false);
            clearModelOptions();
            modelSelect.disabled = true;
            setModelStatus('Set your OpenAI API key to load models.');
            return;
        }

        showModelPicker(true);
        modelSelect.disabled = true;
        setModelStatus('Loading models...', true);

        try {
            const cachedModels = await getCachedModels(apiKey);
            if (cachedModels && cachedModels.length) {
                renderModelOptions(cachedModels, preferredModel);
                setModelStatus('');
                return;
            }

            const resp = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }

            const data = await resp.json();
            const models = filterTextModels(data.data || [])
                .map(model => model.id)
                .filter(Boolean)
                .sort((a, b) => {
                    const getVersion = (id) => {
                        const match = id.match(/(\d+(?:\.\d+)?)/);
                        return match ? parseFloat(match[1]) : -1;
                    };
                    const versionDiff = getVersion(b) - getVersion(a);
                    if (versionDiff !== 0) return versionDiff;
                    return a.localeCompare(b);
                });

            if (!models.length) {
                clearModelOptions();
                modelSelect.disabled = true;
                setModelStatus('No text models available for this key.');
                return;
            }

            await setCachedModels(apiKey, models);
            renderModelOptions(models, preferredModel);
            setModelStatus('');
        } catch (err) {
            console.error('Failed to load models:', err);
            clearModelOptions();
            modelSelect.disabled = true;
            setModelStatus('Failed to load models. Check your API key and network.');
        }
    }
});

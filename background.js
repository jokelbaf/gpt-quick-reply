chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
        id: "gpt-search-selection",
        title: "Answer with GPT",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== "gpt-search-selection" || !tab?.id) return;
    const selection = info.selectionText?.trim();
    if (!selection) return;

    try {
        const url = new URL(tab.url || '');
        const { enabledSites = {} } = await chrome.storage.sync.get(['enabledSites']);
        if (!enabledSites[url.hostname]) return;
        chrome.tabs.sendMessage(tab.id, {
            type: "GPT_CONTEXT_SEARCH",
            selection
        });
    } catch (err) {
        // Ignore invalid URL or storage errors
    }
});
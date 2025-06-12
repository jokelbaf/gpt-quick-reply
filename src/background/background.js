const ext = typeof browser !== 'undefined' ? browser : chrome;

ext.contextMenus.removeAll(() => {
    ext.contextMenus.create({
        id: 'gpt-search-selection',
        title: 'Answer with GPT',
        contexts: ['selection']
    });
});

ext.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'gpt-search-selection' || !tab?.id) return;
    const selection = info.selectionText?.trim();
    if (!selection) return;

    try {
        const url = new URL(tab.url || '');
        const { enabledSites = {} } = await ext.storage.sync.get(['enabledSites']);
        if (!enabledSites[url.hostname]) return;
        ext.tabs.sendMessage(tab.id, {
            type: 'GPT_CONTEXT_SEARCH',
            selection
        });
    } catch (err) {
        // Ignore invalid URL or storage errors
    }
});

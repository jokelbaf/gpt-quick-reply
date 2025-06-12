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

    // Always send the message, regardless of enabledSites
    ext.tabs.sendMessage(tab.id, {
        type: 'GPT_CONTEXT_SEARCH',
        selection
    });
});

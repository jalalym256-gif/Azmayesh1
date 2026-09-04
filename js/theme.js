// ========== THEME MANAGEMENT ==========

// applyTheme بدون notification — فقط برای لود اولیه
function applyTheme(theme) {
    document.body.classList.remove('dark-mode', 'light-mode', 'vivid-mode');
    document.body.classList.add(`${theme}-mode`);
    currentTheme = theme;
}

function toggleDarkMode() {
    applyTheme('dark');
    if (dbManager) dbManager.saveSettings('theme', 'dark');
    if (isInitialized) showNotification('حالت تاریک فعال شد', 'success');
}

function toggleLightMode() {
    applyTheme('light');
    if (dbManager) dbManager.saveSettings('theme', 'light');
    if (isInitialized) showNotification('حالت روشن فعال شد', 'success');
}

function toggleVividMode() {
    applyTheme('vivid');
    if (dbManager) dbManager.saveSettings('theme', 'vivid');
    if (isInitialized) showNotification('حالت ویوید فعال شد', 'success');
}

window.applyTheme      = applyTheme;
window.toggleDarkMode  = toggleDarkMode;
window.toggleLightMode = toggleLightMode;
window.toggleVividMode = toggleVividMode;
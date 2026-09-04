// ========== MAIN APP INITIALIZATION ==========
async function initializeApp() {
    try {
        showLoading('در حال راه‌اندازی سیستم ALFAJR...');
        
        if (!window.indexedDB) {
            throw new Error('مرورگر شما از IndexedDB پشتیبانی نمی‌کند. لطفاً از Chrome یا Firefox استفاده کنید.');
        }
        
        dbManager = new DatabaseManager();

        // timeout برای اینکه اگه DB بیشتر از ۱۰ ثانیه طول کشید خطا بده
        const initTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('اتصال به دیتابیس timeout شد. لطفاً صفحه را رفرش کنید.')), 10000)
        );

        await Promise.race([dbManager.init(), initTimeout]);
        
        dbManager.onUpdate((type, data) => {
            switch (type) {
                case 'customer_saved':
                case 'customer_deleted':
                case 'data_cleared':
                    updateStats();
                    break;
            }
        });
        
        // یک‌بار مشتری‌های قدیمی (با کد تصادفی) رو به سریال پیوسته ۰۰۰۰۱، ۰۰۰۰۲... تبدیل کن
        try {
            await dbManager.migrateSerialIds();
        } catch (e) {
            console.warn('مهاجرت سریال انجام نشد:', e);
        }

        await loadCustomers();
        await loadSettings();
        
        const savedTheme = await dbManager.getSettings('theme') || 'dark';
        applyTheme(savedTheme);
        
        setupEventListeners();
        
        hideLoading();
        showNotification('سیستم ALFAJR با موفقیت راه‌اندازی شد', 'success');
        isInitialized = true;
        
    } catch (error) {
        hideLoading();
        console.error('❌ خطا در راه‌اندازی:', error);

        // وضعیت دیتابیس رو خطا نشون بده
        const statusEl = document.getElementById('dbStatus');
        if (statusEl) {
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>خطا در اتصال</span>';
            statusEl.className = 'db-status disconnected';
        }

        showNotification('خطا: ' + error.message, 'error');
        
        const listElement = document.getElementById('customerList');
        if (listElement) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color:#dc3545"></i>
                    <h3>خطا در راه‌اندازی دیتابیس</h3>
                    <p>${escapeHtml(error.message)}</p>
                    <p style="font-size:0.9rem;opacity:0.7;">اگه از GitHub Pages استفاده میکنی، یه بار <strong>Ctrl+Shift+R</strong> بزن</p>
                    <button class="btn-primary" onclick="location.reload()" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> رفرش صفحه
                    </button>
                </div>
            `;
        }
    }
}

async function loadSettings() {
    try {
        const autoSave = await dbManager.getSettings('autoSave');
        if (autoSave === null) {
            await dbManager.saveSettings('autoSave', true);
        }

        // لود currency از settings
        const savedCurrency = await dbManager.getSettings('currency');
        currentCurrency = savedCurrency || AppConfig.DEFAULT_SETTINGS.currency;
        updateCurrencyUI();

        // راه‌اندازی auto-backup
        startAutoBackup();
    } catch (error) {}
}

// ========== AUTO-BACKUP ==========
function startAutoBackup() {
    const intervalHours = AppConfig.DEFAULT_SETTINGS.backupInterval;
    const intervalMs = intervalHours * 60 * 60 * 1000;

    setInterval(async () => {
        try {
            const lastBackupStr = localStorage.getItem('alfajr_last_backup');
            const lastBackup = lastBackupStr ? new Date(lastBackupStr) : null;
            const now = new Date();

            // اگه از آخرین backup به اندازه کافی گذشته بود
            if (!lastBackup || (now - lastBackup) >= intervalMs) {
                await dbManager.createBackup();
                localStorage.setItem('alfajr_last_backup', now.toISOString());
                console.log('✅ Auto-backup انجام شد:', now.toLocaleString('fa-IR'));
            }
        } catch (error) {
            console.warn('⚠️ Auto-backup ناموفق:', error.message);
        }
    }, 60 * 60 * 1000); // هر یک ساعت چک می‌کنه

    // یه‌بار موقع لود هم چک کن
    (async () => {
        try {
            const lastBackupStr = localStorage.getItem('alfajr_last_backup');
            const lastBackup = lastBackupStr ? new Date(lastBackupStr) : null;
            const now = new Date();
            if (!lastBackup || (now - lastBackup) >= intervalMs) {
                await dbManager.createBackup();
                localStorage.setItem('alfajr_last_backup', now.toISOString());
            }
        } catch (error) {}
    })();
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = debounce(searchCustomer, 500);
        searchInput.addEventListener('input', debouncedSearch);
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchCustomer();
        });
    }
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', loadDataFromFile);
    }
    
    const notesTextarea = document.getElementById('customerNotes');
    if (notesTextarea) {
        notesTextarea.addEventListener('input', updateNotes);
    }
    
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (currentCustomerIndex !== null) {
                saveCustomer();
                showNotification('تغییرات ذخیره شد', 'success');
            }
        }
        
        if (e.key === 'Escape') {
            // بستن modal اگه باز بود
            const modal = document.getElementById('addCustomerModal');
            if (modal && modal.style.display !== 'none') {
                closeAddCustomerModal();
                return;
            }
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.style.display !== 'none') {
                backHome();
            }
        }

        // Enter داخل modal = ثبت مشتری
        if (e.key === 'Enter') {
            const modal = document.getElementById('addCustomerModal');
            if (modal && modal.style.display !== 'none') {
                submitAddCustomer();
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            addCustomer();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            if (currentCustomerIndex !== null) {
                printFullTable();
            }
        }
        
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            window.scrollBy({
                top: e.key === 'ArrowDown' ? 100 : -100,
                behavior: 'smooth'
            });
        }
    });
    // توجه: لیستنر «بستن dropdown تنظیمات با کلیک بیرون» در index.html ثبت شده
    // (چون باید حتی قبل از راه‌اندازی کامل دیتابیس هم فعال باشه) — این‌جا تکرار نمی‌شه
}

// ========== STATISTICS ==========
async function updateStats() {
    try {
        const totalCustomers = customers.length;
        const totalOrders = customers.reduce((sum, customer) => sum + (customer.orders ? customer.orders.length : 0), 0);
        const paidCustomers = customers.filter(c => c.paymentReceived).length;
        
        document.getElementById('totalCustomers').textContent = totalCustomers;
        document.getElementById('activeOrders').textContent = totalOrders;
        document.getElementById('paidCustomers').textContent = paidCustomers;
        
    } catch (error) {}
}

// ========== DATA MANAGEMENT ==========
async function saveDataToFile() {
    try {
        showLoading('در حال آماده‌سازی داده‌ها...');
        
        const backupData = await dbManager.createBackup();
        
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
        link.download = `alfajr-backup-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        hideLoading();
        showNotification(`پشتیبان با موفقیت ذخیره شد`, 'success');
    } catch (error) {
        hideLoading();
        showNotification('خطا در ذخیره فایل: ' + error.message, 'error');
    }
}

function loadDataFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('آیا از وارد کردن داده‌های جدید مطمئن هستید؟\nاین عمل ممکن است داده‌های فعلی را بازنویسی کند.')) {
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            showLoading('در حال وارد کردن داده‌ها...');
            const backupData = JSON.parse(e.target.result);
            
            if (!backupData || !backupData.customers || !Array.isArray(backupData.customers)) {
                throw new Error('فرمت فایل نامعتبر است');
            }
            
            await dbManager.clearAllData();
            
            let importedCount = 0;
            
            for (const customerData of backupData.customers) {
                try {
                    if (customerData.deleted) continue;
                    const customer = Customer.fromObject(customerData);
                    await dbManager.saveCustomer(customer);
                    importedCount++;
                } catch (error) {}
            }
            
            await loadCustomers();
            
            hideLoading();
            showNotification(`${importedCount} مشتری با موفقیت وارد شد`, 'success');
            
            event.target.value = '';
        } catch (error) {
            hideLoading();
            showNotification('خطا در وارد کردن داده‌ها: ' + error.message, 'error');
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

async function clearAllData() {
    if (!confirm('⚠️ ⚠️ ⚠️\n\nآیا از پاک‌سازی تمام داده‌ها مطمئن هستید؟\n\nاین عمل قابل بازگشت نیست و تمام مشتریان، سفارشات و تنظیمات پاک خواهند شد.')) return;
    
    if (!confirm('❌ ❌ ❌\n\nآخرین هشدار!\n\nتمام اطلاعات شما حذف خواهد شد. برای ادامه مجدداً تأیید کنید.')) return;
    
    try {
        showLoading('در حال پاک‌سازی کامل دیتابیس...');
        await dbManager.clearAllData();
        customers = [];
        currentCustomerIndex = null;
        await loadCustomers();
        backHome();
        hideLoading();
        showNotification('تمامی داده‌ها با موفقیت پاک شدند', 'success');
    } catch (error) {
        hideLoading();
        showNotification('خطا در پاک‌سازی: ' + error.message, 'error');
    }
}

// ========== CURRENCY MANAGEMENT ==========
async function setCurrency(currency) {
    currentCurrency = currency;
    await dbManager.saveSettings('currency', currency);

    // آپدیت UI دکمه‌های انتخاب
    document.querySelectorAll('.currency-option').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.trim() === currency);
    });

    showNotification(`واحد پول به "${currency}" تغییر کرد`, 'success');

    // اگه توی پروفایل هستیم، قیمت رو re-render کن
    if (currentCustomerIndex !== null) {
        renderPriceDelivery();
    }
}

function updateCurrencyUI() {
    document.querySelectorAll('.currency-option').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.trim() === currentCurrency);
    });
}

// ========== GLOBAL EXPORTS ==========
window.addCustomer            = addCustomer;
window.closeAddCustomerModal  = closeAddCustomerModal;
window.submitAddCustomer      = submitAddCustomer;
window.setCurrency            = setCurrency;
window.searchCustomer         = searchCustomer;
window.openProfile = openProfile;
window.openEditCustomerModal = openEditCustomerModal;
window.closeEditCustomerModal = closeEditCustomerModal;
window.submitEditCustomerInfo = submitEditCustomerInfo;
window.backHome = backHome;
window.saveCustomer = saveCustomer;
window.deleteCustomer = deleteCustomer;
window.deleteCurrentCustomer = deleteCurrentCustomer;
window.updateNotes = updateNotes;
window.updateMeasurement = updateMeasurement;
window.handleMeasurementKeydown = handleMeasurementKeydown;
window.selectModel = selectModel;
window.toggleMultiSelect = toggleMultiSelect;
window.updatePrice = updatePrice;
window.togglePayment = togglePayment;
window.setDeliveryDay = setDeliveryDay;
window.addOrder = addOrder;
window.deleteOrder = deleteOrder;
window.printFullTable = printFullTable;
window.printProfessionalInvoice = printProfessionalInvoice;
window.savePrintSettings = savePrintSettings;
window.showPrintSettingsModal = showPrintSettingsModal;
window.openPrintSettings = openPrintSettings;
window.saveDataToFile = saveDataToFile;
window.loadDataFromFile = loadDataFromFile;
window.clearAllData = clearAllData;
window.toggleDarkMode = toggleDarkMode;
window.toggleLightMode = toggleLightMode;
window.toggleVividMode = toggleVividMode;
window.formatPrice = formatPrice;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// ========== START APP ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// ========== PWA SHORTCUT: ?new=true ==========
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === 'true') {
        // صبر کن تا app کامل راه‌اندازی بشه بعد مشتری جدید باز کن
        const tryOpen = setInterval(() => {
            if (isInitialized) {
                clearInterval(tryOpen);
                addCustomer();
                // پارامتر رو از URL پاک کن
                window.history.replaceState({}, '', window.location.pathname);
            }
        }, 200);
    }
});

console.log('ALFAJR App initialized - Version 5.0');
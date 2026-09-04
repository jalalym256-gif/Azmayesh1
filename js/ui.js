// ========== UI HELPER FUNCTIONS ==========
function showNotification(message, type = 'info', duration = 4000) {
    const existingNotification = document.getElementById('globalNotification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'globalNotification';
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 30px;
        right: 30px;
        padding: 20px 30px;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        max-width: 500px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        font-size: 15px;
        transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        display: flex;
        align-items: center;
        gap: 15px;
        backdrop-filter: blur(10px);
        border-left: 5px solid;
        opacity: 0;
        transform: translateX(100px);
    `;
    
    const colors = {
        success: { bg: '#28a745', border: '#28a745' },
        error: { bg: '#dc3545', border: '#dc3545' },
        warning: { bg: '#ffc107', border: '#ffc107', text: '#333' },
        info: { bg: '#17a2b8', border: '#17a2b8' }
    };
    
    const color = colors[type] || colors.info;
    notification.style.backgroundColor = color.bg;
    notification.style.borderLeftColor = color.border;
    if (color.text) {
        notification.style.color = color.text;
    }
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <span style="font-size: 20px; font-weight: bold;">${icons[type] || 'ℹ'}</span>
        <span>${escapeHtml(message)}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, duration);
}

function showLoading(message = 'در حال بارگذاری...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.92);
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-family: Tahoma, Arial, sans-serif;
            backdrop-filter: blur(10px);
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 70px;
            height: 70px;
            border: 5px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top-color: #D4AF37;
            animation: spin 1s linear infinite;
            margin-bottom: 30px;
        `;

        const text = document.createElement('div');
        text.id = 'loadingText';
        text.style.cssText = `
            font-size: 18px;
            text-align: center;
            max-width: 400px;
            line-height: 1.8;
            color: #D4AF37;
        `;
        text.textContent = message;

        if (!document.getElementById('spinAnimation')) {
            const style = document.createElement('style');
            style.id = 'spinAnimation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        overlay.appendChild(spinner);
        overlay.appendChild(text);
        document.body.appendChild(overlay);
    }
    
    overlay.style.display = 'flex';
    document.getElementById('loadingText').textContent = message;
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ========== CUSTOMER MANAGEMENT ==========
function addCustomer() {
    const nameInput  = document.getElementById('modalCustomerName');
    const phoneInput = document.getElementById('modalCustomerPhone');
    const nameErr    = document.getElementById('nameError');
    const phoneErr   = document.getElementById('phoneError');
    const modal      = document.getElementById('addCustomerModal');

    if (!modal) return;

    if (nameInput)  nameInput.value  = '';
    if (phoneInput) phoneInput.value = '';
    if (nameErr)    nameErr.textContent  = '';
    if (phoneErr)   phoneErr.textContent = '';

    modal.style.display = 'flex';
    setTimeout(() => { if (nameInput) nameInput.focus(); }, 150);
}

function closeAddCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    if (modal) modal.style.display = 'none';
}

async function submitAddCustomer() {
    const nameInput  = document.getElementById('modalCustomerName');
    const phoneInput = document.getElementById('modalCustomerPhone');
    const nameError  = document.getElementById('nameError');
    const phoneError = document.getElementById('phoneError');

    if (!nameInput || !phoneInput) return;

    const name  = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (nameError)  nameError.textContent  = '';
    if (phoneError) phoneError.textContent = '';

    let hasError = false;

    if (!name || name.length < 2) {
        if (nameError) nameError.textContent = 'نام باید حداقل ۲ کاراکتر باشد';
        nameInput.focus();
        hasError = true;
    }

    if (!phone || phone.length < 7 || !/^\d+$/.test(phone)) {
        if (phoneError) phoneError.textContent = 'شماره باید حداقل ۷ رقم عددی باشد';
        if (!hasError) phoneInput.focus();
        hasError = true;
    }

    if (hasError) return;

    try {
        closeAddCustomerModal();
        showLoading('در حال اضافه کردن مشتری جدید...');

        const customer = new Customer(name, phone);
        await dbManager.saveCustomer(customer);
        await loadCustomers();

        const index = customers.findIndex(c => c.id === customer.id);
        if (index !== -1) openProfile(index);

        hideLoading();
        showNotification(`مشتری "${name}" با موفقیت اضافه شد`, 'success');
    } catch (error) {
        hideLoading();
        showNotification('خطا در اضافه کردن مشتری: ' + error.message, 'error');
    }
}

async function loadCustomers() {
    try {
        showLoading('در حال بارگذاری مشتریان...');
        customers = await dbManager.getAllCustomers();
        renderCustomerList();
        updateStats();
        hideLoading();
    } catch (error) {
        hideLoading();
        showNotification('خطا در بارگذاری مشتریان', 'error');
        renderCustomerList();
    }
}

function renderCustomerList() {
    const listElement = document.getElementById('customerList');
    if (!listElement) return;

    if (!customers || customers.length === 0) {
        listElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>هنوز مشتری ثبت نشده است</h3>
                <p>برای شروع، روی دکمه "مشتری جدید" کلیک کنید</p>
                <button class="btn-primary" onclick="addCustomer()" style="margin-top: 20px;">
                    <i class="fas fa-user-plus"></i> افزودن اولین مشتری
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    customers.forEach((customer, index) => {
        const hasPrice = customer.sewingPriceAfghani && customer.sewingPriceAfghani > 0;
        const isPaid = customer.paymentReceived;
        const deliveryDay = customer.deliveryDay;
        const date = new Date(customer.createdAt);
        const formattedDate = date.toLocaleDateString('fa-IR');
        const hasNotes = customer.notes && customer.notes.trim().length > 0;
        
        html += `
            <div class="customer-card" onclick="openProfile(${index})">
                <div class="customer-header">
                    <span class="customer-id">${escapeHtml(customer.id)}</span>
                    <span class="customer-date">${escapeHtml(formattedDate)}</span>
                </div>
                <div class="customer-name">${escapeHtml(customer.name || 'بدون نام')}</div>
                <div class="customer-phone">
                    <i class="fas fa-phone"></i>
                    ${escapeHtml(customer.phone || 'بدون شماره')}
                </div>
                ${hasNotes ? `
                    <div class="customer-notes">
                        <i class="fas fa-sticky-note"></i>
                        ${escapeHtml(customer.notes.substring(0, 80))}${customer.notes.length > 80 ? '...' : ''}
                    </div>
                ` : ''}
                <div class="customer-footer">
                    <div class="customer-badges">
                        ${hasPrice ? `<span class="badge price">${formatPrice(customer.sewingPriceAfghani)} ${currentCurrency}</span>` : ''}
                        ${isPaid ? '<span class="badge paid">پرداخت شده</span>' : ''}
                        ${deliveryDay ? `<span class="badge delivery">${escapeHtml(deliveryDay)}</span>` : ''}
                    </div>
                    <button class="delete-btn-small" onclick="event.stopPropagation(); deleteCustomer('${customer.id}', ${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listElement.innerHTML = html;
}

async function searchCustomer() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (!query) {
        await loadCustomers();
        return;
    }

    try {
        showLoading('در حال جستجو...');
        const results = await dbManager.searchCustomers(query);
        
        const listElement = document.getElementById('customerList');
        if (!listElement) return;

        if (results.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>مشتری یافت نشد</h3>
                    <p>هیچ مشتری با مشخصات "${escapeHtml(query)}" پیدا نشد</p>
                    <button class="btn-secondary" onclick="document.getElementById('searchInput').value = ''; loadCustomers();" style="margin-top: 20px;">
                        <i class="fas fa-times"></i> پاک کردن جستجو
                    </button>
                </div>
            `;
            hideLoading();
            return;
        }

        let html = '';
        results.forEach((customer, index) => {
            const realIndex = customers.findIndex(c => c.id === customer.id);
            const hasPrice = customer.sewingPriceAfghani && customer.sewingPriceAfghani > 0;
            const isPaid = customer.paymentReceived;
            const deliveryDay = customer.deliveryDay;
            
            html += `
                <div class="customer-card search-result" onclick="openProfile(${realIndex})" style="border: 2px solid #D4AF37;">
                    <div style="background: rgba(212, 175, 55, 0.1); padding: 5px 10px; border-radius: 20px; font-size: 12px; color: #D4AF37; margin-bottom: 10px; display: inline-block;">
                        <i class="fas fa-search"></i> نتیجه جستجو
                    </div>
                    <div class="customer-name">${escapeHtml(customer.name || 'بدون نام')}</div>
                    <div class="customer-phone">
                        <i class="fas fa-phone"></i>
                        ${escapeHtml(customer.phone || 'بدون شماره')}
                    </div>
                    <div class="customer-footer">
                        <div class="customer-badges">
                            ${hasPrice ? `<span class="badge price">${formatPrice(customer.sewingPriceAfghani)} ${currentCurrency}</span>` : ''}
                            ${isPaid ? '<span class="badge paid">پرداخت شده</span>' : ''}
                            ${deliveryDay ? `<span class="badge delivery">${escapeHtml(deliveryDay)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        listElement.innerHTML = html;
        hideLoading();
        showNotification(`${results.length} مشتری یافت شد`, 'success');
    } catch (error) {
        hideLoading();
        showNotification('خطا در جستجو', 'error');
    }
}

async function deleteCustomer(id, index) {
    if (!id) return;
    
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    
    const customerName = customer.name || 'این مشتری';
    if (!confirm(`آیا از حذف "${customerName}" مطمئن هستید؟\nاین عمل قابل بازگشت نیست.`)) return;
    
    try {
        showLoading('در حال حذف مشتری...');
        await dbManager.deleteCustomer(id);
        await loadCustomers();
        
        if (document.getElementById('profilePage').style.display !== 'none') {
            backHome();
        }
        
        hideLoading();
        showNotification('مشتری با موفقیت حذف شد', 'success');
    } catch (error) {
        hideLoading();
        showNotification('خطا در حذف مشتری', 'error');
    }
}

function deleteCurrentCustomer() {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;
    deleteCustomer(customer.id, currentCustomerIndex);
}

// ========== ویرایش نام/شماره مشتری (بعد از ثبت اولیه) ==========
function openEditCustomerModal() {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    const modal      = document.getElementById('editCustomerModal');
    const nameInput  = document.getElementById('editCustomerName');
    const phoneInput = document.getElementById('editCustomerPhone');
    const nameErr    = document.getElementById('editNameError');
    const phoneErr   = document.getElementById('editPhoneError');

    if (!modal) return;

    if (nameInput)  nameInput.value  = customer.name  || '';
    if (phoneInput) phoneInput.value = customer.phone || '';
    if (nameErr)    nameErr.textContent  = '';
    if (phoneErr)   phoneErr.textContent = '';

    modal.style.display = 'flex';
    setTimeout(() => { if (nameInput) nameInput.focus(); }, 150);
}

function closeEditCustomerModal() {
    const modal = document.getElementById('editCustomerModal');
    if (modal) modal.style.display = 'none';
}

async function submitEditCustomerInfo() {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    const nameInput  = document.getElementById('editCustomerName');
    const phoneInput = document.getElementById('editCustomerPhone');
    const nameError  = document.getElementById('editNameError');
    const phoneError = document.getElementById('editPhoneError');

    if (!nameInput || !phoneInput) return;

    const name  = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (nameError)  nameError.textContent  = '';
    if (phoneError) phoneError.textContent = '';

    let hasError = false;

    if (!name || name.length < 2) {
        if (nameError) nameError.textContent = 'نام باید حداقل ۲ کاراکتر باشد';
        nameInput.focus();
        hasError = true;
    }

    if (!phone || phone.length < 7 || !/^\d+$/.test(phone)) {
        if (phoneError) phoneError.textContent = 'شماره باید حداقل ۷ رقم عددی باشد';
        if (!hasError) phoneInput.focus();
        hasError = true;
    }

    if (hasError) return;

    try {
        customer.name  = name;
        customer.phone = phone;

        await dbManager.saveCustomer(customer);

        document.getElementById('profileName').textContent = name;
        document.getElementById('profilePhoneText').textContent = phone;

        closeEditCustomerModal();
        showNotification('مشخصات مشتری با موفقیت به‌روزرسانی شد', 'success');
    } catch (error) {
        showNotification('خطا در ذخیره تغییرات: ' + error.message, 'error');
    }
}

// ========== PROFILE MANAGEMENT ==========
function openProfile(index) {
    if (index < 0 || index >= customers.length) {
        showNotification('مشتری یافت نشد', 'error');
        return;
    }

    currentCustomerIndex = index;
    const customer = customers[index];

    document.getElementById('profileName').textContent = customer.name || 'بدون نام';
    document.getElementById('profilePhoneText').textContent = customer.phone || 'بدون شماره';
    document.getElementById('profileId').textContent = `کد: ${customer.id}`;
    
    const notesElement = document.getElementById('customerNotes');
    if (notesElement) {
        notesElement.value = customer.notes || '';
    }

    renderMeasurements();
    renderModels();
    renderOrders();
    renderPriceDelivery();
    
    addPrintButtons();

    document.getElementById('homePage').style.display = 'none';
    document.getElementById('profilePage').style.display = 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backHome() {
    document.getElementById('homePage').style.display = 'block';
    document.getElementById('profilePage').style.display = 'none';
    currentCustomerIndex = null;
    loadCustomers();
}

function updateNotes() {
    if (currentCustomerIndex === null) return;
    
    const notesElement = document.getElementById('customerNotes');
    if (!notesElement) return;
    
    const customer = customers[currentCustomerIndex];
    customer.notes = notesElement.value;
    saveCustomer();
}

function saveCustomer() {
    if (currentCustomerIndex === null) return;
    
    try {
        const customer = customers[currentCustomerIndex];
        if (!customer) return;
        
        const notesElement = document.getElementById('customerNotes');
        if (notesElement) {
            customer.notes = notesElement.value;
        }
        
        const measurementInputs = document.querySelectorAll('.measurement-input');
        measurementInputs.forEach(input => {
            const field = input.dataset.field;
            if (field) {
                const value = input.value;
                customer.measurements[field] = value ? parseFloat(value) : '';
            }
        });
        
        const priceInput = document.getElementById('sewingPrice');
        if (priceInput) {
            const priceValue = priceInput.value;
            customer.sewingPriceAfghani = priceValue ? parseInt(priceValue) : null;
        }
        
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            try {
                await dbManager.saveCustomer(customer);
                
                const saveIndicator = document.createElement('div');
                saveIndicator.textContent = '✓ ذخیره شد';
                saveIndicator.style.cssText = `
                    position: fixed;
                    bottom: 80px;
                    left: 30px;
                    background: #28a745;
                    color: white;
                    padding: 8px 15px;
                    border-radius: 20px;
                    font-size: 12px;
                    z-index: 1000;
                    animation: fadeInOut 2s;
                `;
                document.body.appendChild(saveIndicator);
                setTimeout(() => {
                    if (saveIndicator.parentNode) {
                        saveIndicator.parentNode.removeChild(saveIndicator);
                    }
                }, 2000);
            } catch (error) {
                showNotification('خطا در ذخیره: ' + error.message, 'error');
            }
        }, 1500);
    } catch (error) {
        showNotification('خطا در ذخیره', 'error');
    }
}
// ========== ALFAJR - PROFILE FUNCTIONS ==========
// js/profile.js — توابع صفحه پروفایل مشتری
// این فایل باید قبل از main.js و بعد از config.js بارگذاری شود

// ========== برچسب‌های فارسی اندازه‌ها ==========
// همون برچسب‌هایی که در لیبل چاپی هم استفاده می‌شن (یکدست‌سازی شده)
const MEASUREMENT_LABELS = {
    "قد":           "قد",
    "شانه_یک":      "شانه ۱",
    "شانه_دو":      "شانه ۲",
    "آستین_یک":     "آستین ۱",
    "آستین_دو":     "آستین ۲",
    "آستین_سه":     "آستین ۳",
    "بغل":          "بغل",
    "دامن":         "دامن",
    "گردن":         "گردن",
    "دور_سینه":     "زیربقل",
    "شلوار":        "شلوار",
    "دم_پاچه":      "دم پاچه",
    "بر_تمبان":     "بر",
    "خشتک":         "خشتک",
    "چاک_پتی":      "چاک پتی",
    "تعداد_سفارش":  "تعداد سفارش",
    "مقدار_تکه":    "مقدار تکه"
};


// ==========================================
// ۱. رندر اندازه‌گیری‌ها
// ==========================================
function renderMeasurements() {
    const container = document.getElementById('measurementsContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    // ردیف‌ها — هر ردیف آرایه‌ای از فیلدهاست
    const ROWS = [
        ["قد"],
        ["شانه_یک", "شانه_دو"],
        ["آستین_یک", "آستین_دو", "آستین_سه"],
        ["بغل"],
        ["دامن"],
        ["گردن"],
        ["شلوار"],
        ["دم_پاچه"],
        ["بر_تمبان", "خشتک"],
        ["چاک_پتی", "دور_سینه"],
        ["تعداد_سفارش", "مقدار_تکه"],
    ];

    let html = `
        <div class="section-header">
            <h3><i class="fas fa-ruler"></i> اندازه‌های بدن</h3>
        </div>
        <div class="measurements-table">
    `;

    ROWS.forEach(row => {
        const cols = row.length;
        html += `<div class="mrow mrow-${cols}">`;

        row.forEach(field => {
            const label = MEASUREMENT_LABELS[field] || field.replace(/_/g, ' ');
            const value = customer.measurements[field] ?? '';
            html += `
                <div class="mcell">
                    <label class="mcell-label">${label}</label>
                    <input
                        type="number"
                        class="measurement-input mcell-input"
                        data-field="${field}"
                        value="${value}"
                        placeholder="--"
                        step="0.5"
                        min="0"
                        oninput="updateMeasurement('${field}', this.value)"
                        onkeydown="handleMeasurementKeydown(event)"
                    >
                </div>
            `;
        });

        html += `</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}


// ==========================================
// ۲. بروزرسانی یک اندازه
// ==========================================
function updateMeasurement(field, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    customer.measurements[field] = value !== '' ? parseFloat(value) : '';
    saveCustomer();

    // اگه «تعداد سفارش» تغییر کرد، مبلغ کل توی بخش قیمت هم آپدیت بشه
    if (field === 'تعداد_سفارش') {
        renderPriceDelivery();
    }
}


// ==========================================
// ۳. ناوبری کیبورد در اندازه‌گیری‌ها
// ==========================================
function handleMeasurementKeydown(event) {
    if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;

    const inputs   = Array.from(document.querySelectorAll('.measurement-input'));
    const current  = inputs.indexOf(event.target);

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (current > 0) { inputs[current - 1].focus(); inputs[current - 1].select(); }
    } else {
        // Enter یا ArrowDown
        event.preventDefault();
        if (current < inputs.length - 1) { inputs[current + 1].focus(); inputs[current + 1].select(); }
    }
}


// ==========================================
// ۴. رندر مدل‌ها
// ==========================================
function renderModels() {
    const container = document.getElementById('modelsContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    const selYakhun  = Array.isArray(customer.models.yakhun)   ? customer.models.yakhun   : [];
    const selSleeve  = Array.isArray(customer.models.sleeve)   ? customer.models.sleeve   : [];
    const selSkirt   = Array.isArray(customer.models.skirt)    ? customer.models.skirt    : [];
    const selFeature = Array.isArray(customer.models.features) ? customer.models.features : [];
    const selButtons = Array.isArray(customer.models.buttons)  ? customer.models.buttons  : [];
    const allSubOptions = (customer.models.subOptions && typeof customer.models.subOptions === 'object')
        ? customer.models.subOptions : {};

    // دکمه چندانتخابی
    const multiBtn = (type, model, selected) => `
        <button class="model-option multi-select ${selected ? 'selected' : ''}" onclick="toggleMultiSelect('${type}', '${model}')">
            ${selected ? '<span class="checkmark">✓</span>' : ''}
            ${escapeHtml(model)}
        </button>
    `;

    // دکمه‌ی یک مدل + زیرگزینه‌های احتمالی‌اش (مثل کفک → بی‌پلت/با‌پلت/گول/سه‌کنج/چهارکنج،
    // یا جیب رو → مارک فارسی/انگلیسی/گلدوزی/بی‌مارک) — برای هر دسته‌ای کار می‌کنه
    const modelBtn = (type, model, selected) => {
        const subOptions = AppConfig.SUB_OPTIONS[type]?.[model];
        let subHtml = '';
        if (selected && subOptions && subOptions.length) {
            const chosenSub = (allSubOptions[type] && allSubOptions[type][model]) || '';
            subHtml = `
                <div class="model-suboptions-wrapper">
                    ${subOptions.map(sub => `
                        <button type="button" class="model-suboption ${chosenSub === sub ? 'selected' : ''}"
                            onclick="event.stopPropagation(); selectSubOption('${type}', '${model}', '${sub}')">
                            ${chosenSub === sub ? '<span class="checkmark">✓</span>' : ''}
                            ${escapeHtml(sub)}
                        </button>
                    `).join('')}
                </div>
            `;
        }
        return multiBtn(type, model, selected) + subHtml;
    };

    let html = `
        <div class="section-header">
            <h3><i class="fas fa-tshirt"></i> مدل‌ها و ویژگی‌ها</h3>
        </div>
        <div class="models-grid">

            <div class="model-category">
                <h4><i class="fas fa-cut"></i> مدل یخن <span class="multi-hint">(چندتایی)</span></h4>
                <div class="model-options">
                    ${AppConfig.YAKHUN_MODELS.map(m => multiBtn('yakhun', m, selYakhun.includes(m))).join('')}
                </div>
            </div>

            <div class="model-category">
                <h4><i class="fas fa-hand-paper"></i> مدل آستین <span class="multi-hint">(چندتایی)</span></h4>
                <div class="model-options">
                    ${AppConfig.SLEEVE_MODELS.map(m => modelBtn('sleeve', m, selSleeve.includes(m))).join('')}
                </div>
            </div>

            <div class="model-category">
                <h4><i class="fas fa-star"></i> مدل دامن <span class="multi-hint">(چندتایی)</span></h4>
                <div class="model-options">
                    ${AppConfig.SKIRT_MODELS.map(m => multiBtn('skirt', m, selSkirt.includes(m))).join('')}
                </div>
            </div>

            <div class="model-category">
                <h4><i class="fas fa-plus-circle"></i> ویژگی‌های اضافه <span class="multi-hint">(چندتایی)</span></h4>
                <div class="model-options">
                    ${AppConfig.FEATURES_LIST.map(m => modelBtn('features', m, selFeature.includes(m))).join('')}
                </div>
            </div>

            <div class="model-category">
                <h4><i class="fas fa-circle"></i> مدل دکمه <span class="multi-hint">(چندتایی)</span></h4>
                <div class="model-options">
                    ${AppConfig.BUTTON_MODELS.map(m => multiBtn('buttons', m, selButtons.includes(m))).join('')}
                </div>
            </div>

        </div>
    `;

    container.innerHTML = html;
}


// ==========================================
// ۵. انتخاب مدل تک‌انتخابی
// ==========================================
function selectModel(type, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    // اگر همون مدل بود، deselect کن
    customer.models[type] = customer.models[type] === value ? '' : value;

    renderModels();
    saveCustomer();
}


// ==========================================
// ۶. تغییر وضعیت مدل چندانتخابی
// ==========================================
function toggleMultiSelect(type, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    if (!Array.isArray(customer.models[type])) customer.models[type] = [];

    const idx = customer.models[type].indexOf(value);
    if (idx === -1) {
        customer.models[type].push(value);
    } else {
        customer.models[type].splice(idx, 1);
        // اگه مدلی که deselect شد زیرگزینه انتخاب‌شده داشت، پاکش کن
        if (customer.models.subOptions && customer.models.subOptions[type]) {
            delete customer.models.subOptions[type][value];
        }
    }

    renderModels();
    saveCustomer();
}


// ==========================================
// ۶.۱. انتخاب زیرگزینه‌ی یک مدل (مثلاً بی‌پلت/با‌پلت برای کفک، یا انگلیسی برای جیب رو)
// ==========================================
function selectSubOption(type, parentModel, subOption) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    if (!customer.models.subOptions) customer.models.subOptions = {};
    if (!customer.models.subOptions[type]) customer.models.subOptions[type] = {};

    // اگه همون گزینه دوباره زده بشه، پاک می‌شه (deselect)
    customer.models.subOptions[type][parentModel] =
        customer.models.subOptions[type][parentModel] === subOption ? '' : subOption;

    renderModels();
    saveCustomer();
}


// ==========================================
// ۷. رندر قیمت و تحویل
// ==========================================
function renderPriceDelivery() {
    const container = document.getElementById('priceDeliveryContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer   = customers[currentCustomerIndex];
    if (!customer) return;

    const price      = customer.sewingPriceAfghani || '';
    const isPaid     = customer.paymentReceived    || false;
    const payDate    = customer.paymentDate        || null;
    const delivery   = customer.deliveryDay        || '';
    const orderQtyRaw = parseInt(customer.measurements?.['تعداد_سفارش'], 10);
    const orderQty   = (!isNaN(orderQtyRaw) && orderQtyRaw > 0) ? orderQtyRaw : 1;

    const payLabel   = isPaid ? 'پرداخت شده ✓' : 'پرداخت نشده ✗';
    const payClass   = isPaid ? 'checked' : '';

    let html = `
        <div class="section-header">
            <h3><i class="fas fa-money-bill-wave"></i> قیمت و تحویل</h3>
        </div>
        <div class="price-delivery-grid">

            <!-- قیمت دوخت -->
            <div class="price-section">
                <h4><i class="fas fa-coins"></i> قیمت دوخت (فی جوره)</h4>
                <div class="price-input-group">
                    <input
                        type="number"
                        id="sewingPrice"
                        value="${price}"
                        placeholder="مبلغ هر جوره به ${currentCurrency}..."
                        min="0"
                        oninput="updatePrice(this.value)"
                    >
                    <span class="currency">${currentCurrency}</span>
                </div>
                ${price ? `<div style="margin-top:12px;color:#28a745;font-size:1.1rem;font-weight:bold;">
                    ${orderQty > 1
                        ? `${orderQty} جوره × ${formatPrice(price)} = ${formatPrice(price * orderQty)} ${currentCurrency}`
                        : `${formatPrice(price)} ${currentCurrency}`}
                </div>` : ''}
            </div>

            <!-- وضعیت پرداخت -->
            <div class="payment-section">
                <h4><i class="fas fa-credit-card"></i> وضعیت پرداخت</h4>
                <div class="payment-toggle" onclick="togglePayment()">
                    <div class="payment-checkbox ${payClass}">
                        <div class="checkbox-icon">${isPaid ? '✓' : ''}</div>
                        <span>${payLabel}</span>
                    </div>
                    ${isPaid && payDate ? `<div class="payment-date"><i class="fas fa-calendar-check"></i> ${formatDate(payDate)}</div>` : ''}
                </div>
            </div>

            <!-- روز تحویل -->
            <div class="delivery-section">
                <h4><i class="fas fa-calendar-alt"></i> روز تحویل</h4>
                <div class="delivery-days">
                    ${AppConfig.DAYS_OF_WEEK.map(day => `
                        <button
                            class="day-button ${delivery === day ? 'selected' : ''}"
                            onclick="setDeliveryDay('${day}')"
                        >${day}</button>
                    `).join('')}
                </div>
            </div>

        </div>
    `;

    container.innerHTML = html;
}


// ==========================================
// ۸. بروزرسانی قیمت
// ==========================================
function updatePrice(value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    customer.sewingPriceAfghani = value ? parseInt(value) : null;

    // فقط نمایش قیمت فارسی رو آپدیت کن بدون re-render کامل
    const priceSection = document.querySelector('#priceDeliveryContainer .price-section');
    if (priceSection) {
        let display = priceSection.querySelector('.price-display-live');
        if (!display) {
            display = document.createElement('div');
            display.className = 'price-display-live';
            display.style.cssText = 'margin-top:12px;color:#28a745;font-size:1.1rem;font-weight:bold;';
            priceSection.appendChild(display);
        }
        display.textContent = value && parseInt(value) > 0 ? `${formatPrice(value)} ${currentCurrency}` : '';
    }

    saveCustomer();
}


// ==========================================
// ۹. تغییر وضعیت پرداخت
// ==========================================
function togglePayment() {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    customer.paymentReceived = !customer.paymentReceived;
    customer.paymentDate     = customer.paymentReceived ? new Date().toISOString() : null;

    renderPriceDelivery();
    saveCustomer();

    showNotification(
        customer.paymentReceived ? '✓ وضعیت پرداخت: پرداخت شده' : '✗ وضعیت پرداخت: پرداخت نشده',
        customer.paymentReceived ? 'success' : 'warning'
    );
}


// ==========================================
// ۱۰. تنظیم روز تحویل
// ==========================================
function setDeliveryDay(day) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    // کلیک دوباره = پاک کردن
    customer.deliveryDay = customer.deliveryDay === day ? '' : day;

    // آپدیت سریع دکمه‌ها بدون re-render کامل
    document.querySelectorAll('.day-button').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.trim() === customer.deliveryDay);
    });

    saveCustomer();
}


// ==========================================
// ۱۱. رندر سفارشات
// ==========================================
function renderOrders() {
    const container = document.getElementById('ordersContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    const orders = customer.orders || [];

    let ordersHtml = '';

    if (orders.length === 0) {
        ordersHtml = `
            <div class="empty-orders">
                <i class="fas fa-clipboard"></i>
                <p>هنوز سفارشی ثبت نشده است</p>
            </div>
        `;
    } else {
        ordersHtml = orders.map((order, idx) => {
            const dateStr  = order.date ? new Date(order.date).toLocaleDateString('fa-IR') : '';
            const isDone   = order.status === 'done';
            const statusClass = isDone ? 'color:#28a745' : 'color:#ffc107';
            const statusIcon  = isDone ? 'fa-check-circle' : 'fa-clock';
            const statusLabel = isDone ? 'تحویل داده شد' : 'در دست تهیه';

            return `
                <div class="order-item">
                    <div class="order-content">
                        <div class="order-header">
                            <span class="order-number">سفارش ${idx + 1}</span>
                            <span class="order-date">${dateStr}</span>
                        </div>
                        <div class="order-details">
                            <textarea
                                style="width:100%;min-height:80px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;color:#C0C0C0;font-size:1rem;resize:vertical;"
                                placeholder="توضیحات سفارش را اینجا وارد کنید..."
                                onchange="updateOrderDescription(${idx}, this.value)"
                            >${escapeHtml(order.description || '')}</textarea>
                            <div style="margin-top:10px;">
                                <button
                                    style="${statusClass};background:rgba(255,255,255,0.05);border:1px solid currentColor;border-radius:20px;padding:8px 18px;font-size:0.9rem;cursor:pointer;"
                                    onclick="toggleOrderStatus(${idx})"
                                >
                                    <i class="fas ${statusIcon}"></i> ${statusLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button class="btn-delete-order" onclick="deleteOrder(${idx})" title="حذف سفارش">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    let html = `
        <div class="section-header">
            <h3><i class="fas fa-clipboard-list"></i> سفارشات
                <span style="background:rgba(108,117,125,0.3);color:#C0C0C0;border-radius:20px;padding:3px 12px;font-size:0.9rem;margin-right:10px;">${orders.length}</span>
            </h3>
        </div>
        <div class="orders-list">
            ${ordersHtml}
        </div>
        <div style="margin-top:20px;text-align:center;">
            <button class="btn-success btn-add-order" onclick="addOrder()">
                <i class="fas fa-plus"></i>
                افزودن سفارش جدید
            </button>
        </div>
    `;

    container.innerHTML = html;
}


// ==========================================
// ۱۲. افزودن سفارش جدید
// ==========================================
function addOrder() {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    if (!Array.isArray(customer.orders)) customer.orders = [];

    customer.orders.push({
        id:          Date.now().toString(),
        description: '',
        date:        new Date().toISOString(),
        status:      'pending'
    });

    renderOrders();
    saveCustomer();

    showNotification('سفارش جدید اضافه شد', 'success');

    // فوکوس روی textarea سفارش جدید
    setTimeout(() => {
        const areas = document.querySelectorAll('#ordersContainer textarea');
        if (areas.length) areas[areas.length - 1].focus();
    }, 100);
}


// ==========================================
// ۱۳. حذف سفارش
// ==========================================
function deleteOrder(index) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer || !customer.orders) return;

    if (!confirm(`آیا از حذف سفارش ${index + 1} مطمئن هستید؟`)) return;

    customer.orders.splice(index, 1);
    renderOrders();
    saveCustomer();

    showNotification('سفارش حذف شد', 'success');
}


// ==========================================
// توابع کمکی سفارشات
// ==========================================
function updateOrderDescription(index, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer || !customer.orders?.[index]) return;

    customer.orders[index].description = value;
    saveCustomer();
}

function toggleOrderStatus(index) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer || !customer.orders?.[index]) return;

    customer.orders[index].status = customer.orders[index].status === 'done' ? 'pending' : 'done';
    renderOrders();
    saveCustomer();
}


// ==========================================
// Export به window
// ==========================================
window.renderMeasurements      = renderMeasurements;
window.renderModels            = renderModels;
window.renderPriceDelivery     = renderPriceDelivery;
window.renderOrders            = renderOrders;
window.updateMeasurement       = updateMeasurement;
window.handleMeasurementKeydown = handleMeasurementKeydown;
window.selectModel             = selectModel;
window.toggleMultiSelect       = toggleMultiSelect;
window.selectSubOption         = selectSubOption;
window.updatePrice             = updatePrice;
window.togglePayment           = togglePayment;
window.setDeliveryDay          = setDeliveryDay;
window.addOrder                = addOrder;
window.deleteOrder             = deleteOrder;
window.updateOrderDescription  = updateOrderDescription;
window.toggleOrderStatus       = toggleOrderStatus;

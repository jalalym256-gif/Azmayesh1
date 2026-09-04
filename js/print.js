// ========== PRINT FUNCTIONS ==========
// ========== تنظیمات چاپ ==========
const PRINT_DEFAULTS = {
    fontSize:    11,
    tableWidth:  76,
    headerSize:  11,
    lineHeight:  1.6,
    padding:     1.5,
    showDate:    true,
    showPhone:   true,
    showDelivery:true,
    showNotes:   true,
    showCode:    true,
    showModel:   true,
    showPrice:   true,
    boldBorder:  false,
    shopName:    '',
};

function getPrintSettings() {
    try {
        const saved = localStorage.getItem('alfajr_print_settings');
        return saved ? Object.assign({}, PRINT_DEFAULTS, JSON.parse(saved)) : Object.assign({}, PRINT_DEFAULTS);
    } catch(e) { return Object.assign({}, PRINT_DEFAULTS); }
}

// ========== ساخت متن مدل‌ها برای چاپ (لیبل و فاکتور) ==========
// یک خروجی متنی یکدست از همه‌ی مدل‌های انتخاب‌شده می‌سازه، شامل زیرگزینه‌ها (مثل کفک → با پلت)
function annotateWithSubOptions(type, list, subOptionsForType) {
    if (!Array.isArray(list)) return [];
    const subs = subOptionsForType || {};
    return list.map(m => subs[m] ? `${m} (${subs[m]})` : m);
}

function buildModelText(customer) {
    const models = customer?.models || {};
    const subOptions = (models.subOptions && typeof models.subOptions === 'object') ? models.subOptions : {};

    const yakhun   = Array.isArray(models.yakhun)   ? models.yakhun.join(' / ')   : (models.yakhun   || '');
    const sleeve   = annotateWithSubOptions('sleeve', models.sleeve, subOptions.sleeve).join(' / ');
    const skirt    = Array.isArray(models.skirt)    ? models.skirt.join(' / ')    : '';
    const features = annotateWithSubOptions('features', models.features, subOptions.features).join(' / ');
    const buttons  = Array.isArray(models.buttons)  ? models.buttons.join(' / ')  : '';
    return [yakhun, sleeve, skirt, features, buttons].filter(Boolean).join('\n');
}

// ========== محاسبه‌ی تعداد سفارش × قیمت هر جوره = مبلغ کل ==========
function computeOrderTotal(customer) {
    const qtyRaw = customer?.measurements?.['تعداد_سفارش'];
    const qty = parseInt(qtyRaw, 10);
    const quantity = (!isNaN(qty) && qty > 0) ? qty : 1;

    const priceRaw = customer?.sewingPriceAfghani;
    const unitPrice = (priceRaw !== null && priceRaw !== undefined && priceRaw !== '') ? parseInt(priceRaw, 10) : null;

    const total = (unitPrice !== null && !isNaN(unitPrice)) ? unitPrice * quantity : null;

    return { quantity, unitPrice, total, hasQuantity: !isNaN(qty) && qty > 0 };
}

function savePrintSettings(s) {
    localStorage.setItem('alfajr_print_settings', JSON.stringify(s));
}

function showPrintSettingsModal(onConfirm) {
    const s = getPrintSettings();

    // اگه modal قبلاً هست، حذف کن
    const old = document.getElementById('printSettingsModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'printSettingsModal';
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.75); display:flex; align-items:center;
        justify-content:center; z-index:6000; backdrop-filter:blur(8px);
        animation: fadeIn 0.2s ease;
    `;

    modal.innerHTML = `
        <div style="
            background:#1e1e1e; border:2px solid rgba(212,175,55,0.4);
            border-radius:16px; width:100%; max-width:420px; margin:20px;
            box-shadow:0 20px 60px rgba(0,0,0,0.6); overflow:hidden;
            animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
        ">
            <div style="
                display:flex; align-items:center; justify-content:space-between;
                padding:20px 25px 16px; border-bottom:1px solid rgba(212,175,55,0.2);
            ">
                <h3 style="color:#D4AF37; font-size:1.2rem; display:flex; align-items:center; gap:10px;">
                    <i class="fas fa-print"></i> تنظیمات چاپ لیبل
                </h3>
                <button onclick="document.getElementById('printSettingsModal').remove()"
                    style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1);
                    color:#C0C0C0; width:34px; height:34px; border-radius:50%; cursor:pointer;
                    font-size:0.9rem; display:flex; align-items:center; justify-content:center;">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div style="padding:20px 25px; display:flex; flex-direction:column; gap:16px;">

                <!-- نام خیاطی (چاپ می‌شه بالای لیبل) -->
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <label style="color:#D4AF37; font-size:0.95rem; font-weight:600;">
                        <i class="fas fa-tshirt"></i> نام خیاطی (اختیاری، بالای لیبل چاپ می‌شه)
                    </label>
                    <input type="text" id="psShopName" value="${escapeHtml(s.shopName || '')}" placeholder="مثال: خیاطی ALFAJR"
                        style="width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid rgba(255,255,255,0.15);
                        background:rgba(255,255,255,0.05); color:#C0C0C0; font-family:inherit; font-size:0.9rem;">
                </div>

                <!-- اندازه فونت -->
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <label style="color:#D4AF37; font-size:0.95rem; font-weight:600;">
                        <i class="fas fa-font"></i> اندازه فونت: <span id="psFontVal">${s.fontSize}px</span>
                    </label>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="color:#888; font-size:0.8rem;">ریز</span>
                        <input type="range" id="psFontSize" min="8" max="16" step="0.5" value="${s.fontSize}"
                            oninput="document.getElementById('psFontVal').textContent=this.value+'px'"
                            style="flex:1; accent-color:#D4AF37;">
                        <span style="color:#888; font-size:0.8rem;">درشت</span>
                    </div>
                </div>

                <!-- عرض جدول -->
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <label style="color:#D4AF37; font-size:0.95rem; font-weight:600;">
                        <i class="fas fa-arrows-alt-h"></i> عرض لیبل: <span id="psWidthVal">${s.tableWidth}mm</span>
                    </label>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        ${[58, 72, 76, 80, 100].map(w => `
                            <button type="button" onclick="
                                document.getElementById('psTableWidth').value=${w};
                                document.getElementById('psWidthVal').textContent='${w}mm';
                            " style="padding:6px 10px; border-radius:8px; border:1.5px solid rgba(212,175,55,0.3);
                                background:rgba(212,175,55,0.08); color:#D4AF37; cursor:pointer; font-size:0.8rem;">
                                ${w}mm
                            </button>
                        `).join('')}
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="color:#888; font-size:0.8rem;">باریک</span>
                        <input type="range" id="psTableWidth" min="58" max="100" step="1" value="${s.tableWidth}"
                            oninput="document.getElementById('psWidthVal').textContent=this.value+'mm'"
                            style="flex:1; accent-color:#D4AF37;">
                        <span style="color:#888; font-size:0.8rem;">عریض</span>
                    </div>
                </div>

                <!-- فاصله خطوط -->
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <label style="color:#D4AF37; font-size:0.95rem; font-weight:600;">
                        <i class="fas fa-text-height"></i> فاصله خطوط: <span id="psLineVal">${s.lineHeight}</span>
                    </label>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="color:#888; font-size:0.8rem;">فشرده</span>
                        <input type="range" id="psLineHeight" min="1" max="2.5" step="0.1" value="${s.lineHeight}"
                            oninput="document.getElementById('psLineVal').textContent=parseFloat(this.value).toFixed(1)"
                            style="flex:1; accent-color:#D4AF37;">
                        <span style="color:#888; font-size:0.8rem;">باز</span>
                    </div>
                </div>

                <!-- padding داخلی -->
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <label style="color:#D4AF37; font-size:0.95rem; font-weight:600;">
                        <i class="fas fa-expand"></i> فضای داخل سلول‌ها: <span id="psPadVal">${s.padding}mm</span>
                    </label>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="color:#888; font-size:0.8rem;">کم</span>
                        <input type="range" id="psPadding" min="0.5" max="4" step="0.5" value="${s.padding}"
                            oninput="document.getElementById('psPadVal').textContent=this.value+'mm'"
                            style="flex:1; accent-color:#D4AF37;">
                        <span style="color:#888; font-size:0.8rem;">زیاد</span>
                    </div>
                </div>

                <!-- قاب و کادر -->
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer; color:#C0C0C0;
                    border-top:1px solid rgba(255,255,255,0.08); padding-top:14px;">
                    <input type="checkbox" id="psBoldBorder" ${s.boldBorder?'checked':''} style="accent-color:#D4AF37; width:16px; height:16px;">
                    <i class="fas fa-square"></i> کادر و خط‌های ضخیم‌تر (خواناتر برای چاپگرهای ضعیف)
                </label>

                <!-- چک‌باکس‌ها -->
                <div style="display:flex; flex-direction:column; gap:10px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px;">
                    <label style="color:#C0C0C0; font-size:0.9rem; font-weight:600; margin-bottom:4px;">
                        <i class="fas fa-eye"></i> نمایش در لیبل:
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; color:#C0C0C0;">
                        <input type="checkbox" id="psShowCode" ${s.showCode?'checked':''} style="accent-color:#D4AF37; width:16px; height:16px;">
                        کد مشتری
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; color:#C0C0C0;">
                        <input type="checkbox" id="psShowDate" ${s.showDate?'checked':''} style="accent-color:#D4AF37; width:16px; height:16px;">
                        تاریخ و ساعت
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; color:#C0C0C0;">
                        <input type="checkbox" id="psShowPhone" ${s.showPhone?'checked':''} style="accent-color:#D4AF37; width:16px; height:16px;">
                        شماره مشتری
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; color:#C0C0C0;">
                        <input type="checkbox" id="psShowModel" ${s.showModel?'checked':''} style="accent-color:#D4AF37; width:16px; height:16px;">
                        بخش مدل‌ها
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; color:#C0C0C0;">
                        <input type="checkbox" id="psShowDelivery" ${s.showDelivery?'checked':''} style="accent-color:#D4AF37; width:16px; height:16px;">
                        روز تحویل
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; color:#C0C0C0;">
                        <input type="checkbox" id="psShowPrice" ${s.showPrice?'checked':''} style="accent-color:#D4AF37; width:16px; height:16px;">
                        تعداد سفارش و مبلغ کل
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; color:#C0C0C0;">
                        <input type="checkbox" id="psShowNotes" ${s.showNotes?'checked':''} style="accent-color:#D4AF37; width:16px; height:16px;">
                        توضیحات مشتری
                    </label>
                </div>

            </div>

            <div style="
                display:flex; gap:12px; padding:16px 25px 20px;
                border-top:1px solid rgba(255,255,255,0.06);
            ">
                <button onclick="
                    document.getElementById('psShopName').value='';
                    document.getElementById('psFontSize').value=${PRINT_DEFAULTS.fontSize};
                    document.getElementById('psTableWidth').value=${PRINT_DEFAULTS.tableWidth};
                    document.getElementById('psLineHeight').value=${PRINT_DEFAULTS.lineHeight};
                    document.getElementById('psPadding').value=${PRINT_DEFAULTS.padding};
                    document.getElementById('psFontVal').textContent='${PRINT_DEFAULTS.fontSize}px';
                    document.getElementById('psWidthVal').textContent='${PRINT_DEFAULTS.tableWidth}mm';
                    document.getElementById('psLineVal').textContent='${PRINT_DEFAULTS.lineHeight}';
                    document.getElementById('psPadVal').textContent='${PRINT_DEFAULTS.padding}mm';
                    document.getElementById('psBoldBorder').checked=${PRINT_DEFAULTS.boldBorder};
                    document.getElementById('psShowCode').checked=true;
                    document.getElementById('psShowDate').checked=true;
                    document.getElementById('psShowPhone').checked=true;
                    document.getElementById('psShowModel').checked=true;
                    document.getElementById('psShowDelivery').checked=true;
                    document.getElementById('psShowPrice').checked=true;
                    document.getElementById('psShowNotes').checked=true;
                " style="
                    flex:1; padding:12px; background:rgba(255,255,255,0.06);
                    border:1px solid rgba(255,255,255,0.1); border-radius:10px;
                    color:#C0C0C0; cursor:pointer; font-family:inherit; font-size:0.9rem;
                ">
                    <i class="fas fa-undo"></i> پیش‌فرض
                </button>
                <button onclick="
                    const cfg = {
                        shopName:     document.getElementById('psShopName').value.trim(),
                        fontSize:     parseFloat(document.getElementById('psFontSize').value),
                        tableWidth:   parseInt(document.getElementById('psTableWidth').value),
                        lineHeight:   parseFloat(document.getElementById('psLineHeight').value),
                        padding:      parseFloat(document.getElementById('psPadding').value),
                        boldBorder:   document.getElementById('psBoldBorder').checked,
                        showCode:     document.getElementById('psShowCode').checked,
                        showDate:     document.getElementById('psShowDate').checked,
                        showPhone:    document.getElementById('psShowPhone').checked,
                        showModel:    document.getElementById('psShowModel').checked,
                        showDelivery: document.getElementById('psShowDelivery').checked,
                        showPrice:    document.getElementById('psShowPrice').checked,
                        showNotes:    document.getElementById('psShowNotes').checked,
                    };
                    savePrintSettings(cfg);
                    document.getElementById('printSettingsModal').remove();
                    if (window._printCallback) {
                        window._printCallback(cfg);
                    } else {
                        showNotification('تنظیمات ذخیره شد', 'success');
                    }
                " style="
                    flex:2; padding:12px; background:linear-gradient(135deg,#D4AF37,#B8960C);
                    border:none; border-radius:10px; color:#000;
                    cursor:pointer; font-family:inherit; font-size:1rem; font-weight:bold;
                ">
                    <i class="fas fa-save"></i> ذخیره تنظیمات
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}

function printFullTable() {
    if (currentCustomerIndex === null) {
        showNotification('لطفاً ابتدا یک مشتری انتخاب کنید', 'warning');
        return;
    }
    // مستقیم با تنظیمات ذخیره شده چاپ کن
    _doPrintFullTable(getPrintSettings());
}

// این تابع رو از دکمه "تنظیمات چاپ" صدا بزن
function openPrintSettings() {
    window._printCallback = null; // فقط ذخیره کن، چاپ نکن
    showPrintSettingsModal();
}

function _doPrintFullTable(cfg) {
    if (currentCustomerIndex === null) return;

    const customer = customers[currentCustomerIndex];
    const today = new Date();
    const persianDate = today.toLocaleDateString('fa-IR');
    const persianTime = today.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const m  = customer.measurements || {};
    const v  = (field) => m[field] !== undefined && m[field] !== '' ? m[field] : '';

    // مدل‌ها (شامل زیرگزینه‌های آستین)
    const modelText = buildModelText(customer);

    // تعداد سفارش × قیمت هر جوره = مبلغ کل
    const orderCalc = computeOrderTotal(customer);

    // ضخامت خط‌ها بر اساس تنظیمات کاربر
    const bMain  = cfg.boldBorder ? '2.5px' : '1.5px';
    const bCell  = cfg.boldBorder ? '1.5px' : '1px';
    const bThin  = cfg.boldBorder ? '1px'   : '0.5px';

    const printContent = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <title>لیبل ALFAJR</title>
    <style>
        @page { size: ${cfg.tableWidth}mm auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            width: ${cfg.tableWidth}mm;
            font-family: 'Vazirmatn', 'IRANSans', 'Noto Naskh Arabic', 'Noto Sans Arabic', Tahoma, Arial, sans-serif;
            font-size: ${cfg.fontSize}px;
            line-height: ${cfg.lineHeight};
            background: white;
            color: #000;
            padding: 1.5mm 2mm;
        }

        /* ===== نام خیاطی (اختیاری) ===== */
        .shop-name {
            text-align: center;
            font-weight: bold;
            font-size: 13px;
            padding-bottom: 1mm;
        }

        /* ===== هدر ===== */
        .hdr {
            border: ${bMain} solid #000;
            margin-bottom: 1mm;
        }
        .hdr-r1, .hdr-r2 {
            display: flex;
            justify-content: space-between;
            padding: 0.8mm 2mm;
            font-size: 10.5px;
        }
        .hdr-r1 { border-bottom: ${bCell} solid #000; }
        .bold { font-weight: bold; }

        /* ===== جدول اصلی ===== */
        .main {
            width: 100%;
            border-collapse: collapse;
            border: ${bMain} solid #000;
        }
        .main td {
            border: ${bCell} solid #000;
            padding: 0;
            vertical-align: top;
        }

        /* ستون مدل - چپ */
        .col-model {
            width: 26mm;
            padding: 1.5mm;
        }
        .model-title {
            font-weight: bold;
            font-size: 11px;
            text-align: center;
            border-bottom: ${bCell} solid #000;
            padding-bottom: 1mm;
            margin-bottom: 1.5mm;
        }
        .model-body {
            font-size: 10px;
            line-height: 2;
            white-space: pre-line;
        }

        /* ستون اندازه‌ها - راست */
        .col-meas { width: ${cfg.showModel ? '50mm' : '100%'}; padding: 0; }

        /* جدول داخلی اندازه‌ها */
        .mt {
            width: 100%;
            border-collapse: collapse;
        }
        .mt td {
            border: none;
            border-bottom: ${bThin} solid #bbb;
            padding: ${cfg.padding}mm ${cfg.padding+0.5}mm;
            font-size: ${cfg.fontSize}px;
        }
        .mt tr:last-child td { border-bottom: none; }

        .lbl {
            font-weight: bold;
            width: 14mm;
            white-space: nowrap;
        }
        .val {
            text-align: center;
            border-right: ${bThin} solid #bbb !important;
            min-width: 9mm;
            font-weight: bold;
        }

        /* ردیف پایین */
        .footer-row td {
            border-top: ${bMain} solid #000 !important;
            padding: 1mm 1.5mm;
            font-size: 10px;
        }
        .footer-lbl { font-weight: bold; width: 18mm; }
    </style>
</head>
<body>

    ${cfg.shopName ? `<div class="shop-name">${escapeHtml(cfg.shopName)}</div>` : ''}

    <!-- هدر -->
    <div class="hdr">
        <div class="hdr-r1">
            ${cfg.showCode ? `<span class="bold">کد: ${escapeHtml(customer.id)}</span>` : '<span></span>'}
            <span>نام: <span class="bold">${escapeHtml(customer.name || '')}</span></span>
        </div>
        <div class="hdr-r2">
            ${cfg.showDate ? `<span>تاریخ: ${persianDate} - ${persianTime}</span>` : '<span></span>'}
            ${cfg.showPhone ? `<span>شماره: <span class="bold">${escapeHtml(customer.phone || '')}</span></span>` : ''}
        </div>
    </div>

    <!-- جدول اصلی -->
    <table class="main">
        <tr>
            <!-- اندازه‌ها - راست -->
            <td class="col-meas">
                <table class="mt">
                    <tr>
                        <td class="lbl">قد</td>
                        <td class="val" colspan="3">${v('قد')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">شانه</td>
                        <td class="val">${v('شانه_یک')}</td>
                        <td class="val" colspan="2">${v('شانه_دو')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">آستین</td>
                        <td class="val">${v('آستین_یک')}</td>
                        <td class="val">${v('آستین_دو')}</td>
                        <td class="val">${v('آستین_سه')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">بغل</td>
                        <td class="val" colspan="3">${v('بغل')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">دامن</td>
                        <td class="val" colspan="3">${v('دامن')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">گردن</td>
                        <td class="val" colspan="3">${v('گردن')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">شلوار</td>
                        <td class="val" colspan="3">${v('شلوار')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">پاچه</td>
                        <td class="val" colspan="3">${v('دم_پاچه')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">ب</td>
                        <td class="val">${v('بر_تمبان')}</td>
                        <td class="lbl" style="border-right:${bThin} solid #bbb">خ</td>
                        <td class="val">${v('خشتک')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">چاک پتی</td>
                        <td class="val">${v('چاک_پتی')}</td>
                        <td class="lbl" style="border-right:${bThin} solid #bbb">زیربقل</td>
                        <td class="val">${v('دور_سینه')}</td>
                    </tr>
                </table>
            </td>

            <!-- مدل - چپ -->
            ${cfg.showModel ? `
            <td class="col-model">
                <div class="model-title">مدل</div>
                <div class="model-body">${escapeHtml(modelText || '—')}</div>
            </td>
            ` : ''}
        </tr>

        <!-- ردیف پایین: تعداد سفارش / زیربقل / مقدار -->
        <tr class="footer-row">
            <td colspan="2">
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td class="footer-lbl">تعداد سفارش</td>
                        <td style="border-right:${bThin} solid #bbb;border-left:${bThin} solid #bbb;padding:0 2mm;min-width:8mm;text-align:center;font-weight:bold;">${v('تعداد_سفارش')}</td>
                        <td class="footer-lbl" style="padding-right:2mm;">مقدار تکه</td>
                        <td style="padding:0 2mm;min-width:8mm;text-align:center;font-weight:bold;">${v('مقدار_تکه')}</td>
                    </tr>
                </table>
            </td>
        </tr>

        ${cfg.showPrice && orderCalc.total !== null ? `
        <tr class="footer-row">
            <td colspan="2" style="padding:${cfg.padding}mm 2mm;">
                ${orderCalc.quantity > 1
                    ? `${orderCalc.quantity} جوره × ${formatPrice(orderCalc.unitPrice)} = <strong>${formatPrice(orderCalc.total)} ${currentCurrency}</strong>`
                    : `مبلغ کل: <strong>${formatPrice(orderCalc.total)} ${currentCurrency}</strong>`}
            </td>
        </tr>
        ` : ''}

        ${cfg.showDelivery && customer.deliveryDay ? `
        <tr class="footer-row">
            <td colspan="2" style="padding:${cfg.padding}mm 2mm;">
                تحویل: <strong>${escapeHtml(customer.deliveryDay)}</strong>
            </td>
        </tr>
        ` : ''}

        ${cfg.showNotes && customer.notes ? `
        <tr class="footer-row">
            <td colspan="2" style="padding:${cfg.padding}mm 2mm; white-space:pre-line; font-size:10px;">
                توضیحات: ${escapeHtml(customer.notes)}
            </td>
        </tr>
        ` : ''}
    </table>

</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) {
        showNotification('لطفاً popup را در مرورگر مجاز کنید', 'warning');
        return;
    }
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}


function printProfessionalInvoice() {
    if (currentCustomerIndex === null) {
        showNotification('لطفاً ابتدا یک مشتری انتخاب کنید', 'warning');
        return;
    }

    const customer = customers[currentCustomerIndex];
    const today = new Date();
    const persianDate = today.toLocaleDateString('fa-IR');
    const modelText = buildModelText(customer);
    const cfg = getPrintSettings();
    const orderCalc = computeOrderTotal(customer);

    const printContent = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <title>فاکتور ALFAJR</title>
    <style>
        @page { 
            size: 76mm auto; 
            margin: 0mm; 
            padding: 0;
        }
        body { 
            width: 72mm; 
            padding: 5mm; 
            font-family: 'Vazirmatn', 'IRANSans', 'Noto Naskh Arabic', 'Noto Sans Arabic', Tahoma, Arial, sans-serif; 
            font-size: 14px; 
            margin: 0 auto;
            background: white;
            color: black;
            line-height: 1.5;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        .invoice {
            padding: 3mm;
        }
        .header {
            text-align: center;
            padding-bottom: 2mm;
            margin-bottom: 3mm;
        }
        .logo {
            font-size: 18px;
            font-weight: bold;
            color: #000;
            margin-bottom: 1mm;
        }
        .contact {
            font-size: 12px;
        }
        .customer-info {
            margin: 3mm 0;
            padding: 2mm;
            background: #f5f5f5;
            border-radius: 1px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1mm;
            font-size: 12px;
        }
        .info-label {
            font-weight: bold;
            min-width: 20mm;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin: 3mm 0;
        }
        .details-table td {
            padding: 1.5mm;
            vertical-align: middle;
        }
        .col-label {
            width: 30%;
            background: #f8f8f8;
            font-weight: bold;
        }
        .col-value {
            width: 70%;
        }
        .price-section {
            text-align: center;
            margin: 3mm 0;
            padding: 2mm;
            border: 1px solid #000;
            border-radius: 1px;
        }
        .price-label {
            font-size: 13px;
            font-weight: bold;
        }
        .price-amount {
            font-size: 16px;
            font-weight: bold;
            color: #000;
            margin-top: 2mm;
        }
        .thank-you {
            text-align: center;
            margin-top: 3mm;
            padding: 2mm;
            border-top: 0.5px solid #000;
            font-size: 11px;
            color: #000;
        }
        .brand {
            font-weight: bold;
            font-size: 12px;
        }
        @media print {
            body {
                margin: 0;
                padding: 5mm;
            }
        }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <div class="logo">${cfg.shopName ? escapeHtml(cfg.shopName) : 'ALFAJR خیاطی'}</div>
            <div class="contact">۰۷۹۹۷۹۹۰۰۹</div>
        </div>
        
        <div class="customer-info">
            <div class="info-row">
                <span class="info-label">مشتری:</span>
                <span class="info-value">${escapeHtml(customer.name || 'بدون نام')}</span>
            </div>
            ${cfg.showPhone ? `
            <div class="info-row">
                <span class="info-label">تلفن:</span>
                <span class="info-value">${escapeHtml(customer.phone || 'بدون شماره')}</span>
            </div>
            ` : ''}
            ${cfg.showCode ? `
            <div class="info-row">
                <span class="info-label">کد مشتری:</span>
                <span class="info-value">${escapeHtml(customer.id)}</span>
            </div>
            ` : ''}
            ${cfg.showDate ? `
            <div class="info-row">
                <span class="info-label">تاریخ:</span>
                <span class="info-value">${persianDate}</span>
            </div>
            ` : ''}
        </div>
        
        <table class="details-table">
            ${cfg.showModel ? `
            <tr>
                <td class="col-label">مدل</td>
                <td class="col-value" style="white-space:pre-line;">${escapeHtml(modelText || '-')}</td>
            </tr>
            ` : ''}
            ${cfg.showPrice && orderCalc.hasQuantity ? `
            <tr>
                <td class="col-label">تعداد سفارش</td>
                <td class="col-value">${orderCalc.quantity} جوره</td>
            </tr>
            ` : ''}
            ${cfg.showDelivery ? `
            <tr>
                <td class="col-label">تاریخ تحویل</td>
                <td class="col-value">${escapeHtml(customer.deliveryDay || '-')}</td>
            </tr>
            ` : ''}
        </table>
        
        ${cfg.showPrice && orderCalc.total !== null ? `
        <div class="price-section">
            ${orderCalc.quantity > 1 ? `
            <div style="font-size:11px; margin-bottom:1.5mm;">
                ${orderCalc.quantity} جوره &times; ${formatPrice(orderCalc.unitPrice)} ${currentCurrency}
            </div>
            ` : ''}
            <div class="price-label">مبلغ قابل پرداخت</div>
            <div class="price-amount">${formatPrice(orderCalc.total)} ${currentCurrency}</div>
            ${customer.paymentReceived ? 
                '<div style="color: green; font-size: 11px; margin-top: 1mm;">پرداخت شده</div>' : 
                '<div style="color: red; font-size: 11px; margin-top: 1mm;">پرداخت نشده</div>'}
        </div>
        ` : ''}
        
        ${cfg.showNotes && customer.notes ? `
        <div class="customer-info" style="white-space:pre-line; font-size:11px;">
            توضیحات: ${escapeHtml(customer.notes)}
        </div>
        ` : ''}
        
        <div class="thank-you">
            <div>با تشکر از انتخاب شما</div>
            <div class="brand">${cfg.shopName ? escapeHtml(cfg.shopName) : 'برند الفجر'}</div>
        </div>
    </div>
    
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() {
                    window.close();
                }, 500);
            }, 300);
        };
        window.onbeforeunload = null;
    </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=600,height=800,toolbar=no,scrollbars=no,status=no');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
    } else {
        showNotification('لطفاً popup blocker را غیرفعال کنید', 'error');
    }
}

function addPrintButtons() {
    const printContainer = document.getElementById('printButtonsContainer');
    if (printContainer) {
        printContainer.innerHTML = `
            <button class="btn-primary" onclick="printFullTable()">
                <i class="fas fa-print"></i>
                چاپ لیبل اندازه
            </button>
            <button class="btn-secondary" onclick="printProfessionalInvoice()">
                <i class="fas fa-file-invoice"></i>
                چاپ فاکتور
            </button>
            <button class="btn-secondary" onclick="openPrintSettings()" title="تنظیمات چاپ لیبل" style="padding: 10px 14px;">
                <i class="fas fa-sliders-h"></i>
                تنظیمات چاپ
            </button>
        `;
    }
}
# راهنمای توسعه‌دهنده — سیستم ALFAJR

> هر بار که خواستی چیزی تغییر بدی، اول این فایل رو بخون.

---

## ساختار فایل‌ها

```
/
├── index.html              ← ساختار HTML، منوی تنظیمات، modal مشتری جدید
├── manifest.json           ← تنظیمات PWA (نام اپ، آیکون، رنگ)
├── service-worker.js       ← کش آفلاین — هر فایل جدید JS/CSS اینجا اضافه کن
│
├── css/
│   ├── main.css            ← استایل اصلی (همه کامپوننت‌ها)
│   ├── theme.css           ← استایل تم‌های dark / light / vivid
│   └── responsive.css      ← استایل موبایل و تبلت
│
└── js/
    ├── config.js           ← تنظیمات مرکزی + متغیرهای global
    ├── customer.js         ← کلاس Customer + توابع کمکی (escapeHtml, formatPrice...)
    ├── database.js         ← DatabaseManager — تمام عملیات IndexedDB
    ├── ui.js               ← رندر لیست مشتریان، جستجو، پروفایل، modal
    ├── profile.js          ← رندر اندازه‌ها، مدل‌ها، قیمت، سفارشات
    ├── print.js            ← چاپ لیبل اندازه + فاکتور
    ├── theme.js            ← مدیریت تم‌ها
    └── main.js             ← راه‌اندازی اپ، auto-backup، currency، shortcuts
```

---

## راهنمای تغییرات رایج

### ۱. اضافه کردن فیلد اندازه‌گیری جدید
**۳ فایل** باید تغییر کنن:

**`js/config.js`** — فیلد رو به آرایه اضافه کن:
```js
MEASUREMENT_FIELDS: [
    "قد", "شانه_یک", ...
    "مقدار_تکه",
    "فیلد_جدید"   // ← اینجا اضافه کن
],
```

**`js/profile.js`** — برچسب فارسی اضافه کن:
```js
const MEASUREMENT_LABELS = {
    ...
    "فیلد_جدید": "نام نمایشی فارسی",   // ← اینجا
};
```
و گروهش رو مشخص کن در `MEASUREMENT_GROUPS`:
```js
{ title: "بالاتنه", fields: [..., "فیلد_جدید"] }
```

**`js/print.js`** — ردیف جدید به جدول چاپ اضافه کن:
```html
<tr>
    <td class="measurement-label">نام فیلد:</td>
    <td class="measurement-value">${customer.measurements.فیلد_جدید || '-'}</td>
</tr>
```

---

### ۲. تغییر یا اضافه کردن مدل (یخن، آستین، دامن، ویژگی)
فقط **`js/config.js`**:
```js
YAKHUN_MODELS:   [..., "مدل جدید"],
SLEEVE_MODELS:   [..., "مدل جدید"],
SKIRT_MODELS:    [..., "مدل جدید"],
FEATURES_LIST:   [..., "ویژگی جدید"],
```

---

### ۳. تغییر روزهای هفته
فقط **`js/config.js`**:
```js
DAYS_OF_WEEK: ["شنبه", "یکشنبه", ...],
```

---

### ۴. تغییر ظاهر کارت مشتری در لیست
فقط **`js/ui.js`** — تابع `renderCustomerList()`

---

### ۵. تغییر ساختار لیبل چاپی (۷۶mm)
فقط **`js/print.js`** — تابع `printFullTable()`

---

### ۶. تغییر ساختار فاکتور
فقط **`js/print.js`** — تابع `printProfessionalInvoice()`

---

### ۷. تغییر رنگ یا استایل
- رنگ اصلی (طلایی): `#D4AF37` — در `main.css` و `theme.css`
- تم dark: `body.dark-mode` در `theme.css`
- تم light: `body.light-mode` در `theme.css`
- تم vivid: `body.vivid-mode` در `theme.css`

---

### ۸. اضافه کردن واحد پول جدید
**`index.html`** — دکمه جدید اضافه کن:
```html
<button class="currency-option" onclick="setCurrency('پوند')">پوند</button>
```

---

### ۹. تغییر فاصله auto-backup
فقط **`js/config.js`**:
```js
DEFAULT_SETTINGS: {
    backupInterval: 24   // ← عدد رو به ساعت تغییر بده
}
```

---

### ۱۰. اضافه کردن آیتم جدید به منوی تنظیمات
فقط **`index.html`** — داخل `div#settingsDropdown`:
```html
<button onclick="تابعت()">
    <i class="fas fa-آیکون"></i>
    متن فارسی
</button>
```
و تابعش رو در فایل مناسب بنویس + به `window` export کن.

---

### ۱۱. اضافه کردن فایل JS جدید
**۲ جا** باید اضافه بشه:

**`index.html`** — قبل از `main.js`:
```html
<script src="js/فایل-جدید.js"></script>
```

**`service-worker.js`** — به آرایه `urlsToCache`:
```js
'js/فایل-جدید.js',
```
و **`CACHE_NAME` رو یه نسخه بالاتر ببر** تا مرورگرها cache قدیمی رو پاک کنن:
```js
const CACHE_NAME = 'alfajr-v5.2';  // ← عدد رو زیاد کن
```

---

## قوانین کلی

| قانون | توضیح |
|-------|-------|
| هر تابع جدید | باید `window.تابع = تابع` در انتهای همون فایل باشه |
| هر متن | از `escapeHtml()` استفاده کن |
| هر قیمت | از `formatPrice()` استفاده کن |
| هر واحد پول | از `currentCurrency` استفاده کن، نه text ثابت |
| هر تم جدید | هم در `theme.js` و هم در `theme.css` باید اضافه بشه |
| ترتیب script ها | config → customer → database → ui → profile → print → theme → main |

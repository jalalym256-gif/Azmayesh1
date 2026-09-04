// ========== ALFAJR TAILORING MANAGEMENT SYSTEM ==========
// Version 5.0 - Professional Complete Edition
// Author: ALFAJR Team
// Phone: 0799799009
// Last Updated: 2024

// ========== CONFIGURATION ==========
const AppConfig = {
    DATABASE_NAME: 'ALFAJR_DB_V5',
    DATABASE_VERSION: 5,
    STORES: {
        CUSTOMERS: 'customers',
        SETTINGS: 'settings',
        BACKUP: 'backups'
    },
    
    MEASUREMENT_FIELDS: [
        "قد", "شانه_یک", "شانه_دو", "آستین_یک", "آستین_دو", "آستین_سه",
        "بغل", "دامن", "گردن", "دور_سینه", "شلوار", "دم_پاچه",
        "بر_تمبان", "خشتک", "چاک_پتی", "تعداد_سفارش", "مقدار_تکه"
    ],
    
    YAKHUN_MODELS: ["آف دار", "چپه یخن", "پاکستانی", "ملی", "شهبازی", "خامک", "قاسمی", "عربی"],
    SLEEVE_MODELS: ["کفک", "ساده شیش بخیه", "بندک", "پر بخیه", "آف دار", "لایی یک انچ", "محرابی", "خامک"],
    SKIRT_MODELS:  ["دامن یک بخیه", "دامن دوبخیه", "دامن چهارکنج", "دامن ترخیز", "دامن گاوی"],
    FEATURES_LIST: ["جیب رو", "جیب شلوار", "یک بخیه سند", "دو بخیه سند", "مکمل دو بخیه", "مدل الماسی"],
    BUTTON_MODELS: ["دکمه ساده", "دکمه مدل", "دکمه فلزی", "دکمه کلفت", "دکمه ریلی", "دکمه نگین"],
    DAYS_OF_WEEK: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"],

    // زیرگزینه‌هایی که با انتخاب یک مدل خاص (در هر دسته) اضافه می‌شوند
    // ساختار: SUB_OPTIONS[نوع دسته][نام مدل] = لیست زیرگزینه‌های تک‌انتخابی آن مدل
    SUB_OPTIONS: {
        sleeve: {
            "کفک": ["بی پلت", "با پلت", "گول", "سه کنج", "چهارکنج"],
            "ساده شیش بخیه": ["ساده ۳ بخیه", "ساده ۴ بخیه", "ساده ۵ بخیه", "ساده ۶ بخیه"],
            "آف دار": ["گول", "راسته"]
        },
        features: {
            "جیب رو": ["مارک فارسی", "انگلیسی", "گلدوزی", "بی مارک"]
        }
    },
    
    DEFAULT_SETTINGS: {
        theme: 'dark',
        currency: 'افغانی',
        autoSave: true,
        backupInterval: 24   // ساعت — هر ۲۴ ساعت یه‌بار auto-backup
    }
};

// ========== GLOBAL VARIABLES ==========
let customers = [];
let currentCustomerIndex = null;
let dbManager = null;
let currentTheme = 'dark';
let currentCurrency = 'افغانی';   // از settings لود میشه
let saveTimeout = null;
let isInitialized = false;        // وضعیت راه‌اندازی کل اپ

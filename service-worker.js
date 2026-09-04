const CACHE_NAME = 'alfajr-v6';

const CORE_FILES = [
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/theme.css',
  './css/responsive.css',
  './css/icons.css',
  './js/config.js',
  './js/customer.js',
  './js/database.js',
  './js/ui.js',
  './js/profile.js',
  './js/print.js',
  './js/theme.js',
  './js/main.js',
];

const OPTIONAL_FILES = [
  './assets/icon-192.png',
  './assets/icon-512.png',
];

// ========== نصب ==========
self.addEventListener('install', event => {
  console.log('🔧 [SW] شروع نصب...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('📦 [SW] در حال cache کردن فایل‌ها...');
      
      let successCount = 0;
      let failCount = 0;

      // CORE FILES
      for (const url of CORE_FILES) {
        try {
          await cache.add(url);
          console.log(`✅ [SW] ${url}`);
          successCount++;
        } catch (e) {
          console.error(`❌ [SW] خطا در cache: ${url}`, e.message);
          failCount++;
        }
      }

      // OPTIONAL FILES
      for (const url of OPTIONAL_FILES) {
        try {
          await cache.add(url);
          console.log(`✅ [SW] ${url} (اختیاری)`);
          successCount++;
        } catch (e) {
          console.warn(`⚠️ [SW] فایل اختیاری نبود: ${url}`);
        }
      }

      console.log(`📊 [SW] نتیجه: ${successCount} موفق, ${failCount} خطا`);
      console.log('✅ [SW] نصب کامل شد');
      return self.skipWaiting();
    }).catch(err => {
      console.error('❌ [SW] نصب شکست خورد:', err);
      throw err;
    })
  );
});

// ========== فعال‌سازی ==========
self.addEventListener('activate', event => {
  console.log('⚡ [SW] فعال‌سازی...');
  
  event.waitUntil(
    caches.keys().then(names => {
      const oldCaches = names.filter(n => n !== CACHE_NAME);
      console.log(`🗑️ [SW] پاک کردن ${oldCaches.length} cache قدیمی`);
      
      return Promise.all(
        oldCaches.map(name => {
          console.log(`🗑️ [SW] حذف: ${name}`);
          return caches.delete(name);
        })
      );
    }).then(() => {
      console.log('✅ [SW] فعال شد - CACHE:', CACHE_NAME);
      return self.clients.claim();
    })
  );
});

// ========== fetch ==========
self.addEventListener('fetch', event => {
  // blob و print رو رد کن
  if (event.request.url.startsWith('blob:') ||
      event.request.url.includes('print')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }

      // برای فایل‌های جدید log نکن تا console شلوغ نشه
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(err => {
        // آفلاین
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        console.warn('[SW] آفلاین:', event.request.url);
      });
    })
  );
});

// ========== message ==========
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ [SW] skipWaiting درخواست شد');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('🚀 [SW] service-worker.js لود شد - نسخه:', CACHE_NAME);

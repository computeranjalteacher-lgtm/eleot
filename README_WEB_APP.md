# ELEOT Web App - دليل الاستخدام

## تشغيل التطبيق / Running the App

### ⚠️ مهم جداً / Very Important

**يجب تشغيل التطبيق من خادم ويب وليس بفتح الملف مباشرة**
**You must run the app from a web server, not by opening the file directly**

### الطريقة الصحيحة / Correct Method

#### خيار 1: استخدام Python (موصى به) / Option 1: Using Python (Recommended)

```bash
# Python 3
python3 -m http.server 8000

# ثم افتح المتصفح على:
# Then open browser to:
http://localhost:8000
```

#### خيار 2: استخدام Node.js / Option 2: Using Node.js

```bash
# تثبيت http-server
# Install http-server
npm install -g http-server

# تشغيل الخادم
# Run server
http-server -p 8000

# ثم افتح المتصفح على:
# Then open browser to:
http://localhost:8000
```

#### خيار 3: استخدام VS Code Live Server / Option 3: Using VS Code Live Server

1. تثبيت إضافة "Live Server" في VS Code
2. انقر بزر الماوس الأيمن على `index.html`
3. اختر "Open with Live Server"

### ❌ الطريقة الخاطئة / Wrong Method

**لا تفتح `index.html` مباشرة من الملف**
**Do NOT open `index.html` directly from the file**

إذا فتحت الملف مباشرة (`file://`)، ستحصل على خطأ:
"التكوين غير محمل" أو "Configuration not loaded"

If you open the file directly (`file://`), you'll get an error:
"التكوين غير محمل" or "Configuration not loaded"

## الملفات المطلوبة / Required Files

تأكد من وجود الملفات التالية:
Make sure these files exist:

```
/
├── index.html
├── app.js
├── api.js
├── style.css
├── utils.js
├── config/
│   └── eleot_ai_config.json  ← مهم جداً / Very important
├── images/
│   ├── logo.png
│   └── header.png
└── libs/
    └── jspdf.umd.min.js
```

## حل المشاكل / Troubleshooting

### خطأ: "التكوين غير محمل" / Error: "Configuration not loaded"

**الحل / Solution:**
1. تأكد من تشغيل التطبيق من خادم ويب (ليس file://)
2. تأكد من وجود ملف `config/eleot_ai_config.json`
3. أعد تحميل الصفحة

**Solution:**
1. Make sure you're running the app from a web server (not file://)
2. Make sure `config/eleot_ai_config.json` exists
3. Reload the page

### خطأ: CORS / CORS Error

**الحل / Solution:**
استخدم خادم ويب محلي (Python أو Node.js)
Use a local web server (Python or Node.js)

## المتصفحات المدعومة / Supported Browsers

- ✅ Safari iOS (iPad, iPhone)
- ✅ Chrome Mobile (Android)
- ✅ Safari Desktop
- ✅ Chrome Desktop
- ✅ Firefox Desktop/Mobile
- ✅ Edge Desktop/Mobile

## الميزات / Features

- ✅ تصميم متجاوب للجوال / Mobile responsive design
- ✅ دعم العربية والإنجليزية / Arabic and English support
- ✅ يعمل بدون إنترنت (بعد التحميل الأول) / Works offline (after initial load)
- ✅ جاهز للتثبيت كـ PWA / Ready for PWA installation


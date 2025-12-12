# دليل النشر - ELEOT Web App
# Deployment Guide - ELEOT Web App

## الطريقة الأسهل: Netlify (موصى به) / Easiest Method: Netlify (Recommended)

### خطوات النشر / Deployment Steps:

#### الطريقة 1: السحب والإفلات / Method 1: Drag & Drop

1. **اذهب إلى Netlify** / Go to Netlify:
   - [https://app.netlify.com](https://app.netlify.com)
   - سجل حساب مجاني / Sign up for free account

2. **اسحب مجلد المشروع** / Drag project folder:
   - اسحب مجلد `New_eleot_IOS` كاملاً إلى صفحة Netlify
   - Drag the entire `New_eleot_IOS` folder to Netlify page

3. **انتظر النشر** / Wait for deployment:
   - ستحصل على رابط مثل: `https://your-app-name.netlify.app`
   - You'll get a link like: `https://your-app-name.netlify.app`

#### الطريقة 2: استخدام Netlify CLI / Method 2: Using Netlify CLI

```bash
# تثبيت Netlify CLI / Install Netlify CLI
npm install -g netlify-cli

# الانتقال لمجلد المشروع / Navigate to project folder
cd /Users/hesham_y_yhotmail.com/Desktop/New_eleot_IOS

# تسجيل الدخول / Login
netlify login

# النشر / Deploy
netlify deploy --prod
```

#### الطريقة 3: ربط GitHub / Method 3: Connect GitHub

1. ارفع المشروع إلى GitHub / Push project to GitHub
2. في Netlify: New site from Git → اختر GitHub / Select GitHub
3. اختر المشروع / Select repository
4. Deploy site

---

## خيارات أخرى / Other Options

### Vercel

```bash
# تثبيت Vercel CLI / Install Vercel CLI
npm install -g vercel

# النشر / Deploy
vercel
```

### GitHub Pages

1. ارفع المشروع إلى GitHub / Push to GitHub
2. Settings → Pages
3. Source: Deploy from branch → main → / (root)
4. احفظ الرابط / Save the link

### Cloudflare Pages

1. اذهب إلى [dash.cloudflare.com](https://dash.cloudflare.com)
2. Pages → Create a project
3. اربط GitHub أو ارفع الملفات / Connect GitHub or upload files

---

## ملاحظات مهمة / Important Notes

### قبل النشر / Before Deployment:

1. ✅ تأكد من وجود جميع الملفات / Ensure all files exist:
   - `index.html`
   - `app.js`
   - `api.js`
   - `style.css`
   - `utils.js`
   - `config/eleot_ai_config.json`
   - `images/logo.png`
   - `images/header.png`
   - `libs/jspdf.umd.min.js`

2. ✅ اختبر التطبيق محلياً / Test locally:
   ```bash
   python3 -m http.server 8000
   # ثم افتح http://localhost:8000
   ```

3. ✅ تأكد من أن جميع المسارات نسبية / Ensure all paths are relative:
   - ✅ `config/eleot_ai_config.json` (صحيح)
   - ✅ `images/logo.png` (صحيح)
   - ❌ `/config/...` (خطأ - لا تستخدم `/` في البداية)

### بعد النشر / After Deployment:

1. **اختبر التطبيق** / Test the app:
   - افتح الرابط / Open the link
   - تأكد من تحميل التكوين / Ensure config loads
   - اختبر التقييم / Test evaluation

2. **إعدادات CORS** / CORS Settings:
   - Netlify و Vercel يدعمان CORS تلقائياً
   - Netlify and Vercel support CORS automatically

3. **HTTPS** / HTTPS:
   - جميع الخدمات توفر HTTPS تلقائياً
   - All services provide HTTPS automatically

---

## حل المشاكل / Troubleshooting

### مشكلة: التكوين لا يُحمّل / Config not loading

**الحل / Solution:**
- تأكد من وجود `config/eleot_ai_config.json` في المجلد
- Ensure `config/eleot_ai_config.json` exists in folder
- تأكد من أن المسار نسبي (ليس `/config/...`)
- Ensure path is relative (not `/config/...`)

### مشكلة: الصور لا تظهر / Images not showing

**الحل / Solution:**
- تأكد من وجود مجلد `images/` مع الملفات
- Ensure `images/` folder exists with files
- تحقق من أسماء الملفات (حساسة لحالة الأحرف)
- Check file names (case-sensitive)

### مشكلة: CORS Error

**الحل / Solution:**
- استخدم خادم ويب (Netlify/Vercel) وليس file://
- Use web server (Netlify/Vercel) not file://
- جميع الخدمات المذكورة تدعم CORS تلقائياً
- All mentioned services support CORS automatically

---

## روابط مفيدة / Useful Links

- **Netlify**: [https://netlify.com](https://netlify.com)
- **Vercel**: [https://vercel.com](https://vercel.com)
- **GitHub Pages**: [https://pages.github.com](https://pages.github.com)
- **Cloudflare Pages**: [https://pages.cloudflare.com](https://pages.cloudflare.com)

---

## دعم PWA / PWA Support

لتحويل التطبيق إلى PWA (يمكن تثبيته على الهاتف):

1. أضف `manifest.json` (يمكنني إنشاؤه)
2. أضف Service Worker (اختياري)
3. Netlify و Vercel يدعمان PWA تلقائياً

To convert app to PWA (installable on phone):

1. Add `manifest.json` (I can create it)
2. Add Service Worker (optional)
3. Netlify and Vercel support PWA automatically


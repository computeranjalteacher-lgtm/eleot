# إعداد الصور للتدريب - Images Setup Guide

## الخطوات المطلوبة

### 1. إنشاء مجلد الصور

أنشئ مجلد باسم `images` في المجلد الرئيسي للإضافة (نفس مستوى `popup.html` و `popup.js`).

### 2. إضافة الصور

ضع الصور التسعة التالية في مجلد `images`:

1. **eleot-ratings-guide.jpg** - دليل تقييم ELEOT 2.0
2. **eleot-tool.jpg** - أداة ELEOT 2.0
3. **environment-a.jpg** - البيئة A: التعلم العادل
4. **environment-b.jpg** - البيئة B: التوقعات العالية
5. **environment-c.jpg** - البيئة C: التعلم الداعم
6. **environment-d.jpg** - البيئة D: التعلم النشط
7. **environment-e.jpg** - البيئة E: مراقبة التقدم والملاحظات
8. **environment-f.jpg** - البيئة F: الإدارة الجيدة
9. **environment-g.jpg** - البيئة G: التعلم الرقمي

### 3. هيكل المجلد

```
Eleot/
├── images/
│   ├── eleot-ratings-guide.jpg
│   ├── eleot-tool.jpg
│   ├── environment-a.jpg
│   ├── environment-b.jpg
│   ├── environment-c.jpg
│   ├── environment-d.jpg
│   ├── environment-e.jpg
│   ├── environment-f.jpg
│   └── environment-g.jpg
├── popup.html
├── popup.js
├── popup.css
└── manifest.json
```

### 4. تحديث manifest.json

تم تحديث `manifest.json` بالفعل لدعم الصور. تأكد من وجود:

```json
"web_accessible_resources": [
  {
    "resources": ["images/*"],
    "matches": ["<all_urls>"]
  }
]
```

### 5. إعادة تحميل الإضافة

بعد إضافة الصور:
1. افتح `chrome://extensions/`
2. ابحث عن الإضافة
3. انقر على زر "إعادة التحميل" (Reload)
4. جرب فتح ملف من قائمة التدريب

## ملاحظات مهمة

- **صيغة الصور**: يُفضل استخدام JPG أو PNG
- **حجم الصور**: يُفضل أن لا يتجاوز 2-3 MB لكل صورة
- **الدقة**: يُفضل دقة 150-300 DPI للوضوح الجيد
- **الاسم**: يجب أن تطابق أسماء الملفات الأسماء المحددة في الكود بالضبط

## إذا لم تظهر الصور

1. تحقق من وجود الملفات في مجلد `images`
2. تحقق من صحة أسماء الملفات (حساسة لحالة الأحرف)
3. أعد تحميل الإضافة
4. افتح وحدة التحكم (F12) للتحقق من أي أخطاء

## عرض الترجمة العربية

حتى لو فشل تحميل الصورة، سيتم عرض الترجمة العربية أسفل رسالة الخطأ لشرح محتوى الصورة بالتفصيل.













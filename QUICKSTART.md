# Quick Start Guide

Get up and running with ELEOT AI Evaluator in 5 minutes!

## Step 1: Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the folder containing this extension

✅ Extension should now appear in your Chrome toolbar!

## Step 2: Set Up API Key (Optional for Testing)

### Quick Test Without API Key

The extension works with sample data if no API key is set. Just click "Evaluate" to see it in action!

### To Use Real AI Evaluation

1. Open the extension popup
2. Right-click → Inspect → Console tab
3. Run this command:
   ```javascript
   chrome.storage.local.set({ apiKey: 'your-openai-api-key-here' });
   ```
4. Refresh the extension popup

## Step 3: Generate Icons (Optional)

1. Open `generate-icons.html` in your browser
2. Click "Download All Icons"
3. Move the downloaded files to the `icons/` folder
4. Reload the extension

## Step 4: Test It!

1. Click the extension icon
2. Select a language (English or Arabic)
3. Paste a lesson description
4. Click "Evaluate"
5. View results and export if needed

## Sample Lesson Description

Try this sample text to test:

**English:**
```
The teacher started the lesson with a warm-up question about photosynthesis. Students worked in pairs to conduct experiments with plants. The teacher walked around providing feedback. Students presented their findings using digital slides. Assessment included both group presentations and individual quizzes.
```

**Arabic:**
```
بدأ المعلم الحصة بسؤال تحفيزي حول البناء الضوئي. عمل الطلاب في أزواج لإجراء تجارب على النباتات. تجول المعلم لتقديم الملاحظات. قدم الطلاب نتائجهم باستخدام الشرائح الرقمية. شمل التقييم العروض الجماعية والاختبارات الفردية.
```

## Troubleshooting

- **Extension not showing?** Make sure Developer Mode is enabled
- **No results?** Check browser console (F12) for errors
- **API errors?** Verify your API key is correct
- **Missing icons?** Generate them using `generate-icons.html`

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Set up the [proxy server](proxy.js) for production use
- Customize the configuration in `config/eleot_ai_config.json`

---

**Happy Evaluating! 🎓**

# ELEOT Training Files Setup Guide

## How to Add Training Files from Google Drive

### Step 1: Get File IDs from Google Drive

1. Open the Google Drive folder: https://drive.google.com/drive/folders/1ycpDFacexza7FUmNysPEtqZMsd14vEGP?usp=sharing
2. For each file you want to include:
   - Right-click on the file
   - Select "Get link" or "Share"
   - Make sure the file is set to "Anyone with the link can view"
   - Copy the link
   - Extract the File ID from the URL

### Step 2: Extract File ID from URL

Google Drive URLs have this format:
```
https://drive.google.com/file/d/FILE_ID/view
```

The `FILE_ID` is the long string between `/d/` and `/view`.

Example:
- URL: `https://drive.google.com/file/d/1ABC123xyz456DEF789/view`
- File ID: `1ABC123xyz456DEF789`

### Step 3: Add Files to the Application

Open `popup.js` and find the `getTrainingFilesFromDrive` function (around line 1600).

Update the return array with your files:

```javascript
const getTrainingFilesFromDrive = async () => {
  return [
    {
      id: 'YOUR_FILE_ID_1',
      name: currentLanguage === 'ar' ? 'اسم الملف بالعربية' : 'File Name in English',
      type: 'pdf', // or 'video', 'doc', 'docx', 'ppt', 'pptx'
      icon: '📄' // Choose appropriate icon
    },
    {
      id: 'YOUR_FILE_ID_2',
      name: currentLanguage === 'ar' ? 'اسم ملف آخر' : 'Another File Name',
      type: 'video',
      icon: '🎥'
    }
    // Add more files as needed
  ];
};
```

### Supported File Types

- **pdf**: PDF documents
- **video**: Video files (MP4, etc.)
- **doc/docx**: Word documents (will open in Google Docs viewer)
- **ppt/pptx**: PowerPoint presentations (will open in Google Slides viewer)
- **other**: Generic files (will attempt to open in Drive viewer)

### Important Notes

1. **File Permissions - CRITICAL**: 
   - **You MUST set files to "Anyone with the link can view" for them to work in the embedded viewer**
   - Steps to make files publicly accessible:
     1. Open the file in Google Drive
     2. Right-click on the file
     3. Select "Share" or "Get link"
     4. Click on "Change" next to access settings
     5. Select "Anyone with the link"
     6. Set permission to "Viewer" (not Editor or Commenter)
     7. Click "Done"
   - **Without this setting, files will show an error message instead of displaying**

2. **File Names**: Provide both Arabic and English names for bilingual support
3. **File Icons**: Use appropriate emoji icons (📄 for PDF, 🎥 for video, 📊 for presentations, etc.)

### Troubleshooting

**Problem**: Files show error "The file you requested does not exist"

**Solution**: 
1. Check that the file ID is correct
2. **Most importantly**: Ensure the file is set to "Anyone with the link can view"
3. Try opening the file directly in Google Drive using the "Open in Google Drive" button
4. If the file opens in Google Drive but not in the viewer, the permission settings need to be adjusted

**Alternative Solutions**:
- If embedding doesn't work, users can:
  - Click "Open in Google Drive" to view the file in a new tab
  - Click "Download File" to download and view locally
  - Use the "Alternative Method" button to try Google Docs Viewer

### Alternative: Using Google Drive API

For automatic file listing, you can implement Google Drive API integration:

1. Enable Google Drive API in Google Cloud Console
2. Get API credentials
3. Implement OAuth 2.0 authentication
4. Use Drive API to list files from the folder

This requires more setup but provides automatic file discovery.


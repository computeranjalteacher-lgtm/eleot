# Smart Observation Tool (ELEOT) - Web Application

A professional web application for evaluating classroom observations using the ELEOT framework.

## Features

- 🔐 Google OAuth Authentication
- 📝 Observation Evaluation with AI Analysis
- 💾 Save observations to user account
- 📊 Visit History and Comparison
- 📄 Export to PDF, Word, or Copy
- 🌐 Full Arabic RTL Support
- 📱 Mobile Responsive Design

## Setup Instructions

### 1. Install Dependencies

```bash
cd eleot-web-app
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication > Sign-in method > Google
3. Create a Firestore database
4. Copy your Firebase config to `src/config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Firestore Security Rules

Set up Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /observations/{observationId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### 4. Run Development Server

```bash
npm run dev
```

The application will open at `http://localhost:3000`

## Project Structure

```
eleot-web-app/
├── src/
│   ├── components/          # Reusable components
│   ├── config/             # Configuration files
│   ├── pages/              # Main pages
│   ├── services/           # API and service functions
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Usage

1. **Sign In**: Use Google OAuth to sign in
2. **Create Observation**: 
   - Enter teacher name and date
   - Select ELEOT environments to evaluate
   - Paste or type observation notes
   - Click "Evaluate"
3. **View Results**: See scores, justifications, and recommendations
4. **Save**: Save observation to your account
5. **Export**: Export to PDF, Word, or copy to clipboard
6. **Compare**: Compare two visits side-by-side

## Technologies

- React 18
- Vite
- TailwindCSS
- Firebase (Authentication & Firestore)
- jsPDF (PDF export)
- React Router

## License

MIT


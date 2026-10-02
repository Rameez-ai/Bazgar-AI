# Bazgar Sangat AI (بازگر سنگت اے آئی) - Progressive Web App (PWA)

Welcome to the **Bazgar Sangat AI PWA** learning and demo project. This project converts the original [Bazgar_AI](https://github.com/precious-05/Bazgar_AI) application into an installable **Progressive Web App (PWA)** while maintaining its original HTML5/CSS3/JavaScript frontend and FastAPI + TensorFlow Lite backend architecture.

---

## 📱 What is a PWA (Progressive Web App)?

A Progressive Web App is a web application that uses modern web capabilities (such as Service Workers and Web App Manifests) to deliver an app-like experience directly through the browser.

### Key PWA Features in Bazgar AI:
1. **Installable**: Can be added directly to the home screen or desktop taskbar without going through an app store.
2. **App Shell Offline Caching**: The core HTML, CSS, JavaScript, icons, and fonts load instantly even without an active internet connection.
3. **Standalone UI**: Displays in full-screen standalone mode without browser URL bars or navigation buttons.
4. **Service Worker**: Intercepts network requests and manages smart caching strategies (Cache-First for static UI, Network-First for images/audio).

---

## 🏗️ Architecture & File Structure

```
Bazgar_PWA/
├── frontend/                     # Progressive Web App Frontend
│   ├── index.html                # Single-page UI with nav, detection, assistant, chatbot
│   ├── style.css                 # Custom CSS styling (Balochi theme & glassmorphism)
│   ├── app.js                    # Core logic (camera, disease UI, RL assistant, voice)
│   ├── manifest.json             # Web App Manifest (PWA metadata & icons config)
│   ├── sw.js                     # Service worker (caching & offline shell handling)
│   ├── icons/
│   │   ├── icon-192.png          # PWA icon (192×192)
│   │   └── icon-512.png          # PWA icon (512×512)
│   └── assets/                   # Media assets
│       ├── b1.png ~ b15.png      # Hero slider images (7 images)
│       └── d0.wav ~ d3.wav       # Balochi voice diagnosis audio files (4 files)
│
├── backend/                      # Python FastAPI ML Backend
│   ├── backend.py                # FastAPI app with CORS & /predict endpoint
│   └── apple_disease_model.tflite # TensorFlow Lite model (Blotch, Normal, Rot, Scab)
│
└── README.md                     # Documentation & setup guide
```

---

## 🛠️ Reused vs. Omitted Files

| Original Path | Action | Rationale |
|---|---|---|
| `index.html`, `style.css`, `app.js` | ✅ Included & Updated | Core UI and application logic. Added PWA meta tags, manifest, and Service Worker. |
| `backend.py`, `apple_disease_model.tflite` | ✅ Included | FastAPI server and 1.6MB TFLite machine learning inference model. |
| `b1, b3, b5, b7, b13, b14, b15.png` | ✅ Included | Active hero carousel images referenced in `index.html`. Moved into `frontend/assets/`. |
| `d0.wav ~ d3.wav` | ✅ Included | Balochi voice feedback files for disease prediction results. Moved into `frontend/assets/`. |
| `app2.js` | ❌ Omitted | Orphaned script file not referenced in `index.html`. |
| `b2, b4, b6, b8, b9, b10, b22.png` | ❌ Omitted | Unused image files not referenced anywhere in code. |
| `agent/`, `privacy_policy/` | ❌ Omitted | Standalone sub-modules not part of the main application. |
| `translation_csv/` | ❌ Omitted | Internal developer reference spreadsheet. |

---

## ⚡ How the App Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Client PWA                     │
│  [index.html + style.css + app.js + Service Worker sw.js]   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
      (Static File Server)           (API POST /predict)
               │                              │
               ▼                              ▼
    ┌────────────────────┐         ┌────────────────────┐
    │  Local Web Server  │         │  FastAPI Backend   │
    │ (http://localhost: │         │ (http://localhost: │
    │        5500)       │         │        8000)       │
    └────────────────────┘         └──────────┬─────────┘
                                              │
                                              ▼
                                   ┌────────────────────┐
                                   │   TFLite Model     │
                                   │ (224x224 RGB image │
                                   │  → 4 Class Prob)   │
                                   └────────────────────┘
```

1. **Frontend**: HTML5 UI with a multi-page section switcher (`Home`, `Detection`, `Translator`, `Crop Assistant`, `Chatbot`, `Data Hub`).
2. **Camera / Image Capture**: User captures or uploads an apple leaf image.
3. **ML Prediction**: Sends `POST /predict` to `http://localhost:8000/predict`.
4. **FastAPI Backend**: Preprocesses image to `224×224 RGB` float array (`[0, 1]`), runs `tflite.Interpreter`, returns predicted disease class and confidence percentage.
5. **Balochi Voice Feedback**: Plays `assets/d{index}.wav` for spoken diagnosis in Balochi.
6. **RL Crop Assistant**: Built-in rule engine suggesting optimal crop actions based on soil type, season, and rainfall.

---

## 📶 Offline Capabilities vs. Online Requirements

- **Offline Support (PWA Service Worker)**:
  - The UI shell, styling, JavaScript, navigation, icons, and pre-cached pages load instantly offline.
  - Media files (hero images and audio files) are cached on first view.

- **Backend / Prediction Requirement**:
  - Image disease prediction (`/predict`) requires the local FastAPI backend server to be running (`http://localhost:8000`).
  - If the backend is unreachable or offline, the PWA gracefully displays a friendly offline warning message without crashing.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.8+ installed
- Web browser (Google Chrome, Microsoft Edge, or Safari)

---

### Step 1: Start the Backend (FastAPI + TFLite)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd Bazgar_PWA/backend
   ```

2. Install required Python packages:
   ```bash
   pip install fastapi uvicorn tensorflow numpy pillow python-multipart
   ```

3. Start the FastAPI server:
   ```bash
   python backend.py
   ```
   *The backend will run on `http://localhost:8000` with model loaded.*

---

### Step 2: Start the Frontend PWA

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd Bazgar_PWA/frontend
   ```

2. Start a local HTTP web server:
   ```bash
   python -m http.server 5500
   ```

3. Open your browser and go to:
   ```
   http://localhost:5500
   ```

---

## 📲 How to Install as a PWA

### On Desktop (Google Chrome / Microsoft Edge):
1. Open `http://localhost:5500` in Chrome or Edge.
2. Look at the address bar on the right — click the **"Install Bazgar AI"** icon (or click the 3-dot menu → **Install Bazgar AI...**).
3. Click **Install**.
4. The application will launch in its own standalone window with its taskbar icon!

### On Android (Chrome):
1. Serve the app over your local Wi-Fi IP address (e.g. `http://192.168.x.x:5500`).
2. Open Chrome on Android and navigate to the address.
3. Tap the 3-dot menu and select **"Add to Home Screen"** / **"Install App"**.

### On iOS (Safari):
1. Open the URL in Safari on iOS.
2. Tap the **Share** button.
3. Tap **"Add to Home Screen"**.

---

## 🛠️ Configuration Notes

- To change the backend API endpoint (e.g., if hosted on a remote server or custom IP), edit `const API_URL = 'http://localhost:8000';` at the top of `frontend/app.js`.

---

## 📜 License

Demonstration and learning project based on the original [Bazgar AI](https://github.com/precious-05/Bazgar_AI) repository by precious-05.

# J.A.R.V.I.S. — Desktop AI Assistant 🤖

A voice-activated AI desktop assistant inspired by the JARVIS from Iron Man.
Always listening, never stores data, powered by multiple AI models via OpenRouter.

---

## ✨ Features

- **Always Listening** — Continuously monitors your microphone for the wake word
- **Wake Word Detection** — Activates on "Hey Jarvis" or "Jarvis" (customizable)
- **Multi-Model Orchestration** — Routes your questions to the best AI model via OpenRouter (you never see which model answered — it's seamless)
- **Chain Review** — Complex questions get a second AI pass for accuracy
- **Voice + Text** — Talk or type, your choice
- **English + Hinglish** — Understands both languages
- **No Data Storage** — Nothing is saved to disk. Conversation lives in memory only.
- **Desktop App** — Native desktop application (not a website)
- **Dark Futuristic UI** — Glowing orb, audio waveform, Jarvis-style aesthetics
- **System Tray** — Minimizes to tray, keeps listening in background
- **Hacking Knowledge** — Has deep cybersecurity / ethical hacking knowledge built-in

---

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
cd jarvis-desktop
pip install -r requirements.txt
```

**Note for Windows users:** You may need to install `PyAudio` separately:
```bash
pip install pipwin
pipwin install pyaudio
```

### 2. Get an OpenRouter API Key

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Create an account
3. Go to **Keys** → Create a new key
4. Copy the key (starts with `sk-or-v1-...`)

### 3. Run J.A.R.V.I.S.

```bash
# Option A: Pass API key as argument
python main.py --api-key sk-or-v1-your-key-here

# Option B: Set it in the app
python main.py
# Then click the ⚙ settings icon and paste your key
```

### 4. Start Talking

1. Wait for calibration (~2 seconds)
2. Say **"Hey Jarvis"** — the orb will glow
3. Speak your question
4. Jarvis responds with voice + text

---

## 🎮 Controls

| Action | How |
|--------|-----|
| Activate | Say "Hey Jarvis" or "Jarvis" |
| Push-to-talk | Press and hold **Space** key |
| Toggle listening | Press **Escape** |
| Type message | Click the text input at bottom |
| Toggle chat panel | Click 💬 button |
| Settings / API key | Click ⚙ button |
| Minimize to tray | Close the window (X) |
| Quit | Right-click tray icon → Quit |

---

## 🧠 How Multi-Model Orchestration Works

You have ONE OpenRouter API key, but behind the scenes:

1. **Intent Classification** — Jarvis analyzes your question locally (no API call) to determine what type of task it is (coding, reasoning, creative, hacking, general)
2. **Model Routing** — Based on intent, the best model is selected automatically:
   - Code questions → Best coding model
   - Reasoning → Best reasoning model
   - Creative → Best creative model
   - Hacking/Security → Strongest model available
3. **Chain Review** — For complex questions, a second model reviews the first model's answer for accuracy
4. **Unified Response** — You get one seamless answer. No model names, no technical details.

All of this happens in milliseconds. You just talk to Jarvis.

---

## 🔧 Configuration

Edit `config.py` to customize:

- **Models** — Change which models are used for each task type
- **Wake words** — Add/remove trigger phrases
- **TTS voice** — Adjust speed, volume, voice selection
- **Window size** — Resize the app
- **System prompt** — Customize Jarvis's personality

---

## 📁 Project Structure

```
jarvis-desktop/
├── main.py              # Entry point & splash screen
├── config.py            # All configuration in one place
├── ai_engine.py         # Multi-model orchestration via OpenRouter
├── voice_engine.py      # Wake word, STT, TTS
├── gui.py               # Futuristic desktop GUI
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

---

## 🛡️ Privacy & Security

- **Zero storage** — No data is written to disk
- **In-memory only** — Conversation history lives in RAM, gone when you close the app
- **No analytics** — No tracking, no telemetry
- **Local wake word** — Audio is only sent to Google for speech recognition when you're actively speaking
- **Your API key** — Stored in memory only (or passed as CLI arg). Never saved to a file.

---

## 🐛 Troubleshooting

**"Microphone not found"**
- Check that your microphone is connected and permissions are granted
- On Windows: Settings → Privacy → Microphone → Allow desktop apps

**"Speech recognition error"**
- Requires internet connection (Google Speech API)
- Check firewall/proxy settings

**"API error"**
- Verify your OpenRouter API key is valid
- Check you have credits at openrouter.ai
- Ensure internet connection is working

**PyAudio won't install (Windows)**
```bash
pip install pipwin
pipwin install pyaudio
```

---

## 📝 License

Personal use. Built with ❤️ by you + AI.

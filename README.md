# JARVIS AI Assistant

> **J**ust **A** **R**ather **V**ery **I**ntelligent **S**ystem

A fully functional, production-quality JARVIS-inspired AI assistant web application built with Next.js, TypeScript, Three.js, and the Web Speech API.

![JARVIS](https://img.shields.io/badge/JARVIS-1.0-cyan?style=for-the-badge) ![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge)

---

## Features

### Core AI
- 🧠 **AI Brain** — Full OpenAI API integration with local fallback mode
- 🎙️ **Voice Assistant** — Web Speech API for speech-to-text and text-to-speech
- ⚡ **Command System** — Recognizes 20+ built-in commands
- 🧠 **Memory** — Persistent conversation history via localStorage

### Productivity
- 📝 **Notes System** — Create, edit, delete, search, and pin notes
- ⏱️ **Timers** — Visual countdown timers with notifications
- 🔔 **Reminders** — Set timed reminders with browser notifications
- 📋 **Command Palette** — Ctrl+K for quick access to all features

### Information
- 🌤️ **Weather** — Real weather data via OpenWeatherMap API
- 🔍 **Web Search** — Search Google, YouTube, Wikipedia
- 🧮 **Calculations** — Built-in math evaluator

### UI/UX
- 🌌 **3D AI Orb** — React Three Fiber powered orb with state animations
- 🎬 **Cinematic Startup** — Boot sequence animation
- 🌙 **Dark Theme** — Futuristic dark interface with cyan accents
- 📱 **Responsive** — Desktop-first, mobile-friendly
- ⌨️ **Keyboard Shortcuts** — Space (voice), Ctrl+K (command palette), Esc (close)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your API keys:

```env
OPENAI_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_key_here
```

**Without API keys**, JARVIS runs in local/demo mode with built-in responses.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see JARVIS.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## API Keys

### OpenAI (Optional)

Required for AI-powered chat responses.

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an API key
3. Add to `.env.local`: `OPENAI_API_KEY=sk-...`

### OpenWeatherMap (Optional)

Required for weather data.

1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free API key
3. Add to `.env.local`: `OPENWEATHER_API_KEY=...`

---

## Voice Commands

| Command | Action |
|---------|--------|
| "What time is it?" | Shows current time |
| "What's the date?" | Shows current date |
| "Tell me a joke" | Tells a random joke |
| "Set a timer for 5 minutes" | Starts a 5-minute timer |
| "Remind me in 30 minutes to study" | Sets a reminder |
| "Search Google for AI" | Opens Google search |
| "Search YouTube for music" | Opens YouTube search |
| "Search Wikipedia for quantum physics" | Opens Wikipedia |
| "Open github.com" | Opens a website |
| "Weather in London" | Shows weather (if API configured) |
| "Calculate 15 * 3 + 7" | Evaluates the expression |
| "Create a note about meeting" | Creates a new note |
| "Show my notes" | Lists your notes |
| "Toggle dark mode" | Toggles theme |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Open Command Palette |
| `Space` | Activate Voice Assistant |
| `Enter` | Send Chat Message |
| `Esc` | Close Panels |

---

## Project Structure

```
jarvis/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts      # AI chat endpoint
│   │   │   └── weather/route.ts   # Weather API endpoint
│   │   ├── globals.css             # Global styles
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Root page
│   ├── components/
│   │   ├── AIOrb.tsx              # 3D AI core visualization
│   │   ├── ChatPanel.tsx          # Chat interface
│   │   ├── CommandPalette.tsx     # Ctrl+K command palette
│   │   ├── DashboardView.tsx      # Dashboard with widgets
│   │   ├── DashboardWidgets.tsx   # Clock, status, tasks widgets
│   │   ├── MemoryPanel.tsx        # Conversation history
│   │   ├── NotesPanel.tsx         # Notes CRUD
│   │   ├── NotificationSystem.tsx # Notification toasts
│   │   ├── SettingsPanel.tsx      # Settings page
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   ├── StartupSequence.tsx    # Boot animation
│   │   ├── TaskPanel.tsx          # Timers and reminders
│   │   ├── VoiceAssistant.tsx     # Voice interaction
│   │   └── WeatherWidget.tsx      # Weather display
│   └── lib/
│       ├── ai.ts                  # AI utilities
│       ├── commands.ts            # Command parser
│       ├── context.tsx            # Global state context
│       └── storage.ts             # localStorage utilities
├── .env.example                   # Environment template
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **3D**: Three.js + React Three Fiber
- **Animation**: Framer Motion
- **Voice**: Web Speech API
- **AI**: OpenAI API
- **Storage**: localStorage

---

## License

MIT

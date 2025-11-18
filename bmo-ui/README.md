# BMO Face & Command Surface (Next.js)

This app renders the expressive “face” and navigation console for **BMO**, the autonomous tour guide robot at Alamein International University. It targets a landscape Raspberry Pi touch display and embodies the design principle of **Emotive Minimalism**—friendly, academic, and high-tech.

## ✨ Experience Highlights

- **Animated Face**: Dual eyes blink and look around, then morph into an audio waveform while listening/speaking.
- **State Machine**: `IDLE → LISTENING → PROCESSING → SPEAKING → NAVIGATING` simulated with timed delays to mimic STT, LLM reasoning, and TTS streaming.
- **Navigation Canvas**: Face shrinks into a status glyph while the rest of the screen becomes a map with large direction cards and an emergency STOP button.
- **Quick Commands**: Card-based actions for the Dean’s Office, Cafeteria, Facilities, and a Highlights tour, all sized for touch interactions (≥60 px height).
- **Debug Panel**: Hidden bug icon toggles manual state controls for demos.

## 🧱 Stack

- [Next.js App Router](https://nextjs.org/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for rapid styling (plus a few custom glassmorphism helpers)
- [Framer Motion](https://www.framer.com/motion/) for morphing/layout animations
- [Lucide React](https://lucide.dev/) for iconography

## 🚀 Run Locally

1. Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_BMO_API_BASE` to your FastAPI origin (defaults to `http://localhost:8000`).
2. Make sure the backend is running (e.g., `docker compose up -d --build` from `BMO-Backend`).
3. Use a Chromium-based browser (Chrome/Edge) so the Web Speech API can stream STT locally.
4. Install dependencies and start Next.js:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). Tap the Wake button or hold the mic in Chrome to walk through the live Chrome Web Speech → OpenRouter → TTS sequence powered by the backend. Use the STOP button or the debug panel (bottom-right bug icon) to return to idle.

## 🧪 Production Build

```bash
npm run build
npm run start
```

Deploy the `.next/` output to your hosting target (Vercel, Azure Static Web Apps, etc.).

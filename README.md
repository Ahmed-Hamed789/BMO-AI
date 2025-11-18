# BMO-AI

BMO is the autonomous AI tour guide robot for Alamein International University. It combines SLAM navigation, LLM-driven dialogue, and Canvas LMS integration to keep students and visitors oriented in real time.

## 💻 BMO Face & Control Canvas

The `bmo-ui/` folder houses a **Next.js + Tailwind CSS** experience that acts as BMO’s on-device face and control screen. It is designed for a Raspberry Pi-powered landscape tablet and demonstrates the full interaction loop:

- **Idle ➜ Listening ➜ Thinking ➜ Speaking ➜ Navigating** state machine with animated transitions.
- Emotive eye animations that morph into **audio visualizers** for voice capture/output.
- A **navigation canvas** with large safety controls and live step cards.
- **Quick command cards** for common destinations (Dean’s Office, Cafeteria, Facilities, Highlights).
- A hidden **debug panel** (bottom-right bug icon) to jump between states when demoing.

### Run the UI locally

```bash
cd bmo-ui
npm install
npm run dev
```

Open `http://localhost:3000` to interact with BMO’s interface. Tap the Wake button or any quick command to see the simulated backend flow (mock STT ➜ reasoning ➜ TTS ➜ navigation).

> The UI uses Framer Motion for morphing animations and Lucide icons. For production deployments, use `npm run build && npm run start` inside `bmo-ui`.

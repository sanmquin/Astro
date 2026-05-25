# Astro Voice Agent

React + TypeScript interface for a script-driven voice agent, deployable to Netlify with a Netlify Function backend.

## Features
- Provider selection: ElevenLabs or Gemini.
- JSON script flow with per-step expected answers.
- If transcript answer matches expected phrases, advances to next step.
- If not, repeats via retry message.
- API endpoint at `/.netlify/functions/voice-agent` for provider integration.

## Local run
```bash
npm install
npm run dev
```

## Deploy
Push to Git and connect repository in Netlify. Build uses `netlify.toml`.

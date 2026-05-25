# Astro Voice Agent

A React + TypeScript voice-agent interface deployed with Netlify.

## Features

- Switch between Gemini and ElevenLabs in the app settings.
- Follow a JSON-driven script that advances on a matching answer or repeats the current step.
- Use browser speech recognition for input when supported.
- Use either the Netlify API fallback response, Gemini text generation, or ElevenLabs speech output.

## Development

```bash
npm install
npm run lint
npm run build
npm run dev
```

## Netlify deployment

This app expects the frontend to be published from `dist` and the API from `netlify/functions`.

Optional Netlify environment variables:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_MODEL`
- `ELEVENLABS_VOICE_ID`

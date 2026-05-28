# Voice Agent Interface

A React + TypeScript voice agent interface built with Vite and Tailwind CSS. It uses Gemini for response evaluation and supports Eleven Labs or Web Speech API for TTS.

## Development Setup

### Prerequisites

- Node.js installed.
- Netlify CLI installed (`npm install -g netlify-cli`).

### Environment Variables

To use Gemini verification, you need a Gemini API key. Create a `.env` file in the root directory (or set it in Netlify UI) with the following variable:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server with Netlify Dev (to enable functions):
   ```bash
   netlify dev
   ```
   This will start the Vite dev server and the Netlify Functions server simultaneously.

3. Open your browser at the URL provided by the CLI (usually `http://localhost:8888`).

### Testing Gemini Verification

1. Open the **Settings** menu in the app.
2. Toggle **Enable Gemini Verification** to ON.
3. Save settings.
4. The agent will now use the Netlify Function (Gemini 3.1 Flash Lite) to evaluate your responses.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS.
- **Backend**: Netlify Functions (Serverless).
- **AI**: Google Gemini API (gemini-3.1-flash-lite).
- **TTS**: Eleven Labs API & Web Speech API.
- **STT**: `react-speech-recognition` (Web Speech API).

## Deployment

The project is configured for Netlify deployment. Build and publish directories are defined in `netlify.toml`.

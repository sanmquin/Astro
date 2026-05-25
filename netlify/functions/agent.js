const json = (statusCode, payload) =>
  new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      'content-type': 'application/json',
    },
  })

const toAudioDataUrl = (arrayBuffer) => {
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  return `data:audio/mpeg;base64,${base64}`
}

const getGeminiReply = async (message, settings = {}) => {
  const apiKey = settings.apiKey || process.env.GEMINI_API_KEY
  const model = settings.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash'

  if (!apiKey) {
    return {
      text: message,
      usedFallback: true,
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a concise voice agent. Rewrite the following scripted line to sound warm and short without changing its meaning: ${message}`,
              },
            ],
          },
        ],
      }),
    },
  )

  if (!response.ok) {
    throw new Error('Gemini request failed')
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  return {
    text: text || message,
    usedFallback: !text,
  }
}

const getElevenLabsReply = async (message, settings = {}) => {
  const apiKey = settings.apiKey || process.env.ELEVENLABS_API_KEY
  const voiceId = settings.voiceId || process.env.ELEVENLABS_VOICE_ID
  const modelId = settings.model || process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'

  if (!apiKey || !voiceId) {
    return {
      text: message,
      usedFallback: true,
    }
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: message,
      model_id: modelId,
    }),
  })

  if (!response.ok) {
    throw new Error('ElevenLabs request failed')
  }

  const audioDataUrl = toAudioDataUrl(await response.arrayBuffer())

  return {
    text: message,
    audioDataUrl,
  }
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  let payload

  try {
    payload = await request.json()
  } catch {
    return json(400, { error: 'Invalid JSON payload' })
  }

  const message = payload?.message?.trim()
  const provider = payload?.provider
  const settings = payload?.settings

  if (!message || (provider !== 'gemini' && provider !== 'elevenlabs')) {
    return json(400, { error: 'A message and supported provider are required.' })
  }

  try {
    const reply =
      provider === 'gemini'
        ? await getGeminiReply(message, settings?.gemini)
        : await getElevenLabsReply(message, settings?.elevenLabs)

    return json(200, {
      provider,
      ...reply,
    })
  } catch {
    return json(200, {
      provider,
      text: message,
      usedFallback: true,
    })
  }
}

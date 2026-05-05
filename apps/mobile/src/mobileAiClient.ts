import type { MobileNote } from './mobileNoteProjection'
import type { MobileAiProvider } from './mobileAiSettings'

export type MobileAiRequest = {
  apiKey: string
  note: MobileNote
  prompt: string
  provider: MobileAiProvider
}

export async function sendMobileAiRequest(request: MobileAiRequest) {
  const response = await fetch(`${request.provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: [
            'You are helping with a Tolaria markdown note.',
            'Use concise answers and preserve [[wikilink]] syntax when referencing notes.',
            `Active note: ${request.note.title}`,
            request.note.content,
          ].join('\n\n'),
          role: 'system',
        },
        { content: request.prompt, role: 'user' },
      ],
      model: request.provider.modelId,
    }),
    headers: {
      Authorization: `Bearer ${request.apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`AI request failed with ${response.status}`)
  }

  return extractAssistantMessage(await response.json())
}

function extractAssistantMessage(payload: unknown) {
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}

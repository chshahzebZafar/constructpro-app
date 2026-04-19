import OpenAI from 'openai';
import { env } from '../config/env';

export const openai = new OpenAI({ apiKey: env.openai.apiKey });

const SYSTEM_PROMPT =
  'You are an experienced construction site inspector. ' +
  'When given an image from a construction site, describe in 2-3 clear sentences: ' +
  'what is visible, the current stage of work, and any notable issues or observations. ' +
  'Be specific and professional. Avoid greetings or filler text.';

export async function describeConstructionImage(imageUrl: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: env.openai.visionModel,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '';
  if (!text) throw new Error('AI returned an empty description.');
  return text;
}

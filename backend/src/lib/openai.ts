import OpenAI from 'openai';
import { env } from '../config/env';

export const openai = new OpenAI({ apiKey: env.openai.apiKey });

const SYSTEM_PROMPT =
  'You are an experienced construction site inspector. ' +
  'Describe this site image in 2-3 concise sentences covering: ' +
  'what is visible, the construction stage, and any notable issues or safety observations. ' +
  'Be specific and professional. No greetings or filler.';

const MOCK_DESCRIPTIONS = [
  'The image shows a concrete slab being poured at the ground floor level. Formwork is in place and workers are visible spreading the mix. No immediate safety concerns observed.',
  'Structural steel columns are being erected on the second floor. Temporary bracing is visible and welding work is in progress. Hard hats and harnesses appear to be in use.',
  'Masonry block walls are under construction on the east wing. Mortar joints are fresh and scaffolding is properly erected. Material storage is organized at the base.',
  'Electrical conduit installation is visible in the ceiling cavity. The MEP rough-in phase appears to be underway. No exposed live wiring observed.',
  'The site shows excavation work in progress with a tracked excavator. Soil piling is set back from the trench edge. Shoring appears adequate for the visible depth.',
];

export async function describeConstructionImage(imageUrl: string): Promise<string> {
  if (env.openai.apiKey === 'mock') {
    await new Promise((r) => setTimeout(r, 500));
    return MOCK_DESCRIPTIONS[Math.floor(Math.random() * MOCK_DESCRIPTIONS.length)]!;
  }

  const response = await openai.chat.completions.create({
    model: env.openai.visionModel,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '';
  if (!text) throw new Error('AI returned an empty description.');
  return text;
}

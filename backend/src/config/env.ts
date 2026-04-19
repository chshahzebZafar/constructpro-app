import 'dotenv/config';

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 8080),
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? '*',

  supabase: {
    url: required('SUPABASE_URL', process.env.SUPABASE_URL),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'inspection-images',
  },

  openai: {
    apiKey: required('OPENAI_API_KEY', process.env.OPENAI_API_KEY),
    visionModel: process.env.OPENAI_VISION_MODEL ?? 'gpt-4o',
  },
} as const;

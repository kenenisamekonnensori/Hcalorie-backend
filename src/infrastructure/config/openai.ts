import OpenAI from 'openai';

import { env } from '@/infrastructure/config/env.js';

let openAiClient: OpenAI | undefined;

export const getOpenAIClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required before creating the OpenAI client.');
  }

  openAiClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });

  return openAiClient;
};

import OpenAI from 'openai';

const getOpenAIClient = (apiKey: string) => {
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: false,
    timeout: 30000, // 30 second timeout
    maxRetries: 2, // Retry up to 2 times
  });
};

export default getOpenAIClient; 
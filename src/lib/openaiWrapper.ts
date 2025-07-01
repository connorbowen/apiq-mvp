import OpenAI from 'openai';

const getOpenAIClient = (apiKey: string) => {
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: false,
  });
};

export default getOpenAIClient; 
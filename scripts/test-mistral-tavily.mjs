import { ChatMistralAI } from '@langchain/mistralai';
import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('MISTRAL_API_KEY present:', Boolean(process.env.MISTRAL_API_KEY));
console.log('TAVILY_API_KEY present:', Boolean(process.env.TAVILY_API_KEY));

async function runTest() {
  // 1. Test Tavily search
  try {
    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    console.log('Testing Tavily search for "Stripe software engineering"...');
    const searchRes = await tvly.search('Stripe software engineering', { maxResults: 2 });
    console.log('Tavily search successful! Got results:', searchRes.results?.length);
    if (searchRes.results?.length > 0) {
      console.log('Sample snippet:', searchRes.results[0].content?.slice(0, 150));
    }
  } catch (err) {
    console.error('Tavily test failed:', err);
  }

  // 2. Test Mistral AI
  try {
    console.log('\nTesting Mistral AI with model "mistral-small-latest"...');
    const model = new ChatMistralAI({
      apiKey: process.env.MISTRAL_API_KEY,
      model: 'mistral-small-latest',
      temperature: 0.7,
    });

    const res = await model.invoke('Say "Mistral AI online!" in 3 words.');
    console.log('Mistral AI response:', res.content);
  } catch (err) {
    console.error('Mistral AI test failed:', err);
  }
}

runTest();

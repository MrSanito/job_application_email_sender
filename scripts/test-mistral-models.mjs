import { ChatMistralAI } from '@langchain/mistralai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const models = [
  'open-mistral-7b',
  'open-mistral-nemo',
  'open-mixtral-8x7b',
  'mistral-tiny',
  'ministral-8b-latest',
  'ministral-3b-latest',
  'mistral-small-latest',
  'codestral-latest',
];

async function testAll() {
  const working = [];
  for (const modelName of models) {
    try {
      const model = new ChatMistralAI({
        apiKey: process.env.MISTRAL_API_KEY,
        model: modelName,
        temperature: 0.5,
      });
      const res = await model.invoke('Say "OK" in one word.');
      console.log(`[WORKING] ${modelName}:`, String(res.content).trim());
      working.push(modelName);
    } catch (err) {
      console.log(`[FAILED] ${modelName}:`, err.message?.slice(0, 100));
    }
  }
  console.log('\nAll Working Models:', working);
}

testAll();

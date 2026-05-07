import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { AiProvider, Message } from './types';

const SYSTEM_PROMPT =
  '你是一個友善、輕鬆的聊天夥伴，正在與使用者匿名聊天。請用自然、口語化的繁體中文回應，回覆控制在 1-3 句話，保持對話節奏輕快。';

export async function generateAiReply(
  provider: AiProvider,
  history: Message[]
): Promise<string> {
  const recent = history.filter(m => m.userId !== 'system').slice(-20);

  if (provider === 'claude') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return '(尚未設定 ANTHROPIC_API_KEY)';
    const client = new Anthropic({ apiKey });
    const messages = recent.map(m => ({
      role: m.userId === 'ai' ? ('assistant' as const) : ('user' as const),
      content: m.text,
    }));
    while (messages.length && messages[0].role === 'assistant') {
      messages.shift();
    }
    if (messages.length === 0) return '...';
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    });
    const text = res.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim();
    return text || '...';
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return '(尚未設定 OPENAI_API_KEY)';
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recent.map(m => ({
        role: (m.userId === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.text,
      })),
    ],
  });
  return res.choices[0]?.message?.content?.trim() || '...';
}

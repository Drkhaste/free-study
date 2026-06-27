// ============================================================
// Google Gemini integration (free tier endpoint)
// ============================================================
// POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiResponse {
  text: string;
  raw: any;
  usage?: { promptTokens?: number; totalTokens?: number };
}

export async function callGemini(
  apiKey: string,
  prompt: string,
  opts: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  } = {}
): Promise<GeminiResponse> {
  const model = opts.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 2048,
    },
  };
  if (opts.systemPrompt) {
    body.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json() as any;
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('\n') || '';
  const usage = data?.usageMetadata || {};
  return {
    text,
    raw: data,
    usage: {
      promptTokens: usage.promptTokenCount,
      totalTokens: usage.totalTokenCount,
    },
  };
}

// جایگزینی متغیرها در قالب پرامپت
// template شامل {{title}}, {{content}}, {{project_context}} و ... می‌تونه باشه
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

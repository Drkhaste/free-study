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

// ---- پرامپت‌های آماده برای محتوای آموزشی پزشکی ----
export const PROMPTS = {
  // تولید یک مبحث آموزشی کامل
  generateTopic: (topicTitle: string, projectName?: string) => `تو یک استاد دانشگاه پزشکی هستی با سابقه‌ی تدریس بیش از ۲۰ سال. لطفاً یک مبحث آموزشی کامل و ساختاریافته درباره‌ی «${topicTitle}»${projectName ? ` (در حوزه‌ی ${projectName})` : ''} تولید کن.

خروجی باید با فرمت Markdown باشد و شامل این بخش‌ها باشد:

# ${topicTitle}

## معرفی
(مقدمه‌ای ۳-۴ جمله‌ای)

## تعاریف کلیدی
- تعریف اول
- تعریف دوم
...

## فیزیوپاتولوژی
(توضیح مکانیسم بیماری)

## علائم بالینی
- علامت ۱
- علامت ۲
...

## تشخیص
- معیارهای تشخیصی
- آزمایش‌های کلیدی

## درمان
- درمان دارویی
- درمان غیردارویی

## نکات طلایی برای امتحان
- نکته ۱
- نکته ۲

## منابع
- منبع ۱

متن باید به فارسی معیار، دقیق از نظر علمی، و مناسب برای دانشجویان پزشکی باشد.`,

  // تولید فلش‌کارت
  generateFlashcards: (topicTitle: string, count = 10) => `تو یک متخصص آموزش پزشکی هستی. لطفاً ${count} فلش‌کارت کلیدی درباره‌ی «${topicTitle}» بساز.

خروجی را دقیقاً با فرمت CSV و بدون هیچ توضیح اضافه بده. ستون‌ها: front,back,tags

مثال:
"تعریف نارسایی قلبی","ناتوانی قلب در پمپاژ کافی خون برای پاسخگویی به نیازهای متابولیک بدن","قلب;نارسایی"
"علائم نارسایی قلبی","تنگی نفس، خستگی، ادم محیطی، پرفیوزیون ضعیف","قلب;علائم"

سوال‌ها باید مفاهیم مهم امتحانی رو پوشش بدن.`,

  // خلاصه‌سازی محتوا
  summarizeTopic: (content: string) => `لطفاً محتوای آموزشی زیر رو به یک خلاصه‌ی ۳-۴ جمله‌ای تبدیل کن که برای وبلاگ مناسب باشه:

${content}

فقط خودِ خلاصه رو بنویس، هیچ مقدمه‌ای نذار.`,

  // بهبود نگارش
  improveContent: (content: string) => `لطفاً متن آموزشی پزشکی زیر رو از نظر نگارش، ساختار، و وضوح بهبود بده. معادل علمی رو دقیق نگه دار:

${content}

نسخه‌ی نهایی رو با Markdown برگردان.`,
};

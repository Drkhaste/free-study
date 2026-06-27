// ============================================================
// CSV utilities (import/export flashcards)
// ============================================================

export interface ParsedFlashcard {
  front: string;
  back: string;
  hint?: string;
  tags?: string;
}

// پارس ساده CSV با پشتیبانی از کوتیشن و کاما داخل کوتیشن
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  // BOM حذف
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { cur.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // آخرین فیلد
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter(r => r.length > 0 && r.some(c => c.trim() !== ''));
}

export interface CSVImportResult {
  cards: ParsedFlashcard[];
  errors: string[];
  totalRows: number;
  imported: number;
}

export function parseFlashcardsCSV(text: string): CSVImportResult {
  const rows = parseCSV(text);
  const errors: string[] = [];
  if (rows.length === 0) return { cards: [], errors: ['فایل خالی است'], totalRows: 0, imported: 0 };

  // هدر رو پیدا کن
  const header = rows[0].map(h => h.trim().toLowerCase());
  const hasHeader = header.includes('front') || header.includes('پیش') || header.includes('سوال');
  let frontIdx = 0, backIdx = 1, hintIdx = -1, tagsIdx = -1;
  if (hasHeader) {
    header.forEach((h, i) => {
      if (['front', 'pre', 'سوال', 'پیش', 'face'].includes(h)) frontIdx = i;
      else if (['back', 'answer', 'جواب', 'پشت', 'تعریف'].includes(h)) backIdx = i;
      else if (['hint', 'راهنما'].includes(h)) hintIdx = i;
      else if (['tags', 'تگ', 'برچسب'].includes(h)) tagsIdx = i;
    });
  }

  const start = hasHeader ? 1 : 0;
  const cards: ParsedFlashcard[] = [];

  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 2) {
      errors.push(`ردیف ${i + 1}: تعداد ستون کم است`);
      continue;
    }
    const front = (r[frontIdx] || '').trim();
    const back = (r[backIdx] || '').trim();
    if (!front || !back) {
      errors.push(`ردیف ${i + 1}: محتوای خالی`);
      continue;
    }
    cards.push({
      front,
      back,
      hint: hintIdx >= 0 ? (r[hintIdx] || '').trim() || undefined : undefined,
      tags: tagsIdx >= 0 ? (r[tagsIdx] || '').trim() || undefined : undefined,
    });
  }

  return { cards, errors, totalRows: rows.length - start, imported: cards.length };
}

// تولید CSV از فلش‌کارت‌ها
export function toCSV(cards: { front: string; back: string; hint?: string | null; tags?: string | null }[]): string {
  const escape = (s: string) => {
    if (!s) return '';
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = 'front,back,hint,tags';
  const rows = cards.map(c => [c.front, c.back, c.hint || '', c.tags || ''].map(escape).join(','));
  return [header, ...rows].join('\n');
}

// ============================================================
// Types & Bindings for Cloudflare Worker
// ============================================================

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ENVIRONMENT: string;
  // Secrets (set via wrangler secret put)
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
}

export interface User {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
  display_name: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
  preferences: string | null;
}

export interface Project {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  position: number;
  created_at: string;
  updated_at: string;
  topic_count?: number;
}

export interface Topic {
  id: number;
  project_id: number;
  user_id: number;
  title: string;
  slug: string | null;
  content_md: string;
  content_html: string;
  excerpt: string | null;
  tags: string | null;
  status: string;
  is_featured: number;
  word_count: number;
  reading_time_min: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  project_title?: string;
  project_color?: string;
}

export interface Flashcard {
  id: number;
  user_id: number;
  project_id: number | null;
  topic_id: number | null;
  front: string;
  back: string;
  hint: string | null;
  tags: string | null;
  ease: number;
  interval: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  total_reviews: number;
  correct_reviews: number;
  created_at: string;
}

export interface AuthContext {
  user: User | null;
  token: string | null;
}

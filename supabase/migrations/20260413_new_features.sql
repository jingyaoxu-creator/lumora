-- ============================================================
-- Lumora: Keyword Rank Tracking + SERP Volatility + Brand Mentions
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. tracked_keywords 表 ───

CREATE TABLE IF NOT EXISTS public.tracked_keywords (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain      text NOT NULL,
  keyword     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tracked_keywords_user_domain_kw_idx
  ON public.tracked_keywords (user_id, domain, keyword);
CREATE INDEX IF NOT EXISTS tracked_keywords_user_idx
  ON public.tracked_keywords (user_id);

ALTER TABLE public.tracked_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own keywords"
  ON public.tracked_keywords FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keywords"
  ON public.tracked_keywords FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own keywords"
  ON public.tracked_keywords FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on tracked_keywords"
  ON public.tracked_keywords FOR ALL USING (auth.role() = 'service_role');


-- ─── 2. rank_history 表 ───

CREATE TABLE IF NOT EXISTS public.rank_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id  uuid NOT NULL REFERENCES public.tracked_keywords(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain      text NOT NULL,
  keyword     text NOT NULL,
  position    integer DEFAULT NULL,  -- null = not in top 100
  url         text DEFAULT NULL,     -- the ranking URL
  title       text DEFAULT NULL,
  snippet     text DEFAULT NULL,
  serp_features jsonb DEFAULT '[]',  -- featured_snippet, PAA, etc.
  checked_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rank_history_keyword_idx
  ON public.rank_history (keyword_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS rank_history_user_idx
  ON public.rank_history (user_id, checked_at DESC);

ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rank history"
  ON public.rank_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on rank_history"
  ON public.rank_history FOR ALL USING (auth.role() = 'service_role');


-- ─── 3. serp_volatility 表 ───

CREATE TABLE IF NOT EXISTS public.serp_volatility (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_date  date NOT NULL DEFAULT CURRENT_DATE,
  category    text NOT NULL DEFAULT 'general',
  score       numeric(5,2) NOT NULL DEFAULT 0,  -- 0-10 scale
  details     jsonb DEFAULT '{}',
  checked_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS serp_volatility_date_cat_idx
  ON public.serp_volatility (check_date, category);

-- Public read — volatility is global data, no RLS needed for reads
ALTER TABLE public.serp_volatility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read volatility"
  ON public.serp_volatility FOR SELECT USING (true);
CREATE POLICY "Service role full access on serp_volatility"
  ON public.serp_volatility FOR ALL USING (auth.role() = 'service_role');


-- ─── 4. brand_mentions 表 ───

CREATE TABLE IF NOT EXISTS public.brand_mentions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_term  text NOT NULL,
  source_url  text NOT NULL,
  source_domain text NOT NULL,
  title       text DEFAULT NULL,
  snippet     text DEFAULT NULL,
  found_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_mentions_user_idx
  ON public.brand_mentions (user_id, found_at DESC);
CREATE INDEX IF NOT EXISTS brand_mentions_user_term_idx
  ON public.brand_mentions (user_id, brand_term);
-- Prevent duplicate mentions
CREATE UNIQUE INDEX IF NOT EXISTS brand_mentions_user_url_idx
  ON public.brand_mentions (user_id, brand_term, source_url);

ALTER TABLE public.brand_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mentions"
  ON public.brand_mentions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mentions"
  ON public.brand_mentions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on brand_mentions"
  ON public.brand_mentions FOR ALL USING (auth.role() = 'service_role');


-- ─── 5. brand_terms 表（用户监控的品牌词） ───

CREATE TABLE IF NOT EXISTS public.brand_terms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term        text NOT NULL,
  exclude_domain text DEFAULT NULL,  -- 排除自己的域名
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS brand_terms_user_term_idx
  ON public.brand_terms (user_id, term);
CREATE INDEX IF NOT EXISTS brand_terms_user_idx
  ON public.brand_terms (user_id);

ALTER TABLE public.brand_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand terms"
  ON public.brand_terms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brand terms"
  ON public.brand_terms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own brand terms"
  ON public.brand_terms FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on brand_terms"
  ON public.brand_terms FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 完成！验证：
-- SELECT * FROM public.tracked_keywords LIMIT 0;
-- SELECT * FROM public.rank_history LIMIT 0;
-- SELECT * FROM public.serp_volatility LIMIT 0;
-- SELECT * FROM public.brand_mentions LIMIT 0;
-- SELECT * FROM public.brand_terms LIMIT 0;
-- ============================================================

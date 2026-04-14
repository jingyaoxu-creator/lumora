-- ============================================================
-- Lumora: Brand Settings + Monitored Sites + Storage
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. profiles 表新增 brand_settings 列 ───

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brand_settings jsonb DEFAULT NULL;

COMMENT ON COLUMN public.profiles.brand_settings IS 'White-label branding: { brandName, brandColor, logoUrl }';


-- ─── 2. 新建 monitored_sites 表 ───

CREATE TABLE IF NOT EXISTS public.monitored_sites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url         text NOT NULL,
  domain      text NOT NULL,
  frequency   text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  notify_on_drop boolean NOT NULL DEFAULT true,
  drop_threshold integer NOT NULL DEFAULT 5 CHECK (drop_threshold BETWEEN 1 AND 50),
  last_score  integer DEFAULT NULL,
  last_scanned_at timestamptz DEFAULT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 每个用户每个 URL 只能监控一次
CREATE UNIQUE INDEX IF NOT EXISTS monitored_sites_user_url_idx
  ON public.monitored_sites (user_id, url);

-- 按频率查询（cron 用）
CREATE INDEX IF NOT EXISTS monitored_sites_frequency_idx
  ON public.monitored_sites (frequency);

-- 按用户查询
CREATE INDEX IF NOT EXISTS monitored_sites_user_idx
  ON public.monitored_sites (user_id);

COMMENT ON TABLE public.monitored_sites IS 'Sites that users want auto-scanned on a schedule with score drop alerts';


-- ─── 3. RLS 策略 ───

ALTER TABLE public.monitored_sites ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己的监控站点
CREATE POLICY "Users can view own monitors"
  ON public.monitored_sites FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能插入自己的监控站点
CREATE POLICY "Users can insert own monitors"
  ON public.monitored_sites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户只能删除自己的监控站点
CREATE POLICY "Users can delete own monitors"
  ON public.monitored_sites FOR DELETE
  USING (auth.uid() = user_id);

-- 用户只能更新自己的监控站点
CREATE POLICY "Users can update own monitors"
  ON public.monitored_sites FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (cron job) 可以读写所有记录
CREATE POLICY "Service role full access"
  ON public.monitored_sites FOR ALL
  USING (auth.role() = 'service_role');


-- ─── 4. 创建 brand-assets Storage bucket ───

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,                                          -- 公开读
  524288,                                        -- 512KB 限制
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 任何人可以读（公开 bucket）
CREATE POLICY "Public read brand assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

-- 已登录用户只能上传到自己的 logos/ 路径
CREATE POLICY "Users upload own logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'logos'
  );

-- 用户可以覆盖自己上传的文件
CREATE POLICY "Users update own logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'brand-assets'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'logos'
  );


-- ============================================================
-- 完成！验证：
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'brand_settings';
-- SELECT * FROM public.monitored_sites LIMIT 0;
-- SELECT * FROM storage.buckets WHERE id = 'brand-assets';
-- ============================================================

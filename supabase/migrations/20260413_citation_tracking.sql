-- Citation tracking history
CREATE TABLE IF NOT EXISTS citation_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text NOT NULL,
  query text NOT NULL,
  checked_at timestamptz DEFAULT now(),
  has_ai_overview boolean DEFAULT false,
  is_cited boolean DEFAULT false,
  position int, -- position in AI Overview sources (null if not cited)
  total_sources int DEFAULT 0,
  organic_position int, -- position in organic results
  snippet text
);

-- Index for fast lookups
CREATE INDEX idx_citation_tracking_user_domain ON citation_tracking(user_id, domain);
CREATE INDEX idx_citation_tracking_checked ON citation_tracking(checked_at DESC);

-- Enable RLS
ALTER TABLE citation_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tracking data
CREATE POLICY "Users view own citation tracking"
  ON citation_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert citation tracking"
  ON citation_tracking FOR INSERT
  WITH CHECK (true);

-- Add tracked_queries column to monitored_sites
ALTER TABLE monitored_sites ADD COLUMN IF NOT EXISTS tracked_queries text[] DEFAULT '{}';

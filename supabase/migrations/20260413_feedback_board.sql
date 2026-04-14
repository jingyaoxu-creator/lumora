-- Feature requests / feedback board
CREATE TABLE IF NOT EXISTS feedback_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'feature' CHECK (category IN ('feature', 'improvement', 'bug')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'planned', 'in_progress', 'done', 'declined')),
  vote_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Votes (one per user per post)
CREATE TABLE IF NOT EXISTS feedback_votes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES feedback_posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

-- Indexes
CREATE INDEX idx_feedback_posts_votes ON feedback_posts(vote_count DESC);
CREATE INDEX idx_feedback_posts_status ON feedback_posts(status);
CREATE INDEX idx_feedback_votes_post ON feedback_votes(post_id);

-- RLS
ALTER TABLE feedback_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read posts
CREATE POLICY "Anyone can view feedback posts"
  ON feedback_posts FOR SELECT USING (true);

-- Authenticated users can create posts
CREATE POLICY "Users can create feedback posts"
  ON feedback_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the author can update their own post (title/content)
CREATE POLICY "Users can update own posts"
  ON feedback_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can delete (admin)
CREATE POLICY "Service can delete posts"
  ON feedback_posts FOR DELETE
  USING (true);

-- Anyone can read votes
CREATE POLICY "Anyone can view votes"
  ON feedback_votes FOR SELECT USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can vote"
  ON feedback_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own votes
CREATE POLICY "Users can unvote"
  ON feedback_votes FOR DELETE
  USING (auth.uid() = user_id);

-- RPC functions for atomic vote count updates
CREATE OR REPLACE FUNCTION increment_vote_count(post_id_input uuid)
RETURNS void AS $$
BEGIN
  UPDATE feedback_posts SET vote_count = vote_count + 1 WHERE id = post_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_vote_count(post_id_input uuid)
RETURNS void AS $$
BEGIN
  UPDATE feedback_posts SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = post_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

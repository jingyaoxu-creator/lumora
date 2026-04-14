/**
 * One-time script to set up Lumora database tables in Supabase.
 * Run with: node scripts/setup-db.mjs
 */
import pg from "pg";

const DATABASE_URL =
  "postgresql://postgres.hxidklfgzyuntxxrclwo:Xjy20040116!@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";

const SQL = `
-- Scan history
CREATE TABLE IF NOT EXISTS scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  page_title text,
  seo_score integer,
  geo_score integer,
  overall_score integer,
  results jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  scans_used integer DEFAULT 0,
  scans_limit integer DEFAULT 5,
  waffo_customer_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Ranked sites
CREATE TABLE IF NOT EXISTS ranked_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  url text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  overall_score integer,
  seo_score integer,
  geo_score integer,
  results jsonb,
  scanned_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranked_sites ENABLE ROW LEVEL SECURITY;

-- Policies (use IF NOT EXISTS pattern with DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own scans') THEN
    CREATE POLICY "Users can view own scans" ON scan_history FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own scans') THEN
    CREATE POLICY "Users can insert own scans" ON scan_history FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own scans') THEN
    CREATE POLICY "Users can delete own scans" ON scan_history FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view ranked sites') THEN
    CREATE POLICY "Anyone can view ranked sites" ON ranked_sites FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage ranked sites') THEN
    CREATE POLICY "Service role can manage ranked sites" ON ranked_sites FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON scan_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ranked_sites_category ON ranked_sites(category);
CREATE INDEX IF NOT EXISTS idx_ranked_sites_overall_score ON ranked_sites(overall_score DESC NULLS LAST);
`;

async function main() {
  console.log("Connecting to Supabase PostgreSQL...");
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("Connected! Running schema setup...");

  try {
    await client.query(SQL);
    console.log("All tables, policies, and indexes created successfully!");

    // Verify
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('scan_history', 'profiles', 'ranked_sites')
      ORDER BY table_name
    `);
    console.log("Verified tables:", rows.map((r) => r.table_name).join(", "));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

main();

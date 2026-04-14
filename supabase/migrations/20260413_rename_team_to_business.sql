-- Rename 'team' plan to 'business'
-- 1. Drop old constraint and add new one
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'business'));

-- 2. Migrate existing 'team' users to 'business'
UPDATE profiles SET plan = 'business' WHERE plan = 'team';

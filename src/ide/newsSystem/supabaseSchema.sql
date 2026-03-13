-- ====================================================================================================
-- FILE: supabaseSchema.sql - Database Schema for News/Announcement System
-- ====================================================================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query and paste this entire file
-- 4. Run the query to create all tables and policies
--
-- ====================================================================================================

-- ====================================
-- 1. NEWS ITEMS TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS public.news_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  icon VARCHAR(10) NOT NULL DEFAULT 'ℹ️',
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  badge VARCHAR(50) DEFAULT NULL,
  link_text VARCHAR(100) DEFAULT NULL,
  link_url TEXT DEFAULT NULL,
  version VARCHAR(50) DEFAULT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) DEFAULT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_items_active ON public.news_items(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_pinned ON public.news_items(is_pinned, created_at DESC);

-- Enable RLS
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read active news
CREATE POLICY "Anyone can read active news" ON public.news_items
  FOR SELECT
  USING (is_active = TRUE);

-- Policies: Only admins can insert/update/delete (you'll need to set up admin roles)
-- For now, authenticated users can manage news (adjust as needed)
CREATE POLICY "Authenticated users can insert news" ON public.news_items
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update news" ON public.news_items
  FOR UPDATE
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can delete news" ON public.news_items
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- ====================================
-- 2. NEWS READ STATUS TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS public.news_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  news_id UUID NOT NULL REFERENCES public.news_items(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, news_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_read_status_user ON public.news_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_news_read_status_news ON public.news_read_status(news_id);

-- Enable RLS
ALTER TABLE public.news_read_status ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see/manage their own read status
CREATE POLICY "Users can read own read status" ON public.news_read_status
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own read status" ON public.news_read_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own read status" ON public.news_read_status
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ====================================
-- 3. USER PROFILES TABLE (Optional - extends auth.users)
-- ====================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  name VARCHAR(255),
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ====================================
-- 4. FUNCTIONS
-- ====================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for news_items
DROP TRIGGER IF EXISTS on_news_items_updated ON public.news_items;
CREATE TRIGGER on_news_items_updated
  BEFORE UPDATE ON public.news_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for user_profiles
DROP TRIGGER IF EXISTS on_user_profiles_updated ON public.user_profiles;
CREATE TRIGGER on_user_profiles_updated
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ====================================
-- 5. VIEWS (Optional - for easier queries)
-- ====================================

-- View: Active news with read status for current user
CREATE OR REPLACE VIEW public.news_with_read_status AS
SELECT 
  n.*,
  CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_read,
  r.read_at
FROM public.news_items n
LEFT JOIN public.news_read_status r 
  ON n.id = r.news_id 
  AND r.user_id = auth.uid()
WHERE n.is_active = TRUE
ORDER BY n.is_pinned DESC, n.created_at DESC;

-- ====================================
-- 6. SAMPLE DATA (Optional - for testing)
-- ====================================

-- Uncomment to insert sample news items
/*
INSERT INTO public.news_items (type, icon, title, content, badge, link_text, is_pinned) VALUES
('update', '🚀', 'v3.6.0 Released!', 'News system, better performance, new AI features', 'NEW', 'Details', TRUE),
('feature', '✨', 'Camera Code Analysis', 'Capture code from whiteboards using your webcam', NULL, 'Try it', FALSE),
('tip', '💡', 'Quick Tip', 'Use Ctrl+Shift+A for instant AI assistance', NULL, NULL, FALSE),
('maintenance', '🔧', 'Maintenance Complete', 'Server maintenance finished successfully', NULL, NULL, FALSE),
('warning', '⚠️', 'Important Update', 'Please update to the latest version for security fixes', 'URGENT', 'Update Now', FALSE);
*/

-- ====================================
-- 7. REALTIME SUBSCRIPTIONS
-- ====================================

-- Enable realtime for news_items table
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_items;

-- ====================================
-- DONE! Your news system database is ready.
-- ====================================

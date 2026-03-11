# Supabase Setup for BlindRank Community Features

## 1. Create a Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Choose a name (e.g., "blindrank")
4. Set a secure database password
5. Choose a region close to your users
6. Click "Create new project"

## 2. Run the Database Schema

Go to **SQL Editor** in your Supabase dashboard and run this SQL:

```sql
-- Community Categories Table
CREATE TABLE community_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '📦',
    rating TEXT NOT NULL CHECK (rating IN ('kids', 'teen', 'mature', 'explicit')),
    items JSONB NOT NULL,
    author_name TEXT DEFAULT 'Anonymous',
    is_hidden BOOLEAN DEFAULT FALSE,
    flag_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    avg_score NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category Flags Table (for reports)
CREATE TABLE category_flags (
    id SERIAL PRIMARY KEY,
    category_id TEXT REFERENCES community_categories(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Rankings Table (for community consensus)
CREATE TABLE user_rankings (
    id SERIAL PRIMARY KEY,
    category_id TEXT NOT NULL,  -- Can be official or community category
    ranking JSONB NOT NULL,     -- Array of item IDs in ranked order
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_categories_rating ON community_categories(rating);
CREATE INDEX idx_categories_created ON community_categories(created_at DESC);
CREATE INDEX idx_categories_play_count ON community_categories(play_count DESC);
CREATE INDEX idx_categories_hidden ON community_categories(is_hidden);
CREATE INDEX idx_rankings_category ON user_rankings(category_id);

-- Function to increment flag count
CREATE OR REPLACE FUNCTION increment_flag_count(category_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE community_categories
    SET flag_count = flag_count + 1
    WHERE id = category_id;

    -- Auto-hide if flag count reaches threshold
    UPDATE community_categories
    SET is_hidden = TRUE
    WHERE id = category_id AND flag_count >= 5;
END;
$$ LANGUAGE plpgsql;

-- Function to increment play count
CREATE OR REPLACE FUNCTION increment_play_count(category_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE community_categories
    SET play_count = play_count + 1
    WHERE id = category_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get community average ranking
-- Returns array of {item_id, avg_rank} sorted by average rank
CREATE OR REPLACE FUNCTION get_community_ranking(cat_id TEXT)
RETURNS TABLE(item_id INTEGER, avg_rank NUMERIC) AS $$
BEGIN
    RETURN QUERY
    WITH expanded AS (
        SELECT
            (elem.value)::INTEGER as item_id,
            elem.ordinality as rank_position
        FROM user_rankings ur,
        LATERAL jsonb_array_elements(ur.ranking) WITH ORDINALITY AS elem(value, ordinality)
        WHERE ur.category_id = cat_id
    )
    SELECT
        expanded.item_id,
        ROUND(AVG(expanded.rank_position)::NUMERIC, 2) as avg_rank
    FROM expanded
    GROUP BY expanded.item_id
    ORDER BY avg_rank ASC;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE community_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rankings ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read non-hidden categories
CREATE POLICY "Anyone can read categories" ON community_categories
    FOR SELECT USING (is_hidden = FALSE);

-- Policies: Anyone can insert categories
CREATE POLICY "Anyone can create categories" ON community_categories
    FOR INSERT WITH CHECK (TRUE);

-- Policies: Anyone can insert flags
CREATE POLICY "Anyone can flag" ON category_flags
    FOR INSERT WITH CHECK (TRUE);

-- Policies: Anyone can insert and read rankings
CREATE POLICY "Anyone can submit rankings" ON user_rankings
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Anyone can read rankings" ON user_rankings
    FOR SELECT USING (TRUE);

-- Grant access to anon role
GRANT SELECT, INSERT ON community_categories TO anon;
GRANT SELECT, INSERT ON category_flags TO anon;
GRANT SELECT, INSERT ON user_rankings TO anon;
GRANT EXECUTE ON FUNCTION increment_flag_count TO anon;
GRANT EXECUTE ON FUNCTION increment_play_count TO anon;
GRANT EXECUTE ON FUNCTION get_community_ranking TO anon;
```

## 3. Get Your API Credentials

1. Go to **Project Settings** > **API**
2. Copy your:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key

## 4. Update Your Code

Edit `js/supabase.js` and replace the placeholder values:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://YOUR-PROJECT.supabase.co',  // Your Project URL
    anonKey: 'eyJhbGc...'                      // Your anon key
};
```

## 5. Test It

1. Open your BlindRank site
2. Go to the "Create" tab
3. Create a test category with 10+ items
4. Submit it
5. Check the "Community" tab - your category should appear!

## Moderation

Categories are automatically hidden when they receive 5+ flags.

To manually moderate:

1. Go to **Table Editor** in Supabase
2. Click on `community_categories`
3. You can:
   - Set `is_hidden = true` to hide a category
   - Delete bad categories entirely
   - Check `category_flags` table to see what's been reported

## Optional: Admin Dashboard

For easier moderation, you can use Supabase's built-in dashboard or create a simple admin page that:
- Lists flagged categories (flag_count > 0)
- Allows approving (reset flag_count) or removing
- Views flag reasons

## Cost

Supabase free tier includes:
- 500 MB database
- 50,000 monthly active users
- Unlimited API requests

This is more than enough for getting started!

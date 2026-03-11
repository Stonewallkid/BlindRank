-- BlindRank Database Schema
-- Run this in your Supabase SQL Editor (SQL Editor > New Query)

-- 1. Community Categories Table
CREATE TABLE IF NOT EXISTS community_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '🎯',
    rating TEXT NOT NULL CHECK (rating IN ('kids', 'teen', 'mature', 'explicit')),
    items JSONB NOT NULL,
    author_name TEXT DEFAULT 'Anonymous',
    is_hidden BOOLEAN DEFAULT FALSE,
    flag_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    avg_score REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Rankings Table (stores each player's ranking for community averaging)
CREATE TABLE IF NOT EXISTS user_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL REFERENCES community_categories(id) ON DELETE CASCADE,
    ranking JSONB NOT NULL,  -- Array of item names/ids in ranked order
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Category Flags Table (for reporting inappropriate content)
CREATE TABLE IF NOT EXISTS category_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL REFERENCES community_categories(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_categories_rating ON community_categories(rating);
CREATE INDEX IF NOT EXISTS idx_community_categories_play_count ON community_categories(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_categories_created_at ON community_categories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_rankings_category_id ON user_rankings(category_id);

-- 5. RPC Functions

-- Increment play count atomically
CREATE OR REPLACE FUNCTION increment_play_count(category_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE community_categories
    SET play_count = play_count + 1
    WHERE id = category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment flag count atomically
CREATE OR REPLACE FUNCTION increment_flag_count(category_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE community_categories
    SET flag_count = flag_count + 1,
        is_hidden = CASE WHEN flag_count >= 4 THEN TRUE ELSE is_hidden END
    WHERE id = category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get community average ranking for a category
-- Returns items sorted by their average position
CREATE OR REPLACE FUNCTION get_community_ranking(cat_id TEXT)
RETURNS TABLE (item_name TEXT, avg_position REAL, vote_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    WITH rankings AS (
        SELECT
            jsonb_array_elements_text(ranking) AS item,
            generate_series(1, jsonb_array_length(ranking)) AS position
        FROM user_rankings
        WHERE category_id = cat_id
    ),
    item_positions AS (
        SELECT
            item AS item_name,
            position::REAL
        FROM rankings
    )
    SELECT
        ip.item_name,
        AVG(ip.position)::REAL AS avg_position,
        COUNT(*)::BIGINT AS vote_count
    FROM item_positions ip
    GROUP BY ip.item_name
    ORDER BY avg_position ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Row Level Security (RLS) Policies
ALTER TABLE community_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_flags ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read non-hidden categories
CREATE POLICY "Anyone can view categories" ON community_categories
    FOR SELECT USING (is_hidden = FALSE);

-- Allow anyone to insert new categories
CREATE POLICY "Anyone can create categories" ON community_categories
    FOR INSERT WITH CHECK (TRUE);

-- Allow anyone to read rankings
CREATE POLICY "Anyone can view rankings" ON user_rankings
    FOR SELECT USING (TRUE);

-- Allow anyone to submit rankings
CREATE POLICY "Anyone can submit rankings" ON user_rankings
    FOR INSERT WITH CHECK (TRUE);

-- Allow anyone to flag content
CREATE POLICY "Anyone can flag content" ON category_flags
    FOR INSERT WITH CHECK (TRUE);

-- Grant permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON community_categories TO anon;
GRANT SELECT, INSERT ON user_rankings TO anon;
GRANT INSERT ON category_flags TO anon;
GRANT EXECUTE ON FUNCTION increment_play_count(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_flag_count(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_community_ranking(TEXT) TO anon;

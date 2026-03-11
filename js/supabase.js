// Supabase Database Module
// To set up: Create a Supabase project at https://supabase.com
// Then update the config below with your project URL and anon key

const SUPABASE_CONFIG = {
    url: 'https://chwlhvlnadgblyovmhxz.supabase.co',
    anonKey: 'sb_publishable_T3kxoZCVMTk7Dn_AjYFTSQ_AhYJORfu'
};

// Simple Supabase client (no npm required)
class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.headers = {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    async query(table, options = {}) {
        let url = `${this.url}/rest/v1/${table}`;
        const params = new URLSearchParams();

        if (options.select) params.append('select', options.select);
        if (options.filter) {
            Object.entries(options.filter).forEach(([key, value]) => {
                params.append(key, value);
            });
        }
        if (options.order) params.append('order', options.order);
        if (options.limit) params.append('limit', options.limit);

        if (params.toString()) url += '?' + params.toString();

        const response = await fetch(url, { headers: this.headers });
        if (!response.ok) throw new Error(`Query failed: ${response.statusText}`);
        return response.json();
    }

    async insert(table, data) {
        const url = `${this.url}/rest/v1/${table}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Insert failed: ${response.statusText}`);
        return response.json();
    }

    async update(table, data, filter) {
        let url = `${this.url}/rest/v1/${table}`;
        const params = new URLSearchParams();
        Object.entries(filter).forEach(([key, value]) => {
            params.append(key, value);
        });
        url += '?' + params.toString();

        const response = await fetch(url, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Update failed: ${response.statusText}`);
        return response.json();
    }

    async rpc(functionName, params = {}) {
        const url = `${this.url}/rest/v1/rpc/${functionName}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(params)
        });
        if (!response.ok) throw new Error(`RPC failed: ${response.statusText}`);
        return response.json();
    }
}

// Initialize client
const supabase = new SupabaseClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Check if Supabase is configured
export function isConfigured() {
    return SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' &&
           SUPABASE_CONFIG.anonKey !== 'YOUR_ANON_KEY';
}

// Community Categories API
export async function getCommunityCategories(rating = 'all', sortBy = 'newest') {
    if (!isConfigured()) return [];

    try {
        const options = {
            select: '*',
            filter: { 'is_hidden': 'eq.false' }
        };

        if (rating !== 'all') {
            options.filter['rating'] = `eq.${rating}`;
        }

        if (sortBy === 'newest') {
            options.order = 'created_at.desc';
        } else if (sortBy === 'popular') {
            options.order = 'play_count.desc';
        } else if (sortBy === 'top-rated') {
            options.order = 'avg_score.desc';
        }

        options.limit = 50;

        return await supabase.query('community_categories', options);
    } catch (error) {
        console.error('Failed to fetch community categories:', error);
        return [];
    }
}

export async function getCommunityCategory(id) {
    if (!isConfigured()) return null;

    try {
        const results = await supabase.query('community_categories', {
            select: '*',
            filter: { 'id': `eq.${id}` }
        });
        return results[0] || null;
    } catch (error) {
        console.error('Failed to fetch category:', error);
        return null;
    }
}

export async function submitCategory(categoryData) {
    if (!isConfigured()) {
        throw new Error('Supabase not configured. Category saved locally only.');
    }

    // Generate a unique ID
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const submission = {
        id: id,
        name: categoryData.name,
        description: categoryData.description || '',
        emoji: categoryData.emoji,
        rating: categoryData.rating,
        items: categoryData.items,
        author_name: categoryData.authorName || 'Anonymous',
        is_hidden: false,
        flag_count: 0,
        play_count: 0,
        created_at: new Date().toISOString()
    };

    const result = await supabase.insert('community_categories', submission);
    return result[0];
}

export async function flagCategory(categoryId, reason) {
    if (!isConfigured()) return false;

    try {
        // Insert flag record
        await supabase.insert('category_flags', {
            category_id: categoryId,
            reason: reason,
            created_at: new Date().toISOString()
        });

        // Increment flag count on category
        // Using RPC for atomic increment
        await supabase.rpc('increment_flag_count', { category_id: categoryId });

        return true;
    } catch (error) {
        console.error('Failed to flag category:', error);
        return false;
    }
}

export async function incrementPlayCount(categoryId) {
    if (!isConfigured()) return;

    try {
        await supabase.rpc('increment_play_count', { category_id: categoryId });
    } catch (error) {
        console.error('Failed to increment play count:', error);
    }
}

// Submit user's ranking for community averaging
export async function submitRanking(categoryId, itemIds) {
    if (!isConfigured()) return null;

    try {
        const result = await supabase.insert('user_rankings', {
            category_id: categoryId,
            ranking: itemIds, // Array of item IDs in order
            created_at: new Date().toISOString()
        });
        return result[0];
    } catch (error) {
        console.error('Failed to submit ranking:', error);
        return null;
    }
}

// Get community average ranking for a category
export async function getCommunityRanking(categoryId) {
    if (!isConfigured()) return null;

    try {
        // Use RPC function to get averaged ranking
        const result = await supabase.rpc('get_community_ranking', {
            cat_id: categoryId
        });
        return result;
    } catch (error) {
        console.error('Failed to get community ranking:', error);
        return null;
    }
}

// Get ranking count for a category
export async function getRankingCount(categoryId) {
    if (!isConfigured()) return 0;

    try {
        const results = await supabase.query('user_rankings', {
            select: 'id',
            filter: { 'category_id': `eq.${categoryId}` }
        });
        return results.length;
    } catch (error) {
        console.error('Failed to get ranking count:', error);
        return 0;
    }
}

// Local draft storage
const DRAFT_KEY = 'blindrank_draft_categories';

export function saveDraft(category) {
    const drafts = getDrafts();
    const existingIndex = drafts.findIndex(d => d.id === category.id);

    if (existingIndex >= 0) {
        drafts[existingIndex] = category;
    } else {
        category.id = 'draft_' + Date.now();
        drafts.push(category);
    }

    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    return category;
}

export function getDrafts() {
    try {
        return JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
    } catch {
        return [];
    }
}

export function deleteDraft(id) {
    const drafts = getDrafts().filter(d => d.id !== id);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

export function getDraft(id) {
    return getDrafts().find(d => d.id === id);
}

export default {
    isConfigured,
    getCommunityCategories,
    getCommunityCategory,
    submitCategory,
    flagCategory,
    incrementPlayCount,
    submitRanking,
    getCommunityRanking,
    getRankingCount,
    saveDraft,
    getDrafts,
    deleteDraft,
    getDraft
};

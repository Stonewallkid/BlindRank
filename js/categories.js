// Category data loader and manager

const RATING_LEVELS = {
    kids: 0,
    teen: 1,
    mature: 2,
    explicit: 3
};

class CategoryManager {
    constructor() {
        this.categories = [];
        this.loaded = false;
    }

    async loadCategories() {
        try {
            const response = await fetch('data/categories.json');
            const data = await response.json();
            this.categories = data.categories;
            this.loaded = true;
            return this.categories;
        } catch (error) {
            console.error('Failed to load categories:', error);
            return [];
        }
    }

    async loadCategory(categoryId) {
        try {
            const response = await fetch(`data/categories/${categoryId}.json`);
            const category = await response.json();
            return category;
        } catch (error) {
            console.error(`Failed to load category ${categoryId}:`, error);
            return null;
        }
    }

    getFilteredCategories(maxRating) {
        const maxLevel = RATING_LEVELS[maxRating] ?? 0;
        return this.categories.filter(cat => {
            const catLevel = RATING_LEVELS[cat.rating] ?? 0;
            return catLevel <= maxLevel;
        });
    }

    getCategoriesByRating(rating) {
        return this.categories.filter(cat => cat.rating === rating);
    }

    getRandomCategory(maxRating) {
        const filtered = this.getFilteredCategories(maxRating);
        if (filtered.length === 0) return null;
        return filtered[Math.floor(Math.random() * filtered.length)];
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    prepareGameItems(category, count) {
        // Shuffle items and take the requested count
        const shuffled = this.shuffleArray(category.items);
        return shuffled.slice(0, count);
    }
}

export default new CategoryManager();
export { RATING_LEVELS };

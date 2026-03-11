// BlindRank - Main Application Logic

import categoryManager from './categories.js';
import ui from './ui.js';
import supabase from './supabase.js';

// Game State
const state = {
    settings: {
        rating: 'kids',
        theme: 'dark',
        animations: 'on'
    },
    game: {
        category: null,
        items: [],
        currentIndex: 0,
        ranking: [],
        slots: [],
        size: 5,
        isCommunity: false,
        blindRanking: [],  // The ranking made during blind phase
        trueRanking: [],   // The re-ranked "true preference" ranking
        hasGoat: false,    // Whether this game has GOAT slot
        swapMode: null,    // 'swap' or 'replace' during re-rank
        swapFirst: null    // First item selected for swap
    },
    source: 'official', // 'official', 'community', 'create'
    create: {
        items: [],
        editingDraftId: null
    },
    player: {
        gamesPlayed: 0,
        swapTokens: 0,
        unlockedAll: false
    }
};

// Storage keys
const STORAGE_KEYS = {
    settings: 'blindrank_settings',
    hasVisited: 'blindrank_visited',
    stats: 'blindrank_stats'
};

// Load player stats from localStorage
function loadPlayerStats() {
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || '{}');
    state.player.gamesPlayed = stats.gamesPlayed || 0;
    state.player.swapTokens = stats.swapTokens || 0;
    state.player.unlockedAll = state.player.gamesPlayed >= 15;
}

// Check if GOAT should appear this game (every 5th game)
function shouldShowGoat() {
    const nextGame = state.player.gamesPlayed + 1;
    return nextGame % 5 === 0; // Every 5th game
}

// Get number of swap tokens
function getSwapTokens() {
    return state.player.swapTokens;
}

// Initialize Application
async function init() {
    loadSettings();
    loadPlayerStats();
    applySettings();
    setupEventListeners();

    // Show age modal if first visit
    if (!localStorage.getItem(STORAGE_KEYS.hasVisited)) {
        ui.showModal('age');
    }

    // Load categories
    ui.showLoading(document.getElementById('category-grid'));
    await categoryManager.loadCategories();
    renderCategories();
    renderDrafts();

    // Update UI with player stats
    ui.updatePlayerStats(state.player);
}

// Settings Management
function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEYS.settings);
    if (saved) {
        try {
            state.settings = { ...state.settings, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Failed to parse settings:', e);
        }
    }
}

function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function applySettings() {
    ui.setTheme(state.settings.theme);
    ui.setAnimations(state.settings.animations);
    ui.setActiveRatingTab(state.settings.rating);
    ui.syncSettings(state.settings);
}

// Event Listeners
function setupEventListeners() {
    // Logo - return to start
    document.getElementById('logo-btn').addEventListener('click', () => {
        ui.showScreen('start');
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
        state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
        saveSettings();
        applySettings();
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
        ui.showModal('settings');
    });

    // Close modal buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            ui.hideModal(btn.dataset.close);
        });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && modal.id !== 'age-modal') {
                ui.hideAllModals();
            }
        });
    });

    // Age selection
    document.querySelectorAll('.age-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.settings.rating = btn.dataset.rating;
            saveSettings();
            applySettings();
            localStorage.setItem(STORAGE_KEYS.hasVisited, 'true');
            ui.hideModal('age');
            renderCategories();
        });
    });

    // Source tabs (Official/Community/Create)
    document.querySelectorAll('.source-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.source = tab.dataset.source;
            ui.setActiveSourceTab(state.source);

            if (state.source === 'community') {
                loadCommunityCategories();
            } else if (state.source === 'create') {
                renderDrafts();
            }
        });
    });

    // Rating tabs
    document.querySelectorAll('.rating-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.settings.rating = tab.dataset.rating;
            saveSettings();
            ui.setActiveRatingTab(state.settings.rating);

            if (state.source === 'official') {
                renderCategories();
            } else if (state.source === 'community') {
                loadCommunityCategories();
            }
        });
    });

    // Size buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.game.size = parseInt(btn.dataset.size);
            ui.setActiveSizeBtn(state.game.size);
        });
    });

    // Shuffle/Random button
    document.getElementById('shuffle-btn').addEventListener('click', async () => {
        const randomCat = categoryManager.getRandomCategory(state.settings.rating);
        if (randomCat) {
            await startGame(randomCat, false);
        } else {
            ui.showToast('No categories available');
        }
    });

    // Community sort
    document.getElementById('community-sort').addEventListener('change', () => {
        loadCommunityCategories();
    });

    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to quit this game?')) {
            ui.showScreen('start');
        }
    });

    // Results buttons
    document.getElementById('share-btn').addEventListener('click', shareResults);
    document.getElementById('play-again-btn').addEventListener('click', playAgain);
    document.getElementById('new-category-btn').addEventListener('click', () => {
        ui.showScreen('start');
    });

    // Flag button
    document.getElementById('flag-category-btn').addEventListener('click', () => {
        ui.showModal('flag');
    });

    // Flag options
    document.querySelectorAll('.flag-option').forEach(btn => {
        btn.addEventListener('click', async () => {
            const reason = btn.dataset.reason;
            await handleFlag(reason);
        });
    });

    // Settings changes
    document.getElementById('setting-rating').addEventListener('change', (e) => {
        state.settings.rating = e.target.value;
        saveSettings();
        ui.setActiveRatingTab(state.settings.rating);
        renderCategories();
    });

    document.getElementById('setting-theme').addEventListener('change', (e) => {
        state.settings.theme = e.target.value;
        saveSettings();
        applySettings();
    });

    document.getElementById('setting-animations').addEventListener('change', (e) => {
        state.settings.animations = e.target.value;
        saveSettings();
        applySettings();
    });

    // Clear data
    document.getElementById('clear-data-btn').addEventListener('click', () => {
        if (confirm('This will clear all your settings and stats. Continue?')) {
            localStorage.clear();
            location.reload();
        }
    });

    // Create form - Add item
    document.getElementById('add-item-btn').addEventListener('click', addItem);
    document.getElementById('new-item-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });

    // Create form - Save draft
    document.getElementById('save-draft-btn').addEventListener('click', saveDraft);

    // Create form - Submit
    document.getElementById('submit-category-btn').addEventListener('click', submitCategory);

    // Confirm re-rank button
    document.getElementById('confirm-rerank-btn').addEventListener('click', confirmRerank);
}

// Render official categories
function renderCategories() {
    const filtered = categoryManager.getFilteredCategories(state.settings.rating);
    const container = document.getElementById('category-grid');
    ui.renderCategoryGrid(filtered, container, (cat) => startGame(cat, false), state.player.unlockedAll);
}

// Load and render community categories
async function loadCommunityCategories() {
    const container = document.getElementById('community-grid');
    ui.showLoading(container);

    if (!supabase.isConfigured()) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔧</div>
                <p>Community features require Supabase setup.<br>See supabase.js for instructions.</p>
            </div>
        `;
        return;
    }

    const sortBy = document.getElementById('community-sort').value;
    const categories = await supabase.getCommunityCategories(state.settings.rating, sortBy);

    ui.renderCommunityGrid(categories, container, (cat) => startCommunityGame(cat));
}

// Start game with official category
async function startGame(categoryMeta, isCommunity = false) {
    let category;

    if (isCommunity) {
        category = categoryMeta; // Already have full data
    } else {
        category = await categoryManager.loadCategory(categoryMeta.id);
        if (!category) {
            ui.showToast('Failed to load category');
            return;
        }
    }

    // Check if GOAT slot should appear (every 5th game)
    const hasGoat = shouldShowGoat();
    const totalSlots = hasGoat ? state.game.size + 1 : state.game.size;

    if (category.items.length < totalSlots) {
        ui.showToast(`This category only has ${category.items.length} items. Try a smaller ranking size.`);
        return;
    }

    // Reset game state
    state.game.category = category;
    state.game.items = categoryManager.prepareGameItems(category, totalSlots);
    state.game.currentIndex = 0;
    state.game.ranking = [];
    state.game.slots = new Array(totalSlots).fill(null);
    state.game.totalSlots = totalSlots;
    state.game.hasGoat = hasGoat;
    state.game.isCommunity = isCommunity;
    state.game.swapMode = null;
    state.game.swapFirst = null;

    // Setup UI
    ui.setCategoryName(category.name, categoryMeta.emoji || category.emoji || '🎯');

    // Show GOAT notification if this is a GOAT game
    if (hasGoat) {
        ui.showToast('🐐 GOAT Round! Pick your #1 of all time!');
    }

    ui.renderRankingSlots(state.game.size, handleSlotClick, hasGoat);
    ui.updateProgress(1, totalSlots);
    ui.updateCurrentItem(state.game.items[0], category.id);

    // Show game screen
    ui.showScreen('game');
}

// Start game with community category
async function startCommunityGame(categoryData) {
    // Increment play count
    supabase.incrementPlayCount(categoryData.id);

    await startGame(categoryData, true);
}

// Handle slot click during game
function handleSlotClick(rank) {
    const currentItem = state.game.items[state.game.currentIndex];

    // Place item in slot (rank 0 = GOAT if hasGoat, otherwise #1)
    state.game.slots[rank] = currentItem;
    state.game.ranking.push({ item: currentItem, rank });

    // Update UI
    ui.fillSlot(rank, currentItem, state.game.category.id, state.game.hasGoat);

    // Move to next item or end game
    state.game.currentIndex++;

    if (state.game.currentIndex >= state.game.totalSlots) {
        endGame();
    } else {
        ui.updateProgress(state.game.currentIndex + 1, state.game.totalSlots);
        ui.updateCurrentItem(state.game.items[state.game.currentIndex], state.game.category.id);
    }
}

// End blind phase - go to re-rank screen
function endGame() {
    // Save the blind ranking
    state.game.blindRanking = state.game.slots.filter(item => item !== null);

    // Start true ranking as a copy of blind ranking (user will reorder)
    state.game.trueRanking = [...state.game.blindRanking];

    // Render re-rank screen with hasGoat flag
    ui.renderRerankList(state.game.trueRanking, (reorderedItems) => {
        state.game.trueRanking = reorderedItems;
    }, state.game.hasGoat);

    // Show swap token info if player has tokens
    ui.updateSwapTokenDisplay(state.player.swapTokens);

    ui.showScreen('rerank');
}

// Confirm the re-ranking and show results
async function confirmRerank() {
    const blindRanking = state.game.blindRanking;
    const trueRanking = state.game.trueRanking;

    // Calculate vibe check score (blind vs true)
    const vibeScore = calculateVibeScore(blindRanking, trueRanking);
    const message = getVibeMessage(vibeScore);

    // Render comparison with hasGoat flag
    ui.renderResultsComparison(blindRanking, trueRanking, state.game.hasGoat);
    ui.setScore(vibeScore, message);
    ui.hideSharePreview();

    // Submit true ranking to community database
    const itemIds = trueRanking.map(item => item.id);
    await supabase.submitRanking(state.game.category.id, itemIds);

    // Try to get community score
    const communityRanking = await supabase.getCommunityRanking(state.game.category.id);
    if (communityRanking && communityRanking.length > 0) {
        const communityScore = calculateCommunityScore(trueRanking, communityRanking);
        ui.showCommunityScore(communityScore, true);
    } else {
        ui.showCommunityScore(0, false);
    }

    // Show flag button for community categories
    ui.showFlagButton(state.game.isCommunity);

    ui.showScreen('results');
    saveGameStats(vibeScore);
}

// Calculate vibe score: how close blind ranking is to true preference
function calculateVibeScore(blindRanking, trueRanking) {
    let matchPoints = 0;
    const maxPoints = blindRanking.length;

    blindRanking.forEach((item, blindIndex) => {
        const trueIndex = trueRanking.findIndex(t => t.id === item.id);
        const diff = Math.abs(blindIndex - trueIndex);

        if (diff === 0) matchPoints += 1;
        else if (diff === 1) matchPoints += 0.6;
        else if (diff === 2) matchPoints += 0.3;
        // else 0 points
    });

    return Math.round((matchPoints / maxPoints) * 100);
}

// Calculate community alignment score
function calculateCommunityScore(userRanking, communityRanking) {
    // communityRanking is an array of {item_id, avg_rank}
    let matchPoints = 0;
    const maxPoints = userRanking.length;

    userRanking.forEach((item, userIndex) => {
        const communityItem = communityRanking.find(c => c.item_id === item.id);
        if (communityItem) {
            const communityIndex = communityItem.avg_rank - 1; // avg_rank is 1-indexed
            const diff = Math.abs(userIndex - communityIndex);

            if (diff < 0.5) matchPoints += 1;
            else if (diff < 1.5) matchPoints += 0.6;
            else if (diff < 2.5) matchPoints += 0.3;
        }
    });

    return Math.round((matchPoints / maxPoints) * 100);
}

function getVibeMessage(score) {
    if (score >= 90) return "You're a mind reader! Perfect vibes!";
    if (score >= 75) return "Major vibe match! You get the people!";
    if (score >= 60) return "Good vibes! You're on the same wavelength.";
    if (score >= 40) return "Interesting taste... you're unique!";
    if (score >= 20) return "Bold picks! You march to your own beat.";
    return "Chaotic energy! We love it.";
}

// Share results
function shareResults() {
    const category = state.game.category;
    const finalRanking = state.game.slots.filter(item => item !== null);

    // Choose rank emojis based on whether this was a GOAT game
    const rankEmojis = state.game.hasGoat
        ? ['🐐', '🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '11']
        : ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    let shareText = `BlindRank: ${category.name}`;
    if (state.game.hasGoat) shareText += ' 🐐';
    shareText += '\n\n';

    finalRanking.forEach((item, index) => {
        shareText += `${rankEmojis[index] || (index + 1)} ${item.emoji} ${item.name}\n`;
    });
    shareText += `\nVibe Check: ${document.getElementById('score').textContent}`;
    shareText += `\n\n🎮 BlindRank`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
            ui.showToast('Copied to clipboard!');
        }).catch(() => {
            ui.showSharePreview(shareText);
        });
    } else {
        ui.showSharePreview(shareText);
    }
    ui.showSharePreview(shareText);
}

// Play again
async function playAgain() {
    const categoryMeta = {
        id: state.game.category.id,
        name: state.game.category.name,
        items: state.game.category.items
    };
    await startGame(categoryMeta, state.game.isCommunity);
}

// Save stats
function saveGameStats(score) {
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || '{}');
    const prevGamesPlayed = stats.gamesPlayed || 0;
    stats.gamesPlayed = prevGamesPlayed + 1;
    stats.totalScore = (stats.totalScore || 0) + score;
    stats.avgScore = Math.round(stats.totalScore / stats.gamesPlayed);
    if (!stats.highScore || score > stats.highScore) {
        stats.highScore = score;
    }

    // Award swap token every 20 games
    stats.swapTokens = stats.swapTokens || 0;
    if (stats.gamesPlayed % 20 === 0) {
        stats.swapTokens += 1;
        ui.showToast('🎁 You earned a Swap Token! Use it to swap items during re-rank.');
    }

    // Check for unlock milestone (15 games)
    if (prevGamesPlayed < 15 && stats.gamesPlayed >= 15) {
        ui.showToast('🔓 You unlocked 15 bonus categories!');
    }

    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));

    // Update local state
    state.player.gamesPlayed = stats.gamesPlayed;
    state.player.swapTokens = stats.swapTokens;
    state.player.unlockedAll = stats.gamesPlayed >= 15;

    // Update UI
    ui.updatePlayerStats(state.player);
}

// Flag handling
async function handleFlag(reason) {
    if (!state.game.isCommunity) return;

    const success = await supabase.flagCategory(state.game.category.id, reason);

    ui.hideModal('flag');

    if (success) {
        ui.showToast('Report submitted. Thank you!');
    } else {
        ui.showToast('Failed to submit report. Try again later.');
    }
}

// ==================
// Create Form Logic
// ==================

function addItem() {
    const emoji = document.getElementById('new-item-emoji').value.trim() || '❓';
    const name = document.getElementById('new-item-name').value.trim();
    const hint = document.getElementById('new-item-hint').value.trim();

    if (!name) {
        ui.showToast('Item name is required');
        return;
    }

    if (state.create.items.length >= 20) {
        ui.showToast('Maximum 20 items allowed');
        return;
    }

    state.create.items.push({
        id: state.create.items.length + 1,
        emoji,
        name,
        hint
    });

    // Clear inputs
    document.getElementById('new-item-emoji').value = '';
    document.getElementById('new-item-name').value = '';
    document.getElementById('new-item-hint').value = '';

    // Re-render
    ui.renderItemsList(state.create.items, removeItem);
}

function removeItem(index) {
    state.create.items.splice(index, 1);
    // Re-number IDs
    state.create.items.forEach((item, i) => item.id = i + 1);
    ui.renderItemsList(state.create.items, removeItem);
}

function saveDraft() {
    const formData = ui.getCreateFormData();

    if (!formData.name) {
        ui.showToast('Category name is required');
        return;
    }

    const draft = {
        ...formData,
        items: [...state.create.items],
        id: state.create.editingDraftId
    };

    supabase.saveDraft(draft);
    ui.showToast('Draft saved!');
    renderDrafts();
}

function renderDrafts() {
    const drafts = supabase.getDrafts();
    ui.renderDraftsList(
        drafts,
        (draft) => editDraft(draft),
        (id) => deleteDraft(id)
    );
}

function editDraft(draft) {
    state.create.editingDraftId = draft.id;
    state.create.items = draft.items ? [...draft.items] : [];

    ui.fillCreateForm(draft);
    ui.renderItemsList(state.create.items, removeItem);
    ui.showToast('Draft loaded');
}

function deleteDraft(id) {
    if (confirm('Delete this draft?')) {
        supabase.deleteDraft(id);
        if (state.create.editingDraftId === id) {
            state.create.editingDraftId = null;
            state.create.items = [];
            ui.clearCreateForm();
            ui.renderItemsList([], removeItem);
        }
        renderDrafts();
        ui.showToast('Draft deleted');
    }
}

async function submitCategory() {
    const formData = ui.getCreateFormData();

    // Validation
    if (!formData.name) {
        ui.showToast('Category name is required');
        return;
    }

    if (state.create.items.length < 10) {
        ui.showToast('At least 10 items are required');
        return;
    }

    const categoryData = {
        ...formData,
        items: state.create.items
    };

    if (!supabase.isConfigured()) {
        // Export as JSON instead
        const json = JSON.stringify(categoryData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formData.name.replace(/\s+/g, '-').toLowerCase()}.json`;
        a.click();
        ui.showToast('Category exported as JSON (Supabase not configured)');
        return;
    }

    try {
        await supabase.submitCategory(categoryData);

        // Clear form
        state.create.items = [];
        state.create.editingDraftId = null;
        ui.clearCreateForm();
        ui.renderItemsList([], removeItem);

        // Delete draft if we were editing one
        if (state.create.editingDraftId) {
            supabase.deleteDraft(state.create.editingDraftId);
            renderDrafts();
        }

        ui.showToast('Category submitted! It\'s now live.');

        // Switch to community tab
        state.source = 'community';
        ui.setActiveSourceTab('community');
        loadCommunityCategories();
    } catch (error) {
        console.error('Submit failed:', error);
        ui.showToast('Failed to submit. Try again later.');
    }
}

// Start the app
init();

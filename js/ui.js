// UI Manager - DOM manipulation and event handlers

class UIManager {
    constructor() {
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            rerank: document.getElementById('rerank-screen'),
            results: document.getElementById('results-screen')
        };
        this.modals = {
            age: document.getElementById('age-modal'),
            settings: document.getElementById('settings-modal'),
            flag: document.getElementById('flag-modal')
        };
        this.toast = document.getElementById('toast');
        this.toastTimeout = null;
    }

    // Screen Management
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }

    // Modal Management
    showModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.add('active');
        }
    }

    hideModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.remove('active');
        }
    }

    hideAllModals() {
        Object.values(this.modals).forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // Toast Notifications
    showToast(message, duration = 3000) {
        this.toast.textContent = message;
        this.toast.classList.add('visible');

        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }

        this.toastTimeout = setTimeout(() => {
            this.toast.classList.remove('visible');
        }, duration);
    }

    // Player Stats Display
    updatePlayerStats(player) {
        const statsEl = document.getElementById('player-stats');
        if (!statsEl) return;

        const gamesText = `🎮 ${player.gamesPlayed} games played`;
        const tokensText = player.swapTokens > 0 ? ` | 🎁 ${player.swapTokens} swap token${player.swapTokens > 1 ? 's' : ''}` : '';
        const nextToken = 20 - (player.gamesPlayed % 20);
        const nextTokenText = nextToken < 20 ? ` | ${nextToken} to next 🎁` : '';

        statsEl.innerHTML = `<span class="stats-text">${gamesText}${tokensText}${nextTokenText}</span>`;
        statsEl.style.display = 'block';
    }

    // Swap Button on Game screen (for swapping current item)
    updateSwapButton(tokens, poolSize) {
        const btn = document.getElementById('swap-item-btn');
        if (!btn) return;

        if (tokens > 0 && poolSize > 0) {
            btn.textContent = `🎁 Swap for random (${tokens} left)`;
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    }

    // Swap Token Display on Rerank screen
    updateSwapTokenDisplay(tokens) {
        const displayEl = document.getElementById('swap-token-display');
        if (!displayEl) return;

        // Hide on rerank screen - swaps are during gameplay now
        displayEl.style.display = 'none';
    }

    // Category Grid
    renderCategoryGrid(categories, container, onSelect) {
        container.innerHTML = '';

        if (categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <p>No categories available for this rating level.</p>
                </div>
            `;
            return;
        }

        categories.forEach((category) => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.dataset.id = category.id;
            card.innerHTML = `
                <div class="category-emoji">${category.emoji}</div>
                <div class="category-title">${category.name}</div>
                <div class="category-count">${category.itemCount} items</div>
                <span class="category-rating ${category.rating}">${category.rating}</span>
            `;
            card.addEventListener('click', () => onSelect(category));
            container.appendChild(card);
        });
    }

    // Game UI - render ranking slots
    // hasGoat: if true, first slot is GOAT (index 0), then 1,2,3...
    // if false, slots are just 1,2,3... (index 0,1,2...)
    renderRankingSlots(count, onSlotClick, hasGoat = false) {
        const container = document.getElementById('ranking-slots');
        container.innerHTML = '';

        const totalSlots = hasGoat ? count + 1 : count;

        for (let slotIndex = 0; slotIndex < totalSlots; slotIndex++) {
            const slot = document.createElement('div');
            const isGoatSlot = hasGoat && slotIndex === 0;

            slot.className = 'rank-slot' + (isGoatSlot ? ' goat-slot' : '');
            slot.dataset.rank = slotIndex;

            if (isGoatSlot) {
                slot.innerHTML = `
                    <div class="rank-number goat-icon">🐐</div>
                    <div class="slot-content">
                        <span class="slot-placeholder">The GOAT goes here</span>
                    </div>
                `;
            } else {
                const displayNum = hasGoat ? slotIndex : slotIndex + 1;
                slot.innerHTML = `
                    <div class="rank-number">${displayNum}</div>
                    <div class="slot-content">
                        <span class="slot-placeholder">Click to place item here</span>
                    </div>
                `;
            }

            slot.addEventListener('click', () => {
                if (!slot.classList.contains('filled')) {
                    onSlotClick(slotIndex);
                }
            });
            container.appendChild(slot);
        }
    }

    updateCurrentItem(item, categoryId) {
        const emojiEl = document.getElementById('item-emoji');
        const nameEl = document.getElementById('item-name');
        const hintEl = document.getElementById('item-hint');

        // Add animation class
        const card = document.querySelector('.item-card');
        card.style.animation = 'none';
        card.offsetHeight; // Trigger reflow
        card.style.animation = 'slideIn 0.4s ease';

        // Try to load image, fall back to emoji
        const imgPath = `images/categories/${categoryId}/${item.id}.png`;
        emojiEl.innerHTML = `<img src="${imgPath}" alt="${item.name}" class="item-image" onerror="this.parentElement.textContent='${item.emoji}'">`;

        nameEl.textContent = item.name;
        hintEl.textContent = item.hint || '';
    }

    fillSlot(rank, item, categoryId, hasGoat = false) {
        const slot = document.querySelector(`.rank-slot[data-rank="${rank}"]`);
        if (slot) {
            slot.classList.add('filled');
            const imgPath = `images/categories/${categoryId}/${item.id}.png`;
            slot.querySelector('.slot-content').innerHTML = `
                <span class="slot-item-emoji"><img src="${imgPath}" alt="${item.name}" class="slot-image" onerror="this.parentElement.textContent='${item.emoji}'"></span>
                <span class="slot-item-name">${item.name}</span>
            `;
            // Add GOAT crown effect when filling the GOAT slot
            if (hasGoat && rank === 0) {
                slot.classList.add('goat-filled');
            }
        }
    }

    updateProgress(current, total) {
        const progressEl = document.getElementById('progress');
        progressEl.textContent = `${current}/${total}`;
    }

    setCategoryName(name, emoji = '🎯') {
        document.getElementById('category-name').textContent = name;
        const emojiEl = document.getElementById('category-emoji-display');
        if (emojiEl) {
            emojiEl.textContent = emoji;
        }
    }

    // Re-rank UI
    renderRerankList(items, onReorder, hasGoat = false) {
        const container = document.getElementById('rerank-list');
        container.innerHTML = '';

        // Add two-column class for 7+ items
        if (items.length >= 7) {
            container.classList.add('two-column');
        } else {
            container.classList.remove('two-column');
        }

        let selectedIndex = null;

        const renderItems = () => {
            container.innerHTML = '';
            items.forEach((item, index) => {
                const el = document.createElement('div');
                const isGoat = hasGoat && index === 0;
                el.className = 'rerank-item' + (isGoat ? ' goat-item' : '');
                el.draggable = true;
                el.dataset.index = index;

                // Display: GOAT for first if hasGoat, otherwise numbered
                const rankDisplay = isGoat ? '🐐' : (hasGoat ? index : index + 1);

                el.innerHTML = `
                    <div class="rerank-rank${isGoat ? ' goat-rank' : ''}">${rankDisplay}</div>
                    <span class="rerank-emoji">${item.emoji}</span>
                    <span class="rerank-name">${item.name}</span>
                    <span class="rerank-handle">⋮⋮</span>
                `;

                // Click to select/swap
                el.addEventListener('click', () => {
                    if (selectedIndex === null) {
                        selectedIndex = index;
                        el.classList.add('selected');
                    } else if (selectedIndex === index) {
                        selectedIndex = null;
                        el.classList.remove('selected');
                    } else {
                        // Swap items
                        [items[selectedIndex], items[index]] = [items[index], items[selectedIndex]];
                        selectedIndex = null;
                        renderItems();
                        onReorder(items);
                    }
                });

                // Drag events
                el.addEventListener('dragstart', (e) => {
                    el.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', index);
                });

                el.addEventListener('dragend', () => {
                    el.classList.remove('dragging');
                    container.querySelectorAll('.rerank-item').forEach(item => {
                        item.classList.remove('drag-over');
                    });
                });

                el.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    el.classList.add('drag-over');
                });

                el.addEventListener('dragleave', () => {
                    el.classList.remove('drag-over');
                });

                el.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const toIndex = index;

                    if (fromIndex !== toIndex) {
                        const [movedItem] = items.splice(fromIndex, 1);
                        items.splice(toIndex, 0, movedItem);
                        renderItems();
                        onReorder(items);
                    }
                });

                container.appendChild(el);
            });
        };

        renderItems();
    }

    // Results UI - Compare blind vs true ranking
    renderResultsComparison(blindRanking, trueRanking, hasGoat = false) {
        const blindContainer = document.getElementById('blind-ranking');
        const trueContainer = document.getElementById('true-ranking');

        blindContainer.innerHTML = '';
        trueContainer.innerHTML = '';

        blindRanking.forEach((item, index) => {
            // Find where this item is in true ranking
            const trueIndex = trueRanking.findIndex(t => t.id === item.id);
            const diff = Math.abs(index - trueIndex);
            let matchClass = 'off';
            if (diff === 0) matchClass = 'match';
            else if (diff === 1) matchClass = 'close';

            // GOAT for position 0 only if hasGoat, otherwise numbered 1,2,3...
            const isGoat = hasGoat && index === 0;
            const rankDisplay = isGoat ? '🐐' : (hasGoat ? index : index + 1);

            const el = document.createElement('div');
            el.className = `mini-rank-item ${matchClass}${isGoat ? ' goat-result' : ''}`;
            el.innerHTML = `
                <div class="mini-rank-num${isGoat ? ' goat-num' : ''}">${rankDisplay}</div>
                <span class="mini-rank-emoji">${item.emoji}</span>
                <span class="mini-rank-name">${item.name}</span>
            `;
            blindContainer.appendChild(el);
        });

        trueRanking.forEach((item, index) => {
            // GOAT for position 0 only if hasGoat
            const isGoat = hasGoat && index === 0;
            const rankDisplay = isGoat ? '🐐' : (hasGoat ? index : index + 1);

            const el = document.createElement('div');
            el.className = `mini-rank-item${isGoat ? ' goat-result' : ''}`;
            el.innerHTML = `
                <div class="mini-rank-num${isGoat ? ' goat-num' : ''}">${rankDisplay}</div>
                <span class="mini-rank-emoji">${item.emoji}</span>
                <span class="mini-rank-name">${item.name}</span>
            `;
            trueContainer.appendChild(el);
        });
    }

    // Show community score section
    showCommunityScore(score, show = true) {
        const section = document.getElementById('community-score-section');
        section.style.display = show ? 'block' : 'none';
        if (show) {
            document.getElementById('community-score').textContent = `${score}%`;
        }
    }

    setScore(score, message) {
        document.getElementById('score').textContent = `${score}%`;
        document.getElementById('score-message').textContent = message;
    }

    showSharePreview(text) {
        const preview = document.getElementById('share-preview');
        preview.textContent = text;
        preview.classList.add('visible');
    }

    hideSharePreview() {
        document.getElementById('share-preview').classList.remove('visible');
    }

    // Theme
    setTheme(theme) {
        document.body.dataset.theme = theme;
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    // Animations setting
    setAnimations(value) {
        document.body.dataset.animations = value;
    }

    // Rating tabs
    setActiveRatingTab(rating) {
        document.querySelectorAll('.rating-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.rating === rating);
        });
    }

    // Size buttons
    setActiveSizeBtn(size) {
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === String(size));
        });
    }

    // Settings sync
    syncSettings(settings) {
        document.getElementById('setting-rating').value = settings.rating;
        document.getElementById('setting-theme').value = settings.theme;
        document.getElementById('setting-animations').value = settings.animations;
    }

    // Loading state
    showLoading(container) {
        container.innerHTML = '<div class="loading">Loading categories</div>';
    }

    // Source tabs (Official/Community/Create)
    setActiveSourceTab(source) {
        document.querySelectorAll('.source-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.source === source);
        });

        // Show/hide sections
        document.getElementById('official-section').style.display = source === 'official' ? 'block' : 'none';
        document.getElementById('community-section').style.display = source === 'community' ? 'block' : 'none';
        document.getElementById('create-section').style.display = source === 'create' ? 'block' : 'none';

        // Hide rating/size for create tab
        document.querySelector('.rating-filter').style.display = source === 'create' ? 'none' : 'block';
        document.querySelector('.size-selector').style.display = source === 'create' ? 'none' : 'block';
    }

    // Community Categories Grid
    renderCommunityGrid(categories, container, onSelect) {
        container.innerHTML = '';

        if (categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🌐</div>
                    <p>No community categories yet. Be the first to create one!</p>
                </div>
            `;
            return;
        }

        categories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'category-card community';
            card.dataset.id = category.id;

            const itemCount = category.items ? category.items.length : 0;
            const playCount = category.play_count || 0;

            card.innerHTML = `
                <span class="community-badge">Community</span>
                <div class="category-emoji">${category.emoji || '📦'}</div>
                <div class="category-title">${category.name}</div>
                <div class="author">by ${category.author_name || 'Anonymous'}</div>
                <div class="stats">
                    <span>🎮 ${playCount}</span>
                    <span>📦 ${itemCount}</span>
                </div>
                <span class="category-rating ${category.rating}">${category.rating}</span>
            `;
            card.addEventListener('click', () => onSelect(category));
            container.appendChild(card);
        });
    }

    // Create form - Items list
    renderItemsList(items, onRemove) {
        const container = document.getElementById('items-list');
        container.innerHTML = '';

        items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <span class="item-num">${index + 1}.</span>
                <span class="item-emoji">${item.emoji || '❓'}</span>
                <span class="item-name">${item.name}</span>
                <span class="item-hint">${item.hint || ''}</span>
                <button class="remove-item" data-index="${index}">×</button>
            `;
            row.querySelector('.remove-item').addEventListener('click', () => onRemove(index));
            container.appendChild(row);
        });

        document.getElementById('item-count').textContent = items.length;
    }

    // Drafts list
    renderDraftsList(drafts, onEdit, onDelete) {
        const container = document.getElementById('drafts-list');
        const section = document.getElementById('drafts-section');

        if (drafts.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        container.innerHTML = '';

        drafts.forEach(draft => {
            const row = document.createElement('div');
            row.className = 'draft-item';
            row.innerHTML = `
                <div class="draft-info">
                    <span class="draft-emoji">${draft.emoji || '📝'}</span>
                    <div>
                        <div class="draft-name">${draft.name || 'Untitled'}</div>
                        <div class="draft-count">${draft.items?.length || 0} items</div>
                    </div>
                </div>
                <div class="draft-actions">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;
            row.querySelector('.edit-btn').addEventListener('click', () => onEdit(draft));
            row.querySelector('.delete-btn').addEventListener('click', () => onDelete(draft.id));
            container.appendChild(row);
        });
    }

    // Clear create form
    clearCreateForm() {
        document.getElementById('create-name').value = '';
        document.getElementById('create-emoji').value = '';
        document.getElementById('create-rating').value = 'kids';
        document.getElementById('create-description').value = '';
        document.getElementById('create-author').value = '';
        document.getElementById('items-list').innerHTML = '';
        document.getElementById('item-count').textContent = '0';
    }

    // Fill create form from draft
    fillCreateForm(draft) {
        document.getElementById('create-name').value = draft.name || '';
        document.getElementById('create-emoji').value = draft.emoji || '';
        document.getElementById('create-rating').value = draft.rating || 'kids';
        document.getElementById('create-description').value = draft.description || '';
        document.getElementById('create-author').value = draft.authorName || '';
    }

    // Get create form data
    getCreateFormData() {
        return {
            name: document.getElementById('create-name').value.trim(),
            emoji: document.getElementById('create-emoji').value.trim() || '📦',
            rating: document.getElementById('create-rating').value,
            description: document.getElementById('create-description').value.trim(),
            authorName: document.getElementById('create-author').value.trim() || 'Anonymous'
        };
    }

    // Show/hide flag button
    showFlagButton(show) {
        document.getElementById('flag-category-btn').style.display = show ? 'block' : 'none';
    }
}

export default new UIManager();

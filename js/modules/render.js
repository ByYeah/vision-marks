const RenderManager = (() => {
    let currentPage = 1;
    const itemsPerPage = 16; // 8 filas × 2 columnas

    function renderFavorites(forceDisplayMode = null) {
        const container = document.getElementById('favBookmarksList');
        const emptyState = document.getElementById('emptyFavBookmarks');
        const containerBody = document.querySelector('[data-container="favbookmarks"] .container-body');
        const containerEl = document.querySelector('[data-container="favbookmarks"]');

        if (!container) return;

        // Determinar el modo de visualización: si se fuerza uno, usarlo, si no, leer del DOM
        let displayMode = forceDisplayMode;
        if (!displayMode) {
            displayMode = containerEl?.getAttribute('data-display') || 'list';
        }

        const favoritesCount = StateManager.getFavoritesCount();
        const maxFavorites = StateManager.getMaxFavorites();

        // GRID mode
        if (displayMode === 'grid-8') {
            renderFavoritesGrid('grid-8');
            updateFavoritesButton(favoritesCount, maxFavorites);
            return;
        }

        // LIST mode
        if (containerBody) {
            containerBody.style.overflow = 'auto';
            containerBody.style.display = 'block';
            containerBody.style.height = '100%';
        }

        const favorites = StateManager.getBookmarks(null, true);

        if (favorites.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.innerHTML = `<p>No hay favoritos aún<br><small>Máximo: ${maxFavorites}</small></p>`;
                emptyState.style.display = 'flex';
                if (containerBody) containerBody.style.overflow = 'hidden';
            }
            updateFavoritesButton(favoritesCount, maxFavorites);
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = favorites.map(b => createBookmarkHTML(b)).join('');
        attachBookmarkEvents(container);

        const bookmarkList = container.querySelector('.bookmark-list');
        if (bookmarkList && displayMode === 'list') {
            bookmarkList.style.overflowY = 'auto';
            bookmarkList.style.flex = '1';
            bookmarkList.style.minHeight = '0';
        }
        updateFavoritesButton(favoritesCount, maxFavorites);
    }

    function updateFavoritesButton(count, max) {
        const btn = document.querySelector('[data-container="favbookmarks"] .btn-add');
        if (!btn) return;

        if (count >= max) {
            btn.disabled = true;
            btn.style.opacity = '0.3';
            btn.style.cursor = 'not-allowed';
            btn.title = `Límite de ${max} alcanzado`;
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = `Añadir favorito (${count}/${max})`;
        }
    }

    function renderFavoritesGrid(mode) {
        const container = document.getElementById('favBookmarksList');
        const emptyState = document.getElementById('emptyFavBookmarks');
        const containerBody = document.querySelector('[data-container="favbookmarks"] .container-body');

        if (!container) return;

        // Grid mode: sin scroll, altura completa
        if (containerBody) {
            containerBody.style.overflow = 'hidden';
            containerBody.style.display = 'flex';
            containerBody.style.flexDirection = 'column';
            containerBody.style.height = '100%';
        }

        const favorites = StateManager.getBookmarks(null, true);

        if (favorites.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.innerHTML = '<p>No hay favoritos aún</p>';
                emptyState.style.display = 'flex';
            }
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const gridClass = 'grid-8';
        const maxItems = 16;

        const totalPages = Math.ceil(favorites.length / maxItems);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * maxItems;
        const endIndex = startIndex + maxItems;
        const displayFavorites = favorites.slice(startIndex, endIndex);

        const showTitle = false;


        const html = `<div class="favorites-grid ${gridClass}">${displayFavorites.map(b => `
        <div class="favorite-grid-item ${gridClass}" data-bookmark-id="${b.id}" title="${escapeHtml(b.title)}">
            <img src="${b.icon}" alt="" class="bookmark-icon" onerror="this.src='assets/icons/default-bookmark.png'">
            <div class="grid-item-actions">
                <button class="grid-item-btn edit" data-action="edit" data-bookmark-id="${b.id}" title="Editar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="grid-item-btn delete" data-action="delete" data-bookmark-id="${b.id}" title="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('')}</div>`;

        // Indicador de páginas solo si hay más de 16 items
        const pageIndicator = totalPages > 1 ? `
        <div class="grid-page-indicator" data-total="${totalPages}">
            <span class="page-dot ${currentPage === 1 ? 'active' : ''}" data-page="1"></span>
            <span class="page-dot ${currentPage === 2 ? 'active' : ''}" data-page="2"></span>
        </div>`: '';

        container.innerHTML = html + pageIndicator;

        attachGridEvents(container);
        // Si necesitas el wheel listener, añádelo después sin setTimeout
        if (totalPages > 1) {
            const containerBody = document.querySelector('[data-container="favbookmarks"] .container-body');
            if (containerBody) {
                containerBody.removeEventListener('wheel', handleGridWheel);
                containerBody.addEventListener('wheel', handleGridWheel, { passive: false });
            }
        }
    }

    // Controles de paginación
    function attachPageIndicator() {
        const indicator = document.querySelector('.grid-page-indicator');
        if (!indicator) return;

        // Click en puntos
        indicator.querySelectorAll('.page-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const page = parseInt(dot.dataset.page);
                if (page && page !== currentPage) {
                    currentPage = page;
                    renderFavoritesGrid('grid-8');
                }
            });
        });

        // Wheel para cambiar página
        const gridContainer = document.querySelector('[data-container="favbookmarks"] .container-body');
        if (gridContainer) {
            gridContainer.addEventListener('wheel', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.deltaY > 0 && currentPage < 2) {
                    currentPage++;
                    renderFavoritesGrid('grid-8');
                } else if (e.deltaY < 0 && currentPage > 1) {
                    currentPage--;
                    renderFavoritesGrid('grid-8');
                }
            }, { passive: false });
        }
    }

    // Handler del wheel con debounce para evitar cambios rápidos
    let wheelTimeout = null;
    function handleGridWheel(e) {
        e.preventDefault();
        e.stopPropagation();

        if (wheelTimeout) return;

        const indicator = document.querySelector('.grid-page-indicator');
        if (!indicator) return;

        // Calcular totalPages desde el estado, no del DOM
        const favorites = StateManager.getBookmarks(null, true);
        const totalPages = Math.ceil(favorites.length / 16);

        if (e.deltaY > 0 && currentPage < totalPages) {
            currentPage++;
            wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 300);
            renderFavoritesGrid('grid-8');
        } else if (e.deltaY < 0 && currentPage > 1) {
            currentPage--;
            wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 300);
            renderFavoritesGrid('grid-8');
        }
    }

    // Delegación de eventos para GRID
    function attachGridEvents(container) {
        // NO clonar ni reemplazar - usar delegation directa
        container.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const editBtn = e.target.closest('.grid-item-btn.edit');
            const deleteBtn = e.target.closest('.grid-item-btn.delete');
            const gridItem = e.target.closest('.favorite-grid-item');

            // EDITAR - llamada directa, SIN setTimeout
            if (editBtn) {
                const id = editBtn.dataset.bookmarkId;
                if (window.BookmarksManager && typeof BookmarksManager.openBookmarkModal === 'function') {
                    BookmarksManager.openBookmarkModal(null, id);
                }
                return;
            }

            // ELIMINAR - llamada directa, SIN setTimeout
            if (deleteBtn) {
                const id = deleteBtn.dataset.bookmarkId;
                if (window.BookmarksManager && typeof BookmarksManager.deleteBookmark === 'function') {
                    BookmarksManager.deleteBookmark(id);
                }
                return;
            }

            // ABRIR URL
            if (gridItem && !e.target.closest('.grid-item-actions')) {
                const id = gridItem.dataset.bookmarkId;
                const b = StateManager.getBookmarkById(id);
                if (b) window.open(b.url, '_blank');
            }
        }, { capture: true });
    }

    function renderFolders() {
        const container = document.getElementById('foldersGrid');
        if (!container) return;

        const folders = StateManager.getFolders();

        if (folders.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay carpetas. Crea una nueva.</div>';
            return;
        }

        container.innerHTML = folders.map(f => `
            <div class="folder-item" data-folder-id="${f.id}">
                <div class="folder-icon">${f.icon}</div>
                <div class="folder-name">${f.name}</div>
                <div class="folder-actions">
                    <button class="btn-folder-action btn-edit" data-action="edit" data-folder-id="${f.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-folder-action btn-delete" data-action="delete" data-folder-id="${f.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        attachFolderEvents(container);
    }

    function renderInFolder() {
        const container = document.getElementById('inFolderList');
        const emptyState = document.getElementById('emptyInFolder');
        const currentFolderId = StateManager.getState().currentFolder;

        if (!container) return;

        if (!currentFolderId) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.innerHTML = '<p>Selecciona una carpeta para ver su contenido</p>';
                emptyState.style.display = 'flex';
            }
            const btn = document.querySelector('[data-container="infolder"] .btn-add');
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
            }
            return;
        }

        const btn = document.querySelector('[data-container="infolder"] .btn-add');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }

        const bookmarks = StateManager.getBookmarks(currentFolderId, false);

        if (bookmarks.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.innerHTML = '<p>No hay marcadores en esta carpeta</p>';
                emptyState.style.display = 'flex';
            }
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = bookmarks.map(b => createBookmarkHTML(b)).join('');
        attachBookmarkEvents(container);
    }

    function createBookmarkHTML(b) {
        return `<li class="bookmark-item" data-bookmark-id="${b.id}">
            <img src="${b.icon}" alt="" class="bookmark-icon" onerror="this.src='assets/icons/default-bookmark.png'">
            <div class="bookmark-info">
                <div class="bookmark-title">${escapeHtml(b.title)}</div>
                <div class="bookmark-url">${escapeHtml(b.url)}</div>
            </div>
            <div class="bookmark-actions">
                <button class="btn-bookmark-action btn-favorite" data-action="favorite" data-bookmark-id="${b.id}" title="${b.isFavorite ? 'Quitar' : 'Añadir'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${b.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                </button>
                <button class="btn-bookmark-action btn-edit" data-action="edit" data-bookmark-id="${b.id}" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn-bookmark-action btn-delete" data-action="delete" data-bookmark-id="${b.id}" title="Eliminar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </li>`;
    }

    function attachBookmarkEvents(container) {
        container.querySelectorAll('[data-action="favorite"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                BookmarksManager.toggleFavorite(btn.dataset.bookmarkId);
            });
        });

        container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                BookmarksManager.openBookmarkModal(null, btn.dataset.bookmarkId);
            });
        });

        container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                BookmarksManager.deleteBookmark(btn.dataset.bookmarkId);
            });
        });

        container.querySelectorAll('.bookmark-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.bookmark-actions')) return;
                const b = StateManager.getBookmarkById(item.dataset.bookmarkId);
                if (b) window.open(b.url, '_blank');
            });
        });
    }

    function attachFolderEvents(container) {
        container.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.folder-actions')) return;
                FoldersManager.openFolder(item.dataset.folderId);
            });
        });

        container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                FoldersManager.openFolderModal(btn.dataset.folderId);
            });
        });

        container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                FoldersManager.deleteFolder(btn.dataset.folderId);
            });
        });
    }

    function updateFolderNavigation() {
        const fid = StateManager.getState().currentFolder;
        const nameEl = document.getElementById('currentFolderName');
        const btnBack = document.getElementById('btnBackToFolders');
        const infolder = document.querySelector('[data-container="infolder"]');

        if (fid) {
            const f = StateManager.getFolderById(fid);
            if (f) nameEl.textContent = `${f.icon} ${f.name}`;
            if (btnBack) btnBack.classList.remove('hidden');
            if (infolder) infolder.style.display = 'flex';
        } else {
            nameEl.textContent = 'Contenido';
            if (btnBack) btnBack.classList.add('hidden');
        }
    }

    function resetPage() {
        currentPage = 1;
    }

    function renderAll() {
        renderFavorites();
        renderFolders();
        renderInFolder();
        updateFolderNavigation();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        renderAll,
        renderFavorites,
        renderFolders,
        renderInFolder,
        updateFolderNavigation,
        renderFavoritesGrid,
        resetPage,
        updateFavoritesButton
    };
})();

window.addEventListener('containerDisplayChanged', (e) => {
    if (e.detail.container === 'favbookmarks') {
        // Usar RenderManager.renderFavorites, no la función suelta
        setTimeout(() => {
            if (e.detail.display === 'grid-8') {
                RenderManager.renderFavoritesGrid(e.detail.display);
            } else {
                RenderManager.renderFavorites();
            }
        }, 0);
    }
});
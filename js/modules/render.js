const RenderManager = (() => {
    function renderFavorites() {
        const container = document.getElementById('favBookmarksList');
        const emptyState = document.getElementById('emptyFavBookmarks');
        const favoritesCount = StateManager.getFavoritesCount();
        const maxFavorites = StateManager.getMaxFavorites();

        if (!container) return;

        const favorites = StateManager.getBookmarks(null, true);

        if (favorites.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.innerHTML = `<p>No hay favoritos aún<br><small>Máximo: ${maxFavorites}</small></p>`;
                emptyState.style.display = 'flex';
            }
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        container.innerHTML = favorites.map(bookmark => createBookmarkHTML(bookmark)).join('');
        attachBookmarkEvents(container);

        // Actualizar botón de añadir
        const btnAdd = document.querySelector('[data-container="favbookmarks"] .btn-add');
        if (btnAdd) {
            if (favoritesCount >= maxFavorites) {
                btnAdd.disabled = true;
                btnAdd.style.opacity = '0.3';
                btnAdd.style.cursor = 'not-allowed';
                btnAdd.title = `Límite de ${maxFavorites} favoritos alcanzado`;
            } else {
                btnAdd.disabled = false;
                btnAdd.style.opacity = '1';
                btnAdd.style.cursor = 'pointer';
                btnAdd.title = `Añadir marcador favorito (${favoritesCount}/${maxFavorites})`;
            }
        }
    }

    function renderFolders() {
        const container = document.getElementById('foldersGrid');

        if (!container) return;

        const folders = StateManager.getFolders();

        if (folders.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay carpetas. Crea una nueva.</div>';
            return;
        }

        container.innerHTML = folders.map(folder => `
            <div class="folder-item" data-folder-id="${folder.id}">
                <div class="folder-icon">${folder.icon}</div>
                <div class="folder-name">${folder.name}</div>
                <div class="folder-actions">
                    <button class="btn-folder-action btn-edit" data-action="edit" data-folder-id="${folder.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-folder-action btn-delete" data-action="delete" data-folder-id="${folder.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
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
            // Deshabilitar botón de añadir
            const btnAdd = document.querySelector('[data-container="infolder"] .btn-add');
            if (btnAdd) {
                btnAdd.disabled = true;
                btnAdd.style.opacity = '0.3';
                btnAdd.style.cursor = 'not-allowed';
                btnAdd.title = 'Selecciona una carpeta primero';
            }
            return;
        }

        // Habilitar botón de añadir
        const btnAdd = document.querySelector('[data-container="infolder"] .btn-add');
        if (btnAdd) {
            btnAdd.disabled = false;
            btnAdd.style.opacity = '1';
            btnAdd.style.cursor = 'pointer';
            btnAdd.title = 'Añadir marcador';
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

        container.innerHTML = bookmarks.map(bookmark => createBookmarkHTML(bookmark)).join('');
        attachBookmarkEvents(container);
    }

    function createBookmarkHTML(bookmark) {
        return `
            <li class="bookmark-item" data-bookmark-id="${bookmark.id}">
                <img src="${bookmark.icon}" alt="" class="bookmark-icon" 
                     onerror="this.src='assets/icons/default-bookmark.png'">
                <div class="bookmark-info">
                    <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
                    <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
                </div>
                <div class="bookmark-actions">
                    <button class="btn-bookmark-action btn-favorite" 
                            data-action="favorite" 
                            data-bookmark-id="${bookmark.id}"
                            title="${bookmark.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${bookmark.isFavorite ? 'currentColor' : 'none'}" 
                             stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </button>
                    <button class="btn-bookmark-action btn-edit" 
                            data-action="edit" 
                            data-bookmark-id="${bookmark.id}"
                            title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-bookmark-action btn-delete" 
                            data-action="delete" 
                            data-bookmark-id="${bookmark.id}"
                            title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </li>
        `;
    }

    function attachBookmarkEvents(container) {
        container.querySelectorAll('[data-action="favorite"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bookmarkId = btn.dataset.bookmarkId;
                BookmarksManager.toggleFavorite(bookmarkId);
            });
        });

        container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bookmarkId = btn.dataset.bookmarkId;
                BookmarksManager.openBookmarkModal(null, bookmarkId);
            });
        });

        container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bookmarkId = btn.dataset.bookmarkId;
                BookmarksManager.deleteBookmark(bookmarkId);
            });
        });

        container.querySelectorAll('.bookmark-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.bookmark-actions')) return;
                const bookmarkId = item.dataset.bookmarkId;
                const bookmark = StateManager.getBookmarkById(bookmarkId);
                if (bookmark) {
                    window.open(bookmark.url, '_blank');
                }
            });
        });
    }

    function attachFolderEvents(container) {
        container.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.folder-actions')) return;
                const folderId = item.dataset.folderId;
                FoldersManager.openFolder(folderId);
            });
        });

        container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.folderId;
                FoldersManager.openFolderModal(folderId);
            });
        });

        container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.folderId;
                FoldersManager.deleteFolder(folderId);
            });
        });
    }

    function updateFolderNavigation() {
        const currentFolderId = StateManager.getState().currentFolder;
        const folderNameEl = document.getElementById('currentFolderName');
        const btnBack = document.getElementById('btnBackToFolders');
        const infolderContainer = document.querySelector('[data-container="infolder"]');

        if (currentFolderId) {
            const folder = StateManager.getFolderById(currentFolderId);
            if (folder) {
                folderNameEl.textContent = folder.icon + ' ' + folder.name;
            }
            if (btnBack) btnBack.classList.remove('hidden');
            if (infolderContainer) infolderContainer.style.display = 'flex';
        } else {
            folderNameEl.textContent = 'Contenido';
            if (btnBack) btnBack.classList.add('hidden');
        }
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
        updateFolderNavigation
    };
})();
const EventsManager = (() => {
    function init() {
        SettingsManager.loadSettings();

        // 1. Forzar render inicial con settings aplicados
        setTimeout(() => {
            // 2. Forzar render inicial con settings aplicados
            if (window.RenderManager) {
                RenderManager.renderAll();
            }
        }, 100);

        // Inicializar estado del botón de InFolder
        const btnAddInFolder = document.querySelector('[data-container="infolder"] .btn-add');
        if (btnAddInFolder && !StateManager.getState().currentFolder) {
            btnAddInFolder.disabled = true;
            btnAddInFolder.style.opacity = '0.3';
            btnAddInFolder.style.cursor = 'not-allowed';
        }

        // Botones de añadir marcador
        document.querySelectorAll('[data-action="addBookmark"]').forEach(btn => {
            btn.addEventListener('click', handleAddBookmark);
        });

        // Botones de añadir carpeta
        document.querySelectorAll('[data-action="addFolder"]').forEach(btn => {
            btn.addEventListener('click', handleAddFolder);
        });

        // Botón volver a carpetas
        document.getElementById('btnBackToFolders')?.addEventListener('click', () => {
            FoldersManager.backToFolders();
        });

        // Botón de settings
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            const modal = ModalManager.createSettingsModal();
            ModalManager.openModal(modal);
        });

        // Búsqueda
        document.getElementById('searchInput')?.addEventListener('input', handleSearch);

        // Chat
        setupChat();

        // Cargar settings
        SettingsManager.loadSettings();

        // Inicializar eventos de reordenamiento
        initReorderEvents();
    }

    function handleAddBookmark(e) {
        const target = e.target.closest('[data-action]').dataset.target;
        let folderId = null;
        let forceFavorite = false;

        if (target === 'infolder') {
            const state = StateManager.getState();
            folderId = state.currentFolder;

            // Si no hay carpeta seleccionada, NO permitir crear
            if (!folderId) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        } else if (target === 'favbookmarks') {
            // Si se crea desde favoritos, forzar que sea favorito
            forceFavorite = true;

            // Verificar límite
            if (!StateManager.canAddFavorite()) {
                alert(`Límite de ${StateManager.getMaxFavorites()} favoritos alcanzado. Elimina o modifica alguno antes de añadir otro.`);
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }

        BookmarksManager.openBookmarkModal(folderId, null, forceFavorite);
    }

    function handleAddFolder(e) {
        FoldersManager.openFolderModal(null);
    }

    function handleSearch(e) {
        const query = e.target.value.trim().toLowerCase();
        console.log('Búsqueda:', query);
        // Implementar en F3
    }

    function setupChat() {
        const chatInput = document.getElementById('chatInput');
        const btnSendChat = document.getElementById('btnSendChat');

        if (chatInput && btnSendChat) {
            btnSendChat.addEventListener('click', handleChatSend);
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleChatSend();
            });
        }
    }

    function handleChatSend() {
        const chatInput = document.getElementById('chatInput');
        const chatMessages = document.getElementById('chatMessages');

        if (!chatInput || !chatMessages) return;

        const message = chatInput.value.trim();
        if (!message) return;

        // Añadir mensaje del usuario
        addChatMessage(message, 'user');
        chatInput.value = '';

        // Respuesta simulada
        setTimeout(() => {
            addChatMessage('Esta funcionalidad se conectará con la API en la Fase 3 para analizar tus marcadores.', 'bot');
        }, 500);
    }

    function addChatMessage(text, sender) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.innerHTML = `<p>${text}</p>`;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function initReorderEvents() {
        console.log('[Events] Inicializando eventos de reordenamiento');

        // Usar event delegation con capture: true para interceptar antes
        document.addEventListener('click', (e) => {
            // Click en botón MORE de lista
            const btnMore = e.target.closest('.btn-more');
            if (btnMore) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const itemId = btnMore.dataset.id;
                console.log('[Events] Click en btn-more para ID:', itemId);
                toggleContextMenu(itemId);
                return;
            }

            // Click en botón MORE de grid
            const btnMoreGrid = e.target.closest('.btn-more-grid');
            if (btnMoreGrid) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const itemId = btnMoreGrid.dataset.id;
                console.log('[Events] Click en btn-more-grid para ID:', itemId);
                toggleContextMenuGrid(itemId);
                return;
            }

            // Click en items del menú contextual de lista
            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem) {
                const contextMenu = menuItem.closest('.context-menu');
                if (!contextMenu) return;

                // Si es menú de grid, manejarlo aparte
                if (contextMenu.classList.contains('context-menu-grid')) {
                    handleGridMenuItemClick(e, menuItem, contextMenu);
                    return;
                }

                // Menú de lista
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const action = menuItem.dataset.action;
                const itemId = contextMenu.dataset.id;
                const parentItem = contextMenu.closest('.bookmark-item, .folder-item');
                const collection = parentItem?.dataset.collection;
                const folderId = parentItem?.dataset.folderId || null;

                console.log('[Events] Acción de menú lista:', action, 'para item:', itemId, 'colección:', collection);

                if (action === 'move-up' && window.ReorderManager) {
                    ReorderManager.moveUp(collection, itemId, folderId);
                } else if (action === 'move-down' && window.ReorderManager) {
                    ReorderManager.moveDown(collection, itemId, folderId);
                }

                closeAllContextMenus();
                return;
            }
        }, { capture: true });

        // Manejador separado para clicks fuera (cierre de menús)
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-more') &&
                !e.target.closest('.btn-more-grid') &&
                !e.target.closest('.context-menu')) {
                closeAllContextMenus();
            }
        });

        // Cerrar menús con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllContextMenus();
            }
        });
    }

    // Manejador específico para items del menú grid
    function handleGridMenuItemClick(e, menuItem, contextMenu) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const action = menuItem.dataset.action;
        const bookmarkId = menuItem.dataset.bookmarkId;
        const itemId = menuItem.dataset.id;
        const collection = menuItem.dataset.collection;

        console.log('[Events] Acción de menú grid:', action, 'para bookmark:', bookmarkId || itemId);

        switch (action) {
            case 'edit':
                if (window.BookmarksManager) {
                    BookmarksManager.openBookmarkModal(null, bookmarkId);
                }
                break;
            case 'toggle-favorite':
                if (window.BookmarksManager) {
                    BookmarksManager.toggleFavorite(bookmarkId);
                }
                break;
            case 'delete':
                if (window.BookmarksManager) {
                    BookmarksManager.deleteBookmark(bookmarkId);
                }
                break;
            case 'move-up':
                if (window.ReorderManager) {
                    ReorderManager.moveUp(collection, itemId, null);
                }
                break;
            case 'move-down':
                if (window.ReorderManager) {
                    ReorderManager.moveDown(collection, itemId, null);
                }
                break;
        }
        closeAllContextMenus();
    }

    function toggleContextMenu(itemId) {
        console.log('[ContextMenu] toggleContextMenu para ID:', itemId);

        const menu = document.querySelector(`.context-menu[data-id="${itemId}"]`);
        const btn = document.querySelector(`.btn-more[data-id="${itemId}"]`);

        if (!menu || !btn) {
            console.warn('[ContextMenu] Elementos no encontrados');
            return;
        }

        // Si el menú ya está activo, solo cerrarlo
        if (menu.classList.contains('active')) {
            closeAllContextMenus();
            return;
        }

        // Cerrar cualquier otro menú abierto
        closeAllContextMenus();

        // Remover clases de posición previas
        menu.classList.remove('position-top', 'position-bottom');

        // Activar el menú
        menu.classList.add('active');

        // Posicionamiento inteligente (con un pequeño delay para que el menú se haya renderizado)
        setTimeout(() => {
            positionContextMenu(menu, btn);
        }, 10);
    }

    // Función específica para toggle del menú en grid
    function toggleContextMenuGrid(itemId) {
        console.log('[ContextMenu] toggleContextMenuGrid para ID:', itemId);

        const menu = document.querySelector(`.context-menu-grid[data-id="${itemId}"]`);
        const btn = document.querySelector(`.btn-more-grid[data-id="${itemId}"]`);

        if (!menu || !btn) return;

        // Si el menú ya está activo, solo cerrarlo
        if (menu.classList.contains('active')) {
            closeAllContextMenus();
            return;
        }

        closeAllContextMenus();
        menu.classList.remove('position-top', 'position-bottom');
        menu.classList.add('active');

        setTimeout(() => {
            positionContextMenuGrid(menu, btn);
        }, 10);
    }

    function positionContextMenu(menu, btn) {
        const menuRect = menu.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const containerRect = document.querySelector('[data-container="favbookmarks"] .container-body')?.getBoundingClientRect();

        if (!containerRect) return;

        const spaceBelow = containerRect.bottom - btnRect.bottom;
        const spaceAbove = btnRect.top - containerRect.top;
        const menuHeight = menuRect.height;

        if (spaceBelow >= menuHeight + 10) {
            menu.style.top = '100%';
            menu.style.bottom = 'auto';
            menu.classList.add('position-bottom');
        } else if (spaceAbove >= menuHeight + 10) {
            menu.style.top = 'auto';
            menu.style.bottom = '100%';
            menu.classList.add('position-top');
        } else {
            menu.style.top = '100%';
            menu.style.bottom = 'auto';
            menu.classList.add('position-bottom');
        }
    }

    function positionContextMenuGrid(menu, btn) {
        const menuRect = menu.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const gridContainer = document.querySelector('.favorites-grid')?.getBoundingClientRect();

        if (!gridContainer) return;

        const spaceBelow = gridContainer.bottom - btnRect.bottom;
        const spaceAbove = btnRect.top - gridContainer.top;
        const menuHeight = menuRect.height;

        if (spaceBelow >= menuHeight + 10) {
            menu.style.top = '100%';
            menu.style.bottom = 'auto';
            menu.classList.add('position-bottom');
        } else if (spaceAbove >= menuHeight + 10) {
            menu.style.top = 'auto';
            menu.style.bottom = '100%';
            menu.classList.add('position-top');
        }
    }

    // Función para cerrar todos los menús contextuales
    function closeAllContextMenus() {
        console.log('[ContextMenu] Cerrando todos los menús');
        document.querySelectorAll('.context-menu.active').forEach(menu => {
            menu.classList.remove('active');
        });
    }

    return {
        init
    };
})();
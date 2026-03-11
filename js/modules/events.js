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
            // Click en botón MORE
            const btnMore = e.target.closest('.btn-more');
            if (btnMore) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const itemId = btnMore.dataset.id;
                console.log('[Events] Click en btn-more para ID:', itemId);
                toggleContextMenu(itemId);
                return false;
            }

            // Click en items del menú contextual
            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const action = menuItem.dataset.action;
                const contextMenu = menuItem.closest('.context-menu');

                if (!contextMenu) return false;

                const itemId = contextMenu.dataset.id;
                const parentItem = contextMenu.closest('.bookmark-item, .folder-item');
                const collection = parentItem?.dataset.collection;
                const folderId = parentItem?.dataset.folderId || null;

                console.log('[Events] Acción de menú:', action, 'para item:', itemId, 'colección:', collection);

                if (action === 'move-up' && window.ReorderManager) {
                    ReorderManager.moveUp(collection, itemId, folderId);
                } else if (action === 'move-down' && window.ReorderManager) {
                    ReorderManager.moveDown(collection, itemId, folderId);
                }

                // Cerrar todos los menús después de la acción
                closeAllContextMenus();
                return false;
            }
        }, { capture: true }); // ← Importante: capturar en fase de captura

        // Cerrar menús al hacer click fuera
        document.addEventListener('click', (e) => {
            // Si el click no fue en un botón more ni en un menú
            if (!e.target.closest('.btn-more') && !e.target.closest('.context-menu')) {
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

    function toggleContextMenu(itemId) {
        console.log('[ContextMenu] toggleContextMenu para ID:', itemId);

        // Encontrar el menú y el botón correspondientes
        const menu = document.querySelector(`.context-menu[data-id="${itemId}"]`);
        const btn = document.querySelector(`.btn-more[data-id="${itemId}"]`);

        if (!menu || !btn) {
            console.warn('[ContextMenu] Elementos no encontrados:', { menu: !!menu, btn: !!btn });
            return;
        }

        // Cerrar cualquier otro menú abierto
        closeAllContextMenus();

        // Remover clases de posición previas
        menu.classList.remove('position-top', 'position-bottom');

        // Activar el menú
        requestAnimationFrame(() => {
            menu.classList.add('active');

            // Calcular la posición después de que el menú sea visible
            setTimeout(() => {
                const menuRect = menu.getBoundingClientRect();
                const btnRect = btn.getBoundingClientRect();
                const containerRect = document.querySelector('[data-container="favbookmarks"] .container-body')?.getBoundingClientRect();

                if (!containerRect) return;

                // Espacio disponible abajo del botón
                const spaceBelow = containerRect.bottom - btnRect.bottom;
                // Espacio disponible arriba del botón
                const spaceAbove = btnRect.top - containerRect.top;

                // Altura del menú (con un pequeño margen de seguridad)
                const menuHeight = menuRect.height;

                // Decidir posición
                if (spaceBelow >= menuHeight + 10) {
                    // Hay suficiente espacio abajo - posición normal
                    menu.style.top = '100%';
                    menu.style.bottom = 'auto';
                    menu.classList.add('position-bottom');
                    console.log('[ContextMenu] Posicionado abajo');
                } else if (spaceAbove >= menuHeight + 10) {
                    // Hay suficiente espacio arriba - posición invertida
                    menu.style.top = 'auto';
                    menu.style.bottom = '100%';
                    menu.classList.add('position-top');
                    console.log('[ContextMenu] Posicionado arriba');
                } else {
                    // No hay espacio ni arriba ni abajo - posición abajo por defecto
                    menu.style.top = '100%';
                    menu.style.bottom = 'auto';
                    menu.classList.add('position-bottom');
                    console.log('[ContextMenu] Sin espacio, posición abajo');
                }

                console.log('[ContextMenu] Posición:', {
                    spaceAbove,
                    spaceBelow,
                    menuHeight
                });
            }, 10); // Pequeño delay para que el menú se haya renderizado
        });
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
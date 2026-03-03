const EventsManager = (() => {
    function init() {
        //Incializar estado de botones de añadir
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

        // Búsqueda
        document.getElementById('searchInput')?.addEventListener('input', handleSearch);

        // Chat
        setupChat();
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

    return {
        init
    };
})();
const BookmarksManager = (() => {
    // Obtener favicon desde LinkPreview o Google fallback
    async function fetchBookmarkIcon(url) {
        try {
        } catch (error) {
            console.log('LinkPreview no disponible, usando fallback de Google');
        }

        // Fallback: Google favicon service
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
        } catch (error) {
            return 'assets/icons/default-bookmark.png';
        }
    }

    function openBookmarkModal(folderId = null, bookmarkId = null, forceFavorite = false) {
        const bookmark = bookmarkId ? StateManager.getBookmarkById(bookmarkId) : null;
        const modal = ModalManager.createBookmarkModal(bookmark, folderId, forceFavorite);

        // Handle form submission
        setTimeout(() => {
            const form = modal.querySelector('#bookmarkForm');
            const saveBtn = modal.querySelector('[data-action="save"]');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');

            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                const formData = new FormData(form);
                const url = formData.get('url');
                let title = formData.get('title');
                const icon = formData.get('icon') || '';
                const bookmarkFolderId = formData.get('folderId');
                const isFavorite = forceFavorite || formData.get('isFavorite') === 'on';

                if (!url) {
                    alert('La URL es requerida');
                    return;
                }

                // Validar URL
                try {
                    new URL(url);
                } catch {
                    alert('URL inválida');
                    return;
                }

                // Si no hay título, extraerlo de la URL
                if (!title || title.trim() === '') {
                    try {
                        const urlObj = new URL(url);
                        title = urlObj.hostname.replace('www.', '');
                    } catch {
                        title = 'Marcador';
                    }
                }

                // Validar límite de favoritos
                if (isFavorite && !StateManager.canAddFavorite() && !bookmarkId) {
                    alert(`Límite de ${StateManager.getMaxFavorites()} favoritos alcanzado. Elimina alguno antes de añadir otro.`);
                    return;
                }

                // Obtener icono si no se proporcionó
                let finalIcon = icon;
                if (!finalIcon) {
                    finalIcon = await fetchBookmarkIcon(url);
                }

                if (bookmarkId) {
                    // Editar
                    StateManager.updateBookmark(bookmarkId, {
                        url,
                        title,
                        icon: finalIcon,
                        folderId: bookmarkFolderId || null,
                        isFavorite
                    });
                } else {
                    // Crear
                    StateManager.addBookmark({
                        url,
                        title,
                        icon: finalIcon,
                        folderId: bookmarkFolderId || null,
                        isFavorite
                    });
                }

                ModalManager.closeModal(modal);
                RenderManager.renderAll();
            });

            cancelBtn.addEventListener('click', () => {
                ModalManager.closeModal(modal);
            });
        }, 100);

        ModalManager.openModal(modal);
    }

    function deleteBookmark(bookmarkId) {
        const modal = ModalManager.createConfirmModal(
            'Eliminar Marcador',
            '¿Estás seguro de que deseas eliminar este marcador? Esta acción no se puede deshacer.',
            () => {
                StateManager.deleteBookmark(bookmarkId);
                ModalManager.closeModal(modal);
                RenderManager.renderAll();
            }
        );
        ModalManager.openModal(modal);
    }

    function toggleFavorite(bookmarkId) {
        // Verificar si se puede añadir favorito si se va a marcar
        const bookmark = StateManager.getBookmarkById(bookmarkId);
        if (bookmark && !bookmark.isFavorite) {
            if (!StateManager.canAddFavorite()) {
                alert(`Límite de ${StateManager.getMaxFavorites()} favoritos alcanzado. Elimina alguno antes.`);
                return;
            }
        }

        StateManager.toggleFavorite(bookmarkId);
        RenderManager.renderAll();
    }

    return {
        openBookmarkModal,
        deleteBookmark,
        toggleFavorite,
        fetchBookmarkIcon
    };
})();

window.BookmarksManager = BookmarksManager;
const BookmarksManager = (() => {
    async function createBookmark(data) {
        // Validar límite de favoritos
        if (data.isFavorite && !StateManager.canAddFavorite()) {
            alert(`Límite de ${StateManager.getMaxFavorites()} favoritos alcanzado. Elimina alguno antes de añadir otro.`);
            return false;
        }

        // Si no hay título, obtenerlo de la URL
        if (!data.title || data.title.trim() === '') {
            try {
                const urlObj = new URL(data.url);
                data.title = urlObj.hostname.replace('www.', '');
            } catch {
                data.title = 'Marcador';
            }
        }

        // Obtener icono si no se proporcionó
        if (!data.icon) {
            data.icon = await fetchBookmarkIcon(data.url);
        }

        StateManager.addBookmark(data);
        RenderManager.renderAll();
        return true;
    }

    async function updateBookmark(id, data) {
        const bookmark = StateManager.getBookmarkById(id);

        // Si se está marcando como favorito y no lo era antes, verificar límite
        if (data.isFavorite && !bookmark.isFavorite && !StateManager.canAddFavorite()) {
            alert(`Límite de ${StateManager.getMaxFavorites()} favoritos alcanzado.`);
            return false;
        }

        // Si no hay título, obtenerlo de la URL (solo si la URL cambió o el título estaba vacío)
        if ((!data.title || data.title.trim() === '') && data.url) {
            try {
                const urlObj = new URL(data.url);
                data.title = urlObj.hostname.replace('www.', '');
            } catch {
                data.title = 'Marcador';
            }
        }

        // Obtener icono si no se proporcionó y la URL cambió
        if (!data.icon && data.url !== bookmark.url) {
            data.icon = await fetchBookmarkIcon(data.url);
        }

        StateManager.updateBookmark(id, data);
        RenderManager.renderAll();
        return true;
    }

    async function fetchBookmarkIcon(url) {
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
        createBookmark,
        updateBookmark,
        openBookmarkModal,
        deleteBookmark,
        toggleFavorite,
        fetchBookmarkIcon
    };
})();
window.BookmarksManager = BookmarksManager;
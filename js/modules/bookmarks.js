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

    function testImageUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            const timeout = setTimeout(() => {
                img.src = '';
                resolve(false);
            }, 3000);

            img.onload = () => {
                clearTimeout(timeout);

                // Detectar si es el placeholder de Google
                const isGooglePlaceholder = url.includes('google.com') && (
                    img.width === 16 ||
                    img.width === 64 ||
                    img.naturalWidth === 16 ||
                    img.naturalHeight === 16
                );

                if (isGooglePlaceholder) {
                    console.log(`Google placeholder detectado para: ${url}`);
                    resolve(false);
                } else {
                    resolve(true);
                }
            };

            img.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            img.src = url;
        });
    }

    async function fetchBookmarkIcon(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            // Limpieza y extracción del dominio base 
            const cleanDomain = domain.replace(/^www\./, '');
            const baseDomain = cleanDomain;

            // Lista de URLs a probar en orden (fallback chain)
            const iconUrls = [
                // Capa 1: Favicon directo en assets
                `https://${baseDomain}/assets/favicon.ico`,
                `https://${baseDomain}/assets/favicon.png`,

                // Capa 2: Favicon directo en la raíz
                `https://${baseDomain}/favicon.ico`,
                `https://${baseDomain}/favicon.png`,

                // Capa 3: Google Favicon API
                `https://www.google.com/s2/favicons?domain=${baseDomain}&sz=64`,

                // Capa 4: DuckDuckGo
                `https://icons.duckduckgo.com/ip3/${baseDomain}.ico`,

                // Capa 5: Favicone
                `https://favicone.com/${baseDomain}?s=64`
            ];

            // Probar cada nivel de fallback hasta validar
            for (const iconUrl of iconUrls) {
                console.log(`Probando: ${iconUrl}`);
                const isValid = await testImageUrl(iconUrl);
                if (isValid) {
                    console.log(`Favicon encontrado para ${baseDomain}: ${iconUrl}`);
                    return iconUrl;
                }
            }

            // Si todo falla, devolver icono por defecto
            console.warn(`No se encontró favicon para ${baseDomain}, usando default`);
            return 'assets/icons/default-bookmark.png';

        } catch (error) {
            console.error('Error al obtener favicon:', error);
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
const ReorderManager = (function () {
    'use strict';

    // Referencias a otros managers (se inicializan en app.js)
    let StorageManager = null;
    let StateManager = null;
    let RenderManager = null;

    // Inicialización del módulo
    function init(storage, state, render) {
        StorageManager = storage;
        StateManager = state;
        RenderManager = render;
    }

    /**
     * Obtener el siguiente orden disponible para una colección
     * @param {string} collection - 'favorites' | 'folders' | 'bookmarks'
     * @param {string|null} folderId - ID de carpeta (solo para bookmarks)
     */
    function getNextOrder(collection, folderId = null) {
        let items;

        if (collection === 'favorites') {
            items = StateManager.getState().favorites || [];
        } else if (collection === 'folders') {
            items = StateManager.getState().folders || [];
        } else if (collection === 'bookmarks') {
            items = StateManager.getState().bookmarks || [];
            items = items.filter(b => b.folderId === folderId);
        }

        if (!items || items.length === 0) return 0;

        const maxOrder = Math.max(...items.map(i => i.order || 0));
        return maxOrder + 1;
    }

    /**
     * Mover elemento una posición hacia arriba
     * @param {string} collection - 'favorites' | 'folders' | 'bookmarks'
     * @param {string} itemId - ID del elemento
     * @param {string|null} folderId - ID de carpeta (solo para bookmarks)
     */
    function moveUp(collection, itemId, folderId = null) {
        if (!StateManager || !RenderManager) {
            return false;
        }

        const items = getCollection(collection, folderId);
        if (!items || items.length === 0) return false;

        const targetIndex = items.findIndex(i => i.id === itemId);
        if (targetIndex <= 0) return false;

        // Validación para carpetas en favoritos para mover arriba
        if (collection === 'folders') {
            const targetItem = items[targetIndex];
            const prevItem = items[targetIndex - 1];

            // Si el target es favorito y el previo no, no permitir mover
            if (targetItem.isFavorite && !prevItem.isFavorite) {
                return false;
            }
            // Si el target no es favorito y el previo sí, no permitir mover
            if (!targetItem.isFavorite && prevItem.isFavorite) {
                return false;
            }
        }

        // Intercambiar posiciones en el array
        [items[targetIndex - 1], items[targetIndex]] = [items[targetIndex], items[targetIndex - 1]];

        // Actualizar los valores de 'order' para reflejar la nueva posición
        items.forEach((item, index) => {
            item.order = index;
        });

        // Guardar los items ordenados según la colección
        if (collection === 'favorites') {
            const state = StateManager.getState();
            const nonFavorites = state.bookmarks.filter(b => !b.isFavorite);
            state.bookmarks = [...items, ...nonFavorites];
            StateManager.setState(state);
        } else if (collection === 'folders') {
            StateManager.setState({ folders: items });
        } else if (collection === 'bookmarks') {
            if (folderId) {
                const state = StateManager.getState();
                const otherBookmarks = state.bookmarks.filter(b => b.folderId !== folderId);
                state.bookmarks = [...otherBookmarks, ...items];
                StateManager.setState(state);
            } else {
                StateManager.setState({ bookmarks: items });
            }
        }

        RenderManager.renderAll();
        debugOrder(collection, folderId);
        return true;
    }


    // Mover elemento una posición hacia abajo
    function moveDown(collection, itemId, folderId = null) {
        if (!StateManager || !RenderManager) {
            return false;
        }

        const items = getCollection(collection, folderId);
        if (!items || items.length === 0) return false;

        const targetIndex = items.findIndex(i => i.id === itemId);
        if (targetIndex < 0 || targetIndex >= items.length - 1) return false;

        // Validación para carpetas en favoritos para mover abajo
        if (collection === 'folders') {
            const targetItem = items[targetIndex];
            const nextItem = items[targetIndex + 1];

            // Si el target es favorito y el siguiente no, no permitir mover
            if (targetItem.isFavorite && !nextItem.isFavorite) {
                return false;
            }
            // Si el target no es favorito y el siguiente sí, no permitir mover
            if (!targetItem.isFavorite && nextItem.isFavorite) {
                return false;
            }
        }

        // Intercambiar posiciones en el array
        [items[targetIndex], items[targetIndex + 1]] = [items[targetIndex + 1], items[targetIndex]];

        // Actualizar los valores de 'order' para reflejar la nueva posición
        items.forEach((item, index) => {
            item.order = index;
        });

        // Guardar los items ordenados según la colección
        if (collection === 'favorites') {
            const state = StateManager.getState();
            const nonFavorites = state.bookmarks.filter(b => !b.isFavorite);
            state.bookmarks = [...items, ...nonFavorites];
            StateManager.setState(state);
        } else if (collection === 'folders') {
            StateManager.setState({ folders: items });
        } else if (collection === 'bookmarks') {
            if (folderId) {
                const state = StateManager.getState();
                const otherBookmarks = state.bookmarks.filter(b => b.folderId !== folderId);
                state.bookmarks = [...otherBookmarks, ...items];
                StateManager.setState(state);
            } else {
                StateManager.setState({ bookmarks: items });
            }
        }

        RenderManager.renderAll();
        debugOrder(collection, folderId);
        return true;
    }

    // Mover elemento a una posición específica 
    function moveTo(collection, itemId, newOrder, folderId = null) {
        const items = getCollection(collection, folderId);
        const targetItem = items.find(i => i.id === itemId);

        if (!targetItem) return false;

        // Reordenar todos los items afectados
        const oldOrder = targetItem.order;

        if (newOrder > oldOrder) {
            // Moviendo hacia abajo
            items.forEach(item => {
                if (item.order > oldOrder && item.order <= newOrder) {
                    item.order -= 1;
                }
            });
        } else {
            // Moviendo hacia arriba
            items.forEach(item => {
                if (item.order >= newOrder && item.order < oldOrder) {
                    item.order += 1;
                }
            });
        }

        targetItem.order = newOrder;
        saveCollection(collection, items, folderId);
        RenderManager.renderAll();

        return true;
    }

    function debugOrder(collection, folderId = null) {
        const items = getCollection(collection, folderId);
        items.forEach((item, index) => {
        });
        return items;
    }

    // Obtener colección ordenada por 'order'
    function getCollection(collection, folderId = null) {
        // Validar que StateManager exista
        if (!StateManager || typeof StateManager.getBookmarks !== 'function') {
            return [];
        }

        let items;

        if (collection === 'favorites') {
            // getBookmarks(null, true) ya retorna array ordenado 
            items = StateManager.getBookmarks(null, true);
        } else if (collection === 'folders') {
            // getFolders() retorna array directo (NO .folders)
            items = StateManager.getFolders();
        } else if (collection === 'bookmarks') {
            // getBookmarks(folderId, false) retorna array directo (NO .bookmarks)
            items = StateManager.getBookmarks(folderId, false);
        }

        if (!Array.isArray(items)) {
            return [];
        }

        // Ya vienen ordenados por StateManager, pero aseguramos:
        return [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Guardar colección actualizada en el estado global y almacenamiento
    function saveCollection(collection, items, folderId = null) {
        const state = StateManager.getState();

        if (collection === 'favorites') {
            // Crear un nuevo array ordenado por 'order'
            const orderedItems = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));

            // Reconstruir el array de bookmarks manteniendo los que no son favoritos
            const nonFavorites = state.bookmarks.filter(b => !b.isFavorite);
            state.bookmarks = [...orderedItems, ...nonFavorites];

        } else if (collection === 'folders') {
            // Para carpetas, asignar directamente el array ordenado
            state.folders = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));

        } else if (collection === 'bookmarks') {
            if (folderId) {
                // Bookmarks dentro de una carpeta específica
                const orderedItems = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));

                // Reconstruir el array completo de bookmarks
                const otherBookmarks = state.bookmarks.filter(b => b.folderId !== folderId);
                state.bookmarks = [...otherBookmarks, ...orderedItems];
            } else {
                state.bookmarks = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
            }
        }

        StateManager.setState(state);
    }

    // Normalizar órdenes después de cualquier cambio masivo (ej. eliminación)
    function normalizeOrders(collection, folderId = null) {
        const items = getCollection(collection, folderId);

        items.forEach((item, index) => {
            item.order = index;
        });

        saveCollection(collection, items, folderId);
        RenderManager.renderAll();
    }

    return {
        init,
        getNextOrder,
        moveUp,
        moveDown,
        moveTo,
        normalizeOrders,
        getCollection
    };
})();

window.ReorderManager = ReorderManager;
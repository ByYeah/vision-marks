const StateManager = (() => {
    const MAX_FAVORITES = 32;
    let state = {
        bookmarks: [],
        folders: [],
        currentFolder: null,
        containers: {
            favbookmarks: { enabled: true, minimized: false },
            folders: { enabled: true, minimized: false },
            infolder: { enabled: true, minimized: false },
            chat: { enabled: true, minimized: false }
        },
        settings: {
            theme: 'light',
            layout: 'grid'
        }
    };

    const listeners = [];
    let isInitialized = false;
    let isSaving = false;

    function getState() {
        return state;
    }

    async function setState(newState) {
        state = { ...state, ...newState };
        notifyListeners();
        await saveToIndexedDB();
    }

    function subscribe(callback) {
        listeners.push(callback);
        return () => {
            const index = listeners.indexOf(callback);
            if (index > -1) listeners.splice(index, 1);
        };
    }

    function notifyListeners() {
        listeners.forEach(callback => {
            try {
                callback(state);
            } catch (error) {
                console.error('Error en listener:', error);
            }
        });
    }

    // Nueva función para guardar en IndexedDB
    async function saveToIndexedDB() {
        if (isSaving || !window.DatabaseManager) return;
        isSaving = true;

        try {
            StorageManager.saveState(state);

            if (window.SettingsManager) {
                const realSettings = SettingsManager.getSettings();
                localStorage.setItem('vmarks_settings_backup', JSON.stringify(realSettings));
            }

            // Guardar carpetas
            for (const folder of state.folders) {
                if (folder.id) {
                    await DatabaseManager.folders.update(folder).catch(() => { });
                }
            }

            // Guardar marcadores
            for (const bookmark of state.bookmarks) {
                if (bookmark.id) {
                    await DatabaseManager.bookmarks.update(bookmark).catch(() => { });
                }
            }

            // Guardar configuraciones
             if (window.SettingsManager) {
            const realSettings = SettingsManager.getSettings();
            await DatabaseManager.settings.set('theme', realSettings.theme).catch(() => {});
            await DatabaseManager.settings.set('layout', realSettings.layout).catch(() => {});
            await DatabaseManager.settings.set('fontFamily', realSettings.fontFamily).catch(() => {});
            await DatabaseManager.settings.set('colors', realSettings.colors).catch(() => {});
        }
        
        localStorage.setItem('bookmarkManagerContainers', JSON.stringify(state.containers));

        } catch (error) {
             console.debug('IndexedDB save failed (using localStorage only):', error);
            // Fallback a localStorage
            StorageManager.saveState(state);
        } finally {
            isSaving = false;
        }
    }

    // Nueva función para cargar desde IndexedDB
    async function loadFromIndexedDB() {
    if (!window.DatabaseManager) return false;
    
    try {
        await DatabaseManager.init();
        
        // Intentar cargar de IndexedDB
        const folders = await DatabaseManager.folders.getAll().catch(() => []);
        const bookmarks = await DatabaseManager.bookmarks.getAll().catch(() => []);
        const settings = await DatabaseManager.settings.getAll().catch(() => ({}));
        
        if (folders.length > 0) state.folders = folders;
        if (bookmarks.length > 0) state.bookmarks = bookmarks;
        
        // Si hay settings en IndexedDB, actualizar SettingsManager
        if (Object.keys(settings).length > 0 && window.SettingsManager) {
            const currentSettings = SettingsManager.getSettings();
            
            // Solo actualizar si encontramos valores nuevos
            if (settings.theme) currentSettings.theme = settings.theme;
            if (settings.layout) currentSettings.layout = settings.layout;
            if (settings.fontFamily) currentSettings.fontFamily = settings.fontFamily;
            if (settings.colors) currentSettings.colors = settings.colors;
            
            SettingsManager.updateSettings(currentSettings);
        }
        
        const containers = localStorage.getItem('bookmarkManagerContainers');
        if (containers) {
            state.containers = JSON.parse(containers);
        }
        
        return true;
    } catch (error) {
        console.warn('Error loading from IndexedDB, using localStorage:', error);
        
        // Fallback completo a localStorage
        const saved = StorageManager.loadState();
        if (saved) {
            state = { ...state, ...saved };
        }
        
        // Cargar settings de SettingsManager desde localStorage
        if (window.SettingsManager) {
            const settingsBackup = localStorage.getItem('vmarks_settings_backup');
            if (settingsBackup) {
                SettingsManager.updateSettings(JSON.parse(settingsBackup));
            }
        }
        
        return false;
    }
}

    // Versión asíncrona de loadState
    async function loadState() {
        if (isInitialized) return state;

        // Intentar cargar desde IndexedDB primero
        const loaded = await loadFromIndexedDB();

        if (!loaded) {
            // Fallback a localStorage
            const saved = StorageManager.loadState();
            if (saved) {
                state = { ...state, ...saved };
            }

            // Migrar a IndexedDB si hay datos
            if (saved && window.DatabaseManager) {
                migrateToIndexedDB();
            }
        }

        isInitialized = true;
        notifyListeners();
        return state;
    }

    // Migrar datos existentes a IndexedDB
    async function migrateToIndexedDB() {
        try {
            console.log('Migrando datos a IndexedDB...');

            // Migrar carpetas
            for (const folder of state.folders) {
                await DatabaseManager.folders.add(folder);
            }

            // Migrar marcadores
            for (const bookmark of state.bookmarks) {
                await DatabaseManager.bookmarks.add(bookmark);
            }

            // Migrar configuraciones
            await DatabaseManager.settings.setMultiple(state.settings);

            console.log('Migración completada');
        } catch (error) {
            console.error('Error en migración:', error);
        }
    }

    function getFavoritesCount() {
        return state.bookmarks.filter(b => b.isFavorite).length;
    }

    function canAddFavorite() {
        return getFavoritesCount() < MAX_FAVORITES;
    }

    function getMaxFavorites() {
        return MAX_FAVORITES;
    }

    // Bookmark operations
    async function addBookmark(bookmark) {
        const newBookmark = {
            id: Date.now().toString(),
            url: bookmark.url,
            title: bookmark.title,
            icon: bookmark.icon || '',
            folderId: bookmark.folderId || null,
            isFavorite: bookmark.isFavorite || false,
            order: state.bookmarks.filter(b => b.folderId === bookmark.folderId).length,
            createdAt: new Date().toISOString()
        };

        state.bookmarks.push(newBookmark);

        if (window.DatabaseManager) {
            try {
                await DatabaseManager.bookmarks.add(newBookmark);
            } catch (error) {
                console.error('Error guardando marcador en DB:', error);
            }
        }

        setState({ bookmarks: state.bookmarks });
        return newBookmark;
    }

    async function updateBookmark(id, updates) {
        const index = state.bookmarks.findIndex(b => b.id === id);
        if (index !== -1) {
            state.bookmarks[index] = { ...state.bookmarks[index], ...updates };

            if (window.DatabaseManager) {
                try {
                    await DatabaseManager.bookmarks.update(state.bookmarks[index]);
                } catch (error) {
                    console.error('Error actualizando marcador en DB:', error);
                }
            }

            setState({ bookmarks: state.bookmarks });
            return state.bookmarks[index];
        }
        return null;
    }

    async function deleteBookmark(id) {
        state.bookmarks = state.bookmarks.filter(b => b.id !== id);

        if (window.DatabaseManager) {
            try {
                await DatabaseManager.bookmarks.delete(id);
            } catch (error) {
                console.error('Error eliminando marcador de DB:', error);
            }
        }

        setState({ bookmarks: state.bookmarks });
    }

    async function toggleFavorite(id) {
        const bookmark = state.bookmarks.find(b => b.id === id);
        if (bookmark) {
            bookmark.isFavorite = !bookmark.isFavorite;

            if (window.DatabaseManager) {
                try {
                    await DatabaseManager.bookmarks.update(bookmark);
                } catch (error) {
                    console.error('Error actualizando favorito en DB:', error);
                }
            }

            setState({ bookmarks: state.bookmarks });
            return bookmark;
        }
        return null;
    }

    // Folder operations
    async function addFolder(folder) {
        const newFolder = {
            id: Date.now().toString(),
            name: folder.name,
            icon: folder.icon || '📁',
            isFavorite: folder.isFavorite || false,
            order: state.folders.length,
            createdAt: new Date().toISOString()
        };

        state.folders.push(newFolder);

        if (window.DatabaseManager) {
            try {
                await DatabaseManager.folders.add(newFolder);
            } catch (error) {
                console.error('Error guardando carpeta en DB:', error);
            }
        }

        setState({ folders: state.folders });
        return newFolder;
    }

    async function updateFolder(id, updates) {
        const index = state.folders.findIndex(f => f.id === id);
        if (index !== -1) {
            state.folders[index] = { ...state.folders[index], ...updates };

            if (window.DatabaseManager) {
                try {
                    await DatabaseManager.folders.update(state.folders[index]);
                } catch (error) {
                    console.error('Error actualizando carpeta en DB:', error);
                }
            }

            setState({ folders: state.folders });
            return state.folders[index];
        }
        return null;
    }

    async function deleteFolder(id) {
        state.folders = state.folders.filter(f => f.id !== id);
        // También eliminar marcadores de esta carpeta
        state.bookmarks = state.bookmarks.filter(b => b.folderId !== id);

        if (state.currentFolder === id) {
            state.currentFolder = null;
        }

        if (window.DatabaseManager) {
            try {
                await DatabaseManager.folders.delete(id);
                // Los marcadores se eliminan con la carpeta? Mejor mantenerlos sueltos
                for (const bookmark of state.bookmarks.filter(b => b.folderId === id)) {
                    await DatabaseManager.bookmarks.delete(bookmark.id);
                }
            } catch (error) {
                console.error('Error eliminando carpeta de DB:', error);
            }
        }

        setState({ folders: state.folders, bookmarks: state.bookmarks, currentFolder: state.currentFolder });
    }

    function setCurrentFolder(folderId) {
        state.currentFolder = folderId;
        setState({ currentFolder: folderId });
    }

    async function toggleFolderFavorite(id) {
        const folder = state.folders.find(f => f.id === id);
        if (folder) {
            folder.isFavorite = !folder.isFavorite;

            // Reordenar carpetas: favoritos primero, luego no favoritos
            const favorites = state.folders.filter(f => f.isFavorite).sort((a, b) => (a.order || 0) - (b.order || 0));
            const nonFavorites = state.folders.filter(f => !f.isFavorite).sort((a, b) => (a.order || 0) - (b.order || 0));

            // Reasignar órdenes
            favorites.forEach((f, idx) => { f.order = idx; });
            nonFavorites.forEach((f, idx) => { f.order = favorites.length + idx; });

            // Combinar arrays
            state.folders = [...favorites, ...nonFavorites];

            if (window.DatabaseManager) {
                try {
                    for (const f of state.folders) {
                        await DatabaseManager.folders.update(f);
                    }
                } catch (error) {
                    console.error('Error actualizando orden en DB:', error);
                }
            }

            setState({ folders: state.folders });
            return folder;
        }
        return null;
    }

    function getBookmarks(folderId = null, favorites = false) {
        let filtered = state.bookmarks;
        if (folderId !== null) {
            filtered = filtered.filter(b => b.folderId === folderId);
        }
        if (favorites) {
            filtered = filtered.filter(b => b.isFavorite);
        }
        // Siempre devuelve ordenado
        return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    function getFolders() {
        return [...state.folders].sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    function getBookmarkById(id) {
        return state.bookmarks.find(b => b.id === id);
    }

    function getFolderById(id) {
        return state.folders.find(f => f.id === id);
    }

    return {
        getState,
        setState,
        subscribe,
        loadState,
        addBookmark,
        updateBookmark,
        deleteBookmark,
        toggleFavorite,
        addFolder,
        updateFolder,
        deleteFolder,
        setCurrentFolder,
        getBookmarks,
        getFolders,
        getBookmarkById,
        getFolderById,
        getFavoritesCount,
        canAddFavorite,
        getMaxFavorites,
        toggleFolderFavorite
    };
})();

window.StateManager = StateManager;
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

    function getState() {
        return state;
    }

    function setState(newState) {
        state = { ...state, ...newState };
        notifyListeners();
        StorageManager.saveState(state);
    }

    function subscribe(callback) {
        listeners.push(callback);
    }

    function notifyListeners() {
        listeners.forEach(callback => callback(state));
    }

    function loadState() {
        const saved = StorageManager.loadState();
        if (saved) {
            state = { ...state, ...saved };
        }
        return state;
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
    function addBookmark(bookmark) {
        const newBookmark = {
            id: Date.now().toString(),
            url: bookmark.url,
            title: bookmark.title,
            icon: bookmark.icon || '',
            folderId: bookmark.folderId || null,
            isFavorite: bookmark.isFavorite || false,
            createdAt: new Date().toISOString()
        };
        state.bookmarks.push(newBookmark);
        setState({ bookmarks: state.bookmarks });
        return newBookmark;
    }

    function updateBookmark(id, updates) {
        const index = state.bookmarks.findIndex(b => b.id === id);
        if (index !== -1) {
            state.bookmarks[index] = { ...state.bookmarks[index], ...updates };
            setState({ bookmarks: state.bookmarks });
            return state.bookmarks[index];
        }
        return null;
    }

    function deleteBookmark(id) {
        state.bookmarks = state.bookmarks.filter(b => b.id !== id);
        setState({ bookmarks: state.bookmarks });
    }

    function toggleFavorite(id) {
        const bookmark = state.bookmarks.find(b => b.id === id);
        if (bookmark) {
            bookmark.isFavorite = !bookmark.isFavorite;
            setState({ bookmarks: state.bookmarks });
            return bookmark;
        }
        return null;
    }

    // Folder operations
    function addFolder(folder) {
        const newFolder = {
            id: Date.now().toString(),
            name: folder.name,
            icon: folder.icon || '📁',
            createdAt: new Date().toISOString()
        };
        state.folders.push(newFolder);
        setState({ folders: state.folders });
        return newFolder;
    }

    function updateFolder(id, updates) {
        const index = state.folders.findIndex(f => f.id === id);
        if (index !== -1) {
            state.folders[index] = { ...state.folders[index], ...updates };
            setState({ folders: state.folders });
            return state.folders[index];
        }
        return null;
    }

    function deleteFolder(id) {
        state.folders = state.folders.filter(f => f.id !== id);
        // Also remove bookmarks in this folder
        state.bookmarks = state.bookmarks.filter(b => b.folderId !== id);
        if (state.currentFolder === id) {
            state.currentFolder = null;
        }
        setState({ folders: state.folders, bookmarks: state.bookmarks, currentFolder: state.currentFolder });
    }

    function setCurrentFolder(folderId) {
        state.currentFolder = folderId;
        setState({ currentFolder: folderId });
    }

    // Getters
    function getBookmarks(folderId = null, favorites = false) {
        let filtered = state.bookmarks;
        if (folderId !== null) {
            filtered = filtered.filter(b => b.folderId === folderId);
        }
        if (favorites) {
            filtered = filtered.filter(b => b.isFavorite);
        }
        return filtered;
    }

    function getFolders() {
        return state.folders;
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
        getMaxFavorites
    };
})();
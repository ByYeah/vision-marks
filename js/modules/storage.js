const StorageManager = (() => {
    const STORAGE_KEY = 'vmarks_data';
    const STATE_KEY = 'vmarks_state';

    function saveData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error guardando datos:', error);
            return false;
        }
    }

    function loadData() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error cargando datos:', error);
            return null;
        }
    }

    function saveState(state) {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify({
                containers: state.containers,
                settings: state.settings,
                currentFolder: state.currentFolder
            }));
            return true;
        } catch (error) {
            console.error('Error guardando estado:', error);
            return false;
        }
    }

    function loadState() {
        try {
            const state = localStorage.getItem(STATE_KEY);
            return state ? JSON.parse(state) : null;
        } catch (error) {
            console.error('Error cargando estado:', error);
            return null;
        }
    }

    function clearAll() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STATE_KEY);
    }

    return {
        saveData,
        loadData,
        saveState,
        loadState,
        clearAll
    };
})();
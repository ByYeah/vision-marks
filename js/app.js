const AppState = {
    containers: {
        favbookmarks: { enabled: true, minimized: false },
        folders: { enabled: true, minimized: false },
        infolder: { enabled: true, minimized: false, currentFolder: null },
        chat: { enabled: true, minimized: false },
        widgets: { enabled: false, minimized: false }
    },
    bookmarks: [],
    folders: [],
    settings: {
        theme: 'light',
        layout: 'grid'
    }
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {

    if (window.DatabaseManager) {
        DatabaseManager.init().catch(() => { });  // <-- Inicializar DB
    }

    // 2. Inicializar IconManager
        if (window.IconManager) {
            await IconManager.init();
            console.log('🎨 IconManager inicializado');
        }

    // Cargar estado
    await StateManager.loadState();

    const state = StateManager.getState();
    AppState.containers = state.containers;
    AppState.bookmarks = state.bookmarks;
    AppState.folders = state.folders;
    AppState.settings = state.settings;

    // Debug: mostrar settings actuales
    setTimeout(() => {
        if (window.SettingsManager) {
            const s = SettingsManager.getSettings();
            console.log('⚙️ Settings actuales:', {
                layout: s.layout,
                favDisplay: s.containers.favbookmarks.display,
                theme: s.theme
            });
        }
    }, 200);

    // Renderizar inicial
    if (window.RenderManager) {
        RenderManager.renderAll();
    }

    if (window.ReorderManager && typeof ReorderManager.init === 'function') {
        ReorderManager.init(StorageManager, StateManager, RenderManager);
    }

    // Inicializar eventos
    if (window.EventsManager) {
        EventsManager.init();
    }

    setTimeout(() => {
        if (window.SearchManager) {
            SearchManager.init();
            console.log('🔍 SearchManager initialized');
        }
    }, 500);

    // Suscribirse a cambios de estado
    StateManager.subscribe((newState) => {
        // Mantener AppState sincronizado
        AppState.containers = newState.containers;
        AppState.bookmarks = newState.bookmarks;
        AppState.folders = newState.folders;
        AppState.settings = newState.settings;
    });

    // Cargar iconos SVG
    if (window.SvgLoader) {
        SvgLoader.loadAll();
    }
});

// Inicializar event listeners
function initEventListeners() {
    // Toggle containers
    document.querySelectorAll('[data-action="toggleContainer"]').forEach(btn => {
        btn.addEventListener('click', handleToggleContainer);
    });

    // Botones de añadir (preparación para F2)
    document.querySelectorAll('[data-action="addBookmark"], [data-action="addFolder"]').forEach(btn => {
        btn.addEventListener('click', handleAddAction);
    });

    // Chat
    const chatInput = document.getElementById('chatInput');
    const btnSendChat = document.getElementById('btnSendChat');

    if (chatInput && btnSendChat) {
        btnSendChat.addEventListener('click', handleChatSend);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChatSend();
        });
    }

    // Settings y Profile (preparación)
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
    });

    document.getElementById('profileBtn')?.addEventListener('click', () => {
    });
}

// Manejar toggle de contenedores
function handleToggleContainer(e) {
    const container = e.target.closest('.container-item');
    if (!container) return;

    const containerType = container.dataset.container;
    container.classList.toggle('minimized');

    // Actualizar estado
    AppState.containers[containerType].minimized = container.classList.contains('minimized');

    // Actualizar icono
    const btn = e.target.closest('.btn-toggle');
    const svg = btn.querySelector('svg');
    if (container.classList.contains('minimized')) {
        svg.innerHTML = '<polyline points="6 15 12 9 18 15"></polyline>';
    } else {
        svg.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
    }

    StateManager.setState({ containers: AppState.containers });
}

// Manejar envío de chat
function handleChatSend() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatInput || !chatMessages) return;

    const message = chatInput.value.trim();
    if (!message) return;

    // Añadir mensaje del usuario
    addChatMessage(message, 'user');

    // Limpiar input
    chatInput.value = '';

    // Respuesta simulada (en F3 se conectará con la API)
    setTimeout(() => {
        addChatMessage('Esta es una respuesta simulada. En la Fase 3 conectaré con la API para analizar tus marcadores.', 'bot');
    }, 500);
}

// Añadir mensaje al chat
function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = `<p>${text}</p>`;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Función handleAddAction necesaria para los botones
function handleAddAction(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'addBookmark') {
        // Aquí irá la lógica para añadir marcador
        console.log('Añadir marcador');
    } else if (action === 'addFolder') {
        // Aquí irá la lógica para añadir carpeta
        console.log('Añadir carpeta');
    }
}

// Manejar búsqueda
function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    // En F2 se implementará la lógica de búsqueda
}

// Renderizar estado inicial (si es necesario)
function renderInitialState() {
    // Aquí se renderizarán los datos iniciales
}


// Guardar estado en localStorage
function saveState() {
    try {
        localStorage.setItem('bookmarkManagerContainers', JSON.stringify(AppState.containers));
    } catch (error) { }
}

// Cargar estado desde localStorage
function loadState() {
    try {
        const saved = localStorage.getItem('bookmarkManagerContainers');
        if (saved) {
            const containers = JSON.parse(saved);
            Object.assign(AppState.containers, containers);
        }
    } catch (error) { }
}

// Cargar estado al iniciar
window.saveState = saveState;
window.loadState = loadState;

// Cargar iconos SVG después del DOM ready
document.addEventListener('DOMContentLoaded', () => {

    // Cargar iconos SVG externos
    if (typeof SvgLoader !== 'undefined') {
        SvgLoader.loadAll();
    }
});

window.checkStorage = async function() {
    console.log('%c📦 VERIFICACIÓN DE ALMACENAMIENTO', 'font-size:16px; font-weight:bold;');
    
    // 1. IndexedDB
    console.group('📀 IndexedDB:');
    if (DatabaseManager) {
        const folders = await DatabaseManager.folders.getAll();
        const bookmarks = await DatabaseManager.bookmarks.getAll();
        const settings = await DatabaseManager.settings.getAll();
        console.log('Carpetas:', folders.length);
        console.log('Marcadores:', bookmarks.length);
        console.log('Settings:', settings);
    } else {
        console.log('No disponible');
    }
    console.groupEnd();
    
    // 2. SettingsManager real
    console.group('⚙️ SettingsManager real:');
    if (SettingsManager) {
        console.log(SettingsManager.getSettings());
    }
    console.groupEnd();
    
    // 3. localStorage backups
    console.group('💾 localStorage:');
    console.log('vmarks_settings:', localStorage.getItem('vmarks_settings'));
    console.log('vmarks_settings_backup:', localStorage.getItem('vmarks_settings_backup'));
    console.log('bookmarkManagerContainers:', localStorage.getItem('bookmarkManagerContainers'));
    console.groupEnd();
    
    console.log('%c✅ Verificación completa', 'color:green');
};

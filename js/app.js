/**
 * BookmarkManager - App Principal
 * Fase 1: Estructura básica del layout
 */

// Estado global de la aplicación
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('📑 BookmarkManager iniciado');
    initEventListeners();
    renderInitialState();
});

/**
 * Inicializar event listeners
 */
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
    
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Settings y Profile (preparación)
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        console.log('Abrir settings');
    });
    
    document.getElementById('profileBtn')?.addEventListener('click', () => {
        console.log('Abrir profile');
    });
}

/**
 * Manejar toggle de contenedores
 */
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
    
    saveState();
}

/**
 * Manejar acciones de añadir (placeholder para F2)
 */
function handleAddAction(e) {
    const action = e.target.closest('[data-action]').dataset.action;
    const target = e.target.closest('[data-action]').dataset.target;
    
    console.log(`Acción: ${action}, Target: ${target}`);
    
    // En F2 se abrirán los modales correspondientes
    alert(`En la Fase 2 se abrirá el modal para: ${action} en ${target}`);
}

/**
 * Manejar envío de chat
 */
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

/**
 * Añadir mensaje al chat
 */
function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = `<p>${text}</p>`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Manejar búsqueda
 */
function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    console.log('Búsqueda:', query);
    // En F2 se implementará la lógica de búsqueda
}

/**
 * Renderizar estado inicial
 */
function renderInitialState() {
    // Aquí se renderizarán los datos iniciales
    console.log('Renderizando estado inicial...');
}

/**
 * Guardar estado en localStorage
 */
function saveState() {
    try {
        localStorage.setItem('bookmarkManagerState', JSON.stringify({
            containers: AppState.containers,
            settings: AppState.settings
        }));
    } catch (error) {
        console.error('Error guardando estado:', error);
    }
}

/**
 * Cargar estado desde localStorage
 */
function loadState() {
    try {
        const saved = localStorage.getItem('bookmarkManagerState');
        if (saved) {
            const state = JSON.parse(saved);
            Object.assign(AppState.containers, state.containers || {});
            Object.assign(AppState.settings, state.settings || {});
        }
    } catch (error) {
        console.error('Error cargando estado:', error);
    }
}

// Cargar estado al iniciar
loadState();
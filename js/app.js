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
        layout: 'double'
    }
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Inicializar DatabaseManager
        if (window.DatabaseManager) {
            await DatabaseManager.init();
        }

        // 2. Inicializar IconManager
        if (window.IconManager) {
            await IconManager.init();
            console.log('🎨 IconManager inicializado');
        }

        // 3. Cargar SettingsManager (esto aplica tema y layout)
        if (window.SettingsManager) {
            SettingsManager.loadSettings();
            console.log('⚙️ SettingsManager cargado');
        }

        // 4. Cargar StateManager (carga marcadores y carpetas desde IndexedDB)
        if (window.StateManager) {
            await StateManager.loadState();
        }

        // 5. Sincronizar AppState con StateManager
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
                    favDisplay: s.containers?.favbookmarks?.display,
                    theme: s.theme
                });
            }
        }, 200);

        // 6. Renderizar inicial
        if (window.RenderManager) {
            RenderManager.renderAll();
        }

        // 7. Inicializar ReorderManager
        if (window.ReorderManager && typeof ReorderManager.init === 'function') {
            ReorderManager.init(StorageManager, StateManager, RenderManager);
        }

        // 8. Inicializar eventos
        if (window.EventsManager) {
            EventsManager.init();
        }

        // 9. Inicializar SearchManager (con delay)
        setTimeout(() => {
            if (window.SearchManager) {
                SearchManager.init();
                console.log('🔍 SearchManager initialized');
            }
        }, 500);

        // 10. Inicializar ChatManager (con delay)
        setTimeout(() => {
            if (window.ChatManager) {
                ChatManager.init();
                console.log('💬 ChatManager initialized');
            }
        }, 600);

        console.log('📋 Widgets disponibles:', {
            PhotoGrid: !!window.PhotoGridWidget,
            RecentBookmarks: !!window.RecentBookmarksWidget,
            DailyQuote: !!window.DailyQuoteWidget,
            GoalsCounter: !!window.GoalsCounterWidget,
            WidgetManager: !!window.WidgetManager
        });

        // 11. Registrar widgets ANTES de inicializar WidgetManager
        if (window.registerAllWidgets) {
            window.registerAllWidgets();
        }

        // 12. Inicializar WidgetManager (después de registrar widgets)
        setTimeout(() => {
            if (window.WidgetManager) {
                WidgetManager.init();
                console.log('🎲 WidgetManager initialized');
            }
        }, 650);

        // 13. Suscribirse a cambios de estado (para mantener AppState sincronizado)
        StateManager.subscribe((newState) => {
            AppState.containers = newState.containers;
            AppState.bookmarks = newState.bookmarks;
            AppState.folders = newState.folders;
            AppState.settings = newState.settings;
        });

        // 14. Cargar iconos SVG
        if (window.SvgLoader) {
            SvgLoader.loadAll();
        }

        console.log('✅ Vision Marks iniciado correctamente');

    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        // Fallback a inicialización básica
        if (window.RenderManager) {
            RenderManager.renderAll();
        }
        if (window.EventsManager) {
            EventsManager.init();
        }
    }
});

// Inicializar event listeners
function initEventListeners() {
    // Toggle containers
    document.querySelectorAll('[data-action="toggleContainer"]').forEach(btn => {
        btn.addEventListener('click', handleToggleContainer);
    });

    // Botones de añadir
    document.querySelectorAll('[data-action="addBookmark"], [data-action="addFolder"]').forEach(btn => {
        btn.addEventListener('click', handleAddAction);
    });

    // Settings y Profile
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        if (window.ModalManager) {
            const modal = ModalManager.createSettingsModal();
            ModalManager.openModal(modal);
        }
    });

    document.getElementById('profileBtn')?.addEventListener('click', () => {
        console.log('Profile clicked');
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

    if (window.StateManager) {
        StateManager.setState({ containers: AppState.containers });
    }
}

// Función handleAddAction
function handleAddAction(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'addBookmark') {
        console.log('Añadir marcador');
    } else if (action === 'addFolder') {
        console.log('Añadir carpeta');
    }
}

// Guardar estado en localStorage (backup)
function saveState() {
    try {
        localStorage.setItem('bookmarkManagerContainers', JSON.stringify(AppState.containers));
    } catch (error) { }
}

// Cargar estado desde localStorage (backup)
function loadState() {
    try {
        const saved = localStorage.getItem('bookmarkManagerContainers');
        if (saved) {
            const containers = JSON.parse(saved);
            Object.assign(AppState.containers, containers);
        }
    } catch (error) { }
}

// Cargar estado al iniciar (backup)
loadState();

window.saveState = saveState;
window.loadState = loadState;

// Cargar iconos SVG después del DOM ready (asegurar que se ejecute solo una vez)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof SvgLoader !== 'undefined') {
        SvgLoader.loadAll();
    }
});

// Función de verificación
window.checkStorage = async function () {
    console.log('%c📦 VERIFICACIÓN DE ALMACENAMIENTO', 'font-size:16px; font-weight:bold;');

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

    console.group('⚙️ SettingsManager real:');
    if (SettingsManager) {
        console.log(SettingsManager.getSettings());
    }
    console.groupEnd();

    console.group('💾 localStorage:');
    console.log('vmarks_settings:', localStorage.getItem('vmarks_settings'));
    console.log('vmarks_settings_backup:', localStorage.getItem('vmarks_settings_backup'));
    console.log('bookmarkManagerContainers:', localStorage.getItem('bookmarkManagerContainers'));
    console.groupEnd();

    console.log('%c✅ Verificación completa', 'color:green');
};

// Registro del Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration.scope);

                // Detectar cuando hay una nueva versión
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('Nuevo Service Worker instalando');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('Nueva versión disponible, actualizando...');
                            // Mostrar notificación al usuario
                            if (window.ModalManager) {
                                ModalManager.showConfirmModal(
                                    'Actualización disponible',
                                    'Hay una nueva versión de la aplicación. ¿Deseas actualizar ahora?',
                                    'Actualizar',
                                    'Más tarde'
                                ).then(confirmed => {
                                    if (confirmed) {
                                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                                        window.location.reload();
                                    }
                                });
                            }
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Error al registrar el Service Worker:', error);
            });
    });
}
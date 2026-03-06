const SettingsManager = (() => {
    const DEFAULT_SETTINGS = {
        layout: 'double',
        theme: 'light',
        fontFamily: 'Montserrat',
        colors: {
            primary: '#667eea'
        },
        containers: {
            favbookmarks: {
                display: 'list',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748', header: '#667eea' }
            },
            folders: {
                display: 'grid',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748', header: '#667eea' }
            },
            infolder: {
                display: 'list',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748', header: '#667eea' }
            },
            chat: {
                display: 'list',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748', header: '#667eea' }
            },
            'widgets-1': {
                display: 'list',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748', header: '#667eea' },
                enabled: false
            },
            'widgets-2': {
                display: 'list',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748', header: '#667eea' },
                enabled: false
            },
            'widgets-3': {
                display: 'list',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748', header: '#667eea' },
                enabled: false
            },
            'widgets-4': {
                display: 'list',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748', header: '#667eea' },
                enabled: false
            }
        }
    };

    let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

    function deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target)) Object.assign(output, { [key]: source[key] });
                    else output[key] = deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    // Helper: Oscurecer color hex para hover/active
    function darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // Helper: Detectar si un color es claro (para ajustar en tema oscuro)
    function isLightColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
    }

    // Helper: Ajustar color claro para mejor contraste en tema oscuro
    function adjustColorForDark(hex) {
        const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 20);
        const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 20);
        const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 20);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    function adjustColorOpacity(hex, opacity) {
        if (!hex || !hex.startsWith('#')) return hex;
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Helper: Obtener color de texto con buen contraste según el fondo
    function getContrastColor(hex) {
        if (!hex) return '#2d3748'; // Fallback seguro

        // Remover # y normalizar
        hex = hex.replace('#', '').trim();
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        if (hex.length !== 6) return '#2d3748'; // Invalid hex

        // Parsear RGB
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Calcular brillo percibido (fórmula ITU-R BT.601)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        // Umbral ajustado para mejor contraste
        return brightness > 150 ? '#1a202c' : '#ffffff';
    }

    // Helper: Ajustar opacidad de color hex
    function adjustColorOpacity(hex, opacity) {
        if (!hex || !hex.startsWith('#')) return hex;
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    function applySettings() {
        applyLayout();
        applyTheme();
        applyFontFamily();
        applyGlobalColors();
        Object.keys(settings.containers).forEach(container => {
            applyContainerDisplay(container, settings.containers[container].display);
            applyContainerColors(container, settings.containers[container].colors);
        });

        // Forzar re-render inmediato
        if (window.RenderManager) {
            const favDisplay = settings.containers.favbookmarks.display;
            RenderManager.resetPage();
            if (favDisplay === 'grid-8') {
                RenderManager.renderFavoritesGrid(favDisplay);
            } else {
                RenderManager.renderFavorites(favDisplay);
            }
        }
    }

    function applyLayout() {
        const grid = document.querySelector('.dashboard-grid');
        if (grid) {
            grid.classList.remove('layout-double', 'layout-extended', 'layout-widgets', 'layout-free');
            grid.classList.add(`layout-${settings.layout}`);

            // Limpiar estilos inline que puedan haber quedado
            grid.style.display = '';
            grid.style.gridTemplateColumns = '';
            grid.style.gridTemplateRows = '';
        }

        // Limpiar estilos inline de contenedores cuando no estamos en widgets
        if (settings.layout !== 'widgets') {
            document.querySelectorAll('[data-container="folders"], [data-container="infolder"], [data-container="widgets-1"], [data-container="widgets-2"]').forEach(el => {
                el.style.marginTop = '';
                el.style.height = '';
                el.style.marginBottom = '';
            });
        }
    }

    function applyTheme() {
        const currentTheme = settings.theme;

        // Si es 'auto', determinar según hora
        let themeToApply = currentTheme;
        if (currentTheme === 'auto') {
            const hour = new Date().getHours();
            themeToApply = (hour >= 6 && hour < 18) ? 'light' : 'dark';
        }

        // Si es custom, NO aplicar variables de tema predefinido
        if (currentTheme === 'custom') {
            // En custom, usamos 'light' como base pero sin forzar variables
            document.body.setAttribute('data-theme', 'light');
            return;
        }

        // Aplicar atributo data-theme para temas predefinidos
        document.body.setAttribute('data-theme', themeToApply);

        // LIMPIAR estilos inline de contenedores al salir de custom
        document.querySelectorAll('[data-container]').forEach(containerEl => {
            const container = containerEl.dataset.container;

            // Limpiar contenedor principal
            containerEl.style.background = '';
            containerEl.style.borderColor = '';
            containerEl.style.color = '';

            // Limpiar header
            const headerEl = containerEl.querySelector('.container-header');
            if (headerEl) {
                headerEl.style.background = '';
                const titleEl = headerEl.querySelector('h2');
                if (titleEl) {
                    titleEl.style.color = '';
                }
            }

            // Limpiar items internos
            containerEl.querySelectorAll('.bookmark-item, .folder-item, .bookmark-title, .folder-name, .bookmark-url').forEach(el => {
                el.style.background = '';
                el.style.color = '';
                el.style.borderColor = '';
            });

            // Limpiar chat messages
            containerEl.querySelectorAll('.chat-message.bot').forEach(el => {
                el.style.background = '';
                el.style.color = '';
            });
        });

        // Limpiar topbar
        const topbar = document.querySelector('.topbar');
        if (topbar) {
            topbar.style.background = '';
            topbar.style.borderColor = '';
        }

        // Limpiar dashboard
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.style.background = '';
        }

        // Temas predefinidos: aplicar variables CSS
        const themes = {
            dark: {
                '--bg-primary': '#1a202c',
                '--bg-secondary': '#2d3748',
                '--bg-tertiary': '#4a5568',
                '--text-primary': '#f7fafc',
                '--text-secondary': '#e2e8f0',
                '--border-color': '#4a5568'
            },
            light: {
                '--bg-primary': '#f7fafc',
                '--bg-secondary': '#ffffff',
                '--bg-tertiary': '#edf2f7',
                '--text-primary': '#2d3748',
                '--text-secondary': '#718096',
                '--border-color': '#e2e8f0'
            },
            amoled: {
                '--bg-primary': '#000000',
                '--bg-secondary': '#0a0a0a',
                '--bg-tertiary': '#1a1a1a',
                '--text-primary': '#ffffff',
                '--text-secondary': '#b0b0b0',
                '--border-color': '#333333'
            }
        };

        if (themes[themeToApply]) {
            Object.entries(themes[themeToApply]).forEach(([prop, value]) => {
                document.documentElement.style.setProperty(prop, value);
            });
        }

        // Forzar re-render para que tome los colores del tema
        if (window.RenderManager) {
            setTimeout(() => {
                RenderManager.renderAll();
            }, 50);
        }
    }

    function applyFontFamily() {
        const font = settings.fontFamily || 'Montserrat';
        document.documentElement.style.setProperty('--font-family', font);
        document.body.style.fontFamily = `${font}, -apple-system, BlinkMacSystemFont, sans-serif`;
    }

    function applyGlobalColors() {
        // Color primario (botones, acentos)
        if (settings.colors?.primary) {
            const primary = settings.colors.primary;
            document.documentElement.style.setProperty('--primary-color', primary);

            // Calcular variante oscura automáticamente usando darkenColor
            const primaryDark = darkenColor(primary, 10);
            document.documentElement.style.setProperty('--primary-dark', primaryDark);
        }
    }

    function applyContainerDisplay(container, display) {
        const containerEl = document.querySelector(`[data-container="${container}"]`);
        if (!containerEl) return;

        // Actualizar atributo DOM
        containerEl.setAttribute('data-display', display);

        // Disparar evento personalizado
        const event = new CustomEvent('containerDisplayChanged', {
            detail: { container, display }
        });
        window.dispatchEvent(event);

        // Renderizar favoritos si corresponde
        if (container === 'favbookmarks' && window.RenderManager) {
            if (display === 'grid-8') {
                RenderManager.renderFavoritesGrid(display);
            } else {
                if (typeof RenderManager.resetPage === 'function') {
                    RenderManager.resetPage();
                }
                RenderManager.renderFavorites();
            }
        }
    }

    function applyContainerColors(container, colors) {
        const containerEl = document.querySelector(`[data-container="${container}"]`);
        if (!containerEl) return;

        const isCustom = settings.theme === 'custom';

        if (isCustom) {
            // Aplicar colores personalizados CON setProperty para mayor prioridad
            if (colors.background) {
                containerEl.style.setProperty('background', colors.background, 'important');
            }
            if (colors.border) {
                containerEl.style.setProperty('border-color', colors.border, 'important');
            }
            if (colors.text) {
                containerEl.style.setProperty('color', colors.text, 'important');
            }

            // Header personalizado
            if (colors.header) {
                const headerEl = containerEl.querySelector('.container-header');
                if (headerEl) {
                    headerEl.style.setProperty('background',
                        `linear-gradient(135deg, ${colors.header}, var(--bg-secondary))`, 'important');

                    // Calcular contraste
                    const contrastColor = getContrastColor(colors.header);
                    const titleEl = headerEl.querySelector('h2');
                    if (titleEl) {
                        titleEl.style.setProperty('color', contrastColor, 'important');
                    }
                }
            }

            // Items internos
            containerEl.querySelectorAll('.bookmark-item, .folder-item').forEach(item => {
                if (colors.background) {
                    item.style.setProperty('background',
                        adjustColorOpacity(colors.background, 0.9), 'important');
                }
                if (colors.border) {
                    item.style.setProperty('border-color', colors.border, 'important');
                }
            });

            // Textos internos
            containerEl.querySelectorAll('.bookmark-title, .folder-name').forEach(el => {
                if (colors.text) {
                    el.style.setProperty('color', colors.text, 'important');
                }
            });

            containerEl.querySelectorAll('.bookmark-url').forEach(el => {
                if (colors.text) {
                    el.style.setProperty('color',
                        adjustColorOpacity(colors.text, 0.7), 'important');
                }
            });
        } else {
            // En temas predefinidos: limpiar TODOS los estilos inline
            containerEl.style.cssText = '';
            containerEl.removeAttribute('style');

            const headerEl = containerEl.querySelector('.container-header');
            if (headerEl) {
                headerEl.style.cssText = '';
                headerEl.removeAttribute('style');
            }

            containerEl.querySelectorAll('.bookmark-item, .folder-item, .bookmark-title, .folder-name, .bookmark-url').forEach(el => {
                el.style.cssText = '';
                el.removeAttribute('style');
            });
        }
    }

    function applyCustomThemeColors() {
        const isCustom = settings.theme === 'custom';
        if (!isCustom) return;

        // Colores base del primer contenedor como referencia (favbookmarks)
        const baseColors = settings.containers.favbookmarks?.colors || {
            background: '#ffffff',
            border: '#e2e8f0',
            text: '#2d3748',
            header: '#667eea'
        };

        // 1. Fondo general del dashboard (derivado del background base)
        document.querySelector('.dashboard')?.style.setProperty('background',
            adjustColorOpacity(baseColors.background, 0.95));

        // 2. Títulos de contenedores - aplicar contraste automático
        document.querySelectorAll('.container-header h2').forEach(title => {
            const container = title.closest('[data-container]');
            if (container) {
                const containerColors = settings.containers[container.dataset.container]?.colors || baseColors;
                if (containerColors.header) {
                    title.style.color = getContrastColor(containerColors.header);
                }
            }
        });

        // 3. Items de bookmarks (favbookmarks e infolder)
        document.querySelectorAll('.bookmark-item').forEach(item => {
            const container = item.closest('[data-container]');
            if (container) {
                const colors = settings.containers[container.dataset.container]?.colors || baseColors;
                item.style.background = adjustColorOpacity(colors.background, 0.9);
                item.style.borderColor = colors.border;
                item.style.color = colors.text;

                // Título y URL del bookmark
                const title = item.querySelector('.bookmark-title');
                const url = item.querySelector('.bookmark-url');
                if (title) title.style.color = colors.text;
                if (url) url.style.color = adjustColorOpacity(colors.text, 0.7);
            }
        });

        // 4. Items de folders
        document.querySelectorAll('.folder-item').forEach(folder => {
            const colors = settings.containers.folders?.colors || baseColors;
            folder.style.background = adjustColorOpacity(colors.background, 0.9);
            folder.style.borderColor = colors.border;

            const name = folder.querySelector('.folder-name');
            if (name) name.style.color = colors.text;
        });

        // 5. Burbujas de chat
        const chatBot = document.querySelector('.chat-message.bot');
        const chatUser = document.querySelector('.chat-message.user');
        if (chatBot) {
            // Derivar color ligeramente más oscuro que el background base para contraste
            chatBot.style.background = adjustColorOpacity(baseColors.background, 0.85);
            chatBot.style.color = baseColors.text;
        }
        if (chatUser) {
            // El usuario siempre con color primario para destacar
            chatUser.style.background = settings.colors?.primary || '#667eea';
            chatUser.style.color = '#ffffff';
        }

        // 6. Inputs y elementos de formulario en custom
        document.querySelectorAll('.container-body input, .container-body select, .container-body textarea').forEach(input => {
            input.style.background = adjustColorOpacity(baseColors.background, 0.95);
            input.style.color = baseColors.text;
            input.style.borderColor = baseColors.border;
        });
    }

    function updateLayout(layout) {
        settings.layout = layout;
        saveSettings();
        applyLayout();

        // Solo forzar renderizado, NO estilos manuales
        if (window.RenderManager) {
            setTimeout(() => {
                RenderManager.renderAll();
            }, 50);
        }
    }

    function updateTheme(theme) {
        const oldTheme = settings.theme;
        settings.theme = theme;
        saveSettings();

        // Si salimos de custom, forzar limpieza inmediata
        if (oldTheme === 'custom' && theme !== 'custom') {
            document.querySelectorAll('[data-container]').forEach(el => {
                el.style.cssText = '';
                el.querySelectorAll('*').forEach(child => {
                    child.style.cssText = '';
                });
            });

            // Limpiar topbar y dashboard
            const topbar = document.querySelector('.topbar');
            if (topbar) topbar.style.cssText = '';

            const dashboard = document.querySelector('.dashboard');
            if (dashboard) dashboard.style.cssText = '';
        }

        applyTheme();

        // Si entramos en custom, forzar re-aplicación de colores personalizados
        if (theme === 'custom') {
            setTimeout(() => {
                Object.keys(settings.containers).forEach(container => {
                    applyContainerColors(container, settings.containers[container].colors);
                });
            }, 50);
        }

        if (theme === 'auto') {
            startAutoThemeWatcher();
        }
    }

    function updateFontFamily(font) {
        settings.fontFamily = font;
        saveSettings();
        applyFontFamily();
    }

    function updateContainerColors(container, colors) {
        if (container === 'global') {
            // Color primario: SIEMPRE editable
            if (colors.primary) {
                settings.colors = settings.colors || {};
                settings.colors.primary = colors.primary;
                applyGlobalColors();
            }
        } else if (settings.containers[container]) {
            // Colores de contenedor: SOLO si es tema custom
            if (settings.theme === 'custom') {
                settings.containers[container].colors = {
                    ...settings.containers[container].colors,
                    ...colors  // ← Esto incluye background, border, text, header
                };
                applyContainerColors(container, settings.containers[container].colors);
            }
        }
        saveSettings();
    }

    function updateContainerDisplay(container, display) {
        if (settings.containers[container]) {
            settings.containers[container].display = display;
            applyContainerDisplay(container, display);

            // Disparar evento personalizado
            const event = new CustomEvent('containerDisplayChanged', {
                detail: { container, display }
            });
            window.dispatchEvent(event);
        }
    }

    function startAutoThemeWatcher() {
        if (settings.theme !== 'auto') return;

        // Limpiar intervalo existente si hay
        if (window.__autoThemeInterval) {
            clearInterval(window.__autoThemeInterval);
        }

        window.__autoThemeInterval = setInterval(() => {
            applyTheme();
        }, 60000); // Verificar cada minuto
    }

    function saveSettings() {
        localStorage.setItem('vmarks_settings', JSON.stringify(settings));
    }

    function loadSettings() {
        const saved = localStorage.getItem('vmarks_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                settings = deepMerge(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), parsed);

                // Validar temas permitidos
                const validThemes = ['light', 'dark', 'auto', 'amoled'];
                if (!validThemes.includes(settings.theme)) {
                    settings.theme = DEFAULT_SETTINGS.theme;
                }

                // Validar displays permitidos
                const validDisplays = ['list', 'grid-8', 'grid'];
                Object.keys(settings.containers).forEach(key => {
                    if (!validDisplays.includes(settings.containers[key].display)) {
                        settings.containers[key].display = DEFAULT_SETTINGS.containers[key].display;
                    }
                });

                // Validar fuentes permitidas
                const validFonts = ['Montserrat', 'Inter', 'Roboto', 'Open Sans', 'Lato'];
                if (!validFonts.includes(settings.fontFamily)) {
                    settings.fontFamily = DEFAULT_SETTINGS.fontFamily;
                }
            } catch (e) {
                console.error('Error cargando settings:', e);
                settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
            }
        }
        applySettings();
        startAutoThemeWatcher();
    }

    function getSettings() {
        return settings;
    }

    function getDefaults() {
        return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    function resetToDefaults() {
        settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        saveSettings();
        applySettings();
        if (window.RenderManager) {
            window.RenderManager.renderAll();
        }
        return true;
    }

    return {
        loadSettings,
        saveSettings,
        getSettings,
        getDefaults,
        resetToDefaults,
        updateLayout,
        updateTheme,
        updateFontFamily,
        updateContainerDisplay,
        updateContainerColors,
        applySettings,
        applyGlobalColors
    };
})();
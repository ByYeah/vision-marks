const SettingsManager = (() => {
    const DEFAULT_SETTINGS = {
        layout: 'double',
        theme: 'light',
        colors: {
            primary: '#667eea'  // ← Color primario global
        },
        containers: {
            favbookmarks: {
                display: 'list',  // ← Default explícito
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748' }
            },
            folders: {
                display: 'grid',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748' }
            },
            infolder: {
                display: 'list',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748' }
            },
            chat: {
                display: 'list',
                colors: { background: '#ffffff', border: '#e2e8f0', text: '#2d3748' }
            }
        }
    };

    let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

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
            } catch (e) {
                settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
            }
        }
        applySettings();
        startAutoThemeWatcher();
    }

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

    function saveSettings() {
        localStorage.setItem('vmarks_settings', JSON.stringify(settings));
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

    function updateLayout(layout) {
        settings.layout = layout;
        saveSettings();
        applyLayout();
    }

    function updateTheme(theme) {
        settings.theme = theme;
        saveSettings();
        applyTheme();
        if (theme === 'auto') {
            startAutoThemeWatcher();
        }
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

    function updateContainerColors(container, colors) {
        if (container === 'global') {
            // Actualizar color primario global
            if (colors.primary) {
                settings.colors = settings.colors || {};
                settings.colors.primary = colors.primary;
                applyPrimaryColor();
            }
        } else if (settings.containers[container]) {
            settings.containers[container].colors = {
                ...settings.containers[container].colors,
                ...colors
            };
            applyContainerColors(container, settings.containers[container].colors);
        }
        saveSettings();
    }

    function applySettings() {
        applyLayout();
        applyTheme();
        applyPrimaryColor();
        Object.keys(settings.containers).forEach(container => {
            applyContainerDisplay(container, settings.containers[container].display);
            applyContainerColors(container, settings.containers[container].colors);
        });

        // Forzar re-render inmediato SIN setTimeout
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
        }
    }

    function applyTheme() {
        let theme = settings.theme;

        //Si es 'auto', determinar tema según hora
        if (theme === 'auto') {
            const hour = new Date().getHours();
            // 6 AM a 6 PM = claro, 6 PM a 6 AM = oscuro
            theme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
        }

        document.body.setAttribute('data-theme', settings.theme);

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
                '--text-muted': '#666666',
                '--border-color': '#333333'
            }
        };

        if (themes[settings.theme]) {
            Object.entries(themes[settings.theme]).forEach(([prop, value]) => {
                document.documentElement.style.setProperty(prop, value);
            });
        }
    }

    function startAutoThemeWatcher() {
        if (settings.theme !== 'auto') return;

        setInterval(() => {
            applyTheme();
        }, 60000); // Verificar cada minuto
    }

    function applyPrimaryColor() {
        const primary = settings.colors?.primary || '#667eea';
        document.documentElement.style.setProperty('--primary-color', primary);

        // Calcular variaciones para hover/active
        const darkened = darkenColor(primary, 10); // 10% más oscuro
        document.documentElement.style.setProperty('--primary-dark', darkened);
    }

    function darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    function applyContainerDisplay(container, display) {
        const containerEl = document.querySelector(`[data-container="${container}"]`);

        if (containerEl) {
            // Actualizar atributo DOM
            containerEl.setAttribute('data-display', display);

            // Disparar evento personalizado (esto reemplaza la lógica directa)
            const event = new CustomEvent('containerDisplayChanged', {
                detail: { container, display }
            });
            window.dispatchEvent(event);

            // Para otros contenedores que no sean favbookmarks, puedes mantener lógica específica
            if (container !== 'favbookmarks' && window.RenderManager) {
                // Aquí iría la lógica para otros contenedores si es necesaria
            }
        }
    }

    function applyContainerColors(container, colors) {
        const containerEl = document.querySelector(`[data-container="${container}"]`);
        if (containerEl) {
            if (colors.background) {
                containerEl.style.background = colors.background;
            }
            if (colors.border) {
                containerEl.style.borderColor = colors.border;
            }
            if (colors.text) {
                containerEl.style.color = colors.text;
                // También aplicar a hijos
                containerEl.querySelectorAll('h2, .bookmark-title, .folder-name').forEach(el => {
                    el.style.color = colors.text;
                });
            }
        }
    }

    return {
        loadSettings,
        saveSettings,
        getSettings,
        getDefaults,
        resetToDefaults,
        updateLayout,
        updateTheme,
        updateContainerDisplay,
        updateContainerColors,
        applySettings
    };
})();
const IconManager = (function () {
    const MAX_CUSTOM_ICONS = 30;
    let customIconsCache = [];

    const DEFAULT_ICONS = [
        { id: 'default-folder', type: 'emoji', value: '📁', name: 'Carpeta' },
        { id: 'default-folder-open', type: 'emoji', value: '📂', name: 'Carpeta abierta' },
        { id: 'default-star', type: 'emoji', value: '⭐', name: 'Estrella' },
        { id: 'default-heart', type: 'emoji', value: '❤️', name: 'Corazón' },
        { id: 'default-code', type: 'emoji', value: '💻', name: 'Código' },
        { id: 'default-design', type: 'emoji', value: '🎨', name: 'Diseño' },
        { id: 'default-work', type: 'emoji', value: '💼', name: 'Trabajo' },
        { id: 'default-study', type: 'emoji', value: '📚', name: 'Estudio' },
        { id: 'default-music', type: 'emoji', value: '🎵', name: 'Música' },
        { id: 'default-video', type: 'emoji', value: '🎬', name: 'Vídeo' },
        { id: 'default-game', type: 'emoji', value: '🎮', name: 'Juegos' },
        { id: 'default-shopping', type: 'emoji', value: '🛒', name: 'Compras' },
        { id: 'default-social', type: 'emoji', value: '💬', name: 'Social' },
        { id: 'default-news', type: 'emoji', value: '📰', name: 'Noticias' },
        { id: 'default-cloud', type: 'emoji', value: '☁️', name: 'Nube' },
        { id: 'default-settings', type: 'emoji', value: '⚙️', name: 'Configuración' }
    ];

    async function init() {
        await loadCustomIcons();
    }

    async function loadCustomIcons() {
        if (!window.DatabaseManager) return;
        try {
            customIconsCache = await DatabaseManager.customIcons.getAll();
            console.log(`📦 Cargados ${customIconsCache.length} iconos personalizados`);
        } catch (error) {
            console.error('Error loading custom icons:', error);
            customIconsCache = [];
        }
    }

    function getCustomIcons() {
        return customIconsCache.map(icon => ({
            id: `custom-${icon.id}`,
            type: 'svg',
            value: icon.svgContent,
            name: icon.name,
            isCustom: true,
            originalId: icon.id
        }));
    }

    // Sanitizar SVG
    function sanitizeSVG(svgContent) {
        if (!svgContent) return '';

        try {
            const parser = new DOMParser();
            const cleanRaw = svgContent.trim().replace(/>\s+</g, '><');
            const doc = parser.parseFromString(cleanRaw, 'image/svg+xml');
            const svgElement = doc.querySelector('svg');

            if (!svgElement) return '';

            const viewBox = svgElement.getAttribute('viewBox') || `0 0 ${svgElement.getAttribute('width') || 24} ${svgElement.getAttribute('height') || 24}`;

            const elements = svgElement.querySelectorAll('*');
            elements.forEach(el => {
                const fill = el.getAttribute('fill');
                const stroke = el.getAttribute('stroke');
                const hasStrokeOnly = stroke && stroke !== 'none' && (!fill || fill === 'none');

                if (hasStrokeOnly) {
                    el.setAttribute('fill', 'none');
                    el.setAttribute('stroke', 'currentColor');
                } else if (fill && fill !== 'none') {
                    el.setAttribute('fill', 'currentColor');
                    if (stroke && stroke !== 'none') {
                        el.setAttribute('stroke', 'currentColor');
                    }
                } else if (!fill && !stroke) {
                    el.setAttribute('fill', 'currentColor');
                }

                el.removeAttribute('style');
            });

            // Retornar SVG limpio sin texto adicional
            return `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" class="custom-svg-icon">${svgElement.innerHTML}</svg>`;
        } catch (e) {
            console.error('Error sanitizing SVG:', e);
            return '';
        }
    }

    async function uploadIcon(file, name) {
        if (!file) throw new Error('No se seleccionó ningún archivo');
        if (!file.name.toLowerCase().endsWith('.svg')) {
            throw new Error('Solo se permiten archivos SVG');
        }
        if (customIconsCache.length >= MAX_CUSTOM_ICONS) {
            throw new Error(`Máximo de ${MAX_CUSTOM_ICONS} iconos personalizados alcanzado`);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    let svgContent = e.target.result;

                    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
                        throw new Error('El archivo no es un SVG válido');
                    }

                    const iconName = name || file.name.replace('.svg', '');
                    const svgClean = sanitizeSVG(svgContent);

                    if (!svgClean) {
                        throw new Error('No se pudo procesar el SVG');
                    }

                    const newIcon = {
                        name: iconName,
                        svgContent: svgClean,
                        createdAt: new Date().toISOString(),
                        usedBy: []
                    };

                    const id = await DatabaseManager.customIcons.add(newIcon);
                    newIcon.id = id;
                    customIconsCache.push(newIcon);

                    console.log(`✅ Icono "${iconName}" subido`);
                    resolve({ success: true, icon: { id: `custom-${id}`, name: iconName } });
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file);
        });
    }

    async function deleteIcon(iconId) {
        const numericId = parseInt(iconId.replace('custom-', ''));
        if (isNaN(numericId)) throw new Error('ID de icono inválido');

        await DatabaseManager.customIcons.delete(numericId);
        customIconsCache = customIconsCache.filter(i => i.id !== numericId);

        console.log(`🗑️ Icono eliminado`);
        return { success: true };
    }

    function getIconHTML(iconId) {
        if (iconId && iconId.startsWith('custom-')) {
            const numericId = parseInt(iconId.replace('custom-', ''));
            const customIcon = customIconsCache.find(i => i.id === numericId);

            if (customIcon && customIcon.svgContent) {
                // Asegurar que el SVG tenga tamaño para mostrarse en el header
                let svg = customIcon.svgContent;
                // Añadir clase para estilos y asegurar tamaño si no tiene width/height
                if (!svg.includes('width=')) {
                    svg = svg.replace('<svg', '<svg width="20" height="20"');
                }
                return svg;
            }
            return `<span class="folder-icon-emoji">📁</span>`;
        } else if (iconId && DEFAULT_ICONS.some(i => i.id === iconId)) {
            const icon = DEFAULT_ICONS.find(i => i.id === iconId);
            return `<span class="folder-icon-emoji">${icon?.value || '📁'}</span>`;
        }
        return `<span class="folder-icon-emoji">📁</span>`;
    }

    function getIconPreview(icon) {
        if (icon.type === 'emoji') {
            return `<span class="icon-preview-emoji">${icon.value}</span>`;
        } else if (icon.type === 'svg' && icon.value) {
            // Devolver el SVG directamente, sin añadir nada extra
            return icon.value;
        }
        return '<span class="icon-preview-emoji">📁</span>';
    }

    return {
        init,
        getCustomIcons,
        uploadIcon,
        deleteIcon,
        getIconHTML,
        getIconPreview,
        MAX_CUSTOM_ICONS,
        sanitizeSVG
    };
})();

window.IconManager = IconManager;
const IconManager = (function () {
    const MAX_CUSTOM_ICONS = 30;
    let customIconsCache = [];

    const DEFAULT_EMOJI_ICONS = [
        { id: 'default-folder', value: '📁', name: 'Carpeta' },
        { id: 'default-folder-clip', value: '🗂️', name: 'Separador' },
        { id: 'default-package', value: '📦', name: 'Paquete' },
        { id: 'default-card-index', value: '🗃️', name: 'Archivador' },
        { id: 'default-briefcase', value: '💼', name: 'Trabajo' },
        { id: 'default-target', value: '🎯', name: 'Objetivo' },
        { id: 'default-star', value: '⭐', name: 'Estrella' },
        { id: 'default-bookmark', value: '🔖', name: 'Marcador' },
        { id: 'default-pushpin', value: '📌', name: 'Chincheta' },
        { id: 'default-heart', value: '❤️', name: 'Corazón' },
        { id: 'default-code', value: '💻', name: 'Código' },
        { id: 'default-design', value: '🎨', name: 'Diseño' },
        { id: 'default-study', value: '📚', name: 'Estudio' },
        { id: 'default-music', value: '🎵', name: 'Música' },
        { id: 'default-video', value: '🎬', name: 'Vídeo' },
        { id: 'default-game', value: '🎮', name: 'Juegos' },
        { id: 'default-shopping', value: '🛒', name: 'Compras' },
        { id: 'default-social', value: '💬', name: 'Social' },
        { id: 'default-news', value: '📰', name: 'Noticias' },
        { id: 'default-cloud', value: '☁️', name: 'Nube' },
        { id: 'default-settings', value: '⚙️', name: 'Configuración' },
        { id: 'default-camera', value: '📷', name: 'Fotos' },
        { id: 'default-chart', value: '📊', name: 'Gráficos' },
        { id: 'default-document', value: '📄', name: 'Documentos' },
        { id: 'default-mail', value: '📧', name: 'Email' },
        { id: 'default-lock', value: '🔒', name: 'Seguro' },
        { id: 'default-key', value: '🔑', name: 'Clave' },
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

    function getAllEmojiIcons() {
        return DEFAULT_EMOJI_ICONS;
    }

    function getAllIconsForPicker(selectedEmojiId = null, selectedCustomId = null) {
        const emojiIcons = DEFAULT_EMOJI_ICONS.map(icon => ({
            type: 'emoji',
            id: icon.id,
            value: icon.value,
            name: icon.name,
            selected: selectedEmojiId === icon.id
        }));

        const customIcons = customIconsCache.map(icon => ({
            type: 'custom',
            id: `custom-${icon.id}`,
            value: icon.svgContent,
            name: icon.name,
            selected: selectedCustomId === `custom-${icon.id}`,
            originalId: icon.id
        }));

        return [...emojiIcons, ...customIcons];
    }

    function getIconPickerHTML(selectedEmojiId = null, selectedCustomId = null) {
        const allIcons = getAllIconsForPicker(selectedEmojiId, selectedCustomId);
        const emojis = allIcons.filter(i => i.type === 'emoji');
        const customIcons = allIcons.filter(i => i.type === 'custom');

        let html = `
            <div class="icon-picker-section">
                <h4>Emojis</h4>
                <div class="icon-picker emoji-picker">
        `;
        emojis.forEach(icon => {
            html += `
                <button type="button" class="icon-option ${icon.selected ? 'selected' : ''}" 
                        data-icon-type="emoji" 
                        data-icon-id="${icon.id}" 
                        data-icon-value="${icon.value}"
                        title="${icon.name}">
                    <span class="icon-preview-emoji">${icon.value}</span>
                </button>
            `;
        });

        html += `</div>`;

        if (customIcons.length > 0) {
            html += `
                <h4 style="margin-top:1rem;">Personalizados</h4>
                <div class="icon-picker custom-icons-picker">
            `;
            customIcons.forEach(icon => {
                html += `
                    <button type="button" class="icon-option custom-icon-option ${icon.selected ? 'selected' : ''}" 
                            data-icon-type="custom" 
                            data-icon-id="${icon.id}"
                            title="${icon.name}">
                        ${icon.value}
                    </button>
                `;
            });
            html += `</div>`;
        }
        html += `</div>`;
        return html;
    }

    function getIconHTML(iconId, iconType = 'emoji', iconValue = null) {
        // Icono personalizado
        if (iconType === 'custom' && iconId) {
            // Asegurar formato del ID
            let customId = iconId;
            if (!customId.startsWith('custom-') && !isNaN(parseInt(customId))) {
                customId = `custom-${customId}`;
            }

            const numericId = parseInt(customId.replace('custom-', ''));
            const customIcon = customIconsCache.find(i => i.id === numericId);

            if (customIcon && customIcon.svgContent) {
                let svg = customIcon.svgContent;
                if (!svg.includes('width=')) {
                    svg = svg.replace('<svg', '<svg width="20" height="20"');
                }
                if (!svg.includes('class=')) {
                    svg = svg.replace('<svg', '<svg class="folder-custom-icon"');
                }
                return svg;
            }
            console.warn(`Icono personalizado no encontrado: ${iconId}, usando fallback`);
            return `<span class="folder-icon-emoji">📁</span>`;
        }

        // Emoji por ID
        if (iconId && iconType !== 'custom') {
            const emojiIcon = DEFAULT_EMOJI_ICONS.find(i => i.id === iconId);
            if (emojiIcon) {
                return `<span class="folder-icon-emoji">${emojiIcon.value}</span>`;
            }
        }

        // Emoji por valor directo
        if (iconValue && iconType !== 'custom') {
            return `<span class="folder-icon-emoji">${iconValue}</span>`;
        }

        // Fallback para carpetas antiguas
        if (iconValue) {
            return `<span class="folder-icon-emoji">${iconValue}</span>`;
        }
        console.warn(`Usando fallback para:`, { iconId, iconType, iconValue });
        return `<span class="folder-icon-emoji">📁</span>`;
    }

    function getIconPreview(icon) {
        if (icon.type === 'emoji') {
            return `<span class="icon-preview-emoji">${icon.value}</span>`;
        } else if (icon.type === 'svg' && icon.value) {
            return icon.value;
        }
        return '<span class="icon-preview-emoji">📁</span>';
    }

    function getIconById(iconId, iconType = 'emoji') {
        if (iconType === 'custom') {
            const numericId = parseInt(iconId?.replace('custom-', ''));
            return customIconsCache.find(i => i.id === numericId);
        } else {
            return DEFAULT_EMOJI_ICONS.find(i => i.id === iconId);
        }
    }

    function getIconValue(iconId, iconType = 'emoji', fallback = '📁') {
        if (iconType === 'custom') return fallback;
        const icon = DEFAULT_EMOJI_ICONS.find(i => i.id === iconId);
        return icon?.value || fallback;
    }

    function getIconName(iconId, iconType = 'emoji') {
        if (iconType === 'custom') {
            const numericId = parseInt(iconId?.replace('custom-', ''));
            const icon = customIconsCache.find(i => i.id === numericId);
            return icon?.name || 'Icono personalizado';
        } else {
            const icon = DEFAULT_EMOJI_ICONS.find(i => i.id === iconId);
            return icon?.name || 'Emoji';
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

                    console.log(`Icono "${iconName}" subido`);
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
            return `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" class="custom-svg-icon">${svgElement.innerHTML}</svg>`;
        } catch (e) {
            console.error('Error sanitizing SVG:', e);
            return '';
        }
    }

    return {
        init,
        getCustomIcons,
        uploadIcon,
        deleteIcon,
        getIconHTML,
        getIconPreview,
        getAllEmojiIcons,
        getAllIconsForPicker,
        getIconPickerHTML,
        getIconById,
        getIconValue,
        getIconName,
        MAX_CUSTOM_ICONS,
        sanitizeSVG
    };
})();
window.IconManager = IconManager;
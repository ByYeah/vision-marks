const IconManager = (function() {
    // Configuración
    const MAX_CUSTOM_ICONS = 30;
    let spriteElement = null;
    let customIconsCache = [];
    
    // Iconos por defecto (emojis y algunos SVG básicos)
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
    
    // Inicializar el gestor
    async function init() {
        await loadCustomIcons();
        generateSprite();
        console.log('IconManager initialized');
    }
    
    // Cargar iconos personalizados desde IndexedDB
    async function loadCustomIcons() {
        if (!window.DatabaseManager) return;
        try {
            customIconsCache = await DatabaseManager.customIcons.getAll();
            console.log(`Cargados ${customIconsCache.length} iconos personalizados`);
        } catch (error) {
            console.error('Error loading custom icons:', error);
            customIconsCache = [];
        }
    }
    
    // Obtener todos los iconos (default + personalizados)
    function getAllIcons() {
        const defaultIcons = DEFAULT_ICONS.map(icon => ({
            ...icon,
            isCustom: false
        }));
        
        const customIcons = customIconsCache.map(icon => ({
            id: `custom-${icon.id}`,
            type: 'svg',
            value: icon.svgContent,
            name: icon.name,
            isCustom: true,
            originalId: icon.id
        }));
        
        return [...defaultIcons, ...customIcons];
    }
    
    // Obtener iconos por defecto
    function getDefaultIcons() {
        return DEFAULT_ICONS.map(icon => ({
            ...icon,
            isCustom: false
        }));
    }
    
    // Obtener iconos personalizados
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
    
    // Renderizar un icono (devuelve HTML)
    function renderIcon(icon) {
        if (icon.type === 'emoji') {
            return `<span class="icon-emoji">${icon.value}</span>`;
        } else if (icon.type === 'svg') {
            // Sanitizar SVG para que herede color
            let svgContent = icon.value;
            svgContent = sanitizeSVG(svgContent);
            return svgContent;
        }
        return '<span class="icon-emoji">📁</span>';
    }
    
    // Sanitizar SVG para usar currentColor
    function sanitizeSVG(svgContent) {
        if (!svgContent) return '';
        
        // Eliminar atributos fill y stroke fijos, reemplazar con currentColor
        let sanitized = svgContent
            .replace(/fill="[^"]*"/g, 'fill="currentColor"')
            .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
            .replace(/fill='[^']*'/g, 'fill="currentColor"')
            .replace(/stroke='[^']*'/g, 'stroke="currentColor"');
        
        // Asegurar que el viewBox existe
        if (!sanitized.includes('viewBox')) {
            sanitized = sanitized.replace('<svg', '<svg viewBox="0 0 24 24"');
        }
        
        return sanitized;
    }
    
    // Generar sprite SVG (para los SVG personalizados)
    function generateSprite() {
        // Eliminar sprite existente
        const existingSprite = document.getElementById('custom-icons-sprite');
        if (existingSprite) {
            existingSprite.remove();
        }
        
        if (customIconsCache.length === 0) return;
        
        const symbols = customIconsCache.map(icon => {
            let svgContent = sanitizeSVG(icon.svgContent);
            // Extraer el contenido interno del SVG (sin el tag <svg>)
            const innerContent = svgContent.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
            return `<symbol id="custom-icon-${icon.id}" viewBox="0 0 24 24">${innerContent}</symbol>`;
        }).join('');
        
        const spriteHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none;" id="custom-icons-sprite">${symbols}</svg>`;
        
        document.body.insertAdjacentHTML('afterbegin', spriteHTML);
        spriteElement = document.getElementById('custom-icons-sprite');
    }
    
    // Subir un nuevo icono personalizado
    async function uploadIcon(file, name) {
        // Validaciones
        if (!file) {
            throw new Error('No se seleccionó ningún archivo');
        }
        
        if (!file.name.toLowerCase().endsWith('.svg')) {
            throw new Error('Solo se permiten archivos SVG');
        }
        
        if (customIconsCache.length >= MAX_CUSTOM_ICONS) {
            throw new Error(`Máximo de ${MAX_CUSTOM_ICONS} iconos personalizados alcanzado`);
        }
        
        // Leer el archivo
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    let svgContent = e.target.result;
                    
                    // Validar que es SVG válido
                    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
                        throw new Error('El archivo no es un SVG válido');
                    }
                    
                    // Sanitizar
                    svgContent = sanitizeSVG(svgContent);
                    
                    // Nombre del icono (usar nombre del archivo o el proporcionado)
                    const iconName = name || file.name.replace('.svg', '');
                    
                    // Guardar en IndexedDB
                    const newIcon = {
                        name: iconName,
                        svgContent: svgContent,
                        createdAt: new Date().toISOString(),
                        usedBy: []  // IDs de carpetas que usan este icono
                    };
                    
                    const id = await DatabaseManager.customIcons.add(newIcon);
                    newIcon.id = id;
                    
                    // Actualizar caché
                    customIconsCache.push(newIcon);
                    
                    // Regenerar sprite
                    generateSprite();
                    
                    console.log(`Icono "${iconName}" subido correctamente`);
                    resolve({ success: true, icon: { id: `custom-${id}`, name: iconName } });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsText(file);
        });
    }
    
    // Eliminar un icono personalizado
    async function deleteIcon(iconId) {
        // iconId viene como "custom-123", extraer el ID numérico
        const numericId = parseInt(iconId.replace('custom-', ''));
        if (isNaN(numericId)) {
            throw new Error('ID de icono inválido');
        }
        
        // Verificar si el icono está siendo usado
        const icon = customIconsCache.find(i => i.id === numericId);
        if (icon && icon.usedBy && icon.usedBy.length > 0) {
            throw new Error(`El icono está siendo usado por ${icon.usedBy.length} carpetas. Elimínalo de las carpetas primero.`);
        }
        
        // Eliminar de IndexedDB
        await DatabaseManager.customIcons.delete(numericId);
        
        // Actualizar caché
        customIconsCache = customIconsCache.filter(i => i.id !== numericId);
        
        // Regenerar sprite
        generateSprite();
        
        console.log(`🗑️ Icono "${icon?.name}" eliminado`);
        return { success: true };
    }
    
    // Obtener el HTML para mostrar un icono
    function getIconHTML(iconId) {
        if (iconId && iconId.startsWith('custom-')) {
            // Icono personalizado (usar sprite)
            return `<svg class="custom-icon" width="20" height="20"><use href="#${iconId}"></use></svg>`;
        } else if (iconId && DEFAULT_ICONS.some(i => i.id === iconId)) {
            // Icono por defecto (emoji)
            const icon = DEFAULT_ICONS.find(i => i.id === iconId);
            return `<span class="icon-emoji">${icon?.value || '📁'}</span>`;
        } else {
            // Fallback
            return `<span class="icon-emoji">📁</span>`;
        }
    }
    
    // Obtener el valor visual de un icono (para mostrar en el selector)
    function getIconPreview(icon) {
        if (icon.type === 'emoji') {
            return `<span style="font-size:1.2rem;">${icon.value}</span>`;
        } else if (icon.type === 'svg') {
            let svg = sanitizeSVG(icon.value);
            // Ajustar tamaño
            svg = svg.replace('<svg', '<svg width="24" height="24"');
            return svg;
        }
        return '📁';
    }
    
    // API pública
    return {
        init,
        getAllIcons,
        getDefaultIcons,
        getCustomIcons,
        renderIcon,
        uploadIcon,
        deleteIcon,
        getIconHTML,
        getIconPreview,
        MAX_CUSTOM_ICONS,
        sanitizeSVG
    };
})();

// Exportar global
window.IconManager = IconManager;
const SvgLoader = (() => {
    const cache = {};

    // Función original (la mantenemos igual para compatibilidad)
    async function loadIcon(name) {
        // Si ya está en cache, retornar directamente
        if (cache[name]) {
            return cache[name];
        }

        try {
            const response = await fetch(`/assets/icons/${name}.svg`);
            if (!response.ok) throw new Error(`SVG no encontrado: ${name}`);
            
            const svgContent = await response.text();
            cache[name] = svgContent;
            
            return svgContent;
        } catch (error) {
            console.error(`[SvgLoader] Error: ${error.message}`);
            return '<span>⚠️</span>';
        }
    }

    // NUEVA FUNCIÓN: Cargar icono con atributos personalizados
    async function loadIconWithAttributes(name, attributes = {}) {
        const svgContent = await loadIcon(name); // Reutilizamos la función existente
        
        if (!svgContent || svgContent.includes('<span>⚠️</span>')) {
            return svgContent;
        }

        // Si no hay atributos personalizados, retornar el SVG original
        if (Object.keys(attributes).length === 0) {
            return svgContent;
        }

        // Aplicar atributos al SVG
        return svgContent.replace('<svg', () => {
            let attrString = '<svg';
            for (const [key, value] of Object.entries(attributes)) {
                attrString += ` ${key}="${value}"`;
            }
            return attrString;
        });
    }

    // Función original (la mantenemos igual)
    async function load(name, container, className = '') {
        const svgContent = await loadIcon(name);
        container.innerHTML = svgContent;
        if (className) container.querySelector('svg')?.classList.add(className);
    }

    // NUEVA FUNCIÓN: Cargar con atributos personalizados
    async function loadWithAttributes(name, container, attributes = {}, className = '') {
        const svgContent = await loadIconWithAttributes(name, attributes);
        container.innerHTML = svgContent;
        if (className) container.querySelector('svg')?.classList.add(className);
    }

    // Función original (la mantenemos igual)
    function loadAll() {
        document.querySelectorAll('[data-svg]').forEach(el => {
            const name = el.dataset.svg;
            const className = el.dataset.svgClass || '';
            load(name, el, className);
        });
    }

    // NUEVA FUNCIÓN: Cargar todos con soporte para data-attributes
    function loadAllWithAttributes() {
        document.querySelectorAll('[data-svg]').forEach(el => {
            const name = el.dataset.svg;
            const className = el.dataset.svgClass || '';
            
            // Recoger todos los data-atributos que empiecen con 'svg-'
            const attributes = {};
            for (const [key, value] of Object.entries(el.dataset)) {
                if (key.startsWith('svg') && key !== 'svg' && key !== 'svgClass') {
                    const attrName = key.replace('svg', '').toLowerCase();
                    attributes[attrName] = value;
                }
            }
            
            loadWithAttributes(name, el, attributes, className);
        });
    }

    return { 
        load,           // Original
        loadIcon,       // Original
        loadAll,        // Original
        loadWithAttributes,  // Nueva
        loadIconWithAttributes, // Nueva
        loadAllWithAttributes  // Nueva
    };
})();

window.SvgLoader = SvgLoader;
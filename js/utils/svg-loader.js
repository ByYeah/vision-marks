const SvgLoader = (() => {
    const cache = {};

    async function loadIcon(name) {
        // Si es un icono personalizado (empieza con custom-)
        if (name.startsWith('custom-') && window.IconManager) {
            const icon = window.IconManager.getAllIcons().find(i => i.id === name);
            if (icon && icon.type === 'svg') {
                return window.IconManager.sanitizeSVG(icon.value);
            }
        }
        
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
            console.warn(`SVG no encontrado: ${name}`);
            return '<span>⚠️</span>';
        }
    }

    // Resto de funciones igual...
    async function loadIconWithAttributes(name, attributes = {}) {
        const svgContent = await loadIcon(name);
        
        if (!svgContent || svgContent.includes('<span>⚠️</span>')) {
            return svgContent;
        }

        if (Object.keys(attributes).length === 0) {
            return svgContent;
        }

        return svgContent.replace('<svg', () => {
            let attrString = '<svg';
            for (const [key, value] of Object.entries(attributes)) {
                attrString += ` ${key}="${value}"`;
            }
            return attrString;
        });
    }

    async function load(name, container, className = '') {
        const svgContent = await loadIcon(name);
        container.innerHTML = svgContent;
        if (className && container.querySelector('svg')) {
            container.querySelector('svg').classList.add(className);
        }
    }

    async function loadWithAttributes(name, container, attributes = {}, className = '') {
        const svgContent = await loadIconWithAttributes(name, attributes);
        container.innerHTML = svgContent;
        if (className && container.querySelector('svg')) {
            container.querySelector('svg').classList.add(className);
        }
    }

    function loadAll() {
        document.querySelectorAll('[data-svg]').forEach(el => {
            const name = el.dataset.svg;
            const className = el.dataset.svgClass || '';
            load(name, el, className);
        });
    }

    function loadAllWithAttributes() {
        document.querySelectorAll('[data-svg]').forEach(el => {
            const name = el.dataset.svg;
            const className = el.dataset.svgClass || '';
            
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
        load,
        loadIcon,
        loadAll,     
        loadWithAttributes,
        loadIconWithAttributes,
        loadAllWithAttributes
    };
})();

window.SvgLoader = SvgLoader;
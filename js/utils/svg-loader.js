const SvgLoader = (() => {
    const cache = {};

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

    async function load(name, container, className = '') {
        const svgContent = await loadIcon(name);
        container.innerHTML = svgContent;
        if (className) container.querySelector('svg')?.classList.add(className);
    }

    function loadAll() {
        document.querySelectorAll('[data-svg]').forEach(el => {
            const name = el.dataset.svg;
            const className = el.dataset.svgClass || '';
            load(name, el, className);
        });
    }

    return { load, loadAll, loadIcon };
})();

window.SvgLoader = SvgLoader;
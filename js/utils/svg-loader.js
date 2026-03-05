const SvgLoader = (() => {
    const cache = {};

    async function load(name, container, className = '') {
        // Si ya está en cache, inyectar directamente
        if (cache[name]) {
            container.innerHTML = cache[name];
            if (className) container.querySelector('svg')?.classList.add(className);
            return;
        }

        try {
            const response = await fetch(`/assets/icons/${name}.svg`);
            if (!response.ok) throw new Error(`SVG no encontrado: ${name}`);
            
            const svgContent = await response.text();
            cache[name] = svgContent;
            
            container.innerHTML = svgContent;
            if (className) container.querySelector('svg')?.classList.add(className);
        } catch (error) {
            console.error('Error cargando SVG:', error);
            container.innerHTML = '<span>⚠️</span>';
        }
    }

    function loadAll() {
        document.querySelectorAll('[data-svg]').forEach(el => {
            const name = el.dataset.svg;
            const className = el.dataset.svgClass || '';
            load(name, el, className);
        });
    }

    return { load, loadAll };
})();
const MuuriLayoutManager = (() => {
    let muuriGrid = null;
    let isInitialized = false;

    // Inicializa Muuri en el dashboard
    function init() {
        const grid = document.getElementById('dashboardGrid');
        if (!grid) {
            console.error('Dashboard grid no encontrado');
            return;
        }

        // Solo inicializar si existe Muuri
        if (typeof Muuri === 'undefined') {
            console.error('Muuri no está cargado. Añade el script en index.html');
            return;
        }

        // Destruir instancia anterior si existe
        if (muuriGrid) {
            muuriGrid.destroy();
            muuriGrid = null;
        }

        // Obtener items actuales (solo los visibles)
        const items = grid.querySelectorAll('.container-item');

        // Configuración básica para reordenamiento
        muuriGrid = new Muuri(grid, {
            items: items,
            dragEnabled: true,
            dragSort: true,
            
            // Simplificar interacciones
            dragSortHeuristics: {
                sortInterval: 100
            },
            
            // Animaciones suaves
            layoutDuration: 300,
            layoutEasing: 'ease',
            
            // Sin redimensionamiento por ahora
            layout: {
                fillGaps: true,
                horizontal: false,
                rounding: true
            },
            
            // Mantener orden
            dragSortPredicate: {
                threshold: 50,
                action: 'move'
            },
            
            // Placeholder durante drag
            dragPlaceholder: {
                enabled: true,
                onCreate: (item, element) => {
                    element.style.background = 'rgba(102, 126, 234, 0.1)';
                    element.style.border = '2px dashed #667eea';
                }
            }
        });

        // Guardar orden cuando cambie
        muuriGrid.on('dragReleaseEnd', () => {
            saveOrder();
        });

        // Cargar orden guardado
        setTimeout(() => {
            loadOrder();
            refreshLayout();
        }, 100);

        isInitialized = true;
        console.log('Muuri inicializado en layout libre');
    }

    // Guarda el orden actual de los contenedores
    function saveOrder() {
        if (!muuriGrid) return;
        
        try {
            const items = muuriGrid.getItems();
            const order = items.map((item, index) => ({
                container: item.getElement().getAttribute('data-container'),
                position: index
            }));

            localStorage.setItem('vmarks_muuri_order', JSON.stringify(order));
            console.log('Orden guardado:', order.map(o => o.container));
        } catch (error) {
            console.error('Error guardando orden:', error);
        }
    }

    // Carga el orden guardado previamente
    function loadOrder() {
        if (!muuriGrid) return;
        
        try {
            const saved = localStorage.getItem('vmarks_muuri_order');
            if (!saved) return;

            const order = JSON.parse(saved);
            const grid = document.getElementById('dashboardGrid');
            
            // Reordenar según el orden guardado
            order.forEach((item, index) => {
                const element = grid.querySelector(`[data-container="${item.container}"]`);
                if (element) {
                    muuriGrid.move(element, index, { layout: false });
                }
            });
            console.log('Orden cargado');
        } catch (error) {
            console.error('Error cargando orden:', error);
        }
    }

    // Refresca el layout de Muuri
    function refreshLayout() {
        if (!muuriGrid) return;
        
        try {
            muuriGrid.refreshItems();
            muuriGrid.layout();
        } catch (error) {
            console.error('Error refrescando layout:', error);
        }
    }

    // Destruye la instancia de Muuri y limpia
    function destroy() {
        if (muuriGrid) {
            saveOrder();
            muuriGrid.destroy();
            muuriGrid = null;
            isInitialized = false;
            
            // Limpiar estilos inline de items
            const grid = document.getElementById('dashboardGrid');
            if (grid) {
                grid.querySelectorAll('.container-item').forEach(item => {
                    item.removeAttribute('style');
                });
            }
            console.log('Muuri destruido');
        }
    }

    // Actualiza items cuando se añaden/eliminan contenedores
    function updateItems() {
        if (!muuriGrid || !isInitialized) return;
        
        const grid = document.getElementById('dashboardGrid');
        if (!grid) return;

        // Añadir nuevos elementos no registrados
        const currentElements = muuriGrid.getItems().map(item => item.getElement());
        const allElements = Array.from(grid.querySelectorAll('.container-item:not([style*="display: none"])'));
        
        const newElements = allElements.filter(el => !currentElements.includes(el));
        const removedElements = currentElements.filter(el => !allElements.includes(el));
        
        if (newElements.length > 0) {
            muuriGrid.add(newElements);
            console.log('➕ Elementos añadidos a Muuri:', newElements.length);
        }
        
        if (removedElements.length > 0) {
            removedElements.forEach(el => {
                muuriGrid.remove(el);
            });
            console.log('➖ Elementos eliminados de Muuri:', removedElements.length);
        }
        refreshLayout();
    }

    // Verifica si Muuri está activo
    function isActive() {
        return isInitialized && muuriGrid !== null;
    }

    return {
        init,
        destroy,
        refreshLayout,
        updateItems,
        isActive,
        saveOrder,
        loadOrder
    };
})();
window.MuuriLayoutManager = MuuriLayoutManager;
const MuuriManager = (() => {
    let muuriGrid = null;
    let isInitialized = false;
    let resizeTimer = null;

    // Inicializa Muuri en el dashboard
    function init() {
        const grid = document.getElementById('dashboardGrid');
        if (!grid) {
            return;
        }

        // Solo inicializar si existe Muuri
        if (typeof Muuri === 'undefined') {
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
            dragHandle: '.container-header',
            layoutOnInit: false,

            // Simplificar interacciones
            dragSortHeuristics: {
                sortInterval: 100
            },
            
            // Animaciones suaves
            layoutDuration: 300,
            layoutEasing: 'ease',
            
            layout: {
                fillGaps: true,
                horizontal: false,
                rounding: false,
                alignRight: false // Asegura que se peguen a la izquierda
            },
            
            // Mantener orden
            dragSortPredicate: {
                threshold: 50,
                action: 'move'
            },
            
            // Placeholder durante drag
            dragPlaceholder: {
                enabled: true,
                duration: 300
            }
        });

        // Guardar orden cuando cambie
        muuriGrid.on('dragReleaseEnd', () => {
            saveOrder();
        });

        // Cargar orden guardado
        setTimeout(() => {
            loadOrder();
            
            // Escuchar cambios de tamaño de ventana para refrescar layout fluido
            window.addEventListener('resize', handleResize);
            
            // Asegurar que la visibilidad se aplique después de que el CSS de layout-free entre en acción
            if (window.VisibilityManager) {
                VisibilityManager.applySavedVisibility();
            }
            refreshLayout();
            if (window.VisibilityManager) VisibilityManager.updateButtonVisibility();
        }, 100);

        isInitialized = true;
    }

    // Maneja el redimensionado de la ventana con debounce
    function handleResize() {
        if (!muuriGrid) return;
        
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            refreshLayout();
        }, 150);
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
                // Solo mover si el elemento existe y está siendo gestionado por Muuri actualmente
                if (element && muuriGrid.getItem(element)) {
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
            
            // Limpiar evento de resize
            window.removeEventListener('resize', handleResize);
            
            // Ocultar botón de visibilidad en la topbar
            if (window.VisibilityManager) {
                VisibilityManager.updateButtonVisibility();
            }
            
            // Limpiar estilos inline de items
            const grid = document.getElementById('dashboardGrid');
            if (grid) {
                grid.querySelectorAll('.container-item').forEach(item => {
                    const muuriProps = ['position', 'top', 'left', 'width', 'height', 'z-index', 'opacity', 'transform', 'display'];
                    muuriProps.forEach(prop => item.style.removeProperty(prop));
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
            console.log('Elementos añadidos a Muuri:', newElements.length);
        }
        
        if (removedElements.length > 0) {
            removedElements.forEach(el => {
                muuriGrid.remove(el);
            });
            console.log('Elementos eliminados de Muuri:', removedElements.length);
        }

        if (newElements.length > 0 || removedElements.length > 0) {
            loadOrder();
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
window.MuuriManager = MuuriManager;
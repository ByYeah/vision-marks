const WidgetManager = (() => {
    // Configuración
    const CONFIG = {
        STORAGE_KEY: 'vision_marks_widgets',
        WIDGET_CONTAINERS: ['widgets-1', 'widgets-2', 'widgets-3', 'widgets-4']
    };

    // Widgets disponibles para elegir
    const AVAILABLE_WIDGETS = [
        { id: 'photo-grid', name: 'Photo Grid', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 28 28"><path fill="currentColor" fill-rule="nonzero" d="M22.993 6.008A3.24 3.24 0 0 1 24.5 8.75v10.5c0 2.9-2.35 5.25-5.25 5.25H8.75a3.25 3.25 0 0 1-2.744-1.507l.122.005.122.002h13A3.75 3.75 0 0 0 23 19.25v-13q0-.122-.007-.242M18.75 3A3.25 3.25 0 0 1 22 6.25v12.5A3.25 3.25 0 0 1 18.75 22H6.25A3.25 3.25 0 0 1 3 18.75V6.25A3.25 3.25 0 0 1 6.25 3zm.582 17.401-6.307-6.178a.75.75 0 0 0-.966-.07l-.084.07-6.307 6.178q.275.098.582.099h12.5q.307-.002.582-.099l-6.307-6.178zM18.75 4.5H6.25A1.75 1.75 0 0 0 4.5 6.25v12.5q.001.314.103.593l6.322-6.192a2.25 2.25 0 0 1 3.02-.116l.13.116 6.322 6.193q.102-.28.103-.594V6.25a1.75 1.75 0 0 0-1.75-1.75M16 7.751a1.25 1.25 0 1 1 0 2.499 1.25 1.25 0 0 1 0-2.499"/></svg>', description: 'Galería de imágenes para tu visión' },
        { id: 'recent-bookmarks', name: 'Últimos marcadores', icon: '🔖', description: 'Tus últimos 5 marcadores guardados' },
        { id: 'daily-quote', name: 'Cita del día', icon: '💬', description: 'Inspiración diaria' },
        { id: 'goals-counter', name: 'Mis Metas', icon: '🎯', description: 'Seguimiento de objetivos' }
    ];

    // Widgets registrados
    const registeredWidgets = new Map();

    // Estado: qué widget está en cada contenedor
    let widgetAssignments = {
        'widgets-1': null,
        'widgets-2': null,
        'widgets-3': null,
        'widgets-4': null
    };

    // Widget actualmente expandido
    let expandedContainer = null;

    // Suscriptores para eventos
    let subscribers = [];

    function registerWidget(widget) {
        // Validación más permisiva
        if (!widget || typeof widget !== 'object') {
            console.error('Widget inválido: no es un objeto');
            return false;
        }

        if (!widget.id) {
            console.error('Widget inválido: falta id', widget);
            return false;
        }

        if (!widget.name) {
            console.error('Widget inválido: falta name', widget);
            return false;
        }

        // render puede ser una función o puede usar renderPreview por defecto
        if (!widget.render && !widget.renderPreview) {
            console.error('Widget inválido: falta render o renderPreview', widget);
            return false;
        }

        // Si ya está registrado, no volver a registrar
        if (registeredWidgets.has(widget.id)) {
            console.warn(`Widget ${widget.id} ya estaba registrado, omitiendo`);
            return true;
        }

        registeredWidgets.set(widget.id, widget);
        console.log(`✅ Widget registrado: ${widget.name} (${widget.id})`);
        return true;
    }

    function getAvailableWidgets(containerId = null) {
        // Obtener IDs de widgets YA ASIGNADOS (no disponibles para este contenedor si ya están en otro)
        const usedWidgetIds = new Set();

        for (const [cid, assignment] of Object.entries(widgetAssignments)) {
            if (assignment && assignment.id) {
                // Si es el mismo contenedor, permitir seleccionar el mismo widget (para cambiarlo)
                if (cid !== containerId) {
                    usedWidgetIds.add(assignment.id);
                }
            }
        }

        // Devolver TODOS los widgets, pero marcados como disponibles o no
        return AVAILABLE_WIDGETS.map(widget => ({
            ...widget,
            isUsed: usedWidgetIds.has(widget.id)
        }));
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);

                // ✅ VERIFICAR Y CORREGIR DUPLICADOS
                const assignments = parsed.widgetAssignments || widgetAssignments;
                const usedWidgets = new Set();
                let hasDuplicates = false;

                for (const [containerId, assignment] of Object.entries(assignments)) {
                    if (assignment && assignment.id) {
                        if (usedWidgets.has(assignment.id)) {
                            // Duplicado encontrado, limpiar este contenedor
                            console.warn(`Widget duplicado detectado en ${containerId}, limpiando...`);
                            assignments[containerId] = null;
                            hasDuplicates = true;
                        } else {
                            usedWidgets.add(assignment.id);
                        }
                    }
                }

                widgetAssignments = assignments;
                expandedContainer = parsed.expandedContainer || null;

                if (hasDuplicates) {
                    // Guardar estado corregido
                    saveState();
                }
            }
            console.log('📦 Widget state cargado:', widgetAssignments);
        } catch (error) {
            console.error('Error loading widget state:', error);
        }
    }

    function saveState() {
        try {
            const toSave = {
                widgetAssignments,
                expandedContainer
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(toSave));
        } catch (error) {
            console.error('Error saving widget state:', error);
        }
    }

    function subscribe(callback) {
        subscribers.push(callback);
        return () => {
            subscribers = subscribers.filter(cb => cb !== callback);
        };
    }

    function notifySubscribers() {
        subscribers.forEach(callback => callback({
            widgetAssignments,
            expandedContainer
        }));
    }

    // Asignar un widget a un contenedor
    async function assignWidget(containerId, widgetId, config = {}) {
        const widget = registeredWidgets.get(widgetId);
        if (!widget) {
            console.error(`Widget ${widgetId} no registrado`);
            return false;
        }

        // Verificar si el widget ya está en uso en OTRO contenedor
        let isUsedElsewhere = false;
        for (const [cid, assignment] of Object.entries(widgetAssignments)) {
            if (cid !== containerId && assignment && assignment.id === widgetId) {
                isUsedElsewhere = true;
                break;
            }
        }

        if (isUsedElsewhere) {
            ModalManager.showAlert('Widget no disponible',
                `El widget "${widget.name}" ya está siendo usado en otro espacio. Elimínalo primero desde ahí.`);
            return false;
        }

        widgetAssignments[containerId] = {
            id: widgetId,
            config: config,
            isExpanded: false
        };

        saveState();
        notifySubscribers();

        await renderWidgetInContainer(containerId);
        return true;
    }

    // Remover widget de un contenedor
    async function removeWidget(containerId) {
        if (expandedContainer === containerId) {
            await collapseWidget(containerId);
        }

        widgetAssignments[containerId] = null;
        saveState();
        notifySubscribers();

        // Mostrar placeholder
        await renderPlaceholderInContainer(containerId);

        return true;
    }

    // Expandir widget (ocupa todo el espacio del contenedor)
    async function expandWidget(containerId) {
        const assignment = widgetAssignments[containerId];
        if (!assignment) return false;

        // Si ya hay un widget expandido, colapsarlo primero
        if (expandedContainer && expandedContainer !== containerId) {
            await collapseWidget(expandedContainer);
        }

        // Marcar como expandido
        assignment.isExpanded = true;
        expandedContainer = containerId;

        saveState();
        notifySubscribers();

        // Re-renderizar el widget en modo expandido
        await renderWidgetInContainer(containerId, true);

        return true;
    }

    // Colapsar widget
    async function collapseWidget(containerId) {
        const assignment = widgetAssignments[containerId];
        if (!assignment) return false;

        assignment.isExpanded = false;
        expandedContainer = null;

        saveState();
        notifySubscribers();

        // Re-renderizar en modo normal
        await renderWidgetInContainer(containerId, false);

        return true;
    }

    // Alternar expandido/colapsado
    async function toggleWidget(containerId) {
        if (expandedContainer === containerId) {
            await collapseWidget(containerId);
        } else {
            await expandWidget(containerId);
        }
    }

    // Renderizar placeholder en un contenedor (grid 2x2 de iconos)
    async function renderPlaceholderInContainer(containerId) {
        const container = document.querySelector(`[data-container="${containerId}"]`);
        if (!container) return;

        const body = container.querySelector('.container-body');
        if (!body) return;

        const allWidgets = getAvailableWidgets(containerId);
        console.table(allWidgets); // Esto te mostrará en la consola si hay 4 widgets o menos

        const gridHtml = allWidgets.map(widget => `
            <div class="widget-icon-card ${widget.isUsed ? 'disabled' : ''}" 
                 data-widget-id="${widget.id}" 
                 title="${widget.isUsed ? `En uso: ${widget.name}` : widget.name}">
                <div class="widget-icon-large">${widget.icon || '📦'}</div>
            </div>`).join('');

        body.innerHTML = `
            <div class="widget-selector-grid">
                <div class="widget-icons-grid">${gridHtml}</div>
            </div>`;

        const cards = body.querySelectorAll('.widget-icon-card:not(.disabled)');
        cards.forEach(card => {
            card.addEventListener('click', async () => {
                const widgetId = card.dataset.widgetId;
                if (widgetId && containerId) {
                    await assignWidget(containerId, widgetId);
                }
            });
        });
    }

    // Renderizar widget en su contenedor
    async function renderWidgetInContainer(containerId, forceExpanded = false) {
        const assignment = widgetAssignments[containerId];
        if (!assignment) {
            await renderPlaceholderInContainer(containerId);
            return;
        }

        const widget = registeredWidgets.get(assignment.id);
        if (!widget) {
            await renderPlaceholderInContainer(containerId);
            return;
        }

        const container = document.querySelector(`[data-container="${containerId}"]`);
        if (!container) return;

        const body = container.querySelector('.container-body');
        if (!body) return;

        const isExpanded = forceExpanded || assignment.isExpanded;

        // Generar HTML según modo
        let html = '';
        if (isExpanded && widget.renderExpanded) {
            html = widget.renderExpanded(assignment.config, assignment.id);
        } else if (widget.renderPreview) {
            html = widget.renderPreview(assignment.config, assignment.id);
        } else {
            html = widget.render(assignment.config, assignment.id);
        }

        body.innerHTML = `
            <div class="widget-content ${isExpanded ? 'widget-expanded' : 'widget-preview'}" 
                 data-widget-id="${assignment.id}"
                 data-container="${containerId}">
                ${html}
                <button class="widget-toggle-btn" data-container="${containerId}" 
                        title="${isExpanded ? 'Colapsar' : 'Expandir'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${isExpanded ?
                '<polyline points="18 15 12 9 6 15"/>' :
                '<polyline points="6 9 12 15 18 9"/>'
            }
                    </svg>
                </button>
            </div>
        `;

        // Inicializar lógica del widget
        if (isExpanded && widget.initExpanded) {
            const widgetElement = body.querySelector('.widget-content');
            await widget.initExpanded(widgetElement, assignment.config);
        } else if (widget.initPreview) {
            const widgetElement = body.querySelector('.widget-content');
            await widget.initPreview(widgetElement, assignment.config);
        } else if (widget.init) {
            const widgetElement = body.querySelector('.widget-content');
            await widget.init(widgetElement, assignment.config);
        }

        // Adjuntar evento del botón toggle
        const toggleBtn = body.querySelector('.widget-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleWidget(containerId);
            });
        }
    }

    // Renderizar todos los widgets
    async function renderAllWidgets() {
        for (const containerId of CONFIG.WIDGET_CONTAINERS) {
            await renderWidgetInContainer(containerId);
        }
    }

    // Mostrar selector para elegir widget
    async function showWidgetSelector(containerId) {
        const availableWidgets = getAvailableWidgets();

        // También permitir cambiar el widget actual
        const currentAssignment = widgetAssignments[containerId];
        let allOptions = [...availableWidgets];

        if (currentAssignment) {
            const currentWidget = AVAILABLE_WIDGETS.find(w => w.id === currentAssignment.id);
            if (currentWidget && !allOptions.find(w => w.id === currentWidget.id)) {
                allOptions.unshift(currentWidget);
            }
        }

        if (allOptions.length === 0) {
            ModalManager.showAlert('Sin widgets disponibles',
                'Todos los widgets ya están en uso. Elimina uno primero desde el icono ⚙️ en la esquina.');
            return;
        }

        const content = `
            <div class="widget-selector">
                <p>Selecciona un widget para este espacio:</p>
                <div class="widget-options">
                    ${allOptions.map(widget => `
                        <div class="widget-option" data-widget-id="${widget.id}">
                            <div class="widget-option-icon">${widget.icon || '📦'}</div>
                            <div class="widget-option-name">${widget.name}</div>
                            <div class="widget-option-desc">${widget.description || ''}</div>
                        </div>
                    `).join('')}
                </div>
                ${currentAssignment ? `
                    <div class="widget-selector-remove">
                        <button class="btn-remove-widget" data-container="${containerId}">
                            🗑️ Eliminar widget actual
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        const modal = ModalManager.createModal('widgetSelector', 'Configurar Widget', content, [
            { text: 'Cancelar', class: 'btn-secondary', action: 'cancel' }
        ]);

        ModalManager.openModal(modal);

        setTimeout(() => {
            // Seleccionar widget
            modal.querySelectorAll('.widget-option').forEach(option => {
                option.addEventListener('click', async () => {
                    const widgetId = option.dataset.widgetId;
                    await assignWidget(containerId, widgetId);
                    ModalManager.closeModal(modal);
                });
            });

            // Eliminar widget actual
            const removeBtn = modal.querySelector('.btn-remove-widget');
            if (removeBtn) {
                removeBtn.addEventListener('click', async () => {
                    await removeWidget(containerId);
                    ModalManager.closeModal(modal);
                });
            }
        }, 100);
    }

    // Mostrar configuración global de widgets
    async function showGlobalSettings() {
        const content = `
            <div class="widgets-global-settings">
                <p>Gestiona los widgets en cada espacio:</p>
                <div class="widgets-assignments">
                    ${CONFIG.WIDGET_CONTAINERS.map(containerId => {
            const assignment = widgetAssignments[containerId];
            const widgetName = assignment ?
                AVAILABLE_WIDGETS.find(w => w.id === assignment.id)?.name || assignment.id :
                'Vacío';
            return `
                            <div class="widget-assignment-item">
                                <span class="widget-container-name">${containerId.toUpperCase()}</span>
                                <span class="widget-assigned-name">${widgetName}</span>
                                <button class="btn-configure-widget" data-container="${containerId}">
                                    ⚙️ Configurar
                                </button>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;

        const modal = ModalManager.createModal('widgetsGlobalSettings', 'Configurar Widgets', content, [
            { text: 'Cerrar', class: 'btn-primary', action: 'close' }
        ]);

        ModalManager.openModal(modal);

        setTimeout(() => {
            modal.querySelectorAll('.btn-configure-widget').forEach(btn => {
                btn.addEventListener('click', () => {
                    const containerId = btn.dataset.container;
                    ModalManager.closeModal(modal);
                    showWidgetSelector(containerId);
                });
            });
        }, 100);
    }

    async function init() {
        loadState();

        // Ocultar/mostrar contenedores según layout se maneja en render.js
        // Solo renderizamos los widgets existentes

        await renderAllWidgets();

        // Configurar botones de configuración global (en cada header de widget)
        setupBackButtons();

        console.log('📦 WidgetManager inicializado');
    }

    function setupBackButtons() {
        for (const containerId of CONFIG.WIDGET_CONTAINERS) {
            const container = document.querySelector(`[data-container="${containerId}"]`);
            if (!container) continue;

            const backBtn = container.querySelector('.btn-add');
            if (backBtn) {
                backBtn.removeEventListener('click', handleBackClick);
                backBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await removeWidget(containerId);
                });
            }
        }

        // También añadir un botón global en settings si existe
        const globalBackBtn = document.querySelector('#widgetsGlobalConfig');
        if (globalBackBtn) {
            globalBackBtn.removeEventListener('click', handleGlobalBackClick);
            globalBackBtn.addEventListener('click', showGlobalSettings);
        }
    }

    function handleBackClick(e) {
        // El evento se maneja directamente arriba
    }

    function handleGlobalBackClick() {
        showGlobalSettings();
    }

    // Limpiar widget específico (para cuando cambia el layout)
    async function cleanupWidget(containerId) {
        const assignment = widgetAssignments[containerId];
        if (assignment) {
            const widget = registeredWidgets.get(assignment.id);
            if (widget && widget.destroy) {
                const container = document.querySelector(`[data-container="${containerId}"]`);
                const widgetElement = container?.querySelector('.widget-content');
                if (widgetElement) {
                    await widget.destroy(widgetElement);
                }
            }
        }
    }

    return {
        init,
        registerWidget,
        assignWidget,
        removeWidget,
        expandWidget,
        collapseWidget,
        toggleWidget,
        renderAllWidgets,
        renderWidgetInContainer,
        getAvailableWidgets,
        getWidgetAssignments: () => ({ ...widgetAssignments }),
        getExpandedContainer: () => expandedContainer,
        subscribe,
        cleanupWidget,
        showGlobalSettings
    };
})();
window.WidgetManager = WidgetManager;
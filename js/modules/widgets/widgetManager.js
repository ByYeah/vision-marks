const WidgetManager = (() => {
    // Configuración
    const CONFIG = {
        STORAGE_KEY: 'vision_marks_widgets',
        WIDGET_CONTAINERS: ['widgets-1', 'widgets-2', 'widgets-3', 'widgets-4']
    };

    let initializationComplete = false;

    // Widgets disponibles para elegir
    const AVAILABLE_WIDGETS = [
        { id: 'photo-grid', name: 'Photo Grid', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><path fill="currentColor" fill-rule="nonzero" d="M22.993 6.008A3.24 3.24 0 0 1 24.5 8.75v10.5c0 2.9-2.35 5.25-5.25 5.25H8.75a3.25 3.25 0 0 1-2.744-1.507l.122.005.122.002h13A3.75 3.75 0 0 0 23 19.25v-13q0-.122-.007-.242M18.75 3A3.25 3.25 0 0 1 22 6.25v12.5A3.25 3.25 0 0 1 18.75 22H6.25A3.25 3.25 0 0 1 3 18.75V6.25A3.25 3.25 0 0 1 6.25 3zm.582 17.401-6.307-6.178a.75.75 0 0 0-.966-.07l-.084.07-6.307 6.178q.275.098.582.099h12.5q.307-.002.582-.099l-6.307-6.178zM18.75 4.5H6.25A1.75 1.75 0 0 0 4.5 6.25v12.5q.001.314.103.593l6.322-6.192a2.25 2.25 0 0 1 3.02-.116l.13.116 6.322 6.193q.102-.28.103-.594V6.25a1.75 1.75 0 0 0-1.75-1.75M16 7.751a1.25 1.25 0 1 1 0 2.499 1.25 1.25 0 0 1 0-2.499"/></svg>', description: 'Galería de imágenes para tu visión' },
        { id: 'recent-bookmarks', name: 'Últimos marcadores', icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 28 28"><path fill="currentColor" d="M6 6.75A3.25 3.25 0 0 1 9.25 3.5h9.5A3.25 3.25 0 0 1 22 6.75v18a.75.75 0 0 1-1.203.598L14 20.19l-6.797 5.157A.75.75 0 0 1 6 24.75zM9.25 5A1.75 1.75 0 0 0 7.5 6.75v16.49l6.047-4.587a.75.75 0 0 1 .906 0L20.5 23.24V6.75A1.75 1.75 0 0 0 18.75 5z"/></svg>', description: 'Tus últimos 5 marcadores guardados' },
        { id: 'daily-quote', name: 'Cita del día', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="nonzero" d="M7.5 6a2.5 2.5 0 0 1 2.495 2.336l.005.206c-.01 3.555-1.24 6.614-3.705 9.223a.75.75 0 1 1-1.09-1.03c1.64-1.737 2.66-3.674 3.077-5.859q-.372.122-.782.124a2.5 2.5 0 0 1 0-5m9 0a2.5 2.5 0 0 1 2.495 2.336l.005.206c-.01 3.56-1.237 6.614-3.705 9.223a.75.75 0 0 1-1.09-1.03c1.643-1.738 2.662-3.672 3.078-5.859A2.5 2.5 0 1 1 16.5 6m-9 1.5a1 1 0 1 0 .993 1.117l.007-.124a1 1 0 0 0-1-.993m9 0a1 1 0 1 0 .993 1.117l.007-.124a1 1 0 0 0-1-.993"/></svg>', description: 'Inspiración diaria' },
        { id: 'goals-counter', name: 'Mis Metas', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="nonzero" d="M8.632 19.28a.75.75 0 0 1 .073.977l-.073.084L7.574 21.4a.75.75 0 0 1-1.134-.977l.073-.084 1.059-1.058a.75.75 0 0 1 1.06 0M6.69 17.335a.75.75 0 0 1 .072.976l-.072.085-2.475 2.474a.75.75 0 0 1-1.133-.976l.072-.084 2.475-2.475a.75.75 0 0 1 1.06 0M18.778 2.232l.258.075.662.205a2.75 2.75 0 0 1 1.747 1.628l.064.182.206.665a6.75 6.75 0 0 1-1.487 6.583l-.186.193-.998.998a3.5 3.5 0 0 1-.183 4.415l-.145.152-1.242 1.243a.75.75 0 0 1-.977.073l-.084-.073-1.59-1.59-.176.177a1.75 1.75 0 0 1-2.35.114l-.125-.114-.497-.497-.798 1.395a.75.75 0 0 1-1.093.233l-.088-.075-3.89-3.89a.75.75 0 0 1 .076-1.126l.083-.055 1.396-.796-.496-.495a1.75 1.75 0 0 1-.113-2.35l.113-.125.18-.18-1.59-1.591a.75.75 0 0 1-.073-.977l.072-.084 1.243-1.242a3.5 3.5 0 0 1 4.402-.445l.167.118.996-.996a6.75 6.75 0 0 1 6.516-1.748M4.745 15.39a.75.75 0 0 1 0 1.061l-1.06 1.06a.75.75 0 0 1-1.061-1.06l1.06-1.06a.75.75 0 0 1 1.061 0m13.22-1.548-2.08 2.08 1.059 1.06.712-.713c.658-.658.76-1.661.308-2.427m-9.505-.394-.898.512 2.5 2.5.514-.897zm5.038-8.574-.175.168-5.397 5.397a.25.25 0 0 0-.04.3l.04.053 5.307 5.307a.25.25 0 0 0 .3.04l.053-.04 5.395-5.396a5.25 5.25 0 0 0 1.368-5.036l-.066-.234-.207-.664a1.25 1.25 0 0 0-.695-.776l-.128-.047-.662-.206a5.25 5.25 0 0 0-5.093 1.134m3.095 2.558a2.5 2.5 0 1 1-3.536 3.536 2.5 2.5 0 0 1 3.536-3.536m-2.475 1.06a1 1 0 1 0 1.414 1.415 1 1 0 0 0-1.414-1.414M7.885 6.248l-.128.117-.712.712 1.06 1.06 2.081-2.08a2 2 0 0 0-2.301.19"/></svg>', description: 'Seguimiento de objetivos' }
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

                // Verificar Y Corregir duplicados
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

        await renderAllWidgets();
        await updateAllExpandButtons();
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

        await renderAllWidgets();
        await updateAllExpandButtons();
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

        await renderAllWidgets();
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
            await updateExpandButton(containerId, false);
            return;
        }

        const widget = registeredWidgets.get(assignment.id);
        if (!widget) {
            await renderPlaceholderInContainer(containerId);
            await updateExpandButton(containerId, false);
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

        // Actualizar el botón de expandir en la cabecera
        await updateExpandButton(containerId, isExpanded);
    }

    // Actualizar el botón de expandir en la cabecera
    async function updateExpandButton(containerId, isExpanded) {
        const container = document.querySelector(`[data-container="${containerId}"]`);
        if (!container) return;

        const expandBtn = container.querySelector('.btn-toggle-expand');
        if (!expandBtn) return;

        const assignment = widgetAssignments[containerId];

        // Mostrar botón SOLO si hay un widget asignado
        if (assignment && assignment.id && registeredWidgets.has(assignment.id)) {
            expandBtn.style.display = 'flex';
            expandBtn.title = isExpanded ? 'Colapsar' : 'Expandir';

            // Actualizar icono según estado
            const iconSpan = expandBtn.querySelector('.icon-wrapper');
            if (iconSpan) {
                if (isExpanded) {
                    iconSpan.setAttribute('data-svg', 'arrow-up');
                } else {
                    iconSpan.setAttribute('data-svg', 'arrow-down');
                }
                // Recargar SVG
                if (window.SvgLoader) {
                    const svgContent = await SvgLoader.loadIcon(isExpanded ? 'arrow-up' : 'arrow-down');
                    iconSpan.innerHTML = svgContent;
                }
            }

            // Remover eventos anteriores y añadir nuevo
            const newBtn = expandBtn.cloneNode(true);
            expandBtn.parentNode.replaceChild(newBtn, expandBtn);

            newBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await toggleWidget(containerId);
            });
        } else {
            expandBtn.style.display = 'none';
        }
    }

    // Renderizar todos los widgets
    async function renderAllWidgets() {
        for (const containerId of CONFIG.WIDGET_CONTAINERS) {
            await renderWidgetInContainer(containerId);
        }
        await updateAllExpandButtons();
    }

    // Actualizar todos los botones expand
    async function updateAllExpandButtons() {
        for (const containerId of CONFIG.WIDGET_CONTAINERS) {
            const assignment = widgetAssignments[containerId];
            const isExpanded = assignment?.isExpanded || false;
            await updateExpandButton(containerId, isExpanded);
        }
    }

    async function init() {
        loadState();
        // Configurar botones ANTES de renderizar
        setupBackButtons();
        // Renderizar todos los widgets
        await renderAllWidgets();
        // Asegurar que los botones expand estén actualizados
        await updateAllExpandButtons();
        initializationComplete = true;
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
    }

    function handleBackClick(e) {
        // El evento se maneja directamente arriba
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
    };
})();
window.WidgetManager = WidgetManager;
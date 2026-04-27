const GoalsCounterWidget = (() => {
    const STORAGE_KEY = 'widget_goals';
    
    // Estructura por defecto
    const DEFAULT_GOALS = [
        { id: 'goal1', name: 'Aprender algo nuevo', current: 0, target: 10, unit: 'días' },
        { id: 'goal2', name: 'Leer libros', current: 0, target: 12, unit: 'libros' },
        { id: 'goal3', name: 'Ejercicio semanal', current: 0, target: 3, unit: 'veces/semana' }
    ];
    
    // Cargar metas
    function loadGoals(widgetId) {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY}_${widgetId}`);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading goals:', error);
        }
        return [...DEFAULT_GOALS];
    }
    
    // Guardar metas
    function saveGoals(widgetId, goals) {
        try {
            localStorage.setItem(`${STORAGE_KEY}_${widgetId}`, JSON.stringify(goals));
        } catch (error) {
            console.error('Error saving goals:', error);
        }
    }
    
    // Calcular progreso
    function calculateProgress(current, target) {
        if (target === 0) return 0;
        return Math.min(100, Math.round((current / target) * 100));
    }
    
    // Renderizar preview
    function renderPreview(config, widgetId) {
        const goals = loadGoals(widgetId);
        const activeGoals = goals.filter(g => g.current < g.target).length;
        const completedGoals = goals.filter(g => g.current >= g.target).length;
        
        return `
            <div class="goals-preview">
                <div class="goals-stats">
                    <div class="goal-stat">
                        <span class="stat-value">${activeGoals}</span>
                        <span class="stat-label">Activas</span>
                    </div>
                    <div class="goal-stat">
                        <span class="stat-value">${completedGoals}</span>
                        <span class="stat-label">Completadas</span>
                    </div>
                </div>
                <div class="goals-mini-list">
                    ${goals.slice(0, 2).map(goal => `
                        <div class="goal-mini">
                            <div class="goal-name">${escapeHtml(goal.name)}</div>
                            <div class="goal-progress-mini">
                                <div class="progress-bar-mini" style="width: ${calculateProgress(goal.current, goal.target)}%"></div>
                            </div>
                            <div class="goal-count">${goal.current}/${goal.target} ${goal.unit}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Renderizar expandido
    function renderExpanded(config, widgetId) {
        const goals = loadGoals(widgetId);
        
        return `
            <div class="goals-full">
                <div class="goals-header">
                    <h4>Seguimiento de Metas</h4>
                    <button class="goals-add-btn" title="Añadir meta">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
                <div class="goals-list">
                    ${goals.map(goal => `
                        <div class="goal-item" data-goal-id="${goal.id}">
                            <div class="goal-header">
                                <div class="goal-title">
                                    <span class="goal-name">${escapeHtml(goal.name)}</span>
                                    <span class="goal-target">${goal.target} ${goal.unit}</span>
                                </div>
                                <div class="goal-actions">
                                    <button class="goal-delete-btn" data-goal-id="${goal.id}" title="Eliminar">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="18" y1="6" x2="6" y2="18"/>
                                            <line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="goal-progress">
                                <div class="progress-bar-container">
                                    <div class="progress-bar" style="width: ${calculateProgress(goal.current, goal.target)}%"></div>
                                </div>
                                <div class="goal-counter">
                                    <button class="goal-decrement" data-goal-id="${goal.id}">-</button>
                                    <span class="goal-current">${goal.current}</span>
                                    <button class="goal-increment" data-goal-id="${goal.id}">+</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Inicializar preview
    function initPreview(element, config) {
        // No necesita inicialización especial
    }
    
    // Inicializar expandido
    function initExpanded(element, config) {
        const widgetId = element.closest('[data-container]')?.dataset.container;
        if (!widgetId) return;
        
        let goals = loadGoals(widgetId);
        
        function updateUI() {
            const goalsList = element.querySelector('.goals-list');
            if (!goalsList) return;
            
            goalsList.innerHTML = goals.map(goal => `
                <div class="goal-item" data-goal-id="${goal.id}">
                    <div class="goal-header">
                        <div class="goal-title">
                            <span class="goal-name">${escapeHtml(goal.name)}</span>
                            <span class="goal-target">${goal.target} ${goal.unit}</span>
                        </div>
                        <div class="goal-actions">
                            <button class="goal-delete-btn" data-goal-id="${goal.id}" title="Eliminar">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="goal-progress">
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${calculateProgress(goal.current, goal.target)}%"></div>
                        </div>
                        <div class="goal-counter">
                            <button class="goal-decrement" data-goal-id="${goal.id}">-</button>
                            <span class="goal-current">${goal.current}</span>
                            <button class="goal-increment" data-goal-id="${goal.id}">+</button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            attachEvents();
        }
        
        function attachEvents() {
            // Incrementar/Decrementar
            element.querySelectorAll('.goal-increment').forEach(btn => {
                btn.addEventListener('click', () => {
                    const goalId = btn.dataset.goalId;
                    const goal = goals.find(g => g.id === goalId);
                    if (goal && goal.current < goal.target) {
                        goal.current++;
                        saveGoals(widgetId, goals);
                        updateUI();
                    }
                });
            });
            
            element.querySelectorAll('.goal-decrement').forEach(btn => {
                btn.addEventListener('click', () => {
                    const goalId = btn.dataset.goalId;
                    const goal = goals.find(g => g.id === goalId);
                    if (goal && goal.current > 0) {
                        goal.current--;
                        saveGoals(widgetId, goals);
                        updateUI();
                    }
                });
            });
            
            // Eliminar meta
            element.querySelectorAll('.goal-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const goalId = btn.dataset.goalId;
                    if (confirm('¿Eliminar esta meta?')) {
                        goals = goals.filter(g => g.id !== goalId);
                        saveGoals(widgetId, goals);
                        updateUI();
                    }
                });
            });
        }
        
        // Añadir nueva meta
        const addBtn = element.querySelector('.goals-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const newGoal = {
                    id: `goal_${Date.now()}`,
                    name: 'Nueva meta',
                    current: 0,
                    target: 10,
                    unit: 'unidades'
                };
                
                goals.push(newGoal);
                saveGoals(widgetId, goals);
                updateUI();
            });
        }
        
        attachEvents();
    }
    
    function destroy(element) {
        const addBtn = element.querySelector('.goals-add-btn');
        if (addBtn) {
            const newBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newBtn, addBtn);
        }
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    return {
        id: 'goals-counter',
        name: 'Mis Metas',
        icon: '🎯',
        description: 'Seguimiento de objetivos personales',
        renderPreview,
        renderExpanded,
        initPreview,
        initExpanded,
        destroy
    };
})();

window.GoalsCounterWidget = GoalsCounterWidget;
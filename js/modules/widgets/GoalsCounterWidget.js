const GoalsCounterWidget = (() => {
    const STORAGE_KEY = 'widget_goals';
    
    // Estructura por defecto
    const DEFAULT_GOALS = [
        { id: 'goal1', name: 'Aprender algo nuevo', current: 0, target: 10, unit: 'días' },
        { id: 'goal2', name: 'Leer libros', current: 0, target: 12, unit: 'libros' },
        { id: 'goal3', name: 'Ejercicio semanal', current: 0, target: 3, unit: 'veces/semana' }
    ];
    
    // Cargar metas
    function loadGoals() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading goals:', error);
        }
        return [...DEFAULT_GOALS];
    }
    
    // Guardar metas
    function saveGoals(goals) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
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
        const goals = loadGoals();
        const activeGoals = goals.filter(g => g.current < g.target).length;
        const completedGoals = goals.filter(g => g.current >= g.target).length;
        
        // Agrupar metas de 2 en 2 para la rotación
        const groups = [];
        for (let i = 0; i < goals.length; i += 2) {
            groups.push(goals.slice(i, i + 2));
        }

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
                <div class="goals-mini-carousel">
                    ${groups.map((group, index) => `
                        <div class="goals-mini-group ${index === 0 ? 'active' : ''}">
                            ${group.map(goal => `
                                <div class="goal-mini">
                                    <div class="goal-name">${escapeHtml(goal.name)}</div>
                                    <div class="goal-progress-mini">
                                        <div class="progress-bar-mini" style="width: ${calculateProgress(goal.current, goal.target)}%"></div>
                                    </div>
                                    <div class="goal-count">${goal.current}/${goal.target} ${goal.unit}</div>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Renderizar expandido
    function renderExpanded(config, widgetId) {
        const goals = loadGoals();
        
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
                                    <span class="goal-name" contenteditable="true" data-field="name" title="Clic para editar">${escapeHtml(goal.name)}</span>
                                    <span class="goal-target" contenteditable="true" data-field="target" title="Editar número">${goal.target}</span>
                                    <span class="goal-unit" contenteditable="true" data-field="unit" title="Editar unidad">${escapeHtml(goal.unit)}</span>
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
        const groups = element.querySelectorAll('.goals-mini-group');
        if (groups.length <= 1) return;

        let currentIndex = 0;
        const intervalId = setInterval(() => {
            // Limpieza automática si el elemento ya no está en el DOM
            if (!element.isConnected) {
                clearInterval(intervalId);
                return;
            }

            groups[currentIndex].classList.remove('active');
            currentIndex = (currentIndex + 1) % groups.length;
            groups[currentIndex].classList.add('active');
        }, 6000); // Rota cada 6 segundos

        element._goalsCarouselInterval = intervalId;
    }
    
    // Inicializar expandido
    function initExpanded(element, config) {
        let goals = loadGoals();
        
        function updateUI() {
            const goalsList = element.querySelector('.goals-list');
            if (!goalsList) return;
            
            goalsList.innerHTML = goals.map(goal => `
                <div class="goal-item" data-goal-id="${goal.id}">
                    <div class="goal-header">
                        <div class="goal-title">
                            <span class="goal-name" contenteditable="true" data-field="name" title="Clic para editar">${escapeHtml(goal.name)}</span>
                            <span class="goal-target" contenteditable="true" data-field="target" title="Editar número">${goal.target}</span>
                            <span class="goal-unit" contenteditable="true" data-field="unit" title="Editar unidad">${escapeHtml(goal.unit)}</span>
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
                        saveGoals(goals);
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
                        saveGoals(goals);
                        updateUI();
                    }
                });
            });
            
            // Eliminar meta
            element.querySelectorAll('.goal-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const goalId = btn.dataset.goalId;
                    goals = goals.filter(g => g.id !== goalId);
                    saveGoals(goals);
                    updateUI();
                });
            });

            // Edición inline (Nombre, Meta y Unidad)
            element.querySelectorAll('[contenteditable="true"]').forEach(editable => {
                editable.addEventListener('blur', () => {
                    const goalId = editable.closest('.goal-item').dataset.goalId;
                    const field = editable.dataset.field;
                    let value = editable.textContent.trim();
                    
                    const goal = goals.find(g => g.id === goalId);
                    if (goal) {
                        if (field === 'target') {
                            const num = parseInt(value);
                            // Validar que sea un número positivo
                            goal[field] = isNaN(num) || num < 1 ? 1 : num;
                            if (goal.current > goal.target) goal.current = goal.target;
                        } else {
                            // No permitir valores vacíos
                            goal[field] = value || (field === 'name' ? 'Nueva Meta' : 'unid.');
                        }
                        saveGoals(goals);
                        updateUI();
                    }
                });

                editable.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        editable.blur(); // Dispara el guardado
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
                saveGoals(goals);
                updateUI();
            });
        }
        
        attachEvents();
    }
    
    function destroy(element) {
        if (element._goalsCarouselInterval) {
            clearInterval(element._goalsCarouselInterval);
        }
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
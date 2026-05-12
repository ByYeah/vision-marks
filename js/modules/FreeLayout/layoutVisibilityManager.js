const LayoutVisibilityManager = (() => {
    const STORAGE_KEY = 'vmarks_visibility_settings';

    // Configuración de los elementos opcionales
    const OPTIONAL_ITEMS = [
        { id: 'chat', label: 'Asistente IA (Chat)' },
        { id: 'widgets-1', label: 'Widget de Sistema 1' },
        { id: 'widgets-2', label: 'Widget de Sistema 2' },
        { id: 'widgets-3', label: 'Widget de Sistema 3' },
        { id: 'widgets-4', label: 'Widget de Sistema 4' }
    ];

    function init() {
        applySavedVisibility();
        updateButtonVisibility();

        const btn = document.getElementById('btn-configure-layout');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showConfigModal();
            });
        }
    }

    // Controla la visibilidad del botón en la topbar
    function updateButtonVisibility() {
        const btn = document.getElementById('btn-configure-layout');
        if (!btn) return;

        // Dependemos únicamente de si el Manager de Muuri está inicializado
        const isFreeLayout = window.MuuriLayoutManager && typeof window.MuuriLayoutManager.isActive === 'function' && window.MuuriLayoutManager.isActive();

        btn.style.setProperty('display', isFreeLayout ? 'inline-flex' : 'none', 'important');
    }

    // Aplica el estado guardado al cargar la página
    function applySavedVisibility() {
        const settings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

        OPTIONAL_ITEMS.forEach(item => {
            const isVisible = settings[item.id] !== false; // Por defecto true
            const element = document.querySelector(`[data-container="${item.id}"]`);
            if (element) {
                element.style.display = isVisible ? 'block' : 'none';
            }
        });

        // Si Muuri está activo, actualizarlo
        if (window.MuuriLayoutManager && window.MuuriLayoutManager.isActive()) {
            window.MuuriLayoutManager.updateItems();
        }
    }

    function showConfigModal() {
        const settings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

        let html = '<div class="visibility-config-list">';
        OPTIONAL_ITEMS.forEach(item => {
            const isVisible = settings[item.id] !== false;
            html += `
                <div class="visibility-config-item" style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;">
                    <span>${item.label}</span>
                    <label class="switch">
                        <input type="checkbox" data-id="${item.id}" ${isVisible ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
            `;
        });
        html += '</div>';

        if (typeof ModalManager !== 'undefined') {
            const modal = ModalManager.createModal('visibilityModal', 'Configurar Visibilidad', html, [
                { text: 'Cancelar', class: 'btn-secondary', action: 'cancel' },
                {
                    text: 'Guardar Cambios',
                    class: 'btn-primary',
                    action: 'save',
                    onClick: () => {
                        saveVisibilitySettings();
                        ModalManager.closeModal(modal);
                    }
                }
            ]);
            ModalManager.openModal(modal);
        } else {
            console.error('no funciona');
            alert('error')
        }
    }

    function saveVisibilitySettings() {
        const settings = {};
        document.querySelectorAll('.visibility-config-list input').forEach(input => {
            settings[input.dataset.id] = input.checked;
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        applySavedVisibility();
    }

    return { init, updateButtonVisibility };
})();
window.LayoutVisibilityManager = LayoutVisibilityManager;

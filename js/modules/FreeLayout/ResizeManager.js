const ResizeManager = (() => {
    let isEditMode = false;
    const STORAGE_KEY = 'vmarks_resize_hint_seen';

    function init() {
        const btn = document.getElementById('btn-resize-layout');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleEditMode();
            });
        }
    }

    function deactivate() {
        if (!isEditMode) return;
        isEditMode = false;
        
        const btn = document.getElementById('btn-resize-layout');
        const dashboard = document.querySelector('main.dashboard');

        if (btn) btn.classList.remove('active');
        if (dashboard) dashboard.classList.remove('edit-mode');
        console.log('🛠️ Modo Edición: FINALIZADO');
    }

    function toggleEditMode() {
        const isFreeLayout = window.MuuriLayoutManager && window.MuuriLayoutManager.isActive();
        if (!isFreeLayout) {
            deactivate();
            return;
        }

        isEditMode = !isEditMode;
        
        const btn = document.getElementById('btn-resize-layout');
        const dashboard = document.querySelector('main.dashboard');

        if (isEditMode) {
            if (btn) btn.classList.add('active');
            if (dashboard) dashboard.classList.add('edit-mode');
            
            // Mostrar ayuda visual la primera vez
            if (!localStorage.getItem(STORAGE_KEY)) {
                showHelpOverlay();
            }
        } else {
            if (btn) btn.classList.remove('active');
            if (dashboard) dashboard.classList.remove('edit-mode');
        }

        console.log(`🛠️ Modo Edición: ${isEditMode ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }

    function showHelpOverlay() {
        const grid = document.getElementById('dashboardGrid');
        if (!grid) return;

        const overlay = document.createElement('div');
        overlay.className = 'resize-help-overlay';
        overlay.innerHTML = `
            <div class="resize-help-content">
                <div class="resize-help-icon">
                    <span class="icon-wrapper" data-svg="resize"></span>
                </div>
                <h3>Modo Edición Activo</h3>
                <p>Ahora puedes arrastrar las esquinas de los contenedores para ajustar su tamaño a la cuadrícula.</p>
                <small>(Mueve el ratón o haz clic para continuar)</small>
            </div>
        `;

        grid.appendChild(overlay);
        
        // Cargar el icono en el overlay
        if (window.SvgLoader) SvgLoader.loadAll();

        const removeOverlay = () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                localStorage.setItem(STORAGE_KEY, 'true');
            }, 300);
            window.removeEventListener('mousemove', removeOverlay);
            window.removeEventListener('click', removeOverlay);
        };

        // Quitar al primer movimiento o click
        setTimeout(() => {
            window.addEventListener('mousemove', removeOverlay, { once: true });
            window.addEventListener('click', removeOverlay, { once: true });
        }, 500);
    }
    return { init, deactivate, isEditMode: () => isEditMode };
})();
window.ResizeManager = ResizeManager;
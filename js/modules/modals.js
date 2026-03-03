const ModalManager = (() => {
    let currentModal = null;

    function createModal(id, title, content, actions = []) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = id;
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" aria-label="Cerrar">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${actions.length > 0 ? `
                    <div class="modal-footer">
                        ${actions.map(action => `
                            <button class="modal-btn ${action.class || ''}" data-action="${action.action}">
                                ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });

        // Action buttons
        actions.forEach(action => {
            if (action.onClick) {
                const btn = modal.querySelector(`[data-action="${action.action}"]`);
                if (btn) btn.addEventListener('click', action.onClick);
            }
        });

        return modal;
    }

    function openModal(modal) {
        if (currentModal) {
            currentModal.remove();
        }
        document.body.appendChild(modal);
        currentModal = modal;

        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) firstInput.focus();
        }, 100);

        // Escape key to close
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal(modal);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    function closeModal(modal) {
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                if (currentModal === modal) {
                    currentModal = null;
                }
            }, 200);
        }
    }

    // Modal templates
    function createBookmarkModal(bookmark = null, folderId = null, forceFavorite = false) {
        const isEdit = bookmark !== null;
        const isFavoriteChecked = forceFavorite || bookmark?.isFavorite ? 'checked' : '';
        const isFavoriteDisabled = forceFavorite ? 'disabled' : '';
        const favoriteText = forceFavorite ? '(automático - no se puede cambiar)' :
            (StateManager.getFavoritesCount() >= StateManager.getMaxFavorites() ?
                '(límite alcanzado: 16 máx.)' : '');

        const content = `
        <form id="bookmarkForm" class="modal-form">
            <div class="form-group">
                <label for="bookmarkUrl">URL *</label>
                <input type="url" id="bookmarkUrl" name="url" 
                       value="${bookmark?.url || ''}" 
                       placeholder="https://ejemplo.com" required>
            </div>
            <div class="form-group">
                <label for="bookmarkTitle">Título (opcional)</label>
                <input type="text" id="bookmarkTitle" name="title" 
                       value="${bookmark?.title || ''}" 
                       placeholder="Se obtendrá de la URL si se deja vacío">
                <small>Si se deja vacío, se usará el dominio de la URL</small>
            </div>
            ${folderId === null && !forceFavorite ? `
            <div class="form-group">
                <label for="bookmarkFolder">Carpeta</label>
                <select id="bookmarkFolder" name="folderId">
                    <option value="">Sin carpeta (solo en favoritos)</option>
                    ${StateManager.getFolders().map(f => `
                        <option value="${f.id}" ${bookmark?.folderId === f.id ? 'selected' : ''}>
                            ${f.icon} ${f.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            ` : folderId === null ? `
            <input type="hidden" name="folderId" value="">
            <div class="form-group">
                <small>Este marcador se guardará solo en favoritos</small>
            </div>
            ` : `<input type="hidden" name="folderId" value="${folderId}">`}
            <div class="form-group checkbox">
                <label>
                    <input type="checkbox" id="bookmarkFavorite" name="isFavorite" 
                           ${isFavoriteChecked} ${isFavoriteDisabled}>
                    Marcar como favorito ${favoriteText}
                </label>
                ${!forceFavorite && StateManager.getFavoritesCount() >= StateManager.getMaxFavorites() ?
                '<small style="color: #e53e3e; margin-top: 4px; display: block;">Límite de 16 favoritos alcanzado</small>' : ''}
            </div>
        </form>
    `;

        const actions = [
            {
                text: 'Cancelar',
                class: 'btn-secondary',
                action: 'cancel'
            },
            {
                text: isEdit ? 'Guardar' : 'Crear',
                class: 'btn-primary',
                action: 'save'
            }
        ];

        const modal = createModal(
            'bookmarkModal',
            isEdit ? 'Editar Marcador' : 'Nuevo Marcador',
            content,
            actions
        );

        return modal;
    }

    function createFolderModal(folder = null) {
        const isEdit = folder !== null;
        const content = `
            <form id="folderForm" class="modal-form">
                <div class="form-group">
                    <label for="folderName">Nombre *</label>
                    <input type="text" id="folderName" name="name" 
                           value="${folder?.name || ''}" 
                           placeholder="Nombre de la carpeta" required>
                </div>
                <div class="form-group">
                    <label for="folderIcon">Icono</label>
                    <div class="icon-picker">
                        ${['📁', '📂', '🗂️', '📦', '🗃️', '💼', '🎯', '⭐', '🔖', '📌'].map(icon => `
                            <button type="button" class="icon-option ${folder?.icon === icon ? 'selected' : ''}" 
                                    data-icon="${icon}">${icon}</button>
                        `).join('')}
                    </div>
                    <input type="hidden" id="folderIcon" name="icon" value="${folder?.icon || '📁'}">
                </div>
            </form>
        `;

        const actions = [
            {
                text: 'Cancelar',
                class: 'btn-secondary',
                action: 'cancel'
            },
            {
                text: isEdit ? 'Guardar' : 'Crear',
                class: 'btn-primary',
                action: 'save'
            }
        ];

        const modal = createModal(
            'folderModal',
            isEdit ? 'Editar Carpeta' : 'Nueva Carpeta',
            content,
            actions
        );

        // Icon picker functionality
        setTimeout(() => {
            modal.querySelectorAll('.icon-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    modal.querySelector('#folderIcon').value = btn.dataset.icon;
                });
            });
        }, 100);

        return modal;
    }

    function createConfirmModal(title, message, onConfirm) {
        const content = `<p>${message}</p>`;

        const actions = [
            {
                text: 'Cancelar',
                class: 'btn-secondary',
                action: 'cancel'
            },
            {
                text: 'Eliminar',
                class: 'btn-danger',
                action: 'confirm',
                onClick: onConfirm
            }
        ];

        const modal = createModal('confirmModal', title, content, actions);
        return modal;
    }

    return {
        createModal,
        openModal,
        closeModal,
        createBookmarkModal,
        createFolderModal,
        createConfirmModal
    };
})();
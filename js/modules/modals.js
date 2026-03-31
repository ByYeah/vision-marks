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

        // Event listeners base
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modal));
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });

        // Action buttons - Si no hay onClick, por defecto cerrar para "cancel"
        actions.forEach(action => {
            const btn = modal.querySelector(`[data-action="${action.action}"]`);
            if (btn) {
                if (action.onClick) {
                    btn.addEventListener('click', action.onClick);
                } else if (action.action === 'cancel' || action.action === 'close') {
                    // Por defecto, el botón cancelar cierra la modal
                    btn.addEventListener('click', () => closeModal(modal));
                }
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

        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) firstInput.focus();
        }, 100);

        // Manejador de inputs (esc & enter)
        const handleKeyDown = (e) => {
            if (!currentModal || currentModal !== modal) return;

            if (e.key === 'Escape') {
                closeModal(modal);
            } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                const primaryBtn = modal.querySelector('.btn-primary');
                if (primaryBtn) primaryBtn.click();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        modal._cleanup = () => document.removeEventListener('keydown', handleKeyDown);
    }

    function closeModal(modal) {
        if (modal) {
            // Limpiar event listeners
            if (modal._cleanup) {
                modal._cleanup();
            }

            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                if (currentModal === modal) {
                    currentModal = null;
                }
            }, 200);
        }
    }

    // Modal tipo: Bookmark
    function createBookmarkModal(bookmark = null, folderId = null, forceFavorite = false) {
        const isEdit = bookmark !== null;
        const isFavoriteChecked = forceFavorite || bookmark?.isFavorite ? 'checked' : '';
        const isFavoriteDisabled = forceFavorite ? 'disabled' : '';
        const favoriteText = forceFavorite ? '(automático)' :
            (StateManager.getFavoritesCount() >= StateManager.getMaxFavorites() ? '(límite: 32)' : '');

        const content = `
            <form id="bookmarkForm" class="modal-form" novalidate>
                <div class="form-group" id="url-group">
                    <label for="bookmarkUrl">URL *</label>
                    <input type="url" id="bookmarkUrl" name="url"
                        value="${bookmark?.url || ''}" 
                        placeholder="https://ejemplo.com" required>
                    <div class="error-message" id="url-error" style="display:none; color:#fc8181; font-size:0.85rem; margin-top:4px;"></div>
                </div>
                <div class="form-group">
                    <label for="bookmarkTitle">Título (opcional)</label>
                    <input type="text" id="bookmarkTitle" name="title" 
                        value="${bookmark?.title || ''}" 
                        placeholder="Se usará el dominio si se deja vacío">
                </div>
                ${folderId === null && !forceFavorite ? `
                <div class="form-group">
                    <label for="bookmarkFolder">Carpeta</label>
                    <select id="bookmarkFolder" name="folderId">
                        <option value="">Sin carpeta (solo favoritos)</option>
                        ${StateManager.getFolders().map(f => `
                            <option value="${f.id}" ${bookmark?.folderId === f.id ? 'selected' : ''}>
                                ${f.icon} ${f.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                ` : folderId === null ? `
                <input type="hidden" name="folderId" value="">
                <div class="form-group"><small>Solo en favoritos</small></div>
                ` : `<input type="hidden" name="folderId" value="${folderId}">`}
                <div class="form-group checkbox">
                    <label>
                        <input type="checkbox" id="bookmarkFavorite" name="isFavorite" 
                            ${isFavoriteChecked} ${isFavoriteDisabled}>
                        Favorito ${favoriteText}
                    </label>
                </div>
            </form>
        `;

        const actions = [
            { text: 'Cancelar', class: 'btn-secondary', action: 'cancel' },
            { text: isEdit ? 'Guardar' : 'Crear', class: 'btn-primary', action: 'save' }
        ];

        const modal = createModal('bookmarkModal', isEdit ? 'Editar Marcador' : 'Nuevo Marcador', content, actions);

        setTimeout(() => {
            const form = modal.querySelector('#bookmarkForm');
            const urlInput = modal.querySelector('#bookmarkUrl');
            const urlError = modal.querySelector('#url-error');
            const urlGroup = modal.querySelector('#url-group');

            function showUrlError(message) {
                urlError.textContent = message;
                urlError.style.display = 'block';
                urlGroup.classList.add('has-error');
                urlInput.style.borderColor = '#fc8181';
                urlInput.focus();
            }

            function clearUrlError() {
                urlError.style.display = 'none';
                urlGroup.classList.remove('has-error');
                urlInput.style.borderColor = '';
            }

            urlInput.addEventListener('input', clearUrlError);

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                clearUrlError();

                if (!urlInput.value.trim()) {
                    showUrlError('La URL es requerida');
                    return;
                }

                // Validar formato de URL
                try {
                    new URL(urlInput.value.trim());
                } catch {
                    showUrlError('Por favor ingresa una URL válida (incluye http:// o https://)');
                    return;
                }

                // Recoger datos
                const data = {
                    url: urlInput.value.trim(),
                    title: form.querySelector('#bookmarkTitle').value.trim(),
                    folderId: form.querySelector('#bookmarkFolder')?.value || folderId || null,
                    isFavorite: form.querySelector('#bookmarkFavorite')?.checked || false
                };

                // Delegar en el manager correspondiente
                if (isEdit) {
                    BookmarksManager.updateBookmark(bookmark.id, data);
                } else {
                    BookmarksManager.createBookmark(data);
                }
                closeModal(modal);
            });
            const saveBtn = modal.querySelector('[data-action="save"]');
            saveBtn.addEventListener('click', () => {
                form.dispatchEvent(new Event('submit', { cancelable: true }));
            });
        }, 100);
        return modal;
    }

    // Modal tipo: Folder
    function createFolderModal(folder = null) {
        const isEdit = folder !== null;

        // Obtener iconos personalizados de IconManager
        let customIconsHTML = '';
        if (window.IconManager) {
            const customIcons = IconManager.getCustomIcons();
            customIconsHTML = customIcons.map(icon => `
            <button type="button" class="icon-option custom-icon-option ${folder?.iconType === 'custom' && folder?.iconId === icon.id ? 'selected' : ''}" 
                    data-icon-type="custom" data-icon-id="${icon.id}">
                ${IconManager.getIconPreview(icon)}
            </button>
        `).join('');
        }

        // Determinar el icono seleccionado actualmente
        let selectedEmoji = '';
        if (folder && folder.iconType !== 'custom') {
            selectedEmoji = folder.icon || '📁';
        }

        const content = `
        <form id="folderForm" class="modal-form" novalidate>
            <div class="form-group" id="name-group">
                <label for="folderName">Nombre *</label>
                <input type="text" id="folderName" name="name" 
                    value="${escapeHtml(folder?.name || '')}" required>
                <div class="error-message" id="name-error" style="display:none;"></div>
            </div>
            <div class="form-group">
                <label>Icono</label>
                <div class="icon-picker-section">
                    <h4>Emojis</h4>
                    <div class="icon-picker">
                        ${['📁', '📂', '🗂️', '📦', '🗃️', '💼', '🎯', '⭐', '🔖', '📌'].map(icon => `
                            <button type="button" class="icon-option ${folder?.iconType !== 'custom' && folder?.icon === icon ? 'selected' : ''}" 
                                    data-icon-type="emoji" data-icon-value="${icon}">${icon}</button>
                        `).join('')}
                    </div>
                    ${customIconsHTML ? `
                        <h4 style="margin-top:1rem;">Personalizados</h4>
                        <div class="icon-picker custom-icons-picker">
                            ${customIconsHTML}
                        </div>
                    ` : ''}
                </div>
                <input type="hidden" id="folderIcon" name="icon" value="${folder?.iconType !== 'custom' ? (folder?.icon || '📁') : ''}">
                <input type="hidden" id="folderIconType" name="iconType" value="${folder?.iconType || 'emoji'}">
                <input type="hidden" id="folderIconId" name="iconId" value="${folder?.iconId || ''}">
            </div>
        </form>
    `;

        const actions = [
            { text: 'Cancelar', class: 'btn-secondary', action: 'cancel' },
            { text: isEdit ? 'Guardar' : 'Crear', class: 'btn-primary', action: 'save' }
        ];

        const modal = createModal('folderModal', isEdit ? 'Editar Carpeta' : 'Nueva Carpeta', content, actions);

        setTimeout(() => {
            // Manejador para iconos emoji
            modal.querySelectorAll('.icon-picker .icon-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    modal.querySelector('#folderIcon').value = btn.dataset.iconValue;
                    modal.querySelector('#folderIconType').value = 'emoji';
                    modal.querySelector('#folderIconId').value = '';
                });
            });

            // Manejador para iconos personalizados
            modal.querySelectorAll('.custom-icons-picker .icon-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    modal.querySelector('#folderIcon').value = '';
                    modal.querySelector('#folderIconType').value = 'custom';
                    modal.querySelector('#folderIconId').value = btn.dataset.iconId;
                });
            });

            const form = modal.querySelector('#folderForm');
            const nameInput = modal.querySelector('#folderName');
            const nameError = modal.querySelector('#name-error');
            const nameGroup = modal.querySelector('#name-group');

            function showNameError(message) {
                nameError.textContent = message;
                nameError.style.display = 'block';
                nameGroup.classList.add('has-error');
                nameInput.style.borderColor = '#fc8181';
                nameInput.focus();
            }

            function clearNameError() {
                nameError.style.display = 'none';
                nameGroup.classList.remove('has-error');
                nameInput.style.borderColor = '';
            }

            nameInput.addEventListener('input', clearNameError);

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                clearNameError();

                if (!nameInput.value.trim()) {
                    showNameError('El nombre es requerido');
                    return;
                }

                const data = {
                    name: nameInput.value.trim(),
                    icon: modal.querySelector('#folderIcon').value,
                    iconType: modal.querySelector('#folderIconType').value,
                    iconId: modal.querySelector('#folderIconId').value || null
                };

                if (isEdit) {
                    FoldersManager.updateFolder(folder.id, data);
                } else {
                    FoldersManager.createFolder(data);
                }
                closeModal(modal);
            });

            const saveBtn = modal.querySelector('[data-action="save"]');
            saveBtn.addEventListener('click', () => {
                form.dispatchEvent(new Event('submit', { cancelable: true }));
            });
        }, 100);
        return modal;
    }

    // Función auxiliar escapeHtml
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Modal tipo: Confirmación
    function createConfirmModal(title, message, onConfirm) {
        const actions = [
            {
                text: 'Cancelar', class: 'btn-secondary', action: 'cancel', onClick: (e) => {
                    const modal = e.target.closest('.modal-overlay');
                    if (modal) closeModal(modal);
                }
            },
            { text: 'Eliminar', class: 'btn-danger', action: 'confirm', onClick: onConfirm }
        ];
        const modal = createModal('confirmModal', title, `<p>${message}</p>`, actions);

        setTimeout(() => {
            const confirmBtn = modal.querySelector('[data-action="confirm"]');
            // Aseguramos que el botón de confirmar tenga clase btn-primary
            if (confirmBtn) {
                confirmBtn.classList.add('btn-primary');
            }
        }, 100);
        return modal;
    }

    // Modal tipo: Settings
    function createSettingsModal() {
        const currentSettings = SettingsManager.getSettings();

        const content = `
        <div class="settings-container">
            <div class="settings-sidebar">
                <button class="settings-menu-item active" data-section="layouts">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="3" y1="9" x2="21" y2="9"/>
                        <line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    Layouts
                </button>
                <!-- Temas -->
                <button class="settings-menu-item" data-section="themes">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path fill-rule="nonzero" d="M3.839 5.857c2.941-3.915 9.03-5.054 13.364-2.36 4.28 2.661 5.854 7.777 4.1 12.578-1.654 4.532-6.015 6.328-9.159 4.048-1.177-.854-1.634-1.925-1.854-3.664l-.106-.988-.045-.397c-.123-.934-.311-1.353-.704-1.572-.536-.298-.893-.305-1.596-.033l-.351.146-.179.078c-1.014.44-1.688.595-2.541.416l-.2-.047-.164-.047c-2.789-.864-3.202-4.647-.565-8.158m.984 6.717.123.036.134.031c.44.087.814.015 1.437-.242l.602-.257c1.202-.493 1.986-.541 3.046.05.917.511 1.275 1.298 1.457 2.66l.054.459.054.532.047.422c.172 1.361.485 2.09 1.248 2.644 2.275 1.65 5.534.308 6.87-3.349 1.516-4.152.174-8.514-3.484-10.789-3.674-2.284-8.899-1.307-11.373 1.987-2.074 2.763-1.82 5.28-.215 5.816m11.225-1.994a1.25 1.25 0 1 1 2.415-.647 1.25 1.25 0 0 1-2.415.647m.494 3.488a1.25 1.25 0 1 1 2.415-.647 1.25 1.25 0 0 1-2.415.647M14.07 7.577a1.25 1.25 0 1 1 2.415-.647 1.25 1.25 0 0 1-2.415.647m-.028 8.998a1.25 1.25 0 1 1 2.415-.647 1.25 1.25 0 0 1-2.415.647m-3.497-9.97a1.25 1.25 0 1 1 2.415-.647 1.25 1.25 0 0 1-2.415.647"/>
                    </svg>
                    Temas
                </button>
                <!-- Contenedores -->
                <button class="settings-menu-item" data-section="containers">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path fill-rule="nonzero" d="M18.251 2.498a3.25 3.25 0 0 1 3.245 3.066l.005.184v12.004a3.25 3.25 0 0 1-3.25 3.25h-12a3.25 3.25 0 0 1-3.246-3.066L3 17.752V5.748a3.25 3.25 0 0 1 3.25-3.25zm-6.751 7-7 .001v8.253l.007.16a1.75 1.75 0 0 0 1.743 1.59h5.25zm8.5 6-7 .001v4.002h5.25a1.75 1.75 0 0 0 1.75-1.75zm-1.749-11.5H13v10.001h7l.001-8.25-.007-.162a1.75 1.75 0 0 0-1.743-1.589m-6.751 0H6.25l-.143.006a1.75 1.75 0 0 0-1.606 1.744L4.5 8h7z"/>
                    </svg>
                    Contenedores
                </button>
                <!-- Colores -->
                <button class="settings-menu-item" data-section="colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M5.75 2a.75.75 0 0 0-.75.75v11.5a2.25 2.25 0 0 0 2.25 2.25H9.5v3a2.5 2.5 0 0 0 5 0v-3h2.25A2.25 2.25 0 0 0 19 14.25V2.75a.75.75 0 0 0-.75-.75zm.75 9V3.5h6v1.752a.75.75 0 0 0 1.5 0V3.5h1v2.751a.75.75 0 0 0 1.5 0V3.5h1V11zm0 3.25V12.5h11v1.75a.75.75 0 0 1-.75.75h-3a.75.75 0 0 0-.75.75v3.75a1 1 0 1 1-2 0v-3.75a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 1-.75-.75"/>
                    </svg>
                    Colores
                </button>
                <!-- Tipografía -->
                <button class="settings-menu-item" data-section="typography">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <polyline points="4 7 4 4 20 4 20 7"/>
                        <line x1="9" y1="20" x2="15" y2="20"/>
                        <line x1="12" y1="4" x2="12" y2="20"/>
                    </svg>
                    Tipografía
                </button>
                <div class="settings-sidebar-divider"></div>
                <!-- Iconos carpetas -->
                <button class="settings-menu-item" data-section="customicons">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path fill="none" stroke="currentColor" stroke-width="1.5" d="M17.75 3A3.25 3.25 0 0 1 21 6.25v6.879a2.25 2.25 0 0 1-.659 1.59l-5.621 5.622a2.25 2.25 0 0 1-1.591.659H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3zm0 1.5H6.25A1.75 1.75 0 0 0 4.5 6.25v11.5c0 .966.784 1.75 1.75 1.75H13v-3.064a7 7 0 0 1-.673.066L12 16.51a6.33 6.33 0 0 1-3.678-1.14.75.75 0 1 1 .854-1.234c.844.584 1.78.874 2.824.874q.693 0 1.324-.171a3.25 3.25 0 0 1 2.713-1.832l.213-.007H19.5V6.25a1.75 1.75 0 0 0-1.75-1.75m.689 10h-2.188c-.918 0-1.671.707-1.744 1.607l-.006.143-.001 2.189zM9 7.751a1.25 1.25 0 1 1 0 2.499A1.25 1.25 0 0 1 9 7.75m6 0a1.25 1.25 0 1 1 0 2.499 1.25 1.25 0 0 1 0-2.499"/>
                    </svg>
                    Iconos personalizados
                </button>
                <!-- Importar/Exportar -->
                <button class="settings-menu-item" data-section="importexport">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" d="M19 7H5m15 10H5M16 3l3.293 3.293a1 1 0 0 1 0 1.414L16 11M8 13l-3.293 3.293a1 1 0 0 0 0 1.414L8 21"/>
                    </svg>
                    Importar/Exportar
                </button>
                <div class="settings-sidebar-divider"></div>
                    <!-- Acerca de -->
                    <button class="settings-menu-item" data-section="about">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path fill-rule="nonzero" d="M12 17.002a2.501 2.501 0 1 1 0 5.002A2.501 2.501 0 0 1 12 17m0 1.5a1.001 1.001 0 1 0 0 2.002 1.001 1.001 0 0 0 0-2.003m-.001-16.5a3.875 3.875 0 0 1 3.875 3.876c0 2.833-.99 6.554-1.535 8.398a2.43 2.43 0 0 1-2.338 1.728A2.43 2.43 0 0 1 9.66 14.27l-.223-.777c-.554-1.995-1.313-5.163-1.313-7.616a3.875 3.875 0 0 1 3.875-3.876m0 1.5a2.375 2.375 0 0 0-2.375 2.376c0 2.561.927 6.108 1.475 7.97a.93.93 0 0 0 .902.656c.427 0 .786-.27.9-.654l.157-.544c.55-1.94 1.316-5.072 1.316-7.428A2.375 2.375 0 0 0 12 3.502"/>
                        </svg>
                        Acerca de
                    </button>
            </div>
            <div class="settings-content">
                <!-- Layouts -->
                <div class="settings-section active" id="section-layouts">
                <h3>Layouts</h3>
                <p>Diseño de la interfaz</p>
                <div class="layouts-grid">
                    <!-- Layout Doble: 3 columnas (Fav | Folders+InFolder | Chat) -->
                    <div class="layout-option ${currentSettings.layout === 'double' ? 'active' : ''}" data-layout="double">
                        <div class="layout-preview layout-double">
                            <div class="layout-preview-item" title="Favoritos"></div>
                            <div class="layout-preview-item" title="Carpetas"></div>
                            <div class="layout-preview-item" title="Contenido"></div>
                            <div class="layout-preview-item" title="Chat"></div>
                        </div>
                        <div class="layout-name">Doble</div>
                        <div class="layout-desc">3 columnas</div>
                    </div>
                    
                    <!-- Layout Extendido: 2 columnas (Fav | Folders+InFolder) -->
                    <div class="layout-option ${currentSettings.layout === 'extended' ? 'active' : ''}" data-layout="extended">
                        <div class="layout-preview layout-extended">
                            <div class="layout-preview-item" title="Favoritos"></div>
                            <div class="layout-preview-item" title="Carpetas"></div>
                            <div class="layout-preview-item" title="Contenido"></div>
                        </div>
                        <div class="layout-name">Extendido</div>
                        <div class="layout-desc">2 columnas</div>
                    </div>
                    
                    <!-- Layout Widgets: 3 columnas (Fav | Folders+InFolder | Widget+Widget) -->
                    <div class="layout-option ${currentSettings.layout === 'widgets' ? 'active' : ''}" data-layout="widgets">
                        <div class="layout-preview layout-widgets">
                            <div class="layout-preview-item" title="Favoritos"></div>
                            <div class="layout-preview-item" title="Carpetas"></div>
                            <div class="layout-preview-item" title="Contenido"></div>
                            <div class="layout-preview-item" title="Widget 1"></div>
                            <div class="layout-preview-item" title="Widget 2"></div>
                        </div>
                        <div class="layout-name">Widgets</div>
                        <div class="layout-desc">Doble con 2 widgets</div>
                    </div>
                    
                    <!-- Layout Libre: Bento Box 4x4 -->
                    <div class="layout-option ${currentSettings.layout === 'free' ? 'active' : ''}" data-layout="free">
                        <div class="layout-preview layout-free">
                            <div class="layout-preview-item" title="Favoritos"></div>
                            <div class="layout-preview-item" title="Carpetas"></div>
                            <div class="layout-preview-item" title="Contenido"></div>
                            <div class="layout-preview-item" title="Chat"></div>
                            <div class="layout-preview-item" title="Widget 1"></div>
                            <div class="layout-preview-item" title="Widget 2"></div>
                        </div>
                        <div class="layout-name">Libre</div>
                        <div class="layout-desc">Bento box libre</div>
                    </div>
                </div>
            </div>

                <!-- Temas -->
                <div class="settings-section" id="section-themes">
                    <h3>Temas</h3>
                    <p>Tema de color</p>
                    <div class="theme-options">
                        <div class="theme-option ${currentSettings.theme === 'light' ? 'active' : ''}" data-theme="light">
                            <div class="theme-preview light"></div><div class="layout-name">Claro</div>
                        </div>
                        <div class="theme-option ${currentSettings.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                            <div class="theme-preview dark"></div><div class="layout-name">Oscuro</div>
                        </div>
                        <div class="theme-option ${currentSettings.theme === 'amoled' ? 'active' : ''}" data-theme="amoled">
                            <div class="theme-preview amoled"></div><div class="layout-name">AMOLED</div>
                        </div>
                        <div class="theme-option ${currentSettings.theme === 'auto' ? 'active' : ''}" data-theme="auto">
                            <div class="theme-preview auto"></div><div class="layout-name">Auto</div>
                        </div>
                        <div class="theme-option ${currentSettings.theme === 'custom' ? 'active' : ''}" data-theme="custom">
                            <div class="theme-preview custom"></div><div class="layout-name">Personalizado</div>
                        </div>
                    </div>

                    <div id="customColorsNotice" style="margin-top:var(--spacing-md);padding:var(--spacing-sm);background:var(--bg-tertiary);border-radius:var(--border-radius-sm);font-size:0.85rem;color:var(--text-secondary);display:none">
                        💡 Los colores personalizados solo se aplican en el tema <strong>Personalizado</strong>.
                    </div>
                </div>

                <!-- Tipografía -->
                <div class="settings-section" id="section-typography">
                    <h3>Tipografía</h3>
                    <p>Fuente de la interfaz</p>
                    <div class="font-options">
                        <div class="font-option ${currentSettings.fontFamily === 'Montserrat' ? 'active' : ''}" data-font="Montserrat">
                            <div class="font-preview" style="font-family:'Montserrat'">Montserrat</div>
                            <div class="layout-desc">Actual</div>
                        </div>
                        <div class="font-option ${currentSettings.fontFamily === 'Inter' ? 'active' : ''}" data-font="Inter">
                            <div class="font-preview" style="font-family:'Inter'">Inter</div>
                            <div class="layout-desc">Moderna</div>
                        </div>
                        <div class="font-option ${currentSettings.fontFamily === 'Roboto' ? 'active' : ''}" data-font="Roboto">
                            <div class="font-preview" style="font-family:'Roboto'">Roboto</div>
                            <div class="layout-desc">Clásica</div>
                        </div>
                        <div class="font-option ${currentSettings.fontFamily === 'Open Sans' ? 'active' : ''}" data-font="Open Sans">
                            <div class="font-preview" style="font-family:'Open Sans'">Open Sans</div>
                            <div class="layout-desc">Legible</div>
                        </div>
                        <div class="font-option ${currentSettings.fontFamily === 'Lato' ? 'active' : ''}" data-font="Lato">
                            <div class="font-preview" style="font-family:'Lato'">Lato</div>
                            <div class="layout-desc">Elegante</div>
                        </div>
                    </div>
                </div>

                <!-- Display -->
                <div class="settings-section" id="section-containers">
                    <h3>Contenedores</h3>
                    <p>Modo de visualización</p>
                    <div class="display-options">
                        <div class="display-option-group">
                            <h4>Favoritos</h4>
                            <div class="display-mode-selector">
                                <button class="display-mode-btn ${currentSettings.containers.favbookmarks.display === 'list' ? 'active' : ''}" data-container="favbookmarks" data-mode="list">Lista</button>
                                <button class="display-mode-btn ${currentSettings.containers.favbookmarks.display === 'grid-8' ? 'active' : ''}" data-container="favbookmarks" data-mode="grid-8">Grid</button>
                            </div>
                        </div>
                        <div class="display-option-group">
                            <h4>Carpetas</h4>
                            <div class="display-mode-selector">
                                <button class="display-mode-btn ${currentSettings.containers.folders.display === 'grid' ? 'active' : ''}" data-container="folders" data-mode="grid">Grid</button>
                                <button class="display-mode-btn ${currentSettings.containers.folders.display === 'list' ? 'active' : ''}" data-container="folders" data-mode="list">Lista</button>
                            </div>
                        </div>
                    </div>
                </div>

                 <!-- Iconos personalizados -->
                <div class="settings-section" id="section-customicons">
                    <h3>Iconos personalizados</h3>
                    <p>Sube tus propios iconos SVG para las carpetas</p>
                    
                    <div class="custom-icons-manager">
                        <!-- Área de subida -->
                        <div class="upload-icon-area">
                            <div class="upload-icon-box">
                                <input type="file" id="uploadCustomIcon" accept=".svg" style="display:none">
                                <button class="btn-upload-icon" id="btnUploadIcon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 3v12m0 0-3-3m3 3 3-3M5 21h14"/>
                                    </svg>
                                    Subir icono SVG
                                </button>
                                <button class="btn-select-multiple" id="btnSelectMultiple">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polygon points="3 6 21 6 19 18 5 18 3 6"/>
                                        <line x1="8" y1="6" x2="16" y2="6"/>
                                        <line x1="10" y1="10" x2="14" y2="10"/>
                                    </svg>
                                    Seleccionar múltiples
                                </button>
                            </div>
                            <p class="upload-info">Máximo ${window.IconManager ? IconManager.MAX_CUSTOM_ICONS : 30} iconos</p>
                        </div>
                        
                        <!-- Lista de iconos personalizados -->
                        <div class="custom-icons-list" id="customIconsList">
                            <div class="loading-icons">Cargando iconos...</div>
                        </div>
                        
                        <!-- Modo de selección múltiple -->
                        <div class="icons-bulk-actions" id="iconsBulkActions" style="display:none;">
                            <button class="btn-delete-selected" id="btnDeleteSelectedIcons">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                                Eliminar seleccionados
                            </button>
                            <button class="btn-cancel-selection" id="btnCancelSelection">Cancelar</button>
                        </div>
                    </div>
                </div>

                 <!-- Import/Export -->
                <div class="settings-section" id="section-importexport">
                    <h3>Importar / Exportar</h3>
                    <p>Respaldar o restaurar tus marcadores</p>
                    <div style="display:flex;flex-direction:column;gap:var(--spacing-lg);padding:var(--spacing-md) 0">
                        <!-- Exportar -->
                        <div class="importexport-card">
                            <div class="importexport-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M5.552 20.968a2.577 2.577 0 0 1-2.5-2.73c-.012-2.153 0-4.306 0-6.459a.5.5 0 0 1 1 0c0 2.2-.032 4.4 0 6.6.016 1.107.848 1.589 1.838 1.589h12.463A1.55 1.55 0 0 0 19.825 19a3 3 0 0 0 .1-1.061v-6.16a.5.5 0 0 1 1 0c0 2.224.085 4.465 0 6.687a2.567 2.567 0 0 1-2.67 2.5Z"/>
                                    <path d="M12.337 3.176a.46.46 0 0 0-.311-.138q-.021.002-.043-.006c-.022-.008-.027 0-.041.006a.46.46 0 0 0-.312.138L7.961 6.845a.5.5 0 0 0 .707.707l2.816-2.815v10.742a.5.5 0 0 0 1 0V4.737L15.3 7.552a.5.5 0 0 0 .707-.707Z"/>
                                </svg>
                            </div>
                            <div class="importexport-info">
                                <h4>Exportar marcadores</h4>
                                <p>Guarda todos tus marcadores y carpetas</p>
                                <div class="export-format-selector">
                                    <button class="export-format-btn active" data-format="json">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14">
                                            <path d="M4 4h16v16H4zM4 8h16M8 4v16"/>
                                        </svg>
                                        JSON (Vision Marks)
                                    </button>
                                    <button class="export-format-btn" data-format="html">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14">
                                            <circle cx="12" cy="12" r="10"/>
                                            <line x1="2" y1="12" x2="22" y2="12"/>
                                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                        </svg>
                                        HTML (Navegador)
                                    </button>
                                </div>
                            </div>
                            <button class="btn-export-action" id="btnExportData">
                                Exportar
                            </button>
                        </div>
                        
                        <!-- Importar -->
                        <div class="importexport-card">
                            <div class="importexport-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M5.552 20.968a2.577 2.577 0 0 1-2.5-2.73c-.012-2.153 0-4.306 0-6.459a.5.5 0 0 1 1 0c0 2.2-.032 4.4 0 6.6.016 1.107.848 1.589 1.838 1.589h12.463A1.55 1.55 0 0 0 19.825 19a3 3 0 0 0 .1-1.061v-6.16a.5.5 0 0 1 1 0c0 2.224.085 4.465 0 6.687a2.567 2.567 0 0 1-2.67 2.5Z"/>
                                    <path d="M11.63 15.818a.46.46 0 0 0 .312.138c.014 0 .027.005.042.006s.027 0 .041-.006a.46.46 0 0 0 .312-.138l3.669-3.669a.5.5 0 0 0-.707-.707l-2.815 2.815V3.515a.5.5 0 0 0-1 0v10.742l-2.816-2.815a.5.5 0 0 0-.707.707Z"/>
                                </svg>
                            </div>
                            <div class="importexport-info">
                                <h4>Importar marcadores</h4>
                                <p>Restaura desde un archivo JSON de Vision Marks o importa desde navegador</p>
                            </div>
                            <button class="btn-import-action" id="btnImportData">
                                Importar
                            </button>
                        </div>
                    </div>
                    
                    <!-- Info adicional -->
                    <div class="importexport-note">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        <span>Formato soportado: JSON de Vision Marks, HTML de marcadores (Chrome/Firefox/Edge)</span>
                    </div>
                </div>

                <!--"Acerca de" -->
                <div class="settings-section" id="section-about">
                    <h3>Acerca de Vision Marks</h3>
                    <p>Gestor ligero de marcadores web</p>
                    
                    <div style="display:flex;flex-direction:column;gap:var(--spacing-md);padding:var(--spacing-md);background:var(--bg-tertiary);border-radius:var(--border-radius)">
                        <!-- Versión -->
                        <div>
                            <strong style="color:var(--text-primary)">Versión</strong>
                            <p style="color:var(--text-secondary);margin:4px 0 0 0">1.0.0 (Fase 1)</p>
                        </div>
                        
                        <!-- Creador -->
                        <div>
                            <strong style="color:var(--text-primary)">Creador</strong>
                            <p style="color:var(--text-secondary);margin:4px 0 0 0">ByYeah</p>
                        </div>
                        
                        <!-- Repo GitHub - enlace más grande -->
                        <div>
                            <strong style="color:var(--text-primary)">Repositorio</strong>
                            <p style="margin:4px 0 0 0">
                                <a href="https://github.com/ByYeah/vision-marks" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                class="repo-link"
                                style="color:var(--primary-color);text-decoration:none;font-size:1.05rem;display:inline-flex;align-items:center;gap:6px">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                    github.com/ByYeah/vision-marks
                                </a>
                            </p>
                        </div>
                        
                        <!-- Botón Reportar bug - más grande, sin subrayado -->
                        <div style="margin-top:var(--spacing-sm)">
                            <a href="https://github.com/ByYeah/vision-marks/issues" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            class="btn-report-bug"
                            style="display:inline-flex;align-items:center;gap:8px;padding:0.65rem 1.25rem;font-size:0.95rem;background:var(--primary-color);color:white;border:none;border-radius:var(--border-radius-sm);cursor:pointer;text-decoration:none;transition:all var(--transition-fast)">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M10.5 2.751a.75.75 0 0 0-1.5 0v.752c0 .633.196 1.22.53 1.703A3.75 3.75 0 0 0 7.01 8.49h-.257a2.25 2.25 0 0 1-2.24-2.259l.006-1.486a.75.75 0 1 0-1.5-.006l-.007 1.486A3.75 3.75 0 0 0 6.747 9.99H7v1.51H2.75a.75.75 0 0 0 0 1.5H7v1.992h-.253a3.75 3.75 0 0 0-3.735 3.766l.007 1.485a.75.75 0 0 0 1.5-.006l-.007-1.485a2.25 2.25 0 0 1 2.241-2.26h.473a5.002 5.002 0 0 0 9.548 0h.473a2.25 2.25 0 0 1 2.24 2.26l-.006 1.485a.75.75 0 0 0 1.5.006l.006-1.485a3.75 3.75 0 0 0-3.734-3.766H17V13h4.251a.75.75 0 0 0 0-1.5H17V9.99h.253a3.75 3.75 0 0 0 3.735-3.765l-.007-1.486a.75.75 0 1 0-1.5.006l.006 1.486a2.25 2.25 0 0 1-2.24 2.26h-.256a3.75 3.75 0 0 0-2.52-3.285c.333-.483.529-1.07.529-1.703v-.752a.75.75 0 0 0-1.5 0v.752a1.5 1.5 0 0 1-3 0zm-2 6.002a2.25 2.25 0 0 1 2.25-2.25h2.5a2.25 2.25 0 0 1 2.25 2.25v6.248a3.5 3.5 0 1 1-7 0z"/>
                                </svg>
                                Reportar un bug
                            </a>
                        </div>
                    </div>
                    
                    <!-- Footer con copyright -->
                    <div style="margin-top:auto;padding-top:var(--spacing-md);border-top:1px solid var(--border-color);text-align:center;color:var(--text-muted);font-size:0.85rem">
                        <p>© 2026 Vision Marks. Proyecto de código abierto.</p>
                    </div>
                </div>

                <!-- Colors -->
                <div class="settings-section" id="section-colors">
                    <h3>Colores</h3>
                    <p>Personaliza por contenedor</p>
                    
                    <!-- AVISO: Solo en custom -->
                    <div id="customColorsNotice" style="margin-bottom:var(--spacing-md);padding:var(--spacing-sm);background:var(--bg-tertiary);border-radius:var(--border-radius-sm);font-size:0.85rem;color:var(--text-secondary);display:none">
                        💡 Los colores de contenedores solo se aplican en el tema <strong>Personalizado</strong>. El color primario siempre está disponible.
                    </div>
                    
                    <!-- GENERAL - Siempre visible (solo color primario) -->
                    <div class="color-section-general">
                        <div class="color-picker-group">
                            <h4>General</h4>
                            <div class="color-picker-wrapper">
                                <label>Primario:</label>
                                <input type="color" class="color-input" data-container="global" data-property="primary"
                                    value="${currentSettings.colors?.primary || '#667eea'}">
                                <input type="text" class="hex-input" value="${currentSettings.colors?.primary || '#667eea'}" placeholder="#667eea">
                            </div>
                            <button type="button" class="btn-reset" data-reset="global-primary">↺ Restablecer General</button>
                        </div>
                    </div>
                    
                    <!-- CARDS GRID - Contenedores individuales (solo en custom) -->
                    <div class="color-cards-grid">
                        ${['favbookmarks', 'folders', 'infolder', 'chat', 'widgets-1', 'widgets-2'].map(container => {
            const label = {
                'favbookmarks': 'Favoritos',
                'folders': 'Carpetas',
                'infolder': 'Contenido',
                'chat': 'Asistente',
                'widgets-1': 'Widget 1',
                'widgets-2': 'Widget 2'
            }[container];
            const colors = currentSettings.containers[container]?.colors || { background: '#ffffff', border: '#e2e8f0', text: '#2d3748', header: '#667eea' };
            const isCustom = currentSettings.theme === 'custom';
            return `
                            <div class="color-card" data-container="${container}">
                                <div class="color-card-header">
                                    <h4>${label}</h4>
                                    <button type="button" class="btn-reset btn-reset-small" data-reset="${container}" ${!isCustom ? 'disabled' : ''}>↺</button>
                                </div>
                                <div class="color-card-body" style="${!isCustom ? 'opacity:0.5;pointer-events:none;' : ''}">
                                    <div class="color-picker-wrapper">
                                        <label>Header:</label>
                                        <input type="color" class="color-input" data-container="${container}" data-property="header" value="${colors.header}" ${!isCustom ? 'disabled' : ''}>
                                        <input type="text" class="hex-input" value="${colors.header}" placeholder="#667eea" ${!isCustom ? 'disabled' : ''}>
                                    </div>
                                    <div class="color-picker-wrapper">
                                        <label>Fondo:</label>
                                        <input type="color" class="color-input" data-container="${container}" data-property="background" value="${colors.background}" ${!isCustom ? 'disabled' : ''}>
                                        <input type="text" class="hex-input" value="${colors.background}" placeholder="#ffffff" ${!isCustom ? 'disabled' : ''}>
                                    </div>
                                    <div class="color-picker-wrapper">
                                        <label>Borde:</label>
                                        <input type="color" class="color-input" data-container="${container}" data-property="border" value="${colors.border}" ${!isCustom ? 'disabled' : ''}>
                                        <input type="text" class="hex-input" value="${colors.border}" placeholder="#e2e8f0" ${!isCustom ? 'disabled' : ''}>
                                    </div>
                                    <div class="color-picker-wrapper">
                                        <label>Texto:</label>
                                        <input type="color" class="color-input" data-container="${container}" data-property="text" value="${colors.text}" ${!isCustom ? 'disabled' : ''}>
                                        <input type="text" class="hex-input" value="${colors.text}" placeholder="#2d3748" ${!isCustom ? 'disabled' : ''}>
                                    </div>
                                </div>
                            </div>
                            `;
        }).join('')}
                    </div>
                    
                    <!-- Reset general -->
                    <div style="margin-top:var(--spacing-md);padding-top:var(--spacing-md);border-top:1px solid var(--border-color)">
                        <button type="button" class="btn-reset" id="btnResetAll" style="width:100%">↺ Restablecer TODO</button>
                    </div>
                </div>
            </div>
        </div>`;

        const modal = createModal('settingsModal', 'Configuración', content, [
            { text: 'Guardar', class: 'btn-primary', action: 'save' },
            { text: 'Cerrar', class: 'btn-secondary', action: 'close' }
        ]);

        // Event listeners con timeout mayor para asegurar DOM ready
        setTimeout(() => {
            // Navegación entre secciones
            modal.querySelectorAll('.settings-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    modal.querySelectorAll('.settings-menu-item').forEach(mi => mi.classList.remove('active'));
                    item.classList.add('active');
                    modal.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
                    document.getElementById(`section-${item.dataset.section}`).classList.add('active');
                });
            });

            // Selección visual de opciones (se aplican al guardar)
            ['layout-option', 'theme-option', 'display-mode-btn'].forEach(selector => {
                modal.querySelectorAll(`.${selector}`).forEach(el => {
                    el.addEventListener('click', () => {
                        const parent = el.closest('.layouts-grid, .theme-options, .display-mode-selector');
                        if (parent) parent.querySelectorAll(`.${selector}`).forEach(o => o.classList.remove('active'));
                        el.classList.add('active');

                        if (selector === 'theme-option') {
                            currentSettings.theme = el.dataset.theme;
                            updateColorsSectionVisibility();
                        }
                    });
                });
            });

            let selectedFormat = 'json';

            modal.querySelectorAll('.export-format-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedFormat = btn.dataset.format;
                });
            });

            // EXPORTAR
            modal.querySelector('#btnExportData')?.addEventListener('click', async () => {
                if (window.ImportExportManager) {
                    let result;
                    if (selectedFormat === 'html') {
                        result = await ImportExportManager.exportToHTML();
                    } else {
                        result = await ImportExportManager.exportToJSON();
                    }
                    if (result.success) {
                        showNotification(`✅ Exportados ${result.count} marcadores en formato ${selectedFormat.toUpperCase()}`);
                    } else {
                        showNotification(`❌ Error al exportar: ${result.error}`, 'error');
                    }
                } else {
                    showNotification('❌ ImportExportManager no disponible', 'error');
                }
            });

            // IMPORTAR
            modal.querySelector('#btnImportData')?.addEventListener('click', () => {
                if (window.ImportExportManager) {
                    closeModal(modal);
                    ModalManager.showImportModal();
                } else {
                    showNotification('❌ ImportExportManager no disponible', 'error');
                }
            });

            // FORZAR selección visual inicial basada en settings actuales
            function syncVisualSelection() {
                const s = SettingsManager.getSettings();

                // Layouts
                modal.querySelectorAll('.layout-option').forEach(opt => {
                    opt.classList.toggle('active', opt.dataset.layout === s.layout);
                });

                // Themes
                modal.querySelectorAll('.theme-option').forEach(opt => {
                    opt.addEventListener('click', () => {
                        currentSettings.theme = opt.dataset.theme;
                        updateColorsSectionVisibility();
                    });
                });

                // Container displays
                ['favbookmarks', 'folders', 'infolder'].forEach(container => {
                    const display = s.containers[container]?.display || 'list';
                    modal.querySelectorAll(`.display-mode-btn[data-container="${container}"]`).forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.mode === display);
                    });
                });

                // Colors - sync inputs
                modal.querySelectorAll('.color-input').forEach(input => {
                    const c = input.dataset.container;
                    const p = input.dataset.property;
                    const val = s.containers[c]?.colors?.[p];
                    if (val) {
                        input.value = val;
                        const hex = input.closest('.color-picker-wrapper')?.querySelector('.hex-input');
                        if (hex) hex.value = val;
                    }
                });
            }
            syncVisualSelection();

            function updateColorsSectionVisibility() {
                const isCustom = currentSettings.theme === 'custom';
                const notice = modal.querySelector('#customColorsNotice');
                const cards = modal.querySelectorAll('.color-card');

                // Mostrar/ocultar aviso
                if (notice) {
                    notice.style.display = isCustom ? 'none' : 'block';
                }

                // Habilitar/deshabilitar cards de contenedores
                cards.forEach(card => {
                    const body = card.querySelector('.color-card-body');
                    const resetBtn = card.querySelector('.btn-reset-small');
                    const inputs = card.querySelectorAll('input');

                    if (isCustom) {
                        if (body) body.style.cssText = 'opacity:1;pointer-events:auto;';
                        if (resetBtn) resetBtn.disabled = false;
                        inputs.forEach(input => input.disabled = false);
                    } else {
                        if (body) body.style.cssText = 'opacity:0.5;pointer-events:none;';
                        if (resetBtn) resetBtn.disabled = true;
                        inputs.forEach(input => input.disabled = true);
                    }
                });
            }
            updateColorsSectionVisibility();

            // Font selection
            modal.querySelectorAll('.font-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    modal.querySelectorAll('.font-option').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                });
            });

            // Color pickers - Sincronización bidireccional
            function syncColorInputs() {
                modal.querySelectorAll('.color-picker-wrapper').forEach(wrapper => {
                    const colorInput = wrapper.querySelector('.color-input');
                    const hexInput = wrapper.querySelector('.hex-input');
                    if (!colorInput || !hexInput) return;

                    // Color picker → Hex
                    colorInput.addEventListener('input', (e) => {
                        hexInput.value = e.target.value.toLowerCase();
                        hexInput.style.borderColor = 'var(--border-color)';
                    });

                    // Hex input → Color picker (on change)
                    hexInput.addEventListener('change', (e) => {
                        let val = e.target.value.trim().toLowerCase();
                        if (!val.startsWith('#')) val = '#' + val;
                        if (/^#[0-9a-f]{6}$/.test(val)) {
                            colorInput.value = val;
                            hexInput.style.borderColor = 'var(--border-color)';
                        } else {
                            hexInput.value = colorInput.value;
                            hexInput.style.borderColor = '#fc8181';
                            setTimeout(() => hexInput.style.borderColor = 'var(--border-color)', 2000);
                        }
                    });

                    // Paste handler
                    hexInput.addEventListener('paste', (e) => {
                        e.preventDefault();
                        const paste = (e.clipboardData || window.clipboardData).getData('text').trim().toLowerCase();
                        let val = paste.startsWith('#') ? paste : '#' + paste;
                        if (/^#[0-9a-f]{6}$/.test(val)) {
                            hexInput.value = val;
                            colorInput.value = val;
                            hexInput.style.borderColor = 'var(--border-color)';
                        } else {
                            hexInput.style.borderColor = '#fc8181';
                            setTimeout(() => { hexInput.value = colorInput.value; hexInput.style.borderColor = 'var(--border-color)'; }, 1500);
                        }
                    });

                    // Blur validation
                    hexInput.addEventListener('blur', (e) => {
                        let val = e.target.value.trim().toLowerCase();
                        if (!val.startsWith('#')) val = '#' + val;
                        if (!/^#[0-9a-f]{6}$/.test(val)) e.target.value = colorInput.value;
                    });
                });
            }
            syncColorInputs();

            // Reset individual
            modal.querySelectorAll('.btn-reset[data-reset]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const resetTarget = e.target.dataset.reset;
                    const defaults = SettingsManager.getDefaults();

                    if (resetTarget === 'global-primary') {
                        // Restablecer color primario
                        const primary = defaults.colors?.primary || '#667eea';
                        const group = e.target.closest('.color-picker-group');
                        const colorInput = group?.querySelector('.color-input[data-property="primary"]');
                        const hexInput = group?.querySelector('.hex-input');
                        if (colorInput) colorInput.value = primary;
                        if (hexInput) {
                            hexInput.value = primary;
                            hexInput.style.borderColor = 'var(--border-color)';
                        }
                        SettingsManager.updateContainerColors('global', { primary });
                        showNotification('Color principal restablecido');
                    } else if (SettingsManager.getSettings().theme === 'custom') {
                        // Restablecer contenedor (solo en custom)
                        const container = resetTarget;
                        const colors = defaults.containers[container]?.colors;
                        if (colors) {
                            const card = e.target.closest('.color-card');
                            const wrappers = card?.querySelectorAll('.color-picker-wrapper');

                            wrappers.forEach(wrapper => {
                                const colorInput = wrapper.querySelector('.color-input');
                                const hexInput = wrapper.querySelector('.hex-input');
                                const prop = colorInput?.dataset.property;

                                if (colorInput && hexInput && prop && colors[prop]) {
                                    colorInput.value = colors[prop];
                                    hexInput.value = colors[prop];
                                    hexInput.style.borderColor = 'var(--border-color)';
                                }
                            });

                            SettingsManager.updateContainerColors(container, colors);
                            showNotification(`Colores de "${container}" restablecidos`);
                        }
                    } else {
                        showNotification('💡 Cambia al tema "Personalizado" para editar colores');
                    }
                });
            });

            // Reset general
            modal.querySelector('#btnResetAll')?.addEventListener('click', () => {
                if (confirm('¿Restablecer TODA la configuración?')) {
                    SettingsManager.resetToDefaults();
                    const d = SettingsManager.getDefaults();
                    modal.querySelectorAll('.layout-option').forEach(o => o.classList.toggle('active', o.dataset.layout === d.layout));
                    modal.querySelectorAll('.theme-option').forEach(o => o.classList.toggle('active', o.dataset.theme === d.theme));
                    modal.querySelectorAll('.display-mode-btn').forEach(btn => {
                        const c = btn.dataset.container, m = btn.dataset.mode;
                        btn.classList.toggle('active', d.containers[c]?.display === m);
                    });
                    modal.querySelectorAll('.color-input').forEach(input => {
                        const c = input.dataset.container, p = input.dataset.property;
                        const v = d.containers[c]?.colors?.[p];
                        if (v) {
                            input.value = v;
                            const hex = input.closest('.color-picker-wrapper')?.querySelector('.hex-input');
                            if (hex) hex.value = v;
                        }
                    });
                    showNotification('Configuración restablecida');
                }
            });

            // Función para cargar y mostrar los iconos personalizados
            async function loadCustomIconsList() {
                const container = modal.querySelector('#customIconsList');
                if (!container) return;

                if (!window.IconManager) {
                    container.innerHTML = '<div class="empty-icons">IconManager no disponible</div>';
                    return;
                }

                const customIcons = IconManager.getCustomIcons();

                if (customIcons.length === 0) {
                    container.innerHTML = `
                        <div class="empty-icons">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M17.75 3A3.25 3.25 0 0 1 21 6.25v6.879a2.25 2.25 0 0 1-.659 1.59l-5.621 5.622a2.25 2.25 0 0 1-1.591.659H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3zm0 1.5H6.25A1.75 1.75 0 0 0 4.5 6.25v11.5c0 .966.784 1.75 1.75 1.75H13v-3.064a7 7 0 0 1-.673.066L12 16.51a6.33 6.33 0 0 1-3.678-1.14.75.75 0 1 1 .854-1.234c.844.584 1.78.874 2.824.874q.693 0 1.324-.171a3.25 3.25 0 0 1 2.713-1.832l.213-.007H19.5V6.25a1.75 1.75 0 0 0-1.75-1.75m.689 10h-2.188c-.918 0-1.671.707-1.744 1.607l-.006.143-.001 2.189zM9 7.751a1.25 1.25 0 1 1 0 2.499A1.25 1.25 0 0 1 9 7.75m6 0a1.25 1.25 0 1 1 0 2.499 1.25 1.25 0 0 1 0-2.499"/>
                            </svg>
                            <p>No hay iconos personalizados</p>
                            <small>Sube archivos SVG para usarlos en tus carpetas</small>
                        </div>
                    `;
                    return;
                }
                let selectionMode = false;
                let selectedIcons = new Set();

                const selectBtn = modal.querySelector('#btnSelectMultiple');
                const bulkActions = modal.querySelector('#iconsBulkActions');

                const renderList = () => {
                    container.innerHTML = `
                        <div class="custom-icons-grid">
                            ${customIcons.map(icon => `
                                <div class="custom-icon-item ${selectionMode && selectedIcons.has(icon.id) ? 'selected' : ''}" 
                                    data-icon-id="${icon.id}" 
                                    data-icon-name="${escapeHtml(icon.name)}">
                                    <div class="custom-icon-preview">
                                        ${IconManager.getIconPreview(icon)}
                                    </div>
                                    <div class="custom-icon-name">${escapeHtml(icon.name)}</div>
                                    ${!selectionMode ? `
                                        <button class="icon-delete-btn" data-icon-id="${icon.id}" data-icon-name="${escapeHtml(icon.name)}" title="Eliminar icono">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="18" y1="6" x2="6" y2="18"/>
                                                <line x1="6" y1="6" x2="18" y2="18"/>
                                            </svg>
                                        </button>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `;

                    container.querySelectorAll('.custom-icon-item').forEach(item => {
                        const iconId = item.dataset.iconId;
                        const iconName = item.dataset.iconName;

                        if (selectionMode) {
                            item.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (selectedIcons.has(iconId)) {
                                    selectedIcons.delete(iconId);
                                    item.classList.remove('selected');
                                } else {
                                    selectedIcons.add(iconId);
                                    item.classList.add('selected');
                                }
                                const deleteSelectedBtn = modal.querySelector('#btnDeleteSelectedIcons');
                                if (deleteSelectedBtn) {
                                    if (selectedIcons.size === 0) {
                                        deleteSelectedBtn.textContent = 'Eliminar seleccionados';
                                        deleteSelectedBtn.disabled = true;
                                        deleteSelectedBtn.style.opacity = '0.5';
                                        deleteSelectedBtn.style.cursor = 'not-allowed';
                                    } else {
                                        deleteSelectedBtn.textContent = `Eliminar ${selectedIcons.size} seleccionado${selectedIcons.size !== 1 ? 's' : ''}`;
                                        deleteSelectedBtn.disabled = false;
                                        deleteSelectedBtn.style.opacity = '1';
                                        deleteSelectedBtn.style.cursor = 'pointer';
                                    }
                                }
                            });
                        } else {
                            const deleteBtn = item.querySelector('.icon-delete-btn');
                            if (deleteBtn) {
                                deleteBtn.addEventListener('click', async (e) => {
                                    e.stopPropagation();
                                    const confirmed = await ModalManager.showConfirmModal(
                                        'Eliminar icono',
                                        `¿Eliminar el icono "${iconName}"? Las carpetas que lo usen volverán al icono por defecto.`,
                                        'Eliminar',
                                        'Cancelar'
                                    );
                                    if (confirmed) {
                                        try {
                                            await IconManager.deleteIcon(iconId);
                                            showNotification('Icono eliminado');
                                            await loadCustomIconsList();
                                        } catch (error) {
                                            showNotification(error.message, 'error');
                                        }
                                    }
                                });
                            }
                        }
                    });
                };
                renderList();

                // Botón de selección múltiple
                if (selectBtn) {
                    const newSelectBtn = selectBtn.cloneNode(true);
                    selectBtn.parentNode.replaceChild(newSelectBtn, selectBtn);

                    newSelectBtn.addEventListener('click', () => {
                        selectionMode = true;
                        selectedIcons.clear();
                        renderList();
                        if (bulkActions) bulkActions.style.display = 'flex';
                        newSelectBtn.style.display = 'none';

                        const deleteSelectedBtn = modal.querySelector('#btnDeleteSelectedIcons');
                        if (deleteSelectedBtn) {
                            deleteSelectedBtn.textContent = 'Eliminar seleccionados';
                            deleteSelectedBtn.disabled = true;
                            deleteSelectedBtn.style.opacity = '0.5';
                            deleteSelectedBtn.style.cursor = 'not-allowed';
                        }
                    });
                }

                // Botón eliminar seleccionados
                const deleteSelectedBtn = modal.querySelector('#btnDeleteSelectedIcons');
                if (deleteSelectedBtn) {
                    const newDeleteBtn = deleteSelectedBtn.cloneNode(true);
                    deleteSelectedBtn.parentNode.replaceChild(newDeleteBtn, deleteSelectedBtn);

                    newDeleteBtn.addEventListener('click', async () => {
                        if (selectedIcons.size === 0) return;

                        const selectedNames = [];
                        for (const iconId of selectedIcons) {
                            const icon = customIcons.find(i => i.id === iconId);
                            if (icon) selectedNames.push(icon.name);
                        }

                        const message = selectedIcons.size === 1
                            ? `¿Eliminar el icono "${selectedNames[0]}"? Las carpetas que lo usen volverán al icono por defecto.`
                            : `¿Eliminar ${selectedIcons.size} iconos? Las carpetas que los usen volverán al icono por defecto.`;

                        const confirmed = await ModalManager.showConfirmModal(
                            'Eliminar iconos',
                            message,
                            'Eliminar',
                            'Cancelar'
                        );

                        if (confirmed) {
                            let deletedCount = 0;
                            for (const iconId of selectedIcons) {
                                try {
                                    await IconManager.deleteIcon(iconId);
                                    deletedCount++;
                                } catch (error) {
                                    console.error('Error eliminando icono:', error);
                                    showNotification(error.message, 'error');
                                }
                            }
                            showNotification(`${deletedCount} iconos eliminados`);

                            selectionMode = false;
                            selectedIcons.clear();

                            if (bulkActions) bulkActions.style.display = 'none';

                            const selectBtnRefresh = modal.querySelector('#btnSelectMultiple');
                            if (selectBtnRefresh) selectBtnRefresh.style.display = 'inline-flex';

                            await loadCustomIconsList();
                        }
                    });
                }

                // Botón cancelar selección
                const cancelSelectionBtn = modal.querySelector('#btnCancelSelection');
                if (cancelSelectionBtn) {
                    const newCancelBtn = cancelSelectionBtn.cloneNode(true);
                    cancelSelectionBtn.parentNode.replaceChild(newCancelBtn, cancelSelectionBtn);

                    newCancelBtn.addEventListener('click', () => {
                        selectionMode = false;
                        selectedIcons.clear();
                        renderList();
                        if (bulkActions) bulkActions.style.display = 'none';
                        const selectBtnRefresh = modal.querySelector('#btnSelectMultiple');
                        if (selectBtnRefresh) selectBtnRefresh.style.display = 'inline-flex';
                    });
                }
            }

            // Subir icono
            const uploadBtn = modal.querySelector('#btnUploadIcon');
            const fileInput = modal.querySelector('#uploadCustomIcon');

            if (uploadBtn && fileInput) {
                uploadBtn.addEventListener('click', () => fileInput.click());

                fileInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    try {
                        const result = await IconManager.uploadIcon(file);
                        showNotification(`Icono "${result.icon.name}" subido correctamente`);
                        await loadCustomIconsList();
                    } catch (error) {
                        showNotification(error.message, 'error');
                    }
                    fileInput.value = '';
                });
            }

            // Cargar la lista inicial
            loadCustomIconsList();

            // Guardar cambios
            modal.querySelector('[data-action="save"]')?.addEventListener('click', () => {
                // Guardar layout y tema...
                const selLayout = modal.querySelector('.layout-option.active');
                if (selLayout) SettingsManager.updateLayout(selLayout.dataset.layout);

                const selTheme = modal.querySelector('.theme-option.active');
                if (selTheme) SettingsManager.updateTheme(selTheme.dataset.theme);

                const selFont = modal.querySelector('.font-option.active');
                if (selFont) {
                    SettingsManager.updateFontFamily(selFont.dataset.font);
                }

                // Guardar modos de visualización
                ['favbookmarks', 'folders', 'infolder'].forEach(container => {
                    const btn = modal.querySelector(`.display-mode-btn[data-container="${container}"].active`);
                    if (btn) {
                        SettingsManager.updateContainerDisplay(container, btn.dataset.mode);
                    }
                });

                // Guardar colores...
                modal.querySelectorAll('.color-input').forEach(input => {
                    const c = input.dataset.container;
                    const p = input.dataset.property;
                    // Solo guardar si no está disabled
                    if (!input.disabled) {
                        SettingsManager.updateContainerColors(c, { [p]: input.value });
                    }
                });

                if (SettingsManager.getSettings().theme === 'custom') {
                    setTimeout(() => {
                        Object.keys(SettingsManager.getSettings().containers).forEach(container => {
                            SettingsManager.applyContainerColors(container,
                                SettingsManager.getSettings().containers[container].colors);
                        });
                        // Re-aplicar colores globales de tema custom
                        if (typeof SettingsManager.applyCustomThemeColors === 'function') {
                            SettingsManager.applyCustomThemeColors();
                        }
                    }, 100);
                }

                SettingsManager.saveSettings();
                closeModal(modal);
                showNotification('Configuración guardada ✨');
            });
            // Cerrar
            modal.querySelector('[data-action="close"]')?.addEventListener('click', () => closeModal(modal));
        }, 100); // Timeout aumentado
        return modal;
    }

    function showImportModal() {
        // Verificar que ImportExportManager existe
        if (!window.ImportExportManager) {
            showNotification('ImportExportManager no disponible', 'error');
            return;
        }

        const content = `
            <div class="import-options-container">
                <div class="import-option-card" data-type="vision">
                    <div class="import-option-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M4 4h16v16H4zM4 8h16M8 4v16"/>
                        </svg>
                    </div>
                    <div class="import-option-info">
                        <h4>Vision Marks (.json)</h4>
                        <p>Archivo exportado desde Vision Marks. Mantiene carpetas, favoritos y orden.</p>
                    </div>
                    <input type="file" id="importVisionMarks" accept=".json" style="display:none">
                    <button class="import-select-btn" data-type="vision">Seleccionar archivo</button>
                </div>
                <div class="import-option-card" data-type="browser">
                    <div class="import-option-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                    </div>
                    <div class="import-option-info">
                        <h4>Marcadores del navegador (.html)</h4>
                        <p>Archivo HTML exportado desde Chrome, Firefox, Edge o Brave. Detecta carpetas (h3).</p>
                    </div>
                    <input type="file" id="importBrowserHTML" accept=".html,.htm" style="display:none">
                    <button class="import-select-btn" data-type="browser">Seleccionar archivo</button>
                </div>
            </div>
        `;

        const modal = createModal('importModal', 'Importar marcadores', content, [
            { text: 'Cerrar', class: 'btn-secondary', action: 'close' }
        ]);

        if (!modal) {
            return;
        }

        // Manejador para Vision Marks
        const visionBtn = modal.querySelector('[data-type="vision"]');
        const visionInput = modal.querySelector('#importVisionMarks');

        if (visionBtn && visionInput) {
            visionBtn.addEventListener('click', () => {
                visionInput.click();
            });

            visionInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const result = await window.ImportExportManager.importFromJSON(file);
                        if (result.cancelled) {
                            // No mostrar notificación, solo cerrar modal
                            closeModal(modal);
                            return;
                        }
                        showNotification(`✅ Importación completada:\n- ${result.folders} carpetas\n- ${result.bookmarks} marcadores`);
                        closeModal(modal);
                    } catch (error) {
                        showNotification(`❌ Error: ${error.message}`, 'error');
                    }
                }
                visionInput.value = '';
            });
        } else {
        }

        // Manejador para HTML de navegador
        const browserBtn = modal.querySelector('[data-type="browser"]');
        const browserInput = modal.querySelector('#importBrowserHTML');

        if (browserBtn && browserInput) {
            browserBtn.addEventListener('click', () => {
                browserInput.click();
            });

            browserInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const result = await window.ImportExportManager.importFromHTML(file);
                        if (result.cancelled) {
                            closeModal(modal);
                            return;
                        }
                        showNotification(`✅ Importados ${result.bookmarks} marcadores en ${result.folders} carpetas`);
                        closeModal(modal);
                    } catch (error) {
                        showNotification(`❌ Error: ${error.message}`, 'error');
                    }
                }
                browserInput.value = '';
            });
        } else {
        }
        // Abrir la modal
        openModal(modal);
    }

    function showConfirmModal(title, message, confirmText = 'Aceptar', cancelText = 'Cancelar') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay confirm-modal';
            modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" aria-label="Cerrar">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="white-space: pre-line;">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn btn-secondary" data-action="cancel">${cancelText}</button>
                    <button class="modal-btn btn-primary" data-action="confirm">${confirmText}</button>
                </div>
            </div>
        `;
            document.body.appendChild(modal);

            // Cerrar con X
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            // Cerrar al hacer clic fuera
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });

            // Botón cancelar
            modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            // Botón confirmar
            modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });

            // Escape para cerrar
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    resolve(false);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }

    // Toast notificación
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#ef4444' : '#16a847'};
        color: white;
        border-radius: 8px;
        font-size: 0.9rem;
        z-index: 100000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Inyectar animaciones CSS
    (function injectAnimations() {
        if (document.getElementById('modal-animations')) return;
        const style = document.createElement('style');
        style.id = 'modal-animations';
        style.textContent = `
        @keyframes slideIn { from{transform:translateX(400px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes slideOut { from{transform:translateX(0);opacity:1} to{transform:translateX(400px);opacity:0} }
    `;
        document.head.appendChild(style);
    })();

    return {
        createModal,
        openModal,
        closeModal,
        createBookmarkModal,
        createFolderModal,
        createConfirmModal,
        createSettingsModal,
        showImportModal,
        showConfirmModal
    };
})();
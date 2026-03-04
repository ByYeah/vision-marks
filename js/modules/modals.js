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

    // Modal tipo: Bookmark
    function createBookmarkModal(bookmark = null, folderId = null, forceFavorite = false) {
        const isEdit = bookmark !== null;
        const isFavoriteChecked = forceFavorite || bookmark?.isFavorite ? 'checked' : '';
        const isFavoriteDisabled = forceFavorite ? 'disabled' : '';
        const favoriteText = forceFavorite ? '(automático)' :
            (StateManager.getFavoritesCount() >= StateManager.getMaxFavorites() ?
                '(límite: 32)' : '');

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

        return createModal('bookmarkModal', isEdit ? 'Editar Marcador' : 'Nuevo Marcador', content, actions);
    }

    // Modal tipo: Folder
    function createFolderModal(folder = null) {
        const isEdit = folder !== null;
        const content = `
            <form id="folderForm" class="modal-form">
                <div class="form-group">
                    <label for="folderName">Nombre *</label>
                    <input type="text" id="folderName" name="name" 
                           value="${folder?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Icono</label>
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
            { text: 'Cancelar', class: 'btn-secondary', action: 'cancel' },
            { text: isEdit ? 'Guardar' : 'Crear', class: 'btn-primary', action: 'save' }
        ];

        const modal = createModal('folderModal', isEdit ? 'Editar Carpeta' : 'Nueva Carpeta', content, actions);

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
        return createModal('confirmModal', title, `<p>${message}</p>`, actions);
    }

    // Modal tipo: Settings
    function createSettingsModal() {
        const currentSettings = SettingsManager.getSettings();

        const content = `
        <div class="settings-container">
            <div class="settings-sidebar">
                <button class="settings-menu-item active" data-section="layouts">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                    Layouts
                </button>
                <button class="settings-menu-item" data-section="themes">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
                    Temas
                </button>
                <button class="settings-menu-item" data-section="containers">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg>
                    Contenedores
                </button>
                <button class="settings-menu-item" data-section="colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                    Colores
                </button>
                <button class="settings-menu-item" data-section="typography">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="4 7 4 4 20 4 20 7"/>
                        <line x1="9" y1="20" x2="15" y2="20"/>
                        <line x1="12" y1="4" x2="12" y2="20"/>
                    </svg>
                    Tipografía
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
                            <div class="layout-preview-item" title="Widget 2" style="grid-column: 3; grid-row: 2 / -1;"></div>
                        </div>
                        <div class="layout-name">Widgets</div>
                        <div class="layout-desc">Columna derecha dividida</div>
                    </div>
                    
                    <!-- Layout Libre: Bento Box 4x4 -->
                    <div class="layout-option ${currentSettings.layout === 'free' ? 'active' : ''}" data-layout="free">
                        <div class="layout-preview layout-free">
                            <div class="layout-preview-item" title="Favoritos"></div>
                            <div class="layout-preview-item" title="Carpetas"></div>
                            <div class="layout-preview-item" title="Contenido"></div>
                            <div class="layout-preview-item" title="Chat"></div>
                        </div>
                        <div class="layout-name">Libre</div>
                        <div class="layout-desc">Bento box</div>
                    </div>
                </div>
            </div>

                <!-- Themes -->
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
                    </div>
                </div>

                <!-- Typography -->
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

                <!-- Containers Display -->
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

                <!-- Colors -->
                <div class="settings-section" id="section-colors">
                    <h3>Colores</h3>
                    <p>Personaliza por contenedor</p>

                    <div class="color-picker-group">
                        <h4>Color Principal</h4>
                        <div class="color-picker-wrapper">
                            <label>Primario:</label>
                            <input type="color" class="color-input" data-container="global" data-property="primary" value="${currentSettings.colors?.primary || '#667eea'}">
                            <input type="text" class="hex-input" value="${currentSettings.colors?.primary || '#667eea'}" placeholder="#667eea">
                        </div>
                        <button type="button" class="btn-reset" data-reset="global-primary">↺ Restablecer</button>
                    </div>
                    
                    <div class="color-picker-group">
                        <h4>Favoritos</h4>
                        <div class="color-picker-wrapper">
                            <label>Fondo:</label>
                            <input type="color" class="color-input" data-container="favbookmarks" data-property="background" value="${currentSettings.containers.favbookmarks.colors.background}">
                            <input type="text" class="hex-input" value="${currentSettings.containers.favbookmarks.colors.background}" placeholder="#ffffff">
                        </div>
                        <div class="color-picker-wrapper">
                            <label>Borde:</label>
                            <input type="color" class="color-input" data-container="favbookmarks" data-property="border" value="${currentSettings.containers.favbookmarks.colors.border}">
                            <input type="text" class="hex-input" value="${currentSettings.containers.favbookmarks.colors.border}" placeholder="#e2e8f0">
                        </div>
                        <div class="color-picker-wrapper">
                            <label>Texto:</label>
                            <input type="color" class="color-input" data-container="favbookmarks" data-property="text" value="${currentSettings.containers.favbookmarks.colors.text}">
                            <input type="text" class="hex-input" value="${currentSettings.containers.favbookmarks.colors.text}" placeholder="#2d3748">
                        </div>
                        <button type="button" class="btn-reset" data-reset="favbookmarks">↺ Restablecer</button>
                    </div>
                    
                    <div class="color-picker-group">
                        <h4>Carpetas</h4>
                        <div class="color-picker-wrapper">
                            <label>Fondo:</label>
                            <input type="color" class="color-input" data-container="folders" data-property="background" value="${currentSettings.containers.folders.colors.background}">
                            <input type="text" class="hex-input" value="${currentSettings.containers.folders.colors.background}" placeholder="#ffffff">
                        </div>
                        <div class="color-picker-wrapper">
                            <label>Borde:</label>
                            <input type="color" class="color-input" data-container="folders" data-property="border" value="${currentSettings.containers.folders.colors.border}">
                            <input type="text" class="hex-input" value="${currentSettings.containers.folders.colors.border}" placeholder="#e2e8f0">
                        </div>
                        <button type="button" class="btn-reset" data-reset="folders">↺ Restablecer</button>
                    </div>
                    
                    <div style="margin-top:auto;padding-top:1rem;border-top:1px solid var(--border-color);grid-column:1/-1">
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
                    });
                });
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
                    opt.classList.toggle('active', opt.dataset.theme === s.theme);
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
                    const resetTarget = e.target.dataset.reset;

                    if (resetTarget === 'global-primary') {
                        // Restablecer color primario
                        const defaults = SettingsManager.getDefaults();
                        const primary = defaults.colors?.primary || '#667eea';
                        const group = e.target.closest('.color-picker-group');
                        const colorInput = group.querySelector('.color-input[data-property="primary"]');
                        const hexInput = group.querySelector('.hex-input');
                        if (colorInput) colorInput.value = primary;
                        if (hexInput) hexInput.value = primary;
                        SettingsManager.updateContainerColors('global', { primary });
                        showNotification('Color principal restablecido');
                    } else {
                        // Resto del código para contenedores individuales...
                        const container = resetTarget;
                        const defaults = SettingsManager.getDefaults();
                        const colors = defaults.containers[container].colors;
                        const group = e.target.closest('.color-picker-group');
                        group.querySelectorAll('.color-input').forEach(input => {
                            const prop = input.dataset.property;
                            if (colors[prop]) {
                                input.value = colors[prop];
                                const hex = input.closest('.color-picker-wrapper').querySelector('.hex-input');
                                if (hex) hex.value = colors[prop];
                            }
                        });
                        SettingsManager.updateContainerColors(container, colors);
                        showNotification(`Colores de "${container}" restablecidos`);
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
                    SettingsManager.updateContainerColors(c, { [p]: input.value });
                });

                SettingsManager.saveSettings();
                closeModal(modal);
                showNotification('Configuración guardada ✨');
            });
            // Cerrar
            modal.querySelector('[data-action="close"]')?.addEventListener('click', () => closeModal(modal));
        }, 100); // Timeout aumentado
        return modal;
    }

    // Toast notificación
    function showNotification(message) {
        const el = document.createElement('div');
        el.className = 'notification';
        el.textContent = message;
        el.style.cssText = `position:fixed;bottom:20px;right:20px;background:var(--primary-color);color:white;padding:1rem 2rem;border-radius:var(--border-radius);box-shadow:var(--shadow-lg);z-index:10000;animation:slideIn 0.3s ease`;
        document.body.appendChild(el);
        setTimeout(() => {
            el.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => el.remove(), 300);
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
        createSettingsModal
    };
})();
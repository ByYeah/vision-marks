const RenderManager = (() => {
    let currentPage = 1;
    let currentFoldersPage = 1;
    const itemsPerPage = 16; // 8 filas × 2 columnas


    function renderFavorites(forceDisplayMode = null) {
        const container = document.getElementById('favBookmarksList');
        const emptyState = document.getElementById('emptyFavBookmarks');
        const containerBody = document.querySelector('[data-container="favbookmarks"] .container-body');
        const containerEl = document.querySelector('[data-container="favbookmarks"]');

        if (!container) return;

        // Determinar el modo de visualización: si se fuerza uno, usarlo, si no, leer del DOM
        let displayMode = forceDisplayMode;
        if (!displayMode) {
            displayMode = containerEl?.getAttribute('data-display') || 'list';
        }

        const favoritesCount = StateManager.getFavoritesCount();
        const maxFavorites = StateManager.getMaxFavorites();

        // GRID mode
        if (displayMode === 'grid-8') {
            renderFavoritesGrid('grid-8');
            updateFavoritesButton(favoritesCount, maxFavorites);
            return;
        }

        // LIST mode
        if (containerBody) {
            containerBody.style.overflow = 'auto';
            containerBody.style.display = 'block';
            containerBody.style.height = '100%';
        }

        const favorites = StateManager.getBookmarks(null, true);

        if (favorites.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.innerHTML = `<p>No hay favoritos aún<br><small>Máximo: ${maxFavorites}</small></p>`;
                emptyState.style.display = 'flex';
                if (containerBody) containerBody.style.overflow = 'hidden';
            }
            updateFavoritesButton(favoritesCount, maxFavorites);
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = favorites.map((b, index) => {
            const bookmarkHTML = createBookmarkHTML(b);

            // Insertar botones de reordenamiento dentro del HTML del marcador
            const isFirst = index === 0;
            const isLast = index === favorites.length - 1;

            return bookmarkHTML;
        }).join('');
        attachBookmarkEvents(container);

        // Agregar botones de reordenamiento después de renderizar los favoritos
        attachReorderButtons(container, 'favorites', null);

        const bookmarkList = container.querySelector('.bookmark-list');
        if (bookmarkList && displayMode === 'list') {
            bookmarkList.style.overflowY = 'auto';
            bookmarkList.style.flex = '1';
            bookmarkList.style.minHeight = '0';
        }
        updateFavoritesButton(favoritesCount, maxFavorites);
    }

    function attachReorderButtons(container, collection, folderId = null) {
        const items = container.querySelectorAll('.bookmark-item, .folder-item');

        items.forEach((item, index) => {
            // Verificar si ya tiene botón more
            if (item.querySelector('.btn-more')) return;

            const itemId = item.dataset.bookmarkId || item.dataset.folderId;
            const isFirst = index === 0;
            const isLast = index === items.length - 1;

            // AÑADIR data-collection y data-folder-id al ITEM
            item.dataset.collection = collection;
            if (folderId) {
                item.dataset.folderId = folderId;
            }

            // Crear contenedor de acciones si no existe
            let actionsContainer = item.querySelector('.bookmark-actions');
            if (!actionsContainer) {
                actionsContainer = document.createElement('div');
                actionsContainer.className = 'bookmark-actions';
                item.appendChild(actionsContainer);
            }

            // Crear botón MORE
            const btnMore = document.createElement('button');
            btnMore.className = 'btn-more';
            btnMore.dataset.id = itemId;
            btnMore.dataset.collection = collection;
            btnMore.dataset.folderId = folderId || '';
            btnMore.innerHTML = '<span class="icon-more-vertical"></span>';
            btnMore.title = 'Más opciones';
            btnMore.type = 'button';

            actionsContainer.insertBefore(btnMore, actionsContainer.firstChild);

            // Crear menú contextual
            const contextMenu = document.createElement('div');
            contextMenu.className = 'context-menu';
            contextMenu.dataset.id = itemId;
            contextMenu.innerHTML = `
            <ul>
                <li class="context-menu-item" data-action="move-up"${isFirst ? ' style="opacity:0.3;cursor:not-allowed;"' : ''}>
                    <span class="icon-arrow-up"></span>
                    <span>Subir prioridad</span>
                </li>
                <li class="context-menu-item" data-action="move-down"${isLast ? ' style="opacity:0.3;cursor:not-allowed;"' : ''}>
                    <span class="icon-arrow-down"></span>
                    <span>Bajar prioridad</span>
                </li>
            </ul>
        `;

            item.appendChild(contextMenu);
        });

        loadMenuIcons();
    }

    async function loadMenuIcons() {
        if (!window.SvgLoader) return;

        const icons = ['more-vertical', 'arrow-up', 'arrow-down', 'edit', 'star', 'trash'];

        for (const iconName of icons) {
            const elements = document.querySelectorAll(`.icon-${iconName}`);
            if (elements.length > 0) {
                try {
                    // Determinar atributos según el tipo de icono
                    const attributes = (iconName === 'edit' || iconName === 'trash')
                        ? { fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }
                        : { fill: 'currentColor', stroke: 'currentColor', 'stroke-width': '2' };

                    // Usar la nueva función que soporta atributos
                    const svgContent = await SvgLoader.loadIconWithAttributes(iconName, attributes);

                    elements.forEach(el => {
                        if (!el.querySelector('svg')) {
                            el.innerHTML = svgContent;
                        }
                    });
                } catch (error) {
                }
            }
        }
    }

    function updateFavoritesButton(count, max) {
        const btn = document.querySelector('[data-container="favbookmarks"] .btn-add');
        if (!btn) return;

        if (count >= max) {
            btn.disabled = true;
            btn.style.opacity = '0.3';
            btn.style.cursor = 'not-allowed';
            btn.title = `Límite de ${max} alcanzado`;
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = `Añadir favorito (${count}/${max})`;
        }
    }

    function renderFavoritesGrid(mode) {
        const container = document.getElementById('favBookmarksList');
        const emptyState = document.getElementById('emptyFavBookmarks');
        const containerBody = document.querySelector('[data-container="favbookmarks"] .container-body');

        if (!container) return;

        // Grid mode: sin scroll, altura completa
        if (containerBody) {
            containerBody.style.overflow = 'hidden';
            containerBody.style.display = 'flex';
            containerBody.style.flexDirection = 'column';
            containerBody.style.height = '100%';
        }

        const favorites = StateManager.getBookmarks(null, true);

        if (favorites.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.innerHTML = '<p>No hay favoritos aún</p>';
                emptyState.style.display = 'flex';
            }
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const gridClass = 'grid-8';
        const maxItems = 16;

        const totalPages = Math.ceil(favorites.length / maxItems);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * maxItems;
        const endIndex = startIndex + maxItems;
        const displayFavorites = favorites.slice(startIndex, endIndex);

        const showTitle = false;

        const html = `<div class="favorites-grid ${gridClass}">${displayFavorites.map(b => `
            <div class="favorite-grid-item ${gridClass}" data-bookmark-id="${b.id}" data-collection="favorites" title="${escapeHtml(b.title)}">
                <img src="${b.icon}" alt="" class="bookmark-icon" onerror="this.src='assets/icons/default-bookmark.png'">
                <div class="grid-item-actions">
                    <button class="grid-item-btn btn-more-grid" data-id="${b.id}" data-collection="favorites" title="Más opciones">
                        <span class="icon-more-vertical"></span>
                    </button>
                </div>
                <!-- Menú contextual para grid -->
                <div class="context-menu context-menu-grid" data-id="${b.id}">
                    <ul>
                        <li class="context-menu-item" data-action="edit" data-bookmark-id="${b.id}">
                            <span class="icon-edit"></span>
                            <span>Editar</span>
                        </li>
                        <li class="context-menu-item" data-action="toggle-favorite" data-bookmark-id="${b.id}">
                            <span class="icon-star"></span>
                            <span>${b.isFavorite ? 'Quitar favorito' : 'Añadir a favoritos'}</span>
                        </li>
                        <li class="context-menu-divider"></li>
                        <li class="context-menu-item" data-action="move-up" data-id="${b.id}" data-collection="favorites">
                            <span class="icon-arrow-up"></span>
                            <span>Subir prioridad</span>
                        </li>
                        <li class="context-menu-item" data-action="move-down" data-id="${b.id}" data-collection="favorites">
                            <span class="icon-arrow-down"></span>
                            <span>Bajar prioridad</span>
                        </li>
                        <li class="context-menu-divider"></li>
                        <li class="context-menu-item delete" data-action="delete" data-bookmark-id="${b.id}">
                            <span class="icon-trash"></span>
                            <span>Eliminar</span>
                        </li>
                    </ul>
                </div>
            </div>
        `).join('')}</div>`;

        // Indicador de páginas solo si hay más de 16 items
        const pageIndicator = totalPages > 1 ? `
        <div class="grid-page-indicator" data-total="${totalPages}">
            <span class="page-dot ${currentPage === 1 ? 'active' : ''}" data-page="1"></span>
            <span class="page-dot ${currentPage === 2 ? 'active' : ''}" data-page="2"></span>
        </div>`: '';

        container.innerHTML = html + pageIndicator;

        attachGridEvents(container);
        // Si necesitas el wheel listener, añádelo después sin setTimeout

        setTimeout(() => {
            loadMenuIcons();
        }, 0);

        if (totalPages > 1) {
            const containerBody = document.querySelector('[data-container="favbookmarks"] .container-body');
            if (containerBody) {
                containerBody.removeEventListener('wheel', handleGridWheel);
                containerBody.addEventListener('wheel', handleGridWheel, { passive: false });
            }
        }
    }

    // Controles de paginación
    function attachPageIndicator() {
        const indicator = document.querySelector('.grid-page-indicator');
        if (!indicator) return;

        // Click en puntos
        indicator.querySelectorAll('.page-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const page = parseInt(dot.dataset.page);
                if (page && page !== currentPage) {
                    currentPage = page;
                    renderFavoritesGrid('grid-8');
                }
            });
        });

        // Wheel para cambiar página
        const gridContainer = document.querySelector('[data-container="favbookmarks"] .container-body');
        if (gridContainer) {
            gridContainer.addEventListener('wheel', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.deltaY > 0 && currentPage < 2) {
                    currentPage++;
                    renderFavoritesGrid('grid-8');
                } else if (e.deltaY < 0 && currentPage > 1) {
                    currentPage--;
                    renderFavoritesGrid('grid-8');
                }
            }, { passive: false });
        }
    }

    // Handler del wheel con debounce para evitar cambios rápidos
    let wheelTimeout = null;
    function handleGridWheel(e) {
        e.preventDefault();
        e.stopPropagation();

        if (wheelTimeout) return;

        const indicator = document.querySelector('.grid-page-indicator');
        if (!indicator) return;

        // Calcular totalPages desde el estado, no del DOM
        const favorites = StateManager.getBookmarks(null, true);
        const totalPages = Math.ceil(favorites.length / 16);

        if (e.deltaY > 0 && currentPage < totalPages) {
            currentPage++;
            wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 300);
            renderFavoritesGrid('grid-8');
        } else if (e.deltaY < 0 && currentPage > 1) {
            currentPage--;
            wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 300);
            renderFavoritesGrid('grid-8');
        }
    }

    // Delegación de eventos para GRID
    function attachGridEvents(container) {
        container.addEventListener('click', (e) => {
            // Si el click es dentro del menú contextual, NO abrir URL
            if (e.target.closest('.context-menu') || e.target.closest('.grid-item-actions')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const editBtn = e.target.closest('.grid-item-btn.edit');
            const deleteBtn = e.target.closest('.grid-item-btn.delete');
            const gridItem = e.target.closest('.favorite-grid-item');

            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();
                const id = editBtn.dataset.bookmarkId;
                if (window.BookmarksManager) {
                    BookmarksManager.openBookmarkModal(null, id);
                }
                return;
            }

            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                const id = deleteBtn.dataset.bookmarkId;
                if (window.BookmarksManager) {
                    BookmarksManager.deleteBookmark(id);
                }
                return;
            }

            // ABRIR URL solo si no fue en acciones
            if (gridItem && !e.target.closest('.grid-item-actions')) {
                const id = gridItem.dataset.bookmarkId;
                const b = StateManager.getBookmarkById(id);
                if (b) window.open(b.url, '_blank');
            }
        }, { capture: true });
    }

    function renderFolders() {
        const container = document.getElementById('foldersGrid');
        if (!container) return;

        const folders = StateManager.getFolders();
        const maxPages = 5; // Máximo 5 páginas

        // Calcular items por página basado en el ancho del contenedor
        const itemsPerPage = calculateItemsPerPage();

        // Limitar a máximo (itemsPerPage * maxPages) carpetas
        const displayedFolders = folders.slice(0, itemsPerPage * maxPages);
        const totalItems = displayedFolders.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        // Asegurar que currentFoldersPage no exceda totalPages
        if (currentFoldersPage > totalPages) {
            currentFoldersPage = Math.max(1, totalPages);
        }

        if (displayedFolders.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay carpetas. Crea una nueva.</div>';
            updatePageInfo(0);
            return;
        }

        // Lógica para flechas
        const isLeftDisabled = currentFoldersPage <= 1;
        const showRightArrow = currentFoldersPage < totalPages;

        // Calcular qué items mostrar según la página actual
        const startIndex = (currentFoldersPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageFolders = displayedFolders.slice(startIndex, endIndex);

        // Generar HTML de las carpetas
        let foldersHTML = pageFolders.map((f, pageIndex) => {
            const globalIndex = startIndex + pageIndex;
            const isFirst = globalIndex === 0;
            const isLast = globalIndex === displayedFolders.length - 1;
            const isFirstFavorite = f.isFavorite && (globalIndex === 0 || !displayedFolders[globalIndex - 1]?.isFavorite);
            const isLastFavorite = f.isFavorite && (globalIndex === displayedFolders.length - 1 || !displayedFolders[globalIndex + 1]?.isFavorite);

            return `
                <div class="folder-item" data-folder-id="${f.id}" data-collection="folders" data-favorite="${f.isFavorite}">
                    <div class="folder-icon">${f.icon}</div>
                    <div class="folder-name">${f.name}</div>
                    <div class="folder-actions">
                        <button class="btn-folder-action btn-more-folder" data-id="${f.id}" data-collection="folders" title="Más opciones">
                            <span class="icon-more-vertical"></span>
                        </button>
                    </div>
                    <div class="context-menu-folder" data-id="${f.id}">
                        <ul>
                            <li class="context-menu-item" data-action="favorite-folder" data-folder-id="${f.id}">
                                <span class="icon-star"></span>
                                <span>${f.isFavorite ? 'Quitar favorito' : 'Añadir a favoritos'}</span>
                            </li>
                            <li class="context-menu-divider"></li>
                            <li class="context-menu-item" data-action="move-up" data-id="${f.id}" data-collection="folders" ${isFirst || (f.isFavorite && isFirstFavorite) || (!f.isFavorite && displayedFolders[globalIndex - 1]?.isFavorite) ? 'style="opacity:0.3;cursor:not-allowed;"' : ''}>
                                <span class="icon-arrow-up"></span>
                                <span>Subir prioridad</span>
                            </li>
                            <li class="context-menu-item" data-action="move-down" data-id="${f.id}" data-collection="folders" ${isLast || (f.isFavorite && isLastFavorite) || (!f.isFavorite && displayedFolders[globalIndex + 1]?.isFavorite) ? 'style="opacity:0.3;cursor:not-allowed;"' : ''}>
                                <span class="icon-arrow-down"></span>
                                <span>Bajar prioridad</span>
                            </li>
                            <li class="context-menu-divider"></li>
                            <li class="context-menu-item" data-action="edit" data-folder-id="${f.id}">
                                <span class="icon-edit"></span>
                                <span>Editar carpeta</span>
                            </li>
                            <li class="context-menu-item delete" data-action="delete" data-folder-id="${f.id}">
                                <span class="icon-trash"></span>
                                <span>Eliminar carpeta</span>
                            </li>
                        </ul>
                    </div>
                </div>
            `;
        }).join('');

        // Construir HTML con flechas
        let html = `
                <div class="folders-carousel-wrapper" data-items-per-page="${itemsPerPage}" data-layout="${getCurrentLayout()}">
                    <div class="folders-arrow folders-arrow-left ${isLeftDisabled ? 'disabled' : ''}" title="Página anterior">
                        <svg viewBox="0 0 24 24">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                    </div>
                    <div class="folders-carousel-container">
                        <div class="folders-scroll-container">
                            <div class="folders-grid" style="gap: var(--spacing-md);">
                                ${foldersHTML}
                            </div>
                        </div>
                    </div>
                    <div class="folders-arrow folders-arrow-right ${!showRightArrow ? 'hidden' : ''}" title="Página siguiente">
                        <svg viewBox="0 0 24 24">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </div>
                </div>
            `;
        container.innerHTML = html;
        updatePageInfo(totalPages);
        attachArrowEvents(container, totalPages, itemsPerPage);

        setTimeout(() => {
            loadMenuIcons();
        }, 0);

        attachFolderEvents(container);
    }

    function getCurrentLayout() {
        // Buscar el contenedor principal de folders
        const foldersContainer = document.querySelector('[data-container="folders"]');
        if (!foldersContainer) return 'default';

        // Verificar por el contenedor del dashboard para detectar el layout global
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            const dashboardClasses = dashboard.className;

            // Detectar por las clases del dashboard
            if (dashboardClasses.includes('layout-extended')) {
                return 'extended';
            }
            if (dashboardClasses.includes('layout-widgets')) {
                return 'widgets';
            }
            if (dashboardClasses.includes('layout-double')) {
                return 'double';
            }
        }

        // Fallback: verificar por el ancho del contenedor
        const container = document.querySelector('[data-container="folders"] .container-body');
        if (container) {
            const width = container.clientWidth;

            // Estimación por ancho
            if (width > 1000) {
                ;
                return 'extended';
            } else if (width > 700) {
                return 'double';
            }
        }
        return 'default';
    }

    function calculateItemsPerPage() {
        // Obtener el contenedor de carpetas
        const container = document.querySelector('[data-container="folders"] .container-body');
        if (!container) return 8;

        // Obtener el layout actual
        const layout = getCurrentLayout();

        const containerWidth = container.clientWidth;

        const arrowSpace = 80; // Espacio para ambas flechas
        const folderWidth = 95;
        const gap = 16;

        // Calcular cuántas carpetas caben teóricamente
        const itemsPerRow = Math.floor((containerWidth - arrowSpace) / (folderWidth + gap));

        // Aplicar límites según el layout
        switch (layout) {
            case 'widgets':
                // Layout con widgets: máximo 8 items
                return Math.min(8, Math.max(4, itemsPerRow));

            case 'extended':
                // Layout extendido: usar el cálculo real sin límite bajo
                return Math.min(11, Math.max(4, itemsPerRow));

            case 'double':
                // Layout doble: máximo 9-10 items
                return Math.min(10, Math.max(4, itemsPerRow));

            case 'default':
            default:
                // Layout por defecto: máximo 9 items
                return Math.min(9, Math.max(4, itemsPerRow));
        }
    }

    function attachArrowEvents(container, totalPages, itemsPerPage) {
        const leftArrow = container.querySelector('.folders-arrow-left');
        const rightArrow = container.querySelector('.folders-arrow-right');

        if (leftArrow) {
            const newLeftArrow = leftArrow.cloneNode(true);
            leftArrow.parentNode.replaceChild(newLeftArrow, leftArrow);

            newLeftArrow.addEventListener('click', () => {
                if (currentFoldersPage > 1) {
                    currentFoldersPage--;
                    RenderManager.renderFolders();
                }
            });
        }

        if (rightArrow) {
            const newRightArrow = rightArrow.cloneNode(true);
            rightArrow.parentNode.replaceChild(newRightArrow, rightArrow);

            newRightArrow.addEventListener('click', () => {
                if (currentFoldersPage < totalPages) {
                    currentFoldersPage++;
                    RenderManager.renderFolders();
                }
            });
        }
    }

    function updatePageInfo(totalPages) {
        // Buscar el botón de añadir
        const addButton = document.querySelector('.btn-add-folder, .btn-create-folder, [data-container="folders"] .btn-add');
        if (!addButton) return;

        // Buscar si ya existe un contador
        let pageInfo = addButton.parentNode.querySelector('.folders-page-info');

        if (totalPages <= 1) {
            if (pageInfo) {
                pageInfo.remove();
            }
            return;
        }

        if (!pageInfo) {
            pageInfo = document.createElement('span');
            pageInfo.className = 'folders-page-info';
            pageInfo.style.cursor = 'default'; // Asegurar cursor normal
            addButton.parentNode.insertBefore(pageInfo, addButton);
        }

        pageInfo.textContent = `${currentFoldersPage}/${totalPages}`;
    }

    function renderInFolder() {
        const container = document.getElementById('inFolderList');
        const emptyState = document.getElementById('emptyInFolder');
        const currentFolderId = StateManager.getState().currentFolder;

        if (!container) return;

        if (!currentFolderId) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.innerHTML = '<p>Selecciona una carpeta para ver su contenido</p>';
                emptyState.style.display = 'flex';
            }
            const btn = document.querySelector('[data-container="infolder"] .btn-add');
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
            }
            return;
        }

        const btn = document.querySelector('[data-container="infolder"] .btn-add');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }

        const bookmarks = StateManager.getBookmarks(currentFolderId, false);

        if (bookmarks.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.innerHTML = '<p>No hay marcadores en esta carpeta</p>';
                emptyState.style.display = 'flex';
            }
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = bookmarks.map(b => createBookmarkHTML(b)).join('');
        attachReorderButtons(container, 'bookmarks', currentFolderId);
        attachBookmarkEvents(container);
    }

    function createBookmarkHTML(b) {
        return `<li class="bookmark-item" data-bookmark-id="${b.id}">
            <img src="${b.icon}" alt="" class="bookmark-icon" onerror="this.src='assets/icons/default-bookmark.png'">
            <div class="bookmark-info">
                <div class="bookmark-title">${escapeHtml(b.title)}</div>
                <div class="bookmark-url">${escapeHtml(b.url)}</div>
            </div>
            <div class="bookmark-actions">
                <button class="btn-bookmark-action btn-favorite" data-action="favorite" data-bookmark-id="${b.id}" title="${b.isFavorite ? 'Quitar' : 'Añadir'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${b.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                </button>
                <button class="btn-bookmark-action btn-edit" data-action="edit" data-bookmark-id="${b.id}" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn-bookmark-action btn-delete" data-action="delete" data-bookmark-id="${b.id}" title="Eliminar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </li>`;
    }

    function attachBookmarkEvents(container) {
        container.querySelectorAll('[data-action="favorite"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                BookmarksManager.toggleFavorite(btn.dataset.bookmarkId);
            });
        });

        container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                BookmarksManager.openBookmarkModal(null, btn.dataset.bookmarkId);
            });
        });

        container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                BookmarksManager.deleteBookmark(btn.dataset.bookmarkId);
            });
        });

        container.querySelectorAll('.bookmark-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.bookmark-actions')) return;
                const b = StateManager.getBookmarkById(item.dataset.bookmarkId);
                if (b) window.open(b.url, '_blank');
            });
        });
    }

    function attachFolderEvents(container) {
        // Click en el folder para abrirlo
        container.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Si el click fue en el botón more o en el menú, no abrir la carpeta
                if (e.target.closest('.btn-more-folder') || e.target.closest('.context-menu')) return;
                FoldersManager.openFolder(item.dataset.folderId);
            });
        });

        // Click en el botón More de carpetas
        container.querySelectorAll('.btn-more-folder').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const itemId = btn.dataset.id;
                toggleContextMenuFolder(itemId);
            });
        });
    }

    function toggleContextMenuFolder(itemId) {
        const menu = document.querySelector(`.context-menu-folder[data-id="${itemId}"]`);
        const btn = document.querySelector(`.btn-more-folder[data-id="${itemId}"]`);

        if (!menu || !btn) {
            return;
        }

        // Si el menú ya está activo, cerrarlo
        if (menu.classList.contains('active')) {
            menu.classList.remove('active');

            // Restaurar el menú a su posición original
            const originalParent = document.querySelector(`[data-menu-parent="${itemId}"]`);
            if (originalParent) {
                originalParent.appendChild(menu);
                originalParent.removeAttribute('data-menu-parent');
            }

            // Limpiar estilos
            menu.style.position = '';
            menu.style.top = '';
            menu.style.bottom = '';
            menu.style.left = '';
            menu.style.right = '';
            return;
        }

        // Cerrar cualquier otro menú abierto
        document.querySelectorAll('.context-menu-folder.active').forEach(m => {
            m.classList.remove('active');
            const oldId = m.dataset.id;
            const oldParent = document.querySelector(`[data-menu-parent="${oldId}"]`);
            if (oldParent) {
                oldParent.appendChild(m);
                oldParent.removeAttribute('data-menu-parent');
            }
        });

        // Guardar referencia al padre original
        const originalParent = menu.parentNode;
        originalParent.setAttribute('data-menu-parent', itemId);

        // Mover el menú al final del body
        document.body.appendChild(menu);

        // Posicionar el menú
        const btnRect = btn.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const menuHeight = 256;

        const spaceBelow = viewportHeight - btnRect.bottom;
        const spaceAbove = btnRect.top;
        const leftPos = btnRect.right - 220;

        // Aplicar posición
        menu.style.position = 'fixed';

        if (spaceBelow >= menuHeight + 10) {
            menu.style.top = (btnRect.bottom + 5) + 'px';
            menu.style.bottom = 'auto';
            menu.style.left = leftPos + 'px';
            menu.classList.add('position-bottom');
        } else if (spaceAbove >= menuHeight + 10) {
            menu.style.top = 'auto';
            menu.style.bottom = (viewportHeight - btnRect.top + 5) + 'px';
            menu.style.left = leftPos + 'px';
            menu.classList.add('position-top');
        } else {
            menu.style.top = (btnRect.bottom + 5) + 'px';
            menu.style.bottom = 'auto';
            menu.style.left = leftPos + 'px';
            menu.classList.add('position-bottom');
        }

        // RE-ASIGNAR EVENTOS a los items del menú
        attachFolderMenuEvents(menu, itemId);

        // Activar menú
        menu.classList.add('active');
    }

    function attachFolderMenuEvents(menu, folderId) {
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            // Eliminar eventos anteriores para evitar duplicados
            item.removeEventListener('click', handleFolderMenuItemClick);
            // Añadir nuevo evento
            item.addEventListener('click', handleFolderMenuItemClick);
        });
    }

    function handleFolderMenuItemClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const item = e.currentTarget;
        const action = item.dataset.action;
        const folderId = item.dataset.folderId;
        const itemId = item.dataset.id;
        const collection = item.dataset.collection;

        // Cerrar el menú después de hacer clic
        if (window.closeAllContextMenus) {
            window.closeAllContextMenus();
        }

        // Ejecutar la acción correspondiente
        switch (action) {
            case 'edit':
                if (window.FoldersManager) {
                    FoldersManager.openFolderModal(folderId);
                }
                break;
            case 'delete':
                if (window.FoldersManager) {
                    FoldersManager.deleteFolder(folderId);
                }
                break;
            case 'favorite-folder':
                StateManager.toggleFolderFavorite(folderId);
                RenderManager.renderFolders();
                break;
            case 'move-up':
                if (window.ReorderManager) {
                    ReorderManager.moveUp(collection, itemId, null);
                }
                break;
            case 'move-down':
                if (window.ReorderManager) {
                    ReorderManager.moveDown(collection, itemId, null);
                }
                break;
            default:
        }
    }

    function updateFolderNavigation() {
        const fid = StateManager.getState().currentFolder;
        const nameEl = document.getElementById('currentFolderName');
        const btnBack = document.getElementById('btnBackToFolders');
        const infolder = document.querySelector('[data-container="infolder"]');

        if (fid) {
            const f = StateManager.getFolderById(fid);
            if (f) nameEl.textContent = `${f.icon} ${f.name}`;
            if (btnBack) btnBack.classList.remove('hidden');
            if (infolder) infolder.style.display = 'flex';
        } else {
            nameEl.textContent = 'Contenido';
            if (btnBack) btnBack.classList.add('hidden');
        }
    }

    function resetPage() {
        currentPage = 1;
    }

    function renderAll() {
        renderFavorites();
        renderFolders();
        renderInFolder();
        updateFolderNavigation();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        renderAll,
        renderFavorites,
        renderFolders,
        renderInFolder,
        updateFolderNavigation,
        renderFavoritesGrid,
        resetPage,
        updateFavoritesButton
    };
})();

window.addEventListener('containerDisplayChanged', (e) => {
    if (e.detail.container === 'favbookmarks') {
        setTimeout(() => {
            if (e.detail.display === 'grid-8') {
                RenderManager.renderFavoritesGrid(e.detail.display);
            } else {
                RenderManager.renderFavorites();
            }
        }, 0);
    }
    // Para cambios de layout, siempre re-renderizar carpetas
    setTimeout(() => {
        RenderManager.renderFolders();
    }, 50);
});

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (document.querySelector('[data-container="folders"]')) {
            RenderManager.renderFolders();
        }
    }, 150); // Esperar 150ms después de que termine el resize
});

const dashboardObserver = new MutationObserver(() => {
    RenderManager.renderFolders();
});

const dashboard = document.querySelector('.dashboard');
if (dashboard) {
    dashboardObserver.observe(dashboard, {
        attributes: true,
        attributeFilter: ['class']
    });
}
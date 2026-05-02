const RecentBookmarksWidget = (() => {
    // Número de marcadores a mostrar
    const DISPLAY_COUNT = 5;

    // Obtener últimos marcadores
    function getRecentBookmarks() {
        const bookmarks = StateManager.getBookmarks();
        // Ordenar por createdAt (más reciente primero)
        const sorted = [...bookmarks].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : 0;
            const dateB = b.createdAt ? new Date(b.createdAt) : 0;
            return dateB - dateA;
        });
        return sorted.slice(0, DISPLAY_COUNT);
    }

    // Formatear fecha relativa
    function formatRelativeDate(dateString) {
        if (!dateString) return 'Reciente';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora mismo';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours} h`;
        if (diffDays === 1) return 'Ayer';
        return `Hace ${diffDays} días`;
    }

    // Obtener favicon
    function getFaviconUrl(url) {
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=16`;
        } catch {
            return '';
        }
    }

    // Renderizar preview
    function renderPreview(config, widgetId) {
        const recent = getRecentBookmarks();
        const totalCount = StateManager.getBookmarks().length;

        if (recent.length === 0) {
            return `
                <div class="recent-bookmarks-empty">
                    <span>🔖</span>
                    <p>No hay marcadores aún</p>
                    <small>Añade tu primer marcador</small>
                </div>
            `;
        }

        return `
            <div class="recent-bookmarks-preview">
                <div class="recent-list">
                    ${recent.map(bookmark => `
                        <div class="recent-item-preview" data-url="${bookmark.url}">
                            <img src="${getFaviconUrl(bookmark.url)}" alt="" class="recent-favicon" 
                                 onerror="this.style.display='none'">
                            <span class="recent-title">${escapeHtml(bookmark.title || bookmark.url)}</span>
                        </div>
                    `).join('')}
                </div>
                ${totalCount > DISPLAY_COUNT ? `<div class="recent-more">+${totalCount - DISPLAY_COUNT} marcadores</div>` : ''}
            </div>
        `;
    }

    // Renderizar expandido
    function renderExpanded(config, widgetId) {
        const recent = getRecentBookmarks();

        if (recent.length === 0) {
            return `
                <div class="recent-bookmarks-empty expanded">
                    <span>🔖</span>
                    <h4>No hay marcadores aún</h4>
                    <p>Comienza a guardar tus sitios favoritos</p>
                    <button class="btn-goto-bookmarks">Ir a marcadores</button>
                </div>
            `;
        }

        return `
            <div class="recent-bookmarks-full">
                <div class="recent-header">
                    <h4>Últimos marcadores</h4>
                    <button class="recent-refresh" title="Actualizar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6"/>
                            <path d="M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
                            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
                        </svg>
                    </button>
                </div>
                <div class="recent-list-full">
                    ${recent.map(bookmark => `
                        <div class="recent-item-full" data-url="${bookmark.url}">
                            <div class="recent-item-info">
                                <img src="${getFaviconUrl(bookmark.url)}" alt="" class="recent-favicon" 
                                     onerror="this.style.display='none'">
                                <div class="recent-details">
                                    <div class="recent-title">${escapeHtml(bookmark.title || bookmark.url)}</div>
                                    <div class="recent-url">${escapeHtml(bookmark.url)}</div>
                                </div>
                            </div>
                            <div class="recent-meta">
                                <span class="recent-date">${formatRelativeDate(bookmark.createdAt)}</span>
                                <button class="recent-open-btn" title="Abrir enlace">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                        <polyline points="15 3 21 3 21 9"/>
                                        <line x1="10" y1="14" x2="21" y2="3"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Inicializar preview
    function initPreview(element, config) {
        const items = element.querySelectorAll('.recent-item-preview');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                if (url) window.open(url, '_blank');
            });
        });
    }

    // Inicializar expandido
    function initExpanded(element, config) {
        function refreshContent() {
            const container = element.closest('[data-container]');
            if (container && WidgetManager) {
                const containerId = container.dataset.container;
                WidgetManager.renderWidgetInContainer(containerId);
            }
        }

        // Abrir enlaces
        const items = element.querySelectorAll('.recent-item-full');
        items.forEach(item => {
            const url = item.dataset.url;
            const openBtn = item.querySelector('.recent-open-btn');

            item.addEventListener('click', (e) => {
                if (openBtn && openBtn.contains(e.target)) return;
                if (url) window.open(url, '_blank');
            });

            if (openBtn) {
                openBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (url) window.open(url, '_blank');
                });
            }
        });

        // Botón refrescar
        const refreshBtn = element.querySelector('.recent-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshContent);
        }

        // Botón ir a marcadores
        const gotoBtn = element.querySelector('.btn-goto-bookmarks');
        if (gotoBtn) {
            gotoBtn.addEventListener('click', () => {
                // Cambiar al layout que muestra marcadores
                const event = new CustomEvent('switchToBookmarks');
                document.dispatchEvent(event);
            });
        }
    }

    function destroy(element) {
        // Limpiar eventos
        const refreshBtn = element.querySelector('.recent-refresh');
        if (refreshBtn) {
            const newBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newBtn, refreshBtn);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        id: 'recent-bookmarks',
        name: 'Últimos marcadores',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 28 28"><path fill="currentColor" d="M6 6.75A3.25 3.25 0 0 1 9.25 3.5h9.5A3.25 3.25 0 0 1 22 6.75v18a.75.75 0 0 1-1.203.598L14 20.19l-6.797 5.157A.75.75 0 0 1 6 24.75zM9.25 5A1.75 1.75 0 0 0 7.5 6.75v16.49l6.047-4.587a.75.75 0 0 1 .906 0L20.5 23.24V6.75A1.75 1.75 0 0 0 18.75 5z"/></svg>',
        description: 'Tus últimos 5 marcadores guardados',
        renderPreview,
        renderExpanded,
        initPreview,
        initExpanded,
        destroy
    };
})();

window.RecentBookmarksWidget = RecentBookmarksWidget;
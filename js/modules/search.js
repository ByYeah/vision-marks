const SearchManager = (function () {
    // Estado interno
    let searchInput = null;
    let resultsDropdown = null;
    let searchTimeout = null;
    let currentResults = [];
    let selectedIndex = -1;
    let isSearchActive = false;

    // Configuración
    const DEBOUNCE_TIME = 300; // ms
    const MAX_RESULTS = 50;

    // Inicializar el buscador
    function init() {
        searchInput = document.getElementById('searchInput');
        if (!searchInput) {
            console.warn('Search input not found');
            return;
        }

        createDropdown();
        bindEvents();
        addKeyboardShortcut();

        console.log('🔍 SearchManager initialized');
    }

    // Crear el dropdown de resultados
    function createDropdown() {
    const existingDropdown = document.querySelector('.search-results-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    
    resultsDropdown = document.createElement('div');
    resultsDropdown.className = 'search-results-dropdown';
    
    // Buscar el contenedor
    const searchContainer = searchInput.closest('.search-bar');
    
    if (searchContainer) {
        searchContainer.appendChild(resultsDropdown);
    } else {
        // Fallback si no encuentra .search-bar
        document.body.appendChild(resultsDropdown);
    }
}

    // Bindear eventos
    function bindEvents() {
        if (!searchInput) return;

        // Evento de input con debounce
        searchInput.addEventListener('input', handleInput);

        // Eventos de teclado
        searchInput.addEventListener('keydown', handleKeyDown);

        // Cerrar al hacer clic fuera
        document.addEventListener('click', handleClickOutside);

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isSearchActive) {
                clearSearch();
            }
        });
    }

    // Manejador de input
    function handleInput(e) {
        const query = e.target.value.trim();

        // Limpiar timeout anterior
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        if (query.length < 2) {
            hideResults();
            return;
        }

        // Debounce para no buscar en cada letra
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, DEBOUNCE_TIME);
    }

    // Realizar la búsqueda
    function performSearch(query) {
        if (!window.StateManager) return;

        const state = StateManager.getState();
        const bookmarks = state.bookmarks || [];
        const folders = state.folders || [];

        // Normalizar query
        const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Buscar en marcadores
        const results = bookmarks
            .map(bookmark => {
                const title = bookmark.title || '';
                const url = bookmark.url || '';

                // Normalizar texto para búsqueda
                const normalizedTitle = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const normalizedUrl = url.toLowerCase();

                // Calcular relevancia
                let relevance = 0;
                if (normalizedTitle.includes(normalizedQuery)) relevance += 10;
                if (normalizedUrl.includes(normalizedQuery)) relevance += 5;
                if (title.toLowerCase().includes(query.toLowerCase())) relevance += 3;

                // Buscar palabra exacta
                const words = normalizedQuery.split(' ');
                words.forEach(word => {
                    if (normalizedTitle.includes(word)) relevance += 2;
                    if (normalizedUrl.includes(word)) relevance += 1;
                });

                // Encontrar carpeta padre
                const folder = folders.find(f => f.id === bookmark.folderId);

                return {
                    ...bookmark,
                    relevance,
                    folderName: folder ? folder.name : 'Sin carpeta',
                    folderIcon: folder ? folder.icon : '📁',
                    matchType: getMatchType(bookmark, normalizedQuery)
                };
            })
            .filter(bookmark => bookmark.relevance > 0)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, MAX_RESULTS);

        currentResults = results;
        selectedIndex = results.length > 0 ? 0 : -1;

        renderResults(results);
    }

    // Determinar tipo de coincidencia
    function getMatchType(bookmark, query) {
        const title = (bookmark.title || '').toLowerCase();
        const url = (bookmark.url || '').toLowerCase();

        if (title.includes(query)) return 'title';
        if (url.includes(query)) return 'url';
        return 'partial';
    }

    // Renderizar resultados
    function renderResults(results) {
        if (!resultsDropdown) return;

        if (results.length === 0) {
            resultsDropdown.innerHTML = `
                <div class="search-no-results">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <p>No se encontraron marcadores</p>
                    <small>Intenta con otras palabras</small>
                </div>
            `;
            resultsDropdown.classList.add('active');
            isSearchActive = true;
            return;
        }

        let html = '';
        results.forEach((result, index) => {
            const isSelected = index === selectedIndex;
            const folderDisplay = result.folderName !== 'Sin carpeta'
                ? `${result.folderIcon} ${result.folderName}`
                : '📂 Sin carpeta';

            html += `
                <div class="search-result-item ${isSelected ? 'selected' : ''}" 
                     data-id="${result.id}"
                     data-index="${index}">
                    <div class="result-icon">
                        ${result.icon ?
                    `<img src="${result.icon}" alt="" onerror="this.style.display='none'">` :
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><line x1="4" y1="8" x2="20" y2="8"/></svg>'
                }
                    </div>
                    <div class="result-content">
                        <div class="result-title">
                            ${highlightText(result.title || 'Sin título', searchInput.value)}
                        </div>
                        <div class="result-url">
                            ${highlightText(result.url || '', searchInput.value)}
                        </div>
                        <div class="result-folder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/>
                            </svg>
                            ${folderDisplay}
                        </div>
                    </div>
                    ${result.isFavorite ? `
                        <div class="result-favorite">
                            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <polygon points="12 2 15 9 22 9 16 14 19 22 12 17 5 22 8 14 2 9 9 9 12 2"/>
                            </svg>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        resultsDropdown.innerHTML = html;
        resultsDropdown.classList.add('active');
        isSearchActive = true;

        // Añadir event listeners a los resultados
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const bookmark = results.find(r => r.id === id);
                if (bookmark) {
                    openBookmark(bookmark);
                }
            });

            item.addEventListener('mouseenter', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                if (!isNaN(index)) {
                    updateSelectedIndex(index);
                }
            });
        });
    }

    // Resaltar texto coincidente
    function highlightText(text, query) {
        if (!query || query.length < 2) return text;

        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark style="background: #ffd700; color: #000; padding: 0 2px; border-radius: 2px;">$1</mark>');
    }

    // Manejador de teclas
    function handleKeyDown(e) {
        if (!isSearchActive || currentResults.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                updateSelectedIndex(selectedIndex + 1);
                break;

            case 'ArrowUp':
                e.preventDefault();
                updateSelectedIndex(selectedIndex - 1);
                break;

            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
                    openBookmark(currentResults[selectedIndex]);
                }
                break;

            case 'Escape':
                clearSearch();
                break;
        }
    }

    // Actualizar índice seleccionado
    function updateSelectedIndex(newIndex) {
        if (newIndex < 0) newIndex = currentResults.length - 1;
        if (newIndex >= currentResults.length) newIndex = 0;

        selectedIndex = newIndex;

        // Actualizar clases
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.classList.remove('selected');
        });

        const selectedItem = document.querySelector(`.search-result-item[data-index="${selectedIndex}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }

    // Abrir marcador
    function openBookmark(bookmark) {
        if (bookmark && bookmark.url) {
            window.open(bookmark.url, '_blank');
            clearSearch();
        }
    }

    // Cerrar dropdown
    function hideResults() {
        if (resultsDropdown) {
            resultsDropdown.classList.remove('active');
        }
        isSearchActive = false;
        currentResults = [];
    }

    // Limpiar búsqueda
    function clearSearch() {
        if (searchInput) {
            searchInput.value = '';
        }
        hideResults();
        selectedIndex = -1;
    }

    // Manejador de clic fuera
    function handleClickOutside(e) {
        if (!searchInput || !resultsDropdown) return;

        if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
            hideResults();
        }
    }

    // Añadir atajo de teclado (Ctrl/Cmd + K)
    function addKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }

            // Slash para buscar
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement !== searchInput) {
                e.preventDefault();
                if (searchInput) {
                    searchInput.focus();
                }
            }
        });
    }

    // API pública
    return {
        init,
        search: performSearch,
        clear: clearSearch,
        getResults: () => currentResults,
        isActive: () => isSearchActive
    };
})();

// Exportar global
window.SearchManager = SearchManager;
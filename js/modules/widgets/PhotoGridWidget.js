const PhotoGridWidget = (() => {
    const DEFAULT_IMAGES = [null, null, null, null, null, null, null, null, null];
    const STORAGE_KEY = 'widget_photo_grid';

    function loadStoredImages(widgetId) {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY}_${widgetId}`);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading photo grid:', error);
        }
        return [...DEFAULT_IMAGES];
    }

    function saveImages(widgetId, images) {
        try {
            localStorage.setItem(`${STORAGE_KEY}_${widgetId}`, JSON.stringify(images));
        } catch (error) {
            console.error('Error saving photo grid:', error);
        }
    }

    // Obtener primeras 4 imágenes no nulas
    function getPreviewImages(images) {
        const existingImages = images.filter(img => img !== null);
        const result = [];
        for (let i = 0; i < 4; i++) {
            result.push(existingImages[i] || null);
        }
        return result;
    }

    function renderPreview(config, widgetId) {
        const images = loadStoredImages(widgetId);
        const previewImages = getPreviewImages(images);
        
        return `
            <div class="photo-grid-preview" data-widget-id="${widgetId}">
                <div class="photo-grid-mini">
                    ${previewImages.map(img => `
                        <div class="photo-mini-cell">
                            ${img ? `<img src="${img}" alt="Preview" style="width:100%;height:100%;object-fit:cover;">` : '<div class="photo-placeholder-empty"></div>'}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderExpanded(config, widgetId) {
        const images = loadStoredImages(widgetId);
        return `
            <div class="photo-grid-full" data-widget-id="${widgetId}">
                <div class="photo-grid-header">
                    <h4>Galería de Visión</h4>
                    <button class="photo-grid-reset" title="Resetear todas las imágenes">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                    </button>
                </div>
                <div class="photo-grid-scroll-container">
                    <div class="photo-grid-container">
                        ${images.map((img, index) => `
                            <div class="photo-grid-cell" data-index="${index}">
                                ${img ? `
                                    <img src="${img}" alt="Vision ${index + 1}" style="width:100%;height:100%;object-fit:cover;">
                                    <button class="photo-remove-btn" data-index="${index}" title="Eliminar">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="18" y1="6" x2="6" y2="18"/>
                                            <line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </button>
                                ` : `
                                    <div class="photo-empty-cell">
                                        <span>+</span>
                                        <small>Añadir</small>
                                    </div>
                                `}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    function initPreview(element, config) {
        // No necesita inicialización
    }

    function initExpanded(element, config) {
        const widgetContainer = element.closest('[data-container]');
        const widgetId = widgetContainer?.dataset.container;
        if (!widgetId) return;

        let images = loadStoredImages(widgetId);

        function refreshGrid() {
            const container = element.querySelector('.photo-grid-container');
            if (!container) return;

            container.innerHTML = images.map((img, index) => `
                <div class="photo-grid-cell" data-index="${index}">
                    ${img ? `
                        <img src="${img}" alt="Vision ${index + 1}" style="width:100%;height:100%;object-fit:cover;">
                        <button class="photo-remove-btn" data-index="${index}" title="Eliminar">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    ` : `
                        <div class="photo-empty-cell">
                            <span>+</span>
                            <small>Añadir</small>
                        </div>
                    `}
                </div>
            `).join('');

            attachEvents();
            updatePreview();
        }

        function updatePreview() {
            // Buscar el preview en el mismo contenedor
            const container = document.querySelector(`[data-container="${widgetId}"]`);
            const previewElement = container?.querySelector('.photo-grid-preview');
            if (previewElement) {
                const previewImages = getPreviewImages(images);
                const miniGrid = previewElement.querySelector('.photo-grid-mini');
                if (miniGrid) {
                    miniGrid.innerHTML = previewImages.map(img => `
                        <div class="photo-mini-cell">
                            ${img ? `<img src="${img}" alt="Preview" style="width:100%;height:100%;object-fit:cover;">` : '<div class="photo-placeholder-empty"></div>'}
                        </div>
                    `).join('');
                }
            }
        }

        function handleAddImage(index) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        images[index] = event.target.result;
                        saveImages(widgetId, images);
                        refreshGrid();
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        }

        function handleRemoveImage(index) {
            images[index] = null;
            saveImages(widgetId, images);
            refreshGrid();
        }

        function attachEvents() {
            const cells = element.querySelectorAll('.photo-grid-cell');
            cells.forEach(cell => {
                
                // Remover eventos anteriores
                const newCell = cell.cloneNode(true);
                cell.parentNode.replaceChild(newCell, cell);
                
                const newRemoveBtn = newCell.querySelector('.photo-remove-btn');
                const newIndex = parseInt(newCell.dataset.index);
                
                newCell.addEventListener('click', (e) => {
                    if (newRemoveBtn && newRemoveBtn.contains(e.target)) return;
                    handleAddImage(newIndex);
                });

                if (newRemoveBtn) {
                    newRemoveBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        handleRemoveImage(newIndex);
                    });
                }
            });
        }

        const resetBtn = element.querySelector('.photo-grid-reset');
        if (resetBtn) {
            const newResetBtn = resetBtn.cloneNode(true);
            resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
            newResetBtn.addEventListener('click', () => {
                if (confirm('¿Eliminar todas las imágenes de esta galería?')) {
                    images = [...DEFAULT_IMAGES];
                    saveImages(widgetId, images);
                    refreshGrid();
                }
            });
        }
        refreshGrid();
    }

    function destroy(element) {
        const resetBtn = element.querySelector('.photo-grid-reset');
        if (resetBtn) {
            const newBtn = resetBtn.cloneNode(true);
            resetBtn.parentNode.replaceChild(newBtn, resetBtn);
        }
    }

    return {
        id: 'photo-grid',
        name: 'Photo Grid',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><path fill="currentColor" fill-rule="nonzero" d="M22.993 6.008A3.24 3.24 0 0 1 24.5 8.75v10.5c0 2.9-2.35 5.25-5.25 5.25H8.75a3.25 3.25 0 0 1-2.744-1.507l.122.005.122.002h13A3.75 3.75 0 0 0 23 19.25v-13q0-.122-.007-.242M18.75 3A3.25 3.25 0 0 1 22 6.25v12.5A3.25 3.25 0 0 1 18.75 22H6.25A3.25 3.25 0 0 1 3 18.75V6.25A3.25 3.25 0 0 1 6.25 3zm.582 17.401-6.307-6.178a.75.75 0 0 0-.966-.07l-.084.07-6.307 6.178q.275.098.582.099h12.5q.307-.002.582-.099l-6.307-6.178zM18.75 4.5H6.25A1.75 1.75 0 0 0 4.5 6.25v12.5q.001.314.103.593l6.322-6.192a2.25 2.25 0 0 1 3.02-.116l.13.116 6.322 6.193q.102-.28.103-.594V6.25a1.75 1.75 0 0 0-1.75-1.75M16 7.751a1.25 1.25 0 1 1 0 2.499 1.25 1.25 0 0 1 0-2.499"/></svg>',
        description: 'Galería de imágenes para tu visión board',
        renderPreview,
        renderExpanded,
        initPreview,
        initExpanded,
        destroy
    };
})();
window.PhotoGridWidget = PhotoGridWidget;
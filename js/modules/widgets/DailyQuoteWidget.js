const DailyQuoteWidget = (() => {
    // Almacenamiento en localStorage
    const STORAGE_KEY = 'widget_daily_quote';
    const API_URL = 'https://www.positive-api.online/phrase/esp';
    // Frases de respaldo en caso de que la API falle
    const FALLBACK_QUOTES = [
        { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
        { text: "No sueñes tu vida, vive tus sueños.", author: "Anónimo" },
        { text: "La única forma de hacer un gran trabajo es amar lo que haces.", author: "Steve Jobs" },
        { text: "El futuro pertenece a quienes creen en la belleza de sus sueños.", author: "Eleanor Roosevelt" },
        { text: "Cree en ti mismo y todo será posible.", author: "Anónimo" },
        { text: "La perseverancia es la clave del éxito.", author: "Anónimo" },
        { text: "Hazlo ahora. A veces, el 'después' se convierte en 'nunca'.", author: "Anónimo" }
    ];

    // Funciones Auxiliares
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Almacenamiento
    function loadStoredQuote() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading stored quote:', error);
        }
        return null;
    }

    function saveQuoteToStorage(quoteObject) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(quoteObject));
        } catch (error) {
            console.error('Error saving quote to storage:', error);
        }
    }

    // Obtener cita guardada o de respaldo
    function getStoredOrFallbackQuote() {
        const storedQuote = loadStoredQuote();
        const today = new Date().toDateString();
        
        if (storedQuote && storedQuote.date === today) {
            return storedQuote;
        }
        
        // Si no hay cita guardada o es de otro día, usar una de respaldo
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const fallbackQuote = FALLBACK_QUOTES[dayOfYear % FALLBACK_QUOTES.length];
        
        // Guardar la cita de respaldo para futuras cargas
        saveQuoteToStorage({
            ...fallbackQuote,
            date: today
        });
        return fallbackQuote;
    }

    // Llamada a la API
    async function fetchQuoteFromAPI() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            const data = await response.json();
            if (data && data.texto && data.autor) {
                return {
                    text: data.texto,
                    author: data.autor
                };
            } else {
                throw new Error('Invalid data structure from API');
            }
        } catch (error) {
            console.error('Error fetching quote from API:', error);
            return null;
        }
    }

    // Renderizado del Widget
    function renderPreview(config, widgetId) {
        const quote = getStoredOrFallbackQuote();
        const displayText = quote.text.length > 60 ? quote.text.substring(0, 60) + '...' : quote.text;

        return `
            <div class="daily-quote-preview" data-widget-id="${widgetId}">
                <div class="quote-icon">💬</div>
                <div class="quote-text-preview">"${escapeHtml(displayText)}"</div>
                <div class="quote-author-preview">— ${escapeHtml(quote.author)}</div>
            </div>
        `;
    }

    function renderExpanded(config, widgetId) {
        const quote = getStoredOrFallbackQuote();
        return `
            <div class="daily-quote-full" data-widget-id="${widgetId}">
                <div class="quote-header">
                    <h4>Cita del día</h4>
                    <button class="quote-refresh" title="Nueva cita">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6"/>
                            <path d="M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
                            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
                        </svg>
                    </button>
                </div>
                <div class="quote-content">
                    <div class="quote-mark">"</div>
                    <div class="quote-text">${escapeHtml(quote.text)}</div>
                    <div class="quote-author">— ${escapeHtml(quote.author)}</div>
                </div>
                <div class="quote-actions">
                    <button class="quote-copy-btn" title="Copiar cita">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copiar
                    </button>
                </div>
            </div>
        `;
    }

    // Inicialización y Eventos
    function initPreview(element, config) {
        // El preview ya se carga con la cita guardada en renderPreview.
    }

    async function initExpanded(element, config, containerId) {
        const refreshWithApiQuote = async () => {
            const apiQuote = await fetchQuoteFromAPI();
            
            if (apiQuote) {
                // Guardar la nueva cita
                const quoteToSave = {
                    ...apiQuote,
                    date: new Date().toDateString()
                };
                saveQuoteToStorage(quoteToSave);
                
                // Actualizar el DOM del widget expandido
                const quoteTextDiv = element.querySelector('.quote-text');
                const quoteAuthorDiv = element.querySelector('.quote-author');
                if (quoteTextDiv && quoteAuthorDiv) {
                    quoteTextDiv.textContent = apiQuote.text;
                    quoteAuthorDiv.textContent = `— ${apiQuote.author}`;
                }

                // También actualizar el preview en el mismo contenedor
                const previewContainer = document.querySelector(`[data-container="${containerId}"] .daily-quote-preview`);
                if (previewContainer) {
                    const displayText = apiQuote.text.length > 60 ? apiQuote.text.substring(0, 60) + '...' : apiQuote.text;
                    previewContainer.innerHTML = `
                        <div class="quote-icon">💬</div>
                        <div class="quote-text-preview">"${escapeHtml(displayText)}"</div>
                        <div class="quote-author-preview">— ${escapeHtml(apiQuote.author)}</div>
                    `;
                }
            } else {
                const quoteTextDiv = element.querySelector('.quote-text');
                if (quoteTextDiv) {
                    quoteTextDiv.textContent = "No se pudo cargar una nueva cita en este momento. Intenta de nuevo más tarde.";
                }
            }
        };

        // Botón refrescar
        const refreshBtn = element.querySelector('.quote-refresh');
        if (refreshBtn) {
            const newRefreshBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
            newRefreshBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await refreshWithApiQuote();
            });
        }

        // Botón copiar
        const copyBtn = element.querySelector('.quote-copy-btn');
        if (copyBtn) {
            const newCopyBtn = copyBtn.cloneNode(true);
            copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
            newCopyBtn.addEventListener('click', async () => {
                const quoteText = element.querySelector('.quote-text')?.textContent || '';
                const quoteAuthor = element.querySelector('.quote-author')?.textContent?.replace('— ', '') || '';
                const fullQuote = `"${quoteText}" — ${quoteAuthor}`;
                try {
                    await navigator.clipboard.writeText(fullQuote);
                    showCopyFeedback(newCopyBtn);
                } catch (error) {
                    console.error('Error copying quote:', error);
                }
            });
        }
    }

    function showCopyFeedback(btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ¡Copiado!';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }

    function destroy(element) {
        const refreshBtn = element.querySelector('.quote-refresh');
        if (refreshBtn) {
            const newBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newBtn, refreshBtn);
        }
        const copyBtn = element.querySelector('.quote-copy-btn');
        if (copyBtn) {
            const newBtn = copyBtn.cloneNode(true);
            copyBtn.parentNode.replaceChild(newBtn, copyBtn);
        }
    }

    return {
        id: 'daily-quote',
        name: 'Cita del día',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="nonzero" d="M7.5 6a2.5 2.5 0 0 1 2.495 2.336l.005.206c-.01 3.555-1.24 6.614-3.705 9.223a.75.75 0 1 1-1.09-1.03c1.64-1.737 2.66-3.674 3.077-5.859q-.372.122-.782.124a2.5 2.5 0 0 1 0-5m9 0a2.5 2.5 0 0 1 2.495 2.336l.005.206c-.01 3.56-1.237 6.614-3.705 9.223a.75.75 0 0 1-1.09-1.03c1.643-1.738 2.662-3.672 3.078-5.859A2.5 2.5 0 1 1 16.5 6m-9 1.5a1 1 0 1 0 .993 1.117l.007-.124a1 1 0 0 0-1-.993m9 0a1 1 0 1 0 .993 1.117l.007-.124a1 1 0 0 0-1-.993"/></svg>',
        description: 'Inspiración diaria para mantener la motivación',
        renderPreview,
        renderExpanded,
        initPreview,
        initExpanded,
        destroy
    };
})();
window.DailyQuoteWidget = DailyQuoteWidget;
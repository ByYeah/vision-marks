const DailyQuoteWidget = (() => {
    // Frases predeterminadas
    const DEFAULT_QUOTES = [
        { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
        { text: "No sueñes tu vida, vive tus sueños.", author: "Anónimo" },
        { text: "La única forma de hacer un gran trabajo es amar lo que haces.", author: "Steve Jobs" },
        { text: "El futuro pertenece a quienes creen en la belleza de sus sueños.", author: "Eleanor Roosevelt" },
        { text: "Cree en ti mismo y todo será posible.", author: "Anónimo" },
        { text: "La perseverancia es la clave del éxito.", author: "Anónimo" },
        { text: "Hazlo ahora. A veces, el 'después' se convierte en 'nunca'.",
          author: "Anónimo" }
    ];
    
    const STORAGE_KEY = 'widget_daily_quote';
    
    // Obtener cita del día (cambia según la fecha)
    function getQuoteOfTheDay() {
        const today = new Date().toDateString();
        
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                if (data.date === today) {
                    return data.quote;
                }
            }
        } catch (error) {
            console.error('Error loading quote:', error);
        }
        
        // Generar nueva cita basada en el día del año
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const index = dayOfYear % DEFAULT_QUOTES.length;
        const quote = DEFAULT_QUOTES[index];
        
        // Guardar
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                date: today,
                quote: quote
            }));
        } catch (error) {
            console.error('Error saving quote:', error);
        }
        
        return quote;
    }
    
    // Renderizar preview
    function renderPreview(config, widgetId) {
        const quote = getQuoteOfTheDay();
        
        return `
            <div class="daily-quote-preview">
                <div class="quote-icon">💬</div>
                <div class="quote-text-preview">"${escapeHtml(quote.text.substring(0, 60))}${quote.text.length > 60 ? '...' : ''}"</div>
                <div class="quote-author-preview">— ${escapeHtml(quote.author)}</div>
            </div>
        `;
    }
    
    // Renderizar expandido
    function renderExpanded(config, widgetId) {
        const quote = getQuoteOfTheDay();
        
        return `
            <div class="daily-quote-full">
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
    
    // Inicializar preview
    function initPreview(element, config) {
        // No necesita inicialización especial
    }
    
    // Inicializar expandido
    function initExpanded(element, config) {
        // Botón refrescar (nueva cita aleatoria)
        const refreshBtn = element.querySelector('.quote-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                // Forzar nueva cita
                const today = new Date().toDateString();
                const quotes = [...DEFAULT_QUOTES];
                const randomIndex = Math.floor(Math.random() * quotes.length);
                const newQuote = quotes[randomIndex];
                
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({
                        date: today,
                        quote: newQuote
                    }));
                } catch (error) {
                    console.error('Error saving quote:', error);
                }
                
                // Actualizar UI
                const container = element.closest('[data-container]');
                if (container && WidgetManager) {
                    const containerId = container.dataset.container;
                    WidgetManager.renderWidgetInContainer(containerId);
                }
            });
        }
        
        // Botón copiar
        const copyBtn = element.querySelector('.quote-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const quoteText = element.querySelector('.quote-text')?.textContent || '';
                const quoteAuthor = element.querySelector('.quote-author')?.textContent || '';
                const fullQuote = `"${quoteText}" ${quoteAuthor}`;
                
                try {
                    await navigator.clipboard.writeText(fullQuote);
                    showCopyFeedback(copyBtn);
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
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    return {
        id: 'daily-quote',
        name: 'Cita del día',
        icon: '💬',
        description: 'Inspiración diaria para mantener la motivación',
        renderPreview,
        renderExpanded,
        initPreview,
        initExpanded,
        destroy
    };
})();

window.DailyQuoteWidget = DailyQuoteWidget;
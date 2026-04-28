let widgetsRegistered = false;

function registerAllWidgets() {
    // Evitar registro duplicado
    if (widgetsRegistered) {
        console.log('Widgets ya registrados anteriormente, omitiendo');
        return true;
    }
    
    if (!window.WidgetManager) {
        console.error('❌ WidgetManager no está disponible');
        return false;
    }
    
    let registered = 0;
    const widgetsToRegister = [
        window.PhotoGridWidget,
        window.RecentBookmarksWidget,
        window.DailyQuoteWidget,
        window.GoalsCounterWidget
    ];
    
    for (const widget of widgetsToRegister) {
        if (widget && typeof widget === 'object') {
            if (widget.id && widget.name) {
                const success = WidgetManager.registerWidget(widget);
                if (success) registered++;
            } else {
                console.warn('⚠️ Widget inválido (faltan id/name):', widget);
            }
        } else {
            console.warn('⚠️ Widget no disponible:', widget);
        }
    }
    
    widgetsRegistered = true;
    return registered > 0;
}

window.registerAllWidgets = registerAllWidgets;
const ImportExportManager = (function () {
    // Formatos soportados
    const SUPPORTED_FORMATS = {
        VISION_MARKS: 'vision-marks',
        CHROME: 'chrome',
        FIREFOX: 'firefox',
        EDGE: 'edge',
        BRAVE: 'brave',
        HTML: 'html'  // Formato estándar de marcadores
    };

    // Versión actual del formato
    const CURRENT_VERSION = '1.0';

    // Exportar marcadores a JSON
    async function exportToJSON() {
        try {
            const state = StateManager.getState();

            // Preparar datos para exportar
            const exportData = {
                version: CURRENT_VERSION,
                exportDate: new Date().toISOString(),
                source: 'vision-marks',
                data: {
                    folders: state.folders.map(f => ({
                        id: f.id,
                        name: f.name,
                        icon: f.icon,
                        isFavorite: f.isFavorite,
                        order: f.order,
                        createdAt: f.createdAt
                    })),
                    bookmarks: state.bookmarks.map(b => ({
                        id: b.id,
                        title: b.title,
                        url: b.url,
                        icon: b.icon,
                        folderId: b.folderId,
                        isFavorite: b.isFavorite,
                        order: b.order,
                        createdAt: b.createdAt
                    }))
                }
            };

            // Crear y descargar archivo
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vision-marks-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
            return { success: true, count: exportData.data.bookmarks.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Importar desde JSON de Vision Marks
    async function importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    // Validar formato
                    if (!isValidVisionMarksFormat(data)) {
                        reject(new Error('Formato de archivo no válido'));
                        return;
                    }

                    // Mostrar modal con opciones: Fusionar o Cancelar
                    const shouldMerge = await ModalManager.showConfirmModal(
                        'Importar desde Vision Marks',
                        `Se encontraron ${data.data.folders.length} carpetas y ${data.data.bookmarks.length} marcadores.\n\n¿Deseas fusionarlos con tus marcadores actuales?`,
                        'Fusionar', 'Cancelar'
                    );

                    if (!shouldMerge) {
                        resolve({ success: false, cancelled: true }); // No enviar mensaje
                        return;
                    }

                    await mergeImport(data);

                    // Re-renderizar
                    RenderManager.renderAll();

                    resolve({
                        success: true,
                        folders: data.data.folders.length,
                        bookmarks: data.data.bookmarks.length,
                        merged: true
                    });
                } catch (error) {
                    reject(error);
                }
            };

            reader.readAsText(file);
        });
    }

    // Validar formato de Vision Marks
    function isValidVisionMarksFormat(data) {
        return data &&
            data.version &&
            data.source === 'vision-marks' &&
            data.data &&
            Array.isArray(data.data.folders) &&
            Array.isArray(data.data.bookmarks);
    }

    // Importar desde HTML (formato de navegadores)
    async function importFromHTML(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(e.target.result, 'text/html');

                    // Extraer carpetas y marcadores del HTML
                    const { folders } = parseBookmarksFromHTML(doc);

                    if (folders.length === 0) {
                        reject(new Error('No se encontraron marcadores en el archivo'));
                        return;
                    }

                    // Calcular total de marcadores
                    const totalBookmarks = folders.reduce((acc, f) => acc + f.bookmarks.length, 0);

                    // Mostrar modal con opciones: Fusionar o Cancelar
                    const shouldMerge = await ModalManager.showConfirmModal(
                        'Importar marcadores',
                        `Se encontraron ${folders.length} carpetas con ${totalBookmarks} marcadores.\n\n¿Deseas fusionarlos con tus marcadores actuales?`,
                        'Fusionar', 'Cancelar'
                    );

                    if (!shouldMerge) {
                        resolve({ success: false, cancelled: true, message: 'Importación cancelada' });
                        return;
                    }

                    let importedCount = 0;
                    let folderCount = 0;
                    let errorCount = 0;

                    // Modo fusión
                    for (const folder of folders) {
                        // Crear carpeta con nombre único si ya existe
                        let folderName = folder.name;
                        let counter = 1;
                        let existingFolder = StateManager.getState().folders.find(f => f.name === folderName);

                        while (existingFolder) {
                            folderName = `${folder.name} (${counter})`;
                            existingFolder = StateManager.getState().folders.find(f => f.name === folderName);
                            counter++;
                        }

                        const newFolder = await StateManager.addFolder({
                            name: folderName,
                            icon: '📁',
                            isFavorite: false
                        });
                        folderCount++;

                        for (const bookmark of folder.bookmarks) {
                            try {
                                const exists = StateManager.getState().bookmarks.some(b => b.url === bookmark.url);
                                if (!exists) {
                                    await StateManager.addBookmark({
                                        title: bookmark.title,
                                        url: bookmark.url,
                                        icon: bookmark.icon,
                                        folderId: newFolder.id,
                                        isFavorite: false
                                    });
                                    importedCount++;
                                }
                            } catch (err) {
                                errorCount++;
                            }
                        }
                    }

                    RenderManager.renderAll();

                    resolve({
                        success: true,
                        folders: folderCount,
                        bookmarks: importedCount,
                        merged: true
                    });
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };

            reader.readAsText(file);
        });
    }

    async function exportToHTML() {
        try {
            const state = StateManager.getState();
            const folders = state.folders || [];
            const bookmarks = state.bookmarks || [];

            // Construir estructura de carpetas y marcadores
            const folderMap = new Map();
            folders.forEach(folder => {
                folderMap.set(folder.id, {
                    name: folder.name,
                    icon: folder.icon,
                    bookmarks: []
                });
            });

            // Agrupar marcadores por carpeta
            bookmarks.forEach(bookmark => {
                const folderId = bookmark.folderId;
                if (folderId && folderMap.has(folderId)) {
                    folderMap.get(folderId).bookmarks.push(bookmark);
                } else {
                    // Marcadores sin carpeta (raíz)
                    if (!folderMap.has('root')) {
                        folderMap.set('root', {
                            name: 'Raíz',
                            icon: '📁',
                            bookmarks: []
                        });
                    }
                    folderMap.get('root').bookmarks.push(bookmark);
                }
            });

            // Generar HTML
            let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
                        <!-- This is an automatically generated file. -->
                        <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
                        <TITLE>Vision Marks Export</TITLE>
                        <H1>Bookmarks</H1>
                        <DL><p>`;

            // Añadir carpetas con sus marcadores
            for (const [id, folder] of folderMap) {
                if (id === 'root') continue; // La raíz se maneja aparte

                html += `
                    <DT><H3 ADD_DATE="${Date.now()}" LAST_MODIFIED="${Date.now()}">${escapeHtml(folder.name)}</H3>
                    <DL><p>`;

                for (const bookmark of folder.bookmarks) {
                    html += `
                        <DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${bookmark.createdAt ? new Date(bookmark.createdAt).getTime() : Date.now()}" ICON="${bookmark.icon || ''}">${escapeHtml(bookmark.title || bookmark.url)}</A>`;
                }

                html += `
                </DL><p>`;
            }

            // Añadir marcadores de la raíz
            const rootFolder = folderMap.get('root');
            if (rootFolder && rootFolder.bookmarks.length > 0) {
                html += `
                    <DT><H3 ADD_DATE="${Date.now()}" LAST_MODIFIED="${Date.now()}">Raíz</H3>
                    <DL><p>`;

                for (const bookmark of rootFolder.bookmarks) {
                    html += `
                        <DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${bookmark.createdAt ? new Date(bookmark.createdAt).getTime() : Date.now()}" ICON="${bookmark.icon || ''}">${escapeHtml(bookmark.title || bookmark.url)}</A>`;
                }

                html += `
                    </DL><p>`;
            }

            html += `
                </DL><p>`;

            // Crear y descargar archivo
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vision-marks-export-${new Date().toISOString().split('T')[0]}.html`;
            a.click();

            URL.revokeObjectURL(url);

            const totalBookmarks = bookmarks.length;
            return { success: true, count: totalBookmarks };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Función auxiliar para escapar HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Parsear marcadores de HTML (bookmarks.html de Chrome/Firefox)
    function parseBookmarksFromHTML(doc) {
        const folders = [];
        let currentFolder = { name: 'Raíz', bookmarks: [] };
        let foundH3 = false;

        // Obtener todos los elementos en orden
        const body = doc.body;
        if (!body) return { folders: [] };

        // Recorrer todos los elementos en orden de aparición
        const walker = document.createTreeWalker(
            body,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: function (node) {
                    if (node.tagName === 'H3' || node.tagName === 'A' || node.tagName === 'DT') {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        let node;
        let pendingFolder = null;
        let pendingBookmarks = [];

        while (node = walker.nextNode()) {
            // Cuando encontramos un H3 (inicio de carpeta)
            if (node.tagName === 'H3') {
                // Si ya teníamos una carpeta pendiente, guardarla
                if (pendingFolder !== null && pendingBookmarks.length > 0) {
                    folders.push({
                        name: pendingFolder,
                        bookmarks: [...pendingBookmarks]
                    });
                }
                // Iniciar nueva carpeta
                pendingFolder = node.textContent.trim();
                pendingBookmarks = [];
                foundH3 = true;
            }

            // Cuando encontramos un A (marcador)
            else if (node.tagName === 'A') {
                const title = node.textContent.trim();
                const url = node.getAttribute('href');

                if (title && url && !url.startsWith('about:') && !url.startsWith('javascript:')) {
                    try {
                        const icon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;
                        const bookmark = { title, url, icon };

                        if (pendingFolder !== null) {
                            // Marcador dentro de una carpeta
                            pendingBookmarks.push(bookmark);
                        } else {
                            // Marcador suelto (antes del primer H3)
                            currentFolder.bookmarks.push(bookmark);
                        }
                    } catch (e) {
                        // URL inválida, saltar
                    }
                }
            }
        }

        // Guardar la última carpeta pendiente
        if (pendingFolder !== null && pendingBookmarks.length > 0) {
            folders.push({
                name: pendingFolder,
                bookmarks: [...pendingBookmarks]
            });
        }

        // Si hay marcadores en la raíz, añadirlos
        if (currentFolder.bookmarks.length > 0) {
            folders.unshift(currentFolder);
        }

        // Si no se encontraron carpetas pero hay marcadores, crear carpeta por defecto
        if (folders.length === 0 && currentFolder.bookmarks.length > 0) {
            folders.push({ name: 'Importados', bookmarks: currentFolder.bookmarks });
        }

        // Si no hay nada en absoluto, intentar búsqueda alternativa
        if (folders.length === 0) {
            const links = doc.querySelectorAll('A');
            const bookmarks = [];
            links.forEach(link => {
                const title = link.textContent.trim();
                const url = link.getAttribute('href');
                if (title && url && !url.startsWith('about:') && !url.startsWith('javascript:')) {
                    try {
                        const icon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;
                        bookmarks.push({ title, url, icon });
                    } catch (e) { }
                }
            });
            if (bookmarks.length > 0) {
                folders.push({ name: 'Importados', bookmarks });
            }
        }
        return { folders };
    }

    // Fusionar importación (mantener existentes + añadir nuevos)
    async function mergeImport(data) {
        const currentState = StateManager.getState();
        const currentFolders = currentState.folders || [];
        const currentBookmarks = currentState.bookmarks || [];

        // Mapa de URLs existentes para evitar duplicados
        const existingUrls = new Set(currentBookmarks.map(b => b.url));

        // Crear carpetas nuevas que no existan (por nombre)
        for (const folder of data.data.folders) {
            const exists = currentFolders.some(f => f.name === folder.name);
            if (!exists) {
                await StateManager.addFolder({
                    name: folder.name,
                    icon: folder.icon,
                    isFavorite: folder.isFavorite
                });
            }
        }

        // Añadir marcadores nuevos
        const folders = StateManager.getState().folders;
        for (const bookmark of data.data.bookmarks) {
            if (!existingUrls.has(bookmark.url)) {
                // Buscar carpeta correspondiente
                const sourceFolder = data.data.folders.find(f => f.id === bookmark.folderId);
                let targetFolderId = null;

                if (sourceFolder) {
                    const destFolder = folders.find(f => f.name === sourceFolder.name);
                    targetFolderId = destFolder ? destFolder.id : null;
                }

                await StateManager.addBookmark({
                    title: bookmark.title,
                    url: bookmark.url,
                    icon: bookmark.icon,
                    folderId: targetFolderId,
                    isFavorite: bookmark.isFavorite
                });
            }
        }
    }

    // API pública
    return {
        exportToJSON,
        importFromJSON,
        importFromHTML,
        exportToHTML
    };
})();

window.ImportExportManager = ImportExportManager;
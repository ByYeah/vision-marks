const DatabaseManager = (function () {
    // Configuración de la base de datos
    const DB_NAME = 'VisionMarksDB';
    const DB_VERSION = 1;

    // Nombres de los almacenes (stores)
    const STORES = {
        FOLDERS: 'folders',
        BOOKMARKS: 'bookmarks',
        SETTINGS: 'settings'
    };

    // Instancia de la base de datos (cache)
    let dbInstance = null;

    // Promesa de inicialización para evitar múltiples aperturas simultáneas
    let initPromise = null;

    function _openConnection() {
        return new Promise((resolve, reject) => {
            // Verificar soporte
            if (!window.indexedDB) {
                reject(new Error('IndexedDB no es soportado en este navegador'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('Error al abrir IndexedDB:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crear store de carpetas
                if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
                    const folderStore = db.createObjectStore(STORES.FOLDERS, { keyPath: 'id', autoIncrement: true });
                    folderStore.createIndex('name', 'name', { unique: false });
                    folderStore.createIndex('isFavorite', 'isFavorite', { unique: false });
                    folderStore.createIndex('order', 'order', { unique: false });
                    console.log('  - Store "folders" creado');
                }

                // Crear store de marcadores
                if (!db.objectStoreNames.contains(STORES.BOOKMARKS)) {
                    const bookmarkStore = db.createObjectStore(STORES.BOOKMARKS, { keyPath: 'id', autoIncrement: true });
                    bookmarkStore.createIndex('folderId', 'folderId', { unique: false });
                    bookmarkStore.createIndex('url', 'url', { unique: false });
                    bookmarkStore.createIndex('title', 'title', { unique: false });
                    bookmarkStore.createIndex('isFavorite', 'isFavorite', { unique: false });
                    bookmarkStore.createIndex('order', 'order', { unique: false });
                    console.log('  - Store "bookmarks" creado');
                }

                // Crear store de configuraciones
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                    console.log('  - Store "settings" creado');
                }
            };
        });
    }

    async function init() {
        if (dbInstance) return true;
        if (initPromise) return initPromise;

        initPromise = new Promise(async (resolve) => {
            try {
                await _openConnection();

                // SOLO si la conexión fue exitosa, intentar migrar
                if (dbInstance) {
                    // Pequeño retraso para asegurar que SettingsManager existe
                    setTimeout(() => {
                        // AHORA LLAMAMOS A LA FUNCIÓN CORRECTA
                        migrateRealSettings().catch(() => { });
                    }, 1000);
                }

                resolve(!!dbInstance);
            } catch (error) {
                console.warn('DatabaseManager init warning:', error);
                resolve(false);
            }
        });

        return initPromise;
    }

    async function getDB() {
        if (!dbInstance) {
            await init();
        }
        return dbInstance;
    }

    async function transaction(storeName, mode, callback) {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);

            tx.oncomplete = () => resolve();
            tx.onerror = (event) => {
                console.error(`Error en transacción ${storeName}:`, event.target.error);
                reject(event.target.error);
            };

            try {
                const result = callback(store);
                if (result && typeof result.then === 'function') {
                    // Si el callback devuelve una promesa, esperamos
                    result.then(resolve).catch(reject);
                } else {
                    // Si no, asumimos que la operación ya se completó
                    resolve(result);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    const FolderOperations = {
        async getAll() {
            return transaction(STORES.FOLDERS, 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async add(folder) {
            return transaction(STORES.FOLDERS, 'readwrite', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.add(folder);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async update(folder) {
            return transaction(STORES.FOLDERS, 'readwrite', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.put(folder);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async delete(id) {
            return transaction(STORES.FOLDERS, 'readwrite', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.delete(id);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async getFavorites() {
            return transaction(STORES.FOLDERS, 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const index = store.index('isFavorite');
                    const request = index.getAll(1); // 1 = true
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async reorder(folderOrders) {
            return transaction(STORES.FOLDERS, 'readwrite', async (store) => {
                const promises = folderOrders.map(({ id, order }) => {
                    return new Promise((resolve, reject) => {
                        const getRequest = store.get(id);
                        getRequest.onsuccess = () => {
                            const folder = getRequest.result;
                            if (folder) {
                                folder.order = order;
                                const putRequest = store.put(folder);
                                putRequest.onsuccess = () => resolve();
                                putRequest.onerror = () => reject(putRequest.error);
                            } else {
                                resolve();
                            }
                        };
                        getRequest.onerror = () => reject(getRequest.error);
                    });
                });
                await Promise.all(promises);
            });
        }
    };

    const BookmarkOperations = {
        async getAll() {
            return transaction(STORES.BOOKMARKS, 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async getByFolder(folderId) {
            return transaction(STORES.BOOKMARKS, 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const index = store.index('folderId');
                    // Manejar null: en IndexedDB no se puede buscar null directamente,
                    // así que obtenemos todos y filtramos (o usamos un valor especial como -1)
                    if (folderId === null) {
                        const request = store.getAll();
                        request.onsuccess = () => {
                            const all = request.result || [];
                            resolve(all.filter(b => b.folderId === undefined || b.folderId === null));
                        };
                        request.onerror = () => reject(request.error);
                    } else {
                        const request = index.getAll(folderId);
                        request.onsuccess = () => resolve(request.result || []);
                        request.onerror = () => reject(request.error);
                    }
                });
            });
        },

        async add(bookmark) {
            return transaction(STORES.BOOKMARKS, 'readwrite', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.add(bookmark);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async update(bookmark) {
            return transaction(STORES.BOOKMARKS, 'readwrite', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.put(bookmark);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async delete(id) {
            return transaction(STORES.BOOKMARKS, 'readwrite', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.delete(id);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async getFavorites() {
            return transaction(STORES.BOOKMARKS, 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const index = store.index('isFavorite');
                    const request = index.getAll(1);
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async reorder(bookmarkOrders) {
            return transaction(STORES.BOOKMARKS, 'readwrite', async (store) => {
                const promises = bookmarkOrders.map(({ id, order }) => {
                    return new Promise((resolve, reject) => {
                        const getRequest = store.get(id);
                        getRequest.onsuccess = () => {
                            const bookmark = getRequest.result;
                            if (bookmark) {
                                bookmark.order = order;
                                const putRequest = store.put(bookmark);
                                putRequest.onsuccess = () => resolve();
                                putRequest.onerror = () => reject(putRequest.error);
                            } else {
                                resolve();
                            }
                        };
                        getRequest.onerror = () => reject(getRequest.error);
                    });
                });
                await Promise.all(promises);
            });
        },

        async moveToFolder(bookmarkIds, targetFolderId) {
            return transaction(STORES.BOOKMARKS, 'readwrite', async (store) => {
                const promises = bookmarkIds.map(id => {
                    return new Promise((resolve, reject) => {
                        const getRequest = store.get(id);
                        getRequest.onsuccess = () => {
                            const bookmark = getRequest.result;
                            if (bookmark) {
                                bookmark.folderId = targetFolderId;
                                const putRequest = store.put(bookmark);
                                putRequest.onsuccess = () => resolve();
                                putRequest.onerror = () => reject(putRequest.error);
                            } else {
                                resolve();
                            }
                        };
                        getRequest.onerror = () => reject(getRequest.error);
                    });
                });
                await Promise.all(promises);
            });
        }
    };

    const SettingsOperations = {
        async getAll() {
            return transaction(STORES.SETTINGS, 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.getAll();
                    request.onsuccess = () => {
                        const settings = {};
                        (request.result || []).forEach(item => {
                            settings[item.key] = item.value;
                        });
                        resolve(settings);
                    };
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async get(key) {
            return transaction(STORES.SETTINGS, 'readonly', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.get(key);
                    request.onsuccess = () => resolve(request.result ? request.result.value : null);
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async set(key, value) {
            return transaction(STORES.SETTINGS, 'readwrite', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.put({ key, value });
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async setMultiple(settingsObject) {
            return transaction(STORES.SETTINGS, 'readwrite', async (store) => {
                const promises = Object.entries(settingsObject).map(([key, value]) => {
                    return new Promise((resolve, reject) => {
                        const request = store.put({ key, value });
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                });
                await Promise.all(promises);
            });
        },

        async delete(key) {
            return transaction(STORES.SETTINGS, 'readwrite', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.delete(key);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });
        },

        async clear() {
            return transaction(STORES.SETTINGS, 'readwrite', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });
        }
    };

    // Migrar settings reales automáticamente
    async function migrateRealSettings() {
        try {
            // Verificar si ya migramos antes (usando una bandera)
            const migrated = await SettingsOperations.get('_settings_migrated');
            if (migrated) return; // Ya migrado, salir

            // Obtener settings reales de SettingsManager
            if (!window.SettingsManager) return;

            const realSettings = SettingsManager.getSettings();
            console.log('🔄 Migrando settings reales a IndexedDB...');

            // Guardar cada setting importante
            await SettingsOperations.set('theme', realSettings.theme);
            await SettingsOperations.set('layout', realSettings.layout);
            await SettingsOperations.set('fontFamily', realSettings.fontFamily);
            await SettingsOperations.set('colors', realSettings.colors);

            // Guardar contenedores si existen
            if (realSettings.containers) {
                await SettingsOperations.set('containers', realSettings.containers);
            }

            // Marcar como migrado para no repetir
            await SettingsOperations.set('_settings_migrated', true);

            console.log('✅ Settings reales migrados a IndexedDB');
        } catch (error) {
            console.warn('⚠️ No se pudieron migrar settings (no crítico):', error);
        }
    }

    const MigrationUtils = {
        async migrateFromLocalStorage() {
            console.log('🔄 Iniciando migración desde localStorage...');

            const result = {
                folders: { migrated: 0, errors: 0 },
                bookmarks: { migrated: 0, errors: 0 },
                settings: { migrated: 0, errors: 0 }
            };

            try {
                // 1. Migrar carpetas
                if (window.StateManager && StateManager.getFolders) {
                    const folders = StateManager.getFolders();
                    if (folders && folders.length > 0) {
                        for (const folder of folders) {
                            try {
                                // Asegurar que tenga estructura correcta
                                const folderToSave = {
                                    name: folder.name || 'Sin nombre',
                                    icon: folder.icon || '📁',
                                    isFavorite: folder.isFavorite || false,
                                    order: folder.order || 0
                                };
                                if (folder.id) {
                                    folderToSave.id = folder.id; // Mantener ID si existe
                                    await FolderOperations.update(folderToSave);
                                } else {
                                    await FolderOperations.add(folderToSave);
                                }
                                result.folders.migrated++;
                            } catch (error) {
                                console.error('Error migrando carpeta:', folder, error);
                                result.folders.errors++;
                            }
                        }
                    }
                }

                // 2. Migrar marcadores
                if (window.StateManager && StateManager.getBookmarks) {
                    const bookmarks = StateManager.getBookmarks();
                    if (bookmarks && bookmarks.length > 0) {
                        for (const bookmark of bookmarks) {
                            try {
                                const bookmarkToSave = {
                                    title: bookmark.title || 'Sin título',
                                    url: bookmark.url || '',
                                    folderId: bookmark.folderId || null,
                                    isFavorite: bookmark.isFavorite || false,
                                    order: bookmark.order || 0,
                                    icon: bookmark.icon || ''
                                };
                                if (bookmark.id) {
                                    bookmarkToSave.id = bookmark.id;
                                    await BookmarkOperations.update(bookmarkToSave);
                                } else {
                                    await BookmarkOperations.add(bookmarkToSave);
                                }
                                result.bookmarks.migrated++;
                            } catch (error) {
                                console.error('Error migrando marcador:', bookmark, error);
                                result.bookmarks.errors++;
                            }
                        }
                    }
                }

                // 3. Migrar configuraciones
                if (window.SettingsManager && SettingsManager.getSettings) {
                    const settings = SettingsManager.getSettings();
                    if (settings) {
                        try {
                            await SettingsOperations.setMultiple(settings);
                            result.settings.migrated = Object.keys(settings).length;
                        } catch (error) {
                            console.error('Error migrando configuraciones:', error);
                            result.settings.errors++;
                        }
                    }
                }
                return result;
            } catch (error) {
                throw error;
            }
        },

        async needsMigration() {
            // Verificar si hay datos en IndexedDB
            try {
                const folders = await FolderOperations.getAll();
                const bookmarks = await BookmarkOperations.getAll();

                // Si ya hay datos en IndexedDB, no migrar
                if (folders.length > 0 || bookmarks.length > 0) {
                    return false;
                }

                // Verificar si hay datos en localStorage
                const state = localStorage.getItem('bookmarkManagerState');
                return !!(state && JSON.parse(state));
            } catch (error) {
                console.error('Error verificando necesidad de migración:', error);
                return false;
            }
        }
    };

    // API pública
    return {
        // Inicialización
        init,
        // Stores disponibles
        STORES,
        // Operaciones por entidad
        folders: FolderOperations,
        bookmarks: BookmarkOperations,
        settings: SettingsOperations,
        // Utilidades
        migration: MigrationUtils,
        // Transacción genérica (para operaciones avanzadas)
        transaction
    };
})();

// Hacer disponible globalmente
window.DatabaseManager = DatabaseManager;

// Inicializar automáticamente al cargar el script
DatabaseManager.init().then(success => {
    if (success) {
    }
})
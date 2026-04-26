const ChatManager = (() => {
    // Cache de la API key en memoria
    let cachedApiKey = null;

    // Configuración
    const CONFIG = {
        API_STORAGE_KEY: 'vision_marks_api_key',
        PROVIDER_KEY: 'vision_marks_ai_provider',
        MODEL_KEY: 'vision_marks_ai_model',
        CUSTOM_URL_KEY: 'vision_marks_custom_api_url',
        MAX_HISTORY_MESSAGES: 50,
        SYSTEM_PROMPT: `Eres un asistente especializado en marcadores web.
        REGLAS ESTRICTAS (NUNCA LAS ROMPAS):
        1. PROHIBIDO INVENTAR: NUNCA menciones sitios que no aparezcan EXPLÍCITAMENTE en el contexto que recibes.
        2. Si no hay marcadores relevantes, responde EXACTAMENTE: "No tengo marcadores sobre [tema]. Revisa tus carpetas manualmente."
        3. Si HAY marcadores relevantes, responde en formato lista simple:
            1. Título exacto: URL exacta
            2. Otro título: otra URL
        4. NUNCA uses paréntesis, corchetes, asteriscos o símbolos raros.
        5. Máximo 5 marcadores por respuesta.
        6. Sé ULTRA CONCISO. Una línea por marcador.
        7. Responde en el mismo idioma que el usuario.`,
        REQUEST_TIMEOUT: 30000,
        MAX_CONTENT_BOOKMARKS: 50,
        ENABLE_DEBUG: true,
        CONTEXT: {
            HYBRID_THRESHOLD: 300,
            MAX_FULL_CONTEXT: 150,
            MAX_SEARCH_RESULTS: 25,
            CACHE_DURATION: 300000
        }
    };

    // Proveedores disponibles
    const PROVIDERS = {
        groq: {
            name: 'Groq',
            url: 'https://api.groq.com/openai/v1/chat/completions',
            defaultModel: 'llama-3.1-8b-instant',
            requiresApiKey: true
        },
        openai: {
            name: 'OpenAI',
            url: 'https://api.openai.com/v1/chat/completions',
            defaultModel: 'gpt-3.5-turbo',
            requiresApiKey: true
        },
        anthropic: {
            name: 'Anthropic',
            url: 'https://api.anthropic.com/v1/messages',
            defaultModel: 'claude-3-haiku-20240307',
            requiresApiKey: true,
            formatRequest: (messages, model, systemPrompt) => ({
                model: model,
                messages: messages.filter(m => m.role !== 'system'),
                system: systemPrompt,
                max_tokens: 500,
                temperature: 0.7
            }),
            extractResponse: (data) => data.content?.[0]?.text || "No pude generar una respuesta."
        },
        mistral: {
            name: 'Mistral AI',
            url: 'https://api.mistral.ai/v1/chat/completions',
            defaultModel: 'mistral-tiny',
            requiresApiKey: true
        },
        gemini: {
            name: 'Gemini',
            url: 'https://generativelanguage.googleapis.com/v1beta',
            defaultModel: 'gemini-1.5-flash',
            requiresApiKey: true,
            formatRequest: (messages, model, systemPrompt) => {
                // Separar system prompt del resto de mensajes
                const systemMessage = messages.find(m => m.role === 'system');
                const chatMessages = messages.filter(m => m.role !== 'system');

                // Convertir al formato Gemini
                const contents = [];

                // Añadir instrucciones del sistema si existen
                let systemInstruction = systemPrompt;
                if (systemMessage) {
                    systemInstruction = systemMessage.content;
                }

                // Convertir historial de mensajes
                for (const msg of chatMessages) {
                    const lastContent = contents[contents.length - 1];
                    if (lastContent && lastContent.role === (msg.role === 'user' ? 'user' : 'model')) {
                        // Si es el mismo rol, fusionar
                        lastContent.parts.push({ text: msg.content });
                    } else {
                        contents.push({
                            role: msg.role === 'user' ? 'user' : 'model',
                            parts: [{ text: msg.content }]
                        });
                    }
                }

                const requestBody = {
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                        topP: 0.95,
                        topK: 40
                    }
                };

                // Añadir instrucción del sistema si existe
                if (systemInstruction && systemInstruction.trim()) {
                    requestBody.systemInstruction = {
                        parts: [{ text: systemInstruction }]
                    };
                }

                return requestBody;
            },
            // Gemini requiere la API key en la URL
            buildUrl: (baseUrl, model, apiKey) => {
                const cleanApiKey = apiKey ? apiKey.trim() : '';
                const url = `${baseUrl}/models/${model}:generateContent?key=${cleanApiKey}`;
                return url;
            },
            extractResponse: (data) => {
                try {
                    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                        const parts = data.candidates[0].content.parts;
                        if (parts && parts[0] && parts[0].text) {
                            return parts[0].text;
                        }
                    }
                    // Verificar si hay mensaje de error
                    if (data.error) {
                        console.error('Gemini API Error:', data.error);
                        return `Error de Gemini: ${data.error.message || 'Error desconocido'}`;
                    }
                    return "No pude generar una respuesta en este momento.";
                } catch (e) {
                    console.error('Error extracting Gemini response:', e);
                    return "Error al procesar la respuesta de Gemini.";
                }
            }
        },
        deepseek: {
            name: 'DeepSeek',
            url: 'https://api.deepseek.com/v1/chat/completions',
            defaultModel: 'deepseek-chat',
            requiresApiKey: true
        },
        custom: {
            name: 'Personalizado',
            url: '',
            defaultModel: 'custom-model',
            requiresApiKey: false,
            isCustom: true
        }
    };

    // * Funciones de proveedor *
    function getSelectedProvider() {
        const providerKey = localStorage.getItem(CONFIG.PROVIDER_KEY) || 'groq';
        const provider = PROVIDERS[providerKey];
        if (!provider) return PROVIDERS.groq;

        // Si es custom, añadir la URL guardada
        if (provider.isCustom) {
            const customUrl = localStorage.getItem(CONFIG.CUSTOM_URL_KEY) || '';
            return { ...provider, url: customUrl };
        }
        return provider;
    }

    function getSelectedProviderKey() {
        return localStorage.getItem(CONFIG.PROVIDER_KEY) || 'groq';
    }

    function getSelectedModel() {
        const currentProvider = getSelectedProviderKey();
        const savedModel = localStorage.getItem(`vision_marks_ai_model_${currentProvider}`);

        if (savedModel && savedModel.trim()) {
            return savedModel;
        }
        return getSelectedProvider().defaultModel;
    }

    function saveProvider(providerKey) {
        localStorage.setItem(CONFIG.PROVIDER_KEY, providerKey);

        const modelInput = document.getElementById('aiModel');
        if (modelInput) {
            const currentModel = getSelectedModel();
            modelInput.value = currentModel;
        }
    }

    function saveModel(model) {
        const currentProvider = getSelectedProviderKey();
        if (model && model.trim()) {
            localStorage.setItem(`vision_marks_ai_model_${currentProvider}`, model.trim());
        } else {
            // Si está vacío, eliminar la clave específica del proveedor
            localStorage.removeItem(`vision_marks_ai_model_${currentProvider}`);
        }
    }

    function saveCustomApiUrl(url) {
        localStorage.setItem(CONFIG.CUSTOM_URL_KEY, url);
    }

    function getCustomApiUrl() {
        return localStorage.getItem(CONFIG.CUSTOM_URL_KEY) || '';
    }

    function syncModelInputWithProvider() {
        const modelInput = document.getElementById('aiModel');
        const providerSelect = document.getElementById('aiProvider');

        if (!modelInput) return;

        const updateModelField = () => {
            const currentModel = getSelectedModel();
            modelInput.value = currentModel;
        };

        // Actualizar al cambiar proveedor manualmente
        if (providerSelect) {
            providerSelect.removeEventListener('change', updateModelField);
            providerSelect.addEventListener('change', () => {
                updateModelField();
                // Limpiar modelo específico del proveedor anterior si estaba vacío
                const previousProvider = localStorage.getItem(CONFIG.PROVIDER_KEY);
                if (previousProvider && previousProvider !== providerSelect.value) {
                    const modelForNewProvider = localStorage.getItem(`vision_marks_ai_model_${providerSelect.value}`);
                    if (!modelForNewProvider) {
                        // No hay modelo guardado, usar default automáticamente
                        modelInput.value = getSelectedProvider().defaultModel;
                    }
                }
            });
        }
        modelInput.removeEventListener('change', handleModelInputChange);
        modelInput.addEventListener('change', handleModelInputChange);

        updateModelField();
    }

    function handleModelInputChange(e) {
        const value = e.target.value.trim();
        if (value === '') {
            const currentProvider = getSelectedProviderKey();
            localStorage.removeItem(`vision_marks_ai_model_${currentProvider}`);
        } else {
            saveModel(value);
        }
    }

    // * Funciones de encriptación *
    function encryptApiKey(key) {
        if (!key) return null;
        try {
            const utf8Bytes = new TextEncoder().encode(key);
            const utf8String = String.fromCharCode(...utf8Bytes);
            return btoa(utf8String);
        } catch (e) {
            console.error('Error encrypting API key:', e);
            return null;
        }
    }

    function decryptApiKey(encrypted) {
        if (!encrypted) return null;
        try {
            const decrypted = atob(encrypted);
            const utf8Bytes = Uint8Array.from([...decrypted].map(c => c.charCodeAt(0)));
            return new TextDecoder().decode(utf8Bytes);
        } catch (e) {
            console.error('Error decrypting API key:', e);
            return encrypted;
        }
    }

    function getStoredApiKey() {
        if (cachedApiKey) return cachedApiKey;

        const stored = localStorage.getItem(CONFIG.API_STORAGE_KEY);
        if (!stored) return null;

        // Intentar desencriptar
        const decrypted = decryptApiKey(stored);
        if (decrypted) {
            cachedApiKey = decrypted;
            return decrypted;
        }
        return null;
    }

    function saveApiKey(key) {
        if (!key || !key.trim()) {
            localStorage.removeItem(CONFIG.API_STORAGE_KEY);
            cachedApiKey = null;
            return;
        }

        const cleanedKey = key.trim();

        // Guardar ENCRIPTADO
        const encrypted = encryptApiKey(cleanedKey);
        localStorage.setItem(CONFIG.API_STORAGE_KEY, encrypted);
        cachedApiKey = cleanedKey;

        console.log('API key guardada correctamente (encriptada)');
    }

    function clearApiKey() {
        localStorage.removeItem(CONFIG.API_STORAGE_KEY);
        cachedApiKey = null;
    }

    function hasApiKey() {
        return !!getStoredApiKey();
    }

    // * Funciones de mensajes *
    async function addMessage(text, sender) {
        const newMessage = {
            id: Date.now(),
            text: text,
            sender: sender === 'thinking' ? 'bot' : sender,
            timestamp: new Date().toISOString(),
            isThinking: sender === 'thinking'
        };

        const currentState = StateManager.getState();
        const currentMessages = currentState.chat?.messages || [];
        let updatedMessages = [...currentMessages, newMessage];

        if (updatedMessages.length > CONFIG.MAX_HISTORY_MESSAGES) {
            updatedMessages = updatedMessages.slice(-CONFIG.MAX_HISTORY_MESSAGES);
        }

        StateManager.setState({ chat: { messages: updatedMessages } });
        renderMessageToUI(newMessage);
        await saveChatToIndexedDB(updatedMessages);

        return newMessage;
    }

    async function sendMessage(messageText) {
        if (!messageText || !messageText.trim()) return;

        await addMessage(messageText.trim(), 'user');

        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.value = '';

        const thinkingId = await addMessage('🤔 Pensando...', 'thinking');

        try {
            const aiResponse = await getAIResponse(messageText);
            await replaceMessage(thinkingId.id, aiResponse, 'bot');
        } catch (error) {
            console.error('SendMessage Error:', error);
            await replaceMessage(thinkingId.id, '❌ Ocurrió un error inesperado. Por favor, intenta de nuevo.', 'bot');
        }
    }

    function renderMessageToUI(message) {
        const chatMessagesContainer = document.getElementById('chatMessages');
        if (!chatMessagesContainer) return;

        if (document.querySelector(`.chat-message[data-id="${message.id}"]`)) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.sender}`;
        messageDiv.setAttribute('data-id', message.id);

        if (message.isThinking) {
            messageDiv.classList.add('thinking');
        }

        // Añadir botón de copiar solo para mensajes del bot (no para thinking)
        const copyButton = message.sender === 'bot' && !message.isThinking ?
            `<button class="chat-copy-btn" data-id="${message.id}" title="Copiar respuesta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
        </button>` : '';

        messageDiv.innerHTML = `
        <p>${message.isThinking ? escapeHtml(message.text) : message.text}</p>
        ${copyButton}
    `;

        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

        // Event listener para copiar
        if (copyButton) {
            const btn = messageDiv.querySelector('.chat-copy-btn');
            btn.addEventListener('click', () => copyMessageToClipboard(message.id));
        }
    }

    function renderChatHistory() {
        const currentState = StateManager.getState();
        const messages = currentState.chat?.messages || [];
        const chatMessagesContainer = document.getElementById('chatMessages');

        if (chatMessagesContainer) {
            chatMessagesContainer.innerHTML = '';
            messages.forEach(msg => renderMessageToUI(msg));
        }
    }

    async function saveChatToIndexedDB(messages) {
        if (window.DatabaseManager) {
            try {
                await DatabaseManager.settings.set('chat_messages', messages);
            } catch (error) {
                console.error('Error saving chat to IndexedDB:', error);
            }
        }
    }

    async function loadChatFromIndexedDB() {
        if (window.DatabaseManager) {
            try {
                const messages = await DatabaseManager.settings.get('chat_messages');
                if (messages && messages.length) {
                    StateManager.setState({ chat: { messages } });
                    renderChatHistory();
                }
            } catch (error) {
                console.error('Error loading chat from IndexedDB:', error);
            }
        }
    }

    async function replaceMessage(messageId, newText, sender) {
        const currentState = StateManager.getState();
        const updatedMessages = currentState.chat.messages.map(msg =>
            msg.id === messageId ? { ...msg, text: newText, sender: sender, isThinking: false } : msg
        );
        StateManager.setState({ chat: { messages: updatedMessages } });

        // Actualizar el DOM directamente preservando la estructura
        const messageElement = document.querySelector(`.chat-message[data-id="${messageId}"]`);
        if (messageElement) {
            // Mantener la misma estructura pero actualizar el texto
            const p = messageElement.querySelector('p');
            if (p) {
                // No escapamos HTML porque queremos que los enlaces funcionen
                p.innerHTML = newText;
            }
            // Asegurar la clase correcta
            messageElement.classList.remove('thinking');
            messageElement.classList.add(sender);

            // Si es mensaje del bot y no tiene botón de copiar, añadirlo
            if (sender === 'bot' && !messageElement.querySelector('.chat-copy-btn')) {
                const copyButton = document.createElement('button');
                copyButton.className = 'chat-copy-btn';
                copyButton.setAttribute('data-id', messageId);
                copyButton.title = 'Copiar respuesta';
                copyButton.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>`;
                copyButton.addEventListener('click', () => copyMessageToClipboard(messageId));
                messageElement.appendChild(copyButton);
            }
        } else {
            renderChatHistory();
        }
    }

    // * Funciones de contexto *
    let searchCache = new Map();

    // Detectar si debemos usar búsqueda dinámica
    function shouldUseDynamicSearch() {
        const totalBookmarks = StateManager.getBookmarks().length;
        return totalBookmarks > CONFIG.CONTEXT.HYBRID_THRESHOLD;
    }
    // Función principal que decide qué contexto usar
    function getSmartContext(userMessage) {
        const totalBookmarks = StateManager.getBookmarks().length;

        if (totalBookmarks === 0) {
            return "El usuario aún no tiene marcadores guardados.";
        }

        // Menos de 300 marcadores: contexto completo
        if (!shouldUseDynamicSearch()) {
            return getFullContextOptimized();
        }

        // Más de 300 marcadores: búsqueda dinámica
        return getDynamicSearchContext(userMessage);
    }

    function getBookmarksContext(userMessage = '') {
        // Si se pasa un mensaje, usar el sistema inteligente
        if (userMessage && userMessage.length > 0) {
            return getSmartContext(userMessage);
        }
        // Si no hay mensaje, dar contexto general optimizado
        return getFullContextOptimized();
    }

    // Contexto completo optimizado (para <300 marcadores)
    function getFullContextOptimized() {
        const bookmarks = StateManager.getBookmarks();
        const folders = StateManager.getFolders();
        const MAX_TOTAL = CONFIG.CONTEXT.MAX_FULL_CONTEXT;
        const MAX_PER_FOLDER = 20;

        const folderMap = new Map();
        folders.forEach(folder => {
            folderMap.set(folder.id, folder.name);
        });

        const bookmarksByFolder = new Map();
        bookmarks.forEach(bookmark => {
            const folderId = bookmark.folderId || 'root';
            if (!bookmarksByFolder.has(folderId)) {
                bookmarksByFolder.set(folderId, []);
            }
            bookmarksByFolder.get(folderId).push(bookmark);
        });

        // Ordenar carpetas por cantidad de marcadores
        const sortedFolders = Array.from(bookmarksByFolder.entries())
            .sort((a, b) => b[1].length - a[1].length);

        let context = `📚 VISIÓN GENERAL (${bookmarks.length} marcadores en total):\n`;
        let totalIncluded = 0;

        for (const [folderId, bookmarksList] of sortedFolders) {
            if (totalIncluded >= MAX_TOTAL) break;

            const folderName = folderId === 'root' ? 'Sin carpeta' : folderMap.get(folderId) || 'Sin carpeta';
            const limit = Math.min(MAX_PER_FOLDER, MAX_TOTAL - totalIncluded);
            const selected = bookmarksList.slice(0, limit);

            if (selected.length > 0) {
                context += `\n📁 ${folderName} (${bookmarksList.length} marcadores):\n`;
                selected.forEach(b => {
                    const shortUrl = b.url.length > 60 ? b.url.substring(0, 57) + '...' : b.url;
                    context += `  • ${b.title}: ${shortUrl}\n`;
                });

                if (bookmarksList.length > limit) {
                    context += `  ... y ${bookmarksList.length - limit} más\n`;
                }
                totalIncluded += selected.length;
            }
        }
        if (totalIncluded < bookmarks.length) {
            context += `\n⚠️ Mostrando ${totalIncluded} de ${bookmarks.length} marcadores por eficiencia.\n`;
        }
        return context;
    }

    // Búsqueda dinámica (para >300 marcadores)
    function getDynamicSearchContext(userMessage) {
        const cacheKey = userMessage.toLowerCase().trim();
        const cached = searchCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CONFIG.CONTEXT.CACHE_DURATION) {
            if (CONFIG.ENABLE_DEBUG) console.log('📦 Usando caché de búsqueda');
            return cached.context;
        }

        const bookmarks = StateManager.getBookmarks();
        const folders = StateManager.getFolders();
        const query = userMessage.toLowerCase();

        const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'que', 'como', 'para', 'por', 'con', 'sin', 'sobre', 'busca', 'encuentra', 'recomienda', 'dame', 'quiero', 'necesito', 'brindame', 'sitios', 'paginas', 'webs'];
        let keywords = query.split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word))
            .slice(0, 5);

        if (keywords.length === 0) {
            keywords = [query];
        }

        const synonymMap = {
            'empleo': ['trabajo', 'job', 'career', 'vacante', 'empleos', 'trabajos', 'jobs', 'carrera', 'laboral'],
            'trabajo': ['empleo', 'job', 'career', 'vacante', 'empleos', 'trabajos', 'jobs'],
            'programacion': ['coding', 'developer', 'software', 'programar', 'desarrollo', 'dev', 'code'],
            'diseno': ['design', 'ui', 'ux', 'creative', 'grafico', 'designer', 'creative'],
            'ventas': ['sales', 'comercial', 'business', 'marketing', 'venta'],
            'educacion': ['aprender', 'curso', 'tutorial', 'learning', 'study', 'educación', 'cursos'],
            'remoto': ['remote', 'teletrabajo', 'home office', 'distancia', 'remoto', 'work from home'],
            'desarrollo': ['programacion', 'coding', 'developer', 'software', 'dev', 'web', 'app'],
            'freelance': ['freelancer', 'independiente', 'freelancing', 'contratista'],
            'tecnologia': ['tech', 'technology', 'informatica', 'it', 'sistemas', 'tecnológico']
        };

        const expandedKeywords = new Set(keywords);
        keywords.forEach(keyword => {
            for (const [mainTerm, synonyms] of Object.entries(synonymMap)) {
                if (mainTerm.includes(keyword) || synonyms.some(s => s.includes(keyword))) {
                    synonyms.forEach(syn => expandedKeywords.add(syn));
                    expandedKeywords.add(mainTerm);
                } else {
                    // También buscar si la keyword está dentro de algún sinónimo
                    synonyms.forEach(syn => {
                        if (syn.includes(keyword) || keyword.includes(syn)) {
                            expandedKeywords.add(mainTerm);
                            synonyms.forEach(s => expandedKeywords.add(s));
                        }
                    });
                }
            }
        });

        const relevantBookmarks = bookmarks
            .map(bookmark => {
                let score = 0;
                const titleLower = bookmark.title.toLowerCase();
                const urlLower = bookmark.url.toLowerCase();

                // Buscar en título (mayor peso)
                expandedKeywords.forEach(keyword => {
                    if (titleLower.includes(keyword)) {
                        score += 15;
                        // Bonus por coincidencia exacta de palabra
                        if (titleLower.split(/\s+/).some(word => word === keyword)) {
                            score += 10;
                        }
                    }
                    if (urlLower.includes(keyword)) score += 5;
                });

                // Bonus por carpeta
                if (bookmark.folderId) {
                    const folder = folders.find(f => f.id === bookmark.folderId);
                    if (folder && folder.name) {
                        const folderLower = folder.name.toLowerCase();
                        expandedKeywords.forEach(keyword => {
                            if (folderLower.includes(keyword)) {
                                score += 8;
                            }
                        });
                    }
                }

                // Bonus por título corto (más relevante generalmente)
                if (bookmark.title.length < 50) score += 2;

                return { bookmark, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, CONFIG.CONTEXT.MAX_SEARCH_RESULTS);

        let context;

        if (relevantBookmarks.length === 0) {
            context = `🔍 No encontré marcadores relacionados con "${userMessage}".\n\n`;
            context += `📊 Tienes ${bookmarks.length} marcadores guardados.\n\n`;
            context += `💡 RECOMENDACIONES:\n`;
            context += `   • Revisa manualmente las carpetas que tengas\n`;
            context += `   • Usa palabras más específicas (ej: "remote jobs" en lugar de "trabajo")\n`;
            context += `   • Añade nuevos marcadores para temas que te interesen\n\n`;

            // Listar carpetas disponibles (útil para orientar)
            const folderNames = new Map();
            folders.forEach(f => folderNames.set(f.id, f.name));
            const existingFolders = new Set();
            bookmarks.forEach(b => {
                const folderName = b.folderId ? folderNames.get(b.folderId) : 'Sin carpeta';
                existingFolders.add(folderName);
            });

            if (existingFolders.size > 0) {
                context += `📁 Tus carpetas:\n`;
                Array.from(existingFolders).slice(0, 10).forEach(f => {
                    context += `   • ${f}\n`;
                });
            }

            context += `\n💬 Ejemplo: "muéstrame marcadores de ${Array.from(existingFolders)[0] || 'tu carpeta principal'}"`;

        } else {
            context = `🎯 RESULTADOS RELEVANTES para "${userMessage}":\n\n`;

            // Agrupar por carpeta y mostrar SOLO los relevantes
            const byFolder = new Map();
            relevantBookmarks.forEach(({ bookmark }) => {
                const folderId = bookmark.folderId || 'root';
                if (!byFolder.has(folderId)) byFolder.set(folderId, []);
                byFolder.get(folderId).push(bookmark);
            });

            const folderMap = new Map();
            folders.forEach(folder => {
                folderMap.set(folder.id, folder.name);
            });

            let totalShown = 0;
            for (const [folderId, bookmarksList] of byFolder) {
                if (totalShown >= 15) break;
                const folderName = folderId === 'root' ? 'Sin carpeta' : folderMap.get(folderId) || 'Sin carpeta';
                context += `📁 ${folderName}:\n`;
                bookmarksList.forEach(bookmark => {
                    if (totalShown < 15) {
                        context += `  • ${bookmark.title}: ${bookmark.url}\n`;
                        totalShown++;
                    }
                });
            }
            context += `\n📌 IMPORTANTE: Solo estos ${relevantBookmarks.length} marcadores son relevantes para "${userMessage}". NO inventes otros.`;
        }

        // Guardar en caché
        searchCache.set(cacheKey, {
            context: context,
            timestamp: Date.now()
        });

        // Limpiar caché
        if (searchCache.size > 50) {
            const oldest = Array.from(searchCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            searchCache.delete(oldest[0]);
        }
        return context;
    }


    // Contexto de respaldo (cuando no hay palabras clave claras)
    function getFallbackContext() {
        const bookmarks = StateManager.getBookmarks();
        const folders = StateManager.getFolders();

        const folderCount = new Map();
        bookmarks.forEach(bookmark => {
            const folderId = bookmark.folderId || 'root';
            folderCount.set(folderId, (folderCount.get(folderId) || 0) + 1);
        });

        const folderMap = new Map();
        folders.forEach(folder => {
            folderMap.set(folder.id, folder.name);
        });

        let context = `📊 RESUMEN (${bookmarks.length} marcadores totales):\n\n📂 Carpetas disponibles:\n`;
        for (const [folderId, count] of folderCount) {
            const folderName = folderId === 'root' ? 'Sin carpeta' : folderMap.get(folderId) || 'Sin carpeta';
            context += `  • ${folderName}: ${count} marcadores\n`;
        }

        context += `\n💡 Para buscar, pregunta: "busca sobre [tema]" o "tienes marcadores de [categoría]".\n`;
        return context;
    }

    // * Funcion con timeout *
    function fetchWithTimeout(url, options, timeout = CONFIG.REQUEST_TIMEOUT) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
        ]);
    }

    // * Funciones de API IA *
    async function getAIResponse(userMessage, retryCount = 0) {
        const provider = getSelectedProvider();
        const model = getSelectedModel();

        // Verificar API key
        let apiKey = null;
        if (provider.requiresApiKey) {
            apiKey = getStoredApiKey();
            if (!apiKey) {
                return `⚠️ No se ha configurado una clave de API para ${provider.name}. Ve a Configuración > Chat - IA para añadirla.`;
            }
        }

        // Verificar URL para proveedor custom
        if (provider.isCustom && !provider.url) {
            return "⚠️ No has configurado una URL personalizada. Ve a Configuración > Chat-IA y añade la URL de tu API.";
        }

        const context = getBookmarksContext(userMessage);
        const systemPrompt = `${CONFIG.SYSTEM_PROMPT} \n\n${context} `;

        if (CONFIG.ENABLE_DEBUG) {
            console.log(`📊 Contexto obtenido (${context.length} caracteres):`);
            console.log(context.substring(0, 500) + (context.length > 500 ? '...' : ''));
        }

        const currentState = StateManager.getState();
        const recentMessages = (currentState.chat?.messages || []).slice(-10);

        const messages = [
            { role: 'system', content: systemPrompt },
            ...recentMessages.filter(m => m.sender !== 'system' && m.sender !== 'thinking').map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
            })),
            { role: 'user', content: userMessage }
        ];

        // Construir headers
        let headers = {
            'Content-Type': 'application/json'
        };

        // Para Anthropic usa headers específicos
        if (provider.name === 'Anthropic') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
        }

        // Para OpenAI y compatibles (Groq, Mistral, DeepSeek)
        else if (provider.name !== 'Gemini' && provider.requiresApiKey && !provider.isCustom) {
            headers['Authorization'] = `Bearer ${apiKey} `;
        }

        // Construir body según el proveedor
        let requestBody;
        let finalUrl = provider.url;

        if (provider.formatRequest) {
            requestBody = provider.formatRequest(messages, model, systemPrompt);
        } else {
            requestBody = {
                model: model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            };
        }

        // Construir URL final (especial para Gemini)
        if (provider.buildUrl) {
            finalUrl = provider.buildUrl(provider.url, model, apiKey);
        }

        try {
            const response = await fetchWithTimeout(finalUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('API Error:', error);

                if (response.status === 401 && retryCount === 0 && provider.requiresApiKey) {
                    clearApiKey();
                    return `❌ La clave de API para ${provider.name} parece ser inválida.Por favor, revísala en Configuración > Chat - IA.`;
                }

                if (response.status === 429 && retryCount === 0) {
                    return "⏳ Demasiadas peticiones. Por favor, espera unos segundos y vuelve a intentarlo.";
                }
                throw new Error(`API Error: ${response.status} `);
            }

            const data = await response.json();

            // Extraer respuesta según el proveedor
            let aiResponse;
            if (provider.extractResponse) {
                aiResponse = provider.extractResponse(data);
            } else {
                aiResponse = data.choices?.[0]?.message?.content || "No pude generar una respuesta en este momento.";
            }

            // Limpiar la respuesta
            aiResponse = cleanResponse(aiResponse);

            // Obtener marcadores para formatear enlaces
            const bookmarks = StateManager.getBookmarks();
            aiResponse = formatResponseWithLinks(aiResponse, bookmarks);

            if (aiResponse.includes('</a>') && aiResponse.length < 150) {

                aiResponse = aiResponse;
            }

            return aiResponse;

        } catch (error) {
            console.error('AI Request Error:', error);

            if (error.message === 'Request timeout') {
                return "⏰ La petición está tomando demasiado tiempo. Por favor, intenta de nuevo o cambia a un modelo más rápido en Configuración.";
            }

            if (retryCount === 0) {
                if (CONFIG.ENABLE_DEBUG) console.log('Reintentando petición...');
                return await getAIResponse(userMessage, retryCount + 1);
            }
            return "❌ Lo siento, hubo un error obteniendo respuesta del asistente. Por favor, intenta de nuevo más tarde.";
        }
    }

    // * Funciones auxiliares *
    function cleanResponse(response) {
        if (!response) return response;

        let cleaned = response
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1');

        // Limpiar URLs
        cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, (url) => {
            let cleanUrl = url.replace(/[\\\/]+$/, '');
            cleanUrl = cleanUrl.replace(/[\)\]\}]+$/, '');
            cleanUrl = cleanUrl.replace(/[\“\”\'\"]+$/, '');
            return cleanUrl;
        });

        cleaned = cleaned.replace(/(\d+)\.\s+([^\d\n][^:\n]*?)\s*\n?\s*(https?:\/\/[^\s\n]+)/g, (match, num, text, url) => {
            return `${num}. ${text.trim()}: ${url}`;
        });

        cleaned = cleaned.replace(/(\d+)\.([^\s])/g, '$1. $2');

        cleaned = cleaned.replace(/(\d+\.\s[^\n]+)\n{2,}(\d+\.)/g, '$1\n$2');

        // Limpiar caracteres sobrantes
        cleaned = cleaned.replace(/\]\s*\(/g, ': ');
        cleaned = cleaned.replace(/[\[\]]/g, '');
        cleaned = cleaned.replace(/\s+/g, ' ').replace(/\. /g, '.\n');

        // Limitar longitud
        if (cleaned.length > 2000) {
            cleaned = cleaned.substring(0, 1997) + '...';
        }
        return cleaned;
    }

    function addClearChatButton() {
        const chatContainer = document.querySelector('[data-container="chat"] .container-actions');
        if (!chatContainer) return;

        // Verificar si ya existe
        if (document.querySelector('.btn-clear-chat')) return;

        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn-clear-chat';
        clearBtn.title = 'Limpiar historial';
        clearBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>`;
        clearBtn.addEventListener('click', () => clearChatHistory());
        chatContainer.appendChild(clearBtn);
    }

    async function clearChatHistory() {
        const confirmed = await ModalManager.showConfirmModal(
            'Limpiar historial',
            '¿Estás seguro de que quieres borrar todo el historial de conversación? Esta acción no se puede deshacer.',
            'Limpiar',
            'Cancelar'
        );

        if (!confirmed) return;

        StateManager.setState({ chat: { messages: [] } });
        await saveChatToIndexedDB([]);
        renderChatHistory();
        await addMessage('✨ Historial limpiado. ¿En qué puedo ayudarte?', 'bot');
    }

    function copyMessageToClipboard(messageId) {
        const messageElement = document.querySelector(`.chat-message[data-id="${messageId}"]`);
        if (!messageElement) return;

        const text = messageElement.querySelector('p')?.innerText || '';
        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            showToast('Mensaje copiado al portapapeles');
        }).catch(() => {
            showToast('No se pudo copiar el mensaje', 'error');
        });
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `chat-toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        padding: 8px 16px;
        background: ${type === 'error' ? '#ef4444' : '#10b981'};
        color: white;
        border-radius: 8px;
        font-size: 0.85rem;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function formatResponseWithLinks(response, bookmarks) {
        if (!response || !bookmarks || bookmarks.length === 0) return response;

        let formattedResponse = response;

        const validUrls = new Set(bookmarks.map(b => b.url));
        const validTitles = new Set(bookmarks.map(b => b.title.toLowerCase()));

        const urlRegex = /(https?:\/\/[^\s<>\[\]{}\|\\^`\n]+)/g;
        let hasFakeUrls = false;

        formattedResponse = formattedResponse.replace(urlRegex, (url) => {
            let cleanUrl = url.trim();
            cleanUrl = cleanUrl.replace(/[\\\/]+$/, '');
            cleanUrl = cleanUrl.replace(/[.,;:!?)\]}]+$/, '');

            // Si la URL NO está en los marcadores del usuario
            if (!validUrls.has(cleanUrl) && !validUrls.has(url)) {
                hasFakeUrls = true;
                // Reemplazar con advertencia en lugar del link falso
                return `[URL no encontrada en tus marcadores]`;
            }

            const bookmark = bookmarks.find(b => b.url === cleanUrl || b.url === url);
            const title = bookmark ? bookmark.title : cleanUrl;
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="chat-bookmark-link" title="${escapeHtml(title)}">${escapeHtml(title.length > 50 ? title.substring(0, 47) + '...' : title)}</a>`;
        });

        if (hasFakeUrls) {
            formattedResponse += '\n\n⚠️ Algunos enlaces sugeridos no están en tus marcadores. Revisa tus carpetas para ver los que realmente tienes guardados.';
        }

        // Formato markdown
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        formattedResponse = formattedResponse.replace(markdownLinkRegex, (match, text, url) => {
            let cleanUrl = url.replace(/[\\\/]+$/, '');
            if (!validUrls.has(cleanUrl)) {
                return `[${text} - no encontrado]`;
            }
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="chat-bookmark-link">${escapeHtml(text)}</a>`;
        });
        return formattedResponse;
    }

    // * Inicialización *
    async function init() {
        await loadChatFromIndexedDB();

        syncModelInputWithProvider();
        startCacheCleaner();

        const currentState = StateManager.getState();
        if (!currentState.chat?.messages?.length) {
            await addMessage('¡Hola! Puedo ayudarte a encontrar marcadores. ¿Qué buscas?', 'bot');
        }

        setupEventListeners();
        addClearChatButton();
    }

    function setupEventListeners() {
        const chatInput = document.getElementById('chatInput');
        const btnSendChat = document.getElementById('btnSendChat');

        if (!chatInput || !btnSendChat) return;

        const newBtn = btnSendChat.cloneNode(true);
        btnSendChat.parentNode.replaceChild(newBtn, btnSendChat);
        const newInput = chatInput.cloneNode(true);
        chatInput.parentNode.replaceChild(newInput, chatInput);

        newBtn.addEventListener('click', () => sendMessage(newInput.value));
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage(newInput.value);
            }
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Limpiar caché periódicamente (cada 10 minutos)
    function startCacheCleaner() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of searchCache) {
                if (now - value.timestamp > CONFIG.CONTEXT.CACHE_DURATION) {
                    searchCache.delete(key);
                }
            }
            if (CONFIG.ENABLE_DEBUG && searchCache.size > 0) {
                console.log(`🧹 Caché limpiada. Tamaño actual: ${searchCache.size}`);
            }
        }, 10 * 60 * 1000);
    }

    return {
        init,
        sendMessage,
        clearChatHistory,
        getStoredApiKey,
        saveApiKey,
        clearApiKey,
        hasApiKey,
        getSelectedProvider,
        saveProvider,
        getSelectedModel,
        saveModel,
        saveCustomApiUrl,
        getCustomApiUrl
    };
})();
window.ChatManager = ChatManager;
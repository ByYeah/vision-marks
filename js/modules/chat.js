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
        SYSTEM_PROMPT: `Eres un asistente útil especializado en organizar y recomendar marcadores web. 
        Responde de manera concisa y amigable. Si no sabes algo relacionado con los marcadores, 
        sugiere al usuario que revise su lista o busque en la web. Siempre responde en el mismo idioma del usuario.`,
        REQUEST_TIMEOUT: 30000,
        MAX_CONTENT_BOOKMARKS: 50,
        ENABLE_DEBUG: true,
    };

    // Proveedores disponibles
    const PROVIDERS = {
        groq: {
            name: 'Groq',
            url: 'https://api.groq.com/openai/v1/chat/completions',
            defaultModel: 'llama3-8b-8192',
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

    function getSelectedModel() {
        const savedModel = localStorage.getItem(CONFIG.MODEL_KEY);
        if (savedModel) return savedModel;
        return getSelectedProvider().defaultModel;
    }

    function saveProvider(providerKey) {
        localStorage.setItem(CONFIG.PROVIDER_KEY, providerKey);
    }

    function saveModel(model) {
        if (model && model.trim()) {
            localStorage.setItem(CONFIG.MODEL_KEY, model.trim());
        }
    }

    function saveCustomApiUrl(url) {
        localStorage.setItem(CONFIG.CUSTOM_URL_KEY, url);
    }

    function getCustomApiUrl() {
        return localStorage.getItem(CONFIG.CUSTOM_URL_KEY) || '';
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
        console.log('📝 saveApiKey llamado, key:', key ? key.substring(0, 5) + '...' : 'null');

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

        console.log('✅ API key guardada correctamente (encriptada)');
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
        <p>${escapeHtml(message.text)}</p>
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
            if (p) p.innerHTML = escapeHtml(newText);
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
    function getBookmarksContext() {
        const bookmarks = StateManager.getBookmarks();
        const folders = StateManager.getFolders();

        if (!bookmarks.length) {
            return "El usuario aún no tiene marcadores guardados.";
        }

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

        let context = "Estos son los marcadores actuales del usuario:\n";

        for (const [folderId, bookmarksList] of bookmarksByFolder) {
            const folderName = folderId === 'root' ? 'Sin carpeta' : folderMap.get(folderId) || 'Sin carpeta';
            context += `\n📁 ${folderName}:\n`;
            bookmarksList.slice(0, 20).forEach(b => {
                context += `  - ${b.title}: ${b.url}\n`;
            });
            if (bookmarksList.length > 20) {
                context += `  ... y ${bookmarksList.length - 20} más\n`;
            }
        }

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

        if (CONFIG.ENABLE_DEBUG) {
            console.log(`🤖 Usando proveedor: ${provider.name}, modelo: ${model}`);
        }

        // Verificar API key
        let apiKey = null;
        if (provider.requiresApiKey) {
            apiKey = getStoredApiKey();
            if (!apiKey) {
                return `⚠️ No se ha configurado una clave de API para ${provider.name}. Ve a Configuración > Chat-IA para añadirla.`;
            }
        }

        // Verificar URL para proveedor custom
        if (provider.isCustom && !provider.url) {
            return "⚠️ No has configurado una URL personalizada. Ve a Configuración > Chat-IA y añade la URL de tu API.";
        }

        const context = getBookmarksContext();
        const systemPrompt = `${CONFIG.SYSTEM_PROMPT}\n\n${context}`;

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
            headers['Authorization'] = `Bearer ${apiKey}`;
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

        if (provider.name === 'Gemini') {
            console.log('🔑 API Key (primeros 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'NULL');
            console.log('🌐 URL final:', finalUrl.replace(apiKey, 'HIDDEN_KEY'));
            console.log('📦 Request Body:', JSON.stringify(requestBody, null, 2));
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
                    return `❌ La clave de API para ${provider.name} parece ser inválida. Por favor, revísala en Configuración > Chat-IA.`;
                }

                if (response.status === 429 && retryCount === 0) {
                    return "⏳ Demasiadas peticiones. Por favor, espera unos segundos y vuelve a intentarlo.";
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            // Extraer respuesta según el proveedor
            let aiResponse;
            if (provider.extractResponse) {
                aiResponse = provider.extractResponse(data);
            } else {
                aiResponse = data.choices?.[0]?.message?.content || "No pude generar una respuesta en este momento.";
            }

            // Limpiar la respuesta (eliminar markdown excessivo, etc.)
            aiResponse = cleanResponse(aiResponse);

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

        // Eliminar markdown excesivo pero mantener formato básico
        let cleaned = response
            .replace(/\*\*(.*?)\*\*/g, '$1')  // negritas a texto normal
            .replace(/\*(.*?)\*/g, '$1');      // cursiva a texto normal

        // Limitar longitud si es demasiado larga
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
        clearBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
    `;

        clearBtn.addEventListener('click', () => clearChatHistory());
        chatContainer.appendChild(clearBtn);
    }

    async function clearChatHistory() {
        // Confirmar antes de limpiar
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

        if (CONFIG.ENABLE_DEBUG) console.log('🧹 Historial de chat limpiado');
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

    // * Inicialización *
    async function init() {
        await loadChatFromIndexedDB();

        const currentState = StateManager.getState();
        if (!currentState.chat?.messages?.length) {
            await addMessage('¡Hola! Puedo ayudarte a encontrar marcadores. ¿Qué buscas?', 'bot');
        }

        setupEventListeners();
        addClearChatButton();
        console.log('💬 ChatManager initialized');
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

    // * API Pública *
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
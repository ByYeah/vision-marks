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
        sugiere al usuario que revise su lista o busque en la web. Siempre responde en el mismo idioma del usuario.`
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
            name: 'Google Gemini',
            url: 'https://generativelanguage.googleapis.com/v1beta/models',
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
                    contents.push({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    });
                }

                const requestBody = {
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                        topP: 0.95
                    }
                };

                // Añadir instrucción del sistema si existe
                if (systemInstruction) {
                    requestBody.systemInstruction = {
                        parts: [{ text: systemInstruction }]
                    };
                }

                return requestBody;
            },
            // Gemini requiere la API key en la URL, no en el header
            buildUrl: (baseUrl, model, apiKey) => {
                return `${baseUrl}/${model}:generateContent?key=${apiKey}`;
            },
            extractResponse: (data) => {
                try {
                    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta.";
                } catch (e) {
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
            return btoa(key);
        } catch (e) {
            console.error('Error encrypting API key:', e);
            return null;
        }
    }

    function decryptApiKey(encrypted) {
        if (!encrypted) return null;
        try {
            return atob(encrypted);
        } catch (e) {
            console.error('Error decrypting API key:', e);
            return null;
        }
    }

    function getStoredApiKey() {
        if (cachedApiKey) return cachedApiKey;
        const encrypted = localStorage.getItem(CONFIG.API_STORAGE_KEY);
        const decrypted = decryptApiKey(encrypted);
        if (decrypted) cachedApiKey = decrypted;
        return decrypted;
    }

    function saveApiKey(key) {
        if (!key) {
            localStorage.removeItem(CONFIG.API_STORAGE_KEY);
            cachedApiKey = null;
            return;
        }
        localStorage.setItem(CONFIG.API_STORAGE_KEY, encryptApiKey(key));
        cachedApiKey = key;
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
            sender: sender,
            timestamp: new Date().toISOString()
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

    function renderMessageToUI(message) {
        const chatMessagesContainer = document.getElementById('chatMessages');
        if (!chatMessagesContainer) return;

        if (document.querySelector(`.chat-message[data-id="${message.id}"]`)) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.sender}`;
        messageDiv.setAttribute('data-id', message.id);
        messageDiv.innerHTML = `<p>${escapeHtml(message.text)}</p>`;

        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
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
            msg.id === messageId ? { ...msg, text: newText } : msg
        );
        StateManager.setState({ chat: { messages: updatedMessages } });

        const messageElement = document.querySelector(`.chat-message[data-id="${messageId}"]`);
        if (messageElement) {
            const p = messageElement.querySelector('p');
            if (p) p.innerHTML = escapeHtml(newText);
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

    // * Funciones de API IA *
    async function getAIResponse(userMessage, retryCount = 0) {
        const provider = getSelectedProvider();
        const model = getSelectedModel();

        // Verificar API key si es requerida
        if (provider.requiresApiKey) {
            const apiKey = getStoredApiKey();
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
            ...recentMessages.filter(m => m.sender !== 'system').map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
            })),
            { role: 'user', content: userMessage }
        ];

        // Construir headers (Gemini no necesita headers especiales)
        const headers = {
            'Content-Type': 'application/json'
        };

        // Para Anthropic usa headers específicos
        if (provider.name === 'Anthropic') {
            const apiKey = getStoredApiKey();
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
        }

        // Para OpenAI y compatibles (Groq, Mistral, DeepSeek, Together)
        else if (provider.name !== 'Gemini' && provider.requiresApiKey && !provider.isCustom) {
            const apiKey = getStoredApiKey();
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
            const apiKey = getStoredApiKey();
            finalUrl = provider.buildUrl(provider.url, model, apiKey);
        }

        try {
            const response = await fetch(finalUrl, {
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
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            // Extraer respuesta según el proveedor
            if (provider.extractResponse) {
                return provider.extractResponse(data);
            }
            return data.choices?.[0]?.message?.content || "No pude generar una respuesta en este momento.";

        } catch (error) {
            console.error('AI Request Error:', error);
            return "❌ Lo siento, hubo un error obteniendo respuesta del asistente. Por favor, intenta de nuevo más tarde.";
        }
    }

    // * Función principal *
    async function sendMessage(messageText) {
        if (!messageText || !messageText.trim()) return;

        await addMessage(messageText.trim(), 'user');

        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.value = '';

        const thinkingId = await addMessage('🤔 Pensando...', 'bot');

        try {
            const aiResponse = await getAIResponse(messageText);
            await replaceMessage(thinkingId.id, aiResponse, 'bot');
        } catch (error) {
            console.error('SendMessage Error:', error);
            await replaceMessage(thinkingId.id, '❌ Ocurrió un error inesperado. Por favor, intenta de nuevo.', 'bot');
        }
    }

    async function clearChatHistory() {
        StateManager.setState({ chat: { messages: [] } });
        await saveChatToIndexedDB([]);
        renderChatHistory();
        await addMessage('¡Hola! Puedo ayudarte a encontrar marcadores. ¿Qué buscas?', 'bot');
    }

    // * Inicialización *
    async function init() {
        await loadChatFromIndexedDB();

        const currentState = StateManager.getState();
        if (!currentState.chat?.messages?.length) {
            await addMessage('¡Hola! Puedo ayudarte a encontrar marcadores. ¿Qué buscas?', 'bot');
        }

        setupEventListeners();
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
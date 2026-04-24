const ChatManager = (() => {
    // Función para añadir un mensaje al estado y renderizarlo
    async function addMessage(text, sender) { // sender: 'user' o 'bot'
        const newMessage = {
            id: Date.now(),
            text: text,
            sender: sender,
            timestamp: new Date().toISOString()
        };

        // Actualizar el estado global
        const currentState = StateManager.getState();
        const updatedMessages = [...(currentState.chat?.messages || []), newMessage];
        StateManager.setState({ chat: { messages: updatedMessages } });

        // Renderizar el mensaje en la UI
        renderMessageToUI(newMessage);
        
        // Guardar en IndexedDB
        await saveChatToIndexedDB(updatedMessages);
        
        return newMessage;
    }

    // Función para renderizar un mensaje en el contenedor del chat
    function renderMessageToUI(message) {
        const chatMessagesContainer = document.getElementById('chatMessages');
        if (!chatMessagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.sender}`;
        messageDiv.innerHTML = `<p>${escapeHtml(message.text)}</p>`;
        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    // Función para renderizar todo el historial (al cargar la app)
    function renderChatHistory() {
        const currentState = StateManager.getState();
        const messages = currentState.chat?.messages || [];
        const chatMessagesContainer = document.getElementById('chatMessages');
        if (chatMessagesContainer) {
            chatMessagesContainer.innerHTML = ''; // Limpiar
            messages.forEach(msg => renderMessageToUI(msg));
        }
    }

    // Función para guardar en IndexedDB
    async function saveChatToIndexedDB(messages) {
        if (window.DatabaseManager) {
            await DatabaseManager.settings.set('chat_messages', messages);
        }
    }

    // Función para cargar desde IndexedDB
    async function loadChatFromIndexedDB() {
        if (window.DatabaseManager) {
            const messages = await DatabaseManager.settings.get('chat_messages');
            if (messages && messages.length) {
                StateManager.setState({ chat: { messages } });
                renderChatHistory();
            }
        }
    }

    // Función para manejar el envío de un mensaje del usuario
    async function sendMessage(messageText) {
        if (!messageText.trim()) return;

        // Añadir mensaje del usuario a la UI y al estado
        await addMessage(messageText, 'user');
        
        // Limpiar el input
        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.value = '';

        // Aquí irá la lógica para obtener respuesta de la IA
        setTimeout(() => {
            addMessage('Función de IA en desarrollo.', 'bot');
        }, 500);
    }

    // Inicializar el módulo: cargar historial y conectar eventos
    async function init() {
        await loadChatFromIndexedDB();
        setupEventListeners();
        console.log('ChatManager initialized');
    }

    function setupEventListeners() {
        const chatInput = document.getElementById('chatInput');
        const btnSendChat = document.getElementById('btnSendChat');

        if (chatInput && btnSendChat) {
            // Eliminar listeners antiguos para evitar duplicados
            const newBtn = btnSendChat.cloneNode(true);
            btnSendChat.parentNode.replaceChild(newBtn, btnSendChat);
            const newInput = chatInput.cloneNode(true);
            chatInput.parentNode.replaceChild(newInput, chatInput);

            newBtn.addEventListener('click', () => sendMessage(newInput.value));
            newInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage(newInput.value);
            });
        }
    }

    // Helper
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return { init, sendMessage };
})();

window.ChatManager = ChatManager;
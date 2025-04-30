document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const clearButton = document.getElementById('clear-button');
    const thinkingIndicator = document.getElementById('thinking-indicator');

    // Function to add a message to the chat window
    function addMessage(htmlContent, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        const iconClass = sender === 'user' ? 'fa-user' : 'fa-brain'; // Use fa-brain for bot
        const iconColor = sender === 'user' ? '#007bff' : '#6c757d';
        const iconElement = `<i class="fas ${iconClass}" style="color: ${iconColor}; margin-${sender === 'user' ? 'left' : 'right'}: 10px; font-size: 1.2em; margin-top: 5px;"></i>`;

        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        contentElement.innerHTML = htmlContent; // Use innerHTML as response is HTML

        if (sender === 'user') {
            messageElement.appendChild(contentElement); // Text first
            messageElement.insertAdjacentHTML('beforeend', iconElement); // Then icon
        } else {
            messageElement.insertAdjacentHTML('afterbegin', iconElement); // Icon first
            messageElement.appendChild(contentElement); // Then text
        }

        chatWindow.appendChild(messageElement);
        chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to bottom
    }

    // Function to handle sending a message
    async function sendMessage() {
        const messageText = messageInput.value.trim();
        if (!messageText) return; // Don't send empty messages

        // Display user message immediately
        // Escape basic HTML in user input before displaying to prevent XSS
        const escapedUserMessage = messageText.replace(/</g, "<").replace(/>/g, ">");
        addMessage(`<p>${escapedUserMessage}</p>`, 'user'); // Wrap in <p> for consistency
        messageInput.value = ''; // Clear input
        messageInput.style.height = 'auto'; // Reset height after sending
        messageInput.focus(); // Keep focus on input

        // Show thinking indicator and disable input/button
        thinkingIndicator.style.display = 'block';
        sendButton.disabled = true;
        messageInput.disabled = true;
        clearButton.disabled = true; // Disable clear while thinking

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: messageText }),
            });

            if (!response.ok) {
                // Try to get error message from backend response body
                let errorMsg = `Error: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { /* Ignore if response body is not JSON */ }
                 addMessage(`<p>⚠️ ${errorMsg}</p>`, 'bot');
                console.error('Chat request failed:', response.status, response.statusText);

            } else {
                const data = await response.json();
                if (data.error) {
                    addMessage(`<p>⚠️ ${data.error}</p>`, 'bot');
                } else {
                    // Add bot's HTML response
                    addMessage(data.response, 'bot');
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage(`<p>⚠️ Could not connect to the server. Please try again later.</p>`, 'bot');
        } finally {
            // Hide thinking indicator and re-enable input/button
            thinkingIndicator.style.display = 'none';
            sendButton.disabled = false;
            messageInput.disabled = false;
            clearButton.disabled = false; // Re-enable clear button
        }
    }

    // Function to clear chat history
    async function clearChat() {
        if (!confirm("Are you sure you want to clear the chat history?")) {
            return;
        }
        try {
            const response = await fetch('/clear', { method: 'POST' });
            if (response.ok) {
                chatWindow.innerHTML = ''; // Clear the UI
                // Add the initial greeting back
                addMessage('<p>Hello! How can I help you today?</p>', 'bot');
                console.log("Chat history cleared.");
            } else {
                 console.error('Failed to clear chat history on server.');
                 alert('Failed to clear chat history on the server.');
            }
        } catch (error) {
             console.error('Error clearing chat:', error);
             alert('An error occurred while trying to clear the chat.');
        }
    }


    // --- Event Listeners ---
    sendButton.addEventListener('click', sendMessage);
    clearButton.addEventListener('click', clearChat);

    messageInput.addEventListener('keypress', (event) => {
        // Send message on Enter key press (unless Shift+Enter for newline)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default newline behavior
            sendMessage();
        }
    });

     // Auto-resize textarea height
     messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto'; // Reset height
        messageInput.style.height = (messageInput.scrollHeight) + 'px'; // Set to content height
    });

});
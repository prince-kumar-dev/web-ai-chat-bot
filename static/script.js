document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chatWindow = document.getElementById('chat-window');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const clearButton = document.getElementById('clear-button');
    const thinkingIndicator = document.getElementById('thinking-indicator');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const bodyElement = document.body;
    // Optional: Pygments theme links (if swapping themes)
    // const pygmentsThemeLink = document.getElementById('pygments-theme');
    // const pygmentsThemeLightLink = document.getElementById('pygments-theme-light');

    // --- Constants ---
    const THEME_KEY = 'chat_theme';
    const LIGHT_THEME = 'light';
    const DARK_THEME = 'dark';

    // --- Functions ---

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function addMessage(htmlContent, sender, isUserMessage = false) {
        // ... (addMessage function remains the same as before) ...
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        const iconClass = sender === 'user' ? 'fa-user' : 'fa-robot'; // fa-robot for bot
        const iconElement = `<i class="fas ${iconClass} message-icon"></i>`;

        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');

        if (isUserMessage) {
            const p = document.createElement('p');
            p.textContent = htmlContent;
            contentElement.appendChild(p);
        } else {
            contentElement.innerHTML = htmlContent;
        }

        if (sender === 'user') {
            messageElement.appendChild(contentElement);
            messageElement.insertAdjacentHTML('beforeend', iconElement);
        } else {
            messageElement.insertAdjacentHTML('afterbegin', iconElement);
            messageElement.appendChild(contentElement);
        }

        chatWindow.appendChild(messageElement);
        chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
    }

    function addInitialGreeting() {
         if (chatWindow.children.length === 0) {
              addMessage('<p>Hello! How can I assist you today?</p>', 'bot');
         }
    }

    async function sendMessage() {
        // ... (sendMessage function remains the same as before) ...
        const messageText = messageInput.value.trim();
        if (!messageText) return;

        addMessage(messageText, 'user', true);
        messageInput.value = '';
        adjustTextareaHeight();
        messageInput.focus();

        showThinking(true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText }),
            });

            let data;
            if (!response.ok) {
                let errorMsg = `Server error: ${response.status}`;
                try {
                    data = await response.json();
                    errorMsg = data.error || errorMsg;
                } catch (e) { /* Ignore */ }
                 addMessage(`<p>⚠️ Sorry, something went wrong: ${escapeHTML(errorMsg)}</p>`, 'bot');
                console.error('Chat request failed:', response.status, response.statusText);
            } else {
                data = await response.json();
                if (data.error) {
                    addMessage(`<p>⚠️ Error: ${escapeHTML(data.error)}</p>`, 'bot');
                } else if (data.response) {
                    addMessage(data.response, 'bot');
                } else {
                     addMessage(`<p>⚠️ Received an empty response from the server.</p>`, 'bot');
                }
            }
        } catch (error) {
            console.error('Network or fetch error:', error);
             addMessage(`<p>⚠️ Network error. Could not connect to the server. Please check your connection and try again.</p>`, 'bot');
        } finally {
            showThinking(false);
        }
    }

    function showThinking(isThinking) {
        // ... (showThinking function remains the same as before) ...
        if (isThinking) {
            thinkingIndicator.style.display = 'flex';
            messageInput.disabled = true;
            sendButton.disabled = true;
            clearButton.disabled = true;
            themeToggleButton.disabled = true; // Disable theme toggle while thinking
            chatWindow.scrollTop = chatWindow.scrollHeight;
        } else {
            thinkingIndicator.style.display = 'none';
            messageInput.disabled = false;
            sendButton.disabled = false;
            clearButton.disabled = false;
             themeToggleButton.disabled = false; // Re-enable theme toggle
            messageInput.focus();
        }
    }

    async function clearChat() {
        // ... (clearChat function remains the same as before) ...
        if (!confirm("Are you sure you want to clear the entire chat history?")) {
            return;
        }
        try {
            const response = await fetch('/clear', { method: 'POST' });
            if (response.ok) {
                chatWindow.innerHTML = '';
                addInitialGreeting();
                console.log("Chat history cleared.");
            } else {
                 const errorData = await response.json().catch(() => ({}));
                 const errorMsg = errorData.error || `Server error (${response.status})`;
                 alert(`Failed to clear chat history: ${errorMsg}`);
                 console.error('Failed to clear chat history on server.');
            }
        } catch (error) {
             console.error('Error clearing chat:', error);
             alert('An network error occurred while trying to clear the chat.');
        }
    }

    function adjustTextareaHeight() {
        // ... (adjustTextareaHeight function remains the same as before) ...
        messageInput.style.height = 'auto';
        const maxHeight = parseInt(window.getComputedStyle(messageInput).maxHeight, 10);
        const newHeight = Math.min(messageInput.scrollHeight, maxHeight);
        messageInput.style.height = newHeight + 'px';
    }

    // --- Theme Handling ---
    function applyTheme(theme) {
        if (theme === DARK_THEME) {
            bodyElement.classList.add('dark-theme');
            themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>'; // Show sun icon
            // Optional: Enable dark Pygments theme, disable light
            // if (pygmentsThemeLink && pygmentsThemeLightLink) {
            //     pygmentsThemeLink.disabled = false;
            //     pygmentsThemeLightLink.disabled = true;
            // }
        } else {
            bodyElement.classList.remove('dark-theme');
            themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>'; // Show moon icon
            // Optional: Enable light Pygments theme, disable dark
            // if (pygmentsThemeLink && pygmentsThemeLightLink) {
            //     pygmentsThemeLink.disabled = true;
            //     pygmentsThemeLightLink.disabled = false;
            // }
        }
    }

    function toggleTheme() {
        const currentTheme = bodyElement.classList.contains('dark-theme') ? DARK_THEME : LIGHT_THEME;
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
        applyTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme); // Save preference
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        // If no theme saved, check system preference
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? DARK_THEME : LIGHT_THEME);
        applyTheme(initialTheme);
    }

    // --- Event Listeners ---
    sendButton.addEventListener('click', sendMessage);
    clearButton.addEventListener('click', clearChat);
    themeToggleButton.addEventListener('click', toggleTheme); // Add listener for theme toggle

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', adjustTextareaHeight);

     // Listen for system theme changes (optional)
     window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        // Only apply if no theme is explicitly saved by the user
        if (!localStorage.getItem(THEME_KEY)) {
            applyTheme(event.matches ? DARK_THEME : LIGHT_THEME);
        }
    });


    // --- Initial Setup ---
    loadTheme(); // Load saved theme or detect system preference
    addInitialGreeting();
    adjustTextareaHeight();

});

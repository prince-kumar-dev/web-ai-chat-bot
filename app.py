import os
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify, session
import markdown # To convert Gemini's Markdown response to HTML

# --- Configuration ---
# Load API Key from environment variable
API_KEY = ##############

# You can change the model if needed'
MODEL_NAME = #########

# --- Flask App Setup ---
app = Flask(__name__)
# Secret key is needed for session management (to store chat history)
# IMPORTANT: Change this to a strong, random secret key in a real application!
app.secret_key = ##########

# --- Gemini API Setup ---
gemini_configured = False
if not API_KEY:
    print("🔴 Error: GEMINI_API_KEY environment variable not set.")
    # You could potentially fall back to prompting, but for a web app,
    # environment variables or a config file are standard.
else:
    try:
        genai.configure(api_key=API_KEY)
        gemini_configured = True
        print("✅ Gemini API configured successfully.")
    except Exception as e:
        print(f"🔴 Error configuring Gemini API: {e}")

# --- Helper Function for Gemini Interaction ---
def get_gemini_response(chat_session, prompt):
    """Sends a prompt to the ongoing chat session and gets the response."""
    if not chat_session:
        return "Error: Chat session not initialized."
    try:
        # Send message
        response = chat_session.send_message(prompt)
        # Convert markdown response to HTML
        html_response = markdown.markdown(response.text, extensions=['fenced_code', 'codehilite'])
        return html_response

    except genai.types.generation_types.BlockedPromptException as e:
         print(f"⚠️ BlockedPromptException: {e}")
         return f"<p>⚠️ <strong>Your prompt was blocked.</strong></p><p>Reason: Inappropriate content detected.</p>" # Provide user-friendly message
    except genai.types.generation_types.StopCandidateException as e:
        print(f"⚠️ StopCandidateException: {e}")
        # Try to get partial text if available
        try:
            html_response = markdown.markdown(response.text, extensions=['fenced_code', 'codehilite'])
            return f"{html_response}<p>⚠️ <strong>Response stopped.</strong> Reason: {e}</p>"
        except Exception:
            return f"<p>⚠️ <strong>Response stopped.</strong> Reason: {e}</p>" # Fallback message
    except Exception as e:
        print(f"🔴 An unexpected error occurred: {e}")
        # Attempt to restart session maybe? For now, just return error.
        return f"<p>🔴 <strong>An error occurred:</strong> {e}</p>"

# --- Flask Routes ---
@app.route('/')
def index():
    """Renders the main chat page."""
    if not gemini_configured:
         # Optional: Render an error page or message if API key is missing
         return "Error: Gemini API Key not configured. Please set the GEMINI_API_KEY environment variable.", 500

    # Initialize chat history and session in Flask's session object if not present
    if 'chat_session_history' not in session:
        print("✨ Initializing new chat history in session.")
        # Start with an empty history
        session['chat_session_history'] = []
        # You could optionally add a system prompt here if desired:
        # session['chat_session_history'].append({'role': 'user', 'parts': ["You are a helpful AI assistant."] })
        # session['chat_session_history'].append({'role': 'model', 'parts': ["Okay, I understand. How can I help you today?"] })

    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    """Handles the chat interaction."""
    if not gemini_configured:
        return jsonify({'error': 'Gemini API not configured'}), 500

    user_message = request.json.get('message')
    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    # Retrieve history from session
    history = session.get('chat_session_history', [])

    try:
        # Start a *new* chat session instance using the history from the session
        # This allows Gemini to have context from the current browser session
        model = genai.GenerativeModel(MODEL_NAME)
        chat_session_instance = model.start_chat(history=history)

        # Get response from Gemini
        bot_response_html = get_gemini_response(chat_session_instance, user_message)

        # Update the history in the session *after* getting the response
        # Use the format Gemini expects for history
        history.append({'role': 'user', 'parts': [user_message]})
        # Important: Only add the raw text part of the response to history, not the HTML
        raw_bot_response = chat_session_instance.last.text # Access the raw text
        history.append({'role': 'model', 'parts': [raw_bot_response]})

        # Limit history size to prevent overly large sessions (optional but recommended)
        MAX_HISTORY_LENGTH = 20 # Keep last 10 pairs (user + model)
        if len(history) > MAX_HISTORY_LENGTH:
            history = history[-MAX_HISTORY_LENGTH:]

        session['chat_session_history'] = history

        return jsonify({'response': bot_response_html})

    except Exception as e:
        print(f"🔴 Error during chat processing: {e}")
        return jsonify({'error': 'An internal error occurred.'}), 500

@app.route('/clear', methods=['POST'])
def clear_chat():
    """Clears the chat history from the session."""
    if 'chat_session_history' in session:
        session.pop('chat_session_history')
        print("🧹 Chat history cleared.")
    return jsonify({'status': 'cleared'})

# --- Run the App ---
if __name__ == '__main__':
    # Ensure the templates and static folders exist
    if not os.path.exists('templates'):
        os.makedirs('templates')
    if not os.path.exists('static'):
        os.makedirs('static')
    # You might need to install markdown: pip install Flask Markdown Pygments
    # Pygments is needed for code highlighting in Markdown
    app.run(debug=True) # debug=True is helpful for development, turn off for production
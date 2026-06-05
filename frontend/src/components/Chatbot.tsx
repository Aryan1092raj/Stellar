'use client';

import { useState, useRef, useEffect } from 'react';
import { getChatSuggestions, sendChatMessage } from '../lib/api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Hello! I\'m your GeoLedger AI Assistant. Ask me anything about donations, wallets, NGOs, or how our blockchain platform works!',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load suggestions
  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      getChatSuggestions()
        .then(setSuggestions)
        .catch(err => console.error('Failed to load suggestions:', err));
    }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const data = await sendChatMessage(content, messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })));

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.fallbackResponse || 'Sorry, I encountered an error. Please try again.',
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '😔 Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Remove emoji from suggestion
    const cleanSuggestion = suggestion.replace(/^[^\s]+\s/, '');
    sendMessage(cleanSuggestion);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className="chatbot-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Open AI Assistant"
      >
        {isOpen ? '✕' : '💬'}
        {!isOpen && <span className="chatbot-badge">AI</span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <div className="chatbot-title">GeoLedger AI Assistant</div>
                <div className="chatbot-status">
                  <span className="chatbot-status-dot"></span>
                  Online
                </div>
              </div>
            </div>
            <button 
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              title="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chatbot-message ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                {message.role === 'assistant' && (
                  <div className="chatbot-message-avatar">🤖</div>
                )}
                <div className="chatbot-message-content">
                  <div className="chatbot-message-text">{message.content}</div>
                  <div className="chatbot-message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="chatbot-message-avatar user">👤</div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="chatbot-message assistant">
                <div className="chatbot-message-avatar">🤖</div>
                <div className="chatbot-message-content">
                  <div className="chatbot-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions (show when no user messages yet) */}
            {messages.length === 1 && suggestions.length > 0 && (
              <div className="chatbot-suggestions">
                <div className="chatbot-suggestions-title">Try asking:</div>
                {suggestions.slice(0, 4).map((suggestion, index) => (
                  <button
                    key={index}
                    className="chatbot-suggestion-btn"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="chatbot-input-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              placeholder="Ask me anything..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={!inputMessage.trim() || isLoading}
              title="Send message"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </form>

          {/* Footer */}
          <div className="chatbot-footer">
            Powered by <strong>Google Gemini</strong>
          </div>
        </div>
      )}
    </>
  );
}

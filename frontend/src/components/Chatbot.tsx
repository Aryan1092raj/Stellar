"use client";
import React, { useState, useRef, useEffect } from "react";
import { getChatSuggestions, sendChatMessage } from "../lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, X, Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hello! I'm your GeoLedger AI Assistant. Ask me anything about donations, wallets, NGOs, or how our blockchain platform works!",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      getChatSuggestions()
        .then(setSuggestions)
        .catch((err) => console.error("Failed to load suggestions:", err));
    }
  }, [isOpen, suggestions.length]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const data = await sendChatMessage(
        content,
        messages.map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        }))
      );

      const assistantMessage: Message = {
        role: "assistant",
        content:
          data.response ||
          data.fallbackResponse ||
          "Sorry, I encountered an error. Please try again.",
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          "😔 Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const cleanSuggestion = suggestion.replace(/^[^\s]+\s/, "");
    sendMessage(cleanSuggestion);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <Card className="w-[360px] h-[500px] flex flex-col bg-canvas border border-hairline shadow-2xl rounded-xl overflow-hidden mb-4 animate-in slide-in-from-bottom-5 fade-in-0 duration-200">
          <CardHeader className="p-4 border-b border-hairline bg-surface-dark text-on-dark flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-primary rounded-lg text-on-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-on-dark leading-tight">
                  GeoLedger AI
                </CardTitle>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-semantic-up"></span>
                  <span className="text-[10px] text-on-dark-soft">Online</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-on-dark hover:bg-neutral-800 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          {/* Messages view */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={index}
                  className={`flex items-start space-x-2.5 max-w-[85%] ${
                    isAssistant ? "mr-auto" : "ml-auto flex-row-reverse space-x-reverse"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isAssistant ? "bg-primary/10 text-primary" : "bg-surface-strong text-ink"
                    }`}
                  >
                    {isAssistant ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div
                      className={`text-xs p-3 rounded-xl leading-relaxed ${
                        isAssistant
                          ? "bg-surface-soft text-ink border border-hairline-soft"
                          : "bg-primary text-on-primary"
                      }`}
                    >
                      {message.content}
                    </div>
                    <span className={`text-[9px] text-muted ${isAssistant ? "text-left" : "text-right"}`}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start space-x-2.5 mr-auto max-w-[85%]">
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
                  <Bot className="h-3.5 w-3.5 animate-bounce" />
                </div>
                <div className="bg-surface-soft text-ink border border-hairline-soft text-xs p-3 rounded-xl flex space-x-1 items-center">
                  <span className="h-1.5 w-1.5 bg-muted rounded-full animate-bounce delay-100"></span>
                  <span className="h-1.5 w-1.5 bg-muted rounded-full animate-bounce delay-200"></span>
                  <span className="h-1.5 w-1.5 bg-muted rounded-full animate-bounce delay-300"></span>
                </div>
              </div>
            )}

            {messages.length === 1 && suggestions.length > 0 && (
              <div className="flex flex-col space-y-2 pt-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Suggestions</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.slice(0, 3).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-[11px] font-medium text-left border border-hairline rounded-lg px-2.5 py-1.5 hover:border-primary hover:text-primary transition-colors bg-canvas leading-tight"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Form Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-hairline bg-canvas flex items-center space-x-2 shrink-0"
          >
            <Input
              ref={inputRef}
              placeholder="Type your question..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              className="flex-1 h-10 text-xs rounded-lg pl-3"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputMessage.trim() || isLoading}
              className="h-10 w-10 shrink-0 bg-primary hover:bg-primary-active rounded-lg"
            >
              <Send className="h-4.5 w-4.5 text-on-primary" />
            </Button>
          </form>

          {/* Footer banner */}
          <div className="bg-surface-soft py-2 text-center text-[10px] text-muted border-t border-hairline-soft shrink-0 flex items-center justify-center space-x-1 font-semibold uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            <span>Powered by Gemini</span>
          </div>
        </Card>
      )}

      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className="h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary-active hover:scale-105 active:scale-95 duration-150 transition-all text-on-primary"
        title="AI Chatbot Assistant"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </div>
  );
}

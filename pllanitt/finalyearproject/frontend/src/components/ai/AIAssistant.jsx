import React, { useState, useEffect, useRef } from "react";
import { X, Bot, MessageCircle, AlertTriangle, Send } from "lucide-react";

const AIAssistant = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Welcome to PLAN-IT World! Ask me anything about urban planning.",
      time: new Date(),
      icon: <Bot className="w-4 h-4" />
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input, time: new Date() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    setInput(""); // Clear input right away
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8000/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: input }),
      });

      const data = await res.json();

      const botMessage = {
        sender: "bot",
        text: data.answer || "No response received.",
        time: new Date(),
      };

      setMessages([...newMessages, botMessage]);
    } catch (error) {
      const errorMessage = {
        sender: "bot",
        text: error.response?.data?.error || "Error: Could not reach server.",
        time: new Date(),
      };
      setMessages([...newMessages, errorMessage]);
    }

    setIsTyping(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-2.5 sm:p-5">
      <div className="w-full max-w-[500px] h-[90vh] sm:h-[80vh] sm:max-h-[700px] bg-white dark:bg-theme-dark rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative">
        <header className="bg-gradient-base text-white px-4 sm:px-5 pt-6 sm:pt-8 pb-4 sm:pb-5 text-center relative">
          <h1 className="m-0 mb-2.5 text-2xl sm:text-[1.8rem] font-bold"><Bot className="w-6 h-6 inline mr-2" />PLAN-IT WORLD</h1>
          <p className="m-0 opacity-90 text-sm">Your personal assistant for urban planning</p>
          <button 
            className="absolute top-[15px] right-[15px] bg-red-500 hover:bg-red-600 text-white border-0 rounded-full w-[35px] h-[35px] flex items-center justify-center cursor-pointer transition-all duration-300 z-10 hover:scale-110" 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-5 overflow-y-auto bg-slate-50 dark:bg-secondary flex flex-col gap-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col max-w-[90%] sm:max-w-[80%] animate-slide-up ${
                msg.sender === "user" 
                  ? "self-end" 
                  : "self-start"
              } ${
                msg.text === "I can't do that" ? "warning" : ""
              }`}
            >
              <p className={`m-0 px-4 py-3 rounded-[18px] text-[0.95rem] leading-snug break-words ${
                msg.sender === "user"
                  ? "bg-gradient-base text-white rounded-br-sm"
                  : msg.text === "I can't do that"
                  ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                  : "bg-white dark:bg-card text-slate-800 dark:text-foreground border border-slate-200 dark:border-border rounded-bl-sm shadow-sm"
              }`}>
                {msg.text}
              </p>
              <small className={`mt-1 text-xs opacity-70 ${
                msg.sender === "user" ? "text-right" : "text-left"
              }`}>
                {msg.time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
          ))}

          {isTyping && (
            <div className="flex flex-col self-start max-w-[80%]">
              <div className="flex gap-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-typing"></span>
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-typing" style={{ animationDelay: '-0.16s' }}></span>
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-typing" style={{ animationDelay: '-0.32s' }}></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </main>

        <footer className="p-4 sm:p-5 bg-white dark:bg-card border-t border-slate-200 dark:border-border flex gap-2.5 items-end">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about URBAN PLANNING..."
            className="flex-1 border-2 border-slate-200 dark:border-border rounded-xl px-4 py-3 text-[0.95rem] font-inherit resize-none outline-none transition-colors duration-300 min-h-[44px] max-h-[120px] focus:border-accent dark:bg-secondary dark:text-foreground placeholder:text-slate-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button 
            onClick={handleSend} 
            disabled={isTyping}
            className="bg-gradient-base text-white border-0 rounded-xl px-5 py-3 text-[0.95rem] font-semibold cursor-pointer transition-all duration-300 min-w-[80px] h-[44px] flex items-center justify-center hover:-translate-y-0.5 hover:shadow-button disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isTyping ? "Typing..." : <><Send className="w-4 h-4 inline mr-1" />Send</>}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AIAssistant;
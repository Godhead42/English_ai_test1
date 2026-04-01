import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE_URL from '../apiConfig';

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
}

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', sender: 'bot', text: 'Hi! I\'m your English Coach. Ask me anything about pronunciation, grammar, or vocabulary!' }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const sendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: inputValue
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            const response = await fetch(`/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage.text })
            });
            const data = await response.json();

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: data.reply || "No response received"
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Error communicating with AI:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: "Sorry, I'm having trouble connecting right now."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-50 p-4 rounded-full bg-brand-500 text-slate-950 shadow-[0_0_20px_rgba(45,212,191,0.4)] hover:scale-105 transition-transform ${isOpen ? 'hidden' : 'flex'}`}
            >
                <MessageCircle className="w-6 h-6" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-6 right-6 z-50 w-[350px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-48px)] glass-panel border border-brand-500/30 rounded-2xl flex flex-col shadow-2xl bg-slate-950/95 backdrop-blur-3xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-brand-400" />
                                </div>
                                <span className="font-bold text-slate-100">English Coach AI</span>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.sender === 'user'
                                            ? 'bg-brand-500 text-slate-950 rounded-br-sm font-medium'
                                            : 'bg-white/10 text-slate-200 border border-white/5 rounded-bl-sm whitespace-pre-wrap'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex w-full justify-start">
                                    <div className="p-3 rounded-2xl bg-white/10 text-slate-200 border border-white/5 rounded-bl-sm flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                                        <span className="text-xs text-brand-200">Coach is thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/10 bg-black/40">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Ask your coach a question..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder-slate-500"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={isLoading || !inputValue.trim()}
                                    className="p-2.5 rounded-full bg-brand-500 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-400 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Send, Sparkles, User, Bot, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Message {
    id: string;
    text: string;
    sender: "user" | "ai";
    timestamp: Date;
}

const MatrixAI = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            text: "Hello! I am Matrix AI, your professional study assistant. How can I help you recall your exam preparation today?",
            sender: "ai",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: input,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        // Real AI response using Groq API
        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: `You are Matrix AI, the dedicated assistant for "THE MATRIX - Smart Exam Hall Allocation System".
                            Your primary role is to assist students and staff using this portal.
                            Context about the project:
                            - Project Name: THE MATRIX
                            - Function: A cutting-edge platform for seamless exam hall and seat allocation.
                            - Student Features: Finding seats via "Exam Code" and "Registration Number".
                            - Admin Features: Creating exams, managing halls, and organizing student data.
                            - Tone: Professional, high-tech (matrix-themed but clear), supportive, and efficient.
                            When asked about preparation, link it back to the importance of being where you need to be on time (hall allocation). If students ask how to find their seat, guide them to the Student Portal.`
                        },
                        ...messages.map(m => ({
                            role: m.sender === "user" ? "user" : "assistant",
                            content: m.text
                        })),
                        { role: "user", content: input }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to connect to Matrix AI core.");
            }

            const data = await response.json();
            const aiText = data.choices[0]?.message?.content || "I encountered a minor processing error. Could you try rephrasing?";

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: aiText,
                sender: "ai",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error("Groq API Error:", error);
            toast.error("Matrix AI is currently offline. Please try again later.");

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "I'm sorry, I'm having trouble connecting to my processing core right now. Please check your connection or try again in a moment.",
                sender: "ai",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const clearChat = () => {
        setMessages([messages[0]]);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
            {/* Header */}
            <header className="border-b border-border/40 bg-background/80 backdrop-blur-md shrink-0">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/student")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight">Matrix AI</h1>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={clearChat} title="Clear Chat">
                        <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive transition-colors" />
                    </Button>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-hidden relative flex flex-col container mx-auto max-w-4xl">
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-6 pb-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`flex gap-3 max-w-[85%] ${message.sender === "user" ? "flex-row-reverse" : "flex-row"
                                        }`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center shadow-sm ${message.sender === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-card text-foreground border border-border"
                                            }`}
                                    >
                                        {message.sender === "user" ? (
                                            <User className="h-4 w-4" />
                                        ) : (
                                            <Bot className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div
                                        className={`p-4 rounded-2xl shadow-sm ${message.sender === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-card text-card-foreground rounded-tl-none border border-border/50"
                                            }`}
                                    >
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{message.text}</p>
                                        <span className="text-[10px] opacity-60 mt-2 block text-right font-light">
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="flex gap-3 max-w-[80%]">
                                    <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center border border-border shadow-sm">
                                        <Bot className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="bg-card p-4 rounded-2xl rounded-tl-none border border-border/50 shadow-sm flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Static Input Area Above Footer */}
                <div className="p-4 bg-background/50 backdrop-blur-sm border-t border-border/20 shrink-0">
                    <Card className="max-w-4xl mx-auto p-2 border-primary/20 bg-card shadow-lg ring-1 ring-primary/5">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <Input
                                placeholder="Ask Matrix AI something..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                                disabled={isTyping}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isTyping}
                                className="shrink-0 bg-gradient-to-tr from-primary to-purple-600 hover:opacity-90 shadow-md transition-all h-10 w-10"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </Card>
                    <p className="text-[10px] text-center text-muted-foreground mt-2 font-medium tracking-wide flex items-center justify-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Matrix AI Professional Assistant
                    </p>
                </div>
            </main>
        </div>
    );
};

export default MatrixAI;

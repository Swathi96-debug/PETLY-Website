import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Zap, Shield, Heart, Info, Brain } from 'lucide-react';
import { AI_KNOWLEDGE_BASE, DEFAULT_AI_RESPONSE } from '../../data/aiKnowledge';

const AIPetAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I am PETLY AI. How can I assist your pet's neural evolution today?", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getAIResponse = async (query) => {
    // This is where Gemini API will be integrated later
    // For now, using mock keyword-based matching
    const q = query.toLowerCase();
    let response = DEFAULT_AI_RESPONSE;

    if (q.includes('food') || q.includes('eat') || q.includes('nutrition')) {
      response = AI_KNOWLEDGE_BASE.nutrition[Math.floor(Math.random() * AI_KNOWLEDGE_BASE.nutrition.length)];
    } else if (q.includes('train') || q.includes('behavior') || q.includes('bark')) {
      response = AI_KNOWLEDGE_BASE.behavior[Math.floor(Math.random() * AI_KNOWLEDGE_BASE.behavior.length)];
    } else if (q.includes('vaccine') || q.includes('shot') || q.includes('health')) {
      response = AI_KNOWLEDGE_BASE.vaccinations[Math.floor(Math.random() * AI_KNOWLEDGE_BASE.vaccinations.length)];
    } else if (q.includes('hurt') || q.includes('emergency') || q.includes('first aid')) {
      response = AI_KNOWLEDGE_BASE.first_aid[Math.floor(Math.random() * AI_KNOWLEDGE_BASE.first_aid.length)];
    } else if (q.includes('groom') || q.includes('bath') || q.includes('brush')) {
      response = AI_KNOWLEDGE_BASE.grooming[Math.floor(Math.random() * AI_KNOWLEDGE_BASE.grooming.length)];
    }

    return response;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI Processing Delay
    setTimeout(async () => {
      const response = await getAIResponse(input);
      const aiMsg = { id: Date.now() + 1, text: response, sender: 'ai' };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="fixed bottom-10 right-10 z-[5000] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="mb-6 w-[400px] h-[600px] glass-dark rounded-[3.5rem] border border-white/10 shadow-5xl flex flex-col overflow-hidden relative"
          >
            {/* Header */}
            <header className="p-8 pb-6 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <Brain size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tighter leading-none mb-1">PETLY AI</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Neural Link Active</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-3 glass rounded-xl text-white/20 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-5 px-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-xl border ${
                    msg.sender === 'user' 
                    ? 'bg-white text-black border-white rounded-tr-none' 
                    : 'bg-white/5 text-white/80 border-white/10 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="p-4 px-6 rounded-3xl bg-white/5 border border-white/10 flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-orange-500/40 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-orange-500/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-orange-500/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions */}
            <div className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar pb-4">
              {['Nutrition', 'Training', 'Emergency'].map(tag => (
                <button 
                  key={tag}
                  onClick={() => setInput(`Tell me about ${tag}`)}
                  className="px-4 py-2 bg-white/5 border border-white/5 rounded-full text-[10px] font-black text-white/40 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <footer className="p-8 pt-4">
              <div className="flex gap-3 bg-white/5 border border-white/10 rounded-[2rem] p-3 focus-within:border-orange-500/50 transition-all">
                <input 
                  type="text" placeholder="Quantum search expertise..." 
                  className="flex-1 bg-transparent border-none outline-none text-white font-medium text-sm px-4"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                   onClick={handleSend}
                   className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                     input.trim() ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-white/20'
                   }`}
                >
                  <Send size={20} />
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-20 h-20 bg-orange-500 text-white rounded-[2rem] flex items-center justify-center shadow-3xl shadow-orange-500/30 border border-orange-400 relative group overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {isOpen ? <X key="x" size={32} /> : <MessageCircle key="msg" size={32} />}
        </AnimatePresence>
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.button>
    </div>
  );
};

export default AIPetAssistant;

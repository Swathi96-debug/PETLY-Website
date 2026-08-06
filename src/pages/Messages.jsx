import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MessageCircle, Send, Image, Mic, Smile, Info, 
  ChevronLeft, MoreVertical, CheckCheck, User, Camera, 
  Sparkles, Phone, Video, Zap
} from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext';

const Messages = () => {
  const { messages, addMessageToConversation } = useEcosystem();
  const [selectedChat, setSelectedChat] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!selectedChat && messages.length > 0) {
      setSelectedChat(messages[0]);
    }
  }, [messages, selectedChat]);

  const conversations = messages;

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!input.trim() || !selectedChat) return;

    const newMessage = {
      id: Date.now(),
      text: input,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    addMessageToConversation(selectedChat.id, newMessage);
    setSelectedChat({
      ...selectedChat,
      messages: [...selectedChat.messages, newMessage],
      lastMessage: input,
      time: 'Just now',
      unread: false
    });
    setInput('');

    if (selectedChat.id === 1) {
      setIsTyping(true);
      setTimeout(() => {
        const botMsg = { id: Date.now() + 1, text: 'Thanks for checking in! 🐾', sender: 'them', time: 'Just now' };
        addMessageToConversation(1, botMsg);
        setSelectedChat((prev) => ({
          ...prev,
          messages: [...prev.messages, botMsg],
          lastMessage: botMsg.text
        }));
        setIsTyping(false);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-4 px-6 flex items-center justify-center">
      <div className="w-full max-w-7xl h-[800px] glass-dark rounded-[4rem] border border-white/10 shadow-5xl overflow-hidden flex relative">
        <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Conversations Sidebar */}
        <aside className={`w-full lg:w-96 border-r border-white/5 flex flex-col relative z-10 ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-10 pb-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-black text-white tracking-tighter">Messages</h1>
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 cursor-pointer hover:bg-white/10 transition-all">
                <Zap size={20} />
              </div>
            </div>
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors" size={18} />
              <input 
                type="text" placeholder="Search conversations..." 
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 no-scrollbar">
            {conversations.map(conv => (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                key={conv.id}
                onClick={() => setSelectedChat(conv)}
                className={`p-6 rounded-[2.5rem] flex items-center gap-4 cursor-pointer transition-all border ${
                  selectedChat?.id === conv.id ? 'bg-white text-black border-white shadow-2xl' : 'bg-transparent text-white/40 border-transparent hover:bg-white/5'
                }`}
              >
                <div className="relative">
                  <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl shadow-inner ${selectedChat?.id === conv.id ? 'bg-black/10' : ''}`}>
                    {conv.user.avatar}
                  </div>
                  {conv.user.online && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-black rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className={`font-bold text-sm truncate ${selectedChat?.id === conv.id ? 'text-black' : 'text-white'}`}>{conv.user.name}</h4>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{conv.time}</span>
                  </div>
                  <p className={`text-xs truncate ${conv.unread && selectedChat?.id !== conv.id ? 'font-black text-orange-500' : 'font-medium opacity-40'}`}>
                    {conv.lastMessage}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </aside>

        {/* Chat Window */}
        <main className={`flex-1 flex flex-col relative z-20 ${!selectedChat ? 'hidden lg:flex' : 'flex'}`}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <header className="p-8 px-10 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button onClick={() => setSelectedChat(null)} className="lg:hidden p-3 glass text-white/40 rounded-xl"><ChevronLeft size={20} /></button>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl border border-white/5">{selectedChat.user.avatar}</div>
                    {selectedChat.user.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white tracking-tight leading-none mb-1">{selectedChat.user.name}</h4>
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest leading-none">
                      {selectedChat.user.online ? 'Active Unit' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button className="p-3 glass text-white/40 hover:text-white rounded-xl"><Phone size={20} /></button>
                  <button className="p-3 glass text-white/40 hover:text-white rounded-xl"><Video size={20} /></button>
                  <button className="p-3 glass text-white/40 hover:text-white rounded-xl"><Info size={20} /></button>
                </div>
              </header>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar">
                {selectedChat.messages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] group relative`}>
                      <div className={`p-5 px-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-xl border ${
                        msg.sender === 'me' 
                        ? 'bg-orange-500 text-white border-orange-400 rounded-tr-none' 
                        : 'bg-white/5 text-white/80 border-white/10 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <div className={`flex items-center gap-2 mt-2 px-2 italic text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        {msg.time}
                        {msg.sender === 'me' && <CheckCheck size={12} className="text-blue-500" />}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="p-4 px-6 rounded-3xl bg-white/5 border border-white/10 flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <footer className="p-8 px-10 pb-12">
                <div className="glass-dark bg-white/5 p-4 rounded-[2.5rem] border border-white/10 flex items-center gap-4 focus-within:border-orange-500/50 transition-all">
                  <button className="p-2 text-white/20 hover:text-white"><Camera size={24} /></button>
                  <input 
                    type="text" placeholder="Direct Message..." 
                    className="flex-1 bg-transparent border-none outline-none text-white font-medium text-sm px-2"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <div className="hidden sm:flex items-center gap-3 pr-2">
                    <button className="text-white/20 hover:text-white"><Mic size={22} /></button>
                    <button className="text-white/20 hover:text-white"><Image size={22} /></button>
                    <button className="text-white/20 hover:text-white"><Smile size={22} /></button>
                  </div>
                  <button 
                    onClick={handleSend}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      input.trim() ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-white/10'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
              <div className="w-24 h-24 rounded-[2.5rem] bg-orange-500/10 flex items-center justify-center text-orange-500 mb-8 border border-orange-500/20">
                <MessageCircle size={48} />
              </div>
              <h2 className="text-5xl font-black text-white tracking-tighter mb-4 leading-none">Neural Direct</h2>
              <p className="text-xl text-white/40 max-w-sm mb-12">Select a parent or sanctuary to initiate a secure biometric transmission.</p>
              <div className="flex gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-xl bg-white/5 border-2 border-black flex items-center justify-center font-bold text-xs ring-1 ring-white/10">0{i}</div>
                  ))}
                </div>
                <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} /> 14 Active Units
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Messages;

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Brain, Maximize2, Minimize2, Paperclip, Film, AlertCircle, Plus, History, Trash2, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { assistantAPI, petsAPI } from '../../services/api';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const markdownComponents = {
  h1: ({ ...props }) => (
    <h1 className="text-base sm:text-lg font-black text-white mt-3 mb-1.5 tracking-tight border-b border-white/10 pb-1" {...props} />
  ),
  h2: ({ ...props }) => (
    <h2 className="text-sm sm:text-base font-bold text-white mt-3 mb-1 tracking-tight" {...props} />
  ),
  h3: ({ ...props }) => (
    <h3 className="text-xs sm:text-sm font-bold text-orange-400 mt-2.5 mb-1 uppercase tracking-wider" {...props} />
  ),
  p: ({ ...props }) => (
    <p className="mb-2.5 last:mb-0 leading-relaxed text-white/85 text-xs sm:text-sm" {...props} />
  ),
  ul: ({ ...props }) => (
    <ul className="list-disc list-outside pl-4 sm:pl-5 mb-2.5 space-y-1 text-white/85 text-xs sm:text-sm" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="list-decimal list-outside pl-4 sm:pl-5 mb-2.5 space-y-1 text-white/85 text-xs sm:text-sm" {...props} />
  ),
  li: ({ ...props }) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: ({ ...props }) => (
    <strong className="font-bold text-white" {...props} />
  ),
  em: ({ ...props }) => (
    <em className="italic text-white/90" {...props} />
  ),
  code: ({ ...props }) => (
    <code className="bg-white/10 text-orange-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
  ),
  blockquote: ({ ...props }) => (
    <blockquote className="border-l-2 border-orange-500/60 pl-3 my-2 text-white/70 italic text-xs sm:text-sm" {...props} />
  ),
};

const AIPetAssistant = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I am PETLY AI. How can I assist your pet's wellness, health records, or care today?", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaError, setMediaError] = useState('');

  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const isMigratingRef = useRef(false);
  const migratedConversationIdRef = useRef(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Fetch conversations list for authenticated user
  const fetchConversations = async () => {
    if (!user) return;
    try {
      const res = await assistantAPI.getConversations();
      if (res && Array.isArray(res.conversations)) {
        setConversations(res.conversations);
      }
    } catch {
      // Non-blocking fetch error
    }
  };

  useEffect(() => {
    if (user && isOpen) {
      fetchConversations();
    }
  }, [user, isOpen]);

  // Idempotent migration of any current in-memory chat visible in the frontend
  useEffect(() => {
    if (!user || isMigratingRef.current || migratedConversationIdRef.current || conversationId) {
      return;
    }

    const hasUserMessage = messages.some(m => m.sender === 'user');
    if (!hasUserMessage) {
      return;
    }

    isMigratingRef.current = true;

    const performMigration = async () => {
      try {
        const messagesToMigrate = messages
          .filter(m => m.id !== 1 || m.sender === 'user')
          .map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text || '',
            media: m.media
              ? {
                  name: m.media.name || 'attachment',
                  mimeType: m.media.mimeType || 'application/octet-stream',
                  size: m.media.size || 0,
                  isVideo: Boolean(m.media.isVideo),
                }
              : undefined,
            createdAt: m.createdAt || undefined,
          }));

        if (messagesToMigrate.length === 0) return;

        const firstUserMsg = messagesToMigrate.find(m => m.role === 'user');
        const title = firstUserMsg?.content
          ? (firstUserMsg.content.length > 40 ? `${firstUserMsg.content.slice(0, 37)}...` : firstUserMsg.content)
          : 'Preserved Chat';

        const res = await assistantAPI.createConversation({
          title,
          petId: selectedPetId || undefined,
          messages: messagesToMigrate,
        });

        if (res && res.conversation) {
          migratedConversationIdRef.current = res.conversation._id;
          setConversationId(res.conversation._id);
          setConversations(prev => [res.conversation, ...prev.filter(c => c._id !== res.conversation._id)]);
        }
      } catch (err) {
        console.warn('[PETLY AI] In-memory chat migration notice:', err.message);
      }
    };

    performMigration();
  }, [user, messages, conversationId, selectedPetId]);

  // On initial open, if no conversation is active and no in-memory user messages exist, load latest saved conversation
  useEffect(() => {
    if (user && isOpen && !conversationId && !migratedConversationIdRef.current && !isMigratingRef.current) {
      const hasUserMessage = messages.some(m => m.sender === 'user');
      if (!hasUserMessage && conversations.length > 0) {
        handleSelectConversation(conversations[0]._id);
      }
    }
  }, [user, isOpen, conversations, conversationId]);

  // Refresh user's registered pets whenever assistant opens or user changes
  useEffect(() => {
    let isMounted = true;
    const fetchUserPets = async () => {
      if (isOpen && user) {
        try {
          const res = await petsAPI.getAll();
          if (isMounted && res && Array.isArray(res.pets)) {
            setPets(res.pets);
          }
        } catch {
          // Non-blocking pet fetch failure
        }
      } else if (!user && isMounted) {
        setPets([]);
        setSelectedPetId('');
      }
    };

    fetchUserPets();
    return () => { isMounted = false; };
  }, [isOpen, user]);

  const handleNewChat = () => {
    setConversationId(null);
    migratedConversationIdRef.current = 'new_chat_active';
    isMigratingRef.current = true;
    setMessages([
      { id: 1, text: "Hello! I am PETLY AI. How can I assist your pet's wellness, health records, or care today?", sender: 'ai' }
    ]);
    setSelectedMedia(null);
    setMediaError('');
    setShowHistory(false);
  };

  const handleSelectConversation = async (id) => {
    if (!id) return;
    try {
      setIsLoadingHistory(true);
      const res = await assistantAPI.getConversation(id);
      if (res && res.conversation) {
        setConversationId(res.conversation._id);
        migratedConversationIdRef.current = res.conversation._id;
        if (res.conversation.pet) {
          setSelectedPetId(res.conversation.pet._id || res.conversation.pet);
        }
        if (Array.isArray(res.messages) && res.messages.length > 0) {
          const formatted = res.messages.map(m => ({
            id: m._id,
            text: m.content,
            sender: m.role === 'assistant' ? 'ai' : 'user',
            media: m.media ? {
              name: m.media.name,
              mimeType: m.media.mimeType,
              size: m.media.size,
              isVideo: Boolean(m.media.isVideo),
              previewUrl: null,
            } : null,
            createdAt: m.createdAt,
          }));
          setMessages(formatted);
        } else {
          setMessages([
            { id: 1, text: "Conversation loaded. How can I assist you with this thread?", sender: 'ai' }
          ]);
        }
        setShowHistory(false);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await assistantAPI.deleteConversation(id);
      setConversations(prev => prev.filter(c => c._id !== id));
      if (conversationId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleAttachmentClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      const el = document.getElementById('petly-ai-file-input');
      if (el) el.click();
    }
  };

  const handleFileChange = (e) => {
    setMediaError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
    const isVideo = fileType.startsWith('video/') || /\.(mp4|webm|mov|quicktime)$/i.test(fileName);

    if (!isImage && !isVideo) {
      setMediaError('Unsupported file type. Please select an image (JPEG, PNG, WebP, GIF) or video (MP4, WebM, MOV).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMediaError('Attachment exceeds maximum allowed size (15MB).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    let normalizedMime = fileType;
    if (!normalizedMime || !ALLOWED_MIME_TYPES.includes(normalizedMime)) {
      if (/\.(jpg|jpeg)$/i.test(fileName)) normalizedMime = 'image/jpeg';
      else if (/\.png$/i.test(fileName)) normalizedMime = 'image/png';
      else if (/\.webp$/i.test(fileName)) normalizedMime = 'image/webp';
      else if (/\.gif$/i.test(fileName)) normalizedMime = 'image/gif';
      else if (/\.mp4$/i.test(fileName)) normalizedMime = 'video/mp4';
      else if (/\.webm$/i.test(fileName)) normalizedMime = 'video/webm';
      else if (/\.mov$/i.test(fileName)) normalizedMime = 'video/quicktime';
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedMedia({
        name: file.name,
        size: file.size,
        mimeType: normalizedMime || 'application/octet-stream',
        data: reader.result,
        previewUrl: isVideo ? null : reader.result,
        isVideo,
      });
    };
    reader.onerror = () => {
      setMediaError('Failed to read selected file. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedMedia = () => {
    setSelectedMedia(null);
    setMediaError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (messageToSend) => {
    const query = typeof messageToSend === 'string' ? messageToSend : input;
    const trimmedInput = query.trim();

    if (!trimmedInput && !selectedMedia) return;

    const currentMedia = selectedMedia;
    const userMsg = {
      id: Date.now(),
      text: trimmedInput,
      media: currentMedia ? { ...currentMedia } : null,
      sender: 'user',
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    removeSelectedMedia();

    // Check authentication
    if (!user) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            text: 'Please log in to your PETLY account to consult with PETLY AI.',
            sender: 'ai',
          },
        ]);
      }, 400);
      return;
    }

    setIsTyping(true);

    try {
      const payload = {
        message: trimmedInput || undefined,
        petId: selectedPetId || undefined,
        conversationId: conversationId || undefined,
        media: currentMedia
          ? {
              mimeType: currentMedia.mimeType,
              data: currentMedia.data,
              name: currentMedia.name,
            }
          : undefined,
      };

      const res = await assistantAPI.chat(payload);
      const reply = res?.reply || 'I received your query but could not generate a response. Please try again.';
      setMessages(prev => [...prev, { id: Date.now() + 1, text: reply, sender: 'ai' }]);

      if (res?.conversationId && !conversationId) {
        setConversationId(res.conversationId);
        migratedConversationIdRef.current = res.conversationId;
        fetchConversations();
      }
    } catch (err) {
      let friendlyError = 'I am currently having difficulty connecting to PETLY AI. Please try again in a moment.';
      if (err.status === 401) {
        friendlyError = 'Your session has expired. Please log in again to continue.';
      } else if (err.status === 503) {
        friendlyError = 'PETLY AI service is currently undergoing maintenance. Please check back shortly.';
      } else if (err.status === 429) {
        friendlyError = 'PETLY AI is receiving high traffic right now. Please wait a moment before sending another question.';
      } else if (err.message && !err.message.includes('status') && !err.message.includes('fetch')) {
        friendlyError = err.message;
      }
      setMessages(prev => [...prev, { id: Date.now() + 1, text: friendlyError, sender: 'ai' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const modalContent = (
    <div className={`glass-dark border border-white/10 shadow-5xl flex flex-col overflow-hidden relative ${
      isMaximized
        ? 'w-full max-w-7xl h-full rounded-2xl sm:rounded-[2.5rem]'
        : 'mb-4 sm:mb-6 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-8rem)] rounded-[2.5rem] sm:rounded-[3.5rem]'
    }`}>
      {/* Header */}
      <header className={`border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0 ${
        isMaximized ? 'p-5 sm:p-6 pb-3 sm:pb-4' : 'p-6 sm:p-8 pb-4 sm:pb-6'
      }`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <Brain size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tighter leading-none">PETLY AI</h3>
              {isMaximized && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                  Expanded View
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Neural Link Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* New Chat Button */}
          <button 
            type="button"
            onClick={handleNewChat}
            className="p-2 sm:p-2.5 glass rounded-xl text-white/50 hover:text-orange-400 hover:bg-orange-500/10 transition-all cursor-pointer flex items-center gap-1.5"
            title="Start New Chat"
            aria-label="Start New Chat"
          >
            <Plus size={17} />
            <span className="hidden sm:inline text-xs font-bold">New</span>
          </button>

          {/* History Toggle Button */}
          {user && (
            <button 
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
              className={`p-2 sm:p-2.5 glass rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                showHistory ? 'text-orange-400 bg-orange-500/20' : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
              title={showHistory ? "Hide History" : "Chat History"}
              aria-label="Chat History"
            >
              <History size={17} />
              {conversations.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white/10 rounded-full text-white/70">
                  {conversations.length}
                </span>
              )}
            </button>
          )}

          <button 
            type="button"
            onClick={() => setIsMaximized(prev => !prev)}
            className="p-2 sm:p-2.5 glass rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title={isMaximized ? "Restore Size" : "Maximize Chat"}
            aria-label={isMaximized ? "Restore Size" : "Maximize Chat"}
          >
            {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button 
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsMaximized(false);
              setShowHistory(false);
            }}
            className="p-2 sm:p-2.5 glass rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Close Chat"
            aria-label="Close Chat"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* History Drawer / Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-black/90 backdrop-blur-xl border-b border-white/10 overflow-hidden shrink-0 z-20"
          >
            <div className="p-3 sm:p-4 max-h-56 overflow-y-auto space-y-1.5 no-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Saved Conversations
                </span>
                <span className="text-[10px] text-white/40">
                  {conversations.length} total
                </span>
              </div>
              {isLoadingHistory ? (
                <p className="text-xs text-white/40 py-3 text-center">Loading conversation...</p>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-white/40 py-3 text-center">No saved conversations yet.</p>
              ) : (
                conversations.map((conv) => {
                  const isSelected = conversationId === conv._id;
                  return (
                    <div
                      key={conv._id}
                      onClick={() => handleSelectConversation(conv._id)}
                      className={`group p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500/15 border-orange-500/40 text-white'
                          : 'bg-white/[0.03] border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="overflow-hidden pr-2 flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{conv.title || 'Conversation'}</p>
                        <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                          <Clock size={10} className="shrink-0" />
                          <span>{new Date(conv.updatedAt || conv.createdAt).toLocaleDateString()}</span>
                          {conv.lastMessage && (
                            <span className="truncate max-w-[150px] text-white/30 hidden sm:inline">
                              • {conv.lastMessage.content}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(e, conv._id)}
                        className="opacity-60 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-all cursor-pointer shrink-0 ml-1"
                        title="Delete conversation"
                        aria-label="Delete conversation"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pet Context Selector */}
      {pets.length > 0 && (
        <div 
          className="px-4 sm:px-6 py-2 border-b border-white/5 flex items-center gap-2 overflow-x-auto bg-white/[0.02] shrink-0 no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 shrink-0">
            Pet:
          </span>
          <button
            type="button"
            onClick={() => setSelectedPetId('')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
              !selectedPetId
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            General
          </button>
          {pets.map((pet) => {
            const petId = pet._id || pet.id;
            const isSelected = selectedPetId === petId;
            return (
              <button
                key={petId}
                type="button"
                onClick={() => setSelectedPetId(petId)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>🐾</span>
                <span className="truncate max-w-[120px]">{pet.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Chat Area - Scrollable Container */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] sm:max-w-[85%] p-4 sm:p-5 px-5 sm:px-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-xl border break-words ${
              msg.sender === 'user' 
              ? 'bg-white text-black border-white rounded-tr-none' 
              : 'bg-white/5 text-white/85 border-white/10 rounded-tl-none'
            }`}>
              {msg.sender === 'user' ? (
                <div>
                  {msg.media && (
                    <div className="mb-2.5 rounded-xl overflow-hidden border border-black/10 bg-black/5 p-1">
                      {msg.media.previewUrl ? (
                        <img
                          src={msg.media.previewUrl}
                          alt={msg.media.name || 'Attachment'}
                          className="max-h-56 w-auto rounded-lg object-contain mx-auto"
                        />
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 text-xs text-black/80 font-medium">
                          <Film size={18} className="text-orange-600 shrink-0" />
                          <span className="truncate">{msg.media.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {msg.text ? <div className="whitespace-pre-wrap">{msg.text}</div> : null}
                </div>
              ) : (
                <div className="markdown-content">
                  <ReactMarkdown components={markdownComponents}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="p-4 px-6 rounded-3xl bg-white/5 border border-white/10 flex gap-2 items-center">
              <div className="w-1.5 h-1.5 bg-orange-500/60 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-orange-500/60 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-orange-500/60 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-white/40 ml-1.5 font-medium">PETLY AI is analyzing & responding...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Pills */}
      <div 
        className="px-4 sm:px-6 py-2 shrink-0 flex gap-2 overflow-x-auto pb-2.5 no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {['My Pets', 'Health Records', 'My Orders', 'My Bookings', 'Adoption Listings'].map(tag => (
          <button 
            key={tag}
            onClick={() => handleSend(`Show me ${tag}`)}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/5 rounded-full text-[10px] font-black text-white/40 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all whitespace-nowrap cursor-pointer"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <footer className={`shrink-0 w-full ${
        isMaximized ? 'p-4 sm:p-6 pt-1 sm:pt-2 pb-4 sm:pb-5' : 'p-4 sm:p-6 md:p-8 pt-2 sm:pt-3'
      }`}>
        {/* Media Validation Error Banner */}
        {mediaError && (
          <div className="mb-2 p-2 px-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={14} className="shrink-0" />
            <span className="truncate">{mediaError}</span>
            <button
              type="button"
              onClick={() => setMediaError('')}
              className="ml-auto text-red-400/60 hover:text-red-400"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Selected Attachment Preview */}
        {selectedMedia && (
          <div className="mb-2 p-2 px-3 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-between gap-3 text-xs text-white">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {selectedMedia.previewUrl ? (
                <img
                  src={selectedMedia.previewUrl}
                  alt="Attachment Preview"
                  className="w-10 h-10 object-cover rounded-xl border border-white/20 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-orange-500/20 text-orange-400 rounded-xl flex items-center justify-center shrink-0">
                  <Film size={20} />
                </div>
              )}
              <div className="overflow-hidden">
                <p className="font-semibold truncate max-w-[200px] sm:max-w-xs">{selectedMedia.name}</p>
                <p className="text-[10px] text-white/50">
                  {(selectedMedia.size / (1024 * 1024)).toFixed(2)} MB • {selectedMedia.isVideo ? 'Video' : 'Image'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeSelectedMedia}
              className="p-1.5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Remove attachment"
              aria-label="Remove attachment"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex gap-2 sm:gap-3 bg-white/5 border border-white/10 rounded-[2rem] p-2 sm:p-3 focus-within:border-orange-500/50 transition-all items-center">
          {/* Real Hidden File Input */}
          <input
            ref={fileInputRef}
            id="petly-ai-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
            onChange={handleFileChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />

          {/* Attachment Button */}
          <button
            type="button"
            onClick={handleAttachmentClick}
            className={`p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer ${
              selectedMedia
                ? 'bg-orange-500/20 text-orange-400'
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="Attach image or video"
            aria-label="Attach image or video"
          >
            <Paperclip size={18} />
          </button>

          <input 
            type="text" 
            placeholder={
              selectedMedia
                ? "Ask about this media (optional)..."
                : "Ask PETLY AI about health, nutrition, records, or orders..."
            } 
            className="flex-1 bg-transparent border-none outline-none text-white font-medium text-sm px-2 sm:px-3 placeholder:text-white/30"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />

          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() && !selectedMedia}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              (input.trim() || selectedMedia)
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
            title="Send Message"
            aria-label="Send Message"
          >
            <Send size={18} />
          </button>
        </div>
      </footer>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && isMaximized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] p-2 sm:p-3 md:p-4 flex items-center justify-center bg-black/65 backdrop-blur-md font-sans overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-7xl h-[calc(100vh-1rem)] sm:h-[calc(100vh-1.5rem)] md:h-[calc(100vh-2rem)] max-h-[97vh] flex flex-col"
            >
              {modalContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-[5000] font-sans flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {isOpen && !isMaximized && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.85, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 40 }}
              className="pointer-events-auto"
            >
              {modalContent}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Toggle Launcher Button (only when not in maximized mode) */}
        {!isMaximized && (
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(prev => !prev)}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-500 text-white rounded-[1.8rem] sm:rounded-[2rem] flex items-center justify-center shadow-3xl shadow-orange-500/30 border border-orange-400 relative group overflow-hidden pointer-events-auto cursor-pointer"
            title={isOpen ? "Close Assistant" : "Open PETLY AI Assistant"}
            aria-label={isOpen ? "Close Assistant" : "Open PETLY AI Assistant"}
          >
            <AnimatePresence mode="wait">
              {isOpen ? <X key="x" size={28} /> : <MessageCircle key="msg" size={28} />}
            </AnimatePresence>
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        )}
      </div>
    </>
  );
};

export default AIPetAssistant;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, TrendingUp, Users, MessageSquare, ArrowBigUp, ArrowBigDown, 
  Bookmark, Shield, Pin, Trash2, MoreHorizontal, Sparkles, Share2, 
  Layout, Grid, List, ChevronRight, X, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';

const Community = () => {
  const { user } = useAuth();
  const {
    communityPosts,
    communities,
    setCommunities,
    createCommunityPost,
    addCommentToPost,
    toggleSavePost,
    toggleVotePost,
    deleteCommunityPost,
    togglePinPost
  } = useEcosystem();
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [postContent, setPostContent] = useState({ title: '', body: '' });
  const [expandedPostId, setExpandedPostId] = useState(null);


  const handleVote = (postId, type) => {
    toggleVotePost(postId, type);
  };

  const createPost = () => {
    if (!postContent.title || !activeCommunity) return;
    createCommunityPost({
      title: postContent.title,
      body: postContent.body,
      communityId: activeCommunity.id
    });
    setShowCreatePost(false);
    setPostContent({ title: '', body: '' });
  };

  const createCommunity = (name, icon) => {
    const newComm = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      icon,
      members: '1',
      adminId: user?.id || 'guest'
    };
    setCommunities([...communities, newComm]);
    setShowCreateCommunity(false);
  };

  const deletePost = (postId) => {
    deleteCommunityPost(postId);
  };

  const pinPost = (postId) => {
    togglePinPost(postId);
  };

  const addComment = (postId, commentText) => {
    if (!commentText || !commentText.trim()) return;
    addCommentToPost(postId, commentText);
  };

  const currentPosts = activeCommunity
    ? communityPosts.filter(p => p.communityId === activeCommunity.id)
    : communityPosts;

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Sidebar: Communities List */}
          <aside className="lg:col-span-3 space-y-8">
            <div className="glass-dark p-8 rounded-[3rem] border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-white tracking-tighter">Societies</h3>
                <button 
                  onClick={() => setShowCreateCommunity(true)}
                  className="p-2 glass text-orange-500 rounded-xl hover:bg-orange-500 hover:text-white transition-all"
                >
                  <Plus size={18} />
                </button>
              </div>
              
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveCommunity(null)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm ${!activeCommunity ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:bg-white/5'}`}
                >
                  <Layout size={18} /> Deep Feed
                </button>
                <div className="pt-4 border-t border-white/5 mt-4 space-y-2">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4 mb-4">Explore Units</p>
                  {communities.map(comm => (
                    <button 
                      key={comm.id}
                      onClick={() => setActiveCommunity(comm)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm ${activeCommunity?.id === comm.id ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:bg-white/5'}`}
                    >
                      <span className="text-xl">{comm.icon}</span> 
                      <span className="truncate">{comm.name}</span>
                    </button>
                  ))}
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Feed */}
          <main className="lg:col-span-6 space-y-8">
            {/* Create Post Entry */}
            <div className="glass-dark p-8 rounded-[3rem] border border-white/10 flex items-center gap-6 group cursor-pointer" onClick={() => setShowCreatePost(true)}>
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                {activeCommunity ? activeCommunity.icon : <Users size={24} />}
              </div>
              <div className="flex-1">
                <p className="text-white/20 font-bold mb-1 uppercase text-[10px] tracking-widest">Share knowledge in {activeCommunity?.name || 'PETLY'}</p>
                <p className="text-lg font-bold text-white/40">Create a high-impact post...</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 text-white/20 group-hover:text-white transition-colors">
                <Plus size={24} />
              </div>
            </div>

            {/* Active Community Banner */}
            {activeCommunity && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-dark p-12 rounded-[4rem] border border-white/10 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-24 bg-orange-500/5 blur-[120px] rounded-full -z-10" />
                <div className="flex items-center gap-8">
                  <div className="text-6xl">{activeCommunity.icon}</div>
                  <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{activeCommunity.name} Unit</h2>
                    <div className="flex items-center gap-4 text-white/40 text-sm font-bold">
                      <span className="flex items-center gap-2"><Users size={16} /> {activeCommunity.members} members</span>
                      <span className="flex items-center gap-2 underline cursor-pointer hover:text-white transition-colors">Unit Guidelines</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Post Feed */}
            <div className="space-y-8 pb-32">
              <AnimatePresence>
                {currentPosts.map(post => (
                  <motion.div 
                    layout key={post.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-dark rounded-[3.5rem] border border-white/10 overflow-hidden relative group"
                  >
                    <div className="flex h-full">
                      {/* Interaction Column */}
                      <div className="w-20 bg-white/5 flex flex-col items-center py-8 gap-4 border-r border-white/5">
                        <button onClick={() => handleVote(post.id, 'up')} className="p-2 text-white/20 hover:text-orange-500 transition-colors"><ArrowBigUp size={28} /></button>
                        <span className="font-black text-white tracking-widest text-sm translate-y-[-2px]">{post.votes}</span>
                        <button onClick={() => handleVote(post.id, 'down')} className="p-2 text-white/20 hover:text-blue-500 transition-colors"><ArrowBigDown size={28} /></button>
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 p-10">
                        <header className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{post.author}</span>
                            <span className="text-white/20 ml-2">•</span>
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{post.date}</span>
                            {post.pinned && <div className="flex items-center gap-1 text-emerald-500 px-2 py-0.5 rounded bg-emerald-500/10 text-[8px] font-black uppercase tracking-widest animate-pulse"><Pin size={8} /> Pinned</div>}
                          </div>
                          
                          {/* Admin Controls */}
                          {(activeCommunity?.adminId === (user?.id || 'guest') || post.author === (user?.fullName || 'Anonymous')) && (
                            <div className="flex gap-2">
                              <button onClick={() => pinPost(post.id)} className="p-3 glass rounded-xl text-white/20 hover:text-emerald-500 transition-all"><Pin size={16} /></button>
                              <button onClick={() => deletePost(post.id)} className="p-3 glass rounded-xl text-white/20 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                            </div>
                          )}
                        </header>

                        <h3 className="text-2xl font-black text-white tracking-tighter mb-4 leading-tight group-hover:text-orange-400 transition-colors cursor-pointer" onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}>{post.title}</h3>
                        <p className="text-white/50 text-sm leading-relaxed mb-8">{post.body}</p>

                        <footer className="flex items-center gap-8 pt-6 border-t border-white/5">
                          <button onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)} className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors ${expandedPostId === post.id ? 'text-orange-500' : 'text-white/40 hover:text-white'}`}><MessageSquare size={16} /> {post.comments} Responses</button>
                          <button onClick={() => toggleSavePost(post.id)} className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors ${post.savedBy?.includes(user?.id) ? 'text-blue-500' : 'text-white/40 hover:text-white'}`}><Bookmark size={16} fill={post.savedBy?.includes(user?.id) ? 'currentColor' : 'none'} /> {post.savedBy?.includes(user?.id) ? 'Saved' : 'Save'}</button>
                          <button className="flex items-center gap-2 text-white/40 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors ml-auto"><Share2 size={16} /> Relay</button>
                        </footer>

                        {expandedPostId === post.id && (
                          <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
                            <h4 className="text-sm font-black text-white/40 uppercase tracking-widest">Responses</h4>
                            <div className="space-y-4 max-h-60 overflow-y-auto no-scrollbar pr-2">
                              {(post.commentsList || []).length === 0 ? (
                                <p className="text-xs text-white/20 italic">No responses yet. Be the first to synchronize!</p>
                              ) : (
                                (post.commentsList || []).map((c, ci) => (
                                  <div key={ci} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-black text-orange-400 uppercase tracking-widest text-[9px]">{c.author}</span>
                                      <span className="text-white/20 text-[9px]">{c.date}</span>
                                    </div>
                                    <p className="text-white/80">{c.text}</p>
                                  </div>
                                ))
                              )}
                            </div>
                            
                            <div className="flex gap-3">
                              <input 
                                type="text" 
                                placeholder="Input response..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-orange-500/50"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    addComment(post.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <button 
                                onClick={(e) => {
                                  const input = e.currentTarget.previousSibling;
                                  addComment(post.id, input.value);
                                  input.value = '';
                                }}
                                className="px-6 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-2xl transition-all active:scale-95"
                              >
                                Submit
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Hover Glow */}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </main>

          {/* Right Sidebar: Trending & Stats */}
          <aside className="lg:col-span-3 space-y-10">
            <div className="glass-dark p-8 rounded-[3rem] border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-20 bg-blue-500/5 blur-[80px] rounded-full -z-10" />
              <h3 className="text-xl font-black text-white tracking-tighter mb-8 flex items-center gap-3">
                <TrendingUp size={20} className="text-blue-400" />
                Popular Peaks
              </h3>
              <div className="space-y-6">
                {[
                  { topic: 'Summer Dehydration', unit: 'health', rank: '#1' },
                  { topic: 'New Puppy Anxiety', unit: 'training', rank: '#2' },
                  { topic: 'Exotic Tank Setup', unit: 'exotic', rank: '#3' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group/item cursor-pointer">
                    <span className="text-[10px] font-black text-white/10 group-hover/item:text-blue-500 transition-colors uppercase tracking-widest">{item.rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white/80 truncate text-sm">{item.topic}</p>
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">{item.unit} Unit</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-dark p-8 rounded-[3rem] border border-white/10 bg-gradient-to-br from-indigo-900/10 to-transparent">
              <h3 className="text-xl font-black text-white tracking-tighter mb-8 flex items-center gap-3">
                <Shield size={20} className="text-emerald-500" />
                System Safety
              </h3>
              <ul className="space-y-4">
                {['No harmful toxicity', 'Verified biometric data', 'Respect all parents', 'Elite support only'].map((v, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Post Modal Backdrop */}
      <AnimatePresence>
        {showCreatePost && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl glass-dark rounded-[3.5rem] p-12 border border-white/10 shadow-5xl relative"
            >
              <button 
                onClick={() => setShowCreatePost(false)}
                className="absolute top-8 right-8 p-3 glass text-white/20 hover:text-white rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
              <h2 className="text-4xl font-black text-white mb-8 tracking-tighter leading-none">Assemble Message</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Target Unit</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-8 text-white font-bold outline-none appearance-none"
                    onChange={(e) => setActiveCommunity(communities.find(c => c.id === e.target.value))}
                    value={activeCommunity?.id || ''}
                  >
                    <option value="" disabled className="bg-black">Select Destination</option>
                    {communities.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Subject Line</label>
                  <input 
                    type="text" placeholder="Be descriptive and high-impact..."
                    className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-8 text-white font-bold outline-none focus:border-orange-500/50"
                    value={postContent.title}
                    onChange={(e) => setPostContent({...postContent, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Body Content</label>
                  <textarea 
                    placeholder="Express your narrative..."
                    className="w-full h-40 bg-white/5 border border-white/10 rounded-[2rem] p-8 text-white font-medium outline-none focus:border-orange-500/50"
                    value={postContent.body}
                    onChange={(e) => setPostContent({...postContent, body: e.target.value})}
                  />
                </div>
                <button 
                  onClick={createPost}
                  disabled={!activeCommunity || !postContent.title}
                  className="w-full py-6 bg-orange-500 text-white font-black rounded-3xl hover:bg-orange-600 transition-all shadow-xl active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                >
                  Broadcast to {activeCommunity?.name || 'Network'} <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showCreateCommunity && (
          <div className="fixed inset-0 z-[2500] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg glass-dark rounded-[3.5rem] p-12 border border-white/10 shadow-5xl relative"
            >
              <button onClick={() => setShowCreateCommunity(false)} className="absolute top-8 right-8 p-3 glass text-white/20 hover:text-white rounded-2xl transition-all"><X size={24} /></button>
              <h2 className="text-4xl font-black text-white mb-8 tracking-tighter leading-none">New Society</h2>
              <div className="space-y-6">
                <input 
                  type="text" placeholder="Society Name..." id="comm-name"
                  className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-8 text-white font-bold outline-none focus:border-blue-500/50"
                />
                <input 
                  type="text" placeholder="Icon (e.g. 🐶)..." id="comm-icon"
                  className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-8 text-white font-bold outline-none focus:border-blue-500/50"
                />
                <button 
                  onClick={() => createCommunity(document.getElementById('comm-name').value, document.getElementById('comm-icon').value)}
                  className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition-all shadow-xl uppercase tracking-widest text-sm"
                >
                  Establish Society
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MembersIcon = ({ size }) => <Users size={size} />;

export default Community;

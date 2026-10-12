import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, TrendingUp, Users, MessageSquare, ArrowBigUp, ArrowBigDown, 
  Bookmark, Shield, Pin, Trash2, Edit2, MoreHorizontal, Sparkles, Share2, 
  Layout, Grid, List, ChevronRight, X, AlertCircle, AlertTriangle, CheckCircle, RefreshCw,
  Film, Upload, Check, Copy, ExternalLink, ImageOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';
import { uploadAPI } from '../services/api';

// Safe URL detector and renderer to support link-only and rich link posts
const renderFormattedBody = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-orange-400 hover:text-orange-300 underline underline-offset-2 break-all inline-flex items-center gap-1 font-medium transition-colors"
        >
          <span>{part}</span>
          <ExternalLink size={12} className="inline opacity-70 shrink-0" />
        </a>
      );
    }
    return part;
  });
};

const Community = () => {
  const { user } = useAuth();
  const userId = (user?._id || user?.id)?.toString();
  const { id: routePostId } = useParams();

  const {
    communityPosts,
    communityPostsLoading,
    communityPostsError,
    fetchCommunityPosts,
    communities,
    setCommunities,
    createSociety,
    deleteSociety,
    createCommunityPost,
    updateCommunityPost,
    deleteCommunityPost,
    toggleVotePost,
    addCommentToPost,
    fetchPostComments,
    updateComment,
    deleteComment,
    toggleSavePost,
    togglePinPost
  } = useEcosystem();

  const [activeCommunity, setActiveCommunity] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [postContent, setPostContent] = useState({ title: '', body: '', category: 'Dogs' });
  const [postMedia, setPostMedia] = useState(null); // { key, mediaType, previewUrl, name, size }
  const [mediaUploading, setMediaUploading] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // New Society State
  const [newSocietyName, setNewSocietyName] = useState('');
  const [newSocietyIcon, setNewSocietyIcon] = useState('');
  const [societySubmitting, setSocietySubmitting] = useState(false);
  const [societyError, setSocietyError] = useState(null);

  // Delete Society State & Confirmation Modal
  const [deletingSociety, setDeletingSociety] = useState(null);
  const [deleteSocietyLoading, setDeleteSocietyLoading] = useState(false);
  const [deleteSocietyError, setDeleteSocietyError] = useState(null);

  const BUILT_IN_SOCIETY_KEYS = [
    'dogs',
    'cats',
    'birds',
    'pet rescue stories',
    'rescue',
    'pet health',
    'health',
    'pet training',
    'training',
    'general',
    'deep feed',
    'saved posts',
    'saved'
  ];

  const isBuiltInSociety = (comm) => {
    if (!comm) return true;
    if (comm.isBuiltIn === true) return true;
    const idStr = String(comm.id || comm._id || '').toLowerCase();
    const slugStr = String(comm.slug || '').toLowerCase();
    const nameStr = String(comm.name || '').toLowerCase();
    return (
      BUILT_IN_SOCIETY_KEYS.includes(idStr) ||
      BUILT_IN_SOCIETY_KEYS.includes(slugStr) ||
      BUILT_IN_SOCIETY_KEYS.includes(nameStr)
    );
  };

  const isSocietyOwner = (comm) => {
    if (!comm || !userId) return false;
    const creatorId = (comm.creator?._id || comm.creator?.id || comm.creator || comm.adminId)?.toString();
    return Boolean(creatorId && creatorId === userId);
  };

  const isCommActive = (comm) => {
    if (!activeCommunity || !comm) return false;
    const activeId = (activeCommunity.id || activeCommunity._id)?.toString();
    const commId = (comm.id || comm._id)?.toString();
    if (activeId && commId && activeId === commId) return true;
    return activeCommunity.name?.toLowerCase() === comm.name?.toLowerCase();
  };

  const handleEstablishSociety = async (e) => {
    if (e) e.preventDefault();
    if (societySubmitting) return;

    const name = newSocietyName.trim();
    const icon = newSocietyIcon.trim() || '🐾';

    if (!name) {
      setSocietyError('Please provide a society name.');
      return;
    }

    setSocietySubmitting(true);
    setSocietyError(null);
    try {
      await createSociety({ name, icon });
      setToastMessage(`Established society "${name}"!`);
      setTimeout(() => setToastMessage(null), 3000);
      setNewSocietyName('');
      setNewSocietyIcon('');
      setShowCreateCommunity(false);
    } catch (err) {
      setSocietyError(err.message || 'Failed to establish society.');
    } finally {
      setSocietySubmitting(false);
    }
  };

  const handleConfirmDeleteSociety = async () => {
    if (!deletingSociety || deleteSocietyLoading) return;
    setDeleteSocietyLoading(true);
    setDeleteSocietyError(null);

    const targetId = deletingSociety._id || deletingSociety.id;
    const targetName = deletingSociety.name;

    try {
      await deleteSociety(targetId, targetName);

      // If viewing the deleted society, automatically return to Deep Feed
      if (
        activeCommunity &&
        (activeCommunity.id === targetId ||
          activeCommunity._id === targetId ||
          activeCommunity.name?.toLowerCase() === targetName?.toLowerCase())
      ) {
        setActiveCommunity(null);
      }

      setToastMessage('Society deleted successfully.');
      setTimeout(() => setToastMessage(null), 3000);
      setDeletingSociety(null);
    } catch (err) {
      setDeleteSocietyError(err.message || 'Failed to delete society.');
    } finally {
      setDeleteSocietyLoading(false);
    }
  };

  // Edit Post State
  const [editingPost, setEditingListing] = useState(null);
  const [editPostContent, setEditPostContent] = useState({ title: '', body: '', category: 'Dogs' });
  const [editPostMedia, setEditPostMedia] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Post Confirmation State
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Comments State per post
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [postCommentsMap, setPostCommentsMap] = useState({});
  const [commentsLoadingMap, setCommentsLoadingMap] = useState({});
  const [newCommentTextMap, setNewCommentTextMap] = useState({});
  const [commentErrorMap, setCommentErrorMap] = useState({});
  const [failedMediaMap, setFailedMediaMap] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Refresh on mount
  useEffect(() => {
    fetchCommunityPosts();
  }, [fetchCommunityPosts]);

  // Load comments when a post is expanded
  const handleToggleComments = async (postId) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }

    setExpandedPostId(postId);

    if (!postCommentsMap[postId]) {
      setCommentsLoadingMap(prev => ({ ...prev, [postId]: true }));
      try {
        const comments = await fetchPostComments(postId);
        setPostCommentsMap(prev => ({ ...prev, [postId]: comments }));
      } catch (err) {
        console.error('Failed to load comments:', err.message);
      } finally {
        setCommentsLoadingMap(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleAddComment = async (postId) => {
    const text = (newCommentTextMap[postId] || '').trim();
    if (!text) return;

    if (!user) {
      setCommentErrorMap(prev => ({ ...prev, [postId]: 'Please sign in to leave a response.' }));
      return;
    }

    setCommentsLoadingMap(prev => ({ ...prev, [postId]: true }));
    setCommentErrorMap(prev => ({ ...prev, [postId]: null }));
    try {
      const createdComment = await addCommentToPost(postId, text);
      if (createdComment) {
        setPostCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), createdComment]
        }));
        setNewCommentTextMap(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (err) {
      setCommentErrorMap(prev => ({ ...prev, [postId]: err.message || 'Failed to submit response.' }));
    } finally {
      setCommentsLoadingMap(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleSaveCommentEdit = async (commentId, postId) => {
    const text = editCommentText.trim();
    if (!text) return;
    try {
      const updated = await updateComment(commentId, text);
      setPostCommentsMap(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => (c._id === commentId ? { ...c, content: text, ...updated } : c))
      }));
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (err) {
      alert(`Could not update comment: ${err.message}`);
    }
  };

  const handleDeleteComment = async (commentId, postId) => {
    try {
      await deleteComment(commentId, postId);
      setPostCommentsMap(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c._id !== commentId)
      }));
    } catch (err) {
      alert(`Could not delete comment: ${err.message}`);
    }
  };

  const handleVote = async (postId, type) => {
    try {
      await toggleVotePost(postId, type);
    } catch (err) {
      console.error('Vote failed:', err.message);
    }
  };

  const handleMediaSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setCreateError(`File exceeds limit (${isVideo ? '25 MB for videos' : '5 MB for images'}).`);
      return;
    }

    setMediaUploading(true);
    setCreateError(null);
    try {
      const uploadRes = await uploadAPI.uploadFile(file, 'post');
      const uploadedFile = uploadRes.data?.file || uploadRes.file || uploadRes;
      setPostMedia({
        key: uploadedFile.key,
        mediaType: isVideo ? 'video' : 'image',
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      });
    } catch (err) {
      setCreateError(`Media upload failed: ${err.message || 'Please check AWS S3 credentials.'}`);
    } finally {
      setMediaUploading(false);
    }
  };

  const handleCreatePost = async () => {
    const title = postContent.title.trim();
    const body = postContent.body.trim();
    const hasMedia = Boolean(postMedia?.key);

    if (!title && !body && !hasMedia) {
      setCreateError('Please enter a subject, body narrative, or attach a photo/video.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const targetCategory = postContent.category || activeCommunity?.name || 'Dogs';
      await createCommunityPost({
        title,
        body,
        communityId: activeCommunity?.id && activeCommunity.id !== 'saved' ? activeCommunity.id : 'dogs',
        category: targetCategory,
        mediaKey: postMedia?.key || '',
        mediaType: postMedia?.mediaType || '',
      });
      setShowCreatePost(false);
      setPostContent({ title: '', body: '', category: 'Dogs' });
      setPostMedia(null);
    } catch (err) {
      setCreateError(err.message || 'Failed to publish post');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEditPostModal = (post) => {
    setEditingListing(post);
    setEditPostContent({
      title: post.title || '',
      body: post.body || '',
      category: post.category || 'Dogs',
    });
    setEditPostMedia(post.mediaKey ? { key: post.mediaKey, mediaType: post.mediaType, previewUrl: post.mediaUrl } : null);
  };

  const handleUpdatePost = async () => {
    if (!editingPost) return;
    setEditSubmitting(true);
    try {
      await updateCommunityPost(editingPost.id, {
        title: editPostContent.title.trim(),
        body: editPostContent.body.trim(),
        category: editPostContent.category,
        mediaKey: editPostMedia?.key || '',
        mediaType: editPostMedia?.mediaType || '',
      });
      setEditingListing(null);
    } catch (err) {
      alert(`Could not update post: ${err.message}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!deletingPostId) return;
    setDeleteSubmitting(true);
    try {
      await deleteCommunityPost(deletingPostId);
      setDeletingPostId(null);
    } catch (err) {
      alert(`Could not delete post: ${err.message}`);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSharePost = async (post) => {
    const shareUrl = `${window.location.origin}/community/post/${post.id || post._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'PETLY Community Post',
          text: post.body ? post.body.slice(0, 100) : 'Check out this post on PETLY',
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage('Link copied to clipboard!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastMessage(`Share URL: ${shareUrl}`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const popularPeaks = useMemo(() => {
    if (!communityPosts || communityPosts.length === 0) return [];
    return [...communityPosts]
      .filter((p) => p.title || p.body)
      .sort((a, b) => {
        const scoreA = (Number(a.votes) || 0) * 2 + (Number(a.comments) || 0) * 3;
        const scoreB = (Number(b.votes) || 0) * 2 + (Number(b.comments) || 0) * 3;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [communityPosts]);

  const handleSelectPopularPeak = (peakPost) => {
    setActiveCommunity(null);
    setTimeout(() => {
      const el = document.getElementById(`post-${peakPost.id || peakPost._id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-orange-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-orange-500'), 2500);
      }
    }, 100);
  };

  const targetPostId = routePostId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('post') : null);

  useEffect(() => {
    if (targetPostId && communityPosts.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`post-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          handleToggleComments(targetPostId);
          el.classList.add('ring-2', 'ring-orange-500');
          setTimeout(() => el.classList.remove('ring-2', 'ring-orange-500'), 3000);
        }
      }, 500);
    }
  }, [targetPostId, communityPosts.length]);

  const currentPosts = communityPosts.filter(p => {
    let matchesComm = true;
    if (activeCommunity?.id === 'saved') {
      matchesComm = Boolean(p.isSaved);
    } else if (activeCommunity) {
      const commName = activeCommunity.name?.toLowerCase();
      const commId = activeCommunity.id?.toLowerCase();
      const postCat = p.category?.toLowerCase();
      const postCommId = p.communityId?.toLowerCase();
      matchesComm = postCat === commName || postCat === commId || postCommId === commId;
    }
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      (p.title || '').toLowerCase().includes(query) ||
      (p.body || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      (p.author || '').toLowerCase().includes(query);
    return matchesComm && matchesSearch;
  });

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Sidebar: Communities / Societies List */}
          <aside className="lg:col-span-3 space-y-8">
            <div className="glass-dark p-8 rounded-[3rem] border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-white tracking-tighter">Societies</h3>
                <button 
                  onClick={() => setShowCreateCommunity(true)}
                  className="p-2 glass text-orange-500 rounded-xl hover:bg-orange-500 hover:text-white transition-all"
                  title="Create society unit"
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
                <button 
                  onClick={() => setActiveCommunity({ id: 'saved', name: 'Saved Posts', icon: '🔖' })}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm ${activeCommunity?.id === 'saved' ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/20' : 'text-white/40 hover:bg-white/5'}`}
                >
                  <Bookmark size={18} /> Saved Posts
                </button>
                <div className="pt-4 border-t border-white/5 mt-4 space-y-2">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4 mb-4">Explore Units</p>
                  {communities.map((comm) => {
                    const isOwner = isSocietyOwner(comm);
                    const isBuiltIn = isBuiltInSociety(comm);
                    const isActive = isCommActive(comm);
                    const commKey = comm.id || comm._id || comm.slug || comm.name;

                    return (
                      <div key={commKey} className="group/society flex items-center gap-1 w-full">
                        <button 
                          onClick={() => setActiveCommunity(comm)}
                          className={`flex-1 flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm text-left truncate ${isActive ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:bg-white/5'}`}
                        >
                          <span className="text-xl shrink-0">{comm.icon}</span> 
                          <span className="truncate">{comm.name}</span>
                        </button>
                        {!isBuiltIn && isOwner && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSociety(comm);
                              setDeleteSocietyError(null);
                            }}
                            className="p-3 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0"
                            title={`Delete ${comm.name}`}
                            aria-label={`Delete ${comm.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Feed */}
          <main className="lg:col-span-6 space-y-8">
            {/* Search and Refresh Bar */}
            <div className="flex items-center gap-4">
              <form onSubmit={(e) => { e.preventDefault(); }} className="relative flex-1 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Search community posts, questions, narratives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-4 pl-14 pr-6 text-sm text-white font-medium outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20"
                />
              </form>
              <button
                onClick={() => fetchCommunityPosts()}
                className="p-4 glass rounded-2xl text-white/40 hover:text-white border border-white/10 transition-all"
                title="Refresh feed from MongoDB"
              >
                <RefreshCw size={18} className={communityPostsLoading ? 'animate-spin text-orange-400' : ''} />
              </button>
            </div>

            {/* Create Post Entry Trigger */}
            <div 
              className="glass-dark p-8 rounded-[3rem] border border-white/10 flex items-center gap-6 group cursor-pointer hover:border-orange-500/30 transition-all" 
              onClick={() => setShowCreatePost(true)}
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                {activeCommunity ? activeCommunity.icon : <Users size={24} />}
              </div>
              <div className="flex-1">
                <p className="text-white/20 font-bold mb-1 uppercase text-[10px] tracking-widest">
                  Share knowledge in {activeCommunity?.name || 'PETLY Sanctuary'}
                </p>
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
                <div className="flex items-center justify-between gap-8 flex-wrap">
                  <div className="flex items-center gap-8">
                    <div className="text-6xl">{activeCommunity.icon}</div>
                    <div>
                      <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{activeCommunity.name} Unit</h2>
                      <div className="flex items-center gap-4 text-white/40 text-sm font-bold">
                        <span className="flex items-center gap-2"><Users size={16} /> {activeCommunity.members || '1'} members</span>
                        <span className="flex items-center gap-2 underline cursor-pointer hover:text-white transition-colors">Unit Guidelines</span>
                      </div>
                    </div>
                  </div>
                  {!isBuiltInSociety(activeCommunity) && isSocietyOwner(activeCommunity) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingSociety(activeCommunity);
                        setDeleteSocietyError(null);
                      }}
                      className="px-5 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Trash2 size={15} />
                      <span>Delete Society</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Feed Error Banner */}
            {communityPostsError && (
              <div className="p-5 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle size={18} />
                  <span>{communityPostsError}</span>
                </div>
                <button onClick={() => fetchCommunityPosts()} className="underline font-bold">Retry</button>
              </div>
            )}

            {/* Empty Feed State */}
            {!communityPostsLoading && currentPosts.length === 0 && (
              <div className="glass-dark rounded-[3.5rem] p-16 text-center border border-white/10 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-white/30 mx-auto mb-6">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">No Posts Found</h3>
                <p className="text-xs text-white/40 mb-6 leading-relaxed">
                  {searchQuery 
                    ? 'No posts matched your search query. Try a different search term.'
                    : 'Be the first to share an insight, story, or question with the community!'}
                </p>
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20"
                >
                  Create First Post
                </button>
              </div>
            )}

            {/* Post Feed List */}
            <div className="space-y-8 pb-32">
              <AnimatePresence>
                {currentPosts.map(post => {
                  const isAuthor = user && (post.authorId === userId || user.role === 'admin' || post.author === user.fullName);
                  const isPostExpanded = expandedPostId === post.id;
                  const liveComments = postCommentsMap[post.id] !== undefined ? postCommentsMap[post.id] : (post.commentsList || []);
                  const isLoadingComments = Boolean(commentsLoadingMap[post.id]);

                  return (
                    <motion.div 
                      layout key={post.id}
                      id={`post-${post.id || post._id}`}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="glass-dark rounded-[3.5rem] border border-white/10 overflow-hidden relative group hover:border-white/20 transition-all"
                    >
                      <div className="flex h-full">
                        {/* Interaction Column: Reddit Style Up/Down */}
                        <div className="w-20 bg-white/5 flex flex-col items-center py-8 gap-4 border-r border-white/5 select-none">
                          <button 
                            onClick={() => handleVote(post.id, 'up')} 
                            className={`p-2 transition-all active:scale-125 ${post.userVote === 1 ? 'text-orange-500 fill-orange-500 scale-110' : 'text-white/20 hover:text-orange-500'}`}
                            title="Upvote"
                          >
                            <ArrowBigUp size={28} />
                          </button>
                          <span className={`font-black tracking-widest text-sm translate-y-[-2px] ${post.votes > 0 ? 'text-orange-400' : post.votes < 0 ? 'text-blue-400' : 'text-white/40'}`}>
                            {post.votes}
                          </span>
                          <button 
                            onClick={() => handleVote(post.id, 'down')} 
                            className={`p-2 transition-all active:scale-125 ${post.userVote === -1 ? 'text-blue-500 fill-blue-500 scale-110' : 'text-white/20 hover:text-blue-500'}`}
                            title="Downvote"
                          >
                            <ArrowBigDown size={28} />
                          </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-10">
                          <header className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{post.author}</span>
                              <span className="text-white/20 ml-2">•</span>
                              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{post.date}</span>
                              {post.category && (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 text-white/50 border border-white/5">
                                  {post.category}
                                </span>
                              )}
                              {post.pinned && (
                                <div className="flex items-center gap-1 text-emerald-500 px-2 py-0.5 rounded bg-emerald-500/10 text-[8px] font-black uppercase tracking-widest animate-pulse">
                                  <Pin size={8} /> Pinned
                                </div>
                              )}
                            </div>
                            
                            {/* Author & Admin Controls */}
                            {isAuthor && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => openEditPostModal(post)} 
                                  className="p-2.5 glass rounded-xl text-white/30 hover:text-white transition-all"
                                  title="Edit post"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button 
                                  onClick={() => setDeletingPostId(post.id)} 
                                  className="p-2.5 glass rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 transition-all"
                                  title="Delete post"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </header>

                          <h3 
                            className="text-2xl font-black text-white tracking-tighter mb-4 leading-tight group-hover:text-orange-400 transition-colors cursor-pointer" 
                            onClick={() => handleToggleComments(post.id)}
                          >
                            {post.title}
                          </h3>
                          {post.body && (
                            <p className="text-white/60 text-sm leading-relaxed mb-6 whitespace-pre-line">
                              {renderFormattedBody(post.body)}
                            </p>
                          )}

                          {/* Media Attachment Rendering */}
                          {post.mediaKey && (
                            <div className="mb-8 rounded-3xl overflow-hidden border border-white/10 bg-black/40">
                              {post.mediaType === 'video' || post.mediaKey.match(/\.(mp4|webm)$/i) ? (
                                post.mediaUrl && !failedMediaMap[post.id] ? (
                                  <video
                                    controls
                                    src={post.mediaUrl}
                                    className="w-full max-h-[30rem] object-contain bg-black"
                                    playsInline
                                    preload="metadata"
                                    onError={() => setFailedMediaMap(prev => ({ ...prev, [post.id]: true }))}
                                  />
                                ) : (
                                  <div className="p-8 text-center text-white/40 text-xs flex flex-col items-center justify-center gap-2">
                                    <Film size={22} className="text-white/20" />
                                    <span>Media unavailable</span>
                                  </div>
                                )
                              ) : (
                                post.mediaUrl && !failedMediaMap[post.id] ? (
                                  <img
                                    src={post.mediaUrl}
                                    alt={post.title || 'Community Attachment'}
                                    className="w-full max-h-[30rem] object-cover hover:scale-[1.01] transition-transform"
                                    loading="lazy"
                                    onError={() => setFailedMediaMap(prev => ({ ...prev, [post.id]: true }))}
                                  />
                                ) : (
                                  <div className="p-8 text-center text-white/40 text-xs flex flex-col items-center justify-center gap-2">
                                    <ImageOff size={22} className="text-white/20" />
                                    <span>Media unavailable</span>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          <footer className="flex items-center gap-8 pt-6 border-t border-white/5">
                            <button 
                              onClick={() => handleToggleComments(post.id)} 
                              className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors ${isPostExpanded ? 'text-orange-500' : 'text-white/40 hover:text-white'}`}
                            >
                              <MessageSquare size={16} /> 
                              <span>{post.comments} Responses</span>
                            </button>
                            <button 
                              onClick={() => toggleSavePost(post.id)} 
                              className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors ${post.isSaved ? 'text-blue-400' : 'text-white/40 hover:text-white'}`}
                              title={post.isSaved ? 'Remove from saved' : 'Save post'}
                            >
                              <Bookmark size={16} fill={post.isSaved ? 'currentColor' : 'none'} /> 
                              <span>{post.isSaved ? 'Saved' : 'Save'}</span>
                            </button>
                            <button 
                              onClick={() => handleSharePost(post)}
                              className="flex items-center gap-2 text-white/40 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors ml-auto group/relay"
                              title="Share post / Copy link"
                            >
                              <Share2 size={16} className="group-hover/relay:text-orange-400 transition-colors" /> Relay
                            </button>
                          </footer>

                          {/* Responses / Comments Section */}
                          {isPostExpanded && (
                            <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
                              <h4 className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center justify-between">
                                <span>Responses ({liveComments.length})</span>
                                {isLoadingComments && <RefreshCw size={14} className="animate-spin text-orange-400" />}
                              </h4>

                              <div className="space-y-4 max-h-72 overflow-y-auto no-scrollbar pr-2">
                                {liveComments.length === 0 ? (
                                  <p className="text-xs text-white/20 italic py-2">No responses yet. Synchronize the first thought!</p>
                                ) : (
                                  liveComments.map((c, ci) => {
                                    const commentAuthor = c.author?.fullName || c.author || 'Anonymous';
                                    const commentAuthorId = (c.author?._id || c.authorId || c.author)?.toString();
                                    const isCommentAuthor = user && (commentAuthorId === userId || user.role === 'admin');
                                    const isEditing = editingCommentId === c._id;

                                    return (
                                      <div key={c._id || ci} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs space-y-2">
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center gap-2">
                                            <span className="font-black text-orange-400 uppercase tracking-widest text-[9px]">{commentAuthor}</span>
                                            <span className="text-white/20 text-[9px]">• {c.date || (c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now')}</span>
                                          </div>
                                          {isCommentAuthor && !isEditing && (
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                onClick={() => { setEditingCommentId(c._id); setEditCommentText(c.content || c.text || ''); }}
                                                className="p-1 text-white/30 hover:text-white transition-colors"
                                                title="Edit response"
                                              >
                                                <Edit2 size={12} />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteComment(c._id, post.id)}
                                                className="p-1 text-red-400/50 hover:text-red-400 transition-colors"
                                                title="Delete response"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {isEditing ? (
                                          <div className="flex gap-2 pt-1">
                                            <input
                                              type="text"
                                              value={editCommentText}
                                              onChange={(e) => setEditCommentText(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  handleSaveCommentEdit(c._id, post.id);
                                                }
                                              }}
                                              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/50"
                                            />
                                            <button
                                              onClick={() => handleSaveCommentEdit(c._id, post.id)}
                                              className="px-3 py-1 bg-orange-500 text-white rounded-xl text-[10px] font-bold"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={() => setEditingCommentId(null)}
                                              className="px-2 py-1 glass text-white/40 text-[10px] rounded-xl"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <p className="text-white/80 leading-relaxed">{c.content || c.text}</p>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                              
                              {/* Error Message for Comment Submission */}
                              {commentErrorMap[post.id] && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                                  <AlertCircle size={14} className="shrink-0" />
                                  <span>{commentErrorMap[post.id]}</span>
                                </div>
                              )}

                              {/* Add Response Input */}
                              <div className="flex gap-3 pt-2">
                                <input 
                                  type="text" 
                                  placeholder="Input response and press Enter..."
                                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white outline-none focus:border-orange-500/50 placeholder:text-white/20"
                                  value={newCommentTextMap[post.id] || ''}
                                  onChange={(e) => {
                                    setNewCommentTextMap({ ...newCommentTextMap, [post.id]: e.target.value });
                                    if (commentErrorMap[post.id]) {
                                      setCommentErrorMap({ ...commentErrorMap, [post.id]: null });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleAddComment(post.id);
                                    }
                                  }}
                                />
                                <button 
                                  onClick={() => handleAddComment(post.id)}
                                  disabled={Boolean(commentsLoadingMap[post.id])}
                                  className="px-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-500/20 flex items-center gap-2"
                                >
                                  {commentsLoadingMap[post.id] ? (
                                    <>
                                      <RefreshCw size={12} className="animate-spin" />
                                      <span>Sending...</span>
                                    </>
                                  ) : (
                                    <span>Submit</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Hover Bottom Glow */}
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </main>

          {/* Right Sidebar: Trending Topics & System Safety */}
          <aside className="lg:col-span-3 space-y-10">
            <div className="glass-dark p-8 rounded-[3rem] border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-20 bg-blue-500/5 blur-[80px] rounded-full -z-10" />
              <h3 className="text-xl font-black text-white tracking-tighter mb-8 flex items-center gap-3">
                <TrendingUp size={20} className="text-blue-400" />
                Popular Peaks
              </h3>
              <div className="space-y-4">
                {popularPeaks.length === 0 ? (
                  <p className="text-white/30 text-xs py-3 text-center italic">No popular peaks yet. Spark the first discussion!</p>
                ) : (
                  popularPeaks.map((peak, i) => (
                    <div 
                      key={peak.id || peak._id || i} 
                      onClick={() => handleSelectPopularPeak(peak)}
                      className="flex items-center gap-4 group/item cursor-pointer hover:bg-white/5 p-2.5 rounded-2xl transition-all"
                      title="Jump to post"
                    >
                      <span className="text-[10px] font-black text-white/20 group-hover/item:text-blue-400 transition-colors uppercase tracking-widest">
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white/90 group-hover/item:text-orange-400 truncate text-sm transition-colors">
                          {peak.title || (peak.body ? peak.body.slice(0, 32) : 'Community Narrative')}
                        </p>
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">
                          {peak.category || 'General'} • {peak.votes} Votes • {peak.comments} Responses
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-dark p-8 rounded-[3rem] border border-white/10 bg-gradient-to-br from-indigo-900/10 to-transparent">
              <h3 className="text-xl font-black text-white tracking-tighter mb-8 flex items-center gap-3">
                <Shield size={20} className="text-emerald-500" />
                Sanctuary Protocol
              </h3>
              <ul className="space-y-4">
                {['MongoDB Synced', 'Verified Biometric Health', 'Zero Toxicity Boundary', 'Guardian Verified'].map((v, i) => (
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

      {/* ==================================================== */}
      {/* MODAL 1: ASSEMBLE NEW COMMUNITY POST                 */}
      {/* ==================================================== */}
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
              <h2 className="text-4xl font-black text-white mb-2 tracking-tighter leading-none">Assemble Message</h2>
              <p className="text-xs text-white/40 mb-8">Share narratives, queries, or medical tips across the PETLY network.</p>

              {createError && (
                <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Target Unit / Category</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-4 px-6 text-white font-bold outline-none appearance-none [&>option]:bg-neutral-900"
                    onChange={(e) => setPostContent({ ...postContent, category: e.target.value })}
                    value={postContent.category}
                  >
                    {communities.map(c => <option key={c.id} value={c.name} className="bg-black">{c.icon} {c.name}</option>)}
                    <option value="General" className="bg-black">🐾 General Sanctuary</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Subject Line</label>
                  <input 
                    type="text" placeholder="Be descriptive and high-impact..."
                    className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-4 px-6 text-white font-bold outline-none focus:border-orange-500/50"
                    value={postContent.title}
                    onChange={(e) => setPostContent({...postContent, title: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('composer-body-textarea')?.focus();
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Body Content</label>
                  <textarea 
                    id="composer-body-textarea"
                    placeholder="Express your narrative... (Ctrl+Enter to broadcast)"
                    className="w-full h-36 bg-white/5 border border-white/10 rounded-[2rem] p-6 text-white font-medium outline-none focus:border-orange-500/50 resize-none text-sm"
                    value={postContent.body}
                    onChange={(e) => setPostContent({...postContent, body: e.target.value})}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleCreatePost();
                      }
                    }}
                  />
                </div>

                {/* Media Attachment Control */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">
                    Photo / Video Attachment (Optional — Private S3 Vault)
                  </label>
                  {postMedia ? (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                      {postMedia.mediaType === 'video' ? (
                        <div className="w-14 h-14 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Film size={24} />
                        </div>
                      ) : (
                        <img src={postMedia.previewUrl} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                      )}
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-bold text-white truncate">{postMedia.name || 'Attached media'}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">
                          {postMedia.mediaType.toUpperCase()} • S3 Private Vault
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPostMedia(null)}
                        className="p-2 text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all"
                        title="Remove attachment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-3 p-4 rounded-2xl border border-dashed border-white/20 hover:border-orange-500/50 bg-white/5 hover:bg-white/10 cursor-pointer transition-all group">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                        onChange={handleMediaSelected}
                        disabled={mediaUploading}
                        className="hidden"
                      />
                      {mediaUploading ? (
                        <div className="flex items-center gap-2 text-orange-400 text-xs font-bold">
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Encrypting & Uploading to S3...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-white/60 group-hover:text-white text-xs font-bold">
                          <Upload size={16} className="text-orange-400" />
                          <span>Attach Photo (JPEG, PNG, WEBP) or Video (MP4, WEBM)</span>
                        </div>
                      )}
                    </label>
                  )}
                </div>

                <button 
                  onClick={handleCreatePost}
                  disabled={(!postContent.title.trim() && !postContent.body.trim() && !postMedia?.key) || createSubmitting || mediaUploading}
                  className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-3xl transition-all shadow-xl active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-orange-500/20"
                >
                  {createSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Transmitting to MongoDB...</span>
                    </>
                  ) : (
                    <>
                      <span>Broadcast to {postContent.category || 'Sanctuary'}</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL 2: EDIT COMMUNITY POST                         */}
      {/* ==================================================== */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-xl glass-dark rounded-[3rem] p-10 border border-white/10 shadow-5xl relative"
            >
              <button 
                onClick={() => setEditingListing(null)}
                className="absolute top-8 right-8 p-3 glass text-white/20 hover:text-white rounded-2xl"
              >
                <X size={20} />
              </button>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">Edit Post</h2>
              <p className="text-xs text-white/40 mb-6">Modify your broadcast stored in MongoDB.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1 block">Subject Line</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-white font-bold text-sm outline-none focus:border-orange-500/50"
                    value={editPostContent.title}
                    onChange={(e) => setEditPostContent({...editPostContent, title: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('edit-body-textarea')?.focus();
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1 block">Body Content</label>
                  <textarea 
                    id="edit-body-textarea"
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-medium text-sm outline-none focus:border-orange-500/50 resize-none"
                    value={editPostContent.body}
                    onChange={(e) => setEditPostContent({...editPostContent, body: e.target.value})}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdatePost();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => setEditingListing(null)}
                    className="px-6 py-3 glass text-white/40 hover:text-white rounded-2xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePost}
                    disabled={editSubmitting || (!editPostContent.title.trim() && !editPostContent.body.trim())}
                    className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 disabled:opacity-50"
                  >
                    {editSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL 3: DELETE POST CONFIRMATION                    */}
      {/* ==================================================== */}
      <AnimatePresence>
        {deletingPostId && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-dark rounded-[2.5rem] p-8 border border-red-500/20 shadow-5xl text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 size={28} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Delete Community Post?</h3>
              <p className="text-xs text-white/50 mb-6 leading-relaxed">
                This will permanently remove this post and all associated responses from MongoDB.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setDeletingPostId(null)}
                  className="px-6 py-3 glass text-white/50 hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePost}
                  disabled={deleteSubmitting}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL 4: ESTABLISH NEW SOCIETY (COMMUNITY)           */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showCreateCommunity && (
          <div className="fixed inset-0 z-[2500] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg glass-dark rounded-[3.5rem] p-12 border border-white/10 shadow-5xl relative"
            >
              <button onClick={() => setShowCreateCommunity(false)} className="absolute top-8 right-8 p-3 glass text-white/20 hover:text-white rounded-2xl transition-all"><X size={24} /></button>
              <h2 className="text-4xl font-black text-white mb-8 tracking-tighter leading-none">New Society</h2>
              <form onSubmit={handleEstablishSociety} className="space-y-6">
                {societyError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{societyError}</span>
                  </div>
                )}
                <input 
                  type="text" 
                  placeholder="Society Name..." 
                  id="comm-name"
                  value={newSocietyName}
                  onChange={(e) => {
                    setNewSocietyName(e.target.value);
                    if (societyError) setSocietyError(null);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-8 text-white font-bold outline-none focus:border-blue-500/50 text-sm"
                />
                <input 
                  type="text" 
                  placeholder="Icon (e.g. 🐶)..." 
                  id="comm-icon"
                  value={newSocietyIcon}
                  onChange={(e) => setNewSocietyIcon(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-8 text-white font-bold outline-none focus:border-blue-500/50 text-sm"
                />
                <button 
                  type="submit"
                  disabled={societySubmitting}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-3xl transition-all shadow-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  {societySubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Establishing...</span>
                    </>
                  ) : (
                    <span>Establish Society</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL 5: DELETE SOCIETY CONFIRMATION                  */}
      {/* ==================================================== */}
      <AnimatePresence>
        {deletingSociety && (
          <div className="fixed inset-0 z-[2600] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-dark rounded-[3rem] p-8 md:p-10 border border-red-500/30 shadow-2xl relative"
            >
              <button
                onClick={() => {
                  if (!deleteSocietyLoading) {
                    setDeletingSociety(null);
                    setDeleteSocietyError(null);
                  }
                }}
                disabled={deleteSocietyLoading}
                className="absolute top-6 right-6 p-2 text-white/40 hover:text-white rounded-xl transition-all"
              >
                <X size={20} />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={28} />
              </div>

              <h3 className="text-2xl font-black text-white text-center mb-2 tracking-tight">
                Delete Society
              </h3>

              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 mb-3">
                  <span className="text-xl">{deletingSociety.icon || '🐾'}</span>
                  <span className="font-bold text-white">{deletingSociety.name}</span>
                </div>
                <p className="text-sm font-semibold text-red-400">
                  Deleting this society cannot be undone.
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Existing posts from this society will be preserved and reassigned to General.
                </p>
              </div>

              {deleteSocietyError && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{deleteSocietyError}</span>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!deleteSocietyLoading) {
                      setDeletingSociety(null);
                      setDeleteSocietyError(null);
                    }
                  }}
                  disabled={deleteSocietyLoading}
                  className="flex-1 py-4 glass hover:bg-white/10 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSociety}
                  disabled={deleteSocietyLoading}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteSocietyLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Society</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[3000] px-5 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Community;

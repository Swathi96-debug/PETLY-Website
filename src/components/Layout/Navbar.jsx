import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, Search, ShoppingCart, User, Bell, MessageSquare, Menu, X, Heart, CheckCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEcosystem } from '../../context/EcosystemContext';
import { notificationAPI } from '../../services/api';
import './Navbar.css';

const Navbar = () => {
  const { user } = useAuth();
  const { cartCount, wishlistPets, wishlistProducts, setIsCartOpen } = useEcosystem();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setNotifLoading(true);
      const res = await notificationAPI.getMyNotifications();
      if (res.success && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      // Non-fatal
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for background community updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, location.pathname]);

  // Click outside to close notification panel
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationAPI.markAsRead(notif._id);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark read:', err.message);
      }
    }
    setIsNotifOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err.message);
    }
  };

  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Adopt', path: '/adopt' },
    { name: 'Quiz', path: '/quiz' },
    { name: 'Services', path: '/services' },
    { name: 'Store', path: '/store' },
    { name: 'Health', path: '/health' },
    { name: 'Community', path: '/community' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled ? 'py-4' : 'py-6'}`}>
      <div className="container mx-auto px-6">
        <div className={`glass-dark rounded-full px-6 py-3 flex items-center justify-between transition-all duration-500 ${isScrolled ? 'bg-black/60 scale-[0.98]' : 'bg-white/5'}`}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 15 }}
              className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-yellow-400 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20"
            >
              <PawPrint className="text-white" size={24} />
            </motion.div>
            <span className="text-xl font-bold tracking-tighter text-white group-hover:text-orange-400 transition-colors">PETLY</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-all duration-300 relative group ${
                  location.pathname === link.path ? 'text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-orange-500 rounded-full"
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
              <Search size={20} />
            </button>
            <div 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 text-[10px] flex items-center justify-center rounded-full text-white font-bold animate-bounce">
                  {cartCount}
                </span>
              )}
            </div>
            
            <Link 
              to="/wishlist" 
              className="relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <Heart size={20} />
              {(wishlistPets.length + wishlistProducts.length) > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-[10px] flex items-center justify-center rounded-full text-white font-bold">
                  {wishlistPets.length + wishlistProducts.length}
                </span>
              )}
            </Link>

            {/* Notification Bell (Community & System) */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(prev => !prev);
                    if (!isNotifOpen) fetchNotifications();
                  }}
                  className={`relative p-2 rounded-full transition-all cursor-pointer ${
                    isNotifOpen ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-orange-500 text-[10px] flex items-center justify-center rounded-full text-white font-black shadow-lg shadow-orange-500/40">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Panel */}
                <AnimatePresence>
                  {isNotifOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-80 sm:w-96 glass-dark rounded-3xl p-5 border border-white/10 shadow-2xl z-[150] overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black text-white tracking-widest uppercase">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-bold rounded-full">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllAsRead}
                            className="text-[11px] font-bold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <CheckCheck size={13} /> Mark all read
                          </button>
                        )}
                      </div>

                      {/* Notification List */}
                      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {notifLoading && notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-white/40 font-medium">Loading notifications...</div>
                        ) : notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-white/40 font-medium flex flex-col items-center gap-2">
                            <Bell size={24} className="text-white/20" />
                            <span>No notifications yet</span>
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((notif) => (
                            <div
                              key={notif._id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 border ${
                                notif.isRead 
                                  ? 'bg-white/[0.02] border-transparent hover:bg-white/5' 
                                  : 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                notif.isRead ? 'bg-white/5 text-white/40' : 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                              }`}>
                                {notif.metadata?.action === 'comment' ? (
                                  <MessageSquare size={14} />
                                ) : (
                                  <Heart size={14} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-xs font-bold truncate ${notif.isRead ? 'text-white/70' : 'text-white'}`}>
                                    {notif.title}
                                  </p>
                                  <span className="text-[10px] text-white/40 whitespace-nowrap">
                                    {formatTimeAgo(notif.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-white/60 line-clamp-2 mt-0.5 leading-relaxed">
                                  {notif.message}
                                </p>
                              </div>
                              {!notif.isRead && (
                                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* View All Notifications Footer */}
                      <div className="pt-3 border-t border-white/10 mt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNotifOpen(false);
                            navigate('/profile?tab=notifications');
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-orange-500/15 hover:text-orange-400 text-white/70 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider group"
                        >
                          <span>View all notifications</span>
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {user ? (
              <Link to="/profile" className="hidden sm:flex items-center gap-3 bg-white/5 hover:bg-white/10 px-2 py-2 pr-5 rounded-full border border-white/5 transition-all group">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-black text-white shadow-lg group-hover:rotate-12 transition-transform">
                  {user.fullName.charAt(0)}
                </div>
                <span className="text-sm font-bold text-white/80">{user.fullName.split(' ')[0]}</span>
              </Link>
            ) : (
              <Link to="/signup" className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/10 transition-all">
                <User size={18} className="text-white/80" />
                <span className="text-sm font-semibold text-white">Join Petly</span>
              </Link>
            )}

            <button 
              className="lg:hidden p-2 text-white/60 hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed inset-x-0 pt-24 px-6 z-[90]"
          >
            <div className="glass-dark rounded-3xl p-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-semibold text-white/80 hover:text-white py-2"
                >
                  {link.name}
                </Link>
              ))}
              <hr className="border-white/10" />
              <Link to="/profile" className="flex items-center gap-3 text-white/80 py-2">
                <User size={20} />
                <span>My Profile</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

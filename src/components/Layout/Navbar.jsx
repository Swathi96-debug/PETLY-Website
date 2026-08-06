import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, Search, ShoppingCart, User, Bell, MessageSquare, Menu, X, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEcosystem } from '../../context/EcosystemContext';
import './Navbar.css';

const Navbar = () => {
  const { user } = useAuth();
  const { cartCount, wishlistPets, wishlistProducts, setIsCartOpen } = useEcosystem();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
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

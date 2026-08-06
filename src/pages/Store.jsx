import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Heart, Search, Star, Filter, ArrowRight, Zap, 
  Trash2, ShoppingBag, CreditCard, CheckCircle, X, Info, ChevronRight, 
  Package, Truck, ShieldCheck
} from 'lucide-react';
import { PRODUCTS_DATA } from '../data/products';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';

const Store = () => {
  const { user } = useAuth();
  const { 
    cart, 
    addToCart, 
    removeFromCart, 
    cartTotal, 
    wishlistProducts: wishlist, 
    toggleWishlistProduct: toggleWishlist, 
    isCartOpen, 
    setIsCartOpen 
  } = useEcosystem();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const filteredProducts = PRODUCTS_DATA.filter(p => {
    const matchesFilter = filter === 'all' || p.category === filter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.brand.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen pt-32 pb-40">
      <div className="container mx-auto px-6">
        
        {/* Header Dashboard */}
        <header className="mb-20 flex flex-col lg:flex-row justify-between items-end gap-12">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-6"
            >
              <Zap size={14} className="fill-current" />
              <span>Free Next-Day Delivery for Prime Members</span>
            </motion.div>
            <h1 className="text-7xl font-black tracking-tighter text-white leading-tight">
              Universal <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500">Supply Store</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-6 glass-dark rounded-[2rem] border border-white/10 hover:border-orange-500/50 transition-all group"
            >
              <ShoppingBag className="text-white group-hover:text-orange-500 transition-colors" size={28} />
              {cart.length > 0 && <span className="absolute top-4 right-4 w-6 h-6 bg-orange-500 text-[10px] font-black text-white flex items-center justify-center rounded-full animate-bounce">{cart.length}</span>}
            </button>
          </div>
        </header>

        {/* Browser Controls */}
        <div className="flex flex-col md:flex-row gap-8 mb-16 items-center justify-between border-b border-white/5 pb-12">
          <div className="flex items-center gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide no-scrollbar w-full md:w-auto">
            {['all', 'food', 'toys', 'grooming', 'health', 'beds', 'accessories'].map(cat => (
              <button 
                key={cat} onClick={() => setFilter(cat)}
                className={`px-8 py-4 rounded-2xl text-sm font-black capitalize transition-all whitespace-nowrap border ${
                  filter === cat ? 'bg-orange-500 text-white border-orange-400 shadow-2xl' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input 
              type="text" placeholder="Search premium artifacts..." 
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-sm font-bold text-white outline-none focus:border-orange-500/50 transition-all"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {filteredProducts.map(product => (
            <motion.div 
              layout key={product.id}
              whileHover={{ y: -15 }}
              className="glass-dark rounded-[3.5rem] p-5 border border-white/10 overflow-hidden relative group"
            >
              {/* Image & Wishlist */}
             <div
  className="bg-white/5 rounded-[2.5rem] h-72 flex items-center justify-center relative overflow-hidden group-hover:bg-white/10 transition-colors border border-white/5 cursor-pointer"
  onClick={() => setSelectedProduct(product)}
>
  <span className="text-8xl group-hover:scale-125 transition-transform duration-700">
    {product.image}
  </span>

  <button
    onClick={(e) => {
      e.stopPropagation();
      toggleWishlist(product.id);
    }}
    className={`absolute top-6 right-6 z-50 p-4 rounded-2xl backdrop-blur-xl border border-white/10 transition-all ${
      wishlist.includes(product.id)
        ? 'bg-red-500 text-white border-red-400'
        : 'bg-black/40 text-white/40 hover:text-white'
    }`}
  >
    <Heart
      size={20}
      fill={wishlist.includes(product.id) ? "currentColor" : "none"}
    />
  </button>

  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
    <div className="px-6 py-3 bg-white text-black font-black rounded-xl translate-y-4 group-hover:translate-y-0 transition-transform">
      Inspect Details
    </div>
  </div>
</div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest mb-1">{product.brand}</p>
                    <h3 className="text-xl font-bold text-white tracking-tighter leading-tight">{product.name}</h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 mb-8">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < Math.floor(product.rating) ? "#fbbf24" : "none"} className={i < Math.floor(product.rating) ? "text-yellow-400" : "text-white/10"} />
                  ))}
                  <span className="text-[10px] font-black text-white/40 ml-2">({product.reviews} REVIEWS)</span>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <p className="text-3xl font-black text-white tracking-tighter">${product.price.toFixed(2)}</p>
                  <button 
                    onClick={() => addToCart(product)}
                    className="w-14 h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-xl shadow-orange-500/20 active:scale-90 transition-all"
                  >
                    <ShoppingCart size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Store;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, Info, Trash2, ArrowRight, Star, Sparkles } from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext';
import { PETS_DATA } from '../data/pets';
import { PRODUCTS_DATA } from '../data/products';
import { Link } from 'react-router-dom';

const Wishlist = () => {
  const { 
    wishlistPets, 
    wishlistProducts, 
    toggleWishlistPet, 
    toggleWishlistProduct, 
    addToCart 
  } = useEcosystem();

  const [activeTab, setActiveTab] = useState('pets');

  // Look up full details for saved pets and products
  const savedPets = PETS_DATA.filter(pet => wishlistPets.includes(pet.id));
  const savedProducts = PRODUCTS_DATA.filter(prod => wishlistProducts.includes(prod.id));

  return (
    <div className="min-h-screen pt-32 pb-40">
      <div className="container mx-auto px-6">
        
        {/* Header */}
        <header className="mb-20 text-center max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest mb-6"
          >
            <Sparkles size={14} className="text-red-500" />
            <span>Your Personal Sanctuary Vault</span>
          </motion.div>
          <h1 className="text-7xl font-black tracking-tighter text-white mb-6">
            Saved <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-500">Favorites</span>
          </h1>
          <p className="text-xl text-white/40 leading-relaxed font-medium">
            Keep track of the companions you love and the premium accessories they need.
          </p>
        </header>

        {/* Tab Toggle */}
        <div className="flex justify-center gap-4 mb-16 border-b border-white/5 pb-8">
          <button 
            onClick={() => setActiveTab('pets')}
            className={`px-8 py-4 rounded-2xl text-sm font-black capitalize transition-all border ${
              activeTab === 'pets' 
                ? 'bg-red-500 text-white border-red-400 shadow-xl' 
                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
            }`}
          >
            Saved Pets ({savedPets.length})
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-8 py-4 rounded-2xl text-sm font-black capitalize transition-all border ${
              activeTab === 'products' 
                ? 'bg-red-500 text-white border-red-400 shadow-xl' 
                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
            }`}
          >
            Saved Products ({savedProducts.length})
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'pets' ? (
            <motion.div 
              key="pets-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10"
            >
              {savedPets.length === 0 ? (
                <div className="col-span-full py-20 text-center opacity-30">
                  <Heart size={80} className="mx-auto mb-6 text-white" />
                  <p className="text-xl font-bold tracking-widest mb-4">No Saved Pets</p>
                  <Link to="/adopt" className="px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm inline-block">
                    Browse Pets
                  </Link>
                </div>
              ) : (
                savedPets.map(pet => (
                  <motion.div 
                    layout 
                    key={pet.id}
                    className="glass-dark rounded-[3rem] p-5 border border-white/10 overflow-hidden relative group"
                  >
                    <div className="bg-white/5 rounded-[2.5rem] h-64 flex items-center justify-center relative overflow-hidden group-hover:bg-white/10 transition-colors border border-white/5">
                      <span className="text-8xl group-hover:scale-110 transition-transform duration-700">{pet.image}</span>
                      <button 
                        onClick={() => toggleWishlistPet(pet.id)}
                        className="absolute top-6 right-6 p-4 rounded-2xl bg-red-500 text-white border border-red-400 shadow-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="p-6">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">{pet.breed}</p>
                      <h3 className="text-2xl font-bold text-white tracking-tighter mb-4">{pet.name}</h3>
                      
                      <div className="flex gap-4 text-xs text-white/40 font-bold mb-6">
                        <span>{pet.age}</span>
                        <span>•</span>
                        <span>{pet.gender}</span>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <Link 
                          to="/adopt" 
                          className="flex items-center gap-2 text-sm font-bold text-white hover:text-orange-400 transition-colors"
                        >
                          View Details <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="products-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10"
            >
              {savedProducts.length === 0 ? (
                <div className="col-span-full py-20 text-center opacity-30">
                  <Heart size={80} className="mx-auto mb-6 text-white" />
                  <p className="text-xl font-bold tracking-widest mb-4">No Saved Products</p>
                  <Link to="/store" className="px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm inline-block">
                    Explore Store
                  </Link>
                </div>
              ) : (
                savedProducts.map(product => (
                  <motion.div 
                    layout 
                    key={product.id}
                    className="glass-dark rounded-[3rem] p-5 border border-white/10 overflow-hidden relative group"
                  >
                    <div className="bg-white/5 rounded-[2.5rem] h-64 flex items-center justify-center relative overflow-hidden group-hover:bg-white/10 transition-colors border border-white/5">
                      <span className="text-8xl group-hover:scale-110 transition-transform duration-700">{product.image}</span>
                      <button 
                        onClick={() => toggleWishlistProduct(product.id)}
                        className="absolute top-6 right-6 p-4 rounded-2xl bg-red-500 text-white border border-red-400 shadow-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="p-6">
                      <p className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest mb-1">{product.brand}</p>
                      <h3 className="text-xl font-bold text-white tracking-tighter mb-4 leading-snug">{product.name}</h3>
                      
                      <div className="flex items-center gap-1.5 mb-6">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < Math.floor(product.rating) ? "#fbbf24" : "none"} className={i < Math.floor(product.rating) ? "text-yellow-400" : "text-white/10"} />
                        ))}
                        <span className="text-[9px] font-black text-white/40 ml-2">({product.reviews})</span>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <p className="text-2xl font-black text-white">${product.price.toFixed(2)}</p>
                        <button 
                          onClick={() => addToCart(product)}
                          className="w-12 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/25 transition-all active:scale-95"
                        >
                          <ShoppingCart size={20} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
      </div>
    </div>
  );
};

export default Wishlist;

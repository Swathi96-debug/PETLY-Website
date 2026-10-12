import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, Info, Trash2, ArrowRight, Star, Sparkles } from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext';
import { PETS_DATA } from '../data/pets';
import { Link } from 'react-router-dom';
import ProductImage from '../components/Store/ProductImage';

const Wishlist = () => {
  const { 
    wishlistPets, 
    wishlistProducts, 
    toggleWishlistPet, 
    toggleWishlistProduct, 
    removeFromWishlistPet,
    removeFromWishlistProduct,
    addToCart,
    products: storeProducts,
    adoptionListings
  } = useEcosystem();

  const [activeTab, setActiveTab] = useState('pets');

  // Look up full details for saved pets and products
  const allPets = React.useMemo(() => [
    ...(Array.isArray(adoptionListings) ? adoptionListings.map(listing => {
      const pet = listing.pet || {};
      const speciesLower = (pet.species || 'dog').toLowerCase();
      const defaultEmoji = speciesLower === 'cat' ? '🐈' : speciesLower === 'rabbit' ? '🐇' : speciesLower === 'bird' ? '🦜' : '🐕';
      return {
        id: String(listing._id),
        _id: String(listing._id),
        name: pet.name || listing.title,
        breed: pet.breed || 'Rescue Companion',
        age: pet.age ? `${pet.age} ${pet.age === 1 ? 'yr' : 'yrs'}` : '1 yr',
        image: defaultEmoji,
        photoUrl: pet.photoUrl || '',
        price: listing.adoptionFee !== undefined ? listing.adoptionFee : 0,
        location: listing.location || 'Sanctuary Station',
      };
    }) : []),
    ...PETS_DATA.map(p => ({ ...p, id: String(p.id), _id: String(p.id) }))
  ], [adoptionListings]);

  const savedPets = React.useMemo(() => {
    const list = [];
    const seen = new Set();
    for (const pet of allPets) {
      const pId = String(pet.id || pet._id);
      if ((wishlistPets || []).some(wId => String(wId) === pId) && !seen.has(pId)) {
        seen.add(pId);
        list.push(pet);
      }
    }
    return list;
  }, [allPets, wishlistPets]);

  const savedProducts = React.useMemo(() => {
    const list = [];
    const seen = new Set();
    for (const prod of (storeProducts || [])) {
      const prodId = String(prod._id || prod.id);
      const isMatch = (wishlistProducts || []).some(wId => {
        const cleanW = String(wId);
        return cleanW === prodId ||
          (prod.demoId && cleanW === String(prod.demoId)) ||
          (prod.id && cleanW === String(prod.id));
      });
      if (isMatch && !seen.has(prodId)) {
        seen.add(prodId);
        list.push(prod);
      }
    }
    return list;
  }, [storeProducts, wishlistProducts]);

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
            className={`px-8 py-4 rounded-2xl text-sm font-black capitalize transition-all border cursor-pointer ${
              activeTab === 'pets' 
                ? 'bg-red-500 text-white border-red-400 shadow-xl' 
                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
            }`}
          >
            Saved Pets ({savedPets.length})
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-8 py-4 rounded-2xl text-sm font-black capitalize transition-all border cursor-pointer ${
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
                      {pet.photoUrl ? (
                        <img 
                          src={pet.photoUrl} 
                          alt={pet.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                      ) : (
                        <span className="text-8xl group-hover:scale-110 transition-transform duration-700">{pet.image || '🐾'}</span>
                      )}
                      <button 
                        onClick={() => removeFromWishlistPet ? removeFromWishlistPet(pet.id || pet._id) : toggleWishlistPet(pet.id || pet._id)}
                        className="absolute top-6 right-6 p-4 rounded-2xl bg-red-500 text-white border border-red-400 shadow-lg cursor-pointer"
                        title="Remove from saved pets"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{pet.breed}</span>
                        <span className="text-xs font-bold text-orange-400">{pet.age}</span>
                      </div>
                      <h3 className="text-2xl font-black text-white tracking-tighter mb-4">{pet.name}</h3>
                      <Link 
                        to="/adopt" 
                        className="w-full py-3 bg-white/5 hover:bg-white text-white hover:text-black font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-white/10"
                      >
                        View Companion <ArrowRight size={14} />
                      </Link>
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
                  <ShoppingCart size={80} className="mx-auto mb-6 text-white" />
                  <p className="text-xl font-bold tracking-widest mb-4">No Saved Products</p>
                  <Link to="/store" className="px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm inline-block">
                    Explore Store
                  </Link>
                </div>
              ) : (
                savedProducts.map(product => (
                  <motion.div 
                    layout 
                    key={product._id || product.id}
                    className="glass-dark rounded-[3rem] p-5 border border-white/10 overflow-hidden relative group"
                  >
                    <div className="bg-white/5 rounded-[2.5rem] h-64 flex items-center justify-center relative overflow-hidden group-hover:bg-white/10 transition-colors border border-white/5">
                      <ProductImage product={product} className="w-full h-full object-cover" emojiClassName="text-8xl group-hover:scale-110" />
                      <button 
                        onClick={() => removeFromWishlistProduct ? removeFromWishlistProduct(product._id || product.id) : toggleWishlistProduct(product._id || product.id)}
                        className="absolute top-6 right-6 p-4 rounded-2xl bg-red-500 text-white border border-red-400 shadow-lg cursor-pointer"
                        title="Remove from wishlist"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="p-6">
                      <p className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest mb-1">{product.brand}</p>
                      <h3 className="text-xl font-bold text-white tracking-tighter mb-4 leading-snug line-clamp-1">{product.name}</h3>
                      
                      <div className="flex items-center gap-1.5 mb-6">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            fill={i < Math.floor(product.rating || 5) ? "#fbbf24" : "none"} 
                            className={i < Math.floor(product.rating || 5) ? "text-yellow-400" : "text-white/10"} 
                          />
                        ))}
                        <span className="text-[9px] font-black text-white/40 ml-2">
                          ({product.reviewsCount ?? product.reviews ?? 0})
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <p className="text-2xl font-black text-white">${Number(product.price).toFixed(2)}</p>
                        <button 
                          onClick={() => addToCart(product)}
                          className="w-12 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
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

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Heart, Search, Star, Filter, ArrowRight, Zap, 
  Trash2, ShoppingBag, CreditCard, CheckCircle, X, Info, ChevronRight, 
  Package, Truck, ShieldCheck, AlertCircle, RefreshCw, Send, Clock, Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';
import { storeAPI } from '../services/api';
import ProductImage from '../components/Store/ProductImage';

const Store = () => {
  const { user } = useAuth();
  const { 
    cart, 
    cartCount,
    addToCart, 
    removeFromCart, 
    cartTotal, 
    wishlistProducts: wishlist, 
    toggleWishlistProduct: toggleWishlist, 
    isCartOpen, 
    setIsCartOpen,
    products: storeProducts,
    storeProductsLoading,
    storeProductsError,
    fetchStoreProducts,
    orders: userOrders,
    ordersLoading,
    fetchOrders,
    cancelOrder,
  } = useEcosystem();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  // Reviews state for selected product
  const [productReviews, setProductReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // Identify if current authenticated user has already reviewed the selected product
  const userExistingReview = React.useMemo(() => {
    if (!user || !productReviews.length) return null;
    const currentUserId = (user._id || user.id)?.toString();
    return productReviews.find((rev) => {
      const revUserId = (rev.user?._id || rev.user?.id || rev.user)?.toString();
      return revUserId === currentUserId;
    }) || null;
  }, [user, productReviews]);

  // Fetch reviews when a product is selected
  const loadReviews = useCallback(async (productId) => {
    if (!productId) return;
    setReviewsLoading(true);
    setReviewError(null);
    try {
      const res = await storeAPI.getProductReviews(productId);
      if (res.success && Array.isArray(res.reviews)) {
        setProductReviews(res.reviews);
      } else {
        setProductReviews([]);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err.message);
      setProductReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadReviews(selectedProduct._id || selectedProduct.id);
    } else {
      setProductReviews([]);
      setReviewText('');
      setReviewRating(5);
      setIsEditingReview(false);
      setEditingReviewId(null);
      setReviewError(null);
    }
  }, [selectedProduct, loadReviews]);

  // Enter edit review mode
  const handleStartEditReview = (reviewToEdit = userExistingReview) => {
    if (!reviewToEdit) return;
    setEditingReviewId(reviewToEdit._id);
    setReviewRating(reviewToEdit.rating || 5);
    setReviewText(reviewToEdit.reviewText || '');
    setIsEditingReview(true);
    setReviewError(null);
  };

  // Cancel edit review mode
  const handleCancelEditReview = () => {
    setIsEditingReview(false);
    setEditingReviewId(null);
    setReviewRating(5);
    setReviewText('');
    setReviewError(null);
  };

  // Submit new review or update existing review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setReviewError('Please sign in to submit a review.');
      return;
    }
    if (!reviewText.trim()) {
      setReviewError('Please write a review comment.');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);
    try {
      const pId = selectedProduct._id || selectedProduct.id;
      let res;

      if (isEditingReview && editingReviewId) {
        // Update the SAME existing Review document
        res = await storeAPI.updateProductReview(editingReviewId, {
          rating: reviewRating,
          reviewText: reviewText.trim()
        });
      } else {
        // Create new Review document
        res = await storeAPI.createProductReview(pId, {
          rating: reviewRating,
          reviewText: reviewText.trim()
        });
      }

      if (res.success) {
        setReviewText('');
        setReviewRating(5);
        setIsEditingReview(false);
        setEditingReviewId(null);
        await loadReviews(pId);
        // Refresh product list to update rating
        await fetchStoreProducts();
      } else {
        setReviewError(res.message || 'Failed to submit review.');
      }
    } catch (err) {
      setReviewError(err.response?.data?.message || err.message || 'Error submitting review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Delete review
  const handleDeleteReview = async (reviewId) => {
    try {
      const res = await storeAPI.deleteProductReview(reviewId);
      if (res.success) {
        const pId = selectedProduct._id || selectedProduct.id;
        setIsEditingReview(false);
        setEditingReviewId(null);
        setReviewText('');
        setReviewRating(5);
        await loadReviews(pId);
        await fetchStoreProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete review');
    }
  };

  // Filtered products list
  const filteredProducts = storeProducts.filter(p => {
    const matchesFilter = filter === 'all' || p.category?.toLowerCase() === filter.toLowerCase();
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || 
                          p.brand?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const isWishlisted = (p) => {
    const pId = p._id?.toString() || p.id;
    return wishlist.some(id => id === pId || id === p.demoId || id === p.id);
  };

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
            {/* Order History Button */}
            <button
              onClick={() => {
                if (!user) {
                  alert('Please sign in to view your order history.');
                  return;
                }
                fetchOrders();
                setShowOrderHistory(true);
              }}
              className="relative p-6 glass-dark rounded-[2rem] border border-white/10 hover:border-orange-500/50 transition-all group flex items-center gap-3 cursor-pointer"
              title="View Order History"
            >
              <Package className="text-white group-hover:text-orange-500 transition-colors" size={24} />
              <span className="hidden sm:inline text-xs font-black uppercase tracking-wider text-white/60 group-hover:text-white">
                Orders {userOrders.length > 0 && `(${userOrders.length})`}
              </span>
            </button>

            {/* Cart Button */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-6 glass-dark rounded-[2rem] border border-white/10 hover:border-orange-500/50 transition-all group cursor-pointer"
              title="View Cart"
            >
              <ShoppingBag className="text-white group-hover:text-orange-500 transition-colors" size={28} />
              {(cartCount > 0 || cart.length > 0) && (
                <span className="absolute top-4 right-4 w-6 h-6 bg-orange-500 text-[10px] font-black text-white flex items-center justify-center rounded-full animate-bounce">
                  {cartCount || cart.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Browser Controls */}
        <div className="flex flex-col md:flex-row gap-8 mb-16 items-center justify-between border-b border-white/5 pb-12">
          <div className="flex items-center gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide no-scrollbar w-full md:w-auto">
            {['all', 'food', 'toys', 'grooming', 'health', 'beds', 'accessories'].map(cat => (
              <button 
                key={cat} onClick={() => setFilter(cat)}
                className={`px-8 py-4 rounded-2xl text-sm font-black capitalize transition-all whitespace-nowrap border cursor-pointer ${
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

        {/* Loading State */}
        {storeProductsLoading && (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-6" />
            <p className="text-white/40 text-sm font-bold tracking-widest uppercase">Connecting to PETLY Supply Network...</p>
          </div>
        )}

        {/* Error State */}
        {storeProductsError && !storeProductsLoading && (
          <div className="py-16 text-center max-w-md mx-auto p-8 rounded-3xl bg-red-500/10 border border-red-500/20 mb-12">
            <AlertCircle className="mx-auto mb-4 text-red-400" size={40} />
            <p className="text-white font-bold mb-2">Unable to retrieve catalog</p>
            <p className="text-white/40 text-xs mb-6">{storeProductsError}</p>
            <button 
              onClick={() => fetchStoreProducts()} 
              className="px-6 py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-wider hover:bg-orange-500 hover:text-white transition-all flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!storeProductsLoading && !storeProductsError && filteredProducts.length === 0 && (
          <div className="py-24 text-center opacity-40">
            <ShoppingBag size={80} className="mx-auto mb-6 text-white" />
            <p className="text-2xl font-black text-white tracking-tight mb-2">No Matching Products Found</p>
            <p className="text-sm text-white/60">Try adjusting your search criteria or category filter.</p>
          </div>
        )}

        {/* Product Grid */}
        {!storeProductsLoading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {filteredProducts.map(product => {
              const inStock = product.stock === undefined || product.stock > 0;
              const wishlisted = isWishlisted(product);

              return (
                <motion.div 
                  layout key={product._id || product.id}
                  whileHover={{ y: -15 }}
                  className="glass-dark rounded-[3.5rem] p-5 border border-white/10 overflow-hidden relative group flex flex-col justify-between"
                >
                  {/* Image & Wishlist */}
                  <div
                    className="bg-white/5 rounded-[2.5rem] h-72 flex items-center justify-center relative overflow-hidden group-hover:bg-white/10 transition-colors border border-white/5 cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <ProductImage product={product} className="w-full h-full object-cover group-hover:scale-110" emojiClassName="text-8xl group-hover:scale-125" />

                    {/* Stock status badge */}
                    <div className="absolute top-6 left-6 z-40">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border ${
                        inStock ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {inStock ? 'In Stock' : 'Sold Out'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(product._id || product.id);
                      }}
                      className={`absolute top-6 right-6 z-50 p-4 rounded-2xl backdrop-blur-xl border border-white/10 transition-all ${
                        wishlisted
                          ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/30'
                          : 'bg-black/40 text-white/40 hover:text-white'
                      }`}
                      title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart
                        size={20}
                        fill={wishlisted ? "currentColor" : "none"}
                      />
                    </button>

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                      <div className="px-6 py-3 bg-white text-black font-black rounded-xl translate-y-4 group-hover:translate-y-0 transition-transform">
                        Inspect Details
                      </div>
                    </div>
                  </div>

                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest mb-1">{product.brand}</p>
                          <h3 className="text-xl font-bold text-white tracking-tighter leading-tight line-clamp-2">{product.name}</h3>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mb-6">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            fill={i < Math.floor(product.rating || 5) ? "#fbbf24" : "none"} 
                            className={i < Math.floor(product.rating || 5) ? "text-yellow-400" : "text-white/10"} 
                          />
                        ))}
                        <span className="text-[10px] font-black text-white/40 ml-2">
                          ({product.reviewsCount ?? product.reviews ?? 0} REVIEWS)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                      <p className="text-3xl font-black text-white tracking-tighter">${Number(product.price).toFixed(2)}</p>
                      <button 
                        disabled={!inStock}
                        onClick={() => addToCart(product)}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all ${
                          inStock 
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 cursor-pointer' 
                            : 'bg-white/10 text-white/20 cursor-not-allowed'
                        }`}
                        title={inStock ? "Add to Cart" : "Out of stock"}
                      >
                        <ShoppingCart size={24} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[2500] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-4xl glass-dark rounded-[3.5rem] border border-white/10 shadow-5xl overflow-hidden relative max-h-[90vh] flex flex-col"
            >
              {/* Close button */}
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 z-50 p-3 glass text-white/40 hover:text-white rounded-xl transition-all"
              >
                <X size={24} />
              </button>

              <div className="overflow-y-auto p-8 sm:p-12 space-y-10 custom-scrollbar">
                {/* Upper Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                  <div className="h-80 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    <ProductImage product={selectedProduct} className="w-full h-full object-cover" emojiClassName="text-9xl" />
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{selectedProduct.brand} • {selectedProduct.category}</span>
                      <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mt-1">{selectedProduct.name}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            fill={i < Math.floor(selectedProduct.rating || 5) ? "#fbbf24" : "none"} 
                            className={i < Math.floor(selectedProduct.rating || 5) ? "text-yellow-400" : "text-white/10"} 
                          />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-white/60">
                        {Number(selectedProduct.rating || 5).toFixed(1)} ({selectedProduct.reviewsCount ?? selectedProduct.reviews ?? 0} verified reviews)
                      </span>
                    </div>

                    <p className="text-white/60 text-sm leading-relaxed">
                      {selectedProduct.description || 'Premium certified artifact crafted for companion wellness and endurance.'}
                    </p>

                    <div className="flex items-baseline gap-4">
                      <span className="text-4xl font-black text-white">${Number(selectedProduct.price).toFixed(2)}</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        (selectedProduct.stock === undefined || selectedProduct.stock > 0)
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {(selectedProduct.stock === undefined || selectedProduct.stock > 0) ? `In Stock (${selectedProduct.stock ?? 50} units)` : 'Out of Stock'}
                      </span>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        disabled={selectedProduct.stock !== undefined && selectedProduct.stock <= 0}
                        onClick={() => {
                          addToCart(selectedProduct);
                          setSelectedProduct(null);
                        }}
                        className="flex-1 py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50"
                      >
                        <ShoppingCart size={20} /> Add to Cart
                      </button>

                      <button
                        onClick={() => toggleWishlist(selectedProduct._id || selectedProduct.id)}
                        className={`p-5 rounded-2xl border transition-all ${
                          isWishlisted(selectedProduct)
                            ? 'bg-red-500 text-white border-red-400'
                            : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
                        }`}
                        title="Wishlist"
                      >
                        <Heart size={20} fill={isWishlisted(selectedProduct) ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reviews Section */}
                <div className="border-t border-white/10 pt-10 space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      Customer Reviews ({productReviews.length})
                    </h3>
                  </div>

                  {/* Review Action / Form Section */}
                  {user ? (
                    userExistingReview && !isEditingReview ? (
                      /* User already reviewed: show existing review card with EDIT REVIEW + DELETE REVIEW */
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest">Your Review</h4>
                              <div className="flex gap-0.5 ml-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={13}
                                    fill={i < userExistingReview.rating ? "#fbbf24" : "none"}
                                    className={i < userExistingReview.rating ? "text-yellow-400" : "text-white/10"}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-white/80 text-sm leading-relaxed">{userExistingReview.reviewText}</p>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleStartEditReview(userExistingReview)}
                              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 size={13} className="text-orange-400" /> Edit Review
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(userExistingReview._id)}
                              className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 size={13} /> Delete Review
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Show Write Review or Edit Review Form */
                      <form onSubmit={handleReviewSubmit} className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                            {isEditingReview ? 'Edit Your Review' : 'Leave a Review'}
                          </h4>
                          {isEditingReview && (
                            <button
                              type="button"
                              onClick={handleCancelEditReview}
                              className="text-xs font-bold text-white/40 hover:text-white transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        
                        {reviewError && (
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                            {reviewError}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Rating:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => setReviewRating(star)}
                                className="p-1 text-white/20 hover:text-yellow-400 transition-colors"
                              >
                                <Star 
                                  size={18} 
                                  fill={star <= reviewRating ? "#fbbf24" : "none"} 
                                  className={star <= reviewRating ? "text-yellow-400" : "text-white/20"} 
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Share your experience with this artifact..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-orange-500"
                          />
                          <button
                            type="submit"
                            disabled={submittingReview}
                            className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                          >
                            <Send size={14} /> {isEditingReview ? 'Update Review' : 'Submit'}
                          </button>
                        </div>
                      </form>
                    )
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-white/40">
                      Please sign in to share your review on this artifact.
                    </div>
                  )}

                  {/* Reviews list */}
                  {reviewsLoading ? (
                    <div className="py-8 text-center text-white/40 text-xs">Loading reviews...</div>
                  ) : productReviews.length === 0 ? (
                    <div className="py-8 text-center text-white/30 text-sm font-medium">
                      No customer reviews yet. Be the first to review!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {productReviews.map((rev) => {
                        const isAuthor = user && (rev.user?._id === user._id || rev.user === user._id || rev.user?.id === user.id);
                        return (
                          <div key={rev._id} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-start gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-white text-sm">
                                  {rev.user?.fullName || 'Verified Buyer'}
                                </span>
                                <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      size={12} 
                                      fill={i < rev.rating ? "#fbbf24" : "none"} 
                                      className={i < rev.rating ? "text-yellow-400" : "text-white/10"} 
                                    />
                                  ))}
                                </div>
                                <span className="text-[10px] text-white/30">
                                  {new Date(rev.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-white/70 text-sm leading-relaxed">{rev.reviewText}</p>
                            </div>

                            {isAuthor && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEditReview(rev)}
                                  className="text-white/30 hover:text-orange-400 transition-colors p-2 cursor-pointer"
                                  title="Edit your review"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteReview(rev._id)}
                                  className="text-white/30 hover:text-red-500 transition-colors p-2 cursor-pointer"
                                  title="Delete your review"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order History Modal */}
      <AnimatePresence>
        {showOrderHistory && (
          <div className="fixed inset-0 z-[2600] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-3xl glass-dark rounded-[3.5rem] border border-white/10 shadow-5xl overflow-hidden relative max-h-[85vh] flex flex-col p-8 sm:p-12"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <Package size={24} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Order Archives</h2>
                    <p className="text-xs text-white/40">Verified MongoDB purchase records</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowOrderHistory(false)}
                  className="p-3 glass text-white/40 hover:text-white rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {ordersLoading ? (
                  <div className="py-16 text-center text-white/40 text-sm font-bold uppercase tracking-widest">
                    Retrieving orders from vault...
                  </div>
                ) : userOrders.length === 0 ? (
                  <div className="py-16 text-center opacity-30">
                    <Package size={64} className="mx-auto mb-4 text-white" />
                    <p className="text-lg font-bold text-white">No Previous Orders</p>
                    <p className="text-xs text-white/60 mt-1">Dispatched supplies will be recorded here.</p>
                  </div>
                ) : (
                  userOrders.map((ord) => {
                    const items = ord.items || ord.orderItems || [];
                    const statusColors = {
                      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                      processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                      shipped: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                      delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
                    };
                    const badgeClass = statusColors[ord.status?.toLowerCase()] || statusColors.pending;

                    return (
                      <div key={ord._id} className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/5 pb-4">
                          <div>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">ORDER</span>
                            <h4 className="text-base font-bold text-white font-mono">#{ord._id.toString().slice(-8).toUpperCase()}</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-white/40 flex items-center gap-1">
                              <Clock size={12} /> {new Date(ord.createdAt).toLocaleDateString()}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeClass}`}>
                              {ord.status || 'Pending'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4 text-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                  <ProductImage product={item} className="w-full h-full object-cover" emojiClassName="text-base" />
                                </div>
                                <span className="text-white/80 truncate font-medium">{item.name}</span>
                                <span className="text-xs text-white/30 shrink-0">x{item.quantity}</span>
                              </div>
                              <span className="text-white font-mono font-bold shrink-0">
                                ${(Number(item.price) * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {ord.shippingAddress?.addressLine && (
                          <div className="text-[11px] text-white/50 pt-3 border-t border-white/5 flex flex-wrap justify-between gap-2">
                            <span>📍 {ord.shippingAddress.label || 'Delivery'}: {ord.shippingAddress.recipientName}, {ord.shippingAddress.addressLine}, {ord.shippingAddress.city}</span>
                            <span className="text-orange-400 font-semibold">{ord.paymentMethod || 'Cash on Delivery (Demo)'}</span>
                          </div>
                        )}

                        <div className="pt-3 border-t border-white/5 flex justify-between items-center gap-3 text-sm flex-wrap">
                          <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Total Amount</span>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xl font-black text-orange-500 font-mono">
                              ${Number(ord.totalAmount || 0).toFixed(2)}
                            </span>
                            {['pending', 'confirmed', 'processing'].includes(ord.status) && (
                              <button
                                disabled={cancellingOrderId === ord._id}
                                onClick={async () => {
                                  if (!window.confirm(`Cancel order #${ord._id.toString().slice(-8).toUpperCase()}? This cannot be undone.`)) return;
                                  setCancellingOrderId(ord._id);
                                  const result = await cancelOrder(ord._id);
                                  setCancellingOrderId(null);
                                  if (!result.success) alert(result.message || 'Failed to cancel order.');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold uppercase tracking-wider hover:bg-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {cancellingOrderId === ord._id ? 'Cancelling…' : 'Cancel Order'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Store;

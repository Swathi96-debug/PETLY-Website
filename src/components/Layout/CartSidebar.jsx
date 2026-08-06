import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShoppingBag, Trash2, CreditCard, CheckCircle, Package, Truck, ShieldCheck, Zap 
} from 'lucide-react';
import { useEcosystem } from '../../context/EcosystemContext';
import { useAuth } from '../../context/AuthContext';

const CartSidebar = () => {
  const { user } = useAuth();
  const { 
    cart, 
    removeFromCart, 
    updateCartQuantity, 
    cartTotal, 
    isCartOpen, 
    setIsCartOpen,
    clearCart 
  } = useEcosystem();

  const [checkoutStep, setCheckoutStep] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);

  const handleCheckout = () => {
    const orders = JSON.parse(localStorage.getItem('petly_orders') || '[]');
    const newOrder = {
      id: `ORD-${Date.now()}`,
      items: cart,
      total: cartTotal,
      date: new Date().toLocaleDateString(),
      status: 'In Transit'
    };
    localStorage.setItem('petly_orders', JSON.stringify([...orders, newOrder]));
    setShowOrderSuccess(true);
    
    setTimeout(() => {
      clearCart();
      setShowCheckout(false);
      setShowOrderSuccess(false);
      setCheckoutStep(0);
      setIsCartOpen(false);
    }, 3000);
  };

  return (
    <>
      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[2000] flex justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => !showCheckout && setIsCartOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full glass-dark border-l border-white/10 p-8 sm:p-12 flex flex-col z-10"
            >
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                  Your <span className="text-orange-500">Cart</span>
                </h2>
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  className="p-3 glass text-white/40 rounded-xl hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar scrollbar-hide">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20">
                    <ShoppingBag size={80} />
                    <p className="text-xl font-bold mt-6 tracking-widest">Cart Disengaged</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-6 group">
                      <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center text-4xl border border-white/10">
                        {item.image}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <h4 className="font-bold text-white uppercase tracking-tighter text-sm sm:text-base">{item.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.id)} 
                            className="text-white/20 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <p className="text-xs text-white/40 font-medium">{item.brand}</p>
                        <div className="flex justify-between items-end mt-4">
                          <p className="text-lg font-black text-white">${(item.price * item.quantity).toFixed(2)}</p>
                          <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                            <button 
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="text-white/40 hover:text-white font-black px-1"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-orange-500">{item.quantity}</span>
                            <button 
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="text-white/40 hover:text-white font-black px-1"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer / Total */}
              {cart.length > 0 && (
                <div className="pt-12 mt-auto border-t border-white/5">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Total Estimated Value</p>
                      <h3 className="text-5xl font-black text-white tracking-tighter">${cartTotal.toFixed(2)}</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowCheckout(true)}
                    className="w-full py-6 bg-white text-black font-black rounded-3xl group flex items-center justify-center gap-3 active:scale-95 transition-all shadow-3xl shadow-white/5 cursor-pointer"
                  >
                    Initiate Logistics <CreditCard size={20} />
                  </button>
                  <p className="text-center text-[10px] font-black text-white/20 uppercase tracking-widest mt-6 italic">Secure neural processing active • 256-bit encryption</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout Flow Modal */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="w-full max-w-4xl glass-dark rounded-[4rem] border border-white/10 shadow-5xl overflow-hidden relative h-[700px] flex flex-col lg:flex-row"
            >
              {/* Order Success Overlay */}
              <AnimatePresence>
                {showOrderSuccess && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center text-center p-12"
                  >
                    <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-[2.5rem] flex items-center justify-center mb-8 border border-green-500/30">
                      <Package size={64} />
                    </div>
                    <h2 className="text-6xl font-black text-white mb-4 tracking-tighter">Logistics Dispatched</h2>
                    <p className="text-xl text-white/40 max-w-md">Your artifacts have been processed and are entering our high-speed courier network.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sidebar Info */}
              <div className="w-full lg:w-1/3 bg-white/5 p-8 sm:p-12 border-r border-white/5 flex flex-col">
                <h3 className="text-3xl font-black text-white mb-12 tracking-tighter">Order Hub</h3>
                <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar scrollbar-hide">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl shrink-0">{item.image}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-white/40">Qty {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-8 border-t border-white/5">
                  <p className="text-xs font-black text-white/20 uppercase tracking-widest mb-1">Estimated Total</p>
                  <p className="text-3xl font-black text-orange-500 tracking-tighter">${cartTotal.toFixed(2)}</p>
                </div>
              </div>

              {/* Checkout Content */}
              <div className="flex-1 p-8 sm:p-12 lg:p-20 relative overflow-y-auto no-scrollbar scrollbar-hide">
                <button 
                  onClick={() => setShowCheckout(false)} 
                  className="absolute top-8 right-8 p-3 glass text-white/20 hover:text-white rounded-xl"
                >
                  <X size={24} />
                </button>
                
                <div className="mb-12 flex gap-4">
                  {[0, 1].map(s => (
                    <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= checkoutStep ? 'bg-orange-500 shadow-lg shadow-orange-500/40' : 'bg-white/10'}`} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {checkoutStep === 0 && (
                    <motion.div key="ship" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                       <h2 className="text-4xl font-black text-white tracking-tighter">Dispatch Terminal</h2>
                       <div className="space-y-4">
                          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 group cursor-pointer hover:border-orange-500/30">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black text-white/20 uppercase tracking-widest leading-none">Primary Receiver</span>
                                <CheckCircle size={16} className="text-orange-500" />
                             </div>
                             <p className="font-bold text-white text-lg leading-tight uppercase tracking-tighter">{user?.fullName || 'John Doe'}</p>
                             <p className="text-sm text-white/40 mt-2 font-medium">128 Neural Link Blvd. <br />Neo City, NC 2055</p>
                          </div>
                          <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-4">
                             <Truck className="text-blue-400 font-bold" />
                             <p className="text-xs font-bold text-blue-400 leading-snug">Autonomous flying courier delivering by tomorrow 9:00 AM.</p>
                          </div>
                       </div>
                    </motion.div>
                  )}

                  {checkoutStep === 1 && (
                    <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                       <h2 className="text-4xl font-black text-white tracking-tighter">Secure Exchange</h2>
                       <div className="p-8 rounded-[2.5rem] bg-orange-500 text-white relative overflow-hidden group shadow-2xl">
                          <Zap className="absolute -bottom-10 -right-10 w-40 h-40 opacity-20" />
                          <div className="flex justify-between items-start mb-12">
                             <CreditCard size={32} />
                             <h4 className="text-xl font-black tracking-widest italic opacity-60">PETLY PLATINUM</h4>
                          </div>
                          <p className="text-2xl font-black tracking-widest mb-6">••••  ••••  ••••  4590</p>
                          <div className="flex justify-between items-end">
                             <div>
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Owner</p>
                                <p className="font-bold tracking-widest uppercase">{user?.fullName || 'John Doe'}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">EXP</p>
                                <p className="font-bold">06/29</p>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-3 p-4 px-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                          <ShieldCheck size={16} /> PETLY Secured Transaction Logic Active
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-20">
                    <button 
                      onClick={() => checkoutStep < 1 ? setCheckoutStep(checkoutStep + 1) : handleCheckout()}
                      className="w-full py-6 bg-white text-black font-black rounded-3xl shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest cursor-pointer"
                    >
                      {checkoutStep === 1 ? 'Verify & Dispatch' : 'Continue to Funds'}
                    </button>
                    {checkoutStep > 0 && (
                      <button 
                        onClick={() => setCheckoutStep(checkoutStep - 1)} 
                        className="w-full mt-4 text-xs font-black text-white/20 hover:text-white uppercase tracking-widest"
                      >
                        Previous Layer
                      </button>
                    )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CartSidebar;

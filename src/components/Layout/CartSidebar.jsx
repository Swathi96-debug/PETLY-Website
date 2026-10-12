import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShoppingBag, Trash2, CreditCard, CheckCircle, Package, Truck, 
  ShieldCheck, Zap, AlertCircle, Plus, MapPin, Check, Home, Briefcase, Tag
} from 'lucide-react';
import { useEcosystem } from '../../context/EcosystemContext';
import { useAuth } from '../../context/AuthContext';
import { storeAPI } from '../../services/api';
import ProductImage from '../Store/ProductImage';

const DEMO_PAYMENT_METHODS = [
  { 
    id: 'cod', 
    name: 'Cash on Delivery', 
    desc: 'Pay cash upon delivery. Recommended & simplest demo option.', 
    icon: '💵',
    isDefault: true 
  },
  { 
    id: 'upi', 
    name: 'Demo UPI', 
    desc: 'Simulated Instant UPI Transfer (GPay / PhonePe simulation).', 
    icon: '📱' 
  },
  { 
    id: 'card', 
    name: 'Demo Credit/Debit Card', 
    desc: 'Simulated Card Payment. Zero banking credentials required.', 
    icon: '💳' 
  },
  { 
    id: 'wallet', 
    name: 'Demo Wallet', 
    desc: 'Simulated PETLY Vault credits & instant dispatch authorization.', 
    icon: '👛' 
  },
];

const CartSidebar = () => {
  const { user } = useAuth();
  const { 
    cart, 
    removeFromCart, 
    updateCartQuantity, 
    cartTotal, 
    isCartOpen, 
    setIsCartOpen,
    clearCart,
    createOrder
  } = useEcosystem();

  const [checkoutStep, setCheckoutStep] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [createdOrderId, setCreatedOrderId] = useState(null);

  // Saved Addresses State
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    recipientName: '',
    phone: '',
    addressLine: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '',
    isDefault: false,
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressFormError, setAddressFormError] = useState(null);

  // Selected Demo Payment Method State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');

  // Fetch saved addresses whenever checkout is opened or user changes
  useEffect(() => {
    if (user) {
      if (Array.isArray(user.addresses) && user.addresses.length > 0) {
        setAddresses(user.addresses);
        const def = user.addresses.find(a => a.isDefault) || user.addresses[0];
        if (def && !selectedAddressId) {
          setSelectedAddressId(String(def._id));
        }
      }
      loadAddresses();
      // Pre-fill default recipient name and phone in add form
      setNewAddress(prev => ({
        ...prev,
        recipientName: user.fullName || prev.recipientName,
        phone: user.phone || '+91 98765 43210'
      }));
    }
  }, [user, showCheckout]);

  const loadAddresses = async () => {
    if (!user) return;
    setAddressesLoading(true);
    try {
      const res = await storeAPI.getAddresses();
      if (res.success && Array.isArray(res.addresses)) {
        setAddresses(res.addresses);
        // Default to the default address or first address
        const def = res.addresses.find(a => a.isDefault) || res.addresses[0];
        if (def && (!selectedAddressId || !res.addresses.some(a => String(a._id) === String(selectedAddressId)))) {
          setSelectedAddressId(String(def._id));
        }
      }
    } catch (err) {
      console.warn('Could not load saved addresses:', err.message);
    } finally {
      setAddressesLoading(false);
    }
  };

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.recipientName.trim() || !newAddress.phone.trim() || !newAddress.addressLine.trim() || !newAddress.postalCode.trim()) {
      setAddressFormError('Please fill in all required address fields.');
      return;
    }

    setAddressSaving(true);
    setAddressFormError(null);

    try {
      const res = await storeAPI.addAddress(newAddress);
      if (res.success && res.addresses) {
        setAddresses(res.addresses);
        if (res.address?._id) {
          setSelectedAddressId(String(res.address._id));
        }
        setShowAddAddress(false);
        setNewAddress({
          label: 'Home',
          recipientName: user?.fullName || '',
          phone: user?.phone || '+91 98765 43210',
          addressLine: '',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '',
          isDefault: false,
        });
      }
    } catch (err) {
      setAddressFormError(err.message || 'Failed to save address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      setCheckoutError('Please log in to complete your purchase.');
      return;
    }
    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      const items = cart.map((i) => ({
        product: i.productId || i._id || i.id,
        quantity: i.quantity,
        price: i.price,
        name: i.name,
        image: i.image,
        imageKey: i.imageKey || ''
      }));

      // Pick selected address strictly from user's MongoDB addresses
      const selectedAddr = addresses.find(a => String(a._id) === String(selectedAddressId)) || addresses[0];
      if (!selectedAddr) {
        setCheckoutError('Please add a delivery destination to proceed.');
        setIsSubmitting(false);
        return;
      }

      const shippingAddress = {
        label: selectedAddr.label || 'Home',
        recipientName: selectedAddr.recipientName || user?.fullName || 'PETLY Customer',
        phone: selectedAddr.phone || user?.phone || '',
        addressLine: selectedAddr.addressLine || '',
        city: selectedAddr.city || 'Bengaluru',
        state: selectedAddr.state || 'Karnataka',
        postalCode: selectedAddr.postalCode || '560038',
      };

      const paymentMethodObj = DEMO_PAYMENT_METHODS.find(p => p.id === selectedPaymentMethod);
      const paymentMethodName = `${paymentMethodObj?.name || 'Cash on Delivery'} (Demo)`;

      const res = await createOrder({
        items,
        shippingAddress,
        paymentMethod: paymentMethodName,
      });

      if (res && (res.success || res.order)) {
        const orderId = res.order?._id || res.order?.id;
        setCreatedOrderId(orderId);
        setShowOrderSuccess(true);
        setTimeout(() => {
          clearCart();
          setShowCheckout(false);
          setShowOrderSuccess(false);
          setCheckoutStep(0);
          setIsCartOpen(false);
          setCreatedOrderId(null);
        }, 3000);
      } else {
        setCheckoutError(res?.message || 'Order processing failed. Please try again.');
      }
    } catch (err) {
      setCheckoutError(err.message || 'An unexpected error occurred during checkout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAddr = addresses.find(a => a._id === selectedAddressId) || addresses[0];
  const selectedPayObj = DEMO_PAYMENT_METHODS.find(p => p.id === selectedPaymentMethod) || DEMO_PAYMENT_METHODS[0];

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
                  className="p-3 glass text-white/40 rounded-xl hover:text-white transition-all cursor-pointer"
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
                    <div key={item.id || item._id} className="flex gap-6 group">
                      <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center text-4xl border border-white/10 overflow-hidden shrink-0">
                        <ProductImage product={item} className="w-full h-full object-cover" emojiClassName="text-4xl" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <h4 className="font-bold text-white uppercase tracking-tighter text-sm sm:text-base">{item.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.id || item._id)} 
                            className="text-white/20 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <p className="text-xs text-white/40 font-medium">{item.brand}</p>
                        <div className="flex justify-between items-end mt-4">
                          <p className="text-lg font-black text-white">${(item.price * item.quantity).toFixed(2)}</p>
                          <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                            <button 
                              onClick={() => updateCartQuantity(item.id || item._id, item.quantity - 1)}
                              className="text-white/40 hover:text-white font-black px-1 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-orange-500">{item.quantity}</span>
                            <button 
                              onClick={() => {
                                if (item.stock !== undefined && item.quantity >= item.stock) {
                                  alert(`Maximum stock reached for ${item.name} (${item.stock} in stock).`);
                                  return;
                                }
                                updateCartQuantity(item.id || item._id, item.quantity + 1);
                              }}
                              className="text-white/40 hover:text-white font-black px-1 cursor-pointer"
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
                      <p className="text-xs font-black text-white/20 uppercase tracking-widest mb-1">Total Artifacts</p>
                      <p className="text-4xl font-black text-white tracking-tighter">${cartTotal.toFixed(2)}</p>
                    </div>
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-widest bg-orange-500/10 px-4 py-2 rounded-xl border border-orange-500/20">
                      Standard Dispatch
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      if (!user) {
                        alert('Please sign in to proceed to checkout.');
                        return;
                      }
                      setShowCheckout(true);
                    }}
                    className="w-full py-6 bg-white text-black font-black rounded-3xl group flex items-center justify-center gap-3 active:scale-95 transition-all shadow-3xl shadow-white/5 cursor-pointer"
                  >
                    Initiate Logistics <CreditCard size={20} />
                  </button>
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
              className="w-full max-w-4xl glass-dark rounded-[4rem] border border-white/10 shadow-5xl overflow-hidden relative h-[720px] flex flex-col lg:flex-row"
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
                    <p className="text-xl text-white/40 max-w-md mb-2">Your artifacts have been processed and are entering our courier network.</p>
                    {createdOrderId && (
                      <p className="text-xs font-mono text-orange-400 font-bold uppercase tracking-wider">
                        Order #{createdOrderId.toString().slice(-6).toUpperCase()}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sidebar Info */}
              <div className="w-full lg:w-1/3 bg-white/5 p-8 sm:p-12 border-r border-white/5 flex flex-col justify-between">
                <div>
                  <h3 className="text-3xl font-black text-white mb-8 tracking-tighter">Order Hub</h3>
                  <div className="space-y-4 max-h-72 overflow-y-auto no-scrollbar scrollbar-hide pr-1">
                    {cart.map(item => (
                      <div key={item.id || item._id} className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl shrink-0 overflow-hidden border border-white/10">
                          <ProductImage product={item} className="w-full h-full object-cover" emojiClassName="text-xl" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-white/40">Qty {item.quantity} • ${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Dispatch Target</p>
                    <p className="text-xs text-white/70 truncate font-medium">
                      {selectedAddr ? `${selectedAddr.label}: ${selectedAddr.recipientName} (${selectedAddr.city})` : 'Default Address'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Estimated Total</p>
                    <p className="text-3xl font-black text-orange-500 tracking-tighter">${cartTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Checkout Content */}
              <div className="flex-1 p-8 sm:p-12 lg:p-14 relative overflow-y-auto no-scrollbar scrollbar-hide flex flex-col justify-between">
                <button 
                  onClick={() => setShowCheckout(false)} 
                  className="absolute top-8 right-8 p-3 glass text-white/20 hover:text-white rounded-xl cursor-pointer"
                >
                  <X size={24} />
                </button>
                
                <div>
                  {/* Step Progress */}
                  <div className="mb-8 flex gap-4">
                    {[0, 1].map(s => (
                      <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= checkoutStep ? 'bg-orange-500 shadow-lg shadow-orange-500/40' : 'bg-white/10'}`} />
                    ))}
                  </div>

                  {checkoutError && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-xs font-bold">
                      <AlertCircle size={16} />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {/* STEP 0: SAVED ADDRESSES */}
                    {checkoutStep === 0 && (
                      <motion.div key="ship" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h2 className="text-3xl font-black text-white tracking-tighter">Dispatch Terminal</h2>
                            <p className="text-xs text-white/40">Select or register your delivery destination</p>
                          </div>
                          {!showAddAddress && (
                            <button
                              onClick={() => setShowAddAddress(true)}
                              className="px-4 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Plus size={14} /> Add Address
                            </button>
                          )}
                        </div>

                        {/* Add New Address Form */}
                        {showAddAddress ? (
                          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                              <span className="text-xs font-black uppercase tracking-wider text-orange-400">Add New Address</span>
                              <button onClick={() => setShowAddAddress(false)} className="text-white/40 hover:text-white text-xs cursor-pointer">Cancel</button>
                            </div>

                            {addressFormError && (
                              <p className="text-xs text-red-400 font-medium">{addressFormError}</p>
                            )}

                            <div className="flex gap-2">
                              {['Home', 'Office', 'Other'].map(lbl => (
                                <button
                                  key={lbl}
                                  type="button"
                                  onClick={() => setNewAddress({ ...newAddress, label: lbl })}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    newAddress.label === lbl 
                                      ? 'bg-orange-500 text-white border-orange-400' 
                                      : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                                  }`}
                                >
                                  {lbl}
                                </button>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input
                                type="text"
                                placeholder="Recipient Name *"
                                value={newAddress.recipientName}
                                onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500"
                              />
                              <input
                                type="text"
                                placeholder="Phone Number *"
                                value={newAddress.phone}
                                onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500"
                              />
                            </div>

                            <input
                              type="text"
                              placeholder="Address Line (Street, Flat, Area) *"
                              value={newAddress.addressLine}
                              onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500"
                            />

                            <div className="grid grid-cols-3 gap-3">
                              <input
                                type="text"
                                placeholder="City *"
                                value={newAddress.city}
                                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500"
                              />
                              <input
                                type="text"
                                placeholder="State *"
                                value={newAddress.state}
                                onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500"
                              />
                              <input
                                type="text"
                                placeholder="Postal Code *"
                                value={newAddress.postalCode}
                                onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newAddress.isDefault}
                                  onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                                  className="rounded accent-orange-500"
                                />
                                Set as default address
                              </label>

                              <button
                                onClick={handleSaveNewAddress}
                                disabled={addressSaving}
                                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                              >
                                {addressSaving ? 'Saving...' : 'Save Address'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Saved Addresses List */
                          <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar scrollbar-hide pr-1">
                            {addressesLoading ? (
                              <div className="py-8 text-center text-xs text-white/40">Loading addresses...</div>
                            ) : addresses.length === 0 ? (
                              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 text-center text-xs text-white/40">
                                No saved addresses found. Please add a delivery address.
                              </div>
                            ) : (
                              addresses.map((addr) => {
                                const isSelected = String(selectedAddressId || addresses[0]?._id) === String(addr._id);
                                return (
                                  <div
                                    key={addr._id}
                                    onClick={() => setSelectedAddressId(String(addr._id))}
                                    className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-orange-500/10 border-orange-500/60 shadow-lg shadow-orange-500/10'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                          addr.label === 'Home' 
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                            : addr.label === 'Office'
                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        }`}>
                                          {addr.label}
                                        </span>
                                        {addr.isDefault && (
                                          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">DEFAULT</span>
                                        )}
                                      </div>
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                        isSelected ? 'bg-orange-500 border-orange-400 text-white' : 'border-white/20'
                                      }`}>
                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                      </div>
                                    </div>

                                    <p className="font-bold text-white text-sm leading-tight">{addr.recipientName} • <span className="text-white/50 text-xs font-normal">{addr.phone}</span></p>
                                    <p className="text-xs text-white/50 mt-1 leading-relaxed">
                                      {addr.addressLine}, {addr.city}, {addr.state} - {addr.postalCode}
                                    </p>
                                  </div>
                                );
                              })
                            )}

                            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
                              <Truck className="text-blue-400 font-bold shrink-0" size={18} />
                              <p className="text-xs font-bold text-blue-400 leading-snug">Autonomous flying courier delivering across India within 24 hours.</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* STEP 1: DEMO PAYMENT OPTIONS */}
                    {checkoutStep === 1 && (
                      <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div>
                          <h2 className="text-3xl font-black text-white tracking-tighter">Secure Exchange</h2>
                          <p className="text-xs text-white/40">Select your preferred DEMO checkout method</p>
                        </div>

                        {/* Demo Notice Banner */}
                        <div className="flex items-center gap-2 p-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                          <ShieldCheck size={16} className="shrink-0" />
                          <span>DEMO ONLY • Zero Real Charge • No Real Credentials Required</span>
                        </div>

                        {/* Selectable Payment Options */}
                        <div className="space-y-3">
                          {DEMO_PAYMENT_METHODS.map((method) => {
                            const isSelected = selectedPaymentMethod === method.id;
                            return (
                              <div
                                key={method.id}
                                onClick={() => setSelectedPaymentMethod(method.id)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-orange-500/15 border-orange-500/60 shadow-lg shadow-orange-500/10'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <span className="text-2xl shrink-0">{method.icon}</span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-bold text-white truncate">{method.name}</h4>
                                      {method.isDefault && (
                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-white/40 truncate">{method.desc}</p>
                                  </div>
                                </div>

                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ml-3 transition-all ${
                                  isSelected ? 'bg-orange-500 border-orange-400 text-white' : 'border-white/20'
                                }`}>
                                  {isSelected && <Check size={12} strokeWidth={3} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Selected Method Details Card */}
                        <div className="p-5 rounded-3xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Selected Method</span>
                            <p className="text-base font-black text-white">{selectedPayObj.name}</p>
                            <p className="text-xs text-white/50">{selectedPayObj.desc}</p>
                          </div>
                          <span className="text-3xl">{selectedPayObj.icon}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer Buttons */}
                <div className="pt-6">
                  <button 
                    disabled={isSubmitting || (checkoutStep === 0 && showAddAddress)}
                    onClick={() => checkoutStep < 1 ? setCheckoutStep(checkoutStep + 1) : handleCheckout()}
                    className="w-full py-5 bg-white text-black font-black rounded-2xl shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-widest cursor-pointer disabled:opacity-40"
                  >
                    {isSubmitting ? 'Processing Order...' : checkoutStep === 1 ? 'Verify & Dispatch' : 'Continue to Payment'}
                  </button>
                  {checkoutStep > 0 && (
                    <button 
                      disabled={isSubmitting}
                      onClick={() => setCheckoutStep(checkoutStep - 1)} 
                      className="w-full mt-3 text-xs font-bold text-white/30 hover:text-white uppercase tracking-wider cursor-pointer"
                    >
                      ← Back to Delivery Address
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

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, Scissors, Dog, Hotel, Star, MapPin, PhoneCall, AlertCircle, 
  Calendar, ArrowRight, Camera, Truck, ShieldCheck, Zap, X, CheckCircle2,
  ChevronRight, Award, Clock, Package, MessageSquare, Send, ThumbsUp, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';
import { servicesAPI } from '../services/api';

const Services = () => {
  const { user } = useAuth();
  const {
    serviceProviders,
    serviceProvidersLoading,
    fetchServiceProviders,
    serviceBookings,
    serviceBookingsLoading,
    createServiceBooking,
    cancelServiceBooking,
    fetchServiceBookings,
    pets,
    mongoPets,
  } = useEcosystem();

  const userPets = (mongoPets && mongoPets.length > 0) ? mongoPets : (pets && pets.length > 0 ? pets : []);

  const [activeTab, setActiveTab] = useState('veterinary');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [bookingForm, setBookingForm] = useState({ date: '', time: '', petId: '', petName: '' });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Provider Details & Reviews Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsProvider, setDetailsProvider] = useState(null);
  const [providerReviews, setProviderReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(null);

  // Filter providers by active tab category
  const providers = serviceProviders.filter(
    (p) => p.category?.toLowerCase() === activeTab.toLowerCase()
  );

  const currentUserId = (user?._id || user?.id)?.toString();
  const existingUserReview = user
    ? providerReviews.find((r) => {
        const rUserId = (r.user?._id || r.user)?.toString();
        return rUserId === currentUserId;
      })
    : null;

  // Preload existing review data if user has already reviewed this provider
  useEffect(() => {
    if (showDetailsModal && existingUserReview) {
      setReviewRating(existingUserReview.rating || 5);
      setReviewText(existingUserReview.reviewText || '');
    }
  }, [showDetailsModal, existingUserReview?._id]);

  // Load reviews for a specific provider
  const loadProviderReviews = useCallback(async (providerId) => {
    if (!providerId) return;
    setReviewsLoading(true);
    try {
      const res = await servicesAPI.getProviderReviews(providerId);
      setProviderReviews(res.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err.message);
      setProviderReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const tabs = [
    { id: 'veterinary', label: 'Veterinary', icon: <Stethoscope size={18} /> },
    { id: 'grooming', label: 'Grooming', icon: <Scissors size={18} /> },
    { id: 'walking', label: 'Walking', icon: <Dog size={18} /> },
    { id: 'boarding', label: 'Boarding', icon: <Hotel size={18} /> },
    { id: 'training', label: 'Training', icon: <Award size={18} /> },
    { id: 'daycare', label: 'Daycare', icon: <Zap size={18} /> },
    { id: 'emergency', label: 'Emergency', icon: <AlertCircle size={18} /> },
    { id: 'photography', label: 'Photography', icon: <Camera size={18} /> },
    { id: 'transportation', label: 'Transit', icon: <Truck size={18} /> },
  ];

  const DATE_OPTIONS = ['Tomorrow', 'This Weekend', 'Next Monday', 'Next Friday'];
  const TIME_OPTIONS = ['09:00 AM', '11:00 AM', '02:00 PM', '05:00 PM'];

  const openDetailsModal = (provider) => {
    setDetailsProvider(provider);
    setShowDetailsModal(true);
    setReviewText('');
    setReviewRating(5);
    setReviewError(null);
    setReviewSuccess(null);
    loadProviderReviews(provider._id);
  };

  const initiateBooking = (provider) => {
    if (!user) {
      alert('Please sign in to book a service.');
      return;
    }
    setSelectedProvider(provider);
    setBookingStep(2);
    const defaultPet = userPets.length > 0 ? userPets[0] : null;
    setBookingForm({
      date: '',
      time: '',
      petId: defaultPet ? (defaultPet._id || defaultPet.id || '') : '',
      petName: defaultPet ? (defaultPet.name || '') : '',
    });
    setBookingError(null);
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async () => {
    setBookingLoading(true);
    setBookingError(null);
    try {
      const payload = {
        providerId: selectedProvider._id,
        serviceName: selectedProvider.name,
        date: bookingForm.date,
        time: bookingForm.time,
        petName: bookingForm.petName || 'Companion',
        ...(bookingForm.petId ? { petId: bookingForm.petId } : {}),
      };
      const result = await createServiceBooking(payload);
      if (result.success) {
        setShowBookingSuccess(true);
        setTimeout(() => {
          setShowBookingModal(false);
          setShowBookingSuccess(false);
          setSelectedProvider(null);
          setBookingStep(0);
          setBookingForm({ date: '', time: '', petId: '', petName: '' });
        }, 3000);
      } else {
        setBookingError(result.message || 'Failed to create booking.');
      }
    } catch (err) {
      setBookingError(err.message || 'An unexpected error occurred.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Cancel this booking?')) return;
    setCancellingId(bookingId);
    const result = await cancelServiceBooking(bookingId);
    setCancellingId(null);
    if (!result.success) alert(result.message || 'Failed to cancel booking.');
  };

  const handleSubmitReview = async (e) => {
    if (e) e.preventDefault();
    if (!user) {
      alert('Please sign in to submit a review.');
      return;
    }
    if (!detailsProvider?._id || !reviewText.trim()) return;
    setSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);
    try {
      if (existingUserReview) {
        // Update existing review (Phase 8C Small Cleanup)
        const res = await servicesAPI.updateProviderReview(existingUserReview._id, {
          rating: reviewRating,
          reviewText: reviewText.trim(),
        });
        if (res.success) {
          setReviewSuccess('Your review has been updated successfully.');
          await loadProviderReviews(detailsProvider._id);
          await fetchServiceProviders();
        } else {
          setReviewError(res.message || 'Failed to update review.');
        }
      } else {
        // Create new review
        const res = await servicesAPI.createProviderReview(detailsProvider._id, {
          rating: reviewRating,
          reviewText: reviewText.trim(),
        });
        if (res.success) {
          setReviewSuccess('Thank you! Your verified review has been submitted.');
          await loadProviderReviews(detailsProvider._id);
          await fetchServiceProviders();
        } else {
          setReviewError(res.message || 'Failed to submit review.');
        }
      }
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const statusColors = {
    Pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="min-h-screen pt-32 pb-40">
      <div className="container mx-auto px-6">
        
        {/* Header Hero */}
        <header className="mb-20 text-center max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8"
          >
            <ShieldCheck size={14} className="fill-current" />
            <span>Verified Professionals • 100% Secure Reservations</span>
          </motion.div>
          <h1 className="text-7xl font-black tracking-tighter text-white leading-tight mb-8">
            Global <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 font-black">Care Network</span>
          </h1>
          <p className="text-xl text-white/40 leading-relaxed font-medium">
            Seamlessly coordinate top-tier veterinary, grooming, and specialized support 
            for your elite pet companions through our autonomous grid.
          </p>
          {/* Booking History Button */}
          {user && (
            <button
              onClick={() => setShowHistory(true)}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              <Package size={16} /> My Bookings ({serviceBookings.length})
            </button>
          )}
        </header>

        {/* Global Service Navigation */}
        <div className="flex justify-start lg:justify-center gap-3 mb-24 overflow-x-auto pb-6 scrollbar-hide no-scrollbar border-b border-white/5">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-8 py-5 rounded-2xl font-black transition-all border whitespace-nowrap uppercase text-[10px] tracking-widest cursor-pointer ${
                activeTab === tab.id ? 'bg-white text-black border-white shadow-2xl scale-105' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
              }`}
            >
              <div className={activeTab === tab.id ? 'text-blue-500' : 'text-inherit'}>{tab.icon}</div>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Providers Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {serviceProvidersLoading ? (
            <div className="col-span-3 py-20 text-center text-white/30 text-sm font-bold uppercase tracking-widest animate-pulse">
              Loading providers...
            </div>
          ) : providers.length === 0 ? (
            <div className="col-span-3 py-20 text-center opacity-30">
              <Stethoscope size={48} className="mx-auto mb-4 text-white" />
              <p className="text-white font-bold">No providers in this category yet.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {providers.map((provider) => (
                <motion.div 
                  layout key={provider._id || provider.demoId}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="glass-dark rounded-[3.5rem] p-4 border border-white/10 group overflow-hidden relative"
                >
                   <div className="bg-white/2 rounded-[3rem] p-10 flex flex-col items-center text-center relative overflow-hidden group-hover:bg-white/5 transition-all">
                      {/* Provider Image: S3 presigned image if available, otherwise emoji fallback */}
                      <div className="w-24 h-24 rounded-3xl bg-blue-500/10 flex items-center justify-center text-6xl mb-6 shadow-2xl group-hover:scale-105 transition-transform overflow-hidden relative border border-white/10">
                        {provider.imageUrl ? (
                          <img
                            src={provider.imageUrl}
                            alt={provider.name}
                            className="w-full h-full object-cover rounded-3xl"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.emoji-fallback');
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <span className={`emoji-fallback items-center justify-center w-full h-full ${provider.imageUrl ? 'hidden' : 'flex'}`}>
                          {provider.image || '🏥'}
                        </span>
                      </div>

                      {/* Category and Experience Badges */}
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                          {provider.category}
                        </span>
                        {provider.exp && (
                          <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-widest border border-white/5">
                            {provider.exp}
                          </span>
                        )}
                      </div>

                      {/* Rating & Verified Reviews Count */}
                      <button
                        type="button"
                        onClick={() => openDetailsModal(provider)}
                        className="flex items-center gap-1.5 mb-2 hover:opacity-80 transition-opacity cursor-pointer"
                        title="Click to view reviews and provider details"
                      >
                         <span className="text-yellow-400 font-black text-sm uppercase tracking-widest flex items-center gap-1">
                           <Star size={14} fill="currentColor" /> {(provider.rating || 5).toFixed(1)}
                         </span>
                         <span className="text-white/40 hover:text-blue-400 font-bold text-[10px] uppercase tracking-widest ml-2 underline decoration-dotted">
                           ({provider.reviewsCount || 0} Verified Reviews)
                         </span>
                      </button>

                      {/* Provider Name */}
                      <h3 className="text-2xl font-black text-white tracking-tighter mb-3 uppercase leading-none">{provider.name}</h3>
                      
                      {/* Description / Bio */}
                      <p className="text-sm font-medium text-white/40 leading-relaxed mb-6 px-4 italic line-clamp-2">
                        "{provider.description || provider.bio}"
                      </p>

                      {/* Useful Provider Metadata: Hours & Location */}
                      <div className="w-full flex items-center justify-center gap-3 text-[11px] font-bold text-white/40 mb-6 border-t border-white/5 pt-4">
                        <span className="flex items-center gap-1 text-blue-400/80">
                          <Clock size={12} /> Standard Slots
                        </span>
                        <span className="text-white/20">•</span>
                        <span className="flex items-center gap-1 text-emerald-400/80">
                          <MapPin size={12} /> On-Demand
                        </span>
                      </div>
                      
                      {/* Base Rate and Action Buttons */}
                      <div className="w-full pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                         <div className="text-left">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Base Rate</p>
                            <p className="text-2xl font-black text-white tracking-tighter">${provider.price}<span className="text-xs font-medium text-white/20">/hr</span></p>
                         </div>
                         <div className="flex items-center gap-2">
                           <button
                             type="button"
                             onClick={() => openDetailsModal(provider)}
                             className="px-4 py-3.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold rounded-2xl border border-white/10 transition-all text-xs cursor-pointer"
                           >
                             Reviews
                           </button>
                           <button 
                             type="button"
                             onClick={() => initiateBooking(provider)}
                             className="px-6 py-3.5 bg-white text-black font-black rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-1.5 group/btn text-xs uppercase tracking-wider cursor-pointer"
                           >
                             Book <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                           </button>
                         </div>
                      </div>
                   </div>
                   {/* Decorative background pulse */}
                   <div className="absolute inset-0 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Emergency Banner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="glass-dark rounded-[4rem] p-12 lg:p-24 border border-blue-500/20 bg-gradient-to-tr from-black via-blue-950/10 to-black relative overflow-hidden group mt-24"
        >
          <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[120px] rounded-full -z-10" />
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10">
             <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-3 text-blue-500 font-black text-xs tracking-[0.3em] uppercase mb-8 animate-pulse">
                   <PhoneCall size={24} />
                   <span>Global Dispatch Relay</span>
                </div>
                <h2 className="text-6xl font-black text-white tracking-tighter mb-8 leading-tight">Instant Veterinary <br />Deployment Hub</h2>
                <p className="text-lg text-white/40 leading-relaxed max-w-xl font-medium">
                   Initiate immediate biometric stabilization for critical events. 
                   Dispatching elite specialists in under 60 seconds.
                </p>
             </div>
             <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
                <button className="px-12 py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2rem] transition-all shadow-3xl shadow-blue-600/40 flex items-center justify-center gap-4 text-sm uppercase tracking-widest cursor-pointer">
                   <Zap size={20} fill="currentColor" /> Direct Dispatch
                </button>
                <button className="px-12 py-6 glass border-blue-500/20 hover:bg-blue-500/10 text-white font-black rounded-[2rem] transition-all uppercase tracking-widest text-sm cursor-pointer">
                   Locate Unit
                </button>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Booking Flow Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md font-sans">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="w-full max-w-4xl glass-dark rounded-[4rem] border border-white/10 shadow-5xl overflow-hidden relative flex flex-col lg:flex-row min-h-[640px] max-h-[90vh]"
            >
              {/* Success Overlay */}
              <AnimatePresence>
                {showBookingSuccess && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center text-center p-12"
                  >
                    <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-[2.5rem] flex items-center justify-center mb-8 border border-green-500/30 shadow-2xl">
                       <CheckCircle2 size={64} />
                    </div>
                    <h2 className="text-6xl font-black text-white mb-4 tracking-tighter">Mission Confirmed</h2>
                    <p className="text-xl text-white/40 max-w-md">Your care session has been synchronized with the unit's local schedule.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sidebar: Provider Info with S3 presigned image support */}
              <div className="lg:w-1/3 bg-white/5 p-10 border-r border-white/5 flex flex-col items-center text-center justify-between">
                 <div className="flex flex-col items-center w-full">
                   <div className="w-24 h-24 rounded-3xl bg-blue-500/10 flex items-center justify-center text-6xl mb-6 border border-blue-500/20 overflow-hidden relative">
                     {selectedProvider?.imageUrl ? (
                       <img
                         src={selectedProvider.imageUrl}
                         alt={selectedProvider.name}
                         className="w-full h-full object-cover rounded-3xl"
                         onError={(e) => {
                           e.currentTarget.style.display = 'none';
                           const fallback = e.currentTarget.parentElement?.querySelector('.emoji-fallback');
                           if (fallback) fallback.classList.remove('hidden');
                         }}
                       />
                     ) : null}
                     <span className={`emoji-fallback items-center justify-center w-full h-full ${selectedProvider?.imageUrl ? 'hidden' : 'flex'}`}>
                       {selectedProvider?.image || '🏥'}
                     </span>
                   </div>
                   <h3 className="text-2xl font-black text-white tracking-tighter mb-1 uppercase leading-tight">{selectedProvider?.name}</h3>
                   <p className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-6">{selectedProvider?.category || activeTab}</p>
                 </div>

                 <div className="space-y-3 w-full mt-auto">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                       <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Rate</span>
                       <span className="text-lg font-black text-white">${selectedProvider?.price}<span className="text-xs text-white/30">/hr</span></span>
                    </div>
                    {selectedProvider?.exp && (
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Experience</span>
                        <span className="text-xs font-bold text-white/70">{selectedProvider.exp}</span>
                      </div>
                    )}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Rating</span>
                      <span className="text-xs font-black text-yellow-400 flex items-center gap-1">
                        <Star size={12} fill="currentColor" /> {(selectedProvider?.rating || 5).toFixed(1)}
                      </span>
                    </div>
                 </div>
              </div>

              {/* Booking Steps */}
              <div className="flex-1 p-10 lg:p-14 relative flex flex-col justify-between overflow-y-auto">
                 <button onClick={() => setShowBookingModal(false)} className="absolute top-8 right-8 p-3 glass text-white/20 hover:text-white rounded-xl transition-all cursor-pointer"><X size={24} /></button>
                 
                 <div>
                    <div className="mb-10 flex gap-4">
                       {[0, 1, 2].map(s => (
                          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= bookingStep - 2 ? 'bg-blue-500 shadow-lg shadow-blue-500/40' : 'bg-white/10'}`} />
                       ))}
                    </div>

                    <div className="min-h-[300px]">
                       <AnimatePresence mode="wait">
                          {bookingStep === 2 && (
                             <motion.div key="date" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                {/* Companion / Pet Selection (Requirement 3) */}
                                {userPets.length > 0 && (
                                  <div className="mb-8 p-5 rounded-3xl bg-white/5 border border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Select Companion</span>
                                      <span className="text-[10px] font-bold text-blue-400">
                                        {bookingForm.petName ? `Assigned: ${bookingForm.petName}` : 'General Booking'}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {userPets.map((p) => {
                                        const pId = p._id || p.id;
                                        const isSelected = bookingForm.petId === pId || (!bookingForm.petId && bookingForm.petName === p.name);
                                        return (
                                          <button
                                            key={pId || p.name}
                                            type="button"
                                            onClick={() => setBookingForm({ ...bookingForm, petId: pId, petName: p.name })}
                                            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                              isSelected
                                                ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/25'
                                                : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white'
                                            }`}
                                          >
                                            <span>{p.species?.toLowerCase() === 'cat' ? '🐱' : p.species?.toLowerCase() === 'rabbit' ? '🐰' : '🐶'}</span>
                                            <span>{p.name}</span>
                                          </button>
                                        );
                                      })}
                                      <button
                                        type="button"
                                        onClick={() => setBookingForm({ ...bookingForm, petId: '', petName: '' })}
                                        className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                                          !bookingForm.petId && !bookingForm.petName
                                            ? 'bg-white/20 text-white border-white/30'
                                            : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10'
                                        }`}
                                      >
                                        General / None
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <h2 className="text-3xl font-black text-white mb-6 tracking-tighter">Preferred Date</h2>
                                <div className="grid grid-cols-2 gap-4">
                                   {DATE_OPTIONS.map(d => (
                                      <button 
                                        key={d} onClick={() => setBookingForm({...bookingForm, date: d})}
                                        className={`p-5 rounded-[1.5rem] border font-bold text-xs transition-all uppercase tracking-widest cursor-pointer ${
                                          bookingForm.date === d ? 'bg-white text-black border-white shadow-lg' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                                        }`}
                                      >
                                        {d}
                                      </button>
                                   ))}
                                </div>
                             </motion.div>
                          )}

                          {bookingStep === 3 && (
                             <motion.div key="time" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <h2 className="text-3xl font-black text-white mb-6 tracking-tighter">Time Slot</h2>
                                <div className="grid grid-cols-2 gap-4">
                                   {TIME_OPTIONS.map(t => (
                                      <button 
                                        key={t} onClick={() => setBookingForm({...bookingForm, time: t})}
                                        className={`p-5 rounded-[1.5rem] border font-bold text-xs transition-all uppercase tracking-widest cursor-pointer ${
                                          bookingForm.time === t ? 'bg-white text-black border-white shadow-lg' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                                        }`}
                                      >
                                        {t}
                                      </button>
                                   ))}
                                </div>
                             </motion.div>
                          )}

                          {bookingStep === 4 && (
                             <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <h2 className="text-3xl font-black text-white mb-6 tracking-tighter leading-none">Session Confirmation</h2>
                                <div className="glass-dark p-6 rounded-[2rem] border border-white/10 space-y-5">
                                   <div className="flex items-center gap-4">
                                      <Clock className="text-blue-400" size={20} />
                                      <div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Schedule</p>
                                        <p className="font-bold text-white uppercase tracking-widest text-xs">{bookingForm.date} @ {bookingForm.time}</p>
                                      </div>
                                   </div>
                                   {/* Companion Display (Requirement 3) */}
                                   <div className="flex items-center gap-4">
                                      <Dog className="text-blue-400" size={20} />
                                      <div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Companion</p>
                                        <p className="text-xs font-bold text-white leading-none">{bookingForm.petName || 'Companion (General)'}</p>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-4">
                                      <MapPin className="text-blue-400" size={20} />
                                      <div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Service Mode</p>
                                        <p className="text-xs font-bold text-white/60 leading-none">Home-Based Service Dispatch</p>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-4">
                                      <Star className="text-yellow-400" size={20} />
                                      <div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Provider Rating</p>
                                        <p className="text-xs font-bold text-white/80">{(selectedProvider?.rating || 5).toFixed(1)} ★ ({selectedProvider?.reviewsCount || 0} reviews)</p>
                                      </div>
                                   </div>
                                </div>
                                {bookingError && (
                                  <p className="mt-4 text-red-400 text-xs font-bold">{bookingError}</p>
                                )}
                             </motion.div>
                          )}
                       </AnimatePresence>
                    </div>
                 </div>

                 <div className="flex flex-col gap-3 mt-8 pb-4">
                    <button 
                      onClick={() => bookingStep < 4 ? setBookingStep(bookingStep + 1) : handleBookingSubmit()}
                      disabled={
                        bookingLoading ||
                        (bookingStep === 2 && !bookingForm.date) ||
                        (bookingStep === 3 && !bookingForm.time)
                      }
                      className="w-full py-5 bg-blue-500 text-white font-black rounded-3xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-20 uppercase tracking-[0.2em] text-xs cursor-pointer"
                    >
                      {bookingLoading ? 'Confirming…' : bookingStep === 4 ? 'Confirm Reservation' : 'Continue'}
                    </button>
                    {bookingStep > 2 && <button onClick={() => setBookingStep(bookingStep - 1)} className="text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest cursor-pointer py-1">Back</button>}
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Provider Details & Reviews Modal (Requirements 2 & 4) */}
      <AnimatePresence>
        {showDetailsModal && detailsProvider && (
          <div className="fixed inset-0 z-[3200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-3xl glass-dark rounded-[3.5rem] border border-white/10 shadow-5xl overflow-hidden relative max-h-[88vh] flex flex-col p-8 sm:p-12"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 mb-2 inline-block">
                    {detailsProvider.category}
                  </span>
                  <h2 className="text-3xl font-black text-white tracking-tight">{detailsProvider.name}</h2>
                </div>
                <button 
                  onClick={() => setShowDetailsModal(false)} 
                  className="p-3 glass text-white/40 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {/* Provider Card Summary */}
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center text-5xl border border-blue-500/20 overflow-hidden shrink-0">
                    {detailsProvider.imageUrl ? (
                      <img
                        src={detailsProvider.imageUrl}
                        alt={detailsProvider.name}
                        className="w-full h-full object-cover rounded-2xl"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.emoji-fallback');
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={`emoji-fallback items-center justify-center w-full h-full ${detailsProvider.imageUrl ? 'hidden' : 'flex'}`}>
                      {detailsProvider.image || '🏥'}
                    </span>
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <span className="text-yellow-400 font-black text-sm flex items-center gap-1">
                        <Star size={14} fill="currentColor" /> {(detailsProvider.rating || 5).toFixed(1)}
                      </span>
                      <span className="text-white/30 text-xs font-bold">
                        ({detailsProvider.reviewsCount || 0} Verified Reviews)
                      </span>
                      {detailsProvider.exp && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-bold">
                          {detailsProvider.exp}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed italic">
                      "{detailsProvider.description || detailsProvider.bio}"
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs font-bold text-white/50">
                      <span className="text-blue-400 font-black text-sm">
                        ${detailsProvider.price}<span className="text-xs text-white/30">/hr</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-blue-400" /> Mon–Fri Standard Hours
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-emerald-400" /> Available for Dispatch
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Submission Form (Requirement 4) */}
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <MessageSquare size={18} className="text-blue-400" />
                      {existingUserReview ? 'Update Your Review' : 'Leave a Review'}
                    </h3>
                    {existingUserReview && (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Editing Existing Review
                      </span>
                    )}
                  </div>
                  {user ? (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                          Rating
                        </label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="p-1 text-white/20 hover:text-yellow-400 transition-colors cursor-pointer"
                            >
                              <Star
                                size={22}
                                className={star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-xs font-bold text-yellow-400">
                            {reviewRating} of 5 Stars
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                          Feedback & Review
                        </label>
                        <textarea
                          rows={3}
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (!submittingReview && reviewText.trim()) {
                                handleSubmitReview(e);
                              }
                            }
                          }}
                          placeholder="Share details of your experience with this service provider..."
                          className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-all resize-none"
                        />
                      </div>

                      {reviewError && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                          {reviewError}
                        </div>
                      )}

                      {reviewSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                          {reviewSuccess}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingReview || !reviewText.trim()}
                          className="px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer"
                        >
                          <Send size={14} />
                          {submittingReview
                            ? (existingUserReview ? 'Updating…' : 'Submitting…')
                            : (existingUserReview ? 'UPDATE REVIEW' : 'SUBMIT REVIEW')}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-xs text-white/40 italic">
                      Please sign in to submit a review for this service provider.
                    </p>
                  )}
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    Verified Reviews ({providerReviews.length})
                  </h3>

                  {reviewsLoading ? (
                    <div className="py-8 text-center text-white/30 text-xs font-bold uppercase tracking-widest animate-pulse">
                      Loading reviews...
                    </div>
                  ) : providerReviews.length === 0 ? (
                    <div className="py-8 text-center text-white/30 text-xs italic">
                      No written reviews yet for this provider. Be the first to leave one!
                    </div>
                  ) : (
                    providerReviews.map((r) => (
                      <div key={r._id} className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs">
                              {r.user?.fullName ? r.user.fullName[0].toUpperCase() : 'U'}
                            </div>
                            <span className="font-bold text-white text-xs">
                              {r.user?.fullName || 'Verified Client'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/10'}
                              />
                            ))}
                            <span className="text-[10px] text-white/40 ml-2">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed">
                          {r.reviewText}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Modal Bottom Book Action */}
              <div className="pt-6 border-t border-white/5 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-3 rounded-2xl bg-white/5 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    initiateBooking(detailsProvider);
                  }}
                  className="px-8 py-3 rounded-2xl bg-white hover:bg-blue-500 hover:text-white text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl cursor-pointer"
                >
                  Book With {detailsProvider.name} <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking History Modal */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[3100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-2xl glass-dark rounded-[3.5rem] border border-white/10 shadow-5xl overflow-hidden relative max-h-[85vh] flex flex-col p-8 sm:p-12"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">My Bookings</h2>
                  <p className="text-xs text-white/40">Verified MongoDB service records</p>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-3 glass text-white/40 hover:text-white rounded-xl transition-all cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {serviceBookingsLoading ? (
                  <div className="py-12 text-center text-white/30 text-sm font-bold uppercase tracking-widest animate-pulse">Loading bookings...</div>
                ) : serviceBookings.length === 0 ? (
                  <div className="py-12 text-center opacity-30">
                    <Package size={48} className="mx-auto mb-4 text-white" />
                    <p className="text-white font-bold">No bookings yet.</p>
                  </div>
                ) : (
                  serviceBookings.map((b) => (
                    <div key={b._id} className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h4 className="font-bold text-white text-sm">{b.serviceName || b.providerName}</h4>
                          <p className="text-white/40 text-xs mt-1">
                            {b.providerName} • {b.date} @ {b.time}
                            {b.petName && <span className="text-blue-400 font-medium"> • Pet: {b.petName}</span>}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColors[b.status] || statusColors.Pending}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <span className="text-blue-400 font-black">${b.price}/hr</span>
                        {(b.status === 'Pending' || b.status === 'Confirmed') && (
                          <button
                            disabled={cancellingId === b._id}
                            onClick={() => handleCancelBooking(b._id)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold uppercase tracking-wider hover:bg-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {cancellingId === b._id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Services;

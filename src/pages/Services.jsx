import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, Scissors, Dog, Hotel, Star, MapPin, PhoneCall, AlertCircle, 
  Calendar, ArrowRight, Camera, Truck, ShieldCheck, Zap, X, CheckCircle2,
  ChevronRight, Award, Clock
} from 'lucide-react';
import { SERVICES_CATALOG } from '../data/services';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';

const Services = () => {
  const { user } = useAuth();
  const { addBooking } = useEcosystem();
  const [activeTab, setActiveTab] = useState('veterinary');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [bookingForm, setBookingForm] = useState({ date: '', time: '' });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);

  const initiateBooking = (provider) => {
    setSelectedProvider(provider);
    setBookingStep(2); // Step 1 is Service (done via tab), Step 2 is Provider (selection)
    setShowBookingModal(true);
  };

  const handleBookingSubmit = () => {
    const newBooking = {
      id: `BK-${Date.now()}`,
      service: activeTab,
      provider: selectedProvider.name,
      image: selectedProvider.image, // pass provider image for better UI
      ...bookingForm,
      price: selectedProvider.price,
      status: 'Confirmed'
    };
    addBooking(newBooking);
    setShowBookingSuccess(true);
    setTimeout(() => {
      setShowBookingModal(false);
      setShowBookingSuccess(false);
      setSelectedProvider(null);
      setBookingStep(0);
      setBookingForm({ date: '', time: '' });
    }, 3000);
  };

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

  const providers = SERVICES_CATALOG[activeTab] || [];

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
        </header>

        {/* Global Service Navigation */}
        <div className="flex justify-start lg:justify-center gap-3 mb-24 overflow-x-auto pb-6 scrollbar-hide no-scrollbar border-b border-white/5">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-8 py-5 rounded-2xl font-black transition-all border whitespace-nowrap uppercase text-[10px] tracking-widest ${
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
          <AnimatePresence mode="wait">
            {providers.map((provider) => (
              <motion.div 
                layout key={provider.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                className="glass-dark rounded-[3.5rem] p-4 border border-white/10 group overflow-hidden relative"
              >
                 <div className="bg-white/2 rounded-[3rem] p-10 flex flex-col items-center text-center relative overflow-hidden group-hover:bg-white/5 transition-all">
                    <div className="w-24 h-24 rounded-3xl bg-blue-500/10 flex items-center justify-center text-6xl mb-6 shadow-2xl group-hover:scale-110 transition-transform">{provider.image}</div>
                    <div className="flex items-center gap-1.5 mb-2">
                       <span className="text-yellow-400 font-black text-sm uppercase tracking-widest flex items-center gap-1"><Star size={14} fill="currentColor" /> {provider.rating}</span>
                       <span className="text-white/20 font-bold text-[10px] uppercase tracking-widest ml-2">({provider.reviews} Verified)</span>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tighter mb-4 uppercase tracking-tighter leading-none">{provider.name}</h3>
                    <p className="text-sm font-medium text-white/40 leading-relaxed mb-8 px-4 italic">"{provider.bio}"</p>
                    
                    <div className="w-full pt-8 border-t border-white/5 flex items-center justify-between">
                       <div className="text-left">
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Base Rate</p>
                          <p className="text-2xl font-black text-white tracking-tighter">${provider.price}<span className="text-xs font-medium text-white/20">/hr</span></p>
                       </div>
                       <button 
                         onClick={() => initiateBooking(provider)}
                         className="px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-2 group/btn"
                       >
                         Book <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                       </button>
                    </div>
                 </div>
                 {/* Decorative background pulse */}
                 <div className="absolute inset-0 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Emergency Banner */}
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
             className="glass-dark rounded-[4rem] p-12 lg:p-24 border border-blue-500/20 bg-gradient-to-tr from-black via-blue-950/10 to-black relative overflow-hidden group"
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
                    <button className="px-12 py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2rem] transition-all shadow-3xl shadow-blue-600/40 flex items-center justify-center gap-4 text-sm uppercase tracking-widest">
                       <Zap size={20} fill="currentColor" /> Direct Dispatch
                    </button>
                    <button className="px-12 py-6 glass border-blue-500/20 hover:bg-blue-500/10 text-white font-black rounded-[2rem] transition-all uppercase tracking-widest text-sm">
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
              className="w-full max-w-4xl glass-dark rounded-[4rem] border border-white/10 shadow-5xl overflow-hidden relative flex flex-col lg:flex-row h-[700px]"
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

              {/* Sidebar: Provider Info */}
              <div className="lg:w-1/3 bg-white/5 p-12 border-r border-white/5 flex flex-col items-center text-center">
                 <div className="w-24 h-24 rounded-3xl bg-blue-500/10 flex items-center justify-center text-6xl mb-8 border border-blue-500/20">{selectedProvider?.image}</div>
                 <h3 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase tracking-tighter leading-tight">{selectedProvider?.name}</h3>
                 <p className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-8">{activeTab}</p>
                 <div className="space-y-4 w-full mt-auto">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex justify-between items-center">
                       <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Rate</span>
                       <span className="text-xl font-black text-white">${selectedProvider?.price}</span>
                    </div>
                 </div>
              </div>

              {/* Booking Steps */}
              <div className="flex-1 p-12 lg:p-20 relative flex flex-col justify-between">
                 <button onClick={() => setShowBookingModal(false)} className="absolute top-8 right-8 p-3 glass text-white/20 hover:text-white rounded-xl transition-all"><X size={24} /></button>
                 
                 <div>
                    <div className="mb-16 flex gap-4">
                       {[0, 1, 2].map(s => (
                          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= bookingStep - 2 ? 'bg-blue-500 shadow-lg shadow-blue-500/40' : 'bg-white/10'}`} />
                       ))}
                    </div>

                    <div className="min-h-[300px]">
                       <AnimatePresence mode="wait">
                          {bookingStep === 2 && (
                             <motion.div key="date" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <h2 className="text-4xl font-black text-white mb-10 tracking-tighter">Preferred Date</h2>
                                <div className="grid grid-cols-2 gap-4">
                                   {['Tomorrow', 'This Weekend', 'Next Monday', 'July 15th'].map(d => (
                                      <button 
                                        key={d} onClick={() => setBookingForm({...bookingForm, date: d})}
                                        className={`p-6 rounded-[1.5rem] border font-bold text-sm transition-all uppercase tracking-widest ${
                                          bookingForm.date === d ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/5'
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
                                <h2 className="text-4xl font-black text-white mb-10 tracking-tighter">Time Slot</h2>
                                <div className="grid grid-cols-2 gap-4">
                                   {['09:00 AM', '11:00 AM', '02:00 PM', '05:00 PM'].map(t => (
                                      <button 
                                        key={t} onClick={() => setBookingForm({...bookingForm, time: t})}
                                        className={`p-6 rounded-[1.5rem] border font-bold text-sm transition-all uppercase tracking-widest ${
                                          bookingForm.time === t ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/5'
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
                                <h2 className="text-4xl font-black text-white mb-10 tracking-tighter leading-none">Verifying Neural Session</h2>
                                <div className="glass-dark p-8 rounded-[2rem] border border-white/10 space-y-6">
                                   <div className="flex items-center gap-4">
                                      <Clock className="text-blue-400" />
                                      <p className="font-bold text-white uppercase tracking-widest text-sm">{bookingForm.date} @ {bookingForm.time}</p>
                                   </div>
                                   <div className="flex items-center gap-4">
                                      <MapPin className="text-blue-400" />
                                      <p className="text-sm font-bold text-white/40 leading-none">Home-Based Service Call</p>
                                   </div>
                                </div>
                             </motion.div>
                          )}
                       </AnimatePresence>
                    </div>
                 </div>

                 <div className="flex flex-col gap-4 mt-12 pb-10">
                    <button 
                      onClick={() => bookingStep < 4 ? setBookingStep(bookingStep + 1) : handleBookingSubmit()}
                      disabled={(bookingStep === 2 && !bookingForm.date) || (bookingStep === 3 && !bookingForm.time)}
                      className="w-full py-6 bg-blue-500 text-white font-black rounded-3xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-20 uppercase tracking-[0.2em] text-sm"
                    >
                      {bookingStep === 4 ? 'Confirm Reservation' : 'Sync Next Phase'}
                    </button>
                    {bookingStep > 2 && <button onClick={() => setBookingStep(bookingStep - 1)} className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest">Back</button>}
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Services;

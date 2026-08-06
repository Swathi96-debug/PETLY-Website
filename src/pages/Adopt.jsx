import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, MapPin, Heart, MessageSquare, Phone, Info, X, Calendar, Clock, CheckCircle, Sparkles, Map, ArrowRight } from 'lucide-react';
import { PETS_DATA } from '../data/pets';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';

const Adopt = () => {
  const { user } = useAuth();
  const { 
    wishlistPets: wishlist, 
    toggleWishlistPet: toggleWishlist, 
    addAdoptionRequest 
  } = useEcosystem();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedPet, setSelectedPet] = useState(null);
  const [adoptionStep, setAdoptionStep] = useState(0);
  const [adoptionForm, setAdoptionForm] = useState({ address: '', date: '', time: '' });
  const [showSuccess, setShowSuccess] = useState(false);

  const filteredPets = PETS_DATA.filter(pet => {
    const matchesFilter = filter === 'all' || pet.type === filter;
    const matchesSearch = pet.name.toLowerCase().includes(search.toLowerCase()) || 
                          pet.breed.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAdoptSubmit = () => {
    const newAdoption = {
      ...selectedPet,
      ...adoptionForm,
      userId: user?.id || 'guest',
      id: Date.now(),
      status: 'Pending Review'
    };
    addAdoptionRequest(newAdoption);
    setShowSuccess(true);
    setTimeout(() => {
      setSelectedPet(null);
      setAdoptionStep(0);
      setShowSuccess(false);
      setAdoptionForm({ address: '', date: '', time: '' });
    }, 3000);
  };

  const petTypeIcons = { all: '🐾', dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇', exotic: '🦎' };

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-6">
        {/* Header */}
        <header className="mb-20 text-center max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest mb-8"
          >
            <Sparkles size={14} className="text-orange-500" />
            <span>Over 5,000 Lives Transformed This Year</span>
          </motion.div>
          <h1 className="text-7xl font-black tracking-tighter text-white mb-8">
            Neural <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500">Adoption</span> Marketplace
          </h1>
          <p className="text-xl text-white/40 leading-relaxed font-medium">
            Discover your perfect biological match through our advanced sanctuary interface. 
            Vetted, healthy, and ready for their forever narrative.
          </p>
        </header>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-6 mb-16 items-center border-b border-white/5 pb-12">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors" size={24} />
            <input 
              type="text" 
              placeholder="Search by name, breed, or personality..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-lg font-medium text-white outline-none focus:border-orange-500/50 transition-all focus:bg-white/10"
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide no-scrollbar w-full md:w-auto">
            {Object.keys(petTypeIcons).map(type => (
              <button 
                key={type}
                onClick={() => setFilter(type)}
                className={`px-8 py-5 rounded-2xl font-black capitalize transition-all whitespace-nowrap flex items-center gap-3 border ${
                  filter === type ? 'bg-orange-500 text-white border-orange-400 shadow-2xl shadow-orange-500/30' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-xl">{petTypeIcons[type]}</span>
                <span className="text-sm tracking-widest uppercase">{type === 'all' ? 'All Pets' : type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pet Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {filteredPets.map((pet) => (
            <motion.div 
              layout
              key={pet.id}
              whileHover={{ y: -20, scale: 1.02 }}
              className="glass-dark rounded-[3rem] p-4 border border-white/10 overflow-hidden relative group h-[600px] flex flex-col"
            >
              {/* Image Section */}
              <div className="bg-white/5 rounded-[2.5rem] h-64 flex items-center justify-center relative overflow-hidden group-hover:bg-white/10 transition-colors">
                <span className="text-8xl group-hover:scale-125 transition-transform duration-700 animate-float">{pet.image}</span>
                <button 
                  onClick={() => toggleWishlist(pet.id)}
                  className={`absolute top-6 right-6 p-4 rounded-2xl backdrop-blur-xl border border-white/10 transition-all active:scale-90 ${
                    wishlist.includes(pet.id) ? 'bg-orange-500 text-white' : 'bg-black/40 text-white/40 hover:text-white'
                  }`}
                >
                  <Heart size={20} fill={wishlist.includes(pet.id) ? "currentColor" : "none"} />
                </button>
              </div>
              
              {/* Info Section */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter mb-1">{pet.name}</h3>
                    <p className="text-orange-500 font-bold uppercase tracking-widest text-[10px]">{pet.breed}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-white/60">{pet.age}</span>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{pet.gender}</span>
                  </div>
                </div>

                {/* Middle Location Bar */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-8 flex items-center gap-4 group-hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Shelter Station</p>
                    <p className="text-sm font-bold text-white truncate">{pet.shelter}</p>
                  </div>
                </div>
                
                {/* Actions Grid */}
                <div className="mt-auto grid grid-cols-2 gap-3 pb-2 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                  <button className="p-4 glass rounded-2xl text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <MessageSquare size={18} />
                  </button>
                  <button className="p-4 glass rounded-2xl text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <Phone size={18} />
                  </button>
                  <button 
                    onClick={() => setSelectedPet(pet)}
                    className="col-span-2 py-5 bg-white text-black font-black rounded-2xl hover:bg-orange-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    Adopt Now <ArrowRight size={18} />
                  </button>
                </div>
              </div>

              {/* Background Glow Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent -z-10 group-hover:from-orange-500/10 transition-all" />
            </motion.div>
          ))}
        </div>

        {/* Adoption Flow Modal */}
        <AnimatePresence>
          {selectedPet && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 50 }}
                className="w-full max-w-4xl glass-dark rounded-[4rem] border border-white/10 shadow-5xl overflow-hidden relative"
              >
                {/* Success Overlay */}
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center text-center p-12"
                    >
                      <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-[2rem] flex items-center justify-center mb-8">
                        <CheckCircle size={64} />
                      </div>
                      <h2 className="text-6xl font-black text-white mb-4 tracking-tighter">Application Received</h2>
                      <p className="text-xl text-white/40 max-w-md">Our neural review board has received your request. We will contact you at 200 ms latency.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col lg:flex-row h-full">
                  {/* Left Side: Pet Preview */}
                  <div className="lg:w-2/5 p-12 bg-white/5 border-r border-white/5 flex flex-col items-center justify-center text-center">
                    <div className="text-9xl mb-8 animate-float">{selectedPet.image}</div>
                    <h3 className="text-5xl font-black text-white mb-2 tracking-tighter">{selectedPet.name}</h3>
                    <p className="text-orange-500 font-bold uppercase tracking-widest mb-12">{selectedPet.breed}</p>
                    
                    <div className="space-y-4 w-full">
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-left">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Adoption Story</p>
                        <p className="text-sm text-white/60 italic leading-relaxed">"{selectedPet.story}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Step Flow */}
                  <div className="flex-1 p-12 lg:p-20 relative">
                    <button 
                      onClick={() => setSelectedPet(null)}
                      className="absolute top-8 right-8 p-3 glass text-white/20 hover:text-white rounded-2xl transition-all"
                    >
                      <X size={24} />
                    </button>

                    <div className="mb-16">
                      <div className="flex items-center gap-4 mb-4">
                        {[0, 1, 2, 3].map((s) => (
                          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= adoptionStep ? 'bg-orange-500' : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Step {adoptionStep + 1} of 4</p>
                    </div>

                    {/* Steps Content */}
                    <div className="min-h-[400px]">
                      <AnimatePresence mode="wait">
                        {adoptionStep === 0 && (
                          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h2 className="text-4xl font-black text-white mb-8 tracking-tighter leading-tight">Confirm Pet Selection</h2>
                            <div className="space-y-4">
                              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between">
                                <span className="text-white/40 font-medium">Application Fee</span>
                                <span className="text-xl font-black text-white">$150.00</span>
                              </div>
                              <div className="p-6 rounded-3xl bg-orange-500/5 border border-orange-500/20 flex items-center gap-4">
                                <Info className="text-orange-500" />
                                <p className="text-sm text-orange-400 font-bold leading-snug">Includes microchipping, first-year insurance, and PETLY Welcome Kit.</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {adoptionStep === 1 && (
                          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <h2 className="text-4xl font-black text-white mb-8 tracking-tighter leading-tight">Your Primary Address</h2>
                            <textarea 
                              placeholder="Complete address for on-site verification..."
                              className="w-full h-40 bg-white/5 border border-white/10 rounded-[2rem] p-8 text-white font-medium outline-none focus:border-orange-500/50 transition-all"
                              value={adoptionForm.address}
                              onChange={(e) => setAdoptionForm({...adoptionForm, address: e.target.value})}
                            />
                          </motion.div>
                        )}

                        {adoptionStep === 2 && (
                          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <h2 className="text-4xl font-black text-white mb-8 tracking-tighter leading-tight">Preferred Meeting Date</h2>
                            <div className="grid grid-cols-2 gap-4">
                              {['Tomorrow', 'This Weekend', 'Next Week', 'Surprise Me'].map(d => (
                                <button 
                                  key={d} onClick={() => setAdoptionForm({...adoptionForm, date: d})}
                                  className={`p-6 rounded-3xl border font-bold transition-all ${
                                    adoptionForm.date === d ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/5'
                                  }`}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {adoptionStep === 3 && (
                          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <h2 className="text-4xl font-black text-white mb-8 tracking-tighter leading-tight">Final Confirmation</h2>
                            <div className="glass-dark p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                              <div className="flex items-center justify-between text-white/60">
                                <span className="font-medium">Pet</span>
                                <span className="font-bold text-white">{selectedPet.name}</span>
                              </div>
                              <div className="flex items-center justify-between text-white/60">
                                <span className="font-medium">Meeting</span>
                                <span className="font-bold text-white">{adoptionForm.date}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-12 flex items-center gap-4">
                      {adoptionStep > 0 && (
                        <button 
                          onClick={() => setAdoptionStep(adoptionStep - 1)}
                          className="px-8 py-5 glass text-white/40 font-bold rounded-2xl hover:text-white transition-all"
                        >
                          Back
                        </button>
                      )}
                      <button 
                        onClick={() => adoptionStep < 3 ? setAdoptionStep(adoptionStep + 1) : handleAdoptSubmit()}
                        className="flex-1 py-5 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20"
                      >
                        {adoptionStep === 3 ? 'Initiate Adoption' : 'Next Step'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Adopt;

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Heart, Shield, Clock, Star, Sparkles, Activity, MessageCircle } from 'lucide-react';
import heroImg from '../assets/hero.png';
import petsGrid from '../assets/pets_grid.png';

const Home = () => {
  const stats = [
    { label: 'Pets Adopted', value: '15k+', icon: <Heart className="text-pink-500" /> },
    { label: 'Expert Vets', value: '450+', icon: <Activity className="text-blue-500" /> },
    { label: 'Happy Families', value: '12k+', icon: <Star className="text-yellow-400" /> },
  ];

  return (
    <div className="relative overflow-hidden w-full">
      {/* Floating Particles (CSS Only) */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="absolute rounded-full bg-white/20 blur-sm animate-pulse"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDuration: Math.random() * 3 + 2 + 's'
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Text Content */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex-1 text-center lg:text-left"
            >
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-bold mb-8"
              >
                <Sparkles size={16} />
                <span>Next Generation Pet Care</span>
              </motion.div>
              
              <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-tight mb-8">
                Your pet's <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-400 glow-text">
                  Digital Life
                </span>
              </h1>
              
              <p className="text-xl text-white/60 mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Experience the first all-in-one ecosystem for the modern pet owner. 
                Premium adoption, health tracking, and 24/7 AI-powered support.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link to="/adopt" className="w-full sm:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 group">
                  Start Your Journey
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/quiz" className="w-full sm:w-auto px-8 py-4 glass-dark hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10">
                  Take Match Quiz
                </Link>
              </div>

              <div className="mt-16 flex items-center gap-8 justify-center lg:justify-start text-white/40">
                <div className="flex items-center gap-2"><Shield size={18} /> <span className="text-sm">Safe & Secure</span></div>
                <div className="flex items-center gap-2"><Clock size={18} /> <span className="text-sm">24/7 Live Support</span></div>
              </div>
            </motion.div>

            {/* Visual Side */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="flex-1 relative"
            >
              <div className="relative z-10 p-4 glass-dark rounded-[3rem] border border-white/10 shadow-3xl shadow-orange-500/10">
                <img 
                  src={heroImg} 
                  alt="Petly Pets" 
                  className="rounded-[2.5rem] w-full h-auto object-cover max-h-[600px]"
                />
                
                {/* Floating Glow Cards */}
                <motion.div 
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-8 -left-8 glass-dark p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/40">
                    <Heart className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Health Status</p>
                    <p className="text-lg font-bold text-white tracking-tight">Prime Condition</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [20, 0, 20] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-8 -right-8 glass-dark p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/40">
                    <Activity className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Activity Hub</p>
                    <p className="text-lg font-bold text-white tracking-tight">Active & Healthy</p>
                  </div>
                </motion.div>
              </div>

              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-500/10 blur-[120px] -z-10 rounded-full" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section with Aurora Cards */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="glass-dark p-10 rounded-[2.5rem] border border-white/10 flex flex-col items-center text-center group"
              >
                <div className="p-4 rounded-2xl bg-white/5 mb-6 group-hover:scale-110 transition-transform duration-500">
                  {stat.icon}
                </div>
                <h3 className="text-4xl font-black mb-2 tracking-tighter">{stat.value}</h3>
                <p className="text-white/40 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Preview */}
      <section className="py-20 bg-white/[0.02]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-5xl font-black tracking-tighter mb-6">
                Featured <span className="text-orange-400">PETLY</span> Souls
              </h2>
              <p className="text-lg text-white/50 leading-relaxed">
                Meet our newest members waiting for a loving home. 
                Each pet is professionally vetted and ready for their new chapter.
              </p>
            </div>
            <Link to="/adopt" className="flex items-center gap-2 text-white font-bold group">
              Explore Marketplace <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
          
          <div className="glass-dark rounded-[3rem] p-4 border border-white/10 overflow-hidden relative group">
            <img 
              src={petsGrid} 
              alt="Pets Grid" 
              className="w-full h-[600px] object-cover rounded-[2.5rem] opacity-40 group-hover:opacity-60 transition-opacity duration-1000" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-12 glass-dark rounded-[2.5rem] border border-white/20 shadow-4xl max-w-md mx-6">
                <h3 className="text-3xl font-black mb-4 tracking-tighter">Your match is <br />waiting for you.</h3>
                <p className="text-white/60 mb-8 italic">"We found our perfect Buddy through Petly in just 2 days. The process was seamless and premium."</p>
                <Link to="/quiz" className="inline-flex items-center gap-2 text-orange-400 font-bold group">
                  Find Your Match <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Preview */}
      <section className="py-20 pb-40">
        <div className="container mx-auto px-6">
          <div className="glass-dark rounded-[4rem] p-12 lg:p-24 border border-white/10 flex flex-col lg:flex-row items-center gap-16 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full" />
            <div className="flex-1 relative z-10 text-center lg:text-left">
              <h2 className="text-5xl font-black tracking-tighter mb-8 leading-tight">
                Meet <span className="text-blue-400">PETLY AI</span> <br />
                Your 24/7 care expert.
              </h2>
              <p className="text-lg text-white/50 mb-12 leading-relaxed">
                Ask about nutrition, behavioral health, or grooming. 
                Our AI assistant provides instant, data-backed guidance for any pet situation.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 font-medium">"What should I feed my puppy?"</div>
                <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 font-medium">"Is chocolate toxic?"</div>
              </div>
            </div>
            <div className="flex-1 w-full max-w-sm">
              <div className="glass shadow-2xl p-6 rounded-[2rem] border border-white/20">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <MessageCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold">PETLY Helper</h4>
                    <p className="text-xs text-blue-400 font-bold">Online Now</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-sm text-white/60">
                    Hello! How can I help you and your best friend today?
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/20 border border-blue-500/20 text-sm text-white/90 ml-auto w-4/5 text-right">
                    My cat is drinking more water than usual. Should I be worried?
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-sm text-white/80">
                    Increased thirst (polydipsia) can be caused by various factors. I recommend tracking it for 24h and booking a vet visit if it persists...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

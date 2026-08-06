import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, DollarSign, Baby, PawPrint, Zap, Users, Plane, Star, 
  ChevronRight, Sparkles, Trophy, Info, RotateCcw, Heart, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEcosystem } from '../context/EcosystemContext';

const QUESTIONS = [
  {
    id: 'living',
    question: "Where will your companion reside?",
    icon: <Home size={24} />,
    options: [
      { label: 'Apartment', value: 'apartment', weight: { cat: 10, rabbit: 8, bird: 9, dog: 4 } },
      { label: 'House with Yard', value: 'house', weight: { dog: 10, exotic: 7, cat: 8, rabbit: 9 } }
    ]
  },
  {
    id: 'budget',
    question: "Monthly resource allocation?",
    icon: <DollarSign size={24} />,
    options: [
      { label: 'Conservative ($)', value: 'low', weight: { bird: 10, rabbit: 8, cat: 5 } },
      { label: 'Premium ($$$)', value: 'high', weight: { dog: 10, exotic: 9, cat: 8 } }
    ]
  },
  {
    id: 'children',
    question: "Presence of small biological units (children)?",
    icon: <Baby size={24} />,
    options: [
      { label: 'Yes', value: 'yes', weight: { dog: 10, cat: 8, rabbit: 3 } },
      { label: 'No', value: 'no', weight: { exotic: 10, rabbit: 9, cat: 9 } }
    ]
  },
  {
    id: 'existing',
    question: "Other active companions in the unit?",
    icon: <PawPrint size={24} />,
    options: [
      { label: 'Solo Mission', value: 'none', weight: { cat: 10, dog: 10, exotic: 8 } },
      { label: 'Multi-Pet Grid', value: 'multi', weight: { dog: 8, cat: 9, bird: 7 } }
    ]
  },
  {
    id: 'activity',
    question: "Your daily kinetic output?",
    icon: <Zap size={24} />,
    options: [
      { label: 'Low (Stellar)', value: 'low', weight: { cat: 10, exotic: 9, bird: 8 } },
      { label: 'High (Orbital)', value: 'high', weight: { dog: 10, rabbit: 6 } }
    ]
  },
  {
    id: 'personality',
    question: "Social orientation?",
    icon: <Users size={24} />,
    options: [
      { label: 'Introvert (Deep Space)', value: 'introvert', weight: { cat: 10, exotic: 8, rabbit: 9 } },
      { label: 'Extrovert (Nova)', value: 'extrovert', weight: { dog: 10, bird: 9, cat: 5 } }
    ]
  },
  {
    id: 'travel',
    question: "Frequent planetary travel?",
    icon: <Plane size={24} />,
    options: [
      { label: 'Static (Homebound)', value: 'static', weight: { dog: 10, cat: 9, rabbit: 8 } },
      { label: 'High Frequency (Traveler)', value: 'travel', weight: { cat: 7, bird: 5, exotic: 4 } }
    ]
  },
  {
    id: 'experience',
    question: "First-time guardian?",
    icon: <Star size={24} />,
    options: [
      { label: 'First Mission', value: 'new', weight: { cat: 10, rabbit: 8, bird: 7 } },
      { label: 'Veteran Guardian', value: 'veteran', weight: { dog: 10, exotic: 9, cat: 9 } }
    ]
  }
];

const PET_DATA = {
  dog: { name: 'Canine Unit', icon: '🐕', color: 'blue', desc: 'Loyal, energetic, and thrives on social synchronization.' },
  cat: { name: 'Feline Interface', icon: '🐈', color: 'orange', desc: 'Independent, affectionate, and perfectly suited for deep-space meditation.' },
  rabbit: { name: 'Leporidae Unit', icon: '🐇', color: 'pink', desc: 'Gentle, quiet, and highly sensitive to environmental harmony.' },
  bird: { name: 'Avian Relay', icon: '🦜', color: 'emerald', desc: 'Social, communicative, and adds a melodic frequency to your grid.' },
  exotic: { name: 'Exotic Artifact', icon: '🦎', color: 'purple', desc: 'Unique, observation-focused, and requires precise habitat control.' }
};

const PetQuiz = () => {
  const { addQuizResult } = useEcosystem();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

  const handleOptionSelect = (qId, option) => {
    const newAnswers = { ...answers, [qId]: option };
    setAnswers(newAnswers);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      calculateResults(newAnswers);
    }
  };

  const calculateResults = (finalAnswers) => {
    const scores = { dog: 0, cat: 0, rabbit: 0, bird: 0, exotic: 0 };
    
    Object.keys(finalAnswers).forEach(qId => {
      const option = finalAnswers[qId];
      Object.keys(option.weight).forEach(pet => {
        scores[pet] += option.weight[pet];
      });
    });

    const totalWeight = Object.values(scores).reduce((a, b) => a + b, 0);
    const calculatedResults = Object.keys(scores).map(pet => ({
      type: pet,
      score: Math.round((scores[pet] / (QUESTIONS.length * 10)) * 100),
      ...PET_DATA[pet]
    })).sort((a, b) => b.score - a.score);

    setResults(calculatedResults);
    localStorage.setItem('petly_quiz_results', JSON.stringify(calculatedResults));

    // Save to history context
    const quizHistoryEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      topMatch: calculatedResults[0].name,
      topMatchIcon: calculatedResults[0].icon,
      topMatchScore: calculatedResults[0].score,
      allMatches: calculatedResults
    };
    addQuizResult(quizHistoryEntry);
  };

  const resetQuiz = () => {
    setStep(0);
    setAnswers({});
    setResults(null);
  };

  return (
    <div className="min-h-screen pt-32 pb-40 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 p-64 bg-orange-500/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 p-64 bg-blue-500/5 blur-[120px] rounded-full -z-10" />

      <div className="container mx-auto px-6 max-w-4xl">
        {!results ? (
          <div className="space-y-12 text-center">
            {/* Progress Bar */}
            <div className="max-w-md mx-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Step {step + 1} / {QUESTIONS.length}</span>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{Math.round(((step + 1) / QUESTIONS.length) * 100)}% Sync</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
                  className="h-full bg-orange-500 shadow-lg shadow-orange-500/50"
                />
              </div>
            </div>

            {/* Question Panel */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={step}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="glass-dark p-12 lg:p-20 rounded-[4rem] border border-white/10 shadow-5xl relative overflow-hidden"
              >
                <div className="flex justify-center mb-10">
                  <div className="w-20 h-20 rounded-3xl bg-orange-500/10 text-orange-500 flex items-center justify-center shadow-2xl border border-orange-500/20">
                    {QUESTIONS[step].icon}
                  </div>
                </div>
                
                <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter mb-12 leading-tight">
                  {QUESTIONS[step].question}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {QUESTIONS[step].options.map((opt, i) => (
                    <button 
                      key={i}
                      onClick={() => handleOptionSelect(QUESTIONS[step].id, opt)}
                      className="group p-8 rounded-[2.5rem] bg-white/5 border border-white/5 text-left transition-all hover:bg-white text-white hover:text-black hover:border-white shadow-xl hover:scale-105 active:scale-95 flex items-center justify-between"
                    >
                      <span className="text-xl font-black tracking-tighter uppercase">{opt.label}</span>
                      <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {step > 0 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors"
              >
                Previous Step
              </button>
            )}
          </div>
        ) : (
          /* Results Screen */
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-12"
          >
            <header className="text-center">
              <div className="inline-flex items-center gap-3 text-emerald-400 font-black text-xs tracking-[0.3em] uppercase mb-6">
                <Trophy size={20} />
                <span>Compatibility Analysis Complete</span>
              </div>
              <h1 className="text-7xl font-black text-white tracking-tighter mb-4 leading-none">Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500 font-black">Neural Match</span></h1>
              <p className="text-xl text-white/40 font-medium">Synchronized biometric results based on your environmental constraints.</p>
            </header>

            {/* Top Match Highlight */}
            <div className="glass-dark p-12 lg:p-20 rounded-[4rem] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent relative overflow-hidden group shadow-5xl">
              <div className="absolute top-0 right-0 p-32 bg-orange-500/5 blur-[120px] rounded-full -z-10" />
              <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
                <div className="text-9xl animate-float">{results[0].icon}</div>
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                    <h2 className="text-6xl font-black text-white tracking-tighter">{results[0].name}</h2>
                    <span className="px-6 py-2 bg-orange-500 text-white font-black rounded-2xl text-xl shadow-xl shadow-orange-500/20">{results[0].score}% Match</span>
                  </div>
                  <p className="text-xl text-white/60 leading-relaxed mb-10 font-medium italic">"{results[0].desc}"</p>
                  <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                     <button 
                       onClick={() => navigate('/adopt')}
                       className="px-10 py-5 bg-white text-black font-black rounded-2xl hover:bg-orange-500 hover:text-white transition-all shadow-2xl shadow-white/5 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs"
                     >
                        Locate Companion <ArrowRight size={18} />
                     </button>
                     <button className="px-10 py-5 glass border-white/10 text-white/40 font-black rounded-2xl hover:text-white transition-all uppercase tracking-widest text-xs">Deep Analysis</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Matches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {results.slice(1, 3).map((res, i) => (
                <div key={i} className="glass-dark p-10 rounded-[3.5rem] border border-white/10 flex items-center gap-8 group hover:border-white/20 transition-all">
                  <div className="text-6xl group-hover:scale-110 transition-transform">{res.icon}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-2xl font-black text-white tracking-tighter uppercase">{res.name}</h4>
                      <span className="text-sm font-black text-white/40">{res.score}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-white/40" style={{ width: `${res.score}%` }} />
                    </div>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">High Affinity Core</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-8">
               <button 
                 onClick={resetQuiz}
                 className="flex items-center gap-3 text-white/20 hover:text-white font-black uppercase tracking-widest text-xs transition-colors"
               >
                 <RotateCcw size={16} /> Re-Calculate Compatibility
               </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const ArrowRight = ({ size }) => <ChevronRight size={size} />;

export default PetQuiz;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';
import { PETS_DATA } from '../data/pets';
import { PRODUCTS_DATA } from '../data/products';
import {
  User, MapPin, Mail, Phone, Calendar, Heart, Bookmark, PawPrint, Users,
  Edit3, Save, LogOut, Camera, Clock, Syringe, FileText, ChevronRight, Activity, Award
} from 'lucide-react';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const {
    wishlistPets,
    wishlistProducts,
    adoptions,
    petHealthProfiles,
    bookings,
    vaccines,
    medications,
    milestones,
    quizHistory,
    communityPosts,
    addExistingPet
  } = useEcosystem();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...user });
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [petForm, setPetForm] = useState({ name: '', species: '', breed: '', gender: '', dob: '', weight: '', height: '', color: '', adoptionDate: '', photo: '', medicalConditions: '', allergies: '' });

  const wishlistedPets = PETS_DATA.filter(pet => wishlistPets.includes(pet.id));
  const wishlistedProducts = PRODUCTS_DATA.filter(prod => wishlistProducts.includes(prod.id));
  const userPosts = communityPosts.filter(p => p.authorId === user?.id);
  const savedPosts = communityPosts.filter(p => p.savedBy?.includes(user?.id));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-32">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white mb-6 tracking-tighter">Access Denied</h2>
          <p className="text-white/40 mb-8 font-medium">Please log in to view your PETLY profile.</p>
          <a href="/login" className="px-8 py-4 bg-orange-500 text-white font-black rounded-2xl">Return to Login</a>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    updateUser(editData);
    setIsEditing(false);
  };

  const petThemeColor = (pet) => {
    const name = pet.name?.toLowerCase();
    if (name === 'buddy ii') return 'orange';
    if (name === 'bailey') return 'purple';
    if (name === 'max') return 'blue';
    if (name === 'bluey') return 'green';
    return pet.themeColor || 'orange';
  };

  const petThemeClasses = (theme) => {
    if (theme === 'purple') return 'border-purple-500/20 bg-purple-500/10 text-purple-300';
    if (theme === 'blue') return 'border-sky-500/20 bg-sky-500/10 text-sky-300';
    if (theme === 'green') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    return 'border-orange-500/20 bg-orange-500/10 text-orange-300';
  };

  const petTextClass = (theme) => {
    if (theme === 'purple') return 'text-purple-400';
    if (theme === 'blue') return 'text-sky-400';
    if (theme === 'green') return 'text-emerald-400';
    return 'text-orange-400';
  };

  const getPetHealthProfile = (pet) => petHealthProfiles?.[pet?.id] || {};

  const getPetProfileSnapshot = (pet) => {
    const profile = getPetHealthProfile(pet);
    return {
      ...pet,
      temperature: profile.temperature ?? '101.2°F',
      healthStatus: profile.healthStatus ?? 'Healthy',
      notes: profile.notes ?? 'Stable and monitored regularly.',
      healthScore: profile.healthScore ?? pet.healthScore ?? 90,
      medicalHistory: profile.medicalHistory ?? 'Routine wellness monitoring',
      vaccinationRegistry: Array.isArray(profile.vaccinationRegistry) ? profile.vaccinationRegistry : [],
      healthMilestones: Array.isArray(profile.healthMilestones) ? profile.healthMilestones : [],
      activeMedications: Array.isArray(profile.activeMedications) ? profile.activeMedications : [],
      upcomingAppointments: Array.isArray(profile.upcomingAppointments) ? profile.upcomingAppointments : []
    };
  };

  const tabs = [
    { id: 'overview', icon: <User size={18} />, label: 'Overview' },
    { id: 'pets', icon: <PawPrint size={18} />, label: 'My Pets' },
    { id: 'saved', icon: <Bookmark size={18} />, label: 'Saved' },
    { id: 'community', icon: <Users size={18} />, label: 'Community' },
  ];

  return (
    <div className="min-h-screen pt-32 pb-40">
      <div className="container mx-auto px-6">
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-dark rounded-[3.5rem] p-12 lg:p-16 border border-white/10 relative overflow-hidden mb-12"
        >
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full -z-10" />

          <div className="flex flex-col lg:flex-row items-center lg:items-end gap-12">
            {/* Avatar Section */}
            <div className="relative group">
              <div className="w-48 h-48 rounded-[2.5rem] bg-gradient-to-tr from-orange-500 to-yellow-400 p-1">
                <div className="w-full h-full rounded-[2.3rem] bg-black flex items-center justify-center text-6xl font-black text-white overflow-hidden border-4 border-black">
                  {user.fullName.charAt(0)}
                </div>
              </div>
              <button className="absolute bottom-4 right-4 w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                <Camera size={20} />
              </button>
            </div>

            {/* Info Section */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-6 mb-8">
                <div>
                  <div className="flex items-center gap-3 justify-center lg:justify-start mb-2">
                    <h1 className="text-5xl font-black tracking-tighter text-white">{user.fullName}</h1>
                    <div className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest">
                      Elite Member
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start text-white/40 font-medium">
                    <span className="flex items-center gap-2"><MapPin size={16} /> {user.city}, {user.state}</span>
                    <span className="flex items-center gap-2"><Calendar size={16} /> Joined June 2026</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <button onClick={handleSave} className="flex items-center gap-2 px-8 py-4 bg-green-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-green-500/20">
                      <Save size={18} /> Save Profile
                    </button>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-8 py-4 glass hover:bg-white/10 text-white font-black rounded-2xl transition-all border border-white/10">
                      <Edit3 size={18} /> Edit Profile
                    </button>
                  )}
                  <button onClick={logout} className="p-4 glass text-red-500 border-red-500/20 hover:bg-red-500/10 rounded-2xl transition-all">
                    <LogOut size={20} />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] p-6 text-white font-medium outline-none focus:border-orange-500/50 transition-all h-24"
                />
              ) : (
                <p className="text-lg text-white/60 max-w-2xl leading-relaxed italic">"{user.bio}"</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-3 mb-12 overflow-x-auto pb-4 no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all border border-white/5 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-black shadow-2xl' : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="space-y-12"
                >
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                    <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                      <h3 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">Contact Details</h3>
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center"><Mail size={18} /></div>
                          <div><p className="text-xs text-white/30 font-bold uppercase tracking-wider">Email</p><p className="font-bold text-white/80">{user.email}</p></div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Phone size={18} /></div>
                          <div><p className="text-xs text-white/30 font-bold uppercase tracking-wider">Phone</p><p className="font-bold text-white/80">{user.phone}</p></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">Ecosystem Stats</h3>

                    {/* Basic Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="p-6 rounded-2xl bg-white/5 text-center transition-all hover:bg-white/10 border border-white/5">
                        <p className="text-2xl font-black text-white">{adoptions.length}</p>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Adopted</p>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/5 text-center transition-all hover:bg-white/10 border border-white/5">
                        <p className="text-2xl font-black text-white">{wishlistPets.length + wishlistProducts.length}</p>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Saved Items</p>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/5 text-center transition-all hover:bg-white/10 border border-white/5">
                        <p className="text-2xl font-black text-white">{bookings.length}</p>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Bookings</p>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/5 text-center transition-all hover:bg-white/10 border border-white/5">
                        <p className="text-2xl font-black text-white">{vaccines.length}</p>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Vaccines</p>
                      </div>
                    </div>

                    {/* Pet Health Summary List */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                      <h4 className="text-sm font-black text-white mb-6">Pet Health Summary</h4>
                      {adoptions.length === 0 ? (
                        <p className="text-xs text-white/40">No pets</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {adoptions.map((pet) => {
                            const theme = petThemeColor(pet);
                            const petProfile = getPetProfileSnapshot(pet);
                            const completedVaccines = petProfile.vaccinationRegistry.filter(v => v.status === 'completed').length;
                            return (
                              <div
                                key={pet.id}
                                className={`glass p-8 rounded-3xl border ${petThemeClasses(theme)} hover:bg-white/10 transition-all flex flex-col justify-between h-[500px] min-h-[500px]`}
                              >
                                {/* Top block */}
                                <div className="flex flex-col gap-5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-lg font-bold text-white leading-tight">{pet.name}</div>
                                      <div className="text-xs text-white/40 mt-0.5">{pet.breed || pet.species || 'Companion'}</div>
                                    </div>
                                    <span className="text-3xl">{pet.image || '🐾'}</span>
                                  </div>

                                  {/* Score and Temperature */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-xl bg-white/5 p-3 border border-white/5 h-16 flex flex-col justify-center">
                                      <span className="text-[9px] uppercase tracking-wider text-white/40 block">Health Score</span>
                                      <span className={`text-base font-black ${petTextClass(theme)}`}>{petProfile.healthScore}%</span>
                                    </div>
                                    <div className="rounded-xl bg-white/5 p-3 border border-white/5 h-16 flex flex-col justify-center">
                                      <span className="text-[9px] uppercase tracking-wider text-white/40 block">Temperature</span>
                                      <span className="text-sm font-black text-white">{petProfile.temperature}</span>
                                    </div>
                                  </div>

                                  {/* Counters / Statistic Chips */}
                                  <div className="grid grid-cols-3 gap-3">
                                    <div className="rounded-lg bg-white/5 p-2 border border-white/5 text-center flex flex-col justify-center items-center h-16 min-w-0">
                                      <p className="text-sm font-black text-white leading-none">{completedVaccines}/{Math.max(1, petProfile.vaccinationRegistry.length)}</p>
                                      <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1 text-center leading-tight whitespace-normal break-words max-w-full">Vaccines</p>
                                    </div>
                                    <div className="rounded-lg bg-white/5 p-2 border border-white/5 text-center flex flex-col justify-center items-center h-16 min-w-0">
                                      <p className="text-sm font-black text-white leading-none">{petProfile.healthMilestones.length}</p>
                                      <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1 text-center leading-tight whitespace-normal break-words max-w-full">Milestones</p>
                                    </div>
                                    <div className="rounded-lg bg-white/5 p-2 border border-white/5 text-center flex flex-col justify-center items-center h-16 min-w-0">
                                      <p className="text-sm font-black text-white leading-none">{petProfile.upcomingAppointments.length}</p>
                                      <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1 text-center leading-tight whitespace-normal break-words max-w-full">Appointments</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Bottom block: Medications */}
                                <div className="mt-4 pt-3 border-t border-white/5">
                                  <p className="text-[9px] uppercase tracking-[0.1em] text-white/40 font-bold mb-1.5">Active Medications</p>
                                  <div className="h-16 overflow-y-auto no-scrollbar">
                                    {petProfile.activeMedications.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {petProfile.activeMedications.map((med, mIdx) => (
                                          <span
                                            key={mIdx}
                                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border break-words ${theme === 'purple' ? 'border-purple-500/20 bg-purple-500/10 text-purple-300' :
                                                theme === 'blue' ? 'border-sky-500/20 bg-sky-500/10 text-sky-300' :
                                                  theme === 'green' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' :
                                                    'border-orange-500/20 bg-orange-500/10 text-orange-300'
                                              }`}
                                          >
                                            {med.name}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 h-8">
                                        <span>✓ No Active Medications</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">Pet Health Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                      {adoptions.map((pet) => {
                        const theme = petThemeColor(pet);
                        const petProfile = getPetProfileSnapshot(pet);
                        const completedVaccines = petProfile.vaccinationRegistry.filter(v => v.status === 'completed').length;

                        const calculateAge = (dob) => {
                          if (!dob) return null;
                          const diff = Date.now() - new Date(dob).getTime();
                          if (isNaN(diff) || diff < 0) return null;
                          const ageDate = new Date(diff);
                          const yrs = Math.abs(ageDate.getUTCFullYear() - 1970);
                          return yrs > 0 ? `${yrs} yr${yrs > 1 ? 's' : ''}` : 'Less than a year';
                        };
                        const petAge = pet.age || calculateAge(pet.dob) || 'Unknown Age';

                        return (
                          <div
                            key={pet.id}
                            className={`flex flex-col h-[600px] justify-between min-h-[600px] p-8 rounded-3xl border ${petThemeClasses(theme)} backdrop-blur-md relative overflow-hidden`}
                          >
                            {/* Card Content Top */}
                            <div className="flex flex-col gap-6">
                              {/* Avatar and Identity */}
                              <div className="flex items-center gap-4">
                                <div className="text-5xl bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                                  {pet.image || '🐾'}
                                </div>
                                <div className="min-w-0">
                                  <h4 className={`text-2xl font-black truncate tracking-tight ${petTextClass(theme)}`}>
                                    {pet.name}
                                  </h4>
                                  <p className="text-xs text-white/50 truncate font-medium">
                                    {pet.breed || pet.species || 'Companion'} • {petAge}
                                  </p>
                                </div>
                              </div>

                              {/* Health Score / Temp / Status / Breed Health */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/5 min-w-0 h-24 flex flex-col justify-center">
                                  <span className="text-[10px] uppercase tracking-wider text-white/40 block">Health Score</span>
                                  <span className={`text-xl font-black ${petTextClass(theme)}`}>
                                    {petProfile.healthScore}%
                                  </span>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/5 min-w-0 h-24 flex flex-col justify-center">
                                  <span className="text-[10px] uppercase tracking-wider text-white/40 block">Temperature</span>
                                  <span className="text-base font-black text-white whitespace-normal break-words">
                                    {petProfile.temperature}
                                  </span>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/5 min-w-0 h-24 flex flex-col justify-center">
                                  <span className="text-[10px] uppercase tracking-wider text-white/40 block">Health Status</span>
                                  <span className="text-xs font-bold text-white whitespace-normal break-words line-clamp-2 block leading-tight">
                                    {petProfile.healthStatus}
                                  </span>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/5 min-w-0 h-24 flex flex-col justify-center">
                                  <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-0.5">Breed Health</span>
                                  <span className="text-[11px] text-white/60 font-medium whitespace-normal break-words line-clamp-3 block leading-tight h-[48px] overflow-hidden">
                                    {petProfile.medicalHistory}
                                  </span>
                                </div>
                              </div>

                              {/* Statistics */}
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Statistics</p>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="rounded-xl bg-white/5 p-3 border border-white/5 text-center flex flex-col justify-center items-center h-20 min-w-0">
                                    <p className="text-base font-black text-white leading-tight">
                                      {completedVaccines}/{Math.max(1, petProfile.vaccinationRegistry.length)}
                                    </p>
                                    <p className="text-[9px] text-white/40 uppercase tracking-wider mt-1 text-center leading-tight whitespace-normal break-words max-w-full">Vaccines</p>
                                  </div>
                                  <div className="rounded-xl bg-white/5 p-3 border border-white/5 text-center flex flex-col justify-center items-center h-20 min-w-0">
                                    <p className="text-base font-black text-white leading-tight">
                                      {petProfile.healthMilestones.length}
                                    </p>
                                    <p className="text-[9px] text-white/40 uppercase tracking-wider mt-1 text-center leading-tight whitespace-normal break-words max-w-full">Milestones</p>
                                  </div>
                                  <div className="rounded-xl bg-white/5 p-3 border border-white/5 text-center flex flex-col justify-center items-center h-20 min-w-0">
                                    <p className="text-base font-black text-white leading-tight">
                                      {petProfile.upcomingAppointments.length}
                                    </p>
                                    <p className="text-[9px] text-white/40 uppercase tracking-wider mt-1 text-center leading-tight whitespace-normal break-words max-w-full">Appointments</p>
                                  </div>
                                </div>
                              </div>

                              {/* Active Medications */}
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Active Medications</p>
                                <div className="h-16 overflow-y-auto no-scrollbar">
                                  {petProfile.activeMedications.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {petProfile.activeMedications.map((med, mIdx) => (
                                        <span
                                          key={mIdx}
                                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border break-words ${theme === 'purple' ? 'border-purple-500/20 bg-purple-500/10 text-purple-300' :
                                              theme === 'blue' ? 'border-sky-500/20 bg-sky-500/10 text-sky-300' :
                                                theme === 'green' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' :
                                                  'border-orange-500/20 bg-orange-500/10 text-orange-300'
                                            }`}
                                        >
                                          {med.name}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1 h-8">
                                      <span>✓ No Active Medications</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Notes Section at the bottom */}
                            <div className="mt-6 pt-4 border-t border-white/10">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-1">Notes</p>
                              <p className="text-xs text-white/60 leading-relaxed italic break-words line-clamp-2 h-8 block">
                                {petProfile.notes}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Booking History */}
                  <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">Booking History</h3>
                    {bookings.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No booking history registered.</p>
                    ) : (
                      <div className="space-y-4">
                        {bookings.map((b, idx) => (
                          <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-white uppercase tracking-tighter text-sm">{b.service} Service Call</span>
                              <p className="text-white/40 mt-1">{b.provider} • {b.date} @ {b.time}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${b.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {b.status || 'Confirmed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vaccination Summary */}
                  <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">Vaccine Registry Summary</h3>
                    {vaccines.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No vaccinations logged.</p>
                    ) : (
                      <div className="space-y-3">
                        {vaccines.map((v, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-4 rounded-xl bg-white/5 border border-white/5">
                            <span className="font-bold text-white uppercase">{v.name}</span>
                            <span className={`text-[10px] uppercase font-black tracking-widest ${v.status === 'completed' ? 'text-emerald-400' : v.status === 'overdue' ? 'text-red-400' : 'text-blue-400'}`}>
                              {v.status} ({v.date})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Health Milestones */}
                  <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">Health Milestones</h3>
                    {milestones.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No milestones recorded.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {milestones.map((m) => (
                          <div key={m.id} className={`p-4 rounded-2xl bg-white/5 border ${m.achieved ? 'border-emerald-500/20' : 'border-white/5'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-bold text-white text-sm">{m.title}</h5>
                              <span className={`text-[10px] font-black uppercase ${m.achieved ? 'text-emerald-400' : 'text-white/40'}`}>{m.achieved ? 'Achieved' : 'Pending'}</span>
                            </div>
                            <p className="text-[10px] text-white/40">{m.date || '—'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {showAddPetModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                  <div className="w-full max-w-2xl glass-dark rounded-[1.5rem] p-8 border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-white">Add Existing Pet</h3>
                      <button onClick={() => setShowAddPetModal(false)} className="text-white/40">Close</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input placeholder="Name" value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input placeholder="Species" value={petForm.species} onChange={(e) => setPetForm({ ...petForm, species: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input placeholder="Breed" value={petForm.breed} onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input placeholder="Gender" value={petForm.gender} onChange={(e) => setPetForm({ ...petForm, gender: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input type="date" placeholder="DOB" value={petForm.dob} onChange={(e) => setPetForm({ ...petForm, dob: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input placeholder="Weight (kg)" value={petForm.weight} onChange={(e) => setPetForm({ ...petForm, weight: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input placeholder="Temperature (°F)" value={petForm.temperature || ''} onChange={(e) => setPetForm({ ...petForm, temperature: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input placeholder="Height (optional)" value={petForm.height} onChange={(e) => setPetForm({ ...petForm, height: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input placeholder="Color" value={petForm.color} onChange={(e) => setPetForm({ ...petForm, color: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input type="date" placeholder="Adoption Date" value={petForm.adoptionDate} onChange={(e) => setPetForm({ ...petForm, adoptionDate: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input placeholder="Photo URL" value={petForm.photo} onChange={(e) => setPetForm({ ...petForm, photo: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input placeholder="Medical Conditions" value={petForm.medicalConditions} onChange={(e) => setPetForm({ ...petForm, medicalConditions: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <input placeholder="Allergies" value={petForm.allergies} onChange={(e) => setPetForm({ ...petForm, allergies: e.target.value })} className="bg-white/5 p-3 rounded-lg" />
                      <textarea placeholder="Vaccines (one per line)" value={petForm.vaccines || ''} onChange={(e) => setPetForm({ ...petForm, vaccines: e.target.value })} className="col-span-2 bg-white/5 p-3 rounded-lg min-h-[90px]" />
                      <textarea placeholder="Medications (one per line)" value={petForm.medications || ''} onChange={(e) => setPetForm({ ...petForm, medications: e.target.value })} className="col-span-2 bg-white/5 p-3 rounded-lg min-h-[90px]" />
                      <textarea placeholder="Medical Notes" value={petForm.medicalNotes || ''} onChange={(e) => setPetForm({ ...petForm, medicalNotes: e.target.value })} className="col-span-2 bg-white/5 p-3 rounded-lg min-h-[90px]" />
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                      <button onClick={() => setShowAddPetModal(false)} className="px-6 py-3 rounded-2xl bg-white/5">Cancel</button>
                      <button onClick={() => {
                        if (!petForm.name) return;
                        addExistingPet({ name: petForm.name, species: petForm.species, breed: petForm.breed, gender: petForm.gender, dob: petForm.dob, weight: petForm.weight, temperature: petForm.temperature, height: petForm.height, color: petForm.color, adoptionDate: petForm.adoptionDate, image: petForm.photo, medicalConditions: petForm.medicalConditions, allergies: petForm.allergies, vaccines: petForm.vaccines, medications: petForm.medications, medicalNotes: petForm.medicalNotes });
                        setPetForm({ name: '', species: '', breed: '', gender: '', dob: '', weight: '', temperature: '', height: '', color: '', adoptionDate: '', photo: '', medicalConditions: '', allergies: '', vaccines: '', medications: '', medicalNotes: '' });
                        setShowAddPetModal(false);
                      }} className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-black">Add Pet</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pets' && (
                <motion.div
                  key="pets" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  {adoptions.length === 0 ? (
                    <div className="col-span-2 py-12 text-center opacity-30">
                      <PawPrint size={64} className="mx-auto mb-4" />
                      <p className="text-sm font-bold">No adopted companions registered yet.</p>
                    </div>
                  ) : (
                    <>
                      <div className="col-span-2 flex justify-end mb-4">
                        <button onClick={() => setShowAddPetModal(true)} className="px-4 py-2 rounded-full bg-white/5 text-white/80 hover:bg-white/10">Add Existing Pet</button>
                      </div>
                      {adoptions.map((pet, idx) => {
                        const theme = petThemeColor(pet);
                        const petVaccines = vaccines.filter(v => v.petId === pet.id);
                        const completedVaccines = petVaccines.filter(v => v.status === 'completed').length;
                        const petMedications = medications.filter(m => m.petId === pet.id);
                        const activeMedications = petMedications.map(m => m.name).join(', ') || 'None';
                        const petMilestones = milestones.filter(m => m.petId === pet.id);
                        const completedMilestones = petMilestones.filter(m => m.achieved).length;
                        const petBookings = bookings.filter(b => b.petId === pet.id);
                        const profile = getPetHealthProfile(pet);
                        const nextAppointment = petBookings[0]?.date ? `${petBookings[0].date} @ ${petBookings[0].time}` : 'None';
                        return (
                          <div key={idx} className={`glass-dark p-8 rounded-[2.5rem] border ${petThemeClasses(theme)} bg-white/5`}>
                            <div className="flex flex-col lg:flex-row gap-6 mb-8">
                              <div className="text-6xl flex items-center justify-center">{pet.image || '🐾'}</div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                  <h4 className={`text-3xl font-black ${petTextClass(theme)}`}>{pet.name}</h4>
                                  <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.3em] ${petTextClass(theme)} bg-white/5 border border-white/10`}>{pet.species}</span>
                                </div>
                                <p className="text-sm text-white/40 mb-2">{pet.breed}</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/40">{profile.healthStatus || pet.status || 'Healthy'}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                                <div className="rounded-3xl bg-white/5 p-4 border border-white/10">
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Weight</p>
                                  <p className="font-black text-white">{pet.weight} kg</p>
                                </div>
                                <div className="rounded-3xl bg-white/5 p-4 border border-white/10">
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Temp</p>
                                  <p className="font-black text-white">{profile.temperature || pet.temperature || '--'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              <div className="rounded-3xl bg-white/5 p-6 border border-white/10">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Health Score</p>
                                <p className={`text-3xl font-black ${petTextClass(theme)}`}>{profile.healthScore ?? pet.healthScore ?? '--'}%</p>
                              </div>
                              <div className="rounded-3xl bg-white/5 p-6 border border-white/10">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Vaccination Progress</p>
                                <p className="text-2xl font-black text-white">{completedVaccines}/{Math.max(1, petVaccines.length)}</p>
                              </div>
                              <div className="rounded-3xl bg-white/5 p-6 border border-white/10">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Active Meds</p>
                                <p className="text-sm text-white">{activeMedications}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="rounded-3xl bg-white/5 p-6 border border-white/10">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Milestones</p>
                                <p className="text-2xl font-black text-white">{completedMilestones}</p>
                              </div>
                              <div className="rounded-3xl bg-white/5 p-6 border border-white/10">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Upcoming Appointments</p>
                                <p className="text-2xl font-black text-white">{petBookings.length}</p>
                              </div>
                              <div className="rounded-3xl bg-white/5 p-6 border border-white/10">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Next Appointment</p>
                                <p className="text-sm text-white">{nextAppointment}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <a href="/adopt" className="glass-dark p-12 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center text-center opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer border-dashed">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-white hover:text-orange-500 hover:bg-orange-500/10 transition-all">
                      <PawPrint size={40} />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2 tracking-tighter">Adopt a Pet</h4>
                    <p className="text-sm text-white/40 font-medium">Add your companion to the PETLY ecosystem.</p>
                  </a>
                </motion.div>
              )}

              {activeTab === 'saved' && (
                <motion.div
                  key="saved" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  {/* Saved Pets */}
                  <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4 flex items-center gap-2"><Heart size={18} className="text-red-500" /> Favorite Pets ({wishlistedPets.length})</h3>
                    {wishlistedPets.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No favorited pets. Check adopt listings!</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {wishlistedPets.map(p => (
                          <div key={p.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                            <span className="text-4xl">{p.image}</span>
                            <div>
                              <h5 className="font-bold text-white text-sm">{p.name}</h5>
                              <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">{p.breed}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Saved Products */}
                  <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4 flex items-center gap-2"><Heart size={18} className="text-orange-500" /> Favorite Products ({wishlistedProducts.length})</h3>
                    {wishlistedProducts.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No saved store products. Check store listings!</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {wishlistedProducts.map(p => (
                          <div key={p.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                            <span className="text-4xl">{p.image}</span>
                            <div>
                              <h5 className="font-bold text-white text-sm">{p.name}</h5>
                              <p className="text-[10px] text-white/40 font-bold">${p.price.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'community' && (
                <motion.div
                  key="community" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h3 className="text-2xl font-black text-white tracking-tighter">Your Publications</h3>
                  {userPosts.length === 0 ? (
                    <p className="text-sm text-white/20 italic p-8 border border-dashed border-white/10 rounded-[2rem] text-center">You have not published any feeds yet.</p>
                  ) : (
                    userPosts.map(post => (
                      <div key={post.id} className="glass-dark p-8 rounded-[2.5rem] border border-white/10">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">{post.date}</span>
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{post.votes} Votes</span>
                        </div>
                        <h4 className="text-lg font-black text-white mb-2">{post.title}</h4>
                        <p className="text-xs text-white/50 leading-relaxed">{post.body}</p>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Quiz History / Bookmarked posts */}
          <div className="space-y-8">
            <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Award size={18} className="text-orange-400" /> Quiz History</h3>
              {quizHistory.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-white/20 italic">No quiz completions logged.</p>
                  <a href="/quiz" className="inline-block mt-4 text-xs font-black text-orange-500 uppercase tracking-widest hover:text-orange-400">Take Quiz</a>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizHistory.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white uppercase tracking-tighter flex items-center gap-1.5">{q.topMatchIcon} {q.topMatch}</span>
                        <span className="text-orange-500 font-bold">{q.topMatchScore}%</span>
                      </div>
                      <p className="text-white/20 text-[9px] uppercase tracking-widest mt-2">{q.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Bookmark size={18} className="text-blue-500" /> Saved Feeds</h3>
              {savedPosts.length === 0 ? (
                <p className="text-xs text-white/20 italic py-4">No bookmarked community posts.</p>
              ) : (
                <div className="space-y-3">
                  {savedPosts.map(post => (
                    <div key={post.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs">
                      <h5 className="font-bold text-white truncate">{post.title}</h5>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mt-2">By {post.author}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

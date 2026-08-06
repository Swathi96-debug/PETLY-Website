import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Activity, Thermometer, Weight, Calendar, ShieldCheck, Zap, 
  Heart, TrendingUp, Clock, AlertCircle, Syringe, Pill, 
  Stethoscope, Baby, ChevronRight, CheckCircle2, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { useEcosystem } from '../context/EcosystemContext';

const HealthHub = () => {
  const {
    addWeightRecord,
    addVaccinationRecord,
    addTimelineRecord,
    addMedicationRecord,
    addMilestone,
    toggleMilestoneAchieved,
    updateMilestone,
    removeMilestone,
    adoptions,
    petHealthProfiles,
    bookings
  } = useEcosystem();

  const [selectedPetId, setSelectedPetId] = useState('all');
  const [chartMode, setChartMode] = useState('standard');
  const [modalPetId, setModalPetId] = useState(null);

  // Build pet tabs from adoptions (include guest demo pet)
  const petTabs = [{ id: 'all', label: 'All Pets' }, ...adoptions.map(p => ({ id: p.id, label: p.name }))];

  const selectedPet = selectedPetId === 'all' ? null : adoptions.find((pet) => pet.id === selectedPetId);
  const activePetId = selectedPetId === 'all' ? adoptions[0]?.id || null : selectedPetId;
  const chartPets = selectedPetId === 'all' ? adoptions : selectedPet ? [selectedPet] : [];
  const monthOrder = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const chartColors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6'];

  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalFormType, setModalFormType] = useState('main'); // 'main', 'weight', 'vaccine', 'medication', 'vet'
  const [weightVal, setWeightVal] = useState('');
  const [vaccineForm, setVaccineForm] = useState({ name: '', date: '', status: 'completed' });
  const [medicationForm, setMedicationForm] = useState({ name: '', dose: '', frequency: '', next: '' });
  const [vetForm, setVetForm] = useState({ title: '', date: '', notes: '', icon: 'stethoscope', color: 'blue', category: 'vet', achieved: true });

  const renderTimelineIcon = (iconName) => {
    switch (iconName) {
      case 'baby': return <Baby size={18} />;
      case 'syringe': return <Syringe size={18} />;
      case 'clock': return <Clock size={18} />;
      case 'stethoscope': return <Stethoscope size={18} />;
      case 'pill': return <Pill size={18} />;
      default: return <Clock size={18} />;
    }
  };

  const petThemeClasses = (theme) => {
    if (theme === 'purple') return 'border-purple-500/20 bg-purple-500/10 text-purple-300';
    if (theme === 'blue') return 'border-sky-500/20 bg-sky-500/10 text-sky-300';
    if (theme === 'green') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    if (theme === 'yellow') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
    return 'border-orange-500/20 bg-orange-500/10 text-orange-300';
  };

  const chartStrokeFromTheme = (theme) => {
    if (theme === 'purple') return '#8b5cf6';
    if (theme === 'blue') return '#3b82f6';
    if (theme === 'green') return '#22c55e';
    if (theme === 'yellow') return '#f59e0b';
    return '#f97316';
  };

  const petThemeColor = (pet) => {
    if (!pet || !pet.name) return 'orange';
    const petAssign = {
      'Buddy II': 'orange',
      'Bailey': 'purple',
      'Max': 'blue',
      'Bluey': 'green',
      'Luna': 'yellow'
    };
    return pet.themeColor || petAssign[pet.name] || 'orange';
  };

  useEffect(() => {
    if (selectedPetId === 'all') {
      setChartMode('comparison');
    } else {
      setChartMode('standard');
    }
  }, [selectedPetId]);

  const getPetHealthProfile = (pet) => petHealthProfiles?.[pet?.id] || {};
  const sortedByMonth = (records) => [...records].sort((a, b) => (monthOrder[a.month] || 0) - (monthOrder[b.month] || 0));
  const getPetWeightHistory = (pet) => {
    const profile = getPetHealthProfile(pet);
    const records = Array.isArray(profile.weightHistory) ? profile.weightHistory : [];
    return sortedByMonth(records.map((record) => ({ month: record.month, weight: record.weight })));
  };
  const getPetProfileSnapshot = (pet) => {
    const profile = getPetHealthProfile(pet);
    return {
      ...pet,
      themeColor: petThemeColor(pet),
      temperature: profile.temperature ?? '101.2°F',
      healthStatus: profile.healthStatus ?? 'Healthy',
      medicalHistory: profile.medicalHistory ?? 'Routine wellness monitoring',
      notes: profile.notes ?? 'Stable and monitored regularly.',
      weightHistory: getPetWeightHistory(pet),
      vaccinationRegistry: Array.isArray(profile.vaccinationRegistry) ? profile.vaccinationRegistry : [],
      healthTimeline: Array.isArray(profile.healthTimeline) ? profile.healthTimeline : [],
      healthMilestones: Array.isArray(profile.healthMilestones) ? profile.healthMilestones : [],
      activeMedications: Array.isArray(profile.activeMedications) ? profile.activeMedications : [],
      vetVisits: Array.isArray(profile.vetVisits) ? profile.vetVisits : [],
      upcomingAppointments: Array.isArray(profile.upcomingAppointments) ? profile.upcomingAppointments : []
    };
  };
  const getPetTemperature = (pet) => getPetProfileSnapshot(pet).temperature;
  const getPetStatus = (pet) => getPetProfileSnapshot(pet).healthStatus;
  const getPetMedicalHistory = (pet) => getPetProfileSnapshot(pet).medicalHistory;
  const getPetNotes = (pet) => getPetProfileSnapshot(pet).notes;
  const getLatestWeightForPet = (pet) => getPetWeightHistory(pet).slice(-1)[0]?.weight;
  const getAverageTemperature = () => {
    const temps = adoptions.map((pet) => parseFloat(getPetTemperature(pet))).filter(Boolean);
    if (!temps.length) return '--';
    return `${(temps.reduce((sum, value) => sum + value, 0) / temps.length).toFixed(1)}°F`;
  };
  const getVaccinationSummary = (pet) => {
    const registry = pet ? getPetProfileSnapshot(pet).vaccinationRegistry : adoptions.flatMap((profilePet) => getPetProfileSnapshot(profilePet).vaccinationRegistry);
    const completed = registry.filter((v) => v.status === 'completed').length;
    return { completed, total: registry.length };
  };
  const selectedPetProfile = selectedPet ? getPetProfileSnapshot(selectedPet) : null;
  console.log({ selectedPet, selectedPetProfile });
  const modalPet = adoptions.find((pet) => pet.id === modalPetId) || adoptions[0] || null;
  const petDisplay = selectedPet || adoptions[0] || null;

  useEffect(() => {
    if (selectedPetId !== 'all') {
      setModalPetId(selectedPetId);
    } else if ((modalPetId === null || modalPetId === 'all') && adoptions[0]) {
      setModalPetId(adoptions[0].id);
    }
  }, [selectedPetId, modalPetId, adoptions]);

  const vaccinationRegistryForDisplay = selectedPetId === 'all'
    ? adoptions.flatMap((pet) => getPetProfileSnapshot(pet).vaccinationRegistry || [])
    : selectedPetProfile?.vaccinationRegistry || [];
  const completedVaccines = vaccinationRegistryForDisplay.filter((v) => v.status === 'completed');
  const upcomingVaccines = vaccinationRegistryForDisplay.filter((v) => v.status === 'upcoming');
  const overdueVaccines = vaccinationRegistryForDisplay.filter((v) => v.status === 'overdue');
  const timelineForDisplay = selectedPetId === 'all'
    ? adoptions.flatMap((pet) => getPetProfileSnapshot(pet).healthTimeline || [])
    : selectedPetProfile?.healthTimeline || [];
  const medicationsForDisplay = selectedPetId === 'all'
    ? adoptions.flatMap((pet) => getPetProfileSnapshot(pet).activeMedications || [])
    : selectedPetProfile?.activeMedications || [];
  const milestonesForDisplay = selectedPetId === 'all'
    ? adoptions.flatMap((pet) => getPetProfileSnapshot(pet).healthMilestones || [])
    : selectedPetProfile?.healthMilestones || [];
  const timelineGroups = selectedPetId === 'all'
    ? adoptions
        .map((pet) => ({ pet, events: getPetProfileSnapshot(pet).healthTimeline || [], milestones: getPetProfileSnapshot(pet).healthMilestones || [] }))
        .filter((group) => group.events.length || group.milestones.length)
    : [{ pet: selectedPet, events: timelineForDisplay, milestones: milestonesForDisplay }];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const chartData = months.map((month) => {
    const row = { month };
    const chartSource = chartMode === 'comparison' ? adoptions : chartPets;
    chartSource.forEach((pet) => {
      const profile = petHealthProfiles?.[pet.id];
      const history = Array.isArray(profile?.weightHistory) ? profile.weightHistory : [];
      const record = history.find((item) => item.month === month);
      if (record) row[pet.name] = record.weight;
    });
    return row;
  });

  return (
    <div className="min-h-screen pt-32 pb-40">
      <div className="container mx-auto px-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 px-4">
          <div>
            <div className="flex items-center gap-3 text-blue-400 font-black mb-2 animate-pulse">
              <Zap size={18} fill="currentColor" />
              <span className="text-[10px] tracking-[0.3em] uppercase">Real-time Biometric Sync</span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter text-white">
              Neural <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Health Hub</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 px-8 py-5 bg-white text-black font-black rounded-3xl hover:bg-blue-400 hover:text-white transition-all shadow-2xl active:scale-95 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            Add Health Record
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-12 flex flex-wrap gap-4 mb-8 px-4">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'vaccines', label: 'Vaccines' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'medications', label: 'Medications' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-full font-bold transition-all border ${activeTab === tab.id ? 'bg-white text-black shadow-2xl' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
              >
                {tab.label}
              </button>
            ))}

            {/* Pet selector tabs */}
            <div className="w-full mt-3 flex gap-2">
              {petTabs.map(pt => (
                <button key={pt.id} onClick={() => setSelectedPetId(pt.id)} className={`px-4 py-2 rounded-full text-sm font-bold ${selectedPetId === pt.id ? 'bg-white text-black' : 'bg-white/5 text-white/40'}`}>
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Left Column: Metrics & Timeline */}
          <div className="lg:col-span-8 space-y-12">
            {activeTab === 'overview' && (
              <>
                {/* Health Pulse Visualization */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Weight size={24} />,
                  label: 'Latest Weight',
                  value: selectedPet
                    ? `${getLatestWeightForPet(selectedPet) || '--'} kg`
                    : adoptions.map((pet) => `${pet.name} ${getLatestWeightForPet(pet) || '--'}kg`).join(', '),
                  trend: selectedPet ? selectedPet.name : 'All Pets',
                  color: 'orange'
                },
                {
                  icon: <Thermometer size={24} />,
                  label: 'Current Temp',
                  value: selectedPet ? getPetTemperature(selectedPet) : getAverageTemperature(),
                  trend: selectedPet ? getPetStatus(selectedPet) : 'Average',
                  color: 'emerald'
                },
                {
                  icon: <ShieldCheck size={24} />,
                  label: 'Vaccination Coverage',
                  value: (() => {
                    const { completed, total } = selectedPet ? getVaccinationSummary(selectedPet) : getVaccinationSummary(null);
                    return `${completed}/${Math.max(1, total)}`;
                  })(),
                  trend: `${overdueVaccines.length} overdue`,
                  color: 'blue'
                }
              ].map((stat, i) => (
                <motion.div 
                  key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="glass-dark p-8 rounded-[3rem] border border-white/10 group hover:border-blue-400/30 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className={`p-4 rounded-2xl bg-${stat.color === 'orange' ? 'orange' : stat.color === 'emerald' ? 'emerald' : 'blue'}-500/10 text-${stat.color === 'orange' ? 'orange' : stat.color === 'emerald' ? 'emerald' : 'blue'}-400 mb-6 w-fit`}>
                    {stat.icon}
                  </div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">{stat.value}</h3>
                  <p className="text-xs font-bold text-white/40">{stat.trend}</p>
                  <div className={`absolute -bottom-12 -right-12 w-32 h-32 bg-${stat.color === 'orange' ? 'orange' : stat.color === 'emerald' ? 'emerald' : 'blue'}-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {adoptions.map((pet) => {
                const petProfile = getPetProfileSnapshot(pet);
                const petVaccines = petProfile.vaccinationRegistry || [];
                const completed = petVaccines.filter(v => v.status === 'completed').length;
                const petMilestones = petProfile.healthMilestones || [];
                const upcoming = petVaccines.filter(v => v.status === 'upcoming').length;
                return (
                  <div key={pet.id} className={`p-6 rounded-[2.5rem] border ${petThemeClasses(petThemeColor(pet))} bg-white/5`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-white/40">{pet.name}</p>
                        <h3 className="text-2xl font-black text-white">{completed}/{Math.max(1, petVaccines.length)} Vaccines</h3>
                      </div>
                      <span className="text-3xl">{pet.image}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-white/70 mb-4">
                      <span>Upcoming</span>
                      <span>{upcoming}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
                      <div className="h-full rounded-full bg-white" style={{ width: `${Math.round((completed / Math.max(1, petVaccines.length)) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-white/40">Milestones: {petMilestones.length}</p>
                  </div>
                );
              })}
            </div>

            {/* Growth Graph Container */}
            <div className="glass-dark p-12 rounded-[4rem] border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-24 bg-blue-500/5 blur-[120px] rounded-full -z-10" />
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">Wellness Progression</h3>
                  <p className="text-white/40 text-sm font-medium mt-1">Growth & Weight Analytics (6 Mo)</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartMode('standard')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs ${chartMode === 'standard' ? 'bg-white text-black' : 'bg-white/5 text-white/40 border border-white/10'}`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setChartMode('comparison')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs ${chartMode === 'comparison' ? 'bg-white text-black' : 'bg-white/5 text-white/40 border border-white/10'}`}
                  >
                    Comparison
                  </button>
                </div>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700}} dy={15} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ stroke: 'rgba(59, 130, 246, 0.5)', strokeWidth: 2 }}
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '20px' }}
                      itemStyle={{ color: '#fff', fontSize: 14, fontWeight: 800 }}
                    />
                    <Legend wrapperStyle={{ color: '#fff', fontSize: 12, paddingTop: '10px' }} />
                    {(chartMode === 'comparison' ? adoptions : chartPets).map((pet, index) => (
                      <Area
                        key={pet.id}
                        type="monotone"
                        dataKey={pet.name}
                        stroke={chartStrokeFromTheme(pet.themeColor)}
                        strokeWidth={4}
                        fill={chartStrokeFromTheme(pet.themeColor)}
                        fillOpacity={0.15}
                        activeDot={{ r: 6, strokeWidth: 2, fill: '#ffffff' }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
            )}

            {activeTab === 'timeline' && (
              <div className="glass-dark p-12 rounded-[4rem] border border-white/10">
                <h3 className="text-3xl font-black text-white tracking-tighter mb-16 flex items-center gap-3">
                  <Clock className="text-orange-500" />
                  Evolutionary Timeline
                </h3>

              {/* Milestone Progress + Achievement Cards */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-black text-white">Milestones</h4>
                  <p className="text-sm text-white/40">{milestonesForDisplay.filter(m => m.achieved).length}/{milestonesForDisplay.length} achieved</p>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden mb-6">
                  <div className="h-3 bg-emerald-400" style={{ width: `${Math.round((milestonesForDisplay.filter(m => m.achieved).length / Math.max(1, milestonesForDisplay.length)) * 100)}%` }} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {milestonesForDisplay.map(m => (
                    <div key={m.id} className={`p-3 rounded-2xl border ${m.achieved ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-black text-white truncate">{m.title}</h5>
                        <button onClick={() => toggleMilestoneAchieved(m.id)} className="text-xs font-black text-white/40">{m.achieved ? 'Undo' : 'Mark'}</button>
                      </div>
                      <p className="text-[10px] text-white/40">{m.date || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-12">
                {timelineGroups.map((group) => (
                  <div key={group.pet?.id || 'all'} className="space-y-6">
                    {group.pet && <h4 className="text-xl font-black text-white">{group.pet.name}</h4>}
                    <div className="relative space-y-12 before:absolute before:left-8 before:top-0 before:bottom-0 before:w-1 before:bg-white/5">
                      {group.events.map((event, idx) => (
                        <motion.div 
                          key={event.id || idx} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                          className="relative pl-24 group"
                        >
                          <div className={`absolute left-5 top-1 w-7 h-7 rounded-full bg-black border-4 ${
                            event.color === 'orange' ? 'border-orange-500 shadow-orange-500/20' : 
                            event.color === 'green' ? 'border-emerald-500 shadow-emerald-500/20' : 
                            event.color === 'purple' ? 'border-purple-500 shadow-purple-500/20' : 
                            'border-blue-500 shadow-blue-500/20'
                          } z-10 transition-transform group-hover:scale-125 shadow-2xl`} />
                          
                          <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 hover:border-white/20 hover:bg-white/[0.03] transition-all">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                                  event.color === 'orange' ? 'bg-orange-500/10 text-orange-400' : 
                                  event.color === 'green' ? 'bg-emerald-500/10 text-emerald-400' : 
                                  event.color === 'purple' ? 'bg-purple-500/10 text-purple-400' : 
                                  'bg-blue-500/10 text-blue-400'
                                }`}>
                                  {renderTimelineIcon(event.icon)}
                                </div>
                                <div>
                                  <h4 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
                                    {event.title}
                                    {event.completed && <CheckCircle2 size={18} className="text-emerald-500" />}
                                  </h4>
                                  <p className="text-sm font-bold text-white/30 uppercase tracking-widest mt-1">{event.date}</p>
                                </div>
                              </div>
                              <button className="p-4 rounded-2xl bg-white/5 text-white/20 hover:text-white hover:bg-white/10 transition-all">
                                <ChevronRight />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

            {activeTab === 'vaccines' && (
              <div className="glass-dark p-12 rounded-[4rem] border border-white/10">
                <h3 className="text-3xl font-black text-white tracking-tighter mb-10 flex items-center gap-3">
                  <ShieldCheck className="text-emerald-500" />
                  Vax Registry
                </h3>
                <div className="space-y-8">
                  {overdueVaccines.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] px-4">Action Required</p>
                      {overdueVaccines.map(v => (
                        <div key={v.id} className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg"><AlertCircle size={20} /></div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-black text-white text-sm truncate uppercase tracking-tighter">{v.name}</h5>
                            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Overdue • {v.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4">Synchronizing</p>
                    {upcomingVaccines.map(v => (
                      <div key={v.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Calendar size={20} /></div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-white text-sm truncate uppercase tracking-tighter">{v.name}</h5>
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Due {v.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'medications' && (
              <div className="glass-dark p-12 rounded-[4rem] border border-white/10">
                <h3 className="text-3xl font-black text-white tracking-tighter mb-10 flex items-center gap-3">
                  <Pill className="text-blue-400" />
                  Active Meds
                </h3>
                <div className="space-y-6">
                  {medicationsForDisplay.map((med, idx) => (
                    <div key={idx} className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/30 transition-all">
                      <h4 className="text-lg font-bold text-white mb-1 uppercase tracking-widest text-sm">{med.name}</h4>
                      <p className="text-xs text-white/40 font-bold mb-6 italic">{med.dose} • {med.frequency}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Next Dose</p>
                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest animate-pulse">{med.next}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Vaccines & Medications */}
          <div className="lg:col-span-4 space-y-12">
            
            {/* Vaccination Registry */}
            <div className="glass-dark p-10 rounded-[3.5rem] border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-20 bg-emerald-500/5 blur-[80px] rounded-full -z-10" />
              <h3 className="text-2xl font-black text-white tracking-tighter mb-10 flex items-center gap-2">
                <ShieldCheck className="text-emerald-500" />
                Vax Registry
              </h3>

              <div className="space-y-8">
                {/* Overdue Section */}
                {overdueVaccines.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] px-4">Action Required</p>
                    {overdueVaccines.map(v => (
                      <div key={v.id} className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center gap-4 group/vax">
                        <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg"><AlertCircle size={20} /></div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-black text-white text-sm truncate uppercase tracking-tighter">{v.name}</h5>
                          <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Overdue • {v.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upcoming */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4">Synchronizing</p>
                  {upcomingVaccines.map(v => (
                    <div key={v.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Calendar size={20} /></div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-white text-sm truncate uppercase tracking-tighter">{v.name}</h5>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Due {v.date}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Completed */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4">Verified Safe</p>
                  <div className="flex flex-wrap gap-2 px-2">
                    {completedVaccines.map(v => (
                      <span key={v.id} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                        {v.name} ✓
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Medication Tracker */}
            <div className="glass-dark p-10 rounded-[3.5rem] border border-white/10">
              <h3 className="text-2xl font-black text-white tracking-tighter mb-10 flex items-center gap-2">
                <Pill className="text-blue-400" />
                Active Meds
              </h3>
              <div className="space-y-6">
                {medicationsForDisplay.map((med, idx) => (
                  <div key={idx} className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-pointer group">
                    <h4 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors uppercase tracking-widest text-sm">{med.name}</h4>
                    <p className="text-xs text-white/40 font-bold mb-6 italic">{med.dose} • {med.frequency}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Next Dose</p>
                      <p className="text-xs font-black text-blue-400 uppercase tracking-widest animate-pulse">{med.next}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Beacon */}
            <div className="p-10 rounded-[3.5rem] bg-gradient-to-tr from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/20 relative overflow-hidden group cursor-pointer">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Heart className="text-white/40 absolute -bottom-8 -right-8 w-40 h-40 group-hover:scale-125 transition-transform" />
              <div className="relative z-10">
                <h4 className="text-2xl font-black text-white tracking-tighter mb-2">Neural Support</h4>
                <p className="text-sm font-medium text-white/60 mb-8 leading-relaxed">Instantly relay biometric data to your primary veterinarian.</p>
                <button className="w-full py-4 bg-white text-blue-600 font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-lg">Transmit Data</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Record Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg glass-dark rounded-[3.5rem] p-10 border border-white/10 shadow-5xl relative"
            >
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setModalFormType('main');
                }}
                className="absolute top-8 right-8 p-3 glass text-white/20 hover:text-white rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
              
              {modalFormType === 'main' && (
                <>
                  <h2 className="text-4xl font-black text-white mb-8 tracking-tighter">New Record</h2>
                  <div className="space-y-4">
                     <button onClick={() => setModalFormType('weight')} className="w-full py-5 bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black font-black rounded-2xl transition-all uppercase tracking-widest text-xs">Add Weight Pulse</button>
                     <button onClick={() => setModalFormType('vaccine')} className="w-full py-5 bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black font-black rounded-2xl transition-all uppercase tracking-widest text-xs">Add Vaccine Event</button>
                     <button onClick={() => setModalFormType('medication')} className="w-full py-5 bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black font-black rounded-2xl transition-all uppercase tracking-widest text-xs">Add Medication</button>
                     <button onClick={() => setModalFormType('vet')} className="w-full py-5 bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black font-black rounded-2xl transition-all uppercase tracking-widest text-xs">Add Vet Visit / Milestone</button>
                  </div>
                </>
              )}

              {modalFormType === 'weight' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-black text-white mb-6 tracking-tighter">Weight Record</h2>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Select Pet</label>
                      <select
                        className="w-full bg-black/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={modalPetId}
                        onChange={(e) => setModalPetId(e.target.value)}
                      >
                        {adoptions.map((pet) => (
                          <option key={pet.id} value={pet.id}>{pet.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Weight Value (kg)</label>
                      <input 
                        type="number" step="0.1" placeholder="e.g. 23.5"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={weightVal}
                        onChange={(e) => setWeightVal(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setModalFormType('main')} className="px-6 py-4 glass text-white font-bold rounded-2xl text-xs uppercase">Back</button>
                    <button 
                      onClick={() => {
                          if (weightVal) {
                            addWeightRecord(weightVal, modalPetId || activePetId);
                            setWeightVal('');
                            setShowAddModal(false);
                            setModalFormType('main');
                          }
                        }}
                      className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl text-xs uppercase"
                    >
                      Save Weight
                    </button>
                  </div>
                </div>
              )}

              {modalFormType === 'vaccine' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-black text-white mb-6 tracking-tighter">Vaccination Event</h2>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Select Pet</label>
                      <select
                        className="w-full bg-black/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={modalPetId}
                        onChange={(e) => setModalPetId(e.target.value)}
                      >
                        {adoptions.map((pet) => (
                          <option key={pet.id} value={pet.id}>{pet.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Vaccine Name</label>
                      <input 
                        type="text" placeholder="e.g. Bordetella"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={vaccineForm.name}
                        onChange={(e) => setVaccineForm({...vaccineForm, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Date Administered / Due</label>
                      <input 
                        type="date"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={vaccineForm.date}
                        onChange={(e) => setVaccineForm({...vaccineForm, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Status</label>
                      <select 
                        className="w-full bg-black/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={vaccineForm.status}
                        onChange={(e) => setVaccineForm({...vaccineForm, status: e.target.value})}
                      >
                        <option value="completed">Completed</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setModalFormType('main')} className="px-6 py-4 glass text-white font-bold rounded-2xl text-xs uppercase">Back</button>
                    <button 
                      onClick={() => {
                        if (vaccineForm.name && vaccineForm.date) {
                          addVaccinationRecord(vaccineForm.name, vaccineForm.date, vaccineForm.status, modalPetId || activePetId);
                          setVaccineForm({ name: '', date: '', status: 'completed' });
                          setShowAddModal(false);
                          setModalFormType('main');
                        }
                      }}
                      className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase"
                    >
                      Save Vaccine
                    </button>
                  </div>
                </div>
              )}

              {modalFormType === 'medication' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-black text-white mb-6 tracking-tighter">Medication Tracker</h2>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Select Pet</label>
                      <select
                        className="w-full bg-black/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={modalPetId}
                        onChange={(e) => setModalPetId(e.target.value)}
                      >
                        {adoptions.map((pet) => (
                          <option key={pet.id} value={pet.id}>{pet.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Medication Name</label>
                      <input 
                        type="text" placeholder="e.g. Heartgard Plus"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={medicationForm.name}
                        onChange={(e) => setMedicationForm({...medicationForm, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Dose</label>
                      <input 
                        type="text" placeholder="e.g. 1 Tablet"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={medicationForm.dose}
                        onChange={(e) => setMedicationForm({...medicationForm, dose: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Frequency</label>
                      <input 
                        type="text" placeholder="e.g. Monthly"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={medicationForm.frequency}
                        onChange={(e) => setMedicationForm({...medicationForm, frequency: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Next Due Date</label>
                      <input 
                        type="text" placeholder="e.g. July 5th"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={medicationForm.next}
                        onChange={(e) => setMedicationForm({...medicationForm, next: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setModalFormType('main')} className="px-6 py-4 glass text-white font-bold rounded-2xl text-xs uppercase">Back</button>
                    <button 
                      onClick={() => {
                        if (medicationForm.name && medicationForm.next) {
                          addMedicationRecord(medicationForm.name, medicationForm.dose, medicationForm.frequency, medicationForm.next, modalPetId || activePetId);
                          setMedicationForm({ name: '', dose: '', frequency: '', next: '' });
                          setShowAddModal(false);
                          setModalFormType('main');
                        }
                      }}
                      className="flex-1 py-4 bg-purple-500 hover:bg-purple-600 text-white font-black rounded-2xl text-xs uppercase"
                    >
                      Save Medication
                    </button>
                  </div>
                </div>
              )}

              {modalFormType === 'vet' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-black text-white mb-6 tracking-tighter">Vet Visit / Milestone</h2>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Select Pet</label>
                      <select
                        className="w-full bg-black/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={modalPetId}
                        onChange={(e) => setModalPetId(e.target.value)}
                      >
                        {adoptions.map((pet) => (
                          <option key={pet.id} value={pet.id}>{pet.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Event Title</label>
                      <input 
                        type="text" placeholder="e.g. Wellness Exam or First Roll Over"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={vetForm.title}
                        onChange={(e) => setVetForm({...vetForm, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Event Date / Status</label>
                      <input 
                        type="text" placeholder="e.g. Completed or Due in 2 Months"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={vetForm.date}
                        onChange={(e) => setVetForm({...vetForm, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Notes</label>
                      <textarea
                        rows={4}
                        placeholder="Describe the visit or milestone details"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50 resize-none"
                        value={vetForm.notes}
                        onChange={(e) => setVetForm({...vetForm, notes: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Icon</label>
                        <select 
                          className="w-full bg-black/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                          value={vetForm.icon}
                          onChange={(e) => setVetForm({...vetForm, icon: e.target.value})}
                        >
                          <option value="stethoscope">Stethoscope</option>
                          <option value="baby">Baby (Milestone)</option>
                          <option value="clock">Clock (Reminder)</option>
                          <option value="syringe">Syringe</option>
                          <option value="pill">Pill</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Theme Color</label>
                        <select 
                          className="w-full bg-black/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                          value={vetForm.color}
                          onChange={(e) => setVetForm({...vetForm, color: e.target.value})}
                        >
                          <option value="blue">Blue</option>
                          <option value="orange">Orange</option>
                          <option value="green">Green</option>
                          <option value="purple">Purple</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Mark as Achieved</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={vetForm.achieved}
                          onChange={(e) => setVetForm({...vetForm, achieved: e.target.checked})}
                          className="accent-blue-500"
                        />
                        <span className="text-sm text-white/40">Yes, record this as completed</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setModalFormType('main')} className="px-6 py-4 glass text-white font-bold rounded-2xl text-xs uppercase">Back</button>
                    <button 
                      onClick={() => {
                        if (vetForm.title && vetForm.date) {
                          addMilestone({
                            title: vetForm.title,
                            date: vetForm.date,
                            category: vetForm.category,
                            description: vetForm.notes,
                            achieved: vetForm.achieved,
                            petId: modalPetId || activePetId
                          });
                          addTimelineRecord('exam', vetForm.title, vetForm.date, vetForm.icon, vetForm.color, vetForm.achieved, modalPetId || activePetId);
                          setVetForm({ title: '', date: '', notes: '', icon: 'stethoscope', color: 'blue', category: 'vet', achieved: true });
                          setShowAddModal(false);
                          setModalFormType('main');
                        }
                      }}
                      className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl text-xs uppercase"
                    >
                      Save Milestone
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center mt-8 italic">Changes sync to your persistent PETLY Profile.</p>
            </motion.div>
          </div>
        ) }
      </AnimatePresence>
    </div>
  );
};

export default HealthHub;

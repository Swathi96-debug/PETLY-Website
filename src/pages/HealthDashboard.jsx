import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Thermometer, Weight, Calendar, ShieldCheck, Zap, Heart, TrendingUp } from 'lucide-react';

const weightData = [
  { month: 'Jan', weight: 20 },
  { month: 'Feb', weight: 21 },
  { month: 'Mar', weight: 20.5 },
  { month: 'Apr', weight: 22 },
  { month: 'May', weight: 23 },
  { month: 'Jun', weight: 22.8 },
];

const activityData = [
  { day: 'Mon', steps: 4000 },
  { day: 'Tue', steps: 6000 },
  { day: 'Wed', steps: 8000 },
  { day: 'Thu', steps: 5500 },
  { day: 'Fri', steps: 9000 },
  { day: 'Sat', steps: 12000 },
  { day: 'Sun', steps: 3000 },
];

const HealthDashboard = () => {
  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-6">
        <motion.header 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16"
        >
          <div>
            <div className="flex items-center gap-3 text-orange-400 font-bold mb-2">
              <Zap size={18} fill="currentColor" />
              <span className="text-sm tracking-widest uppercase">Live Wellness Sync</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white">
              Buddy's <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">Health Hub</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4 glass-dark p-2 rounded-2xl border border-white/10">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center font-bold text-xl shadow-lg shadow-orange-500/20">B</div>
            <div className="pr-4">
              <p className="text-sm font-bold text-white">Buddy</p>
              <p className="text-xs text-white/40 font-medium">Golden Retriever</p>
            </div>
          </div>
        </motion.header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            { icon: <Weight />, label: 'Current Weight', value: '22.8 kg', trend: '-0.2 kg', color: 'orange' },
            { icon: <Thermometer />, label: 'Body Temp', value: '38.5 °C', trend: 'Optimal', color: 'emerald' },
            { icon: <Activity />, label: 'Daily Steps', value: '9,240', trend: '+15%', color: 'blue' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="glass-dark p-8 rounded-[2rem] border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all"
            >
              <div className={`p-4 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-400 mb-6 w-fit`}>
                {stat.icon}
              </div>
              <p className="text-sm font-bold text-white/30 uppercase tracking-wider mb-2">{stat.label}</p>
              <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">{stat.value}</h3>
              <p className={`text-sm font-bold text-${stat.color}-400 flex items-center gap-1`}>
                <TrendingUp size={14} /> {stat.trend}
              </p>
              {/* Subtle background glow */}
              <div className={`absolute -bottom-12 -right-12 w-32 h-32 bg-${stat.color}-500/10 blur-[50px] rounded-full group-hover:scale-150 transition-transform`} />
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-dark p-10 rounded-[2.5rem] border border-white/10"
          >
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-bold text-white tracking-tight">Weight Progression</h3>
              <div className="text-xs font-bold text-white/40 border border-white/10 px-3 py-1 rounded-full uppercase tracking-wider">H1 2026</div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightData}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9F1C" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF9F1C" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="weight" stroke="#FF9F1C" strokeWidth={4} fillOpacity={1} fill="url(#colorWeight)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-dark p-10 rounded-[2.5rem] border border-white/10"
          >
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-bold text-white tracking-tight">Activity Analysis</h3>
              <div className="text-xs font-bold text-white/40 border border-white/10 px-3 py-1 rounded-full uppercase tracking-wider">Weekly</div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="steps" fill="#A0C4FF" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                <Heart size={20} />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Vital Reminders</h3>
            </div>
            <div className="space-y-6">
              {[
                { label: 'Rabies Booster', date: 'July 15, 2026', type: 'High Priority', color: 'orange' },
                { label: 'Annual Flea Check', date: 'Aug 02, 2026', type: 'Medium', color: 'blue' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                  <div>
                    <h4 className="font-bold text-white mb-1">{item.label}</h4>
                    <p className="text-sm text-white/40 font-medium">{item.date}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full bg-${item.color === 'orange' ? 'orange' : 'blue'}-500/10 text-${item.color === 'orange' ? 'orange' : 'blue'}-400 text-[10px] font-black uppercase tracking-widest`}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Recent Sessions</h3>
            </div>
            <div className="space-y-6">
              {[
                { label: 'Full Grooming', doctor: 'Top Bark Salon', date: 'June 18, 2026' },
                { label: 'Vet Consultation', doctor: 'Dr. Sarah Miller', date: 'May 12, 2026' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-bold text-white/20">0{i+1}</div>
                  <div>
                    <h4 className="font-bold text-white mb-1 uppercase tracking-tighter">{item.label}</h4>
                    <p className="text-sm text-white/40 font-medium">{item.doctor} • {item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;

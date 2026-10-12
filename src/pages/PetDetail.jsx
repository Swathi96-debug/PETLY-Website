import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, PawPrint, Activity, Calendar, Shield, Heart, Info, AlertCircle, Loader2 } from 'lucide-react';
import { petsAPI } from '../services/api';
import { useEcosystem } from '../context/EcosystemContext';

const PetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adoptions } = useEcosystem();

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadPet = async () => {
      setLoading(true);
      setError(null);

      // First check local adoptions context
      const localMatch = adoptions.find((p) => (p._id === id || p.id === id || String(p.id) === String(id)));
      if (localMatch) {
        setPet(localMatch);
      }

      // Try fetching from MongoDB API
      try {
        const response = await petsAPI.getById(id);
        if (isMounted && response?.success && response?.pet) {
          setPet(response.pet);
        }
      } catch (err) {
        // If not found in API and no local match, display error
        if (isMounted && !localMatch) {
          setError(err.message || 'Companion profile not found.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPet();
    return () => {
      isMounted = false;
    };
  }, [id, adoptions]);

  if (loading) {
    return (
      <div className="min-h-screen pt-36 pb-20 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
        <p className="text-white/60 font-medium text-sm">Loading pet details...</p>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen pt-36 pb-20 container mx-auto px-6 max-w-2xl text-center">
        <div className="glass-dark p-12 rounded-[2.5rem] border border-white/10">
          <AlertCircle size={48} className="text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Pet Not Found</h2>
          <p className="text-white/40 mb-6 text-sm">{error || 'This pet record does not exist or has been removed.'}</p>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
            <ArrowLeft size={16} /> Return to Profile
          </Link>
        </div>
      </div>
    );
  }

  const isImg = pet.photoUrl && (pet.photoUrl.startsWith('http') || pet.photoUrl.startsWith('/'));

  return (
    <div className="min-h-screen pt-32 pb-40">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Navigation back */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 text-sm font-bold transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-dark rounded-[3rem] p-10 lg:p-14 border border-white/10 relative overflow-hidden mb-10 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 blur-[100px] rounded-full -z-10" />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar / Photo */}
            <div className="w-36 h-36 md:w-44 md:h-44 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {isImg ? (
                <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">{pet.photoUrl || pet.image || '🐾'}</span>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-4xl font-black text-white tracking-tight">{pet.name}</h1>
                <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-wider">
                  {pet.species || 'Companion'}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium">
                  {pet.gender || 'Unknown'}
                </span>
              </div>
              <p className="text-base text-white/50 mb-6 font-medium">
                {pet.breed || 'Mixed'} {pet.age ? `• ${pet.age} years old` : ''}
              </p>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  <Activity size={14} />
                  <span>{pet.healthStatus || 'Healthy'}</span>
                </div>
                {pet.weight && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold">
                    <span>{pet.weight} kg</span>
                  </div>
                )}
                {pet.isAdoptable && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
                    <Heart size={14} />
                    <span>Adoptable</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pet Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Profile Overview */}
          <div className="glass-dark p-8 rounded-[2rem] border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Info size={18} className="text-orange-400" />
              General Information
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/40 font-medium">Species</span>
                <span className="text-white font-bold capitalize">{pet.species}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/40 font-medium">Breed</span>
                <span className="text-white font-bold">{pet.breed || 'Mixed'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/40 font-medium">Age</span>
                <span className="text-white font-bold">{pet.age ? `${pet.age} yrs` : 'Unknown'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/40 font-medium">Gender</span>
                <span className="text-white font-bold capitalize">{pet.gender || 'Unknown'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/40 font-medium">Weight</span>
                <span className="text-white font-bold">{pet.weight ? `${pet.weight} kg` : 'N/A'}</span>
              </div>
              {pet.height && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40 font-medium">Height</span>
                  <span className="text-white font-bold">{pet.height}</span>
                </div>
              )}
              {pet.temperature && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40 font-medium">Temperature</span>
                  <span className="text-white font-bold">{pet.temperature}</span>
                </div>
              )}
              {(pet.color || pet.themeColor) && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40 font-medium">Color</span>
                  <span className="text-white font-bold capitalize">{pet.color || pet.themeColor}</span>
                </div>
              )}
              {pet.dob && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40 font-medium">Date of Birth</span>
                  <span className="text-white font-bold">{pet.dob}</span>
                </div>
              )}
              {pet.adoptionDate && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40 font-medium">Adoption Date</span>
                  <span className="text-white font-bold">{pet.adoptionDate}</span>
                </div>
              )}
              {((Array.isArray(pet.allergies) && pet.allergies.length > 0) || (typeof pet.allergies === 'string' && pet.allergies.trim())) && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40 font-medium">Allergies</span>
                  <span className="text-red-400 font-bold text-right max-w-[200px]">
                    {Array.isArray(pet.allergies) ? pet.allergies.join(', ') : pet.allergies}
                  </span>
                </div>
              )}
              {((Array.isArray(pet.medicalConditions) && pet.medicalConditions.length > 0) || (typeof pet.medicalConditions === 'string' && pet.medicalConditions.trim())) && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40 font-medium">Medical Conditions</span>
                  <span className="text-amber-400 font-bold text-right max-w-[200px]">
                    {Array.isArray(pet.medicalConditions) ? pet.medicalConditions.join(', ') : pet.medicalConditions}
                  </span>
                </div>
              )}
              {pet.microchipNumber && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/40 font-medium">Microchip ID</span>
                  <span className="text-white font-mono text-xs font-bold">{pet.microchipNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description & Health Notes */}
          <div className="glass-dark p-8 rounded-[2rem] border border-white/10 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Shield size={18} className="text-emerald-400" />
                Notes & Description
              </h3>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line mb-6">
                {pet.description || 'No specific notes recorded for this pet yet. Regular wellness visits are tracked in the Health Hub.'}
              </p>
            </div>

            {pet.photoKey && (
              <div className="pt-4 border-t border-white/5 text-[11px] text-white/30 flex items-center justify-between font-mono">
                <span>AWS S3 Object Key:</span>
                <span className="truncate max-w-[200px]" title={pet.photoKey}>{pet.photoKey}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-end">
          <Link
            to="/health"
            className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center gap-2"
          >
            <Activity size={18} />
            Open in Health Hub
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PetDetail;

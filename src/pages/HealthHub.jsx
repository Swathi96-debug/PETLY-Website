import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Activity, Thermometer, Weight, Calendar, ShieldCheck, Zap, 
  Heart, TrendingUp, Clock, AlertCircle, Syringe, Pill, 
  Stethoscope, Baby, ChevronRight, CheckCircle2, X,
  FileText, Upload, Download, Trash2, ExternalLink, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { useAuth } from '../context/AuthContext';
import { useEcosystem, normalizeThemeColor, VALID_THEMES } from '../context/EcosystemContext';

export const PET_THEMES = {
  purple: {
    name: 'Purple',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    dot: 'bg-purple-500',
    hex: '#8b5cf6',
  },
  blue: {
    name: 'Blue',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    dot: 'bg-sky-500',
    hex: '#3b82f6',
  },
  green: {
    name: 'Green',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    hex: '#10b981',
  },
  pink: {
    name: 'Pink',
    badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    border: 'border-pink-500/30',
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    dot: 'bg-pink-500',
    hex: '#ec4899',
  },
  orange: {
    name: 'Orange',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    dot: 'bg-orange-500',
    hex: '#f97316',
  },
  cyan: {
    name: 'Cyan',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    dot: 'bg-cyan-500',
    hex: '#06b6d4',
  },
  yellow: {
    name: 'Yellow',
    badge: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    border: 'border-amber-400/30',
    bg: 'bg-amber-400/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    hex: '#f59e0b',
  },
  red: {
    name: 'Red',
    badge: 'bg-red-500/15 text-red-300 border-red-500/30',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    dot: 'bg-red-500',
    hex: '#ef4444',
  },
};

const HealthHub = () => {
  const { user } = useAuth();
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
    bookings,
    // Phase 4B
    mongoHealthRecords,
    healthLoading,
    healthError,
    fetchHealthRecords,
    createHealthRecord,
    updateHealthRecord,
    deleteHealthRecord,
    mongoDocuments,
    documentsLoading,
    documentsError,
    fetchMedicalDocuments,
    uploadMedicalDocument,
    deleteMedicalDocument,
    getDocumentPresignedUrl,
  } = useEcosystem();

  const [selectedPetId, setSelectedPetId] = useState('all');
  const [chartMode, setChartMode] = useState('standard');
  const [modalPetId, setModalPetId] = useState(null);

  // Build pet tabs from adoptions (include guest demo pet)
  const petTabs = [{ id: 'all', label: 'All Pets' }, ...adoptions.map(p => ({ id: p._id || p.id, label: p.name }))];

  const selectedPet = selectedPetId === 'all' ? null : adoptions.find((pet) => (pet._id || pet.id) === selectedPetId);
  const activePetId = selectedPetId === 'all' ? (adoptions[0]?._id || adoptions[0]?.id || null) : selectedPetId;
  const chartPets = selectedPetId === 'all' ? adoptions : selectedPet ? [selectedPet] : [];
  const monthOrder = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const chartColors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6'];

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalFormType, setModalFormType] = useState('main'); // 'main', 'weight', 'vaccine', 'medication', 'vet'
  const [weightVal, setWeightVal] = useState('');
  const [weightDate, setWeightDate] = useState('');
  const [vaccineForm, setVaccineForm] = useState({ name: '', date: '', status: 'completed' });
  const [medicationForm, setMedicationForm] = useState({ name: '', dose: '', frequency: '', next: '' });
  const [vetForm, setVetForm] = useState({ title: '', date: '', notes: '', icon: 'stethoscope', color: 'blue', category: 'vet', achieved: true, status: 'completed' });

  // Phase 4B S3 Medical Documents state
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('lab_result');
  const [docNotes, setDocNotes] = useState('');
  const [docPetId, setDocPetId] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [docActionError, setDocActionError] = useState(null);
  const [openingDocId, setOpeningDocId] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [healthActionLoading, setHealthActionLoading] = useState(false);
  const [healthActionError, setHealthActionError] = useState(null);

  const filteredDocuments = useMemo(() => {
    if (!Array.isArray(mongoDocuments)) return [];
    if (selectedPetId === 'all') return mongoDocuments;
    return mongoDocuments.filter((d) => (d.pet?._id || d.pet?.id || d.pet) === selectedPetId);
  }, [mongoDocuments, selectedPetId]);

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
    const t = normalizeThemeColor(theme);
    const themeObj = PET_THEMES[t] || PET_THEMES.orange;
    return `${themeObj.border} ${themeObj.bg} ${themeObj.text}`;
  };

  const chartStrokeFromTheme = (theme) => {
    const t = normalizeThemeColor(theme);
    return PET_THEMES[t]?.hex || '#f97316';
  };

  const petThemeColor = (pet) => {
    return normalizeThemeColor(pet?.themeColor, pet?.name);
  };

  useEffect(() => {
    if (selectedPetId === 'all') {
      setChartMode('comparison');
    } else {
      setChartMode('standard');
    }
  }, [selectedPetId]);

  // Phase 4B Backend sync on user authentication: maintain all pets' health records
  useEffect(() => {
    if (user) {
      fetchHealthRecords();
      fetchMedicalDocuments();
    }
  }, [user, fetchHealthRecords, fetchMedicalDocuments]);

  // S3 Medical Document Handlers
  const handleOpenDocument = async (docId) => {
    try {
      setOpeningDocId(docId);
      const url = await getDocumentPresignedUrl(docId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err.message || 'Failed to generate secure presigned URL');
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleDocumentUploadSubmit = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setDocActionError('Please select a file to upload.');
      return;
    }
    if (!docTitle.trim()) {
      setDocActionError('Please provide a document title.');
      return;
    }
    const targetPetId = docPetId || activePetId;
    if (!targetPetId) {
      setDocActionError('Please select a pet for this document.');
      return;
    }

    try {
      setDocUploading(true);
      setDocActionError(null);
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('pet', targetPetId);
      formData.append('title', docTitle.trim());
      formData.append('category', docCategory);
      formData.append('notes', docNotes.trim());

      await uploadMedicalDocument(formData);
      setShowUploadDocModal(false);
      setDocFile(null);
      setDocTitle('');
      setDocCategory('lab_result');
      setDocNotes('');
    } catch (err) {
      setDocActionError(err.message || 'Failed to upload medical document');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this medical document from S3 and your database?')) return;
    try {
      setDeletingDocId(docId);
      await deleteMedicalDocument(docId);
    } catch (err) {
      alert(err.message || 'Failed to delete medical document');
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleDeleteHealthRecord = async (recordId) => {
    try {
      await deleteHealthRecord(recordId);
    } catch (err) {
      alert(err.message || 'Failed to delete health record');
    }
  };

  // Canonical Enum Mappings for Form Submissions (Constraint 3)
  const handleSaveWeight = async () => {
    if (!weightVal) return;
    const targetPetId = modalPetId || activePetId;
    try {
      setHealthActionLoading(true);
      await createHealthRecord({
        pet: targetPetId,
        type: 'weight',
        title: 'Weight Measurement',
        value: String(weightVal),
        date: weightDate ? new Date(weightDate).toISOString() : new Date().toISOString(),
      });
      setWeightVal('');
      setWeightDate('');
      setShowAddModal(false);
      setModalFormType('main');
    } catch (err) {
      alert(err.message || 'Failed to save weight record');
    } finally {
      setHealthActionLoading(false);
    }
  };

  const handleSaveVaccine = async () => {
    if (!vaccineForm.name || !vaccineForm.date) return;
    const targetPetId = modalPetId || activePetId;
    try {
      setHealthActionLoading(true);
      // Map UI "vaccine" to canonical backend enum "vaccination"
      await createHealthRecord({
        pet: targetPetId,
        type: 'vaccination',
        title: vaccineForm.name,
        date: vaccineForm.date,
        status: vaccineForm.status || 'completed',
      });
      setVaccineForm({ name: '', date: '', status: 'completed' });
      setShowAddModal(false);
      setModalFormType('main');
    } catch (err) {
      alert(err.message || 'Failed to save vaccine record');
    } finally {
      setHealthActionLoading(false);
    }
  };

  const handleSaveMedication = async () => {
    if (!medicationForm.name) return;
    const targetPetId = modalPetId || activePetId;
    try {
      setHealthActionLoading(true);
      // Map to canonical backend enum "medication"
      await createHealthRecord({
        pet: targetPetId,
        type: 'medication',
        title: medicationForm.name,
        value: medicationForm.dose || '',
        description: `${medicationForm.frequency || 'Daily'}${medicationForm.next ? ` | Next: ${medicationForm.next}` : ''}`,
        status: 'ongoing',
      });
      setMedicationForm({ name: '', dose: '', frequency: '', next: '' });
      setShowAddModal(false);
      setModalFormType('main');
    } catch (err) {
      alert(err.message || 'Failed to save medication record');
    } finally {
      setHealthActionLoading(false);
    }
  };

  const handleSaveMilestone = async () => {
    if (!vetForm.title) return;
    const targetPetId = modalPetId || activePetId;
    try {
      setHealthActionLoading(true);
      let recordDate = vetForm.date;
      let recordStatus = vetForm.status || (vetForm.achieved ? 'completed' : 'scheduled');

      if (typeof recordDate === 'string') {
        const trimmed = recordDate.trim().toLowerCase();
        if (['completed', 'scheduled', 'upcoming', 'overdue', 'ongoing'].includes(trimmed)) {
          recordStatus = trimmed;
          recordDate = new Date().toISOString().split('T')[0];
        }
      }
      if (!recordDate) {
        recordDate = new Date().toISOString().split('T')[0];
      }

      // Map UI "vet" to canonical backend enum "appointment"
      await createHealthRecord({
        pet: targetPetId,
        type: 'appointment',
        title: vetForm.title,
        date: recordDate,
        notes: vetForm.notes || '',
        description: vetForm.notes || '',
        status: recordStatus,
      });
      setVetForm({ title: '', date: '', notes: '', icon: 'stethoscope', color: 'blue', category: 'vet', achieved: true, status: 'completed' });
      setShowAddModal(false);
      setModalFormType('main');
    } catch (err) {
      alert(err.message || 'Failed to save health milestone');
    } finally {
      setHealthActionLoading(false);
    }
  };

  const getPetHealthProfile = (pet) => petHealthProfiles?.[pet?.id] || petHealthProfiles?.[pet?._id] || {};
  const sortedByMonth = (records) => [...records].sort((a, b) => (monthOrder[a.month] || 0) - (monthOrder[b.month] || 0));
  const getPetWeightHistory = (pet) => {
    const profile = getPetHealthProfile(pet);
    const records = Array.isArray(profile.weightHistory) ? profile.weightHistory : [];
    return sortedByMonth(records.map((record) => ({ month: record.month, weight: record.weight })));
  };
  const getPetProfileSnapshot = (pet) => {
    const profile = getPetHealthProfile(pet);
    const petIdStr = String(pet?._id || pet?.id || '');

    const pTheme = petThemeColor(pet);
    const pName = pet?.name || 'Pet';
    const resolvedTemp = pet?.temperature
      ? (String(pet.temperature).includes('°') ? pet.temperature : `${pet.temperature}°F`)
      : (profile.temperature ?? '101.2°F');

    // Match records for this pet from mongoHealthRecords
    const petMongoRecords = Array.isArray(mongoHealthRecords)
      ? mongoHealthRecords.filter((r) => {
          const recPetId = String(r.pet?._id || r.pet?.id || r.pet || '');
          return recPetId === petIdStr;
        })
      : [];

    // 1. Vaccination Registry
    const mongoVaccines = petMongoRecords
      .filter((r) => r.type === 'vaccination')
      .map((r) => ({
        id: r._id || r.id,
        petId: petIdStr,
        petName: pName,
        petTheme: pTheme,
        name: r.title || r.name || 'Vaccine',
        date: r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]) : 'Recent',
        status: r.status || 'completed',
        notes: r.notes || r.description || '',
        isHistorical: Boolean(r.isHistorical),
      }));
    const vaccinationRegistry = user
      ? mongoVaccines
      : (mongoVaccines.length > 0
          ? mongoVaccines
          : (Array.isArray(profile.vaccinationRegistry) ? profile.vaccinationRegistry.map(v => ({ ...v, petName: pName, petTheme: pTheme })) : []));

    // 2. Active Medications
    const mongoMedications = petMongoRecords
      .filter((r) => r.type === 'medication' && (r.status === 'ongoing' || r.status === 'active' || !r.status))
      .map((r) => {
        const parts = (r.description || '').split('|');
        const freqPart = parts[0]?.trim() || (r.notes?.includes('Daily') ? 'Daily' : 'Daily');
        const nextPart = r.description?.includes('Next:')
          ? r.description.split('Next:')[1]?.trim()
          : (r.notes?.includes('Next:') ? r.notes.split('Next:')[1]?.trim() : (r.next || 'Ongoing'));
        return {
          id: r._id || r.id,
          petId: petIdStr,
          petName: pName,
          petTheme: pTheme,
          name: r.title || r.name || 'Medication',
          dose: r.value || r.dose || '1 dose',
          frequency: freqPart,
          next: nextPart,
          status: r.status || 'ongoing',
          notes: r.notes || r.description || '',
          isHistorical: Boolean(r.isHistorical),
        };
      });
    const activeMedications = user
      ? mongoMedications
      : (mongoMedications.length > 0
          ? mongoMedications
          : (Array.isArray(profile.activeMedications) ? profile.activeMedications.map(m => ({ ...m, petName: pName, petTheme: pTheme })) : []));

    // 3. Weight History
    const mongoWeightHistory = petMongoRecords
      .filter((r) => r.type === 'weight')
      .map((r) => {
        const rawDate = r.date || r.createdAt || Date.now();
        const d = new Date(rawDate);
        const validDate = isNaN(d.getTime()) ? new Date() : d;
        const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(validDate);
        const year = validDate.getUTCFullYear();
        const dateStr = validDate.toISOString().split('T')[0];
        const createdTimestamp = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        return {
          id: r._id || r.id,
          petName: pName,
          petTheme: pTheme,
          month,
          year,
          weight: parseFloat(r.value) || 0,
          date: dateStr,
          rawDate,
          timestamp: validDate.getTime(),
          createdTimestamp,
        };
      });
    const weightHistory = mongoWeightHistory.length > 0
      ? [...mongoWeightHistory].sort((a, b) => {
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
          return a.createdTimestamp - b.createdTimestamp;
        })
      : (Array.isArray(profile.weightHistory) ? profile.weightHistory.map(w => ({ ...w, petName: pName, petTheme: pTheme })) : []);

    const formatMilestoneDate = (rawDate) => {
      if (!rawDate) return '—';
      if (typeof rawDate === 'string') {
        const trimmed = rawDate.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
          return trimmed.split('T')[0];
        }
        if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
      }
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${year}-${month}-${day}`;
      }
      return String(rawDate);
    };

    // 4. Milestones
    const mongoMilestones = petMongoRecords
      .filter((r) => {
        if (r.type === 'vaccination' || r.type === 'weight' || r.type === 'medication') return false;
        if (r.type === 'appointment') return r.status === 'completed';
        return true;
      })
      .map((r) => {
        const milestoneNotes = r.notes || r.description || '';
        return {
          id: r._id || r.id,
          petId: petIdStr,
          petName: pName,
          petTheme: pTheme,
          title: r.title || 'Health Milestone',
          date: formatMilestoneDate(r.date),
          category: r.type === 'appointment' ? 'vet' : 'health',
          achieved: (r.status === 'completed') || Boolean(r.achieved),
          status: r.status || (r.achieved ? 'completed' : 'scheduled'),
          description: milestoneNotes,
          notes: milestoneNotes,
          isHistorical: Boolean(r.isHistorical),
        };
      });
    const healthMilestones = user
      ? mongoMilestones
      : (mongoMilestones.length > 0
          ? mongoMilestones
          : (Array.isArray(profile.healthMilestones) ? profile.healthMilestones.map(m => ({
              ...m,
              petName: pName,
              petTheme: pTheme,
              date: formatMilestoneDate(m.date),
              notes: m.notes || m.description || '',
              description: m.notes || m.description || '',
              status: m.status || (m.achieved ? 'completed' : 'scheduled'),
            })) : []));

    // 5. Timeline (combined events)
    const mongoTimeline = petMongoRecords.map((r) => {
      let icon = 'clock';
      let color = 'blue';
      if (r.type === 'vaccination') {
        icon = 'syringe';
        color = r.status === 'completed' ? 'green' : 'orange';
      } else if (r.type === 'medication') {
        icon = 'pill';
        color = 'purple';
      } else if (r.type === 'appointment') {
        icon = 'stethoscope';
        color = 'blue';
      } else if (r.type === 'weight') {
        icon = 'clock';
        color = 'orange';
      }
      return {
        id: r._id || r.id,
        petId: petIdStr,
        petName: pName,
        petTheme: pTheme,
        title: r.title || (r.type === 'weight' ? `Weight: ${r.value} kg` : 'Health Event'),
        date: formatMilestoneDate(r.date),
        icon,
        color,
        completed: r.status === 'completed',
        status: r.status || (r.completed ? 'completed' : 'scheduled'),
        notes: r.notes || r.description || '',
        description: r.notes || r.description || '',
        isHistorical: Boolean(r.isHistorical),
      };
    });
    const healthTimeline = user
      ? mongoTimeline
      : (mongoTimeline.length > 0
          ? mongoTimeline
          : (Array.isArray(profile.healthTimeline) ? profile.healthTimeline.map(e => ({
              ...e,
              petName: pName,
              petTheme: pTheme,
              date: formatMilestoneDate(e.date),
              notes: e.notes || e.description || '',
              description: e.notes || e.description || '',
              status: e.status || (e.completed ? 'completed' : 'scheduled'),
            })) : []));

    // 6. Appointments
    const mongoAppointments = petMongoRecords
      .filter((r) => r.type === 'appointment' && (r.status === 'scheduled' || r.status === 'upcoming'))
      .map((r) => ({
        id: r._id || r.id,
        petId: petIdStr,
        petName: pName,
        petTheme: pTheme,
        title: r.title || 'Appointment',
        date: formatMilestoneDate(r.date),
        status: r.status || 'scheduled',
        notes: r.notes || r.description || '',
        provider: r.value || r.notes || 'Veterinarian',
      }));
    const upcomingAppointments = user
      ? mongoAppointments
      : (mongoAppointments.length > 0
          ? mongoAppointments
          : (Array.isArray(profile.upcomingAppointments) ? profile.upcomingAppointments : []));

    return {
      ...pet,
      themeColor: pTheme,
      temperature: resolvedTemp,
      healthStatus: profile.healthStatus ?? 'Healthy',
      medicalHistory: profile.medicalHistory ?? (pet.description || 'Routine wellness monitoring'),
      notes: profile.notes ?? (pet.description || 'Stable and monitored regularly.'),
      weightHistory,
      vaccinationRegistry,
      healthTimeline,
      healthMilestones,
      activeMedications,
      upcomingAppointments,
      vetVisits: Array.isArray(profile.vetVisits) ? profile.vetVisits : [],
    };
  };
  const getPetTemperature = (pet) => getPetProfileSnapshot(pet).temperature;
  const getPetStatus = (pet) => getPetProfileSnapshot(pet).healthStatus;
  const getPetMedicalHistory = (pet) => getPetProfileSnapshot(pet).medicalHistory;
  const getPetNotes = (pet) => getPetProfileSnapshot(pet).notes;
  const getLatestWeightForPet = (pet) => {
    const snapshot = getPetProfileSnapshot(pet);
    const history = Array.isArray(snapshot?.weightHistory) ? snapshot.weightHistory : [];
    if (history.length > 0) {
      const sorted = [...history].sort((a, b) => {
        const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
        const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
        return timeA - timeB;
      });
      const latest = sorted[sorted.length - 1];
      if (latest && latest.weight !== undefined) return latest.weight;
    }
    return pet?.weight !== undefined ? pet.weight : '--';
  };
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

  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);

    const sourcePets = chartMode === 'comparison' ? adoptions : chartPets;
    sourcePets.forEach((p) => {
      const snapshot = getPetProfileSnapshot(p);
      const history = Array.isArray(snapshot?.weightHistory) ? snapshot.weightHistory : [];
      history.forEach((rec) => {
        const y = rec.year || (rec.date ? new Date(rec.date).getUTCFullYear() : null);
        if (y && !isNaN(y)) {
          yearsSet.add(y);
        }
      });
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [adoptions, chartPets, chartMode, mongoHealthRecords]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData = useMemo(() => {
    return months.map((month) => {
      const row = { month };
      const chartSource = chartMode === 'comparison' ? adoptions : chartPets;
      chartSource.forEach((pet) => {
        const snapshot = getPetProfileSnapshot(pet);
        const history = Array.isArray(snapshot?.weightHistory) ? snapshot.weightHistory : [];
        const recordsInYearMonth = history.filter((item) => {
          const itemYear = item.year || (item.date ? new Date(item.date).getUTCFullYear() : null);
          return itemYear === selectedYear && item.month === month;
        });
        if (recordsInYearMonth.length > 0) {
          const latestInMonth = recordsInYearMonth[recordsInYearMonth.length - 1];
          row[pet.name] = latestInMonth.weight;
          row[`${pet.name}_date`] = latestInMonth.date;
        } else {
          row[pet.name] = null;
        }
      });
      return row;
    });
  }, [months, chartMode, adoptions, chartPets, selectedYear, mongoHealthRecords]);

  const hasYearData = useMemo(() => {
    const chartSource = chartMode === 'comparison' ? adoptions : chartPets;
    return chartSource.some((pet) => {
      const snapshot = getPetProfileSnapshot(pet);
      const history = Array.isArray(snapshot?.weightHistory) ? snapshot.weightHistory : [];
      return history.some((item) => {
        const itemYear = item.year || (item.date ? new Date(item.date).getUTCFullYear() : null);
        return itemYear === selectedYear;
      });
    });
  }, [chartMode, adoptions, chartPets, selectedYear, mongoHealthRecords]);

  const CustomWeightTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const validEntries = payload.filter((entry) => entry.value !== null && entry.value !== undefined);
      if (validEntries.length === 0) return null;
      return (
        <div className="bg-black/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
          <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2">{label} {selectedYear}</p>
          {validEntries.map((entry, idx) => {
            const petName = entry.dataKey;
            const dateStr = entry.payload?.[`${petName}_date`];
            return (
              <div key={idx} className="flex flex-col gap-0.5 mb-2 last:mb-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.stroke || entry.color }} />
                  <span className="text-sm font-bold text-white">{petName}:</span>
                  <span className="text-sm font-black text-emerald-400">{entry.value} kg</span>
                </div>
                {dateStr && (
                  <span className="text-[10px] text-white/40 pl-4.5">Recorded: {dateStr}</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

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
              { id: 'medications', label: 'Medications' },
              { id: 'documents', label: 'Medical Documents' }
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
            <div className="w-full mt-3 flex flex-wrap gap-2">
              {petTabs.map(pt => {
                const isSelected = selectedPetId === pt.id;
                const petObj = pt.id === 'all' ? null : adoptions.find(p => (p.id === pt.id || p._id === pt.id));
                const themeObj = petObj ? (PET_THEMES[normalizeThemeColor(petObj.themeColor, petObj.name)] || PET_THEMES.orange) : null;
                return (
                  <button 
                    key={pt.id} 
                    onClick={() => setSelectedPetId(pt.id)} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                      isSelected 
                        ? 'bg-white text-black shadow-lg scale-105' 
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {themeObj && <span className={`w-2 h-2 rounded-full ${themeObj.dot}`} />}
                    <span>{pt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left Column: Metrics & Timeline */}
          <div className="lg:col-span-8 space-y-12">
            {activeTab === 'overview' && (
              <>
                {/* Health Pulse Visualization */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 1. Latest Weight Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                    className="glass-dark p-8 rounded-[3rem] border border-white/10 group hover:border-orange-400/30 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                  >
                    <div>
                      <div className="p-4 rounded-2xl bg-orange-500/10 text-orange-400 mb-6 w-fit">
                        <Weight size={24} />
                      </div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Latest Weight</p>
                      {selectedPet ? (
                        <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">
                          {getLatestWeightForPet(selectedPet)} kg
                        </h3>
                      ) : (
                        <div className="space-y-1.5 my-2">
                          {adoptions.map(pet => {
                            const pTheme = PET_THEMES[normalizeThemeColor(pet.themeColor, pet.name)] || PET_THEMES.orange;
                            return (
                              <div key={pet._id || pet.id} className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 font-bold text-white/80">
                                  <span className={`w-2 h-2 rounded-full ${pTheme.dot}`} />
                                  {pet.name}
                                </span>
                                <span className="font-black text-white">{getLatestWeightForPet(pet)} kg</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white/40">{selectedPet ? selectedPet.name : 'All Pets'}</p>
                    <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-orange-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>

                  {/* 2. Current Temp Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="glass-dark p-8 rounded-[3rem] border border-white/10 group hover:border-emerald-400/30 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                  >
                    <div>
                      <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-6 w-fit">
                        <Thermometer size={24} />
                      </div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Current Temp</p>
                      {selectedPet ? (
                        <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">
                          {getPetTemperature(selectedPet)}
                        </h3>
                      ) : (
                        <div className="space-y-1.5 my-2">
                          {adoptions.map(pet => {
                            const pTheme = PET_THEMES[normalizeThemeColor(pet.themeColor, pet.name)] || PET_THEMES.orange;
                            return (
                              <div key={pet._id || pet.id} className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 font-bold text-white/80">
                                  <span className={`w-2 h-2 rounded-full ${pTheme.dot}`} />
                                  {pet.name}
                                </span>
                                <span className="font-black text-white">{getPetTemperature(pet)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white/40">{selectedPet ? getPetStatus(selectedPet) : 'Per-Pet Biometrics'}</p>
                    <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>

                  {/* 3. Vaccination Coverage Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="glass-dark p-8 rounded-[3rem] border border-white/10 group hover:border-blue-400/30 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                  >
                    <div>
                      <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 mb-6 w-fit">
                        <ShieldCheck size={24} />
                      </div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Vaccination Coverage</p>
                      <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">
                        {(() => {
                          const { completed, total } = selectedPet ? getVaccinationSummary(selectedPet) : getVaccinationSummary(null);
                          return `${completed}/${Math.max(1, total)}`;
                        })()}
                      </h3>
                    </div>
                    <p className="text-xs font-bold text-white/40">
                      {selectedPet
                        ? `${(getPetProfileSnapshot(selectedPet).vaccinationRegistry || []).filter(v => v.status === 'overdue').length} overdue`
                        : `${overdueVaccines.length} overdue`}
                    </p>
                    <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                  {adoptions.map((pet) => {
                    const petProfile = getPetProfileSnapshot(pet);
                    const petVaccines = petProfile.vaccinationRegistry || [];
                    const completed = petVaccines.filter((v) => v.status === 'completed').length;
                    const petMilestones = petProfile.healthMilestones || [];
                    const upcoming = petVaccines.filter((v) => v.status === 'upcoming').length;
                    const petTemp = petProfile.temperature;
                    return (
                      <div
                        key={pet._id || pet.id}
                        className={`p-6 rounded-[2.5rem] border ${petThemeClasses(petThemeColor(pet))} bg-white/5 flex flex-col justify-between min-h-[240px] h-full`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-white/40">{pet.name}</p>
                              <h3 className="text-2xl font-black text-white">
                                {petVaccines.length > 0 ? `${completed}/${petVaccines.length}` : '0'} Vaccines
                              </h3>
                            </div>
                            {pet.image && typeof pet.image === 'string' && (pet.image.startsWith('http') || pet.image.startsWith('/') || pet.image.startsWith('blob:') || pet.image.startsWith('data:')) ? (
                              <img 
                                src={pet.image} 
                                alt={pet.name} 
                                className="w-12 h-12 rounded-2xl object-cover border border-white/20 shadow-md shrink-0" 
                              />
                            ) : (
                              <span className="text-3xl shrink-0">{pet.image || '🐾'}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-sm text-white/70 mb-3">
                            <span>Upcoming</span>
                            <span className="font-bold">{upcoming}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-4">
                            <div className="h-full rounded-full bg-white" style={{ width: `${Math.round((completed / Math.max(1, petVaccines.length)) * 100)}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                            <span>Milestones: <strong className="text-white/80">{petMilestones.length}</strong></span>
                            <span>Temp: <strong className="text-white/80">{petTemp}</strong></span>
                          </div>
                        </div>
                        {pet.description && (
                          <p className="text-[11px] text-white/60 mt-3 italic leading-relaxed break-words [overflow-wrap:anywhere] border-t border-white/5 pt-2.5">
                            {pet.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

            {/* Growth Graph Container */}
            <div className="glass-dark p-12 rounded-[4rem] border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-24 bg-blue-500/5 blur-[120px] rounded-full -z-10" />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">Wellness Progression</h3>
                  <p className="text-white/40 text-sm font-medium mt-1">Growth & Weight Analytics ({selectedYear})</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Year Selector */}
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
                    <Calendar size={14} className="text-white/40 shrink-0" />
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-transparent text-white font-black text-xs outline-none cursor-pointer"
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr} className="bg-neutral-900 text-white font-bold">
                          {yr}
                        </option>
                      ))}
                    </select>
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
              </div>

              {hasYearData ? (
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700}} dy={15} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip content={<CustomWeightTooltip />} />
                      <Legend wrapperStyle={{ color: '#fff', fontSize: 12, paddingTop: '10px' }} />
                      {(chartMode === 'comparison' ? adoptions : chartPets).map((pet) => (
                        <Area
                          key={pet.id || pet._id}
                          type="monotone"
                          dataKey={pet.name}
                          stroke={chartStrokeFromTheme(pet.themeColor)}
                          strokeWidth={4}
                          fill={chartStrokeFromTheme(pet.themeColor)}
                          fillOpacity={0.15}
                          activeDot={{ r: 6, strokeWidth: 2, fill: '#ffffff' }}
                          connectNulls={true}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[350px] w-full flex flex-col items-center justify-center border border-white/5 rounded-3xl bg-white/[0.02] p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
                    <Weight size={32} />
                  </div>
                  <h4 className="text-xl font-black text-white tracking-tight">No Weight Records in {selectedYear}</h4>
                  <p className="text-xs text-white/40 max-w-sm mt-2">
                    No weight measurements were recorded for {selectedPet?.name || 'your pets'} in {selectedYear}. Select another year or add a new record.
                  </p>
                </div>
              )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {milestonesForDisplay.map(m => {
                    const milestoneNotes = m.notes || m.description || '';
                    const statusText = m.status 
                      ? (m.status.charAt(0).toUpperCase() + m.status.slice(1))
                      : (m.achieved ? 'Completed' : 'Scheduled');
                    const mThemeObj = PET_THEMES[normalizeThemeColor(m.petTheme, m.petName)] || PET_THEMES.orange;
                    return (
                      <div key={m.id} className={`p-4 rounded-2xl border ${m.achieved ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'} flex flex-col justify-between`}>
                        <div>
                          {selectedPetId === 'all' && m.petName && (
                            <div className="mb-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${mThemeObj.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${mThemeObj.dot}`} />
                                {m.petName}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h5 className="text-sm font-black text-white break-words [overflow-wrap:anywhere]">{m.title}</h5>
                            <button onClick={() => toggleMilestoneAchieved(m.id)} className="text-xs font-black text-white/40 hover:text-white transition-colors shrink-0">{m.achieved ? 'Undo' : 'Mark'}</button>
                          </div>
                          <div className="space-y-1 mb-2">
                            <p className="text-[11px] font-bold text-white/70">
                              Status: <span className={m.achieved ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>{statusText}</span>
                            </p>
                            <p className="text-[11px] text-white/40">Date: {m.date || '—'}</p>
                          </div>
                          {milestoneNotes && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5 break-words [overflow-wrap:anywhere]">Notes/Description: <span className="normal-case text-white/90 font-medium">{milestoneNotes}</span></p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-12">
                {timelineGroups.map((group) => (
                  <div key={group.pet?.id || 'all'} className="space-y-6">
                    {group.pet && <h4 className="text-xl font-black text-white">{group.pet.name}</h4>}
                    <div className="relative space-y-12 before:absolute before:left-8 before:top-0 before:bottom-0 before:w-1 before:bg-white/5">
                      {group.events.map((event, idx) => {
                        const evThemeObj = PET_THEMES[normalizeThemeColor(event.petTheme, event.petName || group.pet?.name)] || PET_THEMES.orange;
                        return (
                        <motion.div 
                          key={event.id || idx} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                          className="relative pl-24 group"
                        >
                          <div className={`absolute left-5 top-1 w-7 h-7 rounded-full bg-black border-4 ${
                            evThemeObj.border
                          } z-10 transition-transform group-hover:scale-125 shadow-2xl`} style={{ borderColor: evThemeObj.hex }} />
                          
                          <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 hover:border-white/20 hover:bg-white/[0.03] transition-all">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-center gap-6 min-w-0 flex-1">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${evThemeObj.bg} ${evThemeObj.text}`}>
                                  {renderTimelineIcon(event.icon)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  {selectedPetId === 'all' && event.petName && (
                                    <div className="mb-1">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${evThemeObj.badge}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${evThemeObj.dot}`} />
                                        {event.petName}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2 flex-wrap break-words [overflow-wrap:anywhere]">
                                      {event.title}
                                      {event.completed && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
                                    </h4>
                                    {event.isHistorical && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                        Pre-Adoption
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 mt-1">
                                    <p className="text-sm font-bold text-white/30 uppercase tracking-widest">Date: {event.date}</p>
                                    <p className="text-[11px] font-bold text-white/70">
                                      Status: <span className={event.completed ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                                        {event.status ? (event.status.charAt(0).toUpperCase() + event.status.slice(1)) : (event.completed ? 'Completed' : 'Scheduled')}
                                      </span>
                                    </p>
                                  </div>
                                  {(event.notes || event.description) && (
                                    <div className="mt-2 pt-2 border-t border-white/5">
                                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5 break-words [overflow-wrap:anywhere]">
                                        Notes/Description: <span className="normal-case text-white/90 font-medium text-xs break-words [overflow-wrap:anywhere]">{event.notes || event.description}</span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button className="p-4 rounded-2xl bg-white/5 text-white/20 hover:text-white hover:bg-white/10 transition-all shrink-0">
                                <ChevronRight />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                        );
                      })}
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
                      {overdueVaccines.map(v => {
                        const vTheme = PET_THEMES[normalizeThemeColor(v.petTheme, v.petName)] || PET_THEMES.orange;
                        return (
                        <div key={v.id} className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg shrink-0"><AlertCircle size={20} /></div>
                          <div className="flex-1 min-w-0">
                            {selectedPetId === 'all' && v.petName && (
                              <div className="mb-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${vTheme.badge}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${vTheme.dot}`} />
                                  {v.petName}
                                </span>
                              </div>
                            )}
                            <h5 className="font-black text-white text-sm break-words [overflow-wrap:anywhere] uppercase tracking-tighter">{v.name}</h5>
                            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Overdue • {v.date}</p>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4">Upcoming</p>
                    {upcomingVaccines.length === 0 ? (
                      <p className="text-xs text-white/40 px-4">No upcoming vaccines scheduled</p>
                    ) : (
                      upcomingVaccines.map(v => {
                        const vTheme = PET_THEMES[normalizeThemeColor(v.petTheme, v.petName)] || PET_THEMES.orange;
                        return (
                        <div key={v.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><Calendar size={20} /></div>
                          <div className="flex-1 min-w-0">
                            {selectedPetId === 'all' && v.petName && (
                              <div className="mb-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${vTheme.badge}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${vTheme.dot}`} />
                                  {v.petName}
                                </span>
                              </div>
                            )}
                            <h5 className="font-bold text-white text-sm break-words [overflow-wrap:anywhere] uppercase tracking-tighter">{v.name}</h5>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Due {v.date}</p>
                          </div>
                        </div>
                        );
                      })
                    )}
                  </div>
                  {completedVaccines.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] px-4">Completed</p>
                      {completedVaccines.map(v => {
                        const vTheme = PET_THEMES[normalizeThemeColor(v.petTheme, v.petName)] || PET_THEMES.orange;
                        return (
                        <div key={v.id} className="p-6 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shrink-0"><ShieldCheck size={20} /></div>
                          <div className="flex-1 min-w-0">
                            {selectedPetId === 'all' && v.petName && (
                              <div className="mb-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${vTheme.badge}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${vTheme.dot}`} />
                                  {v.petName}
                                </span>
                              </div>
                            )}
                            <h5 className="font-black text-white text-sm break-words [overflow-wrap:anywhere] uppercase tracking-tighter">{v.name}</h5>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Completed • {v.date}</p>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
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
                  {medicationsForDisplay.map((med, idx) => {
                    const mTheme = PET_THEMES[normalizeThemeColor(med.petTheme, med.petName)] || PET_THEMES.orange;
                    return (
                    <div key={idx} className={`p-8 rounded-[2.5rem] bg-white/5 border ${mTheme.border} hover:border-white/20 transition-all`}>
                      {selectedPetId === 'all' && med.petName && (
                        <div className="mb-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${mTheme.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${mTheme.dot}`} />
                            {med.petName}
                          </span>
                        </div>
                      )}
                      <h4 className="text-lg font-bold text-white mb-1 uppercase tracking-widest text-sm break-words [overflow-wrap:anywhere]">{med.name}</h4>
                      <p className="text-xs text-white/40 font-bold mb-6 italic break-words [overflow-wrap:anywhere]">{med.dose} • {med.frequency}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Next Dose</p>
                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest animate-pulse break-words [overflow-wrap:anywhere]">{med.next}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="glass-dark p-8 md:p-12 rounded-[4rem] border border-white/10 space-y-8 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                      <FileText className="text-blue-400" />
                      Medical Documents
                    </h3>
                    <p className="text-white/40 text-sm font-medium mt-1">
                      Private Cloud S3 Storage • Presigned Secure Access
                    </p>
                  </div>
                  {user ? (
                    <button
                      onClick={() => {
                        setDocPetId(activePetId || (adoptions[0]?._id || adoptions[0]?.id || ''));
                        setShowUploadDocModal(true);
                      }}
                      className="flex items-center gap-2 px-6 py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl transition-all shadow-lg text-xs uppercase tracking-wider self-start sm:self-auto active:scale-95"
                    >
                      <Upload size={16} />
                      Upload Document
                    </button>
                  ) : (
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-semibold">
                      Sign in to upload medical files
                    </div>
                  )}
                </div>

                {/* S3 Security Callout */}
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 text-xs text-blue-300">
                  <ShieldCheck size={18} className="text-blue-400 shrink-0" />
                  <span>
                    Medical records are stored in a private AWS S3 bucket. Access links are generated on-demand and expire after 15 minutes.
                  </span>
                </div>

                {documentsLoading ? (
                  <div className="py-16 text-center text-white/40 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-blue-400" size={32} />
                    <p className="text-xs uppercase tracking-widest font-black">Loading Medical Vault...</p>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-white/10 rounded-3xl p-8">
                    <FileText className="mx-auto text-white/20 mb-3" size={40} />
                    <h4 className="text-lg font-black text-white mb-1">No Medical Documents Yet</h4>
                    <p className="text-white/40 text-xs max-w-md mx-auto mb-6">
                      Upload veterinary prescriptions, lab test results, vaccine certificates, and diagnostic scans securely to the cloud.
                    </p>
                    {user && (
                      <button
                        onClick={() => {
                          setDocPetId(activePetId || (adoptions[0]?._id || adoptions[0]?.id || ''));
                          setShowUploadDocModal(true);
                        }}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs transition-all"
                      >
                        Upload First Document
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDocuments.map((doc) => {
                      const docPet = adoptions.find(p => (p._id || p.id) === (doc.pet?._id || doc.pet));
                      const isOpening = openingDocId === doc._id;
                      const isDeleting = deletingDocId === doc._id;
                      return (
                        <div
                          key={doc._id}
                          className="p-6 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                        >
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                              <FileText size={22} />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-black text-white break-words [overflow-wrap:anywhere]">{doc.title}</h4>
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-white/10 text-white/70 shrink-0">
                                  {doc.category?.replace('_', ' ') || 'document'}
                                </span>
                                {doc.isHistorical && (
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                    Pre-Adoption
                                  </span>
                                )}
                                {docPet && (
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black bg-blue-500/20 text-blue-300 shrink-0">
                                    {docPet.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-white/40 break-words [overflow-wrap:anywhere]">
                                {doc.originalName} • {(doc.fileSize ? (doc.fileSize / 1024).toFixed(1) + ' KB' : 'Document')} • {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                              {doc.notes && (
                                <p className="text-xs text-white/60 pt-1 italic break-words [overflow-wrap:anywhere]">{doc.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                            <button
                              onClick={() => handleOpenDocument(doc._id)}
                              disabled={isOpening}
                              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
                              title="Secure Presigned View"
                            >
                              {isOpening ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                              <span>{isOpening ? 'Generating URL...' : 'View / Download'}</span>
                            </button>
                            {!doc.isHistorical && (
                              <button
                                onClick={() => handleDeleteDocument(doc._id)}
                                disabled={isDeleting}
                                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all disabled:opacity-50 active:scale-95"
                                title="Delete Document"
                              >
                                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                    {overdueVaccines.map(v => {
                      const vTheme = PET_THEMES[normalizeThemeColor(v.petTheme, v.petName)] || PET_THEMES.orange;
                      return (
                      <div key={v.id} className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center gap-4 group/vax">
                        <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg shrink-0"><AlertCircle size={20} /></div>
                        <div className="flex-1 min-w-0">
                          {selectedPetId === 'all' && v.petName && (
                            <div className="mb-1">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${vTheme.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${vTheme.dot}`} />
                                {v.petName}
                              </span>
                            </div>
                          )}
                          <h5 className="font-black text-white text-sm break-words [overflow-wrap:anywhere] uppercase tracking-tighter">{v.name}</h5>
                          <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Overdue • {v.date}</p>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}

                {/* Upcoming */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4">Synchronizing</p>
                  {upcomingVaccines.map(v => {
                    const vTheme = PET_THEMES[normalizeThemeColor(v.petTheme, v.petName)] || PET_THEMES.orange;
                    return (
                    <div key={v.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><Calendar size={20} /></div>
                      <div className="flex-1 min-w-0">
                        {selectedPetId === 'all' && v.petName && (
                          <div className="mb-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${vTheme.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${vTheme.dot}`} />
                              {v.petName}
                            </span>
                          </div>
                        )}
                        <h5 className="font-bold text-white text-sm break-words [overflow-wrap:anywhere] uppercase tracking-tighter">{v.name}</h5>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Due {v.date}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Completed */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4">Verified Safe</p>
                  <div className="flex flex-wrap gap-2 px-2">
                    {completedVaccines.map(v => {
                      const vTheme = PET_THEMES[normalizeThemeColor(v.petTheme, v.petName)] || PET_THEMES.emerald;
                      return (
                      <span key={v.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${selectedPetId === 'all' ? vTheme.badge : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                        {selectedPetId === 'all' && v.petName && <span className={`w-1.5 h-1.5 rounded-full ${vTheme.dot}`} />}
                        {selectedPetId === 'all' && v.petName ? `${v.petName} • ` : ''}{v.name} ✓
                      </span>
                      );
                    })}
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
                {medicationsForDisplay.map((med, idx) => {
                  const mTheme = PET_THEMES[normalizeThemeColor(med.petTheme, med.petName)] || PET_THEMES.orange;
                  return (
                  <div key={idx} className={`p-8 rounded-[2.5rem] bg-white/5 border ${mTheme.border} hover:border-white/20 transition-all cursor-pointer group`}>
                    {selectedPetId === 'all' && med.petName && (
                      <div className="mb-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${mTheme.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${mTheme.dot}`} />
                          {med.petName}
                        </span>
                      </div>
                    )}
                    <h4 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors uppercase tracking-widest text-sm break-words [overflow-wrap:anywhere]">{med.name}</h4>
                    <p className="text-xs text-white/40 font-bold mb-6 italic break-words [overflow-wrap:anywhere]">{med.dose} • {med.frequency}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Next Dose</p>
                      <p className="text-xs font-black text-blue-400 uppercase tracking-widest animate-pulse break-words [overflow-wrap:anywhere]">{med.next}</p>
                    </div>
                  </div>
                  );
                })}
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
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Date Recorded</label>
                      <input 
                        type="date"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                        value={weightDate}
                        onChange={(e) => setWeightDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setModalFormType('main')} className="px-6 py-4 glass text-white font-bold rounded-2xl text-xs uppercase">Back</button>
                    <button 
                      onClick={handleSaveWeight}
                      disabled={healthActionLoading}
                      className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl text-xs uppercase disabled:opacity-50 active:scale-95"
                    >
                      {healthActionLoading ? 'Saving...' : 'Save Weight'}
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
                      onClick={handleSaveVaccine}
                      disabled={healthActionLoading}
                      className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase disabled:opacity-50 active:scale-95"
                    >
                      {healthActionLoading ? 'Saving...' : 'Save Vaccine'}
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
                      onClick={handleSaveMedication}
                      disabled={healthActionLoading}
                      className="flex-1 py-4 bg-purple-500 hover:bg-purple-600 text-white font-black rounded-2xl text-xs uppercase disabled:opacity-50 active:scale-95"
                    >
                      {healthActionLoading ? 'Saving...' : 'Save Medication'}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Event Date / Status</label>
                        <input 
                          type="date"
                          placeholder="e.g. 2026-09-20"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                          value={vetForm.date}
                          onChange={(e) => setVetForm({...vetForm, date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Status</label>
                        <select 
                          className="w-full bg-black/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                          value={vetForm.status || 'completed'}
                          onChange={(e) => setVetForm({...vetForm, status: e.target.value, achieved: e.target.value === 'completed'})}
                        >
                          <option value="completed">Completed</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
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
                      onClick={handleSaveMilestone}
                      disabled={healthActionLoading}
                      className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl text-xs uppercase disabled:opacity-50 active:scale-95"
                    >
                      {healthActionLoading ? 'Saving...' : 'Save Milestone'}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center mt-8 italic">Changes sync to your persistent PETLY Profile.</p>
            </motion.div>
          </div>
        ) }

        {showUploadDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-dark border border-white/10 rounded-[3rem] p-8 md:p-12 max-w-xl w-full shadow-2xl relative"
            >
              <button
                onClick={() => {
                  setShowUploadDocModal(false);
                  setDocActionError(null);
                }}
                className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Upload size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter">Upload Medical Document</h2>
                  <p className="text-white/40 text-xs">Direct encrypted upload to AWS S3 Vault</p>
                </div>
              </div>

              {docActionError && (
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{docActionError}</span>
                </div>
              )}

              <form onSubmit={handleDocumentUploadSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Select Pet</label>
                  <select
                    className="w-full bg-black/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                    value={docPetId || activePetId || ''}
                    onChange={(e) => setDocPetId(e.target.value)}
                    required
                  >
                    {adoptions.map((pet) => (
                      <option key={pet._id || pet.id} value={pet._id || pet.id}>
                        {pet.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Blood Panel or Rabies Certificate"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Category</label>
                  <select
                    className="w-full bg-black/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                  >
                    <option value="lab_result">Lab Result</option>
                    <option value="prescription">Prescription</option>
                    <option value="vaccine_certificate">Vaccine Certificate</option>
                    <option value="xray">X-Ray / Imaging</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">File (PDF, PNG, JPG, JPEG, max 10MB)</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setDocFile(e.target.files[0] || null)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-6 text-white text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-500 file:text-white hover:file:bg-blue-600 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Notes / Remarks (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Doctor comments, normal ranges, follow-up instructions..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50 resize-none text-xs"
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadDocModal(false);
                      setDocActionError(null);
                    }}
                    className="px-6 py-4 glass text-white font-bold rounded-2xl text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={docUploading}
                    className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    {docUploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Uploading to S3...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>Upload to S3 Vault</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HealthHub;

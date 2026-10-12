import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';
import { PETS_DATA } from '../data/pets';
import { PRODUCTS_DATA } from '../data/products';
import { uploadAPI, communityAPI, notificationAPI } from '../services/api';
import {
  User, MapPin, Mail, Phone, Calendar, Heart, Bookmark, PawPrint, Users,
  Edit3, Save, LogOut, Camera, Clock, Syringe, FileText, ChevronRight, Activity, Award,
  Trash2, Plus, AlertCircle, Loader2, Upload, Check, Film, ArrowUpRight, ShoppingBag, Package, Stethoscope, X,
  Bell, CheckCheck, MessageSquare
} from 'lucide-react';
import { normalizeThemeColor, VALID_THEMES } from '../context/EcosystemContext';
import IndianLocationSelector from '../components/Location/IndianLocationSelector';

export const getLocationDisplay = (loc) => {
  if (!loc) return null;
  if (typeof loc === 'string') {
    const trimmed = loc.trim();
    return trimmed ? { line1: trimmed, line2: null } : null;
  }
  if (typeof loc === 'object') {
    const parts = [loc.area, loc.city, loc.state].filter(Boolean);
    const line1 = parts.join(', ');
    const line2 = loc.pincode || null;
    if (!line1 && !line2) return null;
    return { line1: line1 || line2, line2: line1 ? line2 : null };
  }
  return null;
};

const initLocationState = (loc) => {
  if (loc && typeof loc === 'object') {
    return {
      state: loc.state || '',
      city: loc.city || '',
      pincode: loc.pincode || '',
      area: loc.area || '',
    };
  }
  return { state: '', city: '', pincode: '', area: '' };
};

export const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const THEME_PALETTE = [
  { id: 'purple', name: 'Purple', bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', ring: 'ring-purple-400', dot: 'bg-purple-500' },
  { id: 'blue', name: 'Blue', bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', ring: 'ring-sky-400', dot: 'bg-sky-500' },
  { id: 'green', name: 'Green', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', ring: 'ring-emerald-400', dot: 'bg-emerald-500' },
  { id: 'pink', name: 'Pink', bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', ring: 'ring-pink-400', dot: 'bg-pink-500' },
  { id: 'orange', name: 'Orange', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', ring: 'ring-orange-400', dot: 'bg-orange-500' },
  { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', ring: 'ring-cyan-400', dot: 'bg-cyan-500' },
  { id: 'yellow', name: 'Yellow', bg: 'bg-amber-400/10', border: 'border-amber-400/30', text: 'text-amber-300', ring: 'ring-amber-300', dot: 'bg-amber-400' },
  { id: 'red', name: 'Red', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', ring: 'ring-red-400', dot: 'bg-red-500' },
];

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const {
    wishlistPets,
    wishlistProducts,
    adoptionListings,
    fetchAdoptionListings,
    toggleWishlistPet,
    removeFromWishlistPet,
    adoptions,
    petHealthProfiles,
    bookings,
    serviceBookings,
    fetchServiceBookings,
    orders,
    storeOrders,
    fetchOrders,
    myApplications,
    fetchMyApplications,
    vaccines,
    medications,
    milestones,
    quizHistory,
    mongoQuizAttempts,
    fetchMyQuizAttempts,
    companionMatches,
    fetchMyCompanionMatches,
    communityPosts,
    fetchCommunityPosts,
    addExistingPet,
    petsLoading,
    petsError,
    fetchPets,
    createPet,
    updatePet,
    deletePet,
    mongoHealthRecords,
    fetchHealthRecords,
  } = useEcosystem();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });
  const [editLocation, setEditLocation] = useState(() => initLocationState(user?.location));
  const [editLocationValid, setEditLocationValid] = useState(() => {
    const loc = initLocationState(user?.location);
    return Boolean(loc.state && loc.city && loc.pincode && loc.area);
  });
  const [profileEditError, setProfileEditError] = useState(null);
  const [profileEditSuccess, setProfileEditSuccess] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activityFilter, setActivityFilter] = useState('all');
  const location = useLocation();
  const [profileNotifications, setProfileNotifications] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread'

  // Handle URL query ?tab=notifications (e.g. from navbar "VIEW ALL NOTIFICATIONS →")
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'notifications') {
      setActiveTab('notifications');
    }
  }, [location.search]);

  // Fetch complete notification history
  const fetchProfileNotifications = useCallback(async () => {
    if (!user) {
      setProfileNotifications([]);
      return;
    }
    try {
      setNotifsLoading(true);
      const res = await notificationAPI.getMyNotifications();
      if (res?.success && Array.isArray(res.notifications)) {
        setProfileNotifications(res.notifications);
      } else if (res?.data?.success && Array.isArray(res.data.notifications)) {
        setProfileNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch profile notifications:', err);
    } finally {
      setNotifsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfileNotifications();
    }
  }, [user, activeTab, fetchProfileNotifications]);

  const handleProfileNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationAPI.markAsRead(notif._id);
        setProfileNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleProfileMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setProfileNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  useEffect(() => {
    if (!isEditing && user) {
      setEditData({
        fullName: user?.fullName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
      });
      const loc = initLocationState(user?.location);
      setEditLocation(loc);
      setEditLocationValid(Boolean(loc.state && loc.city && loc.pincode && loc.area));
    }
  }, [user, isEditing]);

  // Pet CRUD states (Phase 4A)
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [showEditPetModal, setShowEditPetModal] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [editPetForm, setEditPetForm] = useState({
    name: '',
    species: '',
    breed: '',
    gender: '',
    age: '',
    weight: '',
    temperature: '',
    height: '',
    color: '',
    themeColor: 'orange',
    dob: '',
    adoptionDate: '',
    allergies: '',
    medicalConditions: '',
    healthStatus: 'Healthy',
    description: '',
    photoUrl: '',
    photoKey: '',
  });
  const [deleteConfirmPet, setDeleteConfirmPet] = useState(null);
  const [petActionLoading, setPetActionLoading] = useState(false);
  const [petActionError, setPetActionError] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [petForm, setPetForm] = useState({
    name: '',
    species: '',
    breed: '',
    gender: '',
    dob: '',
    weight: '',
    temperature: '',
    height: '',
    color: '',
    themeColor: 'orange',
    adoptionDate: '',
    photo: '',
    photoKey: '',
    medicalConditions: '',
    allergies: '',
    vaccines: '',
    medications: '',
    medicalNotes: ''
  });

  const currentUserId = (user?._id || user?.id)?.toString();

  // Look up full details for saved pets (same source of truth as main Saved page)
  const allPets = React.useMemo(() => [
    ...(Array.isArray(adoptionListings) ? adoptionListings.map(listing => {
      const pet = listing.pet || {};
      const speciesLower = (pet.species || 'dog').toLowerCase();
      const defaultEmoji = speciesLower === 'cat' ? '🐈' : speciesLower === 'rabbit' ? '🐇' : speciesLower === 'bird' ? '🦜' : '🐕';
      return {
        id: String(listing._id),
        _id: String(listing._id),
        name: pet.name || listing.title,
        breed: pet.breed || 'Rescue Companion',
        age: pet.age ? `${pet.age} ${pet.age === 1 ? 'yr' : 'yrs'}` : '1 yr',
        image: defaultEmoji,
        photoUrl: pet.photoUrl || '',
        price: listing.adoptionFee !== undefined ? listing.adoptionFee : 0,
        location: listing.location || 'Sanctuary Station',
      };
    }) : []),
    ...PETS_DATA.map(p => ({ ...p, id: String(p.id), _id: String(p.id) }))
  ], [adoptionListings]);

  const wishlistedPets = React.useMemo(() => {
    const list = [];
    const seen = new Set();
    for (const pet of allPets) {
      const pId = String(pet.id || pet._id);
      if ((wishlistPets || []).some(wId => String(wId) === pId) && !seen.has(pId)) {
        seen.add(pId);
        list.push(pet);
      }
    }
    return list;
  }, [allPets, wishlistPets]);

  const wishlistedProducts = PRODUCTS_DATA.filter(prod => wishlistProducts.includes(prod.id));
  const userPosts = communityPosts.filter(p => p.authorId === currentUserId);

  // MongoDB Quiz & Assessment History (Combined Knowledge Quiz + Companion Matcher)
  const combinedQuizHistory = React.useMemo(() => {
    if (!user) return quizHistory || [];

    const knowledgeList = (mongoQuizAttempts || []).map((a) => {
      const catLower = (a.category || '').toLowerCase();
      const icon = catLower.includes('cat')
        ? '🐈'
        : catLower.includes('dog')
        ? '🐕'
        : catLower.includes('health') || catLower.includes('safety')
        ? '🩺'
        : catLower.includes('nutrition')
        ? '🥗'
        : '🧠';

      const dateObj = a.createdAt ? new Date(a.createdAt) : null;
      const formattedDate = dateObj
        ? dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Recently completed';

      return {
        id: String(a._id || a.id),
        type: 'knowledge',
        topMatch: a.category || 'Knowledge Assessment',
        topMatchIcon: icon,
        topMatchScore: a.percentage !== undefined ? a.percentage : Math.round(((a.score || 0) / (a.totalQuestions || 1)) * 100),
        date: formattedDate,
        createdAt: dateObj ? dateObj.getTime() : 0,
      };
    });

    const companionList = (companionMatches || []).map((m) => {
      const rec = m.primaryRecommendation || {};
      const dateObj = m.createdAt ? new Date(m.createdAt) : null;
      const formattedDate = dateObj
        ? dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Recently matched';

      return {
        id: String(m._id || m.id),
        type: 'companion',
        topMatch: rec.name || 'Companion Match',
        topMatchIcon: rec.icon || '🐾',
        topMatchScore: m.compatibilityScore !== undefined ? m.compatibilityScore : (rec.score || 0),
        date: formattedDate,
        createdAt: dateObj ? dateObj.getTime() : 0,
      };
    });

    return [...knowledgeList, ...companionList].sort((a, b) => b.createdAt - a.createdAt);
  }, [user, mongoQuizAttempts, companionMatches, quizHistory]);

  // MongoDB Saved Community Posts
  const [mongoSavedPosts, setMongoSavedPosts] = useState([]);
  const [savedPostsLoaded, setSavedPostsLoaded] = useState(false);
  const [savedPostsLoading, setSavedPostsLoading] = useState(false);

  const fetchUserSavedPosts = useCallback(async () => {
    if (!user) {
      setMongoSavedPosts([]);
      setSavedPostsLoaded(true);
      return;
    }
    setSavedPostsLoading(true);
    try {
      const response = await communityAPI.getPosts('saved=true');
      if (response.success && Array.isArray(response.posts)) {
        setMongoSavedPosts(response.posts);
      }
    } catch (err) {
      console.error('[Profile] Failed to fetch saved posts from MongoDB:', err.message);
    } finally {
      setSavedPostsLoading(false);
      setSavedPostsLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    fetchUserSavedPosts();
    if (fetchCommunityPosts) {
      fetchCommunityPosts();
    }
  }, [fetchUserSavedPosts, fetchCommunityPosts]);

  const displaySavedPosts = savedPostsLoaded
    ? mongoSavedPosts
    : (communityPosts || []).filter(p => 
        p.isSaved || (Array.isArray(p.savedBy) && p.savedBy.some(id => (id?._id || id)?.toString() === currentUserId))
      );

  useEffect(() => {
    if (user && fetchHealthRecords) {
      fetchHealthRecords();
    }
    if (user) {
      if (fetchOrders) fetchOrders();
      if (fetchServiceBookings) fetchServiceBookings();
      if (fetchMyApplications) fetchMyApplications();
      if (fetchAdoptionListings && (!adoptionListings || adoptionListings.length === 0)) {
        fetchAdoptionListings();
      }
      if (fetchMyQuizAttempts) fetchMyQuizAttempts();
      if (fetchMyCompanionMatches) fetchMyCompanionMatches();
    }
  }, [user, fetchHealthRecords, fetchOrders, fetchServiceBookings, fetchMyApplications, fetchAdoptionListings, adoptionListings, fetchMyQuizAttempts, fetchMyCompanionMatches]);

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

  const handleStartEdit = () => {
    setEditData({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      bio: user.bio || '',
    });
    const loc = initLocationState(user.location);
    setEditLocation(loc);
    setEditLocationValid(Boolean(loc.state && loc.city && loc.pincode && loc.area));
    setProfileEditError(null);
    setProfileEditSuccess(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditData({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      bio: user.bio || '',
    });
    const loc = initLocationState(user.location);
    setEditLocation(loc);
    setEditLocationValid(Boolean(loc.state && loc.city && loc.pincode && loc.area));
    setProfileEditError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setProfileEditError(null);
    setProfileEditSuccess(null);

    const nameTrimmed = (editData.fullName || '').trim();
    const emailTrimmed = (editData.email || '').trim().toLowerCase();
    const phoneTrimmed = (editData.phone || '').trim();
    const bioTrimmed = (editData.bio || '').trim();

    if (!nameTrimmed) {
      setProfileEditError('Full name is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
      setProfileEditError('Please enter a valid email address.');
      return;
    }

    if (phoneTrimmed) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/;
      if (!phoneRegex.test(phoneTrimmed)) {
        setProfileEditError('Please enter a valid phone number (e.g., +1 234 567 8900).');
        return;
      }
    }

    // Determine final location to persist
    let finalLocation = user?.location;
    const isLocationTouched = Boolean(editLocation.state || editLocation.city || editLocation.pincode || editLocation.area);

    if (isLocationTouched) {
      if (!editLocationValid) {
        setProfileEditError('Please select and verify a complete Indian location (State, City, 6-digit PIN, and Area).');
        return;
      }
      finalLocation = {
        state: editLocation.state.trim(),
        city: editLocation.city.trim(),
        pincode: String(editLocation.pincode).trim(),
        area: editLocation.area.trim(),
      };
    } else if (typeof user?.location === 'string' && user.location.trim()) {
      // Preserve existing legacy location string
      finalLocation = user.location;
    }

    setSavingProfile(true);
    try {
      await updateUser({
        fullName: nameTrimmed,
        email: emailTrimmed,
        phone: phoneTrimmed,
        location: finalLocation,
        bio: bioTrimmed,
      });
      setProfileEditSuccess('Profile information updated successfully.');
      setIsEditing(false);
      setTimeout(() => setProfileEditSuccess(null), 4000);
    } catch (err) {
      setProfileEditError(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfileKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (savingProfile) return;
      if (e.target.tagName.toLowerCase() === 'textarea') {
        if (e.shiftKey) return;
        e.preventDefault();
        handleSave();
      } else {
        e.preventDefault();
        handleSave();
      }
    }
  };

  // Pet action handlers
  const handleFileUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      setPetActionError(null);
      const res = await uploadAPI.uploadFile(file, 'pet');
      if (res.success && res.file) {
        const photoUrl = res.file.presignedUrl || res.file.url;
        if (isEdit) {
          setEditPetForm((prev) => ({ ...prev, photoUrl, photoKey: res.file.key }));
        } else {
          setPetForm((prev) => ({ ...prev, photo: photoUrl, photoKey: res.file.key }));
        }
      }
    } catch (err) {
      setPetActionError(err.message || 'Failed to upload photo to S3.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddPetSubmit = async () => {
    if (!petForm.name.trim()) {
      setPetActionError('Pet name is required.');
      return;
    }
    try {
      setPetActionLoading(true);
      setPetActionError(null);
      await addExistingPet({
        name: petForm.name.trim(),
        species: petForm.species.trim(),
        breed: petForm.breed.trim(),
        gender: petForm.gender.trim(),
        dob: petForm.dob,
        weight: petForm.weight ? parseFloat(petForm.weight) : undefined,
        temperature: petForm.temperature,
        height: petForm.height,
        color: petForm.color,
        themeColor: petForm.themeColor || 'orange',
        adoptionDate: petForm.adoptionDate,
        image: petForm.photo,
        photoUrl: petForm.photo,
        photoKey: petForm.photoKey,
        medicalConditions: petForm.medicalConditions,
        allergies: petForm.allergies,
        vaccines: petForm.vaccines,
        medications: petForm.medications,
        medicalNotes: petForm.medicalNotes,
      });
      setPetForm({
        name: '',
        species: '',
        breed: '',
        gender: '',
        dob: '',
        weight: '',
        temperature: '',
        height: '',
        color: '',
        themeColor: 'orange',
        adoptionDate: '',
        photo: '',
        photoKey: '',
        medicalConditions: '',
        allergies: '',
        vaccines: '',
        medications: '',
        medicalNotes: ''
      });
      setShowAddPetModal(false);
    } catch (err) {
      setPetActionError(err.message || 'Failed to add pet.');
    } finally {
      setPetActionLoading(false);
    }
  };

  const handleOpenEditModal = (pet) => {
    setEditingPet(pet);
    setEditPetForm({
      name: pet.name || '',
      species: pet.species || '',
      breed: pet.breed || '',
      gender: pet.gender || '',
      weight: pet.weight !== undefined ? String(pet.weight) : '',
      age: pet.age !== undefined ? String(pet.age) : '',
      temperature: pet.temperature || '',
      height: pet.height || '',
      color: pet.color || '',
      themeColor: pet.themeColor ? normalizeThemeColor(pet.themeColor, pet.name) : 'orange',
      dob: pet.dob || '',
      adoptionDate: pet.adoptionDate || '',
      allergies: Array.isArray(pet.allergies) ? pet.allergies.join(', ') : (pet.allergies || ''),
      medicalConditions: Array.isArray(pet.medicalConditions) ? pet.medicalConditions.join(', ') : (pet.medicalConditions || ''),
      healthStatus: pet.healthStatus || pet.status || 'Healthy',
      description: pet.description || pet.medicalNotes || '',
      photoUrl: pet.photoUrl || (pet.image?.startsWith('http') ? pet.image : ''),
      photoKey: pet.photoKey || '',
    });
    setPetActionError(null);
    setShowEditPetModal(true);
  };

  const handleEditPetSubmit = async () => {
    if (!editingPet) return;
    if (!editPetForm.name.trim()) {
      setPetActionError('Pet name cannot be empty.');
      return;
    }
    try {
      setPetActionLoading(true);
      setPetActionError(null);
      await updatePet(editingPet._id || editingPet.id, {
        name: editPetForm.name.trim(),
        species: editPetForm.species.trim(),
        breed: editPetForm.breed.trim(),
        gender: editPetForm.gender.trim(),
        weight: editPetForm.weight ? parseFloat(editPetForm.weight) : undefined,
        age: editPetForm.age ? parseInt(editPetForm.age, 10) : undefined,
        temperature: editPetForm.temperature,
        height: editPetForm.height,
        color: editPetForm.color,
        themeColor: editPetForm.themeColor || 'orange',
        dob: editPetForm.dob,
        adoptionDate: editPetForm.adoptionDate,
        allergies: editPetForm.allergies ? editPetForm.allergies.split(/\n|,/).map((s) => s.trim()).filter(Boolean) : [],
        medicalConditions: editPetForm.medicalConditions ? editPetForm.medicalConditions.split(/\n|,/).map((s) => s.trim()).filter(Boolean) : [],
        healthStatus: editPetForm.healthStatus,
        description: editPetForm.description,
        photoUrl: editPetForm.photoUrl,
        photoKey: editPetForm.photoKey,
      });
      setShowEditPetModal(false);
      setEditingPet(null);
    } catch (err) {
      setPetActionError(err.message || 'Failed to update pet.');
    } finally {
      setPetActionLoading(false);
    }
  };

  const handleDeletePetConfirm = async () => {
    if (!deleteConfirmPet) return;
    try {
      setPetActionLoading(true);
      setPetActionError(null);
      await deletePet(deleteConfirmPet._id || deleteConfirmPet.id);
      setDeleteConfirmPet(null);
    } catch (err) {
      setPetActionError(err.message || 'Failed to delete pet.');
    } finally {
      setPetActionLoading(false);
    }
  };

  const petThemeColor = (pet) => {
    return normalizeThemeColor(pet?.themeColor, pet?.name);
  };

  const petThemeClasses = (theme) => {
    const t = normalizeThemeColor(theme);
    if (t === 'purple') return 'border-purple-500/20 bg-purple-500/10 text-purple-300';
    if (t === 'blue') return 'border-sky-500/20 bg-sky-500/10 text-sky-300';
    if (t === 'green') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    if (t === 'pink') return 'border-pink-500/20 bg-pink-500/10 text-pink-300';
    if (t === 'orange') return 'border-orange-500/20 bg-orange-500/10 text-orange-300';
    if (t === 'cyan') return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300';
    if (t === 'yellow') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
    if (t === 'red') return 'border-red-500/20 bg-red-500/10 text-red-300';
    return 'border-orange-500/20 bg-orange-500/10 text-orange-300';
  };

  const petTextClass = (theme) => {
    const t = normalizeThemeColor(theme);
    if (t === 'purple') return 'text-purple-400';
    if (t === 'blue') return 'text-sky-400';
    if (t === 'green') return 'text-emerald-400';
    if (t === 'pink') return 'text-pink-400';
    if (t === 'orange') return 'text-orange-400';
    if (t === 'cyan') return 'text-cyan-400';
    if (t === 'yellow') return 'text-amber-400';
    if (t === 'red') return 'text-red-400';
    return 'text-orange-400';
  };

  const getPetHealthProfile = (pet) => petHealthProfiles?.[pet?.id] || petHealthProfiles?.[pet?._id] || {};

  const getPetProfileSnapshot = (pet) => {
    const profile = getPetHealthProfile(pet);
    const petIdStr = String(pet?._id || pet?.id || '');
    const pTheme = petThemeColor(pet);

    if (user) {
      const petMongoRecords = Array.isArray(mongoHealthRecords)
        ? mongoHealthRecords.filter((r) => String(r.pet?._id || r.pet?.id || r.pet || '') === petIdStr)
        : [];

      const mongoVaccines = petMongoRecords
        .filter((r) => r.type === 'vaccination')
        .map((r) => ({
          id: r._id || r.id,
          petId: petIdStr,
          petName: pet?.name || 'Pet',
          petTheme: pTheme,
          name: r.title || r.name || 'Vaccine',
          date: r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]) : 'Recent',
          status: r.status || 'completed',
          notes: r.notes || r.description || '',
        }));

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
            petName: pet?.name || 'Pet',
            petTheme: pTheme,
            name: r.title || r.name || 'Medication',
            dose: r.value || r.dose || '1 dose',
            frequency: freqPart,
            next: nextPart,
            status: r.status || 'ongoing',
            notes: r.notes || r.description || '',
          };
        });

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
            petName: pet?.name || 'Pet',
            petTheme: pTheme,
            title: r.title || 'Health Milestone',
            date: r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]) : '—',
            category: r.type === 'appointment' ? 'vet' : 'health',
            achieved: r.status === 'completed' || Boolean(r.achieved),
            status: r.status || 'completed',
            description: milestoneNotes,
            notes: milestoneNotes,
          };
        });

      const mongoAppointments = petMongoRecords
        .filter((r) => r.type === 'appointment' && (r.status === 'scheduled' || r.status === 'upcoming'))
        .map((r) => ({
          id: r._id || r.id,
          petId: petIdStr,
          petName: pet?.name || 'Pet',
          petTheme: pTheme,
          title: r.title || 'Appointment',
          date: r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]) : '',
          status: r.status || 'scheduled',
          notes: r.notes || r.description || '',
          provider: r.value || r.notes || 'Veterinarian',
        }));

      return {
        ...pet,
        temperature: pet?.temperature ? (String(pet.temperature).includes('°') ? pet.temperature : `${pet.temperature}°F`) : (profile.temperature ?? '101.2°F'),
        healthStatus: profile.healthStatus ?? 'Healthy',
        notes: profile.notes ?? (pet.description || 'Stable and monitored regularly.'),
        healthScore: profile.healthScore ?? pet.healthScore ?? 90,
        medicalHistory: profile.medicalHistory ?? (pet.description || 'Routine wellness monitoring'),
        vaccinationRegistry: mongoVaccines,
        healthMilestones: mongoMilestones,
        activeMedications: mongoMedications,
        upcomingAppointments: mongoAppointments,
      };
    }

    return {
      ...pet,
      temperature: pet?.temperature ? (String(pet.temperature).includes('°') ? pet.temperature : `${pet.temperature}°F`) : (profile.temperature ?? '101.2°F'),
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

  const totalVaccinesCount = user
    ? (Array.isArray(mongoHealthRecords) ? mongoHealthRecords.filter((r) => r.type === 'vaccination').length : 0)
    : vaccines.length;

  const displayVaccines = user
    ? adoptions.flatMap((pet) => getPetProfileSnapshot(pet).vaccinationRegistry || [])
    : vaccines;

  const displayMilestones = user
    ? adoptions.flatMap((pet) => getPetProfileSnapshot(pet).healthMilestones || [])
    : milestones;

  const activeBookingsCount = (serviceBookings || []).filter((b) => (b.status || '').toLowerCase() !== 'cancelled').length;

  const getBookingStatusBadge = (status) => {
    if (status === 'Completed') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (status === 'Cancelled') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (status === 'Pending') return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  };

  const getOrderStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'delivered') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (s === 'cancelled') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (s === 'processing' || s === 'shipped') return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    if (s === 'pending') return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  };

  const getAdoptionStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (s === 'rejected') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (s === 'withdrawn') return 'bg-white/10 text-white/40 border border-white/10';
    return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
  };

  const userOrders = orders || storeOrders || [];
  const userBookings = serviceBookings || [];
  const userAdoptions = myApplications || [];

  const combinedActivity = [
    ...userOrders.map((o) => ({
      type: 'order',
      id: o._id,
      title: `Store Order #${o._id?.toString().slice(-6).toUpperCase()}`,
      subtitle: `${o.items?.length || 0} item${(o.items?.length || 0) === 1 ? '' : 's'} • $${o.totalAmount ?? o.total ?? 0}`,
      date: o.createdAt,
      status: o.status || 'confirmed',
      targetUrl: '/store',
    })),
    ...userBookings.map((b) => ({
      type: 'booking',
      id: b._id,
      title: b.serviceName || b.providerName || 'Service Booking',
      subtitle: `${b.providerName} • ${b.date} @ ${b.time}${b.petName ? ` • Pet: ${b.petName}` : ''} • $${b.price ?? 0}`,
      date: b.createdAt || b.date,
      status: b.status || 'Confirmed',
      targetUrl: '/services',
    })),
    ...userAdoptions.map((a) => ({
      type: 'adoption',
      id: a._id,
      title: `Adoption: ${a.pet?.name || a.listing?.title || 'Rescue Companion'}`,
      subtitle: `${a.pet?.breed ? `${a.pet.breed} • ` : ''}Application submitted${a.shelter?.fullName ? ` to ${a.shelter.fullName}` : ''}`,
      date: a.createdAt,
      status: a.status || 'pending',
      targetUrl: '/adopt',
    })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const tabs = [
    { id: 'overview', icon: <User size={18} />, label: 'Overview' },
    { id: 'pets', icon: <PawPrint size={18} />, label: 'My Pets' },
    { id: 'saved', icon: <Bookmark size={18} />, label: 'Saved' },
    { id: 'community', icon: <Users size={18} />, label: 'Community' },
    { id: 'activity', icon: <Activity size={18} />, label: 'Activity' },
    { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
  ];

  const locationDisplay = getLocationDisplay(user?.location);

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
                    {locationDisplay ? (
                      <span className="flex items-center gap-2">
                        <MapPin size={16} />
                        {locationDisplay.line2 ? `${locationDisplay.line1} (${locationDisplay.line2})` : locationDisplay.line1}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-2"><Calendar size={16} /> Joined June 2026</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={savingProfile}
                        className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 cursor-pointer"
                      >
                        {savingProfile ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={savingProfile}
                        className="flex items-center gap-2 px-6 py-4 glass hover:bg-white/10 text-white/70 hover:text-white font-bold rounded-2xl transition-all border border-white/10 cursor-pointer"
                      >
                        <X size={18} /> Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleStartEdit}
                      className="flex items-center gap-2 px-8 py-4 glass hover:bg-white/10 text-white font-black rounded-2xl transition-all border border-white/10 cursor-pointer"
                    >
                      <Edit3 size={18} /> Edit Profile
                    </button>
                  )}
                  <button onClick={logout} className="p-4 glass text-red-500 border-red-500/20 hover:bg-red-500/10 rounded-2xl transition-all cursor-pointer">
                    <LogOut size={20} />
                  </button>
                </div>
              </div>

              {profileEditError && (
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{profileEditError}</span>
                </div>
              )}

              {profileEditSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <Check size={16} className="shrink-0" />
                  <span>{profileEditSuccess}</span>
                </div>
              )}

              {isEditing ? (
                <div className="space-y-5 pt-2" onKeyDown={handleProfileKeyDown}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={editData.fullName || ''}
                        onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                        placeholder="Full Name"
                        className="w-full bg-white/5 border border-white/15 focus:border-orange-500/60 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={editData.email || ''}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        placeholder="email@example.com"
                        className="w-full bg-white/5 border border-white/15 focus:border-orange-500/60 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={editData.phone || ''}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        placeholder="+1 234 567 8900"
                        className="w-full bg-white/5 border border-white/15 focus:border-orange-500/60 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1.5">
                      Verified Indian Location
                    </label>
                    <IndianLocationSelector
                      value={editLocation}
                      onChange={(newLoc, isValid) => {
                        setEditLocation(newLoc);
                        setEditLocationValid(isValid);
                      }}
                    />
                    {typeof user?.location === 'string' && user?.location.trim() && (
                      <p className="text-xs text-white/40 mt-2">
                        Current legacy location: <span className="text-white/70 italic">"{user.location}"</span>. Choose above to change to a verified Indian location.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1.5">
                      Bio / Description
                    </label>
                    <textarea
                      value={editData.bio || ''}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      placeholder="Tell us about yourself and your companions..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/15 focus:border-orange-500/60 rounded-2xl p-4 text-white text-sm font-medium outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-lg text-white/60 max-w-2xl leading-relaxed italic">"{user.bio}"</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-3 mb-12 overflow-x-auto pb-4 no-scrollbar">
          {tabs.map(tab => {
            const isTabActive = activeTab === tab.id;
            const unreadCount = profileNotifications.filter(n => !n.isRead).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all border border-white/5 whitespace-nowrap cursor-pointer ${
                  isTabActive ? 'bg-white text-black shadow-2xl' : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'notifications' && unreadCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isTabActive ? 'bg-orange-500 text-white' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
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
                      <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                        <h3 className="text-xl font-bold text-white">Contact Details</h3>
                        {!isEditing && (
                          <button
                            onClick={handleStartEdit}
                            className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                        )}
                      </div>
                      <div className="space-y-6" onKeyDown={isEditing ? handleProfileKeyDown : undefined}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0"><Mail size={18} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/30 font-bold uppercase tracking-wider mb-1">Email</p>
                            {isEditing ? (
                              <input
                                type="email"
                                value={editData.email || ''}
                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                placeholder="your@email.com"
                                className="w-full bg-white/5 border border-white/10 focus:border-orange-500/50 rounded-xl px-4 py-2.5 text-white font-bold text-sm outline-none transition-all"
                              />
                            ) : (
                              <p className="font-bold text-white/80">{user.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><Phone size={18} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/30 font-bold uppercase tracking-wider mb-1">Phone</p>
                            {isEditing ? (
                              <input
                                type="tel"
                                value={editData.phone || ''}
                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                placeholder="+1 234 567 8900"
                                className="w-full bg-white/5 border border-white/10 focus:border-orange-500/50 rounded-xl px-4 py-2.5 text-white font-bold text-sm outline-none transition-all"
                              />
                            ) : (
                              <p className="font-bold text-white/80">{user.phone || 'No phone provided'}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5"><MapPin size={18} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/30 font-bold uppercase tracking-wider mb-1">Location</p>
                            {isEditing ? (
                              <p className="text-xs text-orange-400 font-medium italic">
                                {editLocationValid && editLocation.area
                                  ? `${editLocation.area}, ${editLocation.city}, ${editLocation.state} - ${editLocation.pincode}`
                                  : 'Select and verify location in header form above ↑'}
                              </p>
                            ) : locationDisplay ? (
                              <div>
                                <p className="font-bold text-white/90">{locationDisplay.line1}</p>
                                {locationDisplay.line2 && (
                                  <p className="text-sm font-medium text-white/60">{locationDisplay.line2}</p>
                                )}
                              </div>
                            ) : (
                              <p className="font-bold text-white/40">No location provided</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ecosystem Stats */}
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
                        <p className="text-2xl font-black text-white">{activeBookingsCount}</p>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">ACTIVE BOOKINGS</p>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/5 text-center transition-all hover:bg-white/10 border border-white/5">
                        <p className="text-2xl font-black text-white">{totalVaccinesCount}</p>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Vaccines</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">Pet Health Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 items-stretch">
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
                            className={`flex flex-col justify-between h-full min-h-[560px] p-8 rounded-3xl border ${petThemeClasses(theme)} backdrop-blur-md relative`}
                          >
                            {/* Card Content Top */}
                            <div className="flex flex-col gap-6">
                              {/* Avatar and Identity */}
                              <div className="flex items-center gap-4">
                                {pet.image && typeof pet.image === 'string' && (pet.image.startsWith('http') || pet.image.startsWith('/') || pet.image.startsWith('blob:') || pet.image.startsWith('data:')) ? (
                                  <img src={pet.image} alt={pet.name} className="w-16 h-16 rounded-2xl object-cover border border-white/10 shrink-0 shadow-md" />
                                ) : (
                                  <div className="text-5xl bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                                    {pet.image || '🐾'}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className={`text-2xl font-black truncate tracking-tight ${petTextClass(theme)}`}>
                                      {pet.name}
                                    </h4>
                                    {(pet.adoptionStatus === 'ADOPTED' || pet.adoptionHistory?.length > 0) && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                                        Adopted
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-white/50 truncate font-medium">
                                    {pet.breed || pet.species || 'Companion'} • {petAge}
                                  </p>
                                </div>
                              </div>

                              {/* Health Score / Temp / Status / Breed Health */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/5 min-w-0 min-h-[5.5rem] flex flex-col justify-center">
                                  <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Health Score</span>
                                  <span className={`text-xl font-black ${petTextClass(theme)}`}>
                                    {petProfile.healthScore}%
                                  </span>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/5 min-w-0 min-h-[5.5rem] flex flex-col justify-center">
                                  <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Temperature</span>
                                  <span className="text-base font-black text-white whitespace-normal break-words">
                                    {petProfile.temperature}
                                  </span>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/5 min-w-0 min-h-[5.5rem] flex flex-col justify-center">
                                  <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Health Status</span>
                                  <span className="text-xs font-bold text-white whitespace-normal break-words leading-snug">
                                    {petProfile.healthStatus}
                                  </span>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/5 min-w-0 min-h-[5.5rem] flex flex-col justify-center">
                                  <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Breed Health</span>
                                  <span className="text-[11px] text-white/70 font-medium whitespace-normal break-words [overflow-wrap:anywhere] leading-snug">
                                    {petProfile.medicalHistory}
                                  </span>
                                </div>
                              </div>

                              {/* Statistics */}
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Statistics</p>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="rounded-xl bg-white/5 p-3 border border-white/5 text-center flex flex-col justify-center items-center min-h-[5rem] min-w-0">
                                    <p className="text-base font-black text-white leading-tight">
                                      {petProfile.vaccinationRegistry.length}
                                    </p>
                                    <p className="text-[9px] text-white/40 uppercase tracking-wider mt-1 text-center leading-tight whitespace-normal break-words max-w-full">Vaccines</p>
                                  </div>
                                  <div className="rounded-xl bg-white/5 p-3 border border-white/5 text-center flex flex-col justify-center items-center min-h-[5rem] min-w-0">
                                    <p className="text-base font-black text-white leading-tight">
                                      {petProfile.healthMilestones.length}
                                    </p>
                                    <p className="text-[9px] text-white/40 uppercase tracking-wider mt-1 text-center leading-tight whitespace-normal break-words max-w-full">Milestones</p>
                                  </div>
                                  <div className="rounded-xl bg-white/5 p-3 border border-white/5 text-center flex flex-col justify-center items-center min-h-[5rem] min-w-0">
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
                                <div className="min-h-[2.5rem] max-h-32 overflow-y-auto no-scrollbar">
                                  {petProfile.activeMedications.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {petProfile.activeMedications.map((med, mIdx) => (
                                        <span
                                          key={mIdx}
                                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border break-words [overflow-wrap:anywhere] ${theme === 'purple' ? 'border-purple-500/20 bg-purple-500/10 text-purple-300' :
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
                                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1 py-1">
                                      <span>✓ No Active Medications</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Notes Section at the bottom */}
                            <div className="mt-6 pt-4 border-t border-white/10">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-1">Notes</p>
                              <p className="text-xs text-white/60 leading-relaxed italic break-words [overflow-wrap:anywhere] min-h-[1.5rem]">
                                {petProfile.notes || 'No clinical notes recorded.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Booking History (Requirement 2 & 3) */}
                  <div className="glass-dark p-8 sm:p-10 rounded-[2.5rem] border border-white/10">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">Booking History</h3>
                        <p className="text-xs text-white/40 mt-0.5">Recent service reservations</p>
                      </div>
                      <button
                        onClick={() => { setActiveTab('activity'); setActivityFilter('bookings'); }}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      >
                        View All ({userBookings.length}) <ArrowUpRight size={14} />
                      </button>
                    </div>
                    {userBookings.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No booking history registered.</p>
                    ) : (
                      <div className="space-y-3">
                        {userBookings.slice(0, 3).map((b, idx) => (
                          <div
                            key={b._id || b.id || idx}
                            onClick={() => navigate('/services')}
                            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all flex justify-between items-center text-xs cursor-pointer group"
                          >
                            <div>
                              <span className="font-bold text-white uppercase tracking-tight text-sm group-hover:text-blue-400 transition-colors">
                                {b.serviceName || b.providerName || 'Service'}
                              </span>
                              <p className="text-white/40 mt-1">
                                {b.providerName} • {b.date} @ {b.time}
                                {b.petName && ` • Pet: ${b.petName}`}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${getBookingStatusBadge(b.status)}`}>
                              {b.status || 'Confirmed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Order History (Requirement 2 & 3) */}
                  <div className="glass-dark p-8 sm:p-10 rounded-[2.5rem] border border-white/10">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">Order History</h3>
                        <p className="text-xs text-white/40 mt-0.5">Recent store purchases</p>
                      </div>
                      <button
                        onClick={() => { setActiveTab('activity'); setActivityFilter('orders'); }}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      >
                        View All ({userOrders.length}) <ArrowUpRight size={14} />
                      </button>
                    </div>
                    {userOrders.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No order history registered.</p>
                    ) : (
                      <div className="space-y-3">
                        {userOrders.slice(0, 3).map((o, idx) => (
                          <div
                            key={o._id || idx}
                            onClick={() => navigate('/store')}
                            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all flex justify-between items-center text-xs cursor-pointer group"
                          >
                            <div>
                              <span className="font-bold text-white uppercase tracking-tight text-sm group-hover:text-blue-400 transition-colors">
                                Order #{o._id?.toString().slice(-6).toUpperCase()}
                              </span>
                              <p className="text-white/40 mt-1">
                                {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'} • ${o.totalAmount ?? o.total ?? 0}
                                {o.createdAt && ` • ${new Date(o.createdAt).toLocaleDateString()}`}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${getOrderStatusBadge(o.status)}`}>
                              {o.status || 'pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Adoption History (Requirement 2 & 3) */}
                  <div className="glass-dark p-8 sm:p-10 rounded-[2.5rem] border border-white/10">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">Adoption History</h3>
                        <p className="text-xs text-white/40 mt-0.5">Recent companion applications</p>
                      </div>
                      <button
                        onClick={() => { setActiveTab('activity'); setActivityFilter('adoptions'); }}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      >
                        View All ({userAdoptions.length}) <ArrowUpRight size={14} />
                      </button>
                    </div>
                    {userAdoptions.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No adoption applications registered.</p>
                    ) : (
                      <div className="space-y-3">
                        {userAdoptions.slice(0, 3).map((a, idx) => (
                          <div
                            key={a._id || idx}
                            onClick={() => navigate('/adopt')}
                            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all flex justify-between items-center text-xs cursor-pointer group"
                          >
                            <div>
                              <span className="font-bold text-white uppercase tracking-tight text-sm group-hover:text-blue-400 transition-colors">
                                {a.pet?.name || a.listing?.title || 'Companion Application'}
                              </span>
                              <p className="text-white/40 mt-1">
                                {a.pet?.breed || a.pet?.species || 'Rescue Companion'}
                                {a.shelter?.fullName && ` • Shelter: ${a.shelter.fullName}`}
                                {a.createdAt && ` • ${new Date(a.createdAt).toLocaleDateString()}`}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${getAdoptionStatusBadge(a.status)}`}>
                              {a.status || 'pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vaccination Summary */}
                  <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">Vaccine Registry Summary</h3>
                    {displayVaccines.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No vaccinations logged.</p>
                    ) : (
                      <div className="space-y-3">
                        {displayVaccines.map((v, idx) => {
                          const vTheme = petThemeColor({ name: v.petName, themeColor: v.petTheme });
                          return (
                            <div key={v.id || idx} className="flex flex-wrap justify-between items-center gap-2 text-xs p-4 rounded-xl bg-white/5 border border-white/5">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                {adoptions.length > 1 && v.petName && (
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${petThemeClasses(vTheme)}`}>
                                    {v.petName}
                                  </span>
                                )}
                                <span className="font-bold text-white uppercase break-words [overflow-wrap:anywhere]">{v.name}</span>
                              </div>
                              <span className={`text-[10px] uppercase font-black tracking-widest shrink-0 ${v.status === 'completed' ? 'text-emerald-400' : v.status === 'overdue' ? 'text-red-400' : 'text-blue-400'}`}>
                                {v.status} ({v.date})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Health Milestones */}
                  <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">Health Milestones</h3>
                    {displayMilestones.length === 0 ? (
                      <p className="text-xs text-white/20 italic">No milestones recorded.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayMilestones.map((m, idx) => {
                          const mTheme = petThemeColor({ name: m.petName, themeColor: m.petTheme });
                          const mNotes = m.notes || m.description || '';
                          return (
                            <div key={m.id || idx} className={`p-4 rounded-2xl bg-white/5 border ${m.achieved ? 'border-emerald-500/20' : 'border-white/5'} min-w-0 flex flex-col justify-between`}>
                              <div>
                                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    {adoptions.length > 1 && m.petName && (
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${petThemeClasses(mTheme)}`}>
                                        {m.petName}
                                      </span>
                                    )}
                                    <h5 className="font-bold text-white text-sm break-words [overflow-wrap:anywhere]">{m.title}</h5>
                                  </div>
                                  <span className={`text-[10px] font-black uppercase shrink-0 ${m.achieved ? 'text-emerald-400' : 'text-white/40'}`}>
                                    {m.status ? (m.status.charAt(0).toUpperCase() + m.status.slice(1)) : (m.achieved ? 'Achieved' : 'Pending')}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/40">{m.date || '—'}</p>
                              </div>
                              {mNotes && (
                                <p className="text-[11px] text-white/60 mt-2 italic border-t border-white/5 pt-1.5 break-words [overflow-wrap:anywhere]">{mNotes}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Add Pet Modal */}
              {showAddPetModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                  <div className="w-full max-w-2xl glass-dark rounded-[2rem] p-8 border border-white/10 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-2xl font-black text-white">Add New Companion</h3>
                        <p className="text-white/40 text-xs mt-1">Register a companion into your PETLY ecosystem</p>
                      </div>
                      <button onClick={() => { setShowAddPetModal(false); setPetActionError(null); }} className="text-white/40 hover:text-white text-sm font-bold">Close</button>
                    </div>

                    {petActionError && (
                      <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{petActionError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Name *</label>
                        <input placeholder="Name *" value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Species *</label>
                        <input placeholder="Species (Dog, Cat, Rabbit...)" value={petForm.species} onChange={(e) => setPetForm({ ...petForm, species: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Breed</label>
                        <input placeholder="Breed" value={petForm.breed} onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Gender</label>
                        <input placeholder="Gender (Male, Female)" value={petForm.gender} onChange={(e) => setPetForm({ ...petForm, gender: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Date of Birth</label>
                        <input type="date" value={petForm.dob} onChange={(e) => setPetForm({ ...petForm, dob: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Adoption Date</label>
                        <input type="date" value={petForm.adoptionDate} onChange={(e) => setPetForm({ ...petForm, adoptionDate: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Weight (kg)</label>
                        <input placeholder="Weight (kg)" value={petForm.weight} onChange={(e) => setPetForm({ ...petForm, weight: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Temperature</label>
                        <input placeholder="Temperature (°F)" value={petForm.temperature || ''} onChange={(e) => setPetForm({ ...petForm, temperature: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Height</label>
                        <input placeholder="Height (optional)" value={petForm.height} onChange={(e) => setPetForm({ ...petForm, height: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Physical Color</label>
                        <input placeholder="Physical Color (e.g. White, Golden brown)" value={petForm.color} onChange={(e) => setPetForm({ ...petForm, color: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      
                      {/* Pet Theme Color Palette */}
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-bold text-white/60 block">
                          Pet Theme Color <span className="text-white/40 font-normal">(UI accent color for badges, charts & timeline)</span>
                        </label>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {THEME_PALETTE.map((item) => {
                            const isSelected = (petForm.themeColor || 'orange').toLowerCase() === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setPetForm({ ...petForm, themeColor: item.id })}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-black transition-all ${
                                  isSelected
                                    ? `${item.border} ${item.bg} ${item.text} ring-2 ${item.ring} ring-offset-2 ring-offset-black shadow-lg scale-105`
                                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                                <span>{item.name}</span>
                                {isSelected && <Check size={12} className="ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Photo Upload with S3 */}
                      <div className="md:col-span-2 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <label className="text-xs text-white/60 font-bold block">Pet Photo</label>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 text-xs font-bold cursor-pointer transition-all">
                            {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>{uploadingPhoto ? 'Uploading to S3...' : 'Upload Image to AWS S3'}</span>
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, false)} className="hidden" disabled={uploadingPhoto} />
                          </label>
                          <span className="text-white/30 text-xs">or URL/Emoji:</span>
                          <input placeholder="https://... or 🐶" value={petForm.photo} onChange={(e) => setPetForm({ ...petForm, photo: e.target.value })} className="flex-1 bg-white/5 border border-white/10 p-2.5 rounded-xl text-white text-xs outline-none focus:border-orange-500/50" />
                        </div>
                        {petForm.photoKey && (
                          <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                            <span>✓ Uploaded to S3 Key:</span>
                            <span className="truncate max-w-[280px]">{petForm.photoKey}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Medical Conditions</label>
                        <input placeholder="Medical Conditions" value={petForm.medicalConditions} onChange={(e) => setPetForm({ ...petForm, medicalConditions: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Allergies</label>
                        <input placeholder="Allergies" value={petForm.allergies} onChange={(e) => setPetForm({ ...petForm, allergies: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Vaccines (one per line)</label>
                        <textarea placeholder="Vaccines (one per line)" value={petForm.vaccines || ''} onChange={(e) => setPetForm({ ...petForm, vaccines: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50 min-h-[70px]" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Medications (one per line)</label>
                        <textarea placeholder="Medications (one per line)" value={petForm.medications || ''} onChange={(e) => setPetForm({ ...petForm, medications: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50 min-h-[70px]" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Medical Notes / Description</label>
                        <textarea placeholder="Medical Notes / Description" value={petForm.medicalNotes || ''} onChange={(e) => setPetForm({ ...petForm, medicalNotes: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-orange-500/50 min-h-[70px]" />
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-6">
                      <button onClick={() => { setShowAddPetModal(false); setPetActionError(null); }} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all">
                        Cancel
                      </button>
                      <button
                        onClick={handleAddPetSubmit}
                        disabled={petActionLoading || uploadingPhoto}
                        className="px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                      >
                        {petActionLoading && <Loader2 size={16} className="animate-spin" />}
                        <span>{petActionLoading ? 'Saving Pet...' : 'Add Pet'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Pet Modal */}
              {showEditPetModal && editingPet && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                  <div className="w-full max-w-xl glass-dark rounded-[2rem] p-8 border border-white/10 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-2xl font-black text-white">Edit Companion</h3>
                        <p className="text-white/40 text-xs mt-1">Update profile for {editingPet.name}</p>
                      </div>
                      <button onClick={() => { setShowEditPetModal(false); setEditingPet(null); setPetActionError(null); }} className="text-white/40 hover:text-white text-sm font-bold">Close</button>
                    </div>

                    {petActionError && (
                      <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{petActionError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Name</label>
                        <input value={editPetForm.name} onChange={(e) => setEditPetForm({ ...editPetForm, name: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Species</label>
                        <input value={editPetForm.species} onChange={(e) => setEditPetForm({ ...editPetForm, species: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Breed</label>
                        <input value={editPetForm.breed} onChange={(e) => setEditPetForm({ ...editPetForm, breed: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Gender</label>
                        <input value={editPetForm.gender} onChange={(e) => setEditPetForm({ ...editPetForm, gender: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Age (Years)</label>
                        <input type="number" min="0" value={editPetForm.age} onChange={(e) => setEditPetForm({ ...editPetForm, age: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Weight (kg)</label>
                        <input type="number" step="0.1" value={editPetForm.weight} onChange={(e) => setEditPetForm({ ...editPetForm, weight: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Temperature</label>
                        <input placeholder="Temperature (°F)" value={editPetForm.temperature} onChange={(e) => setEditPetForm({ ...editPetForm, temperature: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Height</label>
                        <input placeholder="Height (e.g. 45 cm)" value={editPetForm.height} onChange={(e) => setEditPetForm({ ...editPetForm, height: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Physical Color</label>
                        <input placeholder="Physical Color" value={editPetForm.color} onChange={(e) => setEditPetForm({ ...editPetForm, color: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>

                      {/* Pet Theme Color Palette */}
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-bold text-white/60 block">
                          Pet Theme Color <span className="text-white/40 font-normal">(UI accent color for badges, charts & timeline)</span>
                        </label>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {THEME_PALETTE.map((item) => {
                            const isSelected = (editPetForm.themeColor || 'orange').toLowerCase() === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setEditPetForm({ ...editPetForm, themeColor: item.id })}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-black transition-all ${
                                  isSelected
                                    ? `${item.border} ${item.bg} ${item.text} ring-2 ${item.ring} ring-offset-2 ring-offset-black shadow-lg scale-105`
                                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                                <span>{item.name}</span>
                                {isSelected && <Check size={12} className="ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Date of Birth</label>
                        <input type="date" value={editPetForm.dob} onChange={(e) => setEditPetForm({ ...editPetForm, dob: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Adoption Date</label>
                        <input type="date" value={editPetForm.adoptionDate} onChange={(e) => setEditPetForm({ ...editPetForm, adoptionDate: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Allergies</label>
                        <input placeholder="Allergies (comma separated)" value={editPetForm.allergies} onChange={(e) => setEditPetForm({ ...editPetForm, allergies: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Medical Conditions</label>
                        <input placeholder="Medical Conditions (comma separated)" value={editPetForm.medicalConditions} onChange={(e) => setEditPetForm({ ...editPetForm, medicalConditions: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Health Status</label>
                        <select
                          value={editPetForm.healthStatus}
                          onChange={(e) => setEditPetForm({ ...editPetForm, healthStatus: e.target.value })}
                          className="w-full bg-neutral-900 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50"
                        >
                          <option value="Healthy">Healthy</option>
                          <option value="Active">Active</option>
                          <option value="Under Treatment">Under Treatment</option>
                          <option value="Recovering">Recovering</option>
                          <option value="Senior Care">Senior Care</option>
                        </select>
                      </div>

                      {/* Photo Update */}
                      <div className="md:col-span-2 p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <label className="text-[11px] font-bold text-white/50 block">Update Photo</label>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 text-xs font-bold cursor-pointer transition-all">
                            {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>{uploadingPhoto ? 'Uploading to S3...' : 'Upload New Photo to S3'}</span>
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, true)} className="hidden" disabled={uploadingPhoto} />
                          </label>
                          <input placeholder="Image URL" value={editPetForm.photoUrl} onChange={(e) => setEditPetForm({ ...editPetForm, photoUrl: e.target.value })} className="flex-1 bg-white/5 border border-white/10 p-2.5 rounded-xl text-white text-xs outline-none focus:border-orange-500/50" />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-white/50 block mb-1">Description / Notes</label>
                        <textarea
                          value={editPetForm.description}
                          onChange={(e) => setEditPetForm({ ...editPetForm, description: e.target.value })}
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-orange-500/50"
                        />
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-6">
                      <button onClick={() => { setShowEditPetModal(false); setEditingPet(null); setPetActionError(null); }} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all">
                        Cancel
                      </button>
                      <button
                        onClick={handleEditPetSubmit}
                        disabled={petActionLoading || uploadingPhoto}
                        className="px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                      >
                        {petActionLoading && <Loader2 size={16} className="animate-spin" />}
                        <span>{petActionLoading ? 'Saving Changes...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Confirmation Modal */}
              {deleteConfirmPet && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                  <div className="w-full max-w-md glass-dark rounded-[2rem] p-8 border border-red-500/20 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
                      <Trash2 size={28} />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Delete Pet Profile?</h3>
                    <p className="text-white/60 text-xs mb-6">
                      Are you sure you want to remove <span className="font-bold text-white">"{deleteConfirmPet.name}"</span>? This will permanently delete the pet record from the database.
                    </p>

                    {petActionError && (
                      <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                        {petActionError}
                      </div>
                    )}

                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => { setDeleteConfirmPet(null); setPetActionError(null); }}
                        className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeletePetConfirm}
                        disabled={petActionLoading}
                        className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black text-sm transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
                      >
                        {petActionLoading && <Loader2 size={16} className="animate-spin" />}
                        <span>{petActionLoading ? 'Deleting...' : 'Confirm Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pets' && (
                <motion.div
                  key="pets" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Error Alert */}
                  {petsError && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-red-400 text-xs font-medium">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{petsError}</span>
                      </div>
                      <button
                        onClick={fetchPets}
                        className="px-4 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Header & Add Button */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white">Registered Companions</h3>
                      <p className="text-white/40 text-xs mt-0.5">{adoptions.length} pets registered in your profile</p>
                    </div>
                    <button
                      onClick={() => { setPetActionError(null); setShowAddPetModal(true); }}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition-all shadow-lg shadow-orange-500/20"
                    >
                      <Plus size={16} /> Add Companion
                    </button>
                  </div>

                  {/* Loading State */}
                  {petsLoading ? (
                    <div className="py-20 text-center glass-dark rounded-[2.5rem] border border-white/10">
                      <Loader2 className="animate-spin text-orange-500 mx-auto mb-4" size={40} />
                      <p className="text-white/60 font-medium text-sm">Loading companions from database...</p>
                    </div>
                  ) : adoptions.length === 0 ? (
                    <div className="py-16 text-center glass-dark rounded-[2.5rem] border border-white/10">
                      <PawPrint size={64} className="mx-auto mb-4 text-white/20" />
                      <h4 className="text-lg font-black text-white mb-2">No Companions Yet</h4>
                      <p className="text-white/40 text-xs mb-6 max-w-sm mx-auto">You have not registered any pets yet. Click the button below to add your first companion.</p>
                      <button
                        onClick={() => { setPetActionError(null); setShowAddPetModal(true); }}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 text-white font-bold text-xs"
                      >
                        <Plus size={16} /> Add Your First Pet
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {adoptions.map((pet, idx) => {
                        const theme = petThemeColor(pet);
                        const petSnapshot = getPetProfileSnapshot(pet);
                        const petVaccines = petSnapshot.vaccinationRegistry;
                        const completedVaccines = petVaccines.filter(v => v.status === 'completed').length;
                        const petMedications = petSnapshot.activeMedications;
                        const activeMedications = petMedications.map(m => m.name || m.title).join(', ') || 'None';
                        const petMilestones = petSnapshot.healthMilestones;
                        const completedMilestones = petMilestones.filter(m => m.achieved || m.status === 'completed').length;
                        const nextAppointment = petSnapshot.upcomingAppointments[0]?.date
                          ? `${petSnapshot.upcomingAppointments[0].title || 'Appointment'} • ${petSnapshot.upcomingAppointments[0].date}`
                          : 'None';
                        const profile = getPetHealthProfile(pet);
                        const isImg = (pet.photoUrl && (pet.photoUrl.startsWith('http') || pet.photoUrl.startsWith('/'))) || (pet.image && pet.image.startsWith('http'));
                        const imgSrc = pet.photoUrl || pet.image;

                        return (
                          <div key={pet._id || pet.id || idx} className={`glass-dark p-8 rounded-[2.5rem] border ${petThemeClasses(theme)} bg-white/5 flex flex-col justify-between`}>
                            <div>
                              {/* Top Bar: Avatar, Info, Action Buttons */}
                              <div className="flex items-start justify-between gap-4 mb-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                    {isImg ? (
                                      <img src={imgSrc} alt={pet.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-3xl">{pet.image || '🐾'}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h4 className={`text-2xl font-black ${petTextClass(theme)}`}>{pet.name}</h4>
                                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${petTextClass(theme)} bg-white/5 border border-white/10`}>{pet.species}</span>
                                      {pet.adoptionStatus === 'ADOPTED' && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                          ADOPTED
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-white/40">{pet.breed || 'Companion'} {pet.age ? `• ${pet.age} yrs` : ''}</p>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mt-1">{pet.healthStatus || profile.healthStatus || 'Healthy'}</p>
                                    {pet.description && (
                                      <p className="text-xs text-white/50 mt-2 line-clamp-2 italic leading-relaxed break-words [overflow-wrap:anywhere]">{pet.description}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Actions: Detail Link, Edit, Delete */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Link
                                    to={`/pet/${pet._id || pet.id}`}
                                    title="View Full Profile"
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                                  >
                                    <ChevronRight size={16} />
                                  </Link>
                                  <button
                                    onClick={() => handleOpenEditModal(pet)}
                                    title="Edit Pet"
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                                  >
                                    <Edit3 size={16} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmPet(pet)}
                                    title="Delete Pet"
                                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              {/* Vitals Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                                <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10 min-w-0">
                                  <p className="text-[9px] uppercase tracking-wider text-white/40 mb-1 leading-tight break-words">Weight</p>
                                  <p className="font-black text-white text-sm whitespace-nowrap">{pet.weight ? `${pet.weight} kg` : '--'}</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10 min-w-0">
                                  <p className="text-[9px] uppercase tracking-wider text-white/40 mb-1 leading-tight break-words">Temp</p>
                                  <p className="font-black text-white text-sm whitespace-nowrap">{pet.temperature ? (String(pet.temperature).includes('°') ? pet.temperature : `${pet.temperature}°F`) : (profile.temperature || '101.2°F')}</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10 min-w-0">
                                  <p className="text-[9px] uppercase tracking-wider text-white/40 mb-1 leading-tight break-words">Height</p>
                                  <p className="font-black text-white text-sm whitespace-nowrap">{pet.height || '--'}</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10 min-w-0">
                                  <p className="text-[9px] uppercase tracking-wider text-white/40 mb-1 leading-tight break-words">Physical Color</p>
                                  <p className="font-black text-white text-sm capitalize whitespace-nowrap">{pet.color || '--'}</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10 min-w-0">
                                  <p className="text-[9px] uppercase tracking-wider text-white/40 mb-1 leading-tight break-words">Theme Color</p>
                                  <p className={`font-black text-sm capitalize whitespace-nowrap ${petTextClass(petThemeColor(pet))}`}>{petThemeColor(pet)}</p>
                                </div>
                              </div>

                              {/* Structured Allergies & Conditions Display */}
                              {((Array.isArray(pet.allergies) && pet.allergies.length > 0) || (typeof pet.allergies === 'string' && pet.allergies.trim())) && (
                                <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs">
                                  <span className="text-[9px] uppercase tracking-widest text-red-400 font-bold block mb-0.5">Allergies</span>
                                  <span className="text-white font-medium break-words [overflow-wrap:anywhere]">
                                    {Array.isArray(pet.allergies) ? pet.allergies.join(', ') : pet.allergies}
                                  </span>
                                </div>
                              )}
                              {((Array.isArray(pet.medicalConditions) && pet.medicalConditions.length > 0) || (typeof pet.medicalConditions === 'string' && pet.medicalConditions.trim())) && (
                                <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
                                  <span className="text-[9px] uppercase tracking-widest text-amber-400 font-bold block mb-0.5">Medical Conditions</span>
                                  <span className="text-white font-medium break-words [overflow-wrap:anywhere]">
                                    {Array.isArray(pet.medicalConditions) ? pet.medicalConditions.join(', ') : pet.medicalConditions}
                                  </span>
                                </div>
                              )}

                              {/* Health Score & Stats */}
                              <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/10 text-center">
                                  <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Health Score</p>
                                  <p className={`text-xl font-black ${petTextClass(theme)}`}>{profile.healthScore ?? pet.healthScore ?? 92}%</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/10 text-center">
                                  <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Vaccines</p>
                                  <p className="text-base font-black text-white">{petVaccines.length}</p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4 border border-white/10 text-center">
                                  <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Milestones</p>
                                  <p className="text-base font-black text-white">{petMilestones.length}</p>
                                </div>
                              </div>
                            </div>

                            {/* Footer: Appointments & Meds */}
                            <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/40">
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">Next: <strong className="text-white/70">{nextAppointment}</strong></span>
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">Meds: <strong className="text-white/70">{activeMedications}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <a href="/adopt" className="glass-dark p-12 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center text-center opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer border-dashed mt-8">
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
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                            ) : (
                              <span className="text-4xl shrink-0">{p.image || '🐾'}</span>
                            )}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-white text-sm truncate">{p.name}</h5>
                              <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest truncate">{p.breed}</p>
                            </div>
                            <button
                              onClick={() => removeFromWishlistPet ? removeFromWishlistPet(p.id || p._id) : toggleWishlistPet(p.id || p._id)}
                              className="text-white/30 hover:text-red-400 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer ml-auto shrink-0"
                              title="Remove from saved pets"
                            >
                              <Trash2 size={16} />
                            </button>
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

              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Activity Subtabs Navigation */}
                  <div className="glass-dark p-6 rounded-[2.5rem] border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
                          <Activity size={22} className="text-orange-500" /> Activity History
                        </h3>
                        <p className="text-xs text-white/40 mt-1">
                          Comprehensive overview of all your bookings, orders, and rescue applications
                        </p>
                      </div>
                    </div>

                    {/* Subtabs Filter Pill Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                      {[
                        { id: 'all', label: 'All Activity', count: combinedActivity.length, icon: <Activity size={14} /> },
                        { id: 'orders', label: 'Orders', count: userOrders.length, icon: <ShoppingBag size={14} /> },
                        { id: 'bookings', label: 'Bookings', count: userBookings.length, icon: <Stethoscope size={14} /> },
                        { id: 'adoptions', label: 'Adoptions', count: userAdoptions.length, icon: <PawPrint size={14} /> },
                      ].map((sub) => {
                        const isActive = activityFilter === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setActivityFilter(sub.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                              isActive
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/5'
                            }`}
                          >
                            {sub.icon}
                            <span>{sub.label}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isActive ? 'bg-black/20 text-white' : 'bg-white/10 text-white/40'
                              }`}
                            >
                              {sub.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subtab Content: All */}
                  {activityFilter === 'all' && (
                    <div className="glass-dark p-6 sm:p-8 rounded-[2.5rem] border border-white/10 space-y-4">
                      {combinedActivity.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30">
                            <Activity size={28} />
                          </div>
                          <p className="text-sm font-bold text-white mb-1">No Activity Found</p>
                          <p className="text-xs text-white/30">You have no orders, bookings, or adoption records yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {combinedActivity.map((item) => {
                            const isOrder = item.type === 'order';
                            const isBooking = item.type === 'booking';
                            const isAdoption = item.type === 'adoption';

                            let typeBadgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                            let statusBadgeClass = '';
                            let typeIcon = <Activity size={14} />;

                            if (isOrder) {
                              typeBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                              statusBadgeClass = getOrderStatusBadge(item.status);
                              typeIcon = <ShoppingBag size={14} />;
                            } else if (isBooking) {
                              typeBadgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                              statusBadgeClass = getBookingStatusBadge(item.status);
                              typeIcon = <Stethoscope size={14} />;
                            } else if (isAdoption) {
                              typeBadgeClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                              statusBadgeClass = getAdoptionStatusBadge(item.status);
                              typeIcon = <PawPrint size={14} />;
                            }

                            return (
                              <div
                                key={`${item.type}-${item.id}`}
                                onClick={() => navigate(item.targetUrl)}
                                className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 hover:bg-white/[0.08] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                              >
                                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-white/60 group-hover:text-white transition-colors">
                                    {typeIcon}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${typeBadgeClass}`}>
                                        {item.type}
                                      </span>
                                      <span className="text-[10px] text-white/30 font-medium">
                                        {item.date ? new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-white text-sm truncate group-hover:text-orange-400 transition-colors">
                                      {item.title}
                                    </h4>
                                    <p className="text-xs text-white/40 truncate mt-0.5">
                                      {item.subtitle}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusBadgeClass}`}>
                                    {item.status}
                                  </span>
                                  <ArrowUpRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtab Content: Orders */}
                  {activityFilter === 'orders' && (
                    <div className="glass-dark p-6 sm:p-8 rounded-[2.5rem] border border-white/10 space-y-4">
                      {userOrders.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30">
                            <ShoppingBag size={28} />
                          </div>
                          <p className="text-sm font-bold text-white mb-1">No Orders Placed</p>
                          <p className="text-xs text-white/30 mb-6">You have not made any purchases from the Petly Store yet.</p>
                          <button
                            onClick={() => navigate('/store')}
                            className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Visit Store
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {userOrders.map((o) => (
                            <div
                              key={o._id}
                              onClick={() => navigate('/store')}
                              className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 hover:bg-white/[0.08] transition-all cursor-pointer group"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-white/5">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">
                                      Order #{o._id?.toString().slice(-6).toUpperCase()}
                                    </span>
                                    <span className="text-[10px] text-white/30">
                                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}
                                    </span>
                                  </div>
                                  <p className="text-xs text-white/40">
                                    {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'} • Total: <strong className="text-white font-bold">${o.totalAmount ?? o.total ?? 0}</strong>
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getOrderStatusBadge(o.status)}`}>
                                    {o.status || 'pending'}
                                  </span>
                                  <ArrowUpRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                                </div>
                              </div>
                              {Array.isArray(o.items) && o.items.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {o.items.map((it, idx) => (
                                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] text-white/60 border border-white/5">
                                      {it.name || 'Product'} {it.quantity > 1 ? `× ${it.quantity}` : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtab Content: Bookings */}
                  {activityFilter === 'bookings' && (
                    <div className="glass-dark p-6 sm:p-8 rounded-[2.5rem] border border-white/10 space-y-4">
                      {userBookings.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30">
                            <Stethoscope size={28} />
                          </div>
                          <p className="text-sm font-bold text-white mb-1">No Bookings Found</p>
                          <p className="text-xs text-white/30 mb-6">You have no service bookings scheduled or on record.</p>
                          <button
                            onClick={() => navigate('/services')}
                            className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Explore Services
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {userBookings.map((b) => (
                            <div
                              key={b._id || b.id}
                              onClick={() => navigate('/services')}
                              className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 hover:bg-white/[0.08] transition-all cursor-pointer group"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                                      {b.serviceName || b.providerName || 'Service Appointment'}
                                    </h4>
                                    {b.category && (
                                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-white/5 text-white/50 border border-white/5">
                                        {b.category}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-white/50">
                                    Provider: <strong className="text-white/80">{b.providerName || 'Specialist'}</strong>
                                    {b.petName && (
                                      <span> • Pet: <strong className="text-orange-400">{b.petName}</strong></span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getBookingStatusBadge(b.status)}`}>
                                    {b.status || 'Confirmed'}
                                  </span>
                                  <ArrowUpRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 pt-2 border-t border-white/5 mt-3">
                                <span className="flex items-center gap-1.5">
                                  <Calendar size={12} className="text-blue-400" />
                                  {b.date} @ {b.time}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span className="text-emerald-400 font-bold">$</span>
                                  ${b.price ?? 0}
                                </span>
                                {b.notes && (
                                  <span className="text-white/30 italic truncate max-w-xs">
                                    "{b.notes}"
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtab Content: Adoptions */}
                  {activityFilter === 'adoptions' && (
                    <div className="glass-dark p-6 sm:p-8 rounded-[2.5rem] border border-white/10 space-y-4">
                      {userAdoptions.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30">
                            <PawPrint size={28} />
                          </div>
                          <p className="text-sm font-bold text-white mb-1">No Adoption Applications</p>
                          <p className="text-xs text-white/30 mb-6">You have not submitted any companion adoption applications yet.</p>
                          <button
                            onClick={() => navigate('/adopt')}
                            className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Meet Companions
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {userAdoptions.map((a) => (
                            <div
                              key={a._id}
                              onClick={() => navigate('/adopt')}
                              className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 hover:bg-white/[0.08] transition-all cursor-pointer group"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                <div>
                                  <h4 className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors mb-1">
                                    Adoption: {a.pet?.name || a.listing?.title || 'Rescue Companion'}
                                  </h4>
                                  <p className="text-xs text-white/50">
                                    {a.pet?.breed ? `${a.pet.breed} • ` : ''}
                                    {a.shelter?.fullName ? `Shelter: ${a.shelter.fullName}` : 'Application on file'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getAdoptionStatusBadge(a.status)}`}>
                                    {a.status || 'pending'}
                                  </span>
                                  <ArrowUpRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 pt-2 border-t border-white/5 mt-3">
                                <span className="flex items-center gap-1.5">
                                  <Calendar size={12} className="text-orange-400" />
                                  Submitted {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Recently'}
                                </span>
                                {a.livingSituation && (
                                  <span className="text-white/30 truncate max-w-sm">
                                    Home: {a.livingSituation}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Notifications Tab Content */}
              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="glass-dark p-8 sm:p-10 rounded-[2.5rem] border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                          <Bell className="text-orange-500" size={24} />
                          <span>Notifications</span>
                        </h3>
                        <p className="text-xs text-white/40 mt-1">
                          Complete history of your community likes, comments, and system updates
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {profileNotifications.some(n => !n.isRead) && (
                          <button
                            type="button"
                            onClick={handleProfileMarkAllAsRead}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold transition-all border border-orange-500/20 cursor-pointer"
                          >
                            <CheckCheck size={14} />
                            <span>Mark all as read</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filter Pills: ALL | UNREAD */}
                    <div className="flex items-center gap-2 pt-6 pb-2">
                      <button
                        type="button"
                        onClick={() => setNotifFilter('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          notifFilter === 'all'
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        <span>ALL</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          notifFilter === 'all' ? 'bg-black/20 text-white' : 'bg-white/10 text-white/40'
                        }`}>
                          {profileNotifications.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifFilter('unread')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          notifFilter === 'unread'
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        <span>UNREAD</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          notifFilter === 'unread' ? 'bg-black/20 text-white' : 'bg-white/10 text-white/40'
                        }`}>
                          {profileNotifications.filter(n => !n.isRead).length}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Notification List with Scrolling */}
                  <div className="glass-dark p-6 sm:p-8 rounded-[2.5rem] border border-white/10">
                    {notifsLoading && profileNotifications.length === 0 ? (
                      <div className="text-center py-16">
                        <Loader2 size={32} className="animate-spin text-orange-500 mx-auto mb-3" />
                        <p className="text-sm font-bold text-white/60">Loading notification history...</p>
                      </div>
                    ) : (notifFilter === 'unread' ? profileNotifications.filter(n => !n.isRead) : profileNotifications).length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/30">
                          <Bell size={28} />
                        </div>
                        <p className="text-base font-bold text-white mb-1">
                          {notifFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </p>
                        <p className="text-xs text-white/40 max-w-sm mx-auto">
                          {notifFilter === 'unread'
                            ? 'You have caught up with all your notifications!'
                            : 'When other pet parents interact with your posts or activity occurs, updates will appear here.'}
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[640px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {(notifFilter === 'unread' ? profileNotifications.filter(n => !n.isRead) : profileNotifications).map((notif) => (
                          <div
                            key={notif._id}
                            onClick={() => handleProfileNotificationClick(notif)}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 group ${
                              notif.isRead
                                ? 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                                : 'bg-orange-500/[0.08] border-orange-500/20 hover:bg-orange-500/[0.14] hover:border-orange-500/30'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${
                              notif.isRead ? 'bg-white/5 text-white/40' : 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                            }`}>
                              {notif.metadata?.action === 'comment' ? (
                                <MessageSquare size={18} />
                              ) : notif.metadata?.action === 'like' ? (
                                <Heart size={18} />
                              ) : (
                                <Bell size={18} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h4 className={`text-sm font-bold truncate group-hover:text-orange-400 transition-colors ${
                                    notif.isRead ? 'text-white/80' : 'text-white'
                                  }`}>
                                    {notif.title}
                                  </h4>
                                  {!notif.isRead && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                                      New
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-white/40 whitespace-nowrap">
                                  {formatTimeAgo(notif.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-center">
                              {!notif.isRead && (
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
                              )}
                              {notif.link && (
                                <ArrowUpRight size={16} className="text-white/20 group-hover:text-white transition-colors" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Quiz History / Bookmarked posts */}
          <div className="space-y-8">
            <div className="glass-dark p-10 rounded-[2.5rem] border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award size={18} className="text-orange-400" /> Quiz History
                </h3>
                {combinedQuizHistory.length > 0 && (
                  <Link
                    to="/quiz"
                    className="text-xs font-black text-orange-500 hover:text-orange-400 uppercase tracking-wider transition-colors"
                  >
                    View All
                  </Link>
                )}
              </div>
              {combinedQuizHistory.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-white/20 italic">No quiz completions logged.</p>
                  <Link to="/quiz" className="inline-block mt-4 text-xs font-black text-orange-500 uppercase tracking-widest hover:text-orange-400">Take Quiz</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {combinedQuizHistory.slice(0, 5).map((q, idx) => (
                    <div key={q.id || idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white uppercase tracking-tighter flex items-center gap-1.5">{q.topMatchIcon} {q.topMatch}</span>
                        <span className="text-orange-500 font-bold">{q.topMatchScore}%</span>
                      </div>
                      <p className="text-white/20 text-[9px] uppercase tracking-widest mt-2">{q.date}</p>
                    </div>
                  ))}
                  {combinedQuizHistory.length > 5 && (
                    <Link
                      to="/quiz"
                      className="block text-center pt-2 text-xs font-bold text-orange-500 hover:text-orange-400 uppercase tracking-wider transition-colors"
                    >
                      View All ({combinedQuizHistory.length})
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="glass-dark p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bookmark size={18} className="text-blue-500 fill-blue-500" /> Saved Feeds
                </h3>
                {displaySavedPosts.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {displaySavedPosts.length} Bookmarked
                  </span>
                )}
              </div>

              {savedPostsLoading && !savedPostsLoaded ? (
                <div className="py-8 flex justify-center items-center text-white/30 text-xs">
                  <Loader2 size={16} className="animate-spin mr-2 text-blue-400" /> Loading saved feeds...
                </div>
              ) : displaySavedPosts.length === 0 ? (
                <p className="text-xs text-white/20 italic py-4">No bookmarked community posts.</p>
              ) : (
                <div className="space-y-3">
                  {displaySavedPosts.map((post) => {
                    const postId = post._id || post.id;
                    const authorName = post.author?.fullName || post.author || 'Petly Guardian';
                    const postTitle = post.title || (post.content ? post.content.split('\n')[0] : 'Community Post');
                    const postBody = post.body || (post.content && post.content.includes('\n') ? post.content.split('\n').slice(1).join(' ') : post.content) || '';
                    const category = post.category || 'General';
                    const hasMedia = Boolean(post.mediaUrl || post.mediaKey);
                    const isVideo = post.mediaType === 'video' || (post.mediaKey && post.mediaKey.match(/\.(mp4|webm)$/i));

                    return (
                      <Link
                        key={postId}
                        to={`/community/post/${postId}`}
                        className="block p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all group"
                      >
                        <div className="flex gap-3">
                          {hasMedia && post.mediaUrl && (
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-white/10 flex items-center justify-center">
                              {isVideo ? (
                                <Film size={16} className="text-blue-400" />
                              ) : (
                                <img
                                  src={post.mediaUrl}
                                  alt={postTitle}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-white/5 text-white/50 border border-white/5">
                                {category}
                              </span>
                              <span className="text-[9px] text-white/30 truncate">By {authorName}</span>
                            </div>
                            <h5 className="font-bold text-white text-xs truncate group-hover:text-blue-400 transition-colors">
                              {postTitle}
                            </h5>
                            {postBody && (
                              <p className="text-[11px] text-white/50 truncate mt-0.5">
                                {postBody}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-[9px] font-black text-white/30 uppercase tracking-wider">
                              <span>{(post.likesCount !== undefined ? post.likesCount : (post.votes || 0))} Votes</span>
                              <span>{(post.commentsCount !== undefined ? post.commentsCount : (post.comments || 0))} Responses</span>
                              <span className="text-blue-400 ml-auto flex items-center gap-1">
                                <Bookmark size={10} fill="currentColor" /> Saved
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
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

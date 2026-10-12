import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, MapPin, Heart, MessageSquare, Phone, Info, X, 
  Calendar, Clock, CheckCircle, Sparkles, Map, ArrowRight, Plus,
  Edit2, Trash2, ShieldCheck, AlertCircle, FileText, Check, Ban,
  ExternalLink, RefreshCw, ChevronRight, User, DollarSign, Home,
  Upload, Tag
} from 'lucide-react';
import { PETS_DATA } from '../data/pets';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';
import { uploadAPI } from '../services/api';

const Adopt = () => {
  const { user } = useAuth();
  const { 
    wishlistPets: wishlist, 
    toggleWishlistPet: toggleWishlist, 
    addAdoptionRequest,
    mongoPets,
    updatePet,
    adoptionListings,
    adoptionListingsLoading,
    adoptionListingsError,
    fetchAdoptionListings,
    createAdoptionListing,
    updateAdoptionListing,
    deleteAdoptionListing,
    myApplications,
    myApplicationsLoading,
    myApplicationsError,
    fetchMyApplications,
    applyForAdoption,
    withdrawApplication,
    deleteApplication,
    getListingApplications,
    updateApplicationStatus
  } = useEcosystem();

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'my-applications' | 'manage-listings'
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Apply Modal state
  const [selectedListing, setSelectedListing] = useState(null);
  const [viewingListing, setViewingListing] = useState(null);
  const [adoptionStep, setAdoptionStep] = useState(0);

  // Short description helper for visually consistent card previews
  const getShortDescription = (desc, maxLength = 135) => {
    if (!desc) return '';
    const trimmed = desc.trim();
    if (trimmed.length <= maxLength) return trimmed;
    const sliced = trimmed.slice(0, maxLength);
    const lastSpace = sliced.lastIndexOf(' ');
    return (lastSpace > 90 ? sliced.slice(0, lastSpace) : sliced) + '...';
  };
  const [adoptionForm, setAdoptionForm] = useState({ 
    livingSituation: '', 
    experience: '', 
    phone: '', 
    meetingDate: '', 
    notes: '' 
  });
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Listing Creation Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    pet: '',
    title: '',
    description: '',
    adoptionFee: 0,
    requirements: '',
    location: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);
  const [createPhotoFile, setCreatePhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Edit Listing Modal state
  const [editingListing, setEditingListing] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    adoptionFee: 0,
    requirements: '',
    location: '',
    status: 'available',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete Listing Confirmation
  const [deletingId, setDeletingId] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Owner Application Review Modal
  const [reviewListing, setReviewListing] = useState(null);
  const [reviewApplications, setReviewApplications] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [actionInProgressId, setActionInProgressId] = useState(null);

  // Application withdraw confirmation
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  // Refresh on mount
  useEffect(() => {
    fetchAdoptionListings();
    if (user) {
      fetchMyApplications();
    }
  }, [user, fetchAdoptionListings, fetchMyApplications]);

  // Set default pet in createForm when mongoPets are loaded
  useEffect(() => {
    if (mongoPets && mongoPets.length > 0 && !createForm.pet) {
      setCreateForm(prev => ({ ...prev, pet: mongoPets[0]._id }));
    }
  }, [mongoPets, createForm.pet]);

  // Prefill phone when user opens apply modal
  useEffect(() => {
    if (user?.phone && !adoptionForm.phone) {
      setAdoptionForm(prev => ({ ...prev, phone: user.phone }));
    }
  }, [user, selectedListing]);

  // Derive listings owned by current user
  const myListings = useMemo(() => {
    if (!user || !Array.isArray(adoptionListings)) return [];
    const uid = (user._id || user.id)?.toString();
    return adoptionListings.filter(l => {
      const shelterId = (l.shelter?._id || l.shelter)?.toString();
      return shelterId === uid || user.role === 'admin';
    });
  }, [user, adoptionListings]);

  // Normalization helper for consistent rendering of MongoDB listings vs demo data
  const normalizedListings = useMemo(() => {
    if (Array.isArray(adoptionListings) && adoptionListings.length > 0) {
      return adoptionListings.map(listing => {
        const pet = listing.pet || {};
        const shelter = listing.shelter || {};
        const isOwner = user && ((shelter._id || shelter)?.toString() === (user._id || user.id)?.toString() || user.role === 'admin');
        const userApp = Array.isArray(myApplications) ? myApplications.find(app => {
          const lId = (app.listing?._id || app.listing)?.toString();
          return lId === listing._id?.toString() && app.status !== 'withdrawn';
        }) : null;

        return {
          id: listing._id,
          _id: listing._id,
          name: pet.name || listing.title,
          species: (pet.species || 'other').toLowerCase(),
          breed: pet.breed || 'Rescue Companion',
          age: pet.age ? `${pet.age} ${pet.age === 1 ? 'yr' : 'yrs'}` : '1 yr',
          gender: pet.gender || 'Unknown',
          location: listing.location || 'Sanctuary Station',
          shelterName: shelter.shelterDetails?.shelterName || shelter.shelterDetails?.name || shelter.fullName || 'Petly Sanctuary',
          shelterEmail: shelter.email || '',
          price: listing.adoptionFee !== undefined ? listing.adoptionFee : 0,
          description: listing.description || pet.description || 'Ready for a loving forever home.',
          requirements: Array.isArray(listing.requirements) ? listing.requirements : [],
          status: listing.status || 'available',
          photoUrl: pet.photoUrl || '',
          image: pet.species?.toLowerCase() === 'cat' ? '🐈' : pet.species?.toLowerCase() === 'rabbit' ? '🐇' : pet.species?.toLowerCase() === 'bird' ? '🦜' : '🐕',
          themeColor: pet.themeColor || 'orange',
          isOwner: Boolean(isOwner),
          hasApplied: Boolean(userApp),
          applicationStatus: userApp?.status || null,
          rawListing: listing,
          rawPet: pet,
        };
      });
    } else if (user) {
      return [];
    } else {
      // Demo mode fallback
      return PETS_DATA.map(pet => ({
        id: pet.id,
        _id: pet.id,
        name: pet.name,
        species: (pet.type || 'other').toLowerCase(),
        breed: pet.breed,
        age: pet.age,
        gender: pet.gender,
        location: pet.location,
        shelterName: pet.shelter,
        price: pet.price,
        description: pet.story || pet.medical || 'Friendly and ready for adoption.',
        requirements: ['Loving home', 'Care commitment'],
        status: 'available',
        photoUrl: '',
        image: pet.image,
        themeColor: 'orange',
        isOwner: false,
        hasApplied: false,
        applicationStatus: null,
        rawListing: pet,
        rawPet: pet,
      }));
    }
  }, [user, adoptionListings, myApplications]);

  // Filter and Search logic
  const filteredListings = useMemo(() => {
    return normalizedListings.filter(item => {
      const matchesFilter = filter === 'all' || item.species === filter.toLowerCase();
      const s = search.trim().toLowerCase();
      const matchesSearch = !s || 
        item.name.toLowerCase().includes(s) || 
        item.breed.toLowerCase().includes(s) ||
        item.location.toLowerCase().includes(s) ||
        item.description.toLowerCase().includes(s);
      return matchesFilter && matchesSearch;
    });
  }, [normalizedListings, filter, search]);

  // Handle Application Submit
  const handleAdoptSubmit = async () => {
    if (!selectedListing) return;

    if (user) {
      setApplySubmitting(true);
      setApplyError(null);
      try {
        const fullNotes = [
          adoptionForm.meetingDate ? `Preferred Meeting: ${adoptionForm.meetingDate}` : '',
          adoptionForm.notes ? `Additional Notes: ${adoptionForm.notes}` : ''
        ].filter(Boolean).join(' | ');

        await applyForAdoption(selectedListing.id, {
          livingSituation: adoptionForm.livingSituation,
          experience: adoptionForm.experience,
          phone: adoptionForm.phone || user.phone || '',
          notes: fullNotes,
        });

        setShowSuccess(true);
        setTimeout(() => {
          setSelectedListing(null);
          setAdoptionStep(0);
          setShowSuccess(false);
          setAdoptionForm({ livingSituation: '', experience: '', phone: '', meetingDate: '', notes: '' });
        }, 2800);
      } catch (err) {
        setApplyError(err.message || 'Failed to submit adoption application.');
      } finally {
        setApplySubmitting(false);
      }
    } else {
      // Demo / Guest fallback
      const newAdoption = {
        ...selectedListing,
        ...adoptionForm,
        userId: 'guest',
        id: Date.now(),
        status: 'Pending Review'
      };
      addAdoptionRequest(newAdoption);
      setShowSuccess(true);
      setTimeout(() => {
        setSelectedListing(null);
        setAdoptionStep(0);
        setShowSuccess(false);
        setAdoptionForm({ livingSituation: '', experience: '', phone: '', meetingDate: '', notes: '' });
      }, 2800);
    }
  };

  // Handle Listing Creation
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!createForm.pet) {
      setCreateError('Please select a registered companion to list for adoption.');
      return;
    }
    if (!createForm.title.trim()) {
      setCreateError('Listing title is required.');
      return;
    }
    if (!createForm.description.trim()) {
      setCreateError('Listing description is required.');
      return;
    }

    setCreateSubmitting(true);
    try {
      // If photo was provided, upload to S3 under 'adoption' category
      let s3PhotoKey = '';
      let s3PhotoUrl = '';
      if (createPhotoFile) {
        setUploadingPhoto(true);
        try {
          const uploadRes = await uploadAPI.uploadFile(createPhotoFile, 'adoption');
          if (uploadRes.file?.key) {
            s3PhotoKey = uploadRes.file.key;
            s3PhotoUrl = uploadRes.file.presignedUrl || uploadRes.file.url;
            // Update pet's photo key in database
            await updatePet(createForm.pet, { photoKey: s3PhotoKey, photoUrl: s3PhotoUrl });
          }
        } catch (uploadErr) {
          console.warn('[Adopt] S3 upload notice:', uploadErr.message);
        } finally {
          setUploadingPhoto(false);
        }
      }

      const reqArray = createForm.requirements
        ? createForm.requirements.split(',').map(r => r.trim()).filter(Boolean)
        : [];

      await createAdoptionListing({
        pet: createForm.pet,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        adoptionFee: Number(createForm.adoptionFee) || 0,
        requirements: reqArray,
        location: createForm.location.trim(),
      });

      setCreateSuccess('Adoption listing published successfully!');
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
        setCreateForm({
          pet: mongoPets?.[0]?._id || '',
          title: '',
          description: '',
          adoptionFee: 0,
          requirements: '',
          location: '',
        });
        setCreatePhotoFile(null);
      }, 1500);
    } catch (err) {
      setCreateError(err.message || 'Failed to create adoption listing');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Listing Edit
  const openEditModal = (listing) => {
    setEditingListing(listing);
    setEditForm({
      title: listing.rawListing?.title || listing.name,
      description: listing.rawListing?.description || listing.description,
      adoptionFee: listing.rawListing?.adoptionFee !== undefined ? listing.rawListing.adoptionFee : listing.price,
      requirements: Array.isArray(listing.rawListing?.requirements) ? listing.rawListing.requirements.join(', ') : '',
      location: listing.rawListing?.location || listing.location,
      status: listing.rawListing?.status || 'available',
    });
    setEditError(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingListing) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const reqArray = editForm.requirements
        ? editForm.requirements.split(',').map(r => r.trim()).filter(Boolean)
        : [];

      await updateAdoptionListing(editingListing._id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        adoptionFee: Number(editForm.adoptionFee) || 0,
        requirements: reqArray,
        location: editForm.location.trim(),
        status: editForm.status,
      });

      setEditingListing(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update adoption listing');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Listing Deletion
  const handleDeleteListing = async () => {
    if (!deletingId) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteAdoptionListing(deletingId);
      setDeletingId(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete adoption listing');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Handle Application Review by Owner
  const openApplicationReview = async (listing) => {
    setReviewListing(listing);
    setReviewLoading(true);
    setReviewError(null);
    try {
      const apps = await getListingApplications(listing._id);
      setReviewApplications(apps);
    } catch (err) {
      setReviewError(err.message || 'Failed to load applications for this listing.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleUpdateAppStatus = async (appId, newStatus) => {
    setActionInProgressId(appId);
    try {
      await updateApplicationStatus(appId, newStatus, `Application status updated to ${newStatus}`);
      // Refresh local list
      setReviewApplications(prev => prev.map(a => a._id === appId ? { ...a, status: newStatus } : a));
    } catch (err) {
      alert(`Could not update application: ${err.message}`);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle Application Withdrawal by Applicant
  const handleWithdrawApplication = async () => {
    if (!withdrawingId) return;
    setWithdrawSubmitting(true);
    try {
      await withdrawApplication(withdrawingId);
      setWithdrawingId(null);
    } catch (err) {
      alert(`Could not withdraw application: ${err.message}`);
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const petTypeIcons = { all: '🐾', dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇', exotic: '🦎' };

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-6">
        {/* Header */}
        <header className="mb-14 text-center max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest mb-6"
          >
            <Sparkles size={14} className="text-orange-500" />
            <span>MongoDB Synced • Over 5,000 Lives Transformed</span>
          </motion.div>
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white mb-6">
            Neural <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500">Adoption</span> Sanctuary
          </h1>
          <p className="text-lg md:text-xl text-white/40 leading-relaxed font-medium">
            Discover verified companions through our real-time sanctuary interface. 
            Secure applications, cloud-verified health records, and direct sanctuary connection.
          </p>
        </header>

        {/* Global Navigation Tabs & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10 border-b border-white/10 pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2.5 border ${
                activeTab === 'browse'
                  ? 'bg-orange-500 text-white border-orange-400 shadow-xl shadow-orange-500/20'
                  : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sparkles size={16} />
              <span>Sanctuary Listings</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">{normalizedListings.length}</span>
            </button>

            {user && (
              <button
                onClick={() => { setActiveTab('my-applications'); fetchMyApplications(); }}
                className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2.5 border ${
                  activeTab === 'my-applications'
                    ? 'bg-orange-500 text-white border-orange-400 shadow-xl shadow-orange-500/20'
                    : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FileText size={16} />
                <span>My Applications</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">{myApplications.length}</span>
              </button>
            )}

            {user && myListings.length > 0 && (
              <button
                onClick={() => setActiveTab('manage-listings')}
                className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2.5 border ${
                  activeTab === 'manage-listings'
                    ? 'bg-orange-500 text-white border-orange-400 shadow-xl shadow-orange-500/20'
                    : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <ShieldCheck size={16} />
                <span>My Listings</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">{myListings.length}</span>
              </button>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={() => { fetchAdoptionListings(); if (user) fetchMyApplications(); }}
                className="p-3.5 glass text-white/40 hover:text-white rounded-2xl border border-white/10 transition-all hover:bg-white/10"
                title="Refresh listings from MongoDB"
              >
                <RefreshCw size={18} className={adoptionListingsLoading ? 'animate-spin text-orange-400' : ''} />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-xl shadow-orange-500/20 transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                <span>List a Companion</span>
              </button>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* TAB 1: BROWSE ADOPTION LISTINGS                      */}
        {/* ==================================================== */}
        {activeTab === 'browse' && (
          <div>
            {/* Search & Species Filter Controls */}
            <div className="flex flex-col md:flex-row gap-6 mb-12 items-center border-b border-white/5 pb-10">
              <div className="relative flex-1 group w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors" size={22} />
                <input 
                  type="text" 
                  placeholder="Search by companion name, breed, location, or story..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 pl-16 pr-8 text-base font-medium text-white outline-none focus:border-orange-500/50 transition-all focus:bg-white/10 placeholder:text-white/20"
                />
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide no-scrollbar w-full md:w-auto">
                {Object.keys(petTypeIcons).map(type => (
                  <button 
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-6 py-4 rounded-2xl font-black capitalize transition-all whitespace-nowrap flex items-center gap-2.5 border ${
                      filter === type ? 'bg-orange-500 text-white border-orange-400 shadow-xl shadow-orange-500/30' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-lg">{petTypeIcons[type]}</span>
                    <span className="text-xs tracking-widest uppercase">{type === 'all' ? 'All Species' : type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Banner */}
            {adoptionListingsError && (
              <div className="p-6 mb-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} />
                  <p className="text-sm font-semibold">{adoptionListingsError}</p>
                </div>
                <button 
                  onClick={() => fetchAdoptionListings()}
                  className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-white text-xs font-bold transition-all"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {adoptionListingsLoading && normalizedListings.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="glass-dark rounded-[3rem] p-4 border border-white/10 h-[580px] animate-pulse flex flex-col">
                    <div className="bg-white/5 rounded-[2.5rem] h-64 mb-6" />
                    <div className="h-8 bg-white/5 rounded-xl w-3/4 mb-4" />
                    <div className="h-4 bg-white/5 rounded-xl w-1/2 mb-6" />
                    <div className="h-16 bg-white/5 rounded-2xl mb-auto" />
                    <div className="h-14 bg-white/5 rounded-2xl mt-4" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!adoptionListingsLoading && filteredListings.length === 0 && (
              <div className="glass-dark rounded-[3rem] border border-white/10 p-16 text-center max-w-xl mx-auto my-12">
                <div className="w-20 h-20 rounded-3xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto mb-6">
                  <Sparkles size={36} />
                </div>
                <h3 className="text-3xl font-black text-white mb-3 tracking-tight">No Companions Found</h3>
                <p className="text-white/40 text-sm mb-8 leading-relaxed">
                  {search || filter !== 'all' 
                    ? 'No adoption listings matched your filter criteria. Try resetting the filters or searching with a different term.'
                    : 'There are currently no active adoption listings in the sanctuary. You can list one of your registered companions!'}
                </p>
                <div className="flex items-center justify-center gap-4">
                  {(search || filter !== 'all') && (
                    <button
                      onClick={() => { setSearch(''); setFilter('all'); }}
                      className="px-6 py-3.5 glass text-white/60 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Clear Filters
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20"
                    >
                      List a Companion
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Pet Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredListings.map((pet) => (
                <motion.div 
                  layout
                  key={pet.id}
                  whileHover={{ y: -12, scale: 1.01 }}
                  className="glass-dark rounded-[3rem] p-4 border border-white/10 overflow-hidden relative group h-[620px] flex flex-col transition-all duration-300 shadow-2xl hover:border-orange-500/40"
                >
                  {/* Image Section */}
                  <div className="bg-white/5 rounded-[2.5rem] h-64 flex items-center justify-center relative overflow-hidden group-hover:bg-white/10 transition-colors">
                    {pet.photoUrl ? (
                      <img 
                        src={pet.photoUrl} 
                        alt={pet.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <span 
                      className={`text-8xl group-hover:scale-125 transition-transform duration-700 animate-float ${pet.photoUrl ? 'hidden' : 'block'}`}
                    >
                      {pet.image}
                    </span>

                    {/* Top-Right Badges */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                      {pet.status !== 'available' && (
                        <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500/80 text-black backdrop-blur-md">
                          {pet.status}
                        </span>
                      )}
                      <button 
                        onClick={() => toggleWishlist(pet.id)}
                        className={`p-3.5 rounded-2xl backdrop-blur-xl border border-white/10 transition-all active:scale-90 ${
                          wishlist.includes(pet.id) ? 'bg-orange-500 text-white' : 'bg-black/40 text-white/40 hover:text-white'
                        }`}
                        title="Add to sanctuary wishlist"
                      >
                        <Heart size={18} fill={wishlist.includes(pet.id) ? "currentColor" : "none"} />
                      </button>
                    </div>

                    {/* Top-Left Owner Tag */}
                    {pet.isOwner && (
                      <div className="absolute top-4 left-4 z-10">
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-500 text-white shadow-lg backdrop-blur-md flex items-center gap-1.5">
                          <User size={12} />
                          <span>Your Listing</span>
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Info Section */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tighter mb-1 truncate max-w-[180px]">{pet.name}</h3>
                        <p className="text-orange-500 font-bold uppercase tracking-widest text-[10px] truncate max-w-[180px]">{pet.breed}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-white/80">{pet.price > 0 ? `$${pet.price}` : 'Free'}</span>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{pet.age} • {pet.gender}</span>
                      </div>
                    </div>

                    {/* Middle Location Bar */}
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 mb-4 flex items-center gap-3 group-hover:bg-white/10 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                        <MapPin size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Sanctuary Station</p>
                        <p className="text-xs font-bold text-white truncate">{pet.location}</p>
                      </div>
                    </div>

                    {/* Description excerpt preview (120-150 chars) */}
                    <div 
                      onClick={() => setViewingListing(pet)}
                      className="min-h-[48px] mb-4 cursor-pointer group/desc"
                      title="Click to view full companion description"
                    >
                      <p className="text-xs text-white/50 leading-relaxed group-hover/desc:text-white/80 transition-colors">
                        {getShortDescription(pet.description, 135)}
                      </p>
                      {pet.description && pet.description.length > 135 && (
                        <span className="text-[10px] font-bold text-orange-400/80 hover:text-orange-300 block mt-1">
                          Read full story →
                        </span>
                      )}
                    </div>
                    
                    {/* Bottom Actions */}
                    <div className="mt-auto pt-2 border-t border-white/5">
                      {pet.isOwner ? (
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => openEditModal(pet)}
                            className="py-3 glass rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            title="Edit this listing"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button 
                            onClick={() => setDeletingId(pet.id)}
                            className="py-3 glass rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            title="Delete this listing"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                          <button 
                            onClick={() => openApplicationReview(pet)}
                            className="py-3 bg-orange-500/20 hover:bg-orange-500 text-orange-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            title="View submitted applications"
                          >
                            <FileText size={14} />
                            <span>Apps</span>
                          </button>
                        </div>
                      ) : pet.hasApplied ? (
                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-400">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={16} />
                            <span className="text-xs font-black uppercase tracking-wider">Applied</span>
                          </div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                            {pet.applicationStatus || 'Pending'}
                          </span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedListing(pet);
                            setAdoptionStep(0);
                            setApplyError(null);
                          }}
                          disabled={pet.status !== 'available'}
                          className={`w-full py-4 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                            pet.status === 'available'
                              ? 'bg-white text-black hover:bg-orange-500 hover:text-white shadow-orange-500/10'
                              : 'bg-white/10 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          <span>{pet.status === 'available' ? 'Adopt Now' : pet.status.toUpperCase()}</span>
                          {pet.status === 'available' && <ArrowRight size={16} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Background Glow Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent -z-10 group-hover:from-orange-500/10 transition-all pointer-events-none" />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: MY ADOPTION APPLICATIONS                     */}
        {/* ==================================================== */}
        {activeTab === 'my-applications' && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Your Submitted Applications</h2>
                <p className="text-sm text-white/40 mt-1">Live tracking of your companion adoption requests recorded in MongoDB.</p>
              </div>
              <button 
                onClick={() => fetchMyApplications()}
                className="px-4 py-2 rounded-xl glass text-xs font-bold text-white/60 hover:text-white flex items-center gap-2"
              >
                <RefreshCw size={14} className={myApplicationsLoading ? 'animate-spin text-orange-400' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {myApplicationsLoading && (
              <div className="text-center py-16">
                <RefreshCw size={32} className="animate-spin text-orange-500 mx-auto mb-4" />
                <p className="text-white/40 text-sm">Fetching applications from MongoDB...</p>
              </div>
            )}

            {!myApplicationsLoading && myApplications.length === 0 && (
              <div className="glass-dark rounded-[3rem] border border-white/10 p-16 text-center max-w-xl mx-auto my-10">
                <div className="w-20 h-20 rounded-3xl bg-white/5 text-white/30 flex items-center justify-center mx-auto mb-6">
                  <FileText size={36} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">No Applications Submitted</h3>
                <p className="text-white/40 text-sm mb-6">You haven't submitted any adoption applications yet. Explore available companions in the sanctuary!</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20"
                >
                  Browse Available Pets
                </button>
              </div>
            )}

            {!myApplicationsLoading && myApplications.length > 0 && (
              <div className="space-y-6">
                {myApplications.map((app) => {
                  const pet = app.pet || {};
                  const listing = app.listing || {};
                  const shelter = app.shelter || {};
                  const statusColors = {
                    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                    withdrawn: 'bg-white/5 text-white/40 border-white/10'
                  };

                  return (
                    <motion.div
                      key={app._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-dark rounded-[2.5rem] p-8 border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-6 min-w-0">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {pet.photoUrl ? (
                            <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl">🐾</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-2xl font-black text-white tracking-tight truncate">{pet.name || listing.title || 'Companion'}</h4>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColors[app.status] || statusColors.pending}`}>
                              {app.status}
                            </span>
                          </div>
                          <p className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">
                            {pet.species || 'Species'} • {pet.breed || 'Breed'}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                            <span>Listing: <strong className="text-white/70">{listing.title || 'Sanctuary Listing'}</strong></span>
                            <span>Shelter: <strong className="text-white/70">{shelter.fullName || 'Sanctuary Guardian'}</strong></span>
                            <span>Applied: <strong className="text-white/70">{new Date(app.createdAt).toLocaleDateString()}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                        {app.status === 'pending' && (
                          <button
                            onClick={() => setWithdrawingId(app._id)}
                            className="px-5 py-3 rounded-2xl glass text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/20 transition-all border border-red-500/20"
                          >
                            Withdraw Application
                          </button>
                        )}
                        {app.status === 'withdrawn' && (
                          <button
                            onClick={() => deleteApplication(app._id)}
                            className="px-5 py-3 rounded-2xl glass text-xs font-bold text-white/40 hover:text-white hover:bg-white/10 transition-all"
                          >
                            Remove Record
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: MANAGE MY LISTINGS (OWNER / SHELTER VIEW)     */}
        {/* ==================================================== */}
        {activeTab === 'manage-listings' && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Your Adoption Listings</h2>
                <p className="text-sm text-white/40 mt-1">Manage companions you have listed and review incoming adoption applications.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
              >
                <Plus size={16} />
                <span>New Listing</span>
              </button>
            </div>

            <div className="space-y-6">
              {myListings.map((listing) => {
                const pet = listing.pet || {};
                return (
                  <div 
                    key={listing._id}
                    className="glass-dark rounded-[2.5rem] p-8 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-6 min-w-0">
                      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {pet.photoUrl ? (
                          <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl">🐾</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-2xl font-black text-white tracking-tight truncate">{listing.title}</h4>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            listing.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {listing.status}
                          </span>
                        </div>
                        <p className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">
                          Companion: {pet.name || 'Pet'} ({pet.breed || 'Breed'}) • Fee: ${listing.adoptionFee || 0}
                        </p>
                        <p className="text-xs text-white/40 line-clamp-1">{listing.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                      <button
                        onClick={() => openEditModal({ ...listing, id: listing._id, rawListing: listing })}
                        className="p-3 glass rounded-2xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs font-bold flex items-center gap-2"
                        title="Edit listing details"
                      >
                        <Edit2 size={16} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeletingId(listing._id)}
                        className="p-3 glass rounded-2xl text-red-400 hover:text-white hover:bg-red-500/20 transition-all text-xs font-bold flex items-center gap-2"
                        title="Delete listing"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                      <button
                        onClick={() => openApplicationReview({ ...listing, id: listing._id, rawListing: listing })}
                        className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                      >
                        <FileText size={16} />
                        <span>Review Apps</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL 1: ADOPTION APPLICATION FLOW (4 STEPS)         */}
        {/* ==================================================== */}
        <AnimatePresence>
          {selectedListing && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 50 }}
                className="w-full max-w-4xl glass-dark rounded-[3.5rem] border border-white/10 shadow-5xl overflow-hidden relative"
              >
                {/* Success Overlay */}
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center text-center p-12"
                    >
                      <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-[2rem] flex items-center justify-center mb-8 border border-emerald-500/30">
                        <CheckCircle size={56} />
                      </div>
                      <h2 className="text-5xl font-black text-white mb-4 tracking-tighter">Application Received</h2>
                      <p className="text-lg text-white/50 max-w-md">
                        Your adoption request has been safely recorded in MongoDB. The sanctuary team has been notified.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col lg:flex-row h-full">
                  {/* Left Side: Pet Preview */}
                  <div className="lg:w-2/5 p-10 bg-white/5 border-r border-white/5 flex flex-col items-center justify-center text-center">
                    <div className="w-40 h-40 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 overflow-hidden">
                      {selectedListing.photoUrl ? (
                        <img src={selectedListing.photoUrl} alt={selectedListing.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-7xl animate-float">{selectedListing.image}</span>
                      )}
                    </div>
                    <h3 className="text-4xl font-black text-white mb-1 tracking-tighter">{selectedListing.name}</h3>
                    <p className="text-orange-500 font-bold uppercase tracking-widest text-xs mb-8">{selectedListing.breed}</p>
                    
                    <div className="space-y-3 w-full text-left">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Sanctuary Station</p>
                        <p className="text-xs text-white font-bold">{selectedListing.location}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 max-h-48 overflow-y-auto">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Adoption Narrative</p>
                        <p className="text-xs text-white/80 italic leading-relaxed whitespace-pre-line">"{selectedListing.description}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Step Flow */}
                  <div className="flex-1 p-10 lg:p-14 relative flex flex-col justify-between">
                    <button 
                      onClick={() => setSelectedListing(null)}
                      className="absolute top-8 right-8 p-3 glass text-white/40 hover:text-white rounded-2xl transition-all"
                    >
                      <X size={20} />
                    </button>

                    <div>
                      {/* Step Progress Bar */}
                      <div className="mb-10">
                        <div className="flex items-center gap-3 mb-3">
                          {[0, 1, 2, 3].map((s) => (
                            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= adoptionStep ? 'bg-orange-500' : 'bg-white/10'}`} />
                          ))}
                        </div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Step {adoptionStep + 1} of 4: {
                          adoptionStep === 0 ? 'Selection & Fee' :
                          adoptionStep === 1 ? 'Living Situation' :
                          adoptionStep === 2 ? 'Experience & Contact' : 'Review & Submit'
                        }</p>
                      </div>

                      {/* Error feedback */}
                      {applyError && (
                        <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                          <AlertCircle size={16} />
                          <span>{applyError}</span>
                        </div>
                      )}

                      {/* Steps Content */}
                      <div className="min-h-[280px]">
                        <AnimatePresence mode="wait">
                          {adoptionStep === 0 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">Confirm Companion Selection</h2>
                              <div className="space-y-4">
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between">
                                  <span className="text-white/50 font-medium">Adoption Fee</span>
                                  <span className="text-2xl font-black text-white">
                                    {selectedListing.price > 0 ? `$${selectedListing.price}.00` : 'Waived'}
                                  </span>
                                </div>
                                <div className="p-6 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-4">
                                  <Info className="text-orange-400 shrink-0" size={24} />
                                  <p className="text-xs text-orange-300 font-semibold leading-relaxed">
                                    Includes comprehensive veterinary screening, microchipping, vaccination verification, and 30-day health sanctuary support.
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {adoptionStep === 1 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">Living Situation & Home</h2>
                              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                                Home Environment Details
                              </label>
                              <textarea 
                                placeholder="Describe your home (e.g. apartment, house with fenced yard, family members, other pets)..."
                                className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-medium text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20 resize-none"
                                value={adoptionForm.livingSituation}
                                onChange={(e) => setAdoptionForm({...adoptionForm, livingSituation: e.target.value})}
                              />
                            </motion.div>
                          )}

                          {adoptionStep === 2 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">Experience & Contact</h2>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                                    Contact Phone Number
                                  </label>
                                  <input 
                                    type="tel"
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20"
                                    value={adoptionForm.phone}
                                    onChange={(e) => setAdoptionForm({...adoptionForm, phone: e.target.value})}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                                    Pet Care Experience
                                  </label>
                                  <textarea 
                                    placeholder="Have you cared for companions previously? Briefly describe your experience..."
                                    className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20 resize-none"
                                    value={adoptionForm.experience}
                                    onChange={(e) => setAdoptionForm({...adoptionForm, experience: e.target.value})}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {adoptionStep === 3 && (
                            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">Meeting Schedule & Notes</h2>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                                    Preferred Sanctuary Meeting Window
                                  </label>
                                  <div className="grid grid-cols-2 gap-3">
                                    {['This Weekend', 'Next Week', 'Evenings Only', 'Flexible'].map(d => (
                                      <button 
                                        key={d} 
                                        type="button"
                                        onClick={() => setAdoptionForm({...adoptionForm, meetingDate: d})}
                                        className={`p-4 rounded-2xl border text-xs font-bold transition-all ${
                                          adoptionForm.meetingDate === d 
                                            ? 'bg-white text-black border-white' 
                                            : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                                        }`}
                                      >
                                        {d}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                                    Additional Notes / Inquiries
                                  </label>
                                  <input 
                                    type="text"
                                    placeholder="Any questions for the sanctuary guardian?"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20"
                                    value={adoptionForm.notes}
                                    onChange={(e) => setAdoptionForm({...adoptionForm, notes: e.target.value})}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Bottom Step Actions */}
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-4">
                      {adoptionStep > 0 && (
                        <button 
                          onClick={() => setAdoptionStep(adoptionStep - 1)}
                          className="px-6 py-4 glass text-white/40 font-bold rounded-2xl hover:text-white transition-all text-xs uppercase tracking-widest"
                        >
                          Back
                        </button>
                      )}
                      <button 
                        onClick={() => adoptionStep < 3 ? setAdoptionStep(adoptionStep + 1) : handleAdoptSubmit()}
                        disabled={applySubmitting}
                        className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {applySubmitting ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Submitting to MongoDB...</span>
                          </>
                        ) : adoptionStep === 3 ? (
                          'Submit Adoption Application'
                        ) : (
                          'Next Step'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================================================== */}
        {/* MODAL 2: LIST A PET FOR ADOPTION                     */}
        {/* ==================================================== */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl glass-dark rounded-[3rem] border border-white/10 p-10 shadow-5xl relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="absolute top-8 right-8 p-3 glass text-white/40 hover:text-white rounded-2xl"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight">List Companion for Adoption</h3>
                </div>
                <p className="text-xs text-white/40 mb-8">
                  Connect your companion to the sanctuary network. Backend ownership is automatically enforced.
                </p>

                {createError && (
                  <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{createError}</span>
                  </div>
                )}

                {createSuccess && (
                  <div className="p-4 mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>{createSuccess}</span>
                  </div>
                )}

                {mongoPets.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle size={36} className="text-amber-400 mx-auto mb-3" />
                    <h4 className="text-xl font-bold text-white mb-2">No Registered Pets Found</h4>
                    <p className="text-xs text-white/50 max-w-sm mx-auto mb-6">
                      You must have at least one registered companion in your account before listing one for adoption.
                    </p>
                    <a
                      href="/profile"
                      className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider inline-block"
                    >
                      Register a Companion in Profile
                    </a>
                  </div>
                ) : (
                  <form onSubmit={handleCreateSubmit} className="space-y-5">
                    {/* Companion Selection */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                        Select Registered Companion *
                      </label>
                      <select
                        value={createForm.pet}
                        onChange={(e) => setCreateForm({ ...createForm, pet: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-orange-500/50 transition-all [&>option]:bg-neutral-900"
                        required
                      >
                        {mongoPets.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.species} • {p.breed})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                        Listing Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Luna Looking for a Loving Forever Home"
                        value={createForm.title}
                        onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
                          Description & Narrative *
                        </label>
                        <span className={`text-[10px] font-mono ${(createForm.description?.length || 0) > 1900 ? 'text-amber-400 font-bold' : 'text-white/40'}`}>
                          {createForm.description?.length || 0}/2000
                        </span>
                      </div>
                      <textarea
                        placeholder="Describe personality, health traits, daily habits, and ideal home environment..."
                        value={createForm.description}
                        maxLength={2000}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value.slice(0, 2000) })}
                        className="w-full h-28 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20 resize-none"
                        required
                      />
                    </div>

                    {/* Fee & Location */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                          Adoption Fee ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createForm.adoptionFee}
                          onChange={(e) => setCreateForm({ ...createForm, adoptionFee: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-orange-500/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                          Sanctuary Location
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. San Francisco, CA"
                          value={createForm.location}
                          onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20"
                        />
                      </div>
                    </div>

                    {/* Requirements */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                        Adoption Requirements (Comma separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Fenced yard, Experienced handler, No small children"
                        value={createForm.requirements}
                        onChange={(e) => setCreateForm({ ...createForm, requirements: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20"
                      />
                    </div>

                    {/* S3 Photo Upload (Optional) */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                        Cloud Photo (S3 Presigned Upload)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCreatePhotoFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-white/50 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                      />
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="px-6 py-3.5 glass text-white/40 hover:text-white rounded-2xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createSubmitting}
                        className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {createSubmitting ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>{uploadingPhoto ? 'Uploading to S3...' : 'Saving Listing...'}</span>
                          </>
                        ) : (
                          'Publish Adoption Listing'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================================================== */}
        {/* MODAL 3: EDIT ADOPTION LISTING                       */}
        {/* ==================================================== */}
        <AnimatePresence>
          {editingListing && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-xl glass-dark rounded-[3rem] border border-white/10 p-10 shadow-5xl relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setEditingListing(null)}
                  className="absolute top-8 right-8 p-3 glass text-white/40 hover:text-white rounded-2xl"
                >
                  <X size={20} />
                </button>

                <h3 className="text-3xl font-black text-white tracking-tight mb-2">Edit Adoption Listing</h3>
                <p className="text-xs text-white/40 mb-8">Update listing parameters stored in MongoDB.</p>

                {editError && (
                  <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{editError}</span>
                  </div>
                )}

                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-white text-sm outline-none focus:border-orange-500/50"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Description *</label>
                      <span className={`text-[10px] font-mono ${(editForm.description?.length || 0) > 1900 ? 'text-amber-400 font-bold' : 'text-white/40'}`}>
                        {editForm.description?.length || 0}/2000
                      </span>
                    </div>
                    <textarea
                      value={editForm.description}
                      maxLength={2000}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value.slice(0, 2000) })}
                      className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-orange-500/50 resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Fee ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.adoptionFee}
                        onChange={(e) => setEditForm({ ...editForm, adoptionFee: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-white text-sm outline-none focus:border-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-white text-sm outline-none focus:border-orange-500/50 [&>option]:bg-neutral-900"
                      >
                        <option value="available">Available</option>
                        <option value="pending">Pending</option>
                        <option value="adopted">Adopted</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-white text-sm outline-none focus:border-orange-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 block">Requirements (Comma separated)</label>
                    <input
                      type="text"
                      value={editForm.requirements}
                      onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-white text-sm outline-none focus:border-orange-500/50"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingListing(null)}
                      className="px-6 py-3 glass text-white/40 hover:text-white rounded-2xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20 transition-all disabled:opacity-50"
                    >
                      {editSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================================================== */}
        {/* MODAL 4: DELETE LISTING CONFIRMATION                 */}
        {/* ==================================================== */}
        <AnimatePresence>
          {deletingId && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md glass-dark rounded-[2.5rem] border border-red-500/20 p-8 shadow-5xl text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <Trash2 size={28} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Delete Adoption Listing?</h3>
                <p className="text-xs text-white/50 mb-6 leading-relaxed">
                  This will permanently withdraw the listing from MongoDB and remove all associated applications. The companion will be marked unlisted.
                </p>

                {deleteError && (
                  <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {deleteError}
                  </div>
                )}

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-6 py-3 glass text-white/50 hover:text-white rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteListing}
                    disabled={deleteSubmitting}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================================================== */}
        {/* MODAL 5: WITHDRAW APPLICATION CONFIRMATION           */}
        {/* ==================================================== */}
        <AnimatePresence>
          {withdrawingId && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md glass-dark rounded-[2.5rem] border border-white/10 p-8 shadow-5xl text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                  <Ban size={28} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Withdraw Application?</h3>
                <p className="text-xs text-white/50 mb-6 leading-relaxed">
                  Are you sure you want to withdraw this application? The sanctuary will be informed and the listing status will be updated.
                </p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setWithdrawingId(null)}
                    className="px-6 py-3 glass text-white/50 hover:text-white rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdrawApplication}
                    disabled={withdrawSubmitting}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {withdrawSubmitting ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================================================== */}
        {/* MODAL 6: OWNER APPLICATION REVIEW MODAL              */}
        {/* ==================================================== */}
        <AnimatePresence>
          {reviewListing && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-3xl glass-dark rounded-[3.5rem] border border-white/10 p-10 shadow-5xl relative max-h-[85vh] overflow-y-auto"
              >
                <button
                  onClick={() => setReviewListing(null)}
                  className="absolute top-8 right-8 p-3 glass text-white/40 hover:text-white rounded-2xl"
                >
                  <X size={20} />
                </button>

                <h3 className="text-3xl font-black text-white tracking-tight mb-1">
                  Applications for "{reviewListing.rawListing?.title || reviewListing.name}"
                </h3>
                <p className="text-xs text-white/40 mb-8">
                  Review applicant details and manage adoption statuses. Approving an application will mark the listing as adopted.
                </p>

                {reviewLoading && (
                  <div className="text-center py-12">
                    <RefreshCw size={28} className="animate-spin text-orange-500 mx-auto mb-3" />
                    <p className="text-xs text-white/40">Loading applications from MongoDB...</p>
                  </div>
                )}

                {reviewError && (
                  <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {reviewError}
                  </div>
                )}

                {!reviewLoading && reviewApplications.length === 0 && (
                  <div className="text-center py-12 glass rounded-2xl border border-white/5">
                    <p className="text-white/40 text-sm">No applications have been submitted for this listing yet.</p>
                  </div>
                )}

                {!reviewLoading && reviewApplications.length > 0 && (
                  <div className="space-y-4">
                    {reviewApplications.map((app) => {
                      const applicant = app.applicant || {};
                      const isPending = app.status === 'pending';
                      return (
                        <div 
                          key={app._id}
                          className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-bold text-white">{applicant.fullName || 'Anonymous Applicant'}</h4>
                              <p className="text-xs text-white/40">{applicant.email} • {app.phone || applicant.phone || 'No phone'}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                              app.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' :
                              app.status === 'withdrawn' ? 'bg-white/10 text-white/40' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {app.status}
                            </span>
                          </div>

                          {app.livingSituation && (
                            <div className="text-xs">
                              <span className="text-white/40 font-bold">Living Situation: </span>
                              <span className="text-white/80">{app.livingSituation}</span>
                            </div>
                          )}

                          {app.experience && (
                            <div className="text-xs">
                              <span className="text-white/40 font-bold">Experience: </span>
                              <span className="text-white/80">{app.experience}</span>
                            </div>
                          )}

                          {app.notes && (
                            <div className="text-xs">
                              <span className="text-white/40 font-bold">Notes: </span>
                              <span className="text-white/80">{app.notes}</span>
                            </div>
                          )}

                          {isPending && (
                            <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUpdateAppStatus(app._id, 'rejected')}
                                disabled={actionInProgressId === app._id}
                                className="px-4 py-2 rounded-xl glass text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleUpdateAppStatus(app._id, 'approved')}
                                disabled={actionInProgressId === app._id}
                                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider transition-all"
                              >
                                Approve Adoption
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* ==================================================== */}
        {/* MODAL 7: FULL LISTING DETAILS MODAL                  */}
        {/* ==================================================== */}
        <AnimatePresence>
          {viewingListing && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl glass-dark rounded-[3.5rem] border border-white/10 p-8 sm:p-10 shadow-5xl relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setViewingListing(null)}
                  className="absolute top-8 right-8 p-3 glass text-white/40 hover:text-white rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                  <div className="w-28 h-28 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {viewingListing.photoUrl ? (
                      <img src={viewingListing.photoUrl} alt={viewingListing.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-6xl animate-float">{viewingListing.image}</span>
                    )}
                  </div>
                  <div className="text-center sm:text-left flex-1 min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        viewingListing.status === 'available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {viewingListing.status}
                      </span>
                      {viewingListing.isOwner && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500 text-white">
                          Your Listing
                        </span>
                      )}
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1">{viewingListing.name}</h3>
                    <p className="text-orange-400 font-bold uppercase tracking-widest text-xs">{viewingListing.breed} • {viewingListing.age} • {viewingListing.gender}</p>
                    <p className="text-white/40 text-xs mt-1 flex items-center justify-center sm:justify-start gap-1">
                      <MapPin size={12} className="text-orange-400" />
                      <span>{viewingListing.location}</span>
                      <span className="mx-1">•</span>
                      <span>{viewingListing.shelterName}</span>
                    </p>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Adoption Fee</p>
                    <p className="text-lg font-black text-white">{viewingListing.price > 0 ? `$${viewingListing.price}` : 'Waived'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Species</p>
                    <p className="text-lg font-black text-white capitalize">{viewingListing.species}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Health Status</p>
                    <p className="text-lg font-black text-emerald-400">{viewingListing.rawPet?.healthStatus || 'Verified Healthy'}</p>
                  </div>
                </div>

                {/* FULL UNTRUNCATED DESCRIPTION */}
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-orange-400" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/80">Companion Story & Narrative</h4>
                  </div>
                  <div className="max-h-72 overflow-y-auto pr-2">
                    <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line font-medium">
                      {viewingListing.description}
                    </p>
                  </div>
                </div>

                {/* Requirements */}
                {viewingListing.requirements && viewingListing.requirements.length > 0 && (
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/5 mb-8">
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Adoption Requirements</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingListing.requirements.map((req, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 flex items-center gap-1.5 font-medium">
                          <Check size={12} className="text-emerald-400" />
                          <span>{req}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer / Actions */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                  <button
                    onClick={() => setViewingListing(null)}
                    className="px-6 py-3.5 glass text-white/60 hover:text-white rounded-2xl text-xs font-bold"
                  >
                    Close
                  </button>
                  {viewingListing.isOwner ? (
                    <button
                      onClick={() => {
                        const target = viewingListing;
                        setViewingListing(null);
                        openEditModal(target);
                      }}
                      className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                    >
                      Edit Listing
                    </button>
                  ) : viewingListing.hasApplied ? (
                    <div className="px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                      <CheckCircle size={16} />
                      <span>Application {viewingListing.applicationStatus || 'Pending'}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const target = viewingListing;
                        setViewingListing(null);
                        setSelectedListing(target);
                        setAdoptionStep(0);
                        setApplyError(null);
                      }}
                      disabled={viewingListing.status !== 'available'}
                      className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <span>Apply to Adopt</span>
                      <ArrowRight size={16} />
                    </button>
                  )}
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

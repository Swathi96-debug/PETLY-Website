import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Trophy, CheckCircle2, XCircle, RotateCcw, History, Plus, 
  Edit3, Trash2, ChevronRight, ChevronLeft, Sparkles, Shield, Award, 
  BookOpen, AlertCircle, HelpCircle, Check, X, Flame, Filter, ArrowRight, 
  Search, RefreshCw, Zap, Lightbulb, Compass, Heart, Home, DollarSign, 
  Baby, PawPrint, Plane, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';

// Categories for Knowledge Assessment
const KNOWLEDGE_CATEGORIES = [
  { id: 'All', name: 'All Categories', icon: '🐾', color: 'from-orange-500/20 to-yellow-500/10' },
  { id: 'Dog Care & Health', name: 'Dog Care & Health', icon: '🐕', color: 'from-blue-500/20 to-cyan-500/10' },
  { id: 'Cat Behavior & Nutrition', name: 'Cat Behavior & Nutrition', icon: '🐈', color: 'from-purple-500/20 to-pink-500/10' },
  { id: 'Pet Health & Safety', name: 'Pet Health & Safety', icon: '🏥', color: 'from-emerald-500/20 to-teal-500/10' },
  { id: 'Pet Training & Psychology', name: 'Pet Training & Psychology', icon: '🎓', color: 'from-amber-500/20 to-orange-500/10' },
  { id: 'General Pet Knowledge', name: 'General Pet Knowledge', icon: '⭐', color: 'from-pink-500/20 to-rose-500/10' },
];

const DIFFICULTIES = [
  { id: 'all', label: 'All Levels', color: 'bg-white/10 text-white' },
  { id: 'easy', label: 'Novice (Easy)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'medium', label: 'Guardian (Medium)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'hard', label: 'Master (Hard)', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const QUESTION_COUNTS = [5, 10, 15];

// Companion Matcher Questions (Expanded to 3-4 meaningful choices per factor)
const COMPANION_QUESTIONS = [
  {
    id: 'living',
    question: "Where will your companion reside?",
    icon: <Home size={24} />,
    options: [
      { label: 'Urban Apartment / Compact Studio', value: 'apartment', weight: { cat: 10, bird: 9, rabbit: 8, exotic: 8, dog: 4 } },
      { label: 'Suburban Townhouse / House without Yard', value: 'townhouse', weight: { cat: 9, rabbit: 9, bird: 8, dog: 7, exotic: 8 } },
      { label: 'Single-Family House with Fenced Yard', value: 'yard', weight: { dog: 10, rabbit: 9, cat: 8, exotic: 7, bird: 7 } },
      { label: 'Rural Acreage / Open Estate Environment', value: 'rural', weight: { dog: 10, exotic: 8, cat: 8, rabbit: 8, bird: 7 } }
    ]
  },
  {
    id: 'budget',
    question: "Monthly resource allocation for food, habitat & care?",
    icon: <DollarSign size={24} />,
    options: [
      { label: 'Conservative Budget ($40 – $80 / mo)', value: 'low', weight: { bird: 10, rabbit: 8, cat: 6, exotic: 7, dog: 3 } },
      { label: 'Moderate Routine ($90 – $160 / mo)', value: 'moderate', weight: { cat: 10, rabbit: 8, bird: 8, exotic: 8, dog: 7 } },
      { label: 'Premium Care ($180 – $350+ / mo)', value: 'high', weight: { dog: 10, exotic: 10, cat: 8, rabbit: 7, bird: 6 } }
    ]
  },
  {
    id: 'children',
    question: "Presence of small biological units (children) in sanctuary?",
    icon: <Baby size={24} />,
    options: [
      { label: 'Young Children Present (Toddlers / Under 8)', value: 'young_kids', weight: { dog: 10, cat: 7, bird: 5, rabbit: 4, exotic: 3 } },
      { label: 'Older Children / Teens (Ages 8 – 16)', value: 'older_kids', weight: { dog: 10, cat: 9, rabbit: 8, bird: 8, exotic: 6 } },
      { label: 'Adult-Only Household (Quiet, Calibrated Space)', value: 'adults_only', weight: { exotic: 10, rabbit: 10, cat: 9, bird: 8, dog: 8 } }
    ]
  },
  {
    id: 'existing',
    question: "Other active companions currently in your sanctuary grid?",
    icon: <PawPrint size={24} />,
    options: [
      { label: 'Solo Orbit (No Other Pets)', value: 'none', weight: { cat: 10, dog: 10, exotic: 10, rabbit: 9, bird: 8 } },
      { label: 'Coexisting with Dogs or Cats', value: 'dogs_cats', weight: { dog: 10, cat: 8, bird: 5, rabbit: 4, exotic: 3 } },
      { label: 'Small Animal / Aviary / Enclosure Setup', value: 'small_animals', weight: { bird: 10, rabbit: 9, exotic: 9, cat: 6, dog: 5 } }
    ]
  },
  {
    id: 'activity',
    question: "Your daily kinetic energy & activity level?",
    icon: <Zap size={24} />,
    options: [
      { label: 'Low / Cozy (Stellar Relaxed & Lounging)', value: 'low', weight: { cat: 10, exotic: 10, rabbit: 8, bird: 7, dog: 3 } },
      { label: 'Moderate / Balanced (Daily Walks & Playtime)', value: 'moderate', weight: { cat: 9, rabbit: 9, bird: 8, dog: 8, exotic: 7 } },
      { label: 'High / Active (Daily Runs, Hikes & Agility)', value: 'high', weight: { dog: 10, cat: 4, rabbit: 4, bird: 5, exotic: 3 } },
      { label: 'Interactive Trainer (Brain Games & Mental Focus)', value: 'training', weight: { bird: 10, dog: 9, cat: 8, rabbit: 8, exotic: 6 } }
    ]
  },
  {
    id: 'personality',
    question: "Preferred social interaction style & dynamic?",
    icon: <Sparkles size={24} />,
    options: [
      { label: 'Independent & Calm (Quiet Parallel Presence)', value: 'introvert', weight: { exotic: 10, cat: 10, rabbit: 8, bird: 5, dog: 4 } },
      { label: 'Affectionate & Snuggly (Gentle Cuddles & Lap Warmth)', value: 'lap', weight: { cat: 10, dog: 8, rabbit: 9, bird: 7, exotic: 4 } },
      { label: 'Playful, Vocal & High-Attention (Constant Engagement)', value: 'extrovert', weight: { dog: 10, bird: 10, cat: 6, rabbit: 6, exotic: 4 } }
    ]
  },
  {
    id: 'travel',
    question: "Frequency of planetary travel, work trips, or absences?",
    icon: <Plane size={24} />,
    options: [
      { label: 'Home-Bound / Remote Worker (Rarely Away > 3 Hours)', value: 'static', weight: { dog: 10, bird: 9, rabbit: 9, cat: 8, exotic: 7 } },
      { label: 'Standard Workday Routine (Away 6 – 8 Hours Daily)', value: 'workday', weight: { cat: 10, exotic: 9, rabbit: 8, bird: 7, dog: 5 } },
      { label: 'Frequent Traveler / Mobile Lifestyle (Needs Sitter / Easy Care)', value: 'travel', weight: { exotic: 10, cat: 7, bird: 5, rabbit: 4, dog: 2 } }
    ]
  },
  {
    id: 'experience',
    question: "Prior companion caregiving experience & handling skills?",
    icon: <Star size={24} />,
    options: [
      { label: 'First Mission (Novice Guardian, Prefers Simple Care)', value: 'new', weight: { cat: 10, rabbit: 8, bird: 7, dog: 6, exotic: 4 } },
      { label: 'Intermediate Guardian (Routine Vet Care & Training Familiar)', value: 'intermediate', weight: { dog: 9, cat: 9, rabbit: 9, bird: 8, exotic: 7 } },
      { label: 'Veteran Specialist (Experienced with Diets & Habitats)', value: 'veteran', weight: { exotic: 10, bird: 10, dog: 10, rabbit: 9, cat: 9 } }
    ]
  }
];

const COMPANION_DATA = {
  dog: { name: 'Canine Unit', icon: '🐕', color: 'blue', desc: 'Loyal, energetic, and thrives on social synchronization, outdoor adventures, and structured routines.' },
  cat: { name: 'Feline Interface', icon: '🐈', color: 'orange', desc: 'Independent, affectionate, and perfectly suited for peaceful indoor environments and deep companionship.' },
  rabbit: { name: 'Leporidae Unit', icon: '🐇', color: 'pink', desc: 'Gentle, inquisitive, and highly sensitive to environmental harmony; ideal for quiet, gentle households.' },
  bird: { name: 'Avian Relay', icon: '🦜', color: 'emerald', desc: 'Social, intelligent, communicative, and adds vibrant personality and melodic frequency to your sanctuary.' },
  exotic: { name: 'Exotic Artifact', icon: '🦎', color: 'purple', desc: 'Unique, observation-focused, hypoallergenic, and requires dedicated habitat climate precision.' }
};

const PetQuiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const {
    mongoQuizAttempts,
    quizAttemptsLoading,
    fetchMyQuizAttempts,
    submitQuizAttempt,
    fetchQuizQuestions,
    createQuizQuestion,
    updateQuizQuestion,
    deleteQuizQuestion,
    getQuizAttemptDetails,
    addQuizResult,
    // Companion Match Persistence (Phase 7 Extension)
    companionMatches,
    companionMatchesLoading,
    fetchMyCompanionMatches,
    saveCompanionMatch,
  } = useEcosystem();

  // Mode Selection: 'knowledge' (Knowledge Assessment Quiz) vs 'companion' (Find Your Perfect Companion)
  const [quizMode, setQuizMode] = useState('knowledge');

  // Sub-Navigation Tabs for Knowledge Mode: 'quiz' | 'history' | 'admin'
  const [activeTab, setActiveTab] = useState('quiz');
  const [quizStage, setQuizStage] = useState('setup'); // 'setup' | 'in_progress' | 'results' | 'review'

  // Knowledge Quiz Setup Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCount, setSelectedCount] = useState(5);

  // Active Knowledge Quiz State
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionId]: selectedOptionIndex }
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  // Knowledge Results & Review State
  const [completedAttempt, setCompletedAttempt] = useState(null);
  const [reviewingAttempt, setReviewingAttempt] = useState(null);
  const [loadingAttemptDetails, setLoadingAttemptDetails] = useState(false);
  const [attemptDetailsError, setAttemptDetailsError] = useState(null);

  // Companion Matcher State (Phase 7 Extension)
  const [companionStep, setCompanionStep] = useState(0);
  const [companionAnswers, setCompanionAnswers] = useState({});
  const [companionResults, setCompanionResults] = useState(null);
  const [companionTab, setCompanionTab] = useState('matcher'); // 'matcher' | 'history'
  const [viewingHistoricalMatch, setViewingHistoricalMatch] = useState(null);

  // Admin CMS State
  const [adminQuestions, setAdminQuestions] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('All');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionFormData, setQuestionFormData] = useState({
    category: 'Dog Care & Health',
    difficulty: 'medium',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    isActive: true,
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Global Toast
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Admin Questions
  const loadAdminQuestions = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      const res = await fetchQuizQuestions();
      if (res.success && Array.isArray(res.questions)) {
        setAdminQuestions(res.questions);
      }
    } catch (err) {
      setAdminError(err.message || 'Failed to load questions.');
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin, fetchQuizQuestions]);

  useEffect(() => {
    if (activeTab === 'admin' && isAdmin && quizMode === 'knowledge') {
      loadAdminQuestions();
    }
  }, [activeTab, isAdmin, quizMode, loadAdminQuestions]);

  // Load Companion Match history when navigating to companion mode or history tab
  useEffect(() => {
    if (quizMode === 'companion' && user) {
      fetchMyCompanionMatches();
    }
  }, [quizMode, companionTab, user, fetchMyCompanionMatches]);

  // ==========================================
  // KNOWLEDGE QUIZ HANDLERS
  // ==========================================

  const handleStartKnowledgeQuiz = async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    setUserAnswers({});
    setCurrentIndex(0);
    setSubmissionError(null);
    setCompletedAttempt(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty);
      if (selectedCount) params.append('limit', String(selectedCount));

      const res = await fetchQuizQuestions(params.toString());
      if (res.success && Array.isArray(res.questions)) {
        if (res.questions.length === 0) {
          setQuestionsError('No active questions found for the selected category. Try selecting All Categories or adjusting filters.');
          setQuestionsLoading(false);
          return;
        }
        setQuestions(res.questions);
        setQuizStage('in_progress');
      } else {
        throw new Error(res.message || 'Failed to load questions from server.');
      }
    } catch (err) {
      setQuestionsError(err.message || 'Error connecting to Quiz server.');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleSelectOption = (questionId, optionIndex) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmitKnowledgeQuiz = async () => {
    setSubmittingAttempt(true);
    setSubmissionError(null);

    try {
      const payloadAnswers = questions.map((q) => ({
        questionId: q._id || q.id,
        selectedOption: userAnswers[q._id || q.id] !== undefined ? userAnswers[q._id || q.id] : -1,
      }));

      const res = await submitQuizAttempt({
        category: selectedCategory === 'All' ? 'Comprehensive Assessment' : selectedCategory,
        answers: payloadAnswers,
      });

      setCompletedAttempt(res);
      setQuizStage('results');
      showToast('Assessment submitted and saved to MongoDB!');
    } catch (err) {
      setSubmissionError(err.message || 'Failed to submit quiz attempt.');
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const handleViewAttemptHistoryDetails = async (attemptId) => {
    setLoadingAttemptDetails(true);
    setAttemptDetailsError(null);
    try {
      const res = await getQuizAttemptDetails(attemptId);
      if (res.success && res.attempt) {
        setReviewingAttempt(res.attempt);
        setQuizStage('review');
        setActiveTab('quiz');
      } else {
        throw new Error(res.message || 'Could not load attempt details.');
      }
    } catch (err) {
      setAttemptDetailsError(err.message || 'Failed to fetch attempt details.');
    } finally {
      setLoadingAttemptDetails(false);
    }
  };

  const allQuestionsAnswered = useMemo(() => {
    return COMPANION_QUESTIONS.every((q) => companionAnswers[q.id] !== undefined);
  }, [companionAnswers]);

  const isLiveCompanionComplete = Boolean(companionResults && allQuestionsAnswered);

  const handleCompanionOptionSelect = (qId, option) => {
    const nextAnswers = { ...companionAnswers, [qId]: option };
    setCompanionAnswers(nextAnswers);
    if (companionStep < COMPANION_QUESTIONS.length - 1) {
      setCompanionStep((prev) => prev + 1);
    }
  };

  const handleSubmitCompanionAssessment = async () => {
    const hasAll = COMPANION_QUESTIONS.every((q) => companionAnswers[q.id] !== undefined);
    if (!hasAll) return;
    await calculateCompanionResults(companionAnswers);
  };

  const calculateCompanionResults = async (finalAnswers) => {
    const hasAll = COMPANION_QUESTIONS.every((q) => finalAnswers[q.id] !== undefined);
    if (!hasAll) return;

    const scores = { dog: 0, cat: 0, rabbit: 0, bird: 0, exotic: 0 };

    Object.keys(finalAnswers).forEach((qId) => {
      const option = finalAnswers[qId];
      if (option && option.weight) {
        Object.keys(option.weight).forEach((pet) => {
          scores[pet] += option.weight[pet] || 0;
        });
      }
    });

    const calculated = Object.keys(scores).map((pet) => ({
      type: pet,
      score: Math.round((scores[pet] / (COMPANION_QUESTIONS.length * 10)) * 100),
      ...COMPANION_DATA[pet]
    })).sort((a, b) => b.score - a.score);

    setCompanionResults(calculated);

    // Save locally and in context history for user profile reflection
    try {
      localStorage.setItem('petly_quiz_results', JSON.stringify(calculated));
    } catch {}

    if (addQuizResult) {
      addQuizResult({
        id: Date.now(),
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topMatch: calculated[0].name,
        topMatchIcon: calculated[0].icon,
        topMatchScore: calculated[0].score,
        allMatches: calculated
      });
    }

    // Persist companion match (MongoDB for authenticated user, local for guest)
    if (saveCompanionMatch) {
      try {
        await saveCompanionMatch({
          answers: finalAnswers,
          primaryRecommendation: calculated[0],
          compatibilityScore: calculated[0].score,
          alternativeRankings: calculated.slice(1, 3),
          allMatches: calculated,
        });
        showToast('Companion match saved to your profile!');
      } catch (err) {
        console.warn('[PetQuiz] Failed to persist companion match:', err.message);
      }
    }
  };

  const resetCompanionQuiz = () => {
    setCompanionStep(0);
    setCompanionAnswers({});
    setCompanionResults(null);
    setViewingHistoricalMatch(null);
  };

  // ==========================================
  // ADMIN CMS HANDLERS
  // ==========================================

  const handleOpenCreateModal = () => {
    setEditingQuestionId(null);
    setQuestionFormData({
      category: 'Dog Care & Health',
      difficulty: 'medium',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      isActive: true,
    });
    setFormError(null);
    setIsQuestionModalOpen(true);
  };

  const handleOpenEditModal = (q) => {
    setEditingQuestionId(q._id || q.id);
    setQuestionFormData({
      category: q.category || 'Dog Care & Health',
      difficulty: q.difficulty || 'medium',
      question: q.question || '',
      options: Array.isArray(q.options) && q.options.length >= 2 ? [...q.options] : ['', '', '', ''],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || '',
      isActive: q.isActive !== undefined ? q.isActive : true,
    });
    setFormError(null);
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    const { category, difficulty, question, options, correctAnswer, explanation, isActive } = questionFormData;

    if (!question.trim()) {
      setFormError('Question text cannot be empty.');
      setFormSaving(false);
      return;
    }
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setFormError('At least 2 non-empty options are required.');
      setFormSaving(false);
      return;
    }
    if (correctAnswer < 0 || correctAnswer >= cleanOptions.length) {
      setFormError('Please select a valid correct answer option.');
      setFormSaving(false);
      return;
    }

    try {
      const payload = {
        category: category.trim(),
        difficulty,
        question: question.trim(),
        options: cleanOptions,
        correctAnswer: Number(correctAnswer),
        explanation: explanation.trim(),
        isActive: Boolean(isActive),
      };

      if (editingQuestionId) {
        await updateQuizQuestion(editingQuestionId, payload);
        showToast('Question updated successfully in MongoDB!');
      } else {
        await createQuizQuestion(payload);
        showToast('New question created in MongoDB!');
      }

      setIsQuestionModalOpen(false);
      loadAdminQuestions();
    } catch (err) {
      setFormError(err.message || 'Failed to save question.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleConfirmDeleteQuestion = async () => {
    if (!deletingQuestion) return;
    setDeleteSaving(true);
    try {
      const qId = deletingQuestion._id || deletingQuestion.id;
      await deleteQuizQuestion(qId);
      showToast('Question deleted successfully from MongoDB.');
      setDeletingQuestion(null);
      loadAdminQuestions();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`);
    } finally {
      setDeleteSaving(false);
    }
  };

  const filteredAdminQuestions = useMemo(() => {
    return adminQuestions.filter((q) => {
      const matchesSearch = !adminSearch.trim() || 
        (q.question || '').toLowerCase().includes(adminSearch.toLowerCase()) ||
        (q.explanation || '').toLowerCase().includes(adminSearch.toLowerCase());
      const matchesCat = adminCategoryFilter === 'All' || q.category === adminCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [adminQuestions, adminSearch, adminCategoryFilter]);

  const currentQ = questions[currentIndex];
  const allAnsweredCount = Object.keys(userAnswers).length;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="min-h-screen pt-28 pb-32 relative overflow-hidden">
      {/* Aurora Ambient Lighting */}
      <div className="absolute top-20 right-10 p-72 bg-orange-500/10 blur-[140px] rounded-full -z-10 pointer-events-none animate-pulse" />
      <div className="absolute bottom-20 left-10 p-72 bg-blue-500/10 blur-[140px] rounded-full -z-10 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 max-w-6xl">

        {/* Top Header & Dual Mode Switcher */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-widest mb-3">
              <Brain size={14} />
              <span>Petly Assessment & Compatibility Matrix</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
              Petly <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500">Academy & Matcher</span>
            </h1>
          </div>

          {/* Primary Mode Switcher: Knowledge Quiz vs Companion Matcher */}
          <div className="flex items-center p-1.5 glass-dark rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => {
                setQuizMode('knowledge');
                setActiveTab('quiz');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                quizMode === 'knowledge'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Brain size={15} />
              <span>Pet Care Knowledge Quiz</span>
            </button>
            <button
              onClick={() => {
                setQuizMode('companion');
                setCompanionTab('matcher');
                resetCompanionQuiz();
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                quizMode === 'companion'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Heart size={15} />
              <span>Find Perfect Companion</span>
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* MODE 1: PET CARE KNOWLEDGE QUIZ                      */}
        {/* ==================================================== */}
        {quizMode === 'knowledge' && (
          <div className="space-y-8">
            {/* Sub-Tabs: Assessment | Attempt History | Admin Panel */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveTab('quiz');
                    if (quizStage === 'review') setQuizStage('setup');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                    activeTab === 'quiz' ? 'bg-white text-black shadow-lg font-black' : 'text-white/40 hover:text-white glass'
                  }`}
                >
                  <Zap size={14} />
                  <span>Assessment</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('history');
                    fetchMyQuizAttempts();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                    activeTab === 'history' ? 'bg-white text-black shadow-lg font-black' : 'text-white/40 hover:text-white glass'
                  }`}
                >
                  <History size={14} />
                  <span>My Attempts ({mongoQuizAttempts.length})</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                      activeTab === 'admin' ? 'bg-white text-black shadow-lg font-black' : 'text-white/40 hover:text-white glass'
                    }`}
                  >
                    <Shield size={14} />
                    <span>Admin Question Bank</span>
                  </button>
                )}
              </div>
            </div>

            {/* TAB: QUIZ FLOW */}
            {activeTab === 'quiz' && (
              <div>
                {/* 1. SETUP STAGE */}
                {quizStage === 'setup' && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    {/* Setup Card */}
                    <div className="glass-dark p-8 md:p-12 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                      <div className="max-w-2xl relative z-10">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                          Evidence-Based Pet Care Knowledge Assessment
                        </h2>
                        <p className="text-xs md:text-sm text-white/50 leading-relaxed mb-6">
                          Configure your category, difficulty level, and question length below. All questions are dynamically scored and stored in your authenticated profile in MongoDB Atlas.
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 font-bold">
                          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-400" /> 4-Choice MCQs & Scenarios</span>
                          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-400" /> Clinical Explanations</span>
                          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-400" /> Isolated Attempt History</span>
                        </div>
                      </div>
                    </div>

                    {questionsError && (
                      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{questionsError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Track Category Selection */}
                      <div className="lg:col-span-8 space-y-3">
                        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                          <Compass size={14} /> 1. Select Knowledge Track
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {KNOWLEDGE_CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                              <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`p-5 rounded-[2rem] text-left transition-all border flex items-center gap-4 group ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500 text-white shadow-xl shadow-orange-500/10'
                                    : 'glass-dark border-white/5 text-white/60 hover:text-white hover:border-white/20'
                                }`}
                              >
                                <span className="text-2xl p-3 bg-white/5 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
                                  {cat.icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm text-white truncate">{cat.name}</p>
                                  <p className="text-[10px] text-white/40 mt-0.5">MCQ & Scenario Bank</p>
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-orange-500 text-black flex items-center justify-center font-black shrink-0">
                                    <Check size={12} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Difficulty & Count Selection */}
                      <div className="lg:col-span-4 space-y-6">
                        {/* Difficulty */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                            <Flame size={14} /> 2. Difficulty Level
                          </h3>
                          <div className="space-y-2">
                            {DIFFICULTIES.map((diff) => {
                              const isSelected = selectedDifficulty === diff.id;
                              return (
                                <button
                                  key={diff.id}
                                  onClick={() => setSelectedDifficulty(diff.id)}
                                  className={`w-full p-3.5 rounded-2xl text-left font-bold text-xs uppercase tracking-wider transition-all border flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-white text-black border-white shadow-lg'
                                      : 'glass-dark border-white/5 text-white/50 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  <span>{diff.label}</span>
                                  {isSelected && <Check size={15} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Question Count Selection: 5, 10, 15 */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                            <Filter size={14} /> 3. Question Count (5 / 10 / 15)
                          </h3>
                          <div className="grid grid-cols-3 gap-2.5">
                            {QUESTION_COUNTS.map((count) => {
                              const isSelected = selectedCount === count;
                              return (
                                <button
                                  key={count}
                                  onClick={() => setSelectedCount(count)}
                                  className={`py-3.5 rounded-2xl font-black text-xs transition-all border text-center ${
                                    isSelected
                                      ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                                      : 'glass-dark border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  {count} Questions
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Launch Quiz Button */}
                        <button
                          onClick={handleStartKnowledgeQuiz}
                          disabled={questionsLoading}
                          className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2.5"
                        >
                          {questionsLoading ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              <span>Loading Question Grid...</span>
                            </>
                          ) : (
                            <>
                              <span>Start Assessment ({selectedCount} Qs)</span>
                              <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. IN-PROGRESS STAGE */}
                {quizStage === 'in_progress' && currentQ && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto space-y-6">
                    {/* Header Tracker Bar */}
                    <div className="glass-dark p-6 rounded-[2.5rem] border border-white/10 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-0.5">
                          {currentQ.category || selectedCategory}
                        </span>
                        <span className="text-xl font-black text-white">
                          Question {currentIndex + 1} <span className="text-white/30 text-sm font-medium">of {questions.length}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block">Completed</span>
                          <span className="text-xs font-bold text-white">{allAnsweredCount} / {questions.length} answered</span>
                        </div>
                        <div className="w-28 sm:w-40 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full shadow-lg shadow-orange-500/50"
                          />
                        </div>
                      </div>
                    </div>

                    {submissionError && (
                      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle size={16} />
                        <span>{submissionError}</span>
                      </div>
                    )}

                    {/* Question Card */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentQ._id || currentQ.id || currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="glass-dark p-8 md:p-12 rounded-[3.5rem] border border-white/10 shadow-4xl relative space-y-6"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            currentQ.difficulty === 'hard' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            currentQ.difficulty === 'medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                            'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          }`}>
                            {currentQ.difficulty || 'standard'}
                          </span>
                          <span className="text-[11px] font-mono text-white/30">
                            ID: {String(currentQ._id || currentQ.id || '').slice(-6)}
                          </span>
                        </div>

                        <h2 className="text-xl md:text-2xl font-black text-white leading-relaxed tracking-tight">
                          {currentQ.question}
                        </h2>

                        {/* 4 Options MCQ */}
                        <div className="space-y-3.5 pt-2">
                          {currentQ.options?.map((optionText, optIdx) => {
                            const isSelected = userAnswers[currentQ._id || currentQ.id] === optIdx;
                            const optionLetters = ['A', 'B', 'C', 'D', 'E'];

                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleSelectOption(currentQ._id || currentQ.id, optIdx)}
                                className={`w-full p-4.5 md:p-5 rounded-[1.8rem] text-left transition-all border flex items-center gap-4 group ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/10 border-orange-500 text-white shadow-lg shadow-orange-500/10 scale-[1.01]'
                                    : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/15'
                                }`}
                              >
                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                                  isSelected 
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' 
                                    : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white'
                                }`}>
                                  {optionLetters[optIdx] || optIdx + 1}
                                </span>
                                <span className="flex-1 font-semibold text-xs md:text-sm leading-relaxed">
                                  {optionText}
                                </span>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-orange-500 text-black flex items-center justify-center shrink-0">
                                    <Check size={12} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Navigation Footer */}
                    <div className="flex items-center justify-between gap-4 pt-2">
                      <button
                        onClick={handlePrevQuestion}
                        disabled={currentIndex === 0}
                        className="px-6 py-3.5 rounded-2xl glass hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-20 flex items-center gap-2"
                      >
                        <ChevronLeft size={16} />
                        <span>Previous</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuizStage('setup')}
                          className="px-5 py-3.5 rounded-2xl glass text-white/30 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                        >
                          Exit
                        </button>

                        {!isLastQuestion ? (
                          <button
                            onClick={handleNextQuestion}
                            className="px-7 py-3.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-xl flex items-center gap-2"
                          >
                            <span>Next</span>
                            <ChevronRight size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={handleSubmitKnowledgeQuiz}
                            disabled={submittingAttempt || allAnsweredCount === 0}
                            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                          >
                            {submittingAttempt ? (
                              <>
                                <RefreshCw size={16} className="animate-spin" />
                                <span>Evaluating...</span>
                              </>
                            ) : (
                              <>
                                <Trophy size={16} />
                                <span>Submit Assessment ({allAnsweredCount}/{questions.length})</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. RESULTS STAGE */}
                {quizStage === 'results' && completedAttempt && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto space-y-8">
                    <div className="glass-dark p-10 md:p-14 rounded-[3.5rem] border border-white/10 text-center relative overflow-hidden shadow-4xl space-y-8">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-yellow-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-orange-500/30">
                        <Trophy size={40} />
                      </div>

                      <div>
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] block mb-2">
                          Evaluation Synchronized with MongoDB
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                          {completedAttempt.percentage >= 80 ? 'Mastery Score Achieved! 🌟' :
                           completedAttempt.percentage >= 50 ? 'Strong Performance! 🐾' : 'Knowledge Review Recommended 💡'}
                        </h2>
                      </div>

                      {/* Stat Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Score</p>
                          <p className="text-xl font-black text-white">{completedAttempt.score} / {completedAttempt.totalQuestions}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Accuracy</p>
                          <p className="text-xl font-black text-orange-400">{completedAttempt.percentage}%</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Correct</p>
                          <p className="text-xl font-black text-emerald-400">{completedAttempt.score}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Incorrect</p>
                          <p className="text-xl font-black text-red-400">{completedAttempt.totalQuestions - completedAttempt.score}</p>
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => {
                            setReviewingAttempt(completedAttempt);
                            setQuizStage('review');
                          }}
                          className="px-7 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 flex items-center gap-2"
                        >
                          <BookOpen size={16} />
                          <span>Review Explanations</span>
                        </button>
                        <button
                          onClick={() => {
                            setQuizStage('setup');
                            handleStartKnowledgeQuiz();
                          }}
                          className="px-7 py-3.5 rounded-2xl glass hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                        >
                          <RotateCcw size={16} />
                          <span>Retake Quiz</span>
                        </button>
                        <button
                          onClick={() => setQuizStage('setup')}
                          className="px-7 py-3.5 rounded-2xl glass hover:bg-white/10 text-white/40 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                        >
                          Change Track
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. ANSWER REVIEW STAGE */}
                {quizStage === 'review' && reviewingAttempt && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
                    <div className="glass-dark p-6 rounded-[2.5rem] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-0.5">
                          Detailed Review
                        </span>
                        <h2 className="text-xl font-black text-white tracking-tight">
                          {reviewingAttempt.category || 'Quiz Assessment'}
                        </h2>
                        <p className="text-xs text-white/40">
                          Score: {reviewingAttempt.score} / {reviewingAttempt.totalQuestions} ({reviewingAttempt.percentage}%)
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuizStage('setup')}
                          className="px-5 py-3 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-orange-500 hover:text-white transition-all shadow-lg"
                        >
                          New Assessment
                        </button>
                        <button
                          onClick={() => {
                            if (completedAttempt) {
                              setQuizStage('results');
                            } else {
                              setActiveTab('history');
                            }
                          }}
                          className="px-5 py-3 rounded-2xl glass hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all"
                        >
                          Back
                        </button>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {reviewingAttempt.answers?.map((ansItem, idx) => {
                        const qObj = ansItem.questionId && typeof ansItem.questionId === 'object' 
                          ? ansItem.questionId 
                          : ansItem;
                        const questionText = qObj.question || ansItem.question || `Question #${idx + 1}`;
                        const optionsList = Array.isArray(qObj.options) ? qObj.options : (Array.isArray(ansItem.options) ? ansItem.options : []);
                        const selectedIdx = ansItem.selectedOption;
                        const correctIdx = typeof qObj.correctAnswer === 'number' ? qObj.correctAnswer : ansItem.correctAnswer;
                        const explanationText = qObj.explanation || ansItem.explanation || '';
                        const isCorrect = Boolean(ansItem.isCorrect);

                        return (
                          <div 
                            key={idx}
                            className={`glass-dark p-6 md:p-8 rounded-[2.5rem] border transition-all space-y-4 ${
                              isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                isCorrect ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {isCorrect ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>

                            <h3 className="text-base md:text-lg font-black text-white leading-snug">
                              {questionText}
                            </h3>

                            {optionsList.length > 0 && (
                              <div className="space-y-2">
                                {optionsList.map((optText, optI) => {
                                  const isUserPick = selectedIdx === optI;
                                  const isRightAnswer = correctIdx === optI;

                                  let badgeStyle = 'bg-white/5 border-white/5 text-white/50';
                                  if (isRightAnswer) {
                                    badgeStyle = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold';
                                  } else if (isUserPick && !isRightAnswer) {
                                    badgeStyle = 'bg-red-500/20 border-red-500/40 text-red-300 font-bold line-through opacity-80';
                                  }

                                  return (
                                    <div key={optI} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${badgeStyle}`}>
                                      <div className="flex items-center gap-2.5">
                                        <span className="font-mono font-bold opacity-60">[{optI + 1}]</span>
                                        <span>{optText}</span>
                                      </div>
                                      <div>
                                        {isRightAnswer && (
                                          <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-black font-black text-[10px] uppercase tracking-wider">
                                            Correct
                                          </span>
                                        )}
                                        {isUserPick && !isRightAnswer && (
                                          <span className="px-2 py-0.5 rounded-md bg-red-500 text-white font-black text-[10px] uppercase tracking-wider">
                                            Your Choice
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {explanationText && (
                              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 flex items-start gap-2.5">
                                <Lightbulb size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-black text-white uppercase tracking-wider text-[10px] mb-0.5">Clinical Explanation</p>
                                  <p className="leading-relaxed font-medium">{explanationText}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* TAB: ATTEMPT HISTORY */}
            {activeTab === 'history' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Your Quiz Attempt History</h2>
                    <p className="text-xs text-white/40">Saved in MongoDB Atlas for your authenticated account.</p>
                  </div>
                  <button
                    onClick={() => fetchMyQuizAttempts()}
                    className="p-2.5 glass rounded-xl text-white/50 hover:text-white transition-all"
                    title="Refresh attempts"
                  >
                    <RefreshCw size={15} className={quizAttemptsLoading ? 'animate-spin text-orange-400' : ''} />
                  </button>
                </div>

                {attemptDetailsError && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{attemptDetailsError}</span>
                  </div>
                )}

                {quizAttemptsLoading ? (
                  <div className="py-20 text-center">
                    <RefreshCw size={28} className="animate-spin text-orange-400 mx-auto mb-3" />
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Loading Attempt Records...</p>
                  </div>
                ) : mongoQuizAttempts.length === 0 ? (
                  <div className="glass-dark p-12 rounded-[3rem] border border-white/10 text-center max-w-md mx-auto space-y-3">
                    <Brain size={28} className="mx-auto text-white/20" />
                    <h3 className="text-lg font-black text-white">No Attempts Recorded Yet</h3>
                    <p className="text-xs text-white/40">Complete a 5, 10, or 15-question assessment to track your knowledge growth.</p>
                    <button
                      onClick={() => {
                        setActiveTab('quiz');
                        setQuizStage('setup');
                      }}
                      className="px-6 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs uppercase tracking-wider"
                    >
                      Start Quiz
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mongoQuizAttempts.map((attempt) => {
                      const attemptId = attempt._id || attempt.id;
                      const formattedDate = attempt.createdAt ? new Date(attempt.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : 'Recently';

                      return (
                        <div key={attemptId} className="glass-dark p-6 rounded-[2rem] border border-white/10 hover:border-orange-500/30 transition-all space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-0.5">
                                {attempt.category || 'General Assessment'}
                              </span>
                              <p className="text-xs text-white/40">{formattedDate}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-xl font-black text-xs ${
                              attempt.percentage >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              attempt.percentage >= 50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {attempt.percentage}%
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 py-2 border-y border-white/5 text-center text-xs">
                            <div>
                              <p className="text-[10px] text-white/30 uppercase tracking-widest">Score</p>
                              <p className="text-sm font-black text-white">{attempt.score} / {attempt.totalQuestions}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-white/30 uppercase tracking-widest">Result</p>
                              <p className="text-sm font-black text-white">
                                {attempt.percentage >= 70 ? 'Passed' : 'Needs Review'}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleViewAttemptHistoryDetails(attemptId)}
                            disabled={loadingAttemptDetails}
                            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-white/10"
                          >
                            <BookOpen size={13} />
                            <span>Review Full Breakdown</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: ADMIN QUESTION CMS */}
            {activeTab === 'admin' && isAdmin && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="glass-dark p-6 rounded-[2.5rem] border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-0.5 flex items-center gap-1.5">
                      <Shield size={13} /> Protected Admin Zone
                    </span>
                    <h2 className="text-2xl font-black text-white tracking-tight">Question Bank Management</h2>
                    <p className="text-xs text-white/40">Synchronized with MongoDB QuizQuestion collection.</p>
                  </div>
                  <button
                    onClick={handleOpenCreateModal}
                    className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 shrink-0"
                  >
                    <Plus size={15} />
                    <span>Add New Question</span>
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search questions or explanations..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-white outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <select
                    value={adminCategoryFilter}
                    onChange={(e) => setAdminCategoryFilter(e.target.value)}
                    className="bg-black/80 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-orange-500/50"
                  >
                    <option value="All">All Categories ({adminQuestions.length})</option>
                    {KNOWLEDGE_CATEGORIES.filter((c) => c.id !== 'All').map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {adminError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{adminError}</span>
                  </div>
                )}

                {/* Question List */}
                <div className="space-y-3">
                  {filteredAdminQuestions.map((q, qIndex) => {
                    const qId = q._id || q.id;
                    return (
                      <div key={qId || qIndex} className="glass-dark p-5 rounded-[2rem] border border-white/10 hover:border-white/20 transition-all space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase">
                              {q.category}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-[10px] font-bold uppercase">
                              {q.difficulty}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(q)}
                              className="p-2 glass hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => setDeletingQuestion(q)}
                              className="p-2 glass hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <p className="text-sm font-bold text-white">{q.question}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {q.options?.map((opt, oIdx) => (
                            <div key={oIdx} className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                              q.correctAnswer === oIdx ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold' : 'bg-white/5 border-white/5 text-white/50'
                            }`}>
                              <span className="font-mono opacity-50">[{oIdx + 1}]</span>
                              <span className="truncate">{opt}</span>
                              {q.correctAnswer === oIdx && <Check size={12} className="ml-auto text-emerald-400" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* MODE 2: FIND YOUR PERFECT COMPANION                  */}
        {/* ==================================================== */}
        {quizMode === 'companion' && (
          <div className="space-y-8">
            {/* Companion Mode Sub-Tabs */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCompanionTab('matcher');
                    resetCompanionQuiz();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                    companionTab === 'matcher' && !viewingHistoricalMatch ? 'bg-white text-black shadow-lg font-black' : 'text-white/40 hover:text-white glass'
                  }`}
                >
                  <Compass size={14} />
                  <span>Compatibility Matcher</span>
                </button>
                <button
                  onClick={() => {
                    setCompanionTab('history');
                    setViewingHistoricalMatch(null);
                    fetchMyCompanionMatches();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                    companionTab === 'history' || viewingHistoricalMatch ? 'bg-white text-black shadow-lg font-black' : 'text-white/40 hover:text-white glass'
                  }`}
                >
                  <History size={14} />
                  <span>Companion History ({companionMatches.length})</span>
                </button>
              </div>
              {companionTab === 'history' && (
                <button
                  onClick={() => fetchMyCompanionMatches()}
                  className="p-2.5 rounded-xl glass text-white/40 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
                  title="Refresh companion match history"
                >
                  <RefreshCw size={14} className={companionMatchesLoading ? 'animate-spin text-blue-400' : ''} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              )}
            </div>

            {/* SUB-VIEW 1: ACTIVE QUESTIONNAIRE & RESULTS */}
            {companionTab === 'matcher' && !viewingHistoricalMatch && (
              <div>
                {!isLiveCompanionComplete ? (
                  <div className="space-y-8 text-center max-w-3xl mx-auto">
                    {/* Progress Bar */}
                    <div className="max-w-md mx-auto">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                          Question {companionStep + 1} of {COMPANION_QUESTIONS.length}
                        </span>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">
                          {Math.round(((companionStep + 1) / COMPANION_QUESTIONS.length) * 100)}% Synchronized
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${((companionStep + 1) / COMPANION_QUESTIONS.length) * 100}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/50"
                        />
                      </div>
                    </div>

                    {/* Companion Question Card */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={companionStep}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className="glass-dark p-8 md:p-14 rounded-[3.5rem] border border-white/10 shadow-5xl relative overflow-hidden space-y-8"
                      >
                        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl shadow-blue-500/10">
                          {COMPANION_QUESTIONS[companionStep].icon}
                        </div>

                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
                          {COMPANION_QUESTIONS[companionStep].question}
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          {COMPANION_QUESTIONS[companionStep].options.map((opt, i) => {
                            const isSelected = companionAnswers[COMPANION_QUESTIONS[companionStep].id]?.value === opt.value;
                            return (
                              <button
                                key={i}
                                onClick={() => handleCompanionOptionSelect(COMPANION_QUESTIONS[companionStep].id, opt)}
                                className={`group p-6 rounded-[2rem] border text-left transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-blue-500/20 border-blue-400 text-white shadow-blue-500/20 ring-1 ring-blue-400/50'
                                    : 'bg-white/5 border-white/5 hover:bg-white text-white hover:text-black hover:border-white'
                                }`}
                              >
                                <span className="text-sm md:text-base font-bold tracking-tight">{opt.label}</span>
                                <ChevronRight size={18} className={`${isSelected ? 'opacity-100 text-blue-400' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} />
                              </button>
                            );
                          })}
                        </div>

                        {/* Question 8 Explicit Submit Action */}
                        {companionStep === COMPANION_QUESTIONS.length - 1 && (
                          <div className="pt-4 border-t border-white/5">
                            <button
                              disabled={!allQuestionsAnswered}
                              onClick={handleSubmitCompanionAssessment}
                              className={`w-full py-4 px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
                                allQuestionsAnswered
                                  ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-400 text-white shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                                  : 'bg-white/10 text-white/30 cursor-not-allowed'
                              }`}
                            >
                              <Sparkles size={16} />
                              <span>Submit & Calculate Companion Match</span>
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {companionStep > 0 && (
                      <button
                        onClick={() => setCompanionStep((prev) => prev - 1)}
                        className="text-xs font-bold text-white/30 hover:text-white uppercase tracking-wider transition-colors"
                      >
                        Previous Question
                      </button>
                    )}
                  </div>
                ) : (
                  /* Companion Match Results Screen */
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10 max-w-4xl mx-auto">
                    <header className="text-center">
                      <div className="inline-flex items-center gap-2 text-cyan-400 font-black text-xs tracking-[0.3em] uppercase mb-3">
                        <Sparkles size={16} />
                        <span>Neural Affinity Match Complete</span>
                      </div>
                      <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                        Your Ideal <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400">Companion Match</span>
                      </h2>
                    </header>

                    {/* Top Match Card */}
                    <div className="glass-dark p-8 md:p-14 rounded-[3.5rem] border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent shadow-4xl space-y-6">
                      <div className="flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
                        <div className="text-8xl shrink-0 animate-bounce">{companionResults[0].icon}</div>
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">{companionResults[0].name}</h3>
                            <span className="px-4 py-1.5 bg-blue-500 text-white font-black rounded-xl text-sm shadow-lg shadow-blue-500/30">
                              {companionResults[0].score}% Compatibility
                            </span>
                          </div>
                          <p className="text-sm text-white/70 leading-relaxed font-medium italic">
                            "{companionResults[0].desc}"
                          </p>
                          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                            <button
                              onClick={() => navigate('/adopt')}
                              className="px-8 py-3.5 bg-white text-black font-black rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-xl text-xs uppercase tracking-widest flex items-center gap-2"
                            >
                              <span>Explore Available {companionResults[0].name}s</span>
                              <ArrowRight size={15} />
                            </button>
                            <button
                              onClick={resetCompanionQuiz}
                              className="px-6 py-3.5 glass hover:bg-white/10 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider flex items-center gap-2"
                            >
                              <RotateCcw size={14} />
                              <span>Recalculate</span>
                            </button>
                            <button
                              onClick={() => {
                                setCompanionTab('history');
                                fetchMyCompanionMatches();
                              }}
                              className="px-6 py-3.5 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                            >
                              <History size={14} />
                              <span>View History</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Matches Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {companionResults.slice(1, 3).map((res, i) => (
                        <div key={i} className="glass-dark p-6 rounded-[2.5rem] border border-white/10 flex items-center gap-5">
                          <div className="text-5xl shrink-0">{res.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="text-base font-black text-white uppercase tracking-tight">{res.name}</h4>
                              <span className="text-xs font-bold text-white/50">{res.score}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-400" style={{ width: `${res.score}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* SUB-VIEW 2: COMPANION MATCH HISTORY LIST */}
            {companionTab === 'history' && !viewingHistoricalMatch && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Your Companion Match History</h2>
                    <p className="text-xs md:text-sm text-white/40 mt-1">Saved records of your neural companion compatibility assessments in MongoDB.</p>
                  </div>
                  <button
                    onClick={() => {
                      setCompanionTab('matcher');
                      resetCompanionQuiz();
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 shrink-0"
                  >
                    <Plus size={14} />
                    <span>New Assessment</span>
                  </button>
                </div>

                {companionMatchesLoading && (
                  <div className="text-center py-16">
                    <RefreshCw size={32} className="animate-spin text-blue-400 mx-auto mb-4" />
                    <p className="text-white/40 text-sm font-medium">Retrieving match history from MongoDB...</p>
                  </div>
                )}

                {!companionMatchesLoading && companionMatches.length === 0 && (
                  <div className="glass-dark rounded-[3rem] border border-white/10 p-16 text-center max-w-xl mx-auto my-6">
                    <div className="w-20 h-20 rounded-3xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                      <Heart size={36} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">No Companion Matches Recorded</h3>
                    <p className="text-white/40 text-sm mb-6 leading-relaxed">
                      You haven't completed a companion assessment yet. Take the 8-question compatibility questionnaire to discover your ideal cyber-sanctuary companion!
                    </p>
                    <button
                      onClick={() => {
                        setCompanionTab('matcher');
                        resetCompanionQuiz();
                      }}
                      className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20"
                    >
                      Start Compatibility Matcher
                    </button>
                  </div>
                )}

                {!companionMatchesLoading && companionMatches.length > 0 && (
                  <div className="space-y-4">
                    {companionMatches.map((match) => {
                      const rec = match.primaryRecommendation || {};
                      const score = match.compatibilityScore || rec.score || 0;
                      const dateStr = new Date(match.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const alts = Array.isArray(match.alternativeRankings) ? match.alternativeRankings : [];

                      return (
                        <motion.div
                          key={match._id || match.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass-dark rounded-[2.5rem] p-6 md:p-8 border border-white/10 hover:border-blue-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group"
                        >
                          <div className="flex items-center gap-6 min-w-0">
                            <div className="text-6xl shrink-0 w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                              {rec.icon || '🐾'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3 mb-1">
                                <h4 className="text-2xl font-black text-white tracking-tight">{rec.name || 'Companion Unit'}</h4>
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-black uppercase tracking-wider">
                                  {score}% Compatibility
                                </span>
                              </div>
                              <p className="text-xs text-white/40 mb-2">Recorded on <strong className="text-white/70 font-semibold">{dateStr}</strong></p>
                              {alts.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                                  <span className="font-bold text-white/30 uppercase tracking-wider">Top Alternatives:</span>
                                  {alts.map((alt, idx) => (
                                    <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/5 text-white/70 font-semibold">
                                      {alt.icon} {alt.name} ({alt.score}%)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                            <button
                              onClick={() => setViewingHistoricalMatch(match)}
                              className="px-6 py-3 bg-white hover:bg-blue-500 text-black hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 shrink-0"
                            >
                              <span>View Match Report</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-VIEW 3: HISTORICAL SNAPSHOT DETAILS */}
            {companionTab === 'history' && viewingHistoricalMatch && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl glass border border-white/10 text-xs">
                  <div className="flex items-center gap-2 text-white/60">
                    <History size={16} className="text-blue-400" />
                    <span>Historical Match Snapshot recorded on <strong className="text-white">{new Date(viewingHistoricalMatch.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingHistoricalMatch(null)}
                      className="px-4 py-2 glass hover:bg-white/10 text-white rounded-xl font-bold transition-all text-xs"
                    >
                      ← Back to History
                    </button>
                    <button
                      onClick={() => {
                        setViewingHistoricalMatch(null);
                        setCompanionTab('matcher');
                        resetCompanionQuiz();
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg"
                    >
                      New Assessment
                    </button>
                  </div>
                </div>

                {/* Primary Match Card */}
                {(() => {
                  const rec = viewingHistoricalMatch.primaryRecommendation || {};
                  const score = viewingHistoricalMatch.compatibilityScore || rec.score || 0;
                  const alts = Array.isArray(viewingHistoricalMatch.alternativeRankings) ? viewingHistoricalMatch.alternativeRankings : [];
                  const answers = viewingHistoricalMatch.answers || {};

                  return (
                    <>
                      <div className="glass-dark p-8 md:p-14 rounded-[3.5rem] border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent shadow-4xl space-y-6">
                        <div className="flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
                          <div className="text-8xl shrink-0 animate-bounce">{rec.icon || '🐾'}</div>
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                              <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">{rec.name || 'Companion Unit'}</h3>
                              <span className="px-4 py-1.5 bg-blue-500 text-white font-black rounded-xl text-sm shadow-lg shadow-blue-500/30">
                                {score}% Compatibility
                              </span>
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed font-medium italic">
                              "{rec.desc}"
                            </p>
                            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                              <button
                                onClick={() => navigate('/adopt')}
                                className="px-8 py-3.5 bg-white text-black font-black rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-xl text-xs uppercase tracking-widest flex items-center gap-2"
                              >
                                <span>Explore Available {rec.name || 'Companion'}s</span>
                                <ArrowRight size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  setViewingHistoricalMatch(null);
                                  setCompanionTab('matcher');
                                  resetCompanionQuiz();
                                }}
                                className="px-6 py-3.5 glass hover:bg-white/10 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider flex items-center gap-2"
                              >
                                <RotateCcw size={14} />
                                <span>Retake Assessment</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Alternative Matches Grid */}
                      {alts.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {alts.map((res, i) => (
                            <div key={i} className="glass-dark p-6 rounded-[2.5rem] border border-white/10 flex items-center gap-5">
                              <div className="text-5xl shrink-0">{res.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                  <h4 className="text-base font-black text-white uppercase tracking-tight">{res.name}</h4>
                                  <span className="text-xs font-bold text-white/50">{res.score}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-400" style={{ width: `${res.score}%` }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Stored Questionnaire Responses */}
                      {Object.keys(answers).length > 0 && (
                        <div className="p-8 rounded-[2.5rem] glass-dark border border-white/10 space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-widest text-white/50 mb-2">Responses Recorded in This Assessment</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {COMPANION_QUESTIONS.map((q) => {
                              const ansObj = answers[q.id];
                              if (!ansObj) return null;
                              return (
                                <div key={q.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs">
                                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">{q.question}</p>
                                  <p className="font-black text-white">{ansObj.label || ansObj.value}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </motion.div>
            )}
          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* MODAL 1: CREATE / EDIT QUESTION (ADMIN ONLY)        */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isQuestionModalOpen && (
          <div className="fixed inset-0 z-[2800] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl glass-dark rounded-[3.5rem] p-8 md:p-12 border border-white/10 shadow-5xl relative my-8"
            >
              <button 
                onClick={() => setIsQuestionModalOpen(false)}
                className="absolute top-8 right-8 p-3 glass text-white/40 hover:text-white rounded-2xl transition-all"
              >
                <X size={20} />
              </button>

              <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                {editingQuestionId ? 'Edit Quiz Question' : 'Create New Quiz Question'}
              </h3>
              <p className="text-xs text-white/40 mb-6">
                Directly synchronized with MongoDB Atlas question repository.
              </p>

              {formError && (
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveQuestion} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
                      Category
                    </label>
                    <select
                      value={questionFormData.category}
                      onChange={(e) => setQuestionFormData({ ...questionFormData, category: e.target.value })}
                      className="w-full bg-black/80 border border-white/10 rounded-2xl p-3.5 text-xs text-white outline-none focus:border-orange-500/50"
                    >
                      {KNOWLEDGE_CATEGORIES.filter((c) => c.id !== 'All').map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
                      Difficulty
                    </label>
                    <select
                      value={questionFormData.difficulty}
                      onChange={(e) => setQuestionFormData({ ...questionFormData, difficulty: e.target.value })}
                      className="w-full bg-black/80 border border-white/10 rounded-2xl p-3.5 text-xs text-white outline-none focus:border-orange-500/50"
                    >
                      <option value="easy">Easy (Novice)</option>
                      <option value="medium">Medium (Guardian)</option>
                      <option value="hard">Hard (Master)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
                    Question Text
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter question text or veterinary scenario..."
                    value={questionFormData.question}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, question: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500/50"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                    4 MCQ Options (Select Radio for Correct Choice)
                  </label>
                  {questionFormData.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctAnswerIndex"
                        checked={questionFormData.correctAnswer === idx}
                        onChange={() => setQuestionFormData({ ...questionFormData, correctAnswer: idx })}
                        className="w-4.5 h-4.5 accent-orange-500 shrink-0 cursor-pointer"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        placeholder={`Option ${idx + 1}...`}
                        value={opt}
                        onChange={(e) => {
                          const nextOpts = [...questionFormData.options];
                          nextOpts[idx] = e.target.value;
                          setQuestionFormData({ ...questionFormData, options: nextOpts });
                        }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500/50"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
                    Explanation
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Clinical explanation shown during review..."
                    value={questionFormData.explanation}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500/50"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsQuestionModalOpen(false)}
                    className="flex-1 py-3.5 glass hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {formSaving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{editingQuestionId ? 'Update Question' : 'Create Question'}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL 2: DELETE CONFIRMATION (ADMIN ONLY)            */}
      {/* ==================================================== */}
      <AnimatePresence>
        {deletingQuestion && (
          <div className="fixed inset-0 z-[2900] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-dark rounded-[2.5rem] p-8 border border-red-500/30 shadow-2xl relative text-center space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 size={22} />
              </div>

              <div>
                <h3 className="text-xl font-black text-white mb-1.5">Delete Quiz Question</h3>
                <p className="text-xs text-white/50">
                  Permanently delete this question from MongoDB?
                </p>
                <div className="mt-3 p-3 bg-white/5 rounded-xl text-left border border-white/5">
                  <p className="text-xs text-white/80 font-bold line-clamp-2">"{deletingQuestion.question}"</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingQuestion(null)}
                  disabled={deleteSaving}
                  className="flex-1 py-3 glass hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteQuestion}
                  disabled={deleteSaving}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Question</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[3000] px-5 py-3.5 rounded-2xl bg-emerald-500 text-white font-black text-xs shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};

export default PetQuiz;

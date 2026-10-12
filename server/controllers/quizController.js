import QuizQuestion from '../models/QuizQuestion.js';
import QuizAttempt from '../models/QuizAttempt.js';
import CompanionMatch from '../models/CompanionMatch.js';
import { isValidObjectId } from '../utils/validateObjectId.js';

// Default curated quiz questions for initial database seeding (30 questions across 5 categories)
const DEFAULT_QUIZ_QUESTIONS = [
  // Category 1: Dog Care & Health
  {
    category: 'Dog Care & Health',
    difficulty: 'easy',
    question: 'Which of the following foods is extremely toxic to dogs even in very small amounts?',
    options: ['Cooked Carrots', 'Xylitol (Artificial Sweetener)', 'Plain White Rice', 'Seedless Watermelon'],
    correctAnswer: 1,
    explanation: 'Xylitol is a sugar substitute found in sugar-free gum and peanut butter that causes rapid insulin release, acute hypoglycemia, and liver failure in canines.',
    isActive: true,
  },
  {
    category: 'Dog Care & Health',
    difficulty: 'medium',
    question: 'Scenario: You notice your adult dog has a normal resting body temperature. What temperature range is considered healthy for a canine?',
    options: ['96.0°F - 98.0°F', '100.5°F - 102.5°F', '104.0°F - 106.5°F', '92.0°F - 95.0°F'],
    correctAnswer: 1,
    explanation: 'A normal canine body temperature ranges between 100.5°F and 102.5°F (38.1°C - 39.2°C). A temperature above 103.5°F indicates fever or hyperthermia.',
    isActive: true,
  },
  {
    category: 'Dog Care & Health',
    difficulty: 'easy',
    question: 'How is canine heartworm disease transmitted between animals?',
    options: ['Direct contact with infected dog saliva', 'Bite of an infected mosquito', 'Consuming contaminated raw meat', 'Walking on infected soil surfaces'],
    correctAnswer: 1,
    explanation: 'Heartworm (Dirofilaria immitis) is transmitted exclusively through the bite of an infected mosquito carrying microfilariae.',
    isActive: true,
  },
  {
    category: 'Dog Care & Health',
    difficulty: 'hard',
    question: 'Scenario: A large deep-chested dog displays restless pacing, unproductive retching/gagging, and rapid abdominal swelling. What life-threatening medical emergency is this?',
    options: ['Kennel Cough', 'Gastric Dilatation-Volvulus (GDV / Bloat)', 'Dietary Indiscretion Gastritis', 'Canine Parvovirus'],
    correctAnswer: 1,
    explanation: 'GDV is a critical surgical emergency where the stomach twists and traps gas and blood supply. Immediate veterinary surgery is required to prevent fatality.',
    isActive: true,
  },
  {
    category: 'Dog Care & Health',
    difficulty: 'medium',
    question: 'How frequently should an adult dog receive professional dental evaluations to avoid severe periodontal disease?',
    options: ['Every 5 years', 'At least once annually during wellness exams', 'Only if adult teeth become noticeably loose', 'Dogs never require dental cleanings'],
    correctAnswer: 1,
    explanation: 'Periodontal disease affects over 80% of dogs by age 3; annual dental cleanings and evaluations protect cardiac and renal health.',
    isActive: true,
  },
  {
    category: 'Dog Care & Health',
    difficulty: 'easy',
    question: 'Why are grapes and raisins strictly prohibited for dogs?',
    options: ['They cause acute irreversible renal (kidney) failure', 'They dissolve canine dental enamel immediately', 'They cause sudden temporary blindness', 'They only cause minor mild sneezing'],
    correctAnswer: 0,
    explanation: 'Tartaric acid in grapes and raisins induces acute renal necrosis and kidney failure in canines, regardless of dog size or breed.',
    isActive: true,
  },

  // Category 2: Cat Behavior & Nutrition
  {
    category: 'Cat Behavior & Nutrition',
    difficulty: 'medium',
    question: 'Why must cats consume meat-based diets rather than vegetarian or vegan alternatives?',
    options: [
      'Cats require dietary Taurine and Arachidonic acid which are only naturally bioavailable in animal tissue',
      'Cats cannot digest cooked vegetables under any circumstances',
      'Plant matter alters feline coat coloration permanently',
      'Cats lack saliva to break down any carbohydrates'
    ],
    correctAnswer: 0,
    explanation: 'Cats are obligate carnivores requiring pre-formed Vitamin A, Taurine, and Arachidonic acid found exclusively in animal tissues; deficiency causes blindness and cardiomyopathy.',
    isActive: true,
  },
  {
    category: 'Cat Behavior & Nutrition',
    difficulty: 'easy',
    question: 'Scenario: Your cat approaches you with an upright tail with a slight gentle question-mark curve at the tip. What does this indicate?',
    options: ['High agitation and defensive aggression', 'Friendly, confident, and pleased to see you', 'Extreme fear and impending flight', 'Physical pain or illness'],
    correctAnswer: 1,
    explanation: 'An upright tail with a slight forward curve or hook is a universal feline signal of friendly greeting, confidence, and positive social engagement.',
    isActive: true,
  },
  {
    category: 'Cat Behavior & Nutrition',
    difficulty: 'medium',
    question: 'What causes feline "whisker fatigue" in companion cats?',
    options: [
      'Sensitive facial vibrissae constantly brushing against the sides of deep, narrow food or water bowls',
      'Excessive grooming of facial hair during cold weather',
      'Vitamin D deficiency in indoor environments',
      'Overexposure to bright household LED lighting'
    ],
    correctAnswer: 0,
    explanation: 'Cat whiskers are packed with proprioceptors; repetitive contact with high bowl edges causes sensory overload, prompting cats to paw food onto the floor.',
    isActive: true,
  },
  {
    category: 'Cat Behavior & Nutrition',
    difficulty: 'easy',
    question: 'According to feline behavioral specialists, what is the golden rule for the number of litter boxes in a multi-cat household?',
    options: ['One box for every two cats', 'Exactly one box per cat, plus one extra (N + 1)', 'A single large central box is always sufficient', 'Two boxes total regardless of cat population'],
    correctAnswer: 1,
    explanation: 'The N+1 rule ensures cats do not face territorial blocking or cleanliness issues that trigger inappropriate house soiling.',
    isActive: true,
  },
  {
    category: 'Cat Behavior & Nutrition',
    difficulty: 'hard',
    question: 'Besides contentment, what biological function can a cat purr serve during times of stress or physical injury?',
    options: [
      'Low-frequency vibrations (25-150 Hz) promote bone density regeneration, tissue repair, and self-soothing pain relief',
      'It emits ultrasonic warning signals to predators',
      'It vents excess body heat without panting',
      'It produces pheromones through the throat lining'
    ],
    correctAnswer: 0,
    explanation: 'Cat purrs vibrate at 25-150 Hz, frequencies demonstrated in orthopedic medicine to stimulate bone growth, tendon healing, and ease respiratory distress.',
    isActive: true,
  },
  {
    category: 'Cat Behavior & Nutrition',
    difficulty: 'easy',
    question: 'Why do many domestic cats prefer drinking from flowing water fountains rather than stagnant bowls?',
    options: [
      'Evolutionary instinct associates running water with purity and safety from bacterial parasites',
      'Cats cannot see non-moving water surfaces',
      'Flowing water contains more oxygen bubbles which cats enjoy eating',
      'Stagnant water dissolves feline teeth'
    ],
    correctAnswer: 0,
    explanation: 'In the wild, running streams indicate clean water while standing puddles harbor parasites, making circulating fountains instinctively appealing.',
    isActive: true,
  },

  // Category 3: Pet Health & Safety
  {
    category: 'Pet Health & Safety',
    difficulty: 'hard',
    question: 'Scenario: On a hot summer day, your companion begins excessively panting, drooling thick saliva, and displays bright red gums. What immediate emergency action should you take for suspected heatstroke?',
    options: [
      'Submerge the pet immediately into an ice-cold freezing bath',
      'Move to shade/AC, apply cool (not ice cold) wet towels to groin/paws, offer small sips of water, and transport to the emergency vet immediately',
      'Give aspirin and encourage vigorous walking to circulate blood',
      'Wait 3 hours in a quiet room to observe whether symptoms subside'
    ],
    correctAnswer: 1,
    explanation: 'Using ice water can cause peripheral vasoconstriction and hypothermic shock. Cooling with lukewarm-to-cool water on extremities while rushing to a vet is essential.',
    isActive: true,
  },
  {
    category: 'Pet Health & Safety',
    difficulty: 'easy',
    question: 'Does a pet microchip function as a real-time GPS tracking device?',
    options: [
      'Yes, it broadcasts real-time satellite coordinates to mobile apps',
      'No, it is a passive RFID transponder that provides a unique ID when scanned by a shelter or vet scanner',
      'Yes, but only within a 5-mile Bluetooth radius',
      'No, it only stores the pet’s vaccination history'
    ],
    correctAnswer: 1,
    explanation: 'A microchip is a passive RFID chip with no battery or GPS. When scanned with a universal microchip reader, it transmits a 9, 10, or 15-digit registration number linked to a registry.',
    isActive: true,
  },
  {
    category: 'Pet Health & Safety',
    difficulty: 'medium',
    question: 'Why is human Acetaminophen (Tylenol) exceptionally lethal when ingested by domestic cats?',
    options: [
      'Cats lack the glucuronyl transferase enzyme, causing toxic methemoglobinemia and acute liver destruction',
      'It causes immediate permanent blindness within 5 minutes',
      'It crystallizes instantly in feline stomach acid',
      'It causes cats to sleep continuously for several days'
    ],
    correctAnswer: 0,
    explanation: 'Cats cannot metabolize acetaminophen safely; it destroys red blood cells’ oxygen carrying capacity and causes fatal hepatic failure.',
    isActive: true,
  },
  {
    category: 'Pet Health & Safety',
    difficulty: 'hard',
    question: 'What is the recommended chest compression rate during veterinary CPR for a companion animal in cardiac arrest?',
    options: ['30 - 40 compressions per minute', '100 - 120 compressions per minute', '180 - 200 compressions per minute', '10 - 20 compressions per minute'],
    correctAnswer: 1,
    explanation: 'Standard RECOVER veterinary CPR guidelines recommend 100 to 120 compressions per minute with 30:2 compression-to-ventilation ratio for non-intubated patients.',
    isActive: true,
  },
  {
    category: 'Pet Health & Safety',
    difficulty: 'easy',
    question: 'Why should owners rinse companion paws after walking on salted winter sidewalks?',
    options: [
      'De-icing chemical salts cause painful paw pad chemical burns and toxic gastritis if licked off during grooming',
      'Sidewalk salt causes claws to grow twice as fast',
      'Salt permanently bleaches dark fur coats white',
      'Salt prevents dogs from feeling cold temperatures'
    ],
    correctAnswer: 0,
    explanation: 'Commercial sidewalk ice melters contain calcium/sodium chloride that burns paw tissues and causes mouth ulceration and salt toxicosis when groomed.',
    isActive: true,
  },
  {
    category: 'Pet Health & Safety',
    difficulty: 'medium',
    question: 'Which common household plant is notorious for causing irreversible acute kidney failure in cats even from microscopic pollen ingestion?',
    options: ['True Lilies (Easter Lily, Tiger Lily, Stargazer Lily)', 'Spider Plant', 'Boston Fern', 'African Violet'],
    correctAnswer: 0,
    explanation: 'All parts of True Lilies (Lilium and Hemerocallis genera), including pollen and vase water, are intensely nephrotoxic to felines and can prove fatal within 72 hours.',
    isActive: true,
  },

  // Category 4: Pet Training & Psychology
  {
    category: 'Pet Training & Psychology',
    difficulty: 'medium',
    question: 'What is the critical socialization window for puppies when novel positive experiences have the strongest impact on lifelong temperament?',
    options: ['Between 3 and 14 weeks of age', 'Between 6 and 12 months of age', 'Between 1 and 2 years of age', 'Socialization only occurs after adulthood at 24 months'],
    correctAnswer: 0,
    explanation: 'The primary canine socialization period occurs between approximately 3 and 14 weeks of age, during which positive exposure shapes neurological fear thresholds.',
    isActive: true,
  },
  {
    category: 'Pet Training & Psychology',
    difficulty: 'easy',
    question: 'Which training methodology is scientifically proven to establish the strongest reliable behaviors with minimal anxiety and avoidance?',
    options: [
      'Positive Reinforcement (rewarding desired behaviors with treats/play)',
      'Alpha Roll Dominance Theory (physically pinning the animal)',
      'Shock/Prong punishment without reward',
      'Withholding food for 24 hours until commands are obeyed'
    ],
    correctAnswer: 0,
    explanation: 'Positive reinforcement utilizes operant conditioning (R+) to build enthusiastic behavioral responses while preserving the human-animal bond without fear or aggression.',
    isActive: true,
  },
  {
    category: 'Pet Training & Psychology',
    difficulty: 'medium',
    question: 'What is the primary psychological and physiological purpose of feline vertical scratching posts?',
    options: [
      'Sharpening claws, stretching tendons/spine, and depositing pheromones from scent glands in paw pads',
      'A symptom of spite or revenge against human furniture',
      'Filing down overgrown claws so they fall off completely',
      'Attracting insects to the scratching surface'
    ],
    correctAnswer: 0,
    explanation: 'Scratching removes dead outer claw husks, provides deep muscular stretching, and marks visual and olfactory territory via interdigital scent glands.',
    isActive: true,
  },
  {
    category: 'Pet Training & Psychology',
    difficulty: 'hard',
    question: 'In modern behavioral science, what is the role of a "clicker" or verbal marker in animal training?',
    options: [
      'A conditioned secondary reinforcer that bridges the exact millisecond of correct behavior to the delivery of the reward',
      'A mechanical sound that startles the pet out of performing bad actions',
      'A tool to call the animal from over 1 mile away',
      'A device that automatically releases treats when clicked'
    ],
    correctAnswer: 0,
    explanation: 'A marker bridges the time gap between the precise moment the desired behavior occurs and when the physical reward is delivered, accelerating cognitive learning.',
    isActive: true,
  },
  {
    category: 'Pet Training & Psychology',
    difficulty: 'medium',
    question: 'If a companion exhibits "resource guarding" (growling over a food bowl or high-value toy), what is the modern evidence-based protocol?',
    options: [
      'Counter-conditioning and "trading up" with an even higher-value treat to build positive association with human approach',
      'Forcefully snatching the item away to show dominance',
      'Physically reprimanding the pet so they never growl again',
      'Withholding food for three consecutive days'
    ],
    correctAnswer: 0,
    explanation: 'Forcible removal teaches the animal that humans are threats to their resources, exacerbating aggression. Trading up teaches them that approaches bring better rewards.',
    isActive: true,
  },
  {
    category: 'Pet Training & Psychology',
    difficulty: 'easy',
    question: 'What is the best way to handle a dog jumping up on guests when entering the home?',
    options: [
      'Turn away, withhold all attention/eye contact until all four paws are on the floor, then reward calm behavior',
      'Push the dog aggressively while shouting commands',
      'Knee the dog in the chest',
      'Pick up the dog and hold it in the air'
    ],
    correctAnswer: 0,
    explanation: 'Attention (even negative attention like pushing or scolding) reinforces jumping behavior. Removing all reinforcement until calm four-on-the-floor behavior occurs extinguishes the jump.',
    isActive: true,
  },

  // Category 5: General Pet Knowledge
  {
    category: 'General Pet Knowledge',
    difficulty: 'easy',
    question: 'How often do veterinary associations recommend comprehensive wellness examinations for senior pets (age 7+)?',
    options: ['Every 6 months (semi-annually)', 'Once every 5 years', 'Only when noticeable symptoms of disease appear', 'Never once fully vaccinated'],
    correctAnswer: 0,
    explanation: 'Senior pets age faster than humans; semi-annual (every 6 months) wellness checks allow early detection of kidney disease, arthritis, dental issues, and endocrine changes.',
    isActive: true,
  },
  {
    category: 'General Pet Knowledge',
    difficulty: 'medium',
    question: 'Scenario: You are adopting a rescue pet. What does the "3-3-3 Rule" refer to in rescue pet decompression?',
    options: [
      '3 days to decompress from shelter stress, 3 weeks to learn the household routine, and 3 months to feel fully settled and secure in the home',
      '3 meals a day for 3 weeks followed by 3 vet visits',
      '3 walks a day, 3 minutes per walk, for 3 months',
      '3 hours in crate, 3 hours outside, for 3 weeks'
    ],
    correctAnswer: 0,
    explanation: 'The 3-3-3 rule is a general guideline for the emotional adjustment milestones of an adopted pet: 3 days of overwhelm, 3 weeks of routine adoption, and 3 months of true trust.',
    isActive: true,
  },
  {
    category: 'General Pet Knowledge',
    difficulty: 'easy',
    question: 'What medical benefit does spaying a female companion animal prior to their first heat cycle provide?',
    options: [
      'Virtually eliminates the risk of life-threatening pyometra (uterine infection) and dramatically reduces mammary tumor risk',
      'Guarantees the pet will never gain weight',
      'Eliminates the need for core annual vaccinations',
      'Doubles the pet’s physical running speed'
    ],
    correctAnswer: 0,
    explanation: 'Early spaying reduces mammary cancer risk to under 0.5% and completely prevents pyometra, an acute and often fatal uterine infection in older unspayed females.',
    isActive: true,
  },
  {
    category: 'General Pet Knowledge',
    difficulty: 'medium',
    question: 'In a household flea infestation, approximately what percentage of the total flea population lives on the pet versus in the surrounding environment?',
    options: [
      'Only ~5% of fleas are adult on the pet; 95% exist in the carpet and bedding as eggs, larvae, and pupae',
      '100% of fleas live strictly on the pet at all times',
      '50% on the pet, 50% in the environment',
      'Fleas never lay eggs in home carpets'
    ],
    correctAnswer: 0,
    explanation: 'The flea "iceberg" means visible adult fleas on pets represent only 5% of the biomass. Complete eradication requires treating the environment for pupae and larvae.',
    isActive: true,
  },
  {
    category: 'General Pet Knowledge',
    difficulty: 'hard',
    question: 'What is the medical definition of a "Zoonotic" disease in companion animal care?',
    options: [
      'An infectious disease caused by bacteria, viruses, or parasites that can naturally transmit between animals and humans',
      'A disease that only affects zoo animals in captivity',
      'A genetic disorder inherited strictly from the mother’s lineage',
      'A nutritional deficiency from consuming low-grade kibble'
    ],
    correctAnswer: 0,
    explanation: 'Zoonotic diseases (such as Rabies, Leptospirosis, Ringworm, and Giardia) can jump between vertebrate animals and humans, highlighting the importance of preventative pet health.',
    isActive: true,
  },
  {
    category: 'General Pet Knowledge',
    difficulty: 'easy',
    question: 'Which of the following should always be included in a pet emergency disaster evacuation "Go-Bag"?',
    options: [
      '72-hour supply of food/water, medical/vaccination records, necessary medications, sturdy leash/carrier, and recent photo of pet',
      'Only pet toys and grooming brushes',
      'A bag of dry treats without any water',
      'Scented air fresheners and extra blankets only'
    ],
    correctAnswer: 0,
    explanation: 'Disaster preparedness requires portable food, clean water, medical histories (required for temporary shelters), identification, and necessary prescription meds.',
    isActive: true,
  }
];

// Seed helper if collection is empty or missing questions
const ensureDefaultQuestions = async () => {
  try {
    const count = await QuizQuestion.countDocuments();
    if (count < DEFAULT_QUIZ_QUESTIONS.length) {
      for (const q of DEFAULT_QUIZ_QUESTIONS) {
        const existing = await QuizQuestion.findOne({ question: q.question });
        if (!existing) {
          await QuizQuestion.create(q);
        }
      }
    }
  } catch (err) {
    console.warn('[Quiz System] Notice during question seed check:', err.message);
  }
};

// ==========================================
// QUIZ QUESTIONS (ADMIN MANAGED)
// ==========================================

// @desc    Create quiz question
// @route   POST /api/quiz/questions
// @access  Private (Admin only)
export const createQuestion = async (req, res, next) => {
  try {
    const { category, difficulty, question, options, correctAnswer, explanation, isActive } = req.body;

    if (!category || !question || !options || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Category, question, options (min 2), and correctAnswer index are required.',
      });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Options must be an array with at least 2 choices.',
      });
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
      return res.status(400).json({
        success: false,
        message: `correctAnswer index must be between 0 and ${options.length - 1}.`,
      });
    }

    const quizQuestion = await QuizQuestion.create({
      category: category.trim(),
      difficulty: difficulty || 'medium',
      question: question.trim(),
      options,
      correctAnswer,
      explanation: explanation || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: 'Quiz question created successfully.',
      question: quizQuestion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quiz questions
// @route   GET /api/quiz/questions
// @access  Public / Private
// NOTE: Correct answers are excluded unless the requester is an authenticated Admin!
export const getQuestions = async (req, res, next) => {
  try {
    await ensureDefaultQuestions();

    const { category, difficulty, limit } = req.query;
    const filter = {};

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      filter.isActive = true;
    }

    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }
    if (difficulty && difficulty.trim() !== '' && difficulty.toLowerCase() !== 'all') {
      filter.difficulty = difficulty.toLowerCase().trim();
    }

    let query = QuizQuestion.find(filter);

    // If not admin, omit the correctAnswer field
    if (!isAdmin) {
      query = query.select('-correctAnswer');
    }

    let questions = await query.sort({ createdAt: -1 });

    // Supplement if specific category/difficulty filter yields fewer questions than requested limit
    if (limit && Number(limit) > 0) {
      const targetLimit = Number(limit);
      if (questions.length < targetLimit && (filter.category || filter.difficulty)) {
        const excludeIds = questions.map((q) => q._id);
        const fallbackFilter = { _id: { $nin: excludeIds } };
        if (!isAdmin) fallbackFilter.isActive = true;
        let fallbackQuery = QuizQuestion.find(fallbackFilter);
        if (!isAdmin) fallbackQuery = fallbackQuery.select('-correctAnswer');
        const supplements = await fallbackQuery.limit(targetLimit - questions.length).sort({ createdAt: -1 });
        questions = [...questions, ...supplements];
      } else {
        questions = questions.slice(0, targetLimit);
      }
    }

    res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single quiz question by ID
// @route   GET /api/quiz/questions/:id
// @access  Public / Private
export const getQuestionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Question ID: ${id}`,
      });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    let query = QuizQuestion.findById(id);
    if (!isAdmin) {
      query = query.select('-correctAnswer');
    }

    const question = await query;
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Quiz question not found.',
      });
    }

    res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update quiz question
// @route   PUT /api/quiz/questions/:id
// @access  Private (Admin only)
export const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Question ID: ${id}`,
      });
    }

    const question = await QuizQuestion.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Quiz question not found.',
      });
    }

    const allowedFields = ['category', 'difficulty', 'question', 'options', 'correctAnswer', 'explanation', 'isActive'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        question[field] = req.body[field];
      }
    });

    const updated = await question.save();

    res.status(200).json({
      success: true,
      message: 'Quiz question updated successfully.',
      question: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete quiz question
// @route   DELETE /api/quiz/questions/:id
// @access  Private (Admin only)
export const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Question ID: ${id}`,
      });
    }

    const question = await QuizQuestion.findByIdAndDelete(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Quiz question not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quiz question deleted successfully.',
      questionId: id,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// QUIZ ATTEMPTS (AUTHENTICATED USERS)
// ==========================================

// @desc    Submit quiz attempt & compute score
// @route   POST /api/quiz/attempts
// @access  Private
export const submitAttempt = async (req, res, next) => {
  try {
    const { category, answers } = req.body;

    if (!category || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category and array of answers are required.',
      });
    }

    let score = 0;
    const evaluatedAnswers = [];
    const detailedReview = [];

    for (const ans of answers) {
      if (!ans.questionId || !isValidObjectId(ans.questionId)) continue;

      const qDoc = await QuizQuestion.findById(ans.questionId);
      if (!qDoc) continue;

      const isCorrect = qDoc.correctAnswer === ans.selectedOption;
      if (isCorrect) score += 1;

      evaluatedAnswers.push({
        questionId: qDoc._id,
        selectedOption: ans.selectedOption,
        isCorrect,
      });

      detailedReview.push({
        questionId: qDoc._id,
        question: qDoc.question,
        options: qDoc.options,
        selectedOption: ans.selectedOption,
        correctAnswer: qDoc.correctAnswer,
        isCorrect,
        explanation: qDoc.explanation || '',
        category: qDoc.category,
        difficulty: qDoc.difficulty,
      });
    }

    const totalQuestions = evaluatedAnswers.length || 1;
    const percentage = Math.round((score / totalQuestions) * 100);

    const attempt = await QuizAttempt.create({
      user: req.user._id,
      category,
      score,
      totalQuestions,
      percentage,
      answers: evaluatedAnswers,
    });

    res.status(201).json({
      success: true,
      message: 'Quiz attempt evaluated and saved successfully.',
      attempt: {
        _id: attempt._id,
        id: attempt._id,
        category: attempt.category,
        score,
        totalQuestions,
        percentage,
        answers: detailedReview,
        createdAt: attempt.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's quiz attempt history
// @route   GET /api/quiz/attempts
// @access  Private
export const getMyAttempts = async (req, res, next) => {
  try {
    const attempts = await QuizAttempt.find({ user: req.user._id })
      .select('-answers')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: attempts.length,
      attempts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get details of single quiz attempt
// @route   GET /api/quiz/attempts/:id
// @access  Private
export const getAttemptById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Attempt ID: ${id}`,
      });
    }

    const attempt = await QuizAttempt.findById(id).populate('answers.questionId', 'question options explanation correctAnswer category difficulty');
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found.',
      });
    }

    // Ownership check: only owner or admin can view
    const isOwner = attempt.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own quiz attempts.',
      });
    }

    res.status(200).json({
      success: true,
      attempt,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// COMPANION MATCH ATTEMPTS (PHASE 7 EXTENSION)
// ==========================================

// @desc    Create & persist Companion Match attempt
// @route   POST /api/quiz/companion/matches
// @access  Private
export const saveCompanionMatch = async (req, res, next) => {
  try {
    const { answers, primaryRecommendation, compatibilityScore, alternativeRankings, allMatches } = req.body;

    if (!primaryRecommendation || typeof primaryRecommendation.score !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Valid primary companion recommendation with compatibility score is required.',
      });
    }

    const match = await CompanionMatch.create({
      user: req.user._id,
      answers: answers || {},
      primaryRecommendation: {
        type: primaryRecommendation.type || 'companion',
        name: primaryRecommendation.name || 'Companion Unit',
        icon: primaryRecommendation.icon || '🐾',
        color: primaryRecommendation.color || 'blue',
        desc: primaryRecommendation.desc || '',
        score: Math.round(primaryRecommendation.score),
      },
      compatibilityScore: Math.round(compatibilityScore !== undefined ? compatibilityScore : primaryRecommendation.score),
      alternativeRankings: Array.isArray(alternativeRankings) ? alternativeRankings : [],
      allMatches: Array.isArray(allMatches) ? allMatches : [],
    });

    res.status(201).json({
      success: true,
      message: 'Companion match attempt saved successfully.',
      match,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's companion match history
// @route   GET /api/quiz/companion/matches
// @access  Private
export const getMyCompanionMatches = async (req, res, next) => {
  try {
    const matches = await CompanionMatch.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get details of a single companion match attempt
// @route   GET /api/quiz/companion/matches/:id
// @access  Private
export const getCompanionMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Companion Match ID: ${id}`,
      });
    }

    const match = await CompanionMatch.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Companion match attempt not found.',
      });
    }

    // Ownership check: strictly enforce user isolation
    const isOwner = match.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own companion match attempts.',
      });
    }

    res.status(200).json({
      success: true,
      match,
    });
  } catch (error) {
    next(error);
  }
};


// ============================================
// BAZGAR SANGAT AI - Complete Application
// Apple Disease Detection + RL Crop Assistant + Voice Feature
// URDU REMOVED - ONLY BALOCHI & ENGLISH
// ============================================

// ============================================
// ============================================
// CONFIGURATION
// Backend API Endpoint (FastAPI + TFLite backend)
// Replace HUGGINGFACE_API_URL with your actual Hugging Face Space URL:
// Example: 'https://username-bazgar-ai-backend.hf.space'
// ============================================
const HUGGINGFACE_API_URL = 'https://YOUR_HF_USERNAME-YOUR_SPACE_NAME.hf.space';

// Automatically uses local backend when developing on localhost, and Hugging Face in production
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : (localStorage.getItem('BAZGAR_API_URL') || HUGGINGFACE_API_URL);
let currentImage = null;
let currentStream = null;
let currentCamera = 'environment';
let currentLanguage = 'balochi';
let apiAvailable = false;

// Voice related variables
let currentAudio = null;
let isVoicePlaying = false;

// DOM Elements
let fileInput, fileUploadBtn, fileName, cameraBtn, cameraModal, video, canvas;
let captureBtn, retakeBtn, usePhotoBtn, switchCameraBtn, closeCameraBtn;
let previewArea, previewImg, clearBtn, predictBtn;
let loadingState, resultSection, resultContent, infoPlaceholder;
let voicePlayer, voiceAudio, stopVoiceBtn, voiceStatus;

// ============================================
// TRANSLATIONS (ONLY BALOCHI & ENGLISH)
// ============================================
const translations = {
    balochi: {
        appName: 'بازگار سنگت اے آئی', home: 'بنگیج', detect: 'نادراہی ءِ پجاری',
        translator: 'ترجمہ کار', assistant: 'کِشار ءِ کمک کار', chatbot: 'گپ جنوکیں اے آئی', datahub: 'مالومات ءِ مرکز',
        detectionTitle: 'سیب ءِ نادراہی پجار', chooseFile: 'فائل گچین کُت کن', noFileChosen: 'ہچ فائل گچین نہ انت',
        camera: 'کیمرا پچ کُت کن', capture: 'اکس گرگ', retake: 'پد ءَ گرگ', usePhoto: 'اے اکس کارمرز کُت کن',
        switchCamera: 'کیمرا مٹ کُت کن', close: 'بند کُت کن', clear: 'پاک کُت کن',
        predict: 'پجار / تپاس', analyzing: 'تپاس بوگ انت...', result: 'پجار ءِ نتیجہ',
        selectImageFirst: 'اول یک اکسے گچین کُت کن', error: 'یک چیزے غلط بوتگ',
        comingSoon: 'عنقریب', footer: 'بلوچ کشتکارانی واستہ جوڑ کرتگ',
        confidence: 'اعتبار', recommendation: 'توصیہ', apiError: 'API connection failed. Make sure backend is running on port 8000',
        // Homepage translations
        heroTitle1: 'بازگر سنگت AI', heroTagline1: 'جدیدیں کِشاریت، بلوچی دود ءُ ربیدگ',
        heroBtn1Text: 'پجاری ءَ بنگیج کن', heroTitle2: 'دستکاری ءُ ٹیکنالوجی',
        heroTagline2: 'پنج ہزار سالہ بلوچی دود، جدید اے آئی گوں یکجاہ',
        heroBtn2Text: 'گیشتر زان', heroTitle3: 'سوب ءِ باغ بچگ',
        heroTagline3: 'اے آئی گوں نادراہی ءَ پجار، فوری علاج بلوچی ءَ',
        heroBtn3Text: 'نادراہی ءِ پجاری',
        featuresTitle: 'خاصیں کار', featuresSub: 'بلوچ بازگارانی واستہ خصوصی اے آئی خدمات',
        feature1Title: 'اے آئی ءَ نادراہی ءِ پجاری', feature1Desc: 'سوب ءِ نادراہی ءَ اے آئی ءَ پہ زوت پجار',
        feature2Title: 'آر ایل کِشار ءِ کمک کار', feature2Desc: 'اے آئی ءِ نیمگ ءَ کشاورزی ءِ سوج',
        feature3Title: 'بلوچی زبان ءِ کمک', feature3Desc: 'لوکلیں بازگارانی ہاترا پوره بلوچی ایپ',
        culturalTitle: 'بلوچ بازگار ءُ اے آئی',
        culturalDesc: 'بلوچی دود ۵۰۰۰ سال پرانی انت۔ مرچی، مئے بازگار وتی سوب ءِ باغانی بچّگ ءَ اے آئی کارمرز کنگ انت ءُ وتی دوداں برجاہ دارگ انت۔ دستکاری ءُ ٹیکنالوجی یکجاہ بنت۔',
        culturalBtnText: 'گیشتر زان',
        stat1Label: 'کمک بیتگیں بازگار', stat2Label: 'پجاری بیتگیں نادراہی',
        stat3Label: 'راستیں دروشم ءِ کساس', stat4Label: 'کارمرز کنوکیں مردم',
        howItWorksTitle: 'اے ایپ چتور کار کنت',
        step1Title: 'سوب ءِ پُتک ءِ اکس دیم دئے', step1Desc: 'کیمرا یا فائل گوں تصویر اپ لوڈ کن',
        step2Title: 'اے آئی نادراہی ءَ پجارگ انت', step2Desc: 'چند سیکنڈ ءَ سیب ءِ بیماری ءِ شناخت',
        step3Title: 'بلوچی ءَ درمان زان', step3Desc: 'مکمل علاج ءُ تجویز بلوچی زبان ءَ',
        testimonialsTitle: 'شما گوشت (مردمانی گپ)',
        testimonial1Text: 'اے اے آئی ایپ ءَ منی سوب ءِ باغ بچّینت! گندوکیں نادراہی ءَ زوت پجاری بوت۔ بلوچی ءَ درمان پدا ءَ ملوت۔ ماشاءاللہ!',
        testimonial1Name: '- عبدالرحیم، تربت',
        testimonial2Text: 'من بلوچی کشتکار آں۔ اے ایپ منی ہاترا وتی باغ ءِ سارانگی ءَ بہترین کمک ات۔ سب سے بہترین چیز بلوچی زبان انت۔',
        testimonial2Name: '- فاطمہ، مستونگ',
        testimonial3Text: 'آر ایل کمک کار ءَ منی کشار ءِ گندم ءِ پتک زردی ءِ مسئلہ حل بوت۔ بہت شکریہ بازگار سنگت اے آئی',
        testimonial3Name: '- محمد عمر، قلعہ عبداللہ',
        newsletterTitle: 'ڈیجیٹل کِشاری ٹولی ءِ باسک بہ بئے',
        newsletterPlaceholder: 'وتی ای میل ایڈریس نبشتہ کن',
        newsletterBtnText: 'مرچی سبسکرائب کن',
        footerBrand: 'بازگار سنگت اے آئی', footerCopyText: 'تیکنیکی کشاورزی'
    },
    english: {
        appName: 'Bazgar Sangat AI', home: 'Home', detect: 'Detection',
        translator: 'Translator', assistant: 'Crop Assistant', chatbot: 'Chatbot', datahub: 'Data Hub',
        detectionTitle: 'Apple Disease Detection', chooseFile: 'Choose File', noFileChosen: 'No file chosen',
        camera: 'Open Camera', capture: 'Capture Photo', retake: 'Retake', usePhoto: 'Use This Photo',
        switchCamera: 'Switch Camera', close: 'Close', clear: 'Clear',
        predict: 'Predict / Analyze', analyzing: 'Analyzing...', result: 'Prediction Result',
        selectImageFirst: 'Please select an image first', error: 'Something went wrong',
        comingSoon: 'Coming Soon', footer: 'Developed for Balochi Farmers',
        confidence: 'Confidence', recommendation: 'Recommendation', apiError: 'API connection failed. Make sure backend is running on port 8000',
        // Homepage translations
        heroTitle1: 'Bazgar Sangat AI', heroTagline1: 'Modern Agriculture, Balochi Traditions',
        heroBtn1Text: 'Start Detection', heroTitle2: 'Handicrafts & Technology',
        heroTagline2: '5000 years old Balochi culture, merged with modern AI',
        heroBtn2Text: 'Learn More', heroTitle3: 'Apple Orchard Protection',
        heroTagline3: 'AI disease detection, instant treatment in Balochi',
        heroBtn3Text: 'Disease Detection',
        featuresTitle: 'Key Features', featuresSub: 'Exclusive AI services for Balochi farmers',
        feature1Title: 'AI Disease Detection', feature1Desc: 'Identify apple diseases in seconds with AI',
        feature2Title: 'RL Crop Assistant', feature2Desc: 'Smart farming recommendations via AI agent',
        feature3Title: 'Balochi Language Support', feature3Desc: 'Full Balochi UI for local farmers',
        culturalTitle: 'Balochi Farmers & AI',
        culturalDesc: 'Balochi culture is 5000 years old. Today, our farmers use AI to protect their apple orchards while keeping traditions alive. Handicrafts meet technology.',
        culturalBtnText: 'Learn More',
        stat1Label: 'Farmers Helped', stat2Label: 'Diseases Detected',
        stat3Label: 'Accuracy Rate', stat4Label: 'Active Users',
        howItWorksTitle: 'How It Works',
        step1Title: 'Upload Apple Leaf', step1Desc: 'Upload image via camera or file',
        step2Title: 'AI Analyzes Disease', step2Desc: 'Identify apple disease in seconds',
        step3Title: 'Get Treatment in Balochi', step3Desc: 'Complete treatment in Balochi language',
        testimonialsTitle: 'Shoma Goft (They Said)',
        testimonial1Text: 'This AI app saved my apple orchard! I detected scab disease early and got treatment in Balochi. Mashallah!',
        testimonial1Name: '- Abdul Rahim, Turbat',
        testimonial2Text: 'I am a Balochi farmer. This app helps me manage my orchard perfectly. Best thing is Balochi language.',
        testimonial2Name: '- Fatima, Mastung',
        testimonial3Text: 'The RL assistant solved my wheat yellow leaves problem. Thank you Bazgar Sangat AI!',
        testimonial3Name: '- Muhammad Umar, Qilla Abdullah',
        newsletterTitle: 'Join Digital Farming Community',
        newsletterPlaceholder: 'Enter your email address',
        newsletterBtnText: 'Subscribe Now',
        footerBrand: 'Bazgar Sangat AI', footerCopyText: 'Precision Agriculture'
    }
};

// ============================================
// DISEASE DATA (ONLY BALOCHI & ENGLISH - NO URDU)
// ============================================
const diseases = {
    balochi: {
        0: { name: 'داغداریں سیب', symptoms: ['پُتک ءُ سوب ءِ سرا سیاہیں داغ', 'سوب ءِ معیار کم بوگ', 'پیش از وہد پُتکانی کپگ'], 
            treatment: ['مس والا فنگس کشیں دوا کارمرز بہ کن', 'نادراہیں سوب ءُ پُتکاں چہ دار ءَ دوری بہ کن ءُ تباہ بہ کن', 'دارانی میان ءَ ہوا ءِ گوں آمد ءُ شُد ءَ بہتر بہ کن', 'اگاں بوان انت، گڑا نادراہی ءَ نہ گرۆکیں نژاد کارمرز بہ کن'] },
        1: { name: 'عامیں سیب', symptoms: ['ہچ وڑیں نادراہی نیست', 'سوب ساڑی ءُ وش انت'], 
            treatment: ['باغ ءِ باقاعدگیں نگہداری ءَ برجاہ دار', 'نادراہی ءِ بنگیجیں نشانیاں گوں توار بہ کن', 'درستیں آبپاشی ءُ کھاد دئیگ ءَ برجاہ دار', 'وہد ءِ سرا سوبانی چنّگ بہ کن'] },
        2: { name: 'گندوکیں سیب', symptoms: ['سوب ءِ نرم بوگ', 'سوب ءِ رنگ ءِ سُہر یا بورا بوگ', 'سوب ءِ گندگ ءُ بو آئی'], 
            treatment: ['نادراہیں سوباں زوت چہ دار ءَ دوری بہ کن ءُ تباہ بہ کن', 'آپ ءِ نکاسی بہتر بہ کن', 'دارانی میان ءَ ہوا ءِ گوں آمد ءُ شُد ءَ گیش بہ کن', 'مناسبیں فنگس کشیں دوا کارمرز بہ کن', 'دار ءِ کُنٹ ءِ سرا آپ دئیگ ءَ پرہیز بہ کن'] },
        3: { name: 'کِپوکیں سیب', symptoms: ['پُتک ءُ سوب ءِ سرا زیتونی تا سیاہیں داغ', 'داغ زبر بوت کن انت', 'سوب ءِ معیار کم بوگ'], 
            treatment: ['بہار ءِ بنگیج ءَ فنگس کشیں دوا کارمرز بہ کن', 'دارانی چیر ءَ کپتگیں پُتکاں ٹوگ بہ کن ءُ دوری بہ کن', 'نادراہی ءَ نہ گرۆکیں سوب ءِ نژاد کارمرز بہ کن', 'ہوا ءِ بہتر آمدنی ءِ ہاترا دارانی ٹہال بہ کن', 'بازیں نم ءَ چہ بچ'] }
    },
    english: {
        0: { name: 'Blotch Apple', symptoms: ['Dark spots on leaves and fruit', 'Reduced fruit quality', 'Premature leaf drop'], 
            treatment: ['Apply copper-based fungicide', 'Remove and destroy infected fruits/leaves', 'Improve air circulation in orchard', 'Use resistant varieties if available'] },
        1: { name: 'Normal Apple', symptoms: ['No visible disease symptoms', 'Healthy fruit appearance'], 
            treatment: ['Regular orchard maintenance', 'Monitor for early disease signs', 'Proper irrigation and fertilization', 'Harvest at right time'] },
        2: { name: 'Rot Apple', symptoms: ['Softening of fruit', 'Brown or discolored fruit', 'Foul smell from fruit'], 
            treatment: ['Remove infected fruits immediately', 'Improve water drainage', 'Increase air circulation', 'Apply appropriate fungicide', 'Avoid overhead watering'] },
        3: { name: 'Scab Apple', symptoms: ['Olive-green to black spots on leaves/fruit', 'Raised lesions', 'Reduced fruit quality'], 
            treatment: ['Apply fungicide at bud break', 'Remove fallen leaves', 'Use resistant varieties', 'Prune for better air flow', 'Avoid excessive moisture'] }
    }
};

// ============================================
// VOICE FUNCTIONS
// ============================================
function stopVoice() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    isVoicePlaying = false;
    if (voicePlayer) {
        voicePlayer.style.display = 'none';
    }
    if (voiceStatus) {
        voiceStatus.innerText = 'Stopped';
    }
}

function playVoice(diseaseIndex) {
    if (currentLanguage !== 'balochi') {
        return;
    }
    stopVoice();
    const audioFile = `assets/d${diseaseIndex}.wav`;
    if (!voicePlayer || !voiceAudio) {
        return;
    }
    currentAudio = voiceAudio;
    currentAudio.src = audioFile;
    currentAudio.load();
    voicePlayer.style.display = 'flex';
    if (voiceStatus) {
        voiceStatus.innerText = 'Playing...';
    }
    currentAudio.play().catch(error => {
        console.error('Error playing voice:', error);
        if (voiceStatus) {
            voiceStatus.innerText = 'Error playing';
        }
        setTimeout(() => {
            if (voicePlayer) voicePlayer.style.display = 'none';
        }, 2000);
    });
    currentAudio.onended = () => {
        if (voicePlayer) {
            voicePlayer.style.display = 'none';
        }
        isVoicePlaying = false;
        currentAudio = null;
    };
    currentAudio.onerror = () => {
        console.error('Audio file not found:', audioFile);
        if (voiceStatus) {
            voiceStatus.innerText = 'Audio file missing';
        }
        setTimeout(() => {
            if (voicePlayer) voicePlayer.style.display = 'none';
        }, 2000);
    };
    isVoicePlaying = true;
}

// ============================================
// RL AGENT - KNOWLEDGE BASE (NO URDU - ONLY BALOCHI & ENGLISH)
// ============================================
const problemSolutions = {
    "yellow_leaves_wheat": {
        arms: [
            { id: 0, text_en: "Nitrogen deficiency. Apply 2kg Urea per acre.", text_bal: "نائیٹروجنءِ کمی انت۔ 2 کلو یوریا فی ایکڑ بدے۔" },
            { id: 1, text_en: "Water stress. Irrigate immediately.", text_bal: "آپءِ کمی انت۔ فوری آپ دے۔" },
            { id: 2, text_en: "Zinc deficiency. Apply zinc sulfate.", text_bal: "زنکءِ کمی انت۔ زنک سلفیٹ بدے۔" }
        ]
    },
    "yellow_leaves_tomato": {
        arms: [
            { id: 0, text_en: "Heat stress. Provide shade and water.", text_bal: "گَرمیءِ دباؤ۔ سایہ ءُ آپ دے۔" },
            { id: 1, text_en: "Nitrogen deficiency. Apply balanced fertilizer.", text_bal: "نائیٹروجنءِ کمی۔ متوازن کود بدے۔" },
            { id: 2, text_en: "Early blight. Apply fungicide.", text_bal: "اولی بلیگ۔ فنگسائڈ کارمرز کن۔" }
        ]
    },
    "pest_insect_general": {
        arms: [
            { id: 0, text_en: "Spray recommended pesticide on crop.", text_bal: "فصلءِ سرا دارو پاش دے۔" },
            { id: 1, text_en: "Use neem oil spray (organic).", text_bal: "نیمءِ تیلءِ اسپرے کن (طبعی)" },
            { id: 2, text_en: "Release beneficial insects like ladybugs.", text_bal: "فائدگیں حشره چار کن" }
        ]
    },
    "pest_insect_cotton": {
        arms: [
            { id: 0, text_en: "Spray oil and soap solution for whitefly.", text_bal: "سپیت بگک واسطہ تیل و سابون" },
            { id: 1, text_en: "Use chemical pesticide as last resort.", text_bal: "آخری داو کیمیائی دارو" }
        ]
    },
    "water_issue_drought": {
        arms: [
            { id: 0, text_en: "Apply mulch to retain soil moisture.", text_bal: "ملچ ایر کن" },
            { id: 1, text_en: "Use drip irrigation to save water.", text_bal: "چکو آپ کارمرز" },
            { id: 2, text_en: "Water early morning or evening.", text_bal: "سہب یا بیگاه آپ" }
        ]
    },
    "water_issue_flood": {
        arms: [
            { id: 0, text_en: "Make drainage system in field.", text_bal: "کشتءَ آپءِ در کنگءِ بندوبست" },
            { id: 1, text_en: "Plant on raised beds.", text_bal: "برز بستری ءَ کشّنت" }
        ]
    },
    "fertilizer_rice": {
        arms: [
            { id: 0, text_en: "Urea 1.5 bags per acre for rice.", text_bal: "برنج یوریا ڈیڑھ بوری" },
            { id: 1, text_en: "Use DAP for root development.", text_bal: "ریشگانی واسطہ ڈی اے پی" }
        ]
    },
    "sowing_time_wheat": {
        arms: [{ id: 0, text_en: "Sow wheat in October for best yield.", text_bal: "گندم اکتوبر کشّنت" }]
    },
    "sowing_time_corn": {
        arms: [{ id: 0, text_en: "Sow corn in March.", text_bal: "مکی مارچ کشّنت" }]
    },
    "sowing_time_rice": {
        arms: [{ id: 0, text_en: "Plant rice in June.", text_bal: "برنج جون کشّنت" }]
    },
    "storage_wheat": {
        arms: [
            { id: 0, text_en: "Keep wheat in dry, clean bags.", text_bal: "ہشک بوجیاں ایر کن" },
            { id: 1, text_en: "Add neem leaves to protect from insects.", text_bal: "نیم تاک ایر کن" }
        ]
    },
    "fungus_rot_general": {
        arms: [
            { id: 0, text_en: "Reduce watering and apply fungicide.", text_bal: "آپ کم کن ءُ فنگسائڈ کارمرز" },
            { id: 1, text_en: "Remove infected plants immediately.", text_bal: "نادراہیں درچکاں فوری در کن" },
            { id: 2, text_en: "Improve air circulation between plants.", text_bal: "درچکانی نیامءَ هوا ءِ چرک بتر کن" }
        ]
    }
};

// ============================================
// RL MEMORY MANAGEMENT
// ============================================
let memory = {};
let epsilon = 0.20;
const UCB_C = 1.414;

function initMemoryForProblem(problemKey) {
    if (!problemSolutions[problemKey]) return null;
    const numArms = problemSolutions[problemKey].arms.length;
    return {
        arm_rewards: new Array(numArms).fill(0.0),
        arm_attempts: new Array(numArms).fill(0),
        total_attempts: 0,
        arm_total_rewards: new Array(numArms).fill(0.0)
    };
}

function loadMemory() {
    const saved = localStorage.getItem("kisaan_rl_memory");
    if (saved) {
        try {
            memory = JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse memory", e);
            memory = {};
        }
    }
    
    for (let pKey in problemSolutions) {
        if (!memory[pKey]) {
            memory[pKey] = initMemoryForProblem(pKey);
        } else {
            const neededArms = problemSolutions[pKey].arms.length;
            if (memory[pKey].arm_rewards.length !== neededArms) {
                memory[pKey] = initMemoryForProblem(pKey);
            }
        }
    }
    saveMemoryToLocal();
}

function saveMemoryToLocal() {
    localStorage.setItem("kisaan_rl_memory", JSON.stringify(memory));
}

function selectArmUCB(problemKey) {
    if (!problemSolutions[problemKey]) {
        return { armIdx: 0, method: "fallback" };
    }
    
    let mem = memory[problemKey];
    if (!mem) {
        mem = initMemoryForProblem(problemKey);
        memory[problemKey] = mem;
    }
    
    const numArms = problemSolutions[problemKey].arms.length;
    
    if (Math.random() < epsilon) {
        const randIdx = Math.floor(Math.random() * numArms);
        return { armIdx: randIdx, method: "exploration" };
    }
    
    let bestIdx = 0;
    let bestUCB = -Infinity;
    const totalT = mem.total_attempts || 1;
    
    for (let i = 0; i < numArms; i++) {
        const attempts = mem.arm_attempts[i];
        let ucbVal;
        
        if (attempts === 0) {
            ucbVal = Infinity;
        } else {
            const avgReward = mem.arm_rewards[i];
            const explorationBonus = UCB_C * Math.sqrt((2 * Math.log(totalT + 1)) / attempts);
            ucbVal = avgReward + explorationBonus;
        }
        
        if (ucbVal > bestUCB) {
            bestUCB = ucbVal;
            bestIdx = i;
        }
    }
    
    return { armIdx: bestIdx, method: "exploitation" };
}

function updateReward(problemKey, armIdx, rewardValue) {
    if (!memory[problemKey]) {
        memory[problemKey] = initMemoryForProblem(problemKey);
    }
    
    const mem = memory[problemKey];
    if (armIdx >= mem.arm_attempts.length) return;
    
    const currentAttempts = mem.arm_attempts[armIdx];
    const currentAvg = mem.arm_rewards[armIdx];
    
    let newAvg;
    if (currentAttempts === 0) {
        newAvg = rewardValue;
    } else {
        newAvg = currentAvg + (rewardValue - currentAvg) / (currentAttempts + 1);
    }
    
    if (!mem.arm_total_rewards) {
        mem.arm_total_rewards = new Array(mem.arm_attempts.length).fill(0);
    }
    
    mem.arm_total_rewards[armIdx] += rewardValue;
    mem.arm_rewards[armIdx] = newAvg;
    mem.arm_attempts[armIdx] += 1;
    mem.total_attempts += 1;
    
    if (mem.total_attempts > 100 && epsilon > 0.05) {
        epsilon = Math.max(0.05, epsilon * 0.999);
        const epsilonEl = document.getElementById("epsilonValue");
        if (epsilonEl) epsilonEl.innerText = epsilon.toFixed(3);
    }
    
    saveMemoryToLocal();
    renderAssistantStats();
}

// ============================================
// RL HELPER FUNCTIONS (NO URDU DETECTION)
// ============================================
function detectLanguage(text) {
    // Only detect Balochi (Arabic script) or English
    if (/[\u0600-\u06FF]/.test(text)) {
        return "bal";
    }
    return "en";
}

function detectProblemAndCrop(text) {
    const lower = text.toLowerCase();
    
    let crop = null;
    const cropMap = {
        wheat: ["wheat", "gandum", "گندم", "kanak"],
        corn: ["corn", "maize", "makai", "مکی", "مکئی"],
        rice: ["rice", "chawal", "برنج", "چاول", "dhan"],
        cotton: ["cotton", "kapas", "کپاس", "پنبہ"],
        tomato: ["tomato", "tamatar", "ٹماٹر", "بانسک"],
        potato: ["potato", "alu", "آلو", "کچالو"]
    };
    
    for (let [c, keywords] of Object.entries(cropMap)) {
        if (keywords.some(kw => lower.includes(kw))) {
            crop = c;
            break;
        }
    }
    
    let problem = "general";
    const problemMap = {
        yellow_leaves: ["yellow", "peeli", "زرد", "پیلی", "تاک زرد", "pili", "patiyaan"],
        pest_insect: ["pest", "insect", "keera", "locust", "کیڑا", "حشره", "worm", "kida"],
        water_issue: ["water", "paani", "drought", "flood", "پانی", "آپ", "سیلاب", "dry"],
        fertilizer: ["fertilizer", "khaad", "urea", "کھاد", "یوریا", "dap", "npk"],
        sowing_time: ["sow", "plant", "kab", "کشت", "بونا", "کدی", "time", "month"],
        storage: ["store", "storage", "ذخیرہ", "محفوظ", "bag", "bori"],
        fungus_rot: ["rot", "fungus", "gul", "sad", "گل", "سڑ", "mold"]
    };
    
    for (let [p, keywords] of Object.entries(problemMap)) {
        if (keywords.some(kw => lower.includes(kw))) {
            problem = p;
            break;
        }
    }
    
    return { problem, crop };
}

function getProblemKey(problem, crop) {
    if (crop) {
        const specific = `${problem}_${crop}`;
        if (problemSolutions[specific]) return specific;
    }
    const generic = `${problem}_general`;
    if (problemSolutions[generic]) return generic;
    return "pest_insect_general";
}

function getSolutionText(problemKey, armIdx, lang) {
    if (!problemSolutions[problemKey]) return "I don't have a solution for this yet. Please ask another question.";
    const arm = problemSolutions[problemKey].arms[armIdx];
    if (!arm) return "Solution not found. Please try again.";
    
    // Only Balochi and English - NO URDU
    if (lang === "bal") return arm.text_bal || arm.text_en;
    return arm.text_en;
}

function getConfidence(problemKey, armIdx) {
    const mem = memory[problemKey];
    if (!mem) return 0.3;
    const attempts = mem.arm_attempts[armIdx] || 0;
    
    if (attempts === 0) return 0.3;
    if (attempts < 5) return 0.5 + (attempts * 0.04);
    return Math.min(0.95, 0.7 + (attempts / 100));
}

// ============================================
// ASSISTANT UI RENDERING
// ============================================
let assistantMessages = [];
let assistantFeedbackGiven = new Map();
let assistantMsgCounter = 0;

function addAssistantMessage(role, contentObj, msgId) {
    const container = document.getElementById("assistantMessagesContainer");
    if (!container) return;
    
    const msgDiv = document.createElement("div");
    msgDiv.className = `message-premium ${role === 'user' ? 'user-premium' : 'assistant-premium'}`;
    msgDiv.setAttribute("data-msg-id", msgId);
    
    if (role === 'assistant') {
        const bubbleDiv = document.createElement("div");
        bubbleDiv.className = "msg-bubble-premium assistant-premium-bubble";
        bubbleDiv.innerHTML = contentObj.answer;
        msgDiv.appendChild(bubbleDiv);
        
        const reasoningDiv = document.createElement("div");
        reasoningDiv.className = "reasoning-box-premium";
        reasoningDiv.innerHTML = `
            <i class="fas fa-brain"></i> <strong>RL Reasoning</strong><br>
            <i class="fas fa-chart-line"></i> Method: ${contentObj.method}<br>
            <i class="fas fa-percentage"></i> Confidence: ${(contentObj.confidence * 100).toFixed(0)}%<br>
            <i class="fas fa-bullseye"></i> Problem: ${contentObj.problemKey}<br>
            <i class="fas fa-microchip"></i> Arm selected: ${contentObj.armIdx}
        `;
        msgDiv.appendChild(reasoningDiv);
        
        const feedbackRow = document.createElement("div");
        feedbackRow.className = "feedback-row-premium";
        
        if (!assistantFeedbackGiven.get(msgId)) {
            const upBtn = document.createElement("button");
            upBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> Helpful (+1)';
            upBtn.className = "feedback-btn-premium";
            upBtn.onclick = () => {
                updateReward(contentObj.problemKey, contentObj.armIdx, 1.0);
                assistantFeedbackGiven.set(msgId, true);
                upBtn.disabled = true;
                downBtn.disabled = true;
                const statusSpan = document.createElement("span");
                statusSpan.innerHTML = '<i class="fas fa-check-circle"></i> Thank you! Agent learned.';
                statusSpan.className = "feedback-given";
                feedbackRow.appendChild(statusSpan);
                renderAssistantStats();
            };
            
            const downBtn = document.createElement("button");
            downBtn.innerHTML = '<i class="fas fa-thumbs-down"></i> Not Helpful (0)';
            downBtn.className = "feedback-btn-premium";
            downBtn.onclick = () => {
                updateReward(contentObj.problemKey, contentObj.armIdx, 0.0);
                assistantFeedbackGiven.set(msgId, true);
                upBtn.disabled = true;
                downBtn.disabled = true;
                const statusSpan = document.createElement("span");
                statusSpan.innerHTML = '<i class="fas fa-check-circle"></i> Feedback recorded';
                statusSpan.className = "feedback-given";
                feedbackRow.appendChild(statusSpan);
                renderAssistantStats();
            };
            
            feedbackRow.appendChild(upBtn);
            feedbackRow.appendChild(downBtn);
        } else {
            const givenSpan = document.createElement("span");
            givenSpan.innerHTML = '<i class="fas fa-check-circle"></i> Feedback already given';
            givenSpan.className = "feedback-given";
            feedbackRow.appendChild(givenSpan);
        }
        
        msgDiv.appendChild(feedbackRow);
    } else {
        const bubble = document.createElement("div");
        bubble.className = "msg-bubble-premium user-premium-bubble";
        bubble.innerHTML = '<i class="fas fa-user"></i> ' + contentObj;
        msgDiv.appendChild(bubble);
    }
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function renderAssistantStats() {
    const statsDiv = document.getElementById("problemStatsList");
    if (!statsDiv) return;
    
    statsDiv.innerHTML = "";
    let hasData = false;
    
    for (let pKey in problemSolutions) {
        const mem = memory[pKey];
        if (!mem || mem.total_attempts === 0) continue;
        
        hasData = true;
        const block = document.createElement("div");
        block.className = "stat-block-premium";
        
        const problemName = pKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        block.innerHTML = `<strong><i class="fas fa-seedling"></i> ${problemName}</strong><br><i class="fas fa-chart-simple"></i> Total attempts: ${mem.total_attempts}`;
        
        const armsDiv = document.createElement("div");
        armsDiv.className = "arm-stats-premium";
        
        for (let i = 0; i < mem.arm_attempts.length; i++) {
            const att = mem.arm_attempts[i];
            const avg = mem.arm_rewards[i].toFixed(3);
            const fillPercent = Math.min(100, parseFloat(avg) * 100);
            
            armsDiv.innerHTML += `
                <div class="arm-item-premium">
                    <div class="arm-header-premium">
                        <span><i class="fas fa-microchip"></i> Arm ${i}</span>
                        <span>${att} tries | Score: ${avg}</span>
                    </div>
                    <div class="progress-bar-bg-premium">
                        <div class="progress-fill-premium" style="width: ${fillPercent}%;"></div>
                    </div>
                </div>
            `;
        }
        
        block.appendChild(armsDiv);
        statsDiv.appendChild(block);
    }
    
    if (!hasData) {
        statsDiv.innerHTML = '<div class="empty-stats-premium"><i class="fas fa-robot"></i><p>Send a message to see learning progress...</p></div>';
    }
    
    const epsilonEl = document.getElementById("epsilonValue");
    if (epsilonEl) epsilonEl.innerText = epsilon.toFixed(3);
}

async function processAssistantInput(rawText) {
    if (!rawText || !rawText.trim()) return;
    
    const userMsg = rawText.trim();
    addAssistantMessage("user", userMsg, Date.now() + "_user");
    
    const lang = detectLanguage(userMsg);
    const { problem, crop } = detectProblemAndCrop(userMsg);
    let problemKey = getProblemKey(problem, crop);
    
    if (!problemSolutions[problemKey]) {
        problemKey = "pest_insect_general";
    }
    
    const { armIdx, method } = selectArmUCB(problemKey);
    const answerText = getSolutionText(problemKey, armIdx, lang);
    const confidence = getConfidence(problemKey, armIdx);
    
    const msgId = Date.now() + "_assistant";
    const assistantPayload = {
        answer: answerText,
        problemKey: problemKey,
        armIdx: armIdx,
        method: method,
        confidence: confidence
    };
    
    addAssistantMessage("assistant", assistantPayload, msgId);
    assistantFeedbackGiven.set(msgId, false);
    renderAssistantStats();
}

function resetAssistantMemory() {
    if (confirm("Are you sure? This will erase ALL learning data.")) {
        memory = {};
        for (let pKey in problemSolutions) {
            memory[pKey] = initMemoryForProblem(pKey);
        }
        epsilon = 0.20;
        saveMemoryToLocal();
        
        const container = document.getElementById("assistantMessagesContainer");
        if (container) {
            container.innerHTML = `
                <div class="message-premium assistant-premium">
                    <div class="msg-bubble-premium assistant-premium-bubble">
                        <i class="fas fa-sync-alt"></i> Memory has been reset! I'm learning from scratch again.<br><br>
                        Ask me your farming questions and give feedback to teach me.
                    </div>
                </div>
            `;
        }
        
        assistantFeedbackGiven.clear();
        renderAssistantStats();
        
        const epsilonEl = document.getElementById("epsilonValue");
        if (epsilonEl) epsilonEl.innerText = epsilon.toFixed(3);
        
        alert("Agent memory reset successfully!");
    }
}

function manualSaveMemory() {
    saveMemoryToLocal();
    alert("Memory saved to localStorage!");
}

// ============================================
// APPLE DISEASE DETECTION FUNCTIONS
// ============================================
async function checkAPI() {
    const statusDiv = document.getElementById('apiStatus');
    if (!statusDiv) return;
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        if (data.status === 'ready' && data.model_loaded) {
            apiAvailable = true;
            statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> ' + (currentLanguage === 'balochi' ? 'ماڈل تیار انت - اپ لوڈ کُت کن' : 'Model ready - Upload an image');
            statusDiv.className = 'api-status status-success';
            return true;
        } else {
            throw new Error('Model not loaded');
        }
    } catch (error) {
        apiAvailable = false;
        statusDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + translations[currentLanguage].apiError;
        statusDiv.className = 'api-status status-error';
        return false;
    }
}

async function predictWithAPI(imageElement) {
    try {
        const blob = await fetch(imageElement.src).then(res => res.blob());
        const formData = new FormData();
        formData.append('file', blob, 'image.jpg');
        
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            return {
                class: data.prediction.class_index,
                confidence: data.prediction.confidence
            };
        } else {
            throw new Error('Prediction failed');
        }
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

function getConfidenceMessage(confidence, lang) {
    if (lang === 'balochi') {
        if (confidence >= 70) return 'اعتبار: باز - تشخیص متمان انت';
        if (confidence >= 50) return 'اعتبار: میانگیں - کجام ماہرے ءَ گوں مشورہ بہ کن';
        return 'اعتبار: کم - مہربانی بہ کن صافیں اکسے اپ لوڈ بہ کن';
    } else {
        if (confidence >= 70) return 'Confidence: High - Diagnosis is reliable';
        if (confidence >= 50) return 'Confidence: Medium - Consult an expert';
        return 'Confidence: Low - Please upload a clearer image';
    }
}

function displayResult(prediction) {
    if (!prediction || !apiAvailable) {
        if (resultContent) resultContent.innerHTML = `<p style="color:red"><i class="fas fa-exclamation-circle"></i> ${translations[currentLanguage].error}</p>`;
        if (resultSection) resultSection.style.display = 'block';
        return;
    }
    
    const disease = diseases[currentLanguage][prediction.class];
    const confidenceMsg = getConfidenceMessage(prediction.confidence, currentLanguage);
    
    let html = `
        <div class="disease-name"><i class="fas fa-apple-alt"></i> ${disease.name}</div>
        <div class="confidence-box">
            <strong><i class="fas fa-chart-line"></i> ${translations[currentLanguage].confidence}:</strong> ${prediction.confidence}%<br>
            <em><i class="fas fa-info-circle"></i> ${confidenceMsg}</em>
        </div>
        <div class="symptoms-box">
            <h3><i class="fas fa-notes-medical"></i> ${currentLanguage === 'balochi' ? 'علامات' : 'Symptoms'}</h3>
            <ul>${disease.symptoms.map(s => `<li><i class="fas fa-circle"></i> ${s}</li>`).join('')}</ul>
        </div>
        <div class="treatment-box">
            <h3><i class="fas fa-leaf"></i> ${currentLanguage === 'balochi' ? 'علاج' : 'Treatment'}</h3>
            <ol>${disease.treatment.map(t => `<li><i class="fas fa-check"></i> ${t}</li>`).join('')}</ol>
        </div>
    `;
    
    if (resultContent) resultContent.innerHTML = html;
    if (resultSection) resultSection.style.display = 'block';
    
    if (currentLanguage === 'balochi') {
        playVoice(prediction.class);
    }
}

async function handlePrediction() {
    if (!currentImage || !currentImage.src) {
        alert(translations[currentLanguage].selectImageFirst);
        return;
    }
    
    if (!apiAvailable) {
        alert(translations[currentLanguage].apiError);
        return;
    }
    
    stopVoice();
    
    if (loadingState) loadingState.style.display = 'block';
    if (resultSection) resultSection.style.display = 'none';
    if (infoPlaceholder) infoPlaceholder.style.display = 'none';
    
    const prediction = await predictWithAPI(currentImage);
    
    if (loadingState) loadingState.style.display = 'none';
    
    if (prediction) {
        displayResult(prediction);
        if (infoPlaceholder) infoPlaceholder.style.display = 'none';
    } else {
        if (resultContent) resultContent.innerHTML = `<p style="color:red"><i class="fas fa-exclamation-triangle"></i> ${translations[currentLanguage].error}</p>`;
        if (resultSection) resultSection.style.display = 'block';
    }
}

// ============================================
// CAMERA FUNCTIONS
// ============================================
async function startCamera() {
    try {
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());
        const constraints = { video: { facingMode: { exact: currentCamera } } };
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (video) video.srcObject = currentStream;
        if (cameraModal) cameraModal.style.display = 'flex';
        if (captureBtn) captureBtn.style.display = 'inline-flex';
        if (retakeBtn) retakeBtn.style.display = 'none';
        if (usePhotoBtn) usePhotoBtn.style.display = 'none';
    } catch (error) {
        try {
            const constraints = { video: true };
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            if (video) video.srcObject = currentStream;
            if (cameraModal) cameraModal.style.display = 'flex';
        } catch (err) {
            alert('Camera access denied');
        }
    }
}

function capturePhoto() {
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const capturedImage = canvas.toDataURL('image/jpeg');
    if (video) video.style.display = 'none';
    const imgElement = document.createElement('img');
    imgElement.src = capturedImage;
    imgElement.style.maxWidth = '100%';
    imgElement.style.borderRadius = '15px';
    if (video && video.parentNode) video.parentNode.insertBefore(imgElement, video.nextSibling);
    if (captureBtn) captureBtn.style.display = 'none';
    if (retakeBtn) retakeBtn.style.display = 'inline-flex';
    if (usePhotoBtn) usePhotoBtn.style.display = 'inline-flex';
}

function retakePhoto() {
    if (!video) return;
    const imgElement = video.nextSibling;
    if (imgElement && imgElement.tagName === 'IMG') imgElement.remove();
    video.style.display = 'block';
    if (captureBtn) captureBtn.style.display = 'inline-flex';
    if (retakeBtn) retakeBtn.style.display = 'none';
    if (usePhotoBtn) usePhotoBtn.style.display = 'none';
}

function usePhoto() {
    if (!video) return;
    const imgElement = video.nextSibling;
    if (imgElement && imgElement.tagName === 'IMG') {
        if (previewImg) previewImg.src = imgElement.src;
        if (previewArea) previewArea.style.display = 'block';
        currentImage = previewImg;
        if (resultSection) resultSection.style.display = 'none';
        if (infoPlaceholder) infoPlaceholder.style.display = 'none';
    }
    closeCamera();
}

function switchCamera() {
    currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
    startCamera();
}

function closeCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    if (cameraModal) cameraModal.style.display = 'none';
    if (video) {
        video.style.display = 'block';
        const imgElement = video.nextSibling;
        if (imgElement && imgElement.tagName === 'IMG') imgElement.remove();
    }
}

function clearAll() {
    stopVoice();
    
    currentImage = null;
    if (previewImg) previewImg.src = '';
    if (previewArea) previewArea.style.display = 'none';
    if (fileInput) fileInput.value = '';
    if (fileName) {
        fileName.innerHTML = `<i class="far fa-file-image"></i> <span>${translations[currentLanguage].noFileChosen}</span>`;
    }
    if (resultSection) resultSection.style.display = 'none';
    if (infoPlaceholder) infoPlaceholder.style.display = 'flex';
}

// ============================================
// FILE UPLOAD
// ============================================
function setupFileUpload() {
    if (fileUploadBtn) {
        fileUploadBtn.onclick = () => fileInput.click();
    }
    if (fileInput) {
        fileInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (previewImg) previewImg.src = event.target.result;
                    if (previewArea) previewArea.style.display = 'block';
                    currentImage = previewImg;
                    if (fileName) {
                        fileName.innerHTML = `<i class="far fa-file-image"></i> <span>${e.target.files[0].name}</span>`;
                    }
                    if (resultSection) resultSection.style.display = 'none';
                    if (infoPlaceholder) infoPlaceholder.style.display = 'none';
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        };
    }
}

// ============================================
// HOMEPAGE LANGUAGE UPDATE FUNCTION
// ============================================
function updateHomepageLanguage() {
    const t = translations[currentLanguage];
    
    // Hero Section
    const heroTitle1 = document.getElementById('heroTitle1');
    const heroTagline1 = document.getElementById('heroTagline1');
    const heroBtn1Text = document.getElementById('heroBtn1Text');
    const heroTitle2 = document.getElementById('heroTitle2');
    const heroTagline2 = document.getElementById('heroTagline2');
    const heroBtn2Text = document.getElementById('heroBtn2Text');
    const heroTitle3 = document.getElementById('heroTitle3');
    const heroTagline3 = document.getElementById('heroTagline3');
    const heroBtn3Text = document.getElementById('heroBtn3Text');
    
    if (heroTitle1) heroTitle1.innerHTML = t.heroTitle1 + ' <span class="gold-text">AI</span>';
    if (heroTagline1) heroTagline1.innerText = t.heroTagline1;
    if (heroBtn1Text) heroBtn1Text.innerText = t.heroBtn1Text;
    if (heroTitle2) heroTitle2.innerHTML = t.heroTitle2 + ' <span class="gold-text">ءُ ٹیکنالوجی</span>';
    if (heroTagline2) heroTagline2.innerText = t.heroTagline2;
    if (heroBtn2Text) heroBtn2Text.innerText = t.heroBtn2Text;
    if (heroTitle3) heroTitle3.innerHTML = t.heroTitle3 + ' <span class="gold-text">بچگ</span>';
    if (heroTagline3) heroTagline3.innerText = t.heroTagline3;
    if (heroBtn3Text) heroBtn3Text.innerText = t.heroBtn3Text;
    
    // Features Section
    const featuresTitle = document.getElementById('featuresTitle');
    const featuresSub = document.getElementById('featuresSub');
    const feature1Title = document.getElementById('feature1Title');
    const feature1Desc = document.getElementById('feature1Desc');
    const feature2Title = document.getElementById('feature2Title');
    const feature2Desc = document.getElementById('feature2Desc');
    const feature3Title = document.getElementById('feature3Title');
    const feature3Desc = document.getElementById('feature3Desc');
    
    if (featuresTitle) featuresTitle.innerHTML = '<i class="fas fa-star-of-life"></i> ' + t.featuresTitle;
    if (featuresSub) featuresSub.innerText = t.featuresSub;
    if (feature1Title) feature1Title.innerText = t.feature1Title;
    if (feature1Desc) feature1Desc.innerText = t.feature1Desc;
    if (feature2Title) feature2Title.innerText = t.feature2Title;
    if (feature2Desc) feature2Desc.innerText = t.feature2Desc;
    if (feature3Title) feature3Title.innerText = t.feature3Title;
    if (feature3Desc) feature3Desc.innerText = t.feature3Desc;
    
    // Cultural Section
    const culturalTitle = document.getElementById('culturalTitle');
    const culturalDesc = document.getElementById('culturalDesc');
    const culturalBtnText = document.getElementById('culturalBtnText');
    
    if (culturalTitle) culturalTitle.innerHTML = '<i class="fas fa-hand-sparkles"></i> ' + t.culturalTitle;
    if (culturalDesc) culturalDesc.innerText = t.culturalDesc;
    if (culturalBtnText) culturalBtnText.innerText = t.culturalBtnText;
    
    // Statistics Section
    const stat1Label = document.getElementById('stat1Label');
    const stat2Label = document.getElementById('stat2Label');
    const stat3Label = document.getElementById('stat3Label');
    const stat4Label = document.getElementById('stat4Label');
    
    if (stat1Label) stat1Label.innerText = t.stat1Label;
    if (stat2Label) stat2Label.innerText = t.stat2Label;
    if (stat3Label) stat3Label.innerText = t.stat3Label;
    if (stat4Label) stat4Label.innerText = t.stat4Label;
    
    // How It Works Section
    const howItWorksTitle = document.getElementById('howItWorksTitle');
    const step1Title = document.getElementById('step1Title');
    const step1Desc = document.getElementById('step1Desc');
    const step2Title = document.getElementById('step2Title');
    const step2Desc = document.getElementById('step2Desc');
    const step3Title = document.getElementById('step3Title');
    const step3Desc = document.getElementById('step3Desc');
    
    if (howItWorksTitle) howItWorksTitle.innerHTML = '<i class="fas fa-cogs"></i> ' + t.howItWorksTitle;
    if (step1Title) step1Title.innerText = t.step1Title;
    if (step1Desc) step1Desc.innerText = t.step1Desc;
    if (step2Title) step2Title.innerText = t.step2Title;
    if (step2Desc) step2Desc.innerText = t.step2Desc;
    if (step3Title) step3Title.innerText = t.step3Title;
    if (step3Desc) step3Desc.innerText = t.step3Desc;
    
    // Testimonials Section
    const testimonialsTitle = document.getElementById('testimonialsTitle');
    const testimonial1Text = document.getElementById('testimonial1Text');
    const testimonial1Name = document.getElementById('testimonial1Name');
    const testimonial2Text = document.getElementById('testimonial2Text');
    const testimonial2Name = document.getElementById('testimonial2Name');
    const testimonial3Text = document.getElementById('testimonial3Text');
    const testimonial3Name = document.getElementById('testimonial3Name');
    
    if (testimonialsTitle) testimonialsTitle.innerHTML = '<i class="fas fa-comment-dots"></i> ' + t.testimonialsTitle;
    if (testimonial1Text) testimonial1Text.innerText = t.testimonial1Text;
    if (testimonial1Name) testimonial1Name.innerText = t.testimonial1Name;
    if (testimonial2Text) testimonial2Text.innerText = t.testimonial2Text;
    if (testimonial2Name) testimonial2Name.innerText = t.testimonial2Name;
    if (testimonial3Text) testimonial3Text.innerText = t.testimonial3Text;
    if (testimonial3Name) testimonial3Name.innerText = t.testimonial3Name;
    
    // Newsletter Section
    const newsletterTitle = document.getElementById('newsletterTitle');
    const newsletterPlaceholder = document.getElementById('newsletterPlaceholder');
    const newsletterBtnText = document.getElementById('newsletterBtnText');
    
    if (newsletterTitle) newsletterTitle.innerText = t.newsletterTitle;
    if (newsletterPlaceholder) newsletterPlaceholder.placeholder = t.newsletterPlaceholder;
    if (newsletterBtnText) newsletterBtnText.innerHTML = t.newsletterBtnText + ' <i class="fas fa-paper-plane"></i>';
    
    // Footer
    const footerBrand = document.getElementById('footerBrand');
    const footerCopyText = document.getElementById('footerCopyText');
    
    if (footerBrand) footerBrand.innerText = t.footerBrand;
    if (footerCopyText) footerCopyText.innerText = t.footerCopyText;
}

// ============================================
// NAVIGATION & LANGUAGE
// ============================================
function updateLanguage() {
    const t = translations[currentLanguage];
    
    // Navbar
    const navHome = document.getElementById('navHome');
    const navDetect = document.getElementById('navDetect');
    const navTranslator = document.getElementById('navTranslator');
    const navAssistant = document.getElementById('navAssistant');
    const navChatbot = document.getElementById('navChatbot');
    const navDatahub = document.getElementById('navDatahub');
    const langBtnText = document.getElementById('langBtnText');
    
    if (navHome) navHome.innerText = t.home;
    if (navDetect) navDetect.innerText = t.detect;
    if (navTranslator) navTranslator.innerText = t.translator;
    if (navAssistant) navAssistant.innerText = t.assistant;
    if (navChatbot) navChatbot.innerText = t.chatbot;
    if (navDatahub) navDatahub.innerText = t.datahub;
    if (langBtnText) langBtnText.innerText = currentLanguage === 'balochi' ? 'English' : 'بلوچی';
    
    // Detection Page
    const detectionTitle = document.getElementById('detectionTitle');
    const detectionSub = document.getElementById('detectionSub');
    const chooseFileText = document.getElementById('chooseFileText');
    const noFileText = document.getElementById('noFileText');
    const cameraText = document.getElementById('cameraText');
    const clearText = document.getElementById('clearText');
    const predictText = document.getElementById('predictText');
    const loadingText = document.getElementById('loadingText');
    const resultTitle = document.getElementById('resultTitle');
    const footerText = document.getElementById('footerText');
    const placeholderText = document.getElementById('placeholderText');
    const comingSoonMsg = document.getElementById('comingSoonMsg');
    const assistantTitle = document.getElementById('assistantTitle');
    const assistantSub = document.getElementById('assistantSub');
    const translatorPageTitle = document.getElementById('translatorPageTitle');
    const chatbotPageTitle = document.getElementById('chatbotPageTitle');
    const datahubPageTitle = document.getElementById('datahubPageTitle');
    
    if (detectionTitle) detectionTitle.innerText = t.detectionTitle;
    if (detectionSub) detectionSub.innerText = 'AI-based recognition | Real-time diagnosis';
    if (chooseFileText) chooseFileText.innerText = t.chooseFile;
    if (noFileText) noFileText.innerText = t.noFileChosen;
    if (cameraText) cameraText.innerText = t.camera;
    if (clearText) clearText.innerText = t.clear;
    if (predictText) predictText.innerText = t.predict;
    if (loadingText) loadingText.innerText = t.analyzing;
    if (resultTitle) resultTitle.innerText = t.result;
    if (footerText) footerText.innerText = t.footer;
    if (placeholderText) placeholderText.innerText = currentLanguage === 'balochi' ? 'تصویر اپ لوڈ کُت کن تے نادراہی ءِ پجار بہ کن' : 'Upload image to detect disease';
    if (comingSoonMsg) comingSoonMsg.innerText = t.comingSoon;
    if (assistantTitle) assistantTitle.innerText = t.assistant;
    if (assistantSub) assistantSub.innerText = 'Reinforcement Learning Agent | UCB1 Multi-Arm Bandit';
    if (translatorPageTitle) translatorPageTitle.innerText = t.translator;
    if (chatbotPageTitle) chatbotPageTitle.innerText = t.chatbot;
    if (datahubPageTitle) datahubPageTitle.innerText = t.datahub;
    
    // Camera buttons
    const captureText = document.getElementById('captureText');
    const retakeText = document.getElementById('retakeText');
    const usePhotoText = document.getElementById('usePhotoText');
    const switchCameraText = document.getElementById('switchCameraText');
    const closeText = document.getElementById('closeText');
    
    if (captureText) captureText.innerText = t.capture;
    if (retakeText) retakeText.innerText = t.retake;
    if (usePhotoText) usePhotoText.innerText = t.usePhoto;
    if (switchCameraText) switchCameraText.innerText = t.switchCamera;
    if (closeText) closeText.innerText = t.close;
    
    // RTL direction
    if (currentLanguage === 'balochi') {
        document.body.classList.add('rtl');
    } else {
        document.body.classList.remove('rtl');
    }
    
    // Update homepage language
    updateHomepageLanguage();
    
    // API status update
    if (apiAvailable) {
        const statusDiv = document.getElementById('apiStatus');
        if (statusDiv) {
            statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> ' + (currentLanguage === 'balochi' ? 'ماڈل تیار انت - اپ لوڈ کُت کن' : 'Model ready - Upload an image');
            statusDiv.className = 'api-status status-success';
        }
    }
}

function setupNavigation() {
    // ALL 6 pages including homePage
    const pages = ['homePage', 'detectionPage', 'translatorPage', 'assistantPage', 'chatbotPage', 'datahubPage'];
    
    const showPage = (pageId) => {
        // Hide all pages
        pages.forEach(p => {
            const page = document.getElementById(p);
            if (page) page.classList.remove('active-page');
        });
        // Show selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) targetPage.classList.add('active-page');
        
        // Update active class on nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
    };
    
    // Add click handlers to all nav links
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            showPage(pageId);
            link.classList.add('active');
            
            // Show alert for coming soon pages
            if (pageId !== 'homePage' && pageId !== 'detectionPage' && pageId !== 'assistantPage') {
                alert(translations[currentLanguage].comingSoon);
            }
        };
    });
    
    // Default: show homePage
    showPage('homePage');
    const homeLink = document.querySelector('.nav-link[data-page="homePage"]');
    if (homeLink) homeLink.classList.add('active');
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    fileInput = document.getElementById('fileInput');
    fileUploadBtn = document.getElementById('fileUploadBtn');
    fileName = document.getElementById('fileName');
    cameraBtn = document.getElementById('cameraBtn');
    cameraModal = document.getElementById('cameraModal');
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    captureBtn = document.getElementById('captureBtn');
    retakeBtn = document.getElementById('retakeBtn');
    usePhotoBtn = document.getElementById('usePhotoBtn');
    switchCameraBtn = document.getElementById('switchCameraBtn');
    closeCameraBtn = document.getElementById('closeCameraBtn');
    previewArea = document.getElementById('previewArea');
    previewImg = document.getElementById('previewImg');
    clearBtn = document.getElementById('clearBtn');
    predictBtn = document.getElementById('predictBtn');
    loadingState = document.getElementById('loadingState');
    resultSection = document.getElementById('resultSection');
    resultContent = document.getElementById('resultContent');
    infoPlaceholder = document.getElementById('infoPlaceholder');
    
    voicePlayer = document.getElementById('voicePlayer');
    voiceAudio = document.getElementById('voiceAudio');
    stopVoiceBtn = document.getElementById('stopVoiceBtn');
    voiceStatus = document.getElementById('voiceStatus');
    
    setupFileUpload();
    setupNavigation();
    
    if (cameraBtn) cameraBtn.onclick = startCamera;
    if (captureBtn) captureBtn.onclick = capturePhoto;
    if (retakeBtn) retakeBtn.onclick = retakePhoto;
    if (usePhotoBtn) usePhotoBtn.onclick = usePhoto;
    if (switchCameraBtn) switchCameraBtn.onclick = switchCamera;
    if (closeCameraBtn) closeCameraBtn.onclick = closeCamera;
    if (clearBtn) clearBtn.onclick = clearAll;
    if (predictBtn) predictBtn.onclick = handlePrediction;
    
    if (stopVoiceBtn) {
        stopVoiceBtn.onclick = stopVoice;
    }
    
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.onclick = () => {
            currentLanguage = currentLanguage === 'balochi' ? 'english' : 'balochi';
            updateLanguage();
            clearAll();
            stopVoice();
        };
    }
    
    loadMemory();
    renderAssistantStats();
    
    const assistantSendBtn = document.getElementById('assistantSendBtn');
    const assistantUserInput = document.getElementById('assistantUserInput');
    const resetMemoryBtn = document.getElementById('resetMemoryBtn');
    const saveMemoryBtn = document.getElementById('saveMemoryBtn');
    
    if (assistantSendBtn) {
        assistantSendBtn.addEventListener('click', () => {
            const val = assistantUserInput ? assistantUserInput.value : '';
            processAssistantInput(val);
            if (assistantUserInput) assistantUserInput.value = '';
        });
    }
    
    if (assistantUserInput) {
        assistantUserInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = assistantUserInput.value;
                processAssistantInput(val);
                assistantUserInput.value = '';
            }
        });
    }
    
    if (resetMemoryBtn) resetMemoryBtn.addEventListener('click', resetAssistantMemory);
    if (saveMemoryBtn) saveMemoryBtn.addEventListener('click', manualSaveMemory);
    
    updateLanguage();
    await checkAPI();
}

document.addEventListener('DOMContentLoaded', init);
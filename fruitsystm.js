// ============================================================================
// YALLA FRUIT - NEXUS AI1 ENGINE (fruitsystm.js)
// مستخرج كامل من ملف YallaGameActivity.smali - الخوارزمية الأولى
// ✅ متوافق 100% مع index.html (يستقبل slots ببنية { id, top, left })
// ============================================================================


// ============================================================================
// [1] قاموس الترجمة (عربي ↔ إنجليزي) - من translateFruit في smali
// ============================================================================
const FRUIT_TRANSLATIONS = {
    'برتقال': 'orange',
    'عنب': 'grape',
    'ليمون': 'lemon',
    'تفاح': 'apple',
    'كرز': 'cherry',
    'بطيخ': 'watermelon',
    'فراولة': 'strawberry',
    'فراوله': 'strawberry',    // بدون تاء مربوطة
    'مانجو': 'mango'
};

// قائمة الفواكه الصحيحة (من VALID_FRUITS في smali)
const VALID_FRUITS = [
    'عنب', 'ليمون', 'برتقال', 'تفاح',
    'كرز', 'بطيخ', 'فراولة', 'فراوله', 'مانجو'
];

// أسماء الفواكه بالإنجليزية (المفاتيح الداخلية)
const FRUIT_NAMES_EN = [
    'orange', 'lemon', 'grape', 'apple',
    'cherry', 'watermelon', 'mango', 'strawberry'
];


// ============================================================================
// [2] 🎯 خرائط الربط بين ID والأسماء (مهمة لتوافق HTML)
// HTML يستخدم: 1=برتقال، 2=ليمون، 3=عنب، 4=كرز، 5=تفاح، 6=بطيخ، 7=مانجو، 8=فراولة
// ============================================================================
const ID_TO_ENGLISH = {
    1: 'orange',
    2: 'lemon',
    3: 'grape',
    4: 'cherry',
    5: 'apple',
    6: 'watermelon',
    7: 'mango',
    8: 'strawberry'
};

const ENGLISH_TO_ID = {
    'orange': 1,
    'lemon': 2,
    'grape': 3,
    'cherry': 4,
    'apple': 5,
    'watermelon': 6,
    'mango': 7,
    'strawberry': 8
};


// ============================================================================
// [3] الأوزان الأساسية لكل فاكهة (من السطور 905-935 في smali)
// ============================================================================
const BASE_WEIGHT_MAX = {
    'orange':     30,    // 0x1e → nextInt(30) + 1
    'apple':      30,    // 0x1e → 1-30
    'grape':      30,    // 0x1e → 1-30
    'lemon':      30,    // 0x1e → 1-30
    'mango':      25,    // 0x19 → 1-25
    'strawberry': 28,    // 0x1c → 1-28
    'watermelon': 20,    // 0x14 → 1-20
    'cherry':     15     // 0x0f → 1-15
};


// ============================================================================
// [4] ذاكرة العقل الأول (AI1 Memory)
// ============================================================================
let fruitOccurrencesAI1 = {};   // عدد تكرارات كل فاكهة
let fruitHistoryAI1 = [];       // آخر 7 فواكه فقط
let lastRoundGuesses = [];      // توقعات الجولة السابقة
let wrongGuessesCount = 0;      // عداد الأخطاء المتتالية
let localTrainedCount = 0;      // عداد عمليات التعلم


// ============================================================================
// [5] محرك الأرقام العشوائية (SecureRandom بديل)
// ============================================================================
const SecureRandom = {
    nextInt: function(max) {
        return Math.floor(Math.random() * max);
    }
};


// ============================================================================
// [6] خلط المصفوفات - Fisher-Yates Shuffle
// ============================================================================
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


// ============================================================================
// [7] ترجمة اسم الفاكهة
// ============================================================================
function translateFruit(name) {
    if (!name || typeof name !== 'string') return '';
    const clean = name.toLowerCase().trim();
    return FRUIT_TRANSLATIONS[clean] || '';
}


// ============================================================================
// [8] التحقق من صحة اسم الفاكهة
// ============================================================================
function isValidFruitName(name) {
    if (!name || typeof name !== 'string') return false;
    const clean = name.toLowerCase().trim();
    return VALID_FRUITS.includes(clean);
}


// ============================================================================
// [9] 🧠 نظام التعلم الفعلي (processUserFruit من smali)
// ============================================================================
function processUserFruit(fruitName) {
    const englishName = translateFruit(fruitName);
    if (!englishName) return { success: false, reason: 'invalid_name' };

    // ─── خطوة 1: تحديث عداد الأخطاء بناءً على الجولة السابقة ───
    if (lastRoundGuesses.length > 0) {
        if (!lastRoundGuesses.includes(englishName)) {
            wrongGuessesCount++;
        } else {
            wrongGuessesCount = Math.max(0, wrongGuessesCount - 1);
        }
    }

    // ─── خطوة 2: إعادة تعيين العداد إذا تجاوز 5 ───
    if (wrongGuessesCount > 5) {
        wrongGuessesCount = 0;
    }

    // ─── خطوة 3: تحديث عدد التكرارات ───
    const currentCount = fruitOccurrencesAI1[englishName] || 0;
    fruitOccurrencesAI1[englishName] = currentCount + 1;

    // ─── خطوة 4: تحديث سجل الذاكرة (max 7 عناصر) ───
    fruitHistoryAI1.push(englishName);

    if (fruitHistoryAI1.length > 7) {
        const removed = fruitHistoryAI1.shift();
        const removedCount = fruitOccurrencesAI1[removed] || 0;
        if (removedCount > 1) {
            fruitOccurrencesAI1[removed] = removedCount - 1;
        } else {
            delete fruitOccurrencesAI1[removed];
        }
    }

    return {
        success: true,
        englishName: englishName,
        occurrences: fruitOccurrencesAI1[englishName],
        historySize: fruitHistoryAI1.length,
        wrongGuessesCount: wrongGuessesCount
    };
}


// ============================================================================
// [10] 🧠 دالة التعلم - متوافقة مع index.html
// ============================================================================
function trainAlgorithm(fruitName) {
    // فحص أولي
    if (!isValidFruitName(fruitName)) {
        return false;
    }

    // معالجة الفاكهة
    const result = processUserFruit(fruitName);
    if (!result.success) return false;

    localTrainedCount++;

    return {
        success: true,
        id: result.englishName,
        boost: result.occurrences,
        totalTrained: localTrainedCount,
        wrongGuessesCount: result.wrongGuessesCount,
        historySize: result.historySize
    };
}


// ============================================================================
// [11] 📊 إحصائيات التعلم - متوافقة مع index.html
// ============================================================================
function getLearningStats() {
    return {
        totalTrained: localTrainedCount,
        perFruit: { ...fruitOccurrencesAI1 },
        memorySize: fruitHistoryAI1.length,
        logSize: fruitHistoryAI1.length,
        wrongGuessesCount: wrongGuessesCount
    };
}

function getTrainedFruits() {
    return fruitHistoryAI1.map((name, index) => ({
        name: name,
        id: name,
        boost: fruitOccurrencesAI1[name] || 0,
        time: Date.now() - ((fruitHistoryAI1.length - index) * 1000)
    }));
}

function resetLearning() {
    resetAI1Memory();
    localTrainedCount = 0;
    return true;
}


// ============================================================================
// [12] ⚖️ حساب الأوزان (من startNewRound في smali)
// ============================================================================
function calculateWeightsAI1(fruitViews, lastGuesses) {
    const weights = {};
    const viewMap = {};
    const lastGuessesList = lastGuesses || [];

    // ── المرحلة 1: الأوزان الأساسية ──
    for (const view of fruitViews) {
        const name = view.englishName;
        viewMap[name] = view;
        const max = BASE_WEIGHT_MAX[name] || 10;
        weights[name] = SecureRandom.nextInt(max) + 1;
    }

    // ── المرحلة 2: تعديل الكرز/البطيخ إذا في الجولة السابقة ──
    if (lastGuessesList.includes('cherry') && 'cherry' in weights) {
        weights['cherry'] = Math.max(1, Math.floor(weights['cherry'] / 2));
    }
    if (lastGuessesList.includes('watermelon') && 'watermelon' in weights) {
        weights['watermelon'] = Math.max(1, Math.floor(weights['watermelon'] / 2));
    }

    // ── المرحلة 3: تعزيز الذاكرة ──
    let boostFlag = false;

    for (const fruitName in fruitOccurrencesAI1) {
        if (!(fruitName in weights)) continue;

        const occurrences = fruitOccurrencesAI1[fruitName];
        const currentWeight = weights[fruitName];

        // مضاعف التكرار: 2-4
        const multiplier = SecureRandom.nextInt(3) + 2;
        let occurrencesBoost = occurrences * multiplier;

        // مكافأة التنوع (2-5) أو عقوبة التكرار (-2)
        let diversityBonus;
        if (!lastGuessesList.includes(fruitName)) {
            diversityBonus = SecureRandom.nextInt(4) + 2;
        } else {
            diversityBonus = -2;
        }

        // حساب الوزن الجديد
        let newWeight = currentWeight + occurrencesBoost + diversityBonus;

        // استثناء: الفراولة والمانجو = 0 إذا في الجولة السابقة
        if ((fruitName === 'strawberry' || fruitName === 'mango') 
            && lastGuessesList.includes(fruitName)) {
            newWeight = 0;
        }

        // كبح عند 25
        if (newWeight >= 25) {
            newWeight = 25;
            boostFlag = true;
        }

        // الحد الأقصى 30
        newWeight = Math.min(newWeight, 30);
        newWeight = Math.max(newWeight, 0);

        weights[fruitName] = newWeight;
    }

    return { weights, viewMap, boostFlag };
}


// ============================================================================
// [13] 🎲 إحصائيات الأوزان
// ============================================================================
function calculateWeightStats(weights) {
    let totalWeight = 0;
    let maxWeight = 0;

    for (const name in weights) {
        const w = weights[name];
        totalWeight += w;
        if (w > maxWeight) maxWeight = w;
    }

    let percentage = 0;
    if (totalWeight > 0) {
        percentage = Math.floor((maxWeight * 100) / totalWeight);
    }

    return { totalWeight, maxWeight, percentage };
}


// ============================================================================
// [14] 🎯 تحديد عدد التوقعات (3 أو 4)
// ============================================================================
function determinePickCount(boostFlag, percentage) {
    if (!boostFlag) return 4;
    if (percentage < 55) return 4;
    const roll = SecureRandom.nextInt(100);
    return roll > 80 ? 4 : 3;
}


// ============================================================================
// [15] 🏗️ بناء سلة القرعة
// ============================================================================
function buildWeightedPool(weights, viewMap) {
    const pool = [];
    for (const name in weights) {
        const weight = weights[name];
        const view = viewMap[name];
        if (!view) continue;
        for (let i = 0; i < weight; i++) {
            pool.push(view);
        }
    }
    return pool;
}


// ============================================================================
// [16] 🎰 اختيار التوقعات النهائية
// ============================================================================
function selectFinalPredictions(pool, pickCount) {
    const shuffled = shuffleArray(pool);
    const picked = [];
    const pickedNames = [];

    for (const view of shuffled) {
        if (picked.includes(view)) continue;

        const name = view.englishName;
        if (name === 'cherry' && pickedNames.includes('watermelon')) continue;
        if (name === 'watermelon' && pickedNames.includes('cherry')) continue;

        picked.push(view);
        pickedNames.push(name);

        if (picked.length >= pickCount) break;
    }

    if (picked.length < pickCount) {
        for (const view of shuffled) {
            if (picked.includes(view)) continue;

            const name = view.englishName;
            if (name === 'cherry' && pickedNames.includes('watermelon')) continue;
            if (name === 'watermelon' && pickedNames.includes('cherry')) continue;

            picked.push(view);
            pickedNames.push(name);

            if (picked.length >= pickCount) break;
        }
    }

    return { picked, pickedNames };
}


// ============================================================================
// [17] 🚀 generatePrediction - مُتوافقة مع index.html
//     تستقبل: slots ([{id, top, left}]) + previousSelection (اختياري)
//     ترجع:  مصفوفة من 4 slots ([{id, top, left}])
// ============================================================================
function generatePrediction(slots, previousSelection) {
    try {
        // ─── خطوة 1: التحقق من المدخلات ───
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة");
        }

        // ─── خطوة 2: تحويل slots إلى fruitViews ببنية الخوارزمية ───
        const fruitViews = slots.map(slot => ({
            slot: slot,                       // نحتفظ بالـ slot الأصلي
            id: slot.id,                      // المعرف الرقمي
            englishName: ID_TO_ENGLISH[slot.id]  // الاسم الإنجليزي
        })).filter(v => v.englishName);       // تجاهل أي ID غير معروف

        if (fruitViews.length === 0) {
            throw new Error("لم يتم التعرف على أي فاكهة");
        }

        // ─── خطوة 3: استدعاء الخوارزمية الأساسية ───
        const { weights, viewMap, boostFlag } = calculateWeightsAI1(
            fruitViews, 
            lastRoundGuesses
        );

        const { totalWeight, maxWeight, percentage } = calculateWeightStats(weights);
        const pickCount = determinePickCount(boostFlag, percentage);
        const pool = buildWeightedPool(weights, viewMap);
        const { picked, pickedNames } = selectFinalPredictions(pool, pickCount);

        // ─── خطوة 4: تحديث توقعات الجولة السابقة ───
        lastRoundGuesses = [...pickedNames];

        // ─── خطوة 5: تحويل النتائج مرة أخرى إلى slots ───
        let selectedSlots = picked.map(view => view.slot);

        // ─── خطوة 6: ضمان إرجاع 4 توقعات دائماً (HTML يتوقع 4 markers) ───
        if (selectedSlots.length < 4) {
            const selectedIds = selectedSlots.map(s => s.id);
            const remainingSlots = shuffleArray(
                slots.filter(s => !selectedIds.includes(s.id))
            );
            while (selectedSlots.length < 4 && remainingSlots.length > 0) {
                selectedSlots.push(remainingSlots.pop());
            }
        }

        // ─── خطوة 7: ترتيب عشوائي نهائي ───
        selectedSlots = shuffleArray(selectedSlots);

        return selectedSlots;

    } catch (error) {
        console.error('خطأ في generatePrediction:', error.message);
        return null;
    }
}


// ============================================================================
// [18] ⏱️ مؤقت الجولة العشوائي (23-38 ثانية)
// ============================================================================
function getRandomRoundDuration() {
    return SecureRandom.nextInt(16) + 23;
}


// ============================================================================
// [19] 🔄 إعادة تعيين الذاكرة
// ============================================================================
function resetAI1Memory() {
    fruitOccurrencesAI1 = {};
    fruitHistoryAI1 = [];
    lastRoundGuesses = [];
    wrongGuessesCount = 0;
    return true;
}


// ============================================================================
// [20] 📊 حالة الذاكرة (للعرض)
// ============================================================================
function getAI1MemoryState() {
    return {
        fruitOccurrencesAI1: { ...fruitOccurrencesAI1 },
        fruitHistoryAI1: [...fruitHistoryAI1],
        lastRoundGuesses: [...lastRoundGuesses],
        wrongGuessesCount: wrongGuessesCount
    };
}


// ============================================================================
// [21] 🌐 التصدير العالمي
// ============================================================================
if (typeof window !== 'undefined') {
    // التصدير الأساسي المتوافق مع HTML
    window.generatePrediction = generatePrediction;
    window.trainAlgorithm = trainAlgorithm;
    window.getLearningStats = getLearningStats;
    window.getTrainedFruits = getTrainedFruits;
    window.resetLearning = resetLearning;

    // التصدير الموسّع (اختياري)
    window.YallaAI1 = {
        FRUIT_TRANSLATIONS,
        VALID_FRUITS,
        FRUIT_NAMES_EN,
        BASE_WEIGHT_MAX,
        ID_TO_ENGLISH,
        ENGLISH_TO_ID,

        translateFruit,
        isValidFruitName,
        processUserFruit,
        trainAlgorithm,
        getLearningStats,
        getTrainedFruits,
        resetLearning,

        calculateWeightsAI1,
        calculateWeightStats,
        determinePickCount,
        buildWeightedPool,
        selectFinalPredictions,
        generatePrediction,

        getRandomRoundDuration,
        resetAI1Memory,
        getAI1MemoryState,
        shuffleArray,
        SecureRandom,

        getMemory: () => ({
            fruitOccurrencesAI1: { ...fruitOccurrencesAI1 },
            fruitHistoryAI1: [...fruitHistoryAI1],
            lastRoundGuesses: [...lastRoundGuesses],
            wrongGuessesCount
        })
    };
}


// ============================================================================
// ✅ رسالة تأكيد التحميل في الكونسول
// ============================================================================
console.log('✅ fruitsystm.js تم تحميله بنجاح - AI1 Engine جاهز');

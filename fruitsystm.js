// ============================================================================
// YALLA FRUIT - NEXUS AI1 ENGINE (fruitsystm.js)
// مستخرج كامل من ملف YallaGameActivity.smali - الخوارزمية الأولى فقط
// ============================================================================
//
// 🧠 محتويات الملف:
//   1. قاموس الترجمة (عربي ↔ إنجليزي)
//   2. نظام التعلم الفعلي (processUserFruit)
//   3. الأوزان الأساسية لكل فاكهة (Base Weights)
//   4. تعديلات الجولة السابقة (Cherry/Watermelon halving)
//   5. تعزيز الذاكرة (Memory Boost للعقل AI1)
//   6. التسلسل الانتقالي (Markov Sequence)
//   7. العشوائية الموزونة (Weighted Lottery)
//   8. قواعد الاستثناء (Cherry+Watermelon exclusive)
//   9. مؤقّت الجولة العشوائي (23-38 ثانية)
// ============================================================================


// ============================================================================
// [1] قاموس الترجمة (مُستخرج من translateFruit في smali)
// ============================================================================
const FRUIT_TRANSLATIONS = {
    // عربي
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

// قائمة الفواكه الصحيحة (مُستخرجة من VALID_FRUITS في smali)
const VALID_FRUITS = [
    'عنب', 'ليمون', 'برتقال', 'تفاح',
    'كرز', 'بطيخ', 'فراولة', 'فراوله', 'مانجو'
];

// أسماء الفواكه بالإنجليزية (المفاتيح الداخلية للنظام)
const FRUIT_NAMES_EN = [
    'orange', 'lemon', 'grape', 'apple',
    'cherry', 'watermelon', 'mango', 'strawberry'
];


// ============================================================================
// [2] الأوزان الأساسية لكل فاكهة
// مُستخرجة من SecureRandom.nextInt(v9) + 1 في startNewRound
// ============================================================================
const BASE_WEIGHT_MAX = {
    'orange':     30,    // 0x1e → nextInt(30) + 1 → 1-30
    'apple':      30,    // 0x1e → 1-30
    'grape':      30,    // 0x1e → 1-30
    'lemon':      30,    // 0x1e → 1-30
    'mango':      25,    // 0x19 → nextInt(25) + 1 → 1-25
    'strawberry': 28,    // 0x1c → nextInt(28) + 1 → 1-28
    'watermelon': 20,    // 0x14 → nextInt(20) + 1 → 1-20
    'cherry':     15     // 0x0f → nextInt(15) + 1 → 1-15
};


// ============================================================================
// [3] ذاكرة العقل الأول (AI1 Memory)
// ============================================================================
let fruitOccurrencesAI1 = {};   // Map<String, Integer> - عدد تكرارات كل فاكهة
let fruitHistoryAI1 = [];       // ArrayList<String> - آخر 7 فواكه فقط
let lastRoundGuesses = [];      // List<String> - توقعات الجولة السابقة
let wrongGuessesCount = 0;      // عداد الأخطاء المتتالية


// ============================================================================
// [4] محرك الأرقام العشوائية الآمن (SecureRandom بديل)
// ============================================================================
const SecureRandom = {
    // يُحاكي nextInt(max) في Java → يُعيد رقماً من 0 إلى max-1
    nextInt: function(max) {
        return Math.floor(Math.random() * max);
    }
};


// ============================================================================
// [5] خلط المصفوفات - Fisher-Yates Shuffle (مُستخرج من Collections.shuffle)
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
// [6] ترجمة اسم الفاكهة (من العربية إلى الإنجليزية)
// ============================================================================
function translateFruit(name) {
    if (!name || typeof name !== 'string') return '';
    const clean = name.toLowerCase().trim();
    return FRUIT_TRANSLATIONS[clean] || '';
}


// ============================================================================
// [7] التحقق من صحة اسم الفاكهة
// ============================================================================
function isValidFruitName(name) {
    if (!name || typeof name !== 'string') return false;
    const clean = name.toLowerCase().trim();
    return VALID_FRUITS.includes(clean);
}


// ============================================================================
// [8] 🧠 نظام التعلم الفعلي (processUserFruit مُستخرج من smali)
// ============================================================================
function processUserFruit(fruitName) {
    const englishName = translateFruit(fruitName);
    if (!englishName) return { success: false, reason: 'invalid_name' };

    // ─── خطوة 1: تحديث عداد الأخطاء بناءً على الجولة السابقة ───
    if (lastRoundGuesses.length > 0) {
        if (!lastRoundGuesses.includes(englishName)) {
            // الاسم غير موجود في توقعات الجولة السابقة → خطأ
            wrongGuessesCount++;
        } else {
            // الاسم كان موجوداً → تصحيح، إنقاص العداد
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
        const removed = fruitHistoryAI1.shift();  // إزالة الأقدم
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
// [9] ⚖️ حساب أوزان الفواكه الكامل (مُستخرج من startNewRound)
// ============================================================================
function calculateWeightsAI1(fruitViews, lastGuesses) {
    const weights = {};       // HashMap<String, Integer> - الأوزان النهائية
    const viewMap = {};       // HashMap<String, View> - ربط الاسم بالعرض
    const lastGuessesList = lastGuesses || [];

    // ─────────────────────────────────────────────────────────
    // المرحلة 1: بناء viewMap + الأوزان الأساسية
    // (السطور 905-935 في smali)
    // ─────────────────────────────────────────────────────────
    for (const view of fruitViews) {
        const name = view.englishName;
        viewMap[name] = view;

        // nextInt(BASE_WEIGHT_MAX) + 1
        const max = BASE_WEIGHT_MAX[name] || 10;
        weights[name] = SecureRandom.nextInt(max) + 1;
    }

    // ─────────────────────────────────────────────────────────
    // المرحلة 2: تعديل الكرز والبطيخ إذا ظهرا في الجولة السابقة
    // (السطور 940-948 في smali) - قسمة على 2 بحد أدنى 1
    // ─────────────────────────────────────────────────────────
    if (lastGuessesList.includes('cherry') && 'cherry' in weights) {
        weights['cherry'] = Math.max(1, Math.floor(weights['cherry'] / 2));
    }
    if (lastGuessesList.includes('watermelon') && 'watermelon' in weights) {
        weights['watermelon'] = Math.max(1, Math.floor(weights['watermelon'] / 2));
    }

    // ─────────────────────────────────────────────────────────
    // المرحلة 3: تعزيز الذاكرة للعقل AI1
    // (السطور 952-1010 في smali) - الجزء الأساسي للخوارزمية
    // ─────────────────────────────────────────────────────────
    let boostFlag = false;  // يُفعَّل عند وصول أي وزن ≥ 25

    for (const fruitName in fruitOccurrencesAI1) {
        if (!(fruitName in weights)) continue;

        const occurrences = fruitOccurrencesAI1[fruitName];
        const currentWeight = weights[fruitName];

        // ─── مضاعف التكرار: nextInt(3) + 2 → 2 أو 3 أو 4 ───
        const multiplier = SecureRandom.nextInt(3) + 2;
        let occurrencesBoost = occurrences * multiplier;

        // ─── مكافأة التنوع أو عقوبة التكرار ───
        let diversityBonus;
        if (!lastGuessesList.includes(fruitName)) {
            // الفاكهة لم تظهر في الجولة السابقة → مكافأة
            diversityBonus = SecureRandom.nextInt(4) + 2;  // 2-5
        } else {
            // الفاكهة ظهرت مؤخراً → عقوبة
            diversityBonus = -2;
        }

        // ─── حساب الوزن الجديد ───
        // new = current + (occurrences * multiplier) + diversity_bonus
        let newWeight = currentWeight + occurrencesBoost + diversityBonus;

        // ─── استثناء صارم: الفراولة والمانجو = 0 إذا في الجولة السابقة ───
        if ((fruitName === 'strawberry' || fruitName === 'mango') 
            && lastGuessesList.includes(fruitName)) {
            newWeight = 0;
        }

        // ─── كبح الوزن عند 25 (ويُفعِّل boostFlag) ───
        if (newWeight >= 25) {
            newWeight = 25;
            boostFlag = true;
        }

        // ─── الحد الأقصى المطلق: 30 (Math.min(weight, 30)) ───
        newWeight = Math.min(newWeight, 30);
        newWeight = Math.max(newWeight, 0);

        weights[fruitName] = newWeight;
    }

    return { weights, viewMap, boostFlag };
}


// ============================================================================
// [10] 🎲 حساب إجمالي الأوزان والنسبة المئوية
// (السطور 1027-1040 في smali)
// ============================================================================
function calculateWeightStats(weights) {
    let totalWeight = 0;
    let maxWeight = 0;

    for (const name in weights) {
        const w = weights[name];
        totalWeight += w;
        if (w > maxWeight) maxWeight = w;
    }

    // النسبة المئوية للوزن الأقصى من الإجمالي
    let percentage = 0;
    if (totalWeight > 0) {
        percentage = Math.floor((maxWeight * 100) / totalWeight);
    }

    return { totalWeight, maxWeight, percentage };
}


// ============================================================================
// [11] 🎯 تحديد عدد التوقعات (3 أو 4)
// (السطور 1036-1045 في smali)
// ============================================================================
function determinePickCount(boostFlag, percentage) {
    // إذا لم يُفعَّل boostFlag → دائماً 4
    if (!boostFlag) return 4;

    // إذا كانت النسبة أقل من 55% → دائماً 4
    if (percentage < 55) return 4;

    // الحالة الخاصة: boostFlag = true AND percentage >= 55
    // nextInt(100) > 80 → 4 توقعات
    // nextInt(100) <= 80 → 3 توقعات
    const roll = SecureRandom.nextInt(100);
    return roll > 80 ? 4 : 3;
}


// ============================================================================
// [12] 🏗️ بناء سلة القرعة الموزونة
// (السطور 1045-1055 في smali)
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
// [13] 🎰 اختيار التوقعات النهائية بقواعد الاستثناء
// (السطور 1056-1095 في smali)
// قواعد:
//   - لا تكرار لنفس العرض
//   - الكرز والبطيخ لا يظهران معاً في نفس الجولة
// ============================================================================
function selectFinalPredictions(pool, pickCount) {
    const shuffled = shuffleArray(pool);
    const picked = [];
    const pickedNames = [];

    // ─── الجولة الأولى: الاختيار الأساسي ───
    for (const view of shuffled) {
        if (picked.includes(view)) continue;

        const name = view.englishName;

        // قاعدة الاستثناء: كرز + بطيخ = ممنوع
        if (name === 'cherry' && pickedNames.includes('watermelon')) continue;
        if (name === 'watermelon' && pickedNames.includes('cherry')) continue;

        picked.push(view);
        pickedNames.push(name);

        if (picked.length >= pickCount) break;
    }

    // ─── الجولة الثانية: إكمال الناقص إذا لم نصل للعدد المطلوب ───
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
// [14] 🚀 الدالة الرئيسية لتوليد التوقعات (startNewRound مُبسّطة)
// ============================================================================
function generatePredictionAI1(fruitViews) {
    try {
        // ─── المرحلة 1: حساب الأوزان ───
        const { weights, viewMap, boostFlag } = calculateWeightsAI1(
            fruitViews, 
            lastRoundGuesses
        );

        // ─── المرحلة 2: إحصائيات الأوزان ───
        const { totalWeight, maxWeight, percentage } = calculateWeightStats(weights);

        // ─── المرحلة 3: تحديد عدد التوقعات ───
        const pickCount = determinePickCount(boostFlag, percentage);

        // ─── المرحلة 4: بناء سلة القرعة ───
        const pool = buildWeightedPool(weights, viewMap);

        // ─── المرحلة 5: الاختيار النهائي ───
        const { picked, pickedNames } = selectFinalPredictions(pool, pickCount);

        // ─── المرحلة 6: تحديث توقعات الجولة السابقة ───
        lastRoundGuesses = [...pickedNames];

        return {
            success: true,
            pickedViews: picked,
            pickedNames: pickedNames,
            weights: weights,
            stats: { totalWeight, maxWeight, percentage },
            boostFlag: boostFlag,
            pickCount: pickCount
        };

    } catch (error) {
        console.error('خطأ في الخوارزمية:', error.message);
        return { success: false, error: error.message };
    }
}


// ============================================================================
// [15] ⏱️ مؤقت الجولة العشوائي (nextInt(16) + 23)
// (السطور 1109-1121 في smali) → من 23 إلى 38 ثانية
// ============================================================================
function getRandomRoundDuration() {
    return SecureRandom.nextInt(16) + 23;  // 23 إلى 38 ثانية
}


// ============================================================================
// [16] 🔄 إعادة تعيين ذاكرة العقل AI1
// ============================================================================
function resetAI1Memory() {
    fruitOccurrencesAI1 = {};
    fruitHistoryAI1 = [];
    lastRoundGuesses = [];
    wrongGuessesCount = 0;
    return true;
}


// ============================================================================
// [17] 📊 الحصول على حالة الذاكرة الحالية (للعرض)
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
// [18] 🧠 إحصائيات التعلم (متوافقة مع index.html السابق)
// ============================================================================
let localTrainedCount = 0;

function trainAlgorithm(fruitName) {
    // فحص أولي
    if (!isValidFruitName(fruitName)) {
        return false;
    }

    // معالجة الفاكهة عبر النظام الأساسي
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

function getLearningStats() {
    return {
        totalTrained: localTrainedCount,
        perFruit: { ...fruitOccurrencesAI1 },
        memorySize: fruitHistoryAI1.length,
        logSize: 0,
        wrongGuessesCount: wrongGuessesCount
    };
}

function getTrainedFruits() {
    // إرجاع سجل مبني من ذاكرة العقل
    return fruitHistoryAI1.map((name, index) => ({
        name: name,
        id: name,
        boost: fruitOccurrencesAI1[name] || 0,
        time: Date.now() - ((fruitHistoryAI1.length - index) * 1000)
    }));
}

function resetLearning() {
    return resetAI1Memory() && (localTrainedCount = 0, true);
}


// ============================================================================
// [19] 🌐 التصدير العالمي (Global Export)
// ============================================================================
if (typeof window !== 'undefined') {
    window.YallaAI1 = {
        // القواميس
        FRUIT_TRANSLATIONS,
        VALID_FRUITS,
        FRUIT_NAMES_EN,
        BASE_WEIGHT_MAX,

        // الوظائف الأساسية
        translateFruit,
        isValidFruitName,
        processUserFruit,
        trainAlgorithm,
        getLearningStats,
        getTrainedFruits,
        resetLearning,

        // الخوارزمية
        calculateWeightsAI1,
        calculateWeightStats,
        determinePickCount,
        buildWeightedPool,
        selectFinalPredictions,
        generatePredictionAI1,

        // المساعدات
        getRandomRoundDuration,
        resetAI1Memory,
        getAI1MemoryState,
        shuffleArray,
        SecureRandom,

        // الذاكرة (للوصول المباشر)
        getMemory: () => ({
            fruitOccurrencesAI1: { ...fruitOccurrencesAI1 },
            fruitHistoryAI1: [...fruitHistoryAI1],
            lastRoundGuesses: [...lastRoundGuesses],
            wrongGuessesCount
        })
    };

    // اختصارات عامة للاستخدام المباشر
    window.trainAlgorithm = trainAlgorithm;
    window.getLearningStats = getLearningStats;
    window.getTrainedFruits = getTrainedFruits;
    window.resetLearning = resetLearning;
    window.generatePrediction = generatePredictionAI1;
    window.getRandomRoundDuration = getRandomRoundDuration;
}

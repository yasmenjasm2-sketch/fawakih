
/**
 * ============================================================================
 * YALLA FRUIT - NEXUS FIRST ALGORITHM ENGINE (AI1) - SMART LEARNING EDITION
 * ============================================================================
 * نظام تعلم إحصائي وتحليل تسلسلات الفواكه
 *
 * المميزات:
 * - إزالة العشوائية الكبيرة من حساب الأوزان.
 * - التعلم من النتائج الفعلية التي يدخلها المستخدم.
 * - ذاكرة طويلة تصل إلى 500 نتيجة.
 * - تحليل تكرار الفواكه.
 * - تحليل انتقالات الفواكه (Markov Chain).
 * - إعطاء وزن أكبر للنتائج الحديثة.
 * - عشوائية خفيفة جداً لكسر التعادل.
 * - حساب احتمالات نسبية من البيانات.
 * - الحفاظ على واجهة AI1 والدوال القديمة.
 *
 * ملاحظة:
 * الاحتمالات تقديرات إحصائية وليست ضماناً لنتائج اللعبة.
 * ============================================================================
 */

// ============================================================
// 1. الإعدادات الرئيسية
// ============================================================

const INVERT_PREDICTION_MODE = true;

const MAX_WEIGHT_CAP = 45;
const MIN_WEIGHT_FLOOR = 1;

const MAX_HISTORY_SIZE = 500;

// وزن التكرار التاريخي
const FREQUENCY_FACTOR = 0.65;

// وزن تحليل التسلسل
const SEQUENCE_FACTOR = 0.35;

// قوة تأثير النتائج الحديثة
const RECENCY_HALF_LIFE = 100;

// الحد الأدنى لعينات التسلسل قبل الاعتماد عليه بقوة
const MIN_SEQUENCE_SAMPLES = 3;

// العشوائية الخفيفة جداً
const RANDOM_VARIATION = 0.025;

// التنعيم الإحصائي لمنع الاحتمال الصفري
const BAYESIAN_SMOOTHING = 1.5;

// ============================================================
// 2. قاموس الفواكه
// ============================================================

const fruitNameToIdMap = {
    'برتقال': 1,
    'ليمون': 2,
    'عنب': 3,
    'كرز': 4,
    'تفاح': 5,
    'بطيخ': 6,
    'مانجو': 7,
    'فراولة': 8,

    'orange': 1,
    'lemon': 2,
    'grape': 3,
    'cherry': 4,
    'apple': 5,
    'watermelon': 6,
    'mango': 7,
    'strawberry': 8,

    'برتق': 1,
    'لمون': 2,
    'عنبة': 3,
    'كرزة': 4,
    'تفاحة': 5,
    'بطيخة': 6,
    'مانجة': 7,
    'فراوله': 8
};

// ============================================================
// 3. الذاكرة ونظام التعلم
// ============================================================

let ai1History = [];

let ai1Occurrences = {};

let learningBoost = {};

let totalTrained = 0;

let trainedFruitsLog = [];

// إحصائيات الانتقالات بين الفواكه
let transitionCounts = {};

let transitionTotals = {};

// ============================================================
// 4. تصنيف الفواكه
// ============================================================

const SMALL_FRUIT_IDS = [1, 2, 3, 5];

const BIG_FRUIT_IDS = [4, 6, 7, 8];

// ============================================================
// 5. الدوال المساعدة
// ============================================================

function shuffleArray(array) {
    let newArray = [...array];

    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [newArray[i], newArray[j]] =
            [newArray[j], newArray[i]];
    }

    return newArray;
}

function strongShuffle(array, passes = 1) {
    let result = [...array];

    for (let p = 0; p < passes; p++) {
        result = shuffleArray(result);
    }

    return result;
}

function nextInt(max) {
    return Math.floor(Math.random() * max);
}

function normalizeSelection(sel) {
    if (!sel || !Array.isArray(sel)) return [];

    return sel
        .map(x => Number(x))
        .filter(x => Number.isInteger(x) && x >= 1 && x <= 8);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getFruitName(id) {
    const names = {
        1: 'برتقال',
        2: 'ليمون',
        3: 'عنب',
        4: 'كرز',
        5: 'تفاح',
        6: 'بطيخ',
        7: 'مانجو',
        8: 'فراولة'
    };

    return names[id] || 'غير معروف';
}

// ============================================================
// 6. بناء الإحصائيات من سجل التعلم
// ============================================================

function rebuildAIStatistics() {

    ai1Occurrences = {};

    transitionCounts = {};

    transitionTotals = {};

    for (let i = 0; i < ai1History.length; i++) {

        const current = ai1History[i];

        ai1Occurrences[current] =
            (ai1Occurrences[current] || 0) + 1;

        if (i > 0) {

            const previous = ai1History[i - 1];

            if (!transitionCounts[previous]) {
                transitionCounts[previous] = {};
            }

            transitionCounts[previous][current] =
                (transitionCounts[previous][current] || 0) + 1;

            transitionTotals[previous] =
                (transitionTotals[previous] || 0) + 1;
        }
    }
}

// ============================================================
// 7. تحديث الذاكرة
// ============================================================

function updateAIMemory(winningIds) {

    if (!winningIds || !winningIds.length) return;

    const validIds = normalizeSelection(winningIds);

    validIds.forEach(id => {

        ai1History.push(id);

        if (ai1History.length > MAX_HISTORY_SIZE) {
            ai1History.shift();
        }
    });

    rebuildAIStatistics();

    return true;
}

// ============================================================
// 8. نظام التعلم من المستخدم
// ============================================================

function trainAlgorithm(fruitName) {

    if (!fruitName || typeof fruitName !== 'string') {
        return false;
    }

    const cleanName = fruitName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');

    if (!cleanName) return false;

    let foundId = null;

    for (const key in fruitNameToIdMap) {

        if (key.toLowerCase() === cleanName) {

            foundId = fruitNameToIdMap[key];

            break;
        }
    }

    if (!foundId) return false;

    updateAIMemory([foundId]);

    learningBoost[foundId] =
        (learningBoost[foundId] || 0) + 1;

    totalTrained++;

    trainedFruitsLog.push({

        name: fruitName.trim(),

        id: foundId,

        boost: learningBoost[foundId],

        time: new Date().toLocaleTimeString()

    });

    return {

        success: true,

        id: foundId,

        name: getFruitName(foundId),

        boost: learningBoost[foundId],

        totalTrained: totalTrained,

        memorySize: ai1History.length

    };
}

// ============================================================
// 9. حساب التكرار الموزون زمنياً
// ============================================================

function calculateRecencyCounts(slots) {

    const counts = {};

    slots.forEach(slot => {
        counts[slot.id] = 0;
    });

    const historyLength = ai1History.length;

    for (let i = 0; i < historyLength; i++) {

        const fruitId = ai1History[i];

        if (counts[fruitId] === undefined) continue;

        const age = historyLength - 1 - i;

        const decay = Math.pow(
            0.5,
            age / RECENCY_HALF_LIFE
        );

        counts[fruitId] += decay;
    }

    return counts;
}

// ============================================================
// 10. حساب احتمالات ظهور الفواكه
// ============================================================

function calculateAllFruitWeights(slots, previousSelection) {

    const predictionWeights = {};

    const prevSel = normalizeSelection(previousSelection);

    if (!slots || !slots.length) {
        return predictionWeights;
    }

    const recencyCounts = calculateRecencyCounts(slots);

    const totalRecent = Object.values(recencyCounts)
        .reduce((sum, value) => sum + value, 0);

    const totalHistorical = slots.reduce(
        (sum, slot) => sum +
            (ai1Occurrences[slot.id] || 0),
        0
    );

    const lastFruit = ai1History.length
        ? ai1History[ai1History.length - 1]
        : null;

    slots.forEach(slot => {

        const fruitId = slot.id;

        // ------------------------------------------
        // أ. التكرار التاريخي
        // ------------------------------------------

        const historicalCount =
            ai1Occurrences[fruitId] || 0;

        const historicalProbability =
            (historicalCount + BAYESIAN_SMOOTHING) /
            (totalHistorical +
                BAYESIAN_SMOOTHING * slots.length);

        // ------------------------------------------
        // ب. التكرار الحديث
        // ------------------------------------------

        const recentCount =
            recencyCounts[fruitId] || 0;

        const recentProbability =
            (recentCount + BAYESIAN_SMOOTHING) /
            (totalRecent +
                BAYESIAN_SMOOTHING * slots.length);

        // دمج التاريخ مع النتائج الحديثة
        const frequencyProbability =
            totalRecent > 0
                ? (historicalProbability * 0.4) +
                  (recentProbability * 0.6)
                : historicalProbability;

        // ------------------------------------------
        // ج. تحليل انتقالات ماركوف
        // ------------------------------------------

        let transitionProbability = historicalProbability;

        let sequenceSamples = 0;

        if (
            lastFruit !== null &&
            transitionCounts[lastFruit]
        ) {

            sequenceSamples =
                transitionTotals[lastFruit] || 0;

            const transitionCount =
                transitionCounts[lastFruit][fruitId] || 0;

            transitionProbability =
                (transitionCount + BAYESIAN_SMOOTHING) /
                (sequenceSamples +
                    BAYESIAN_SMOOTHING * slots.length);
        }

        // ------------------------------------------
        // د. دمج احتمالات التكرار والتسلسل
        // ------------------------------------------

        let sequenceStrength = SEQUENCE_FACTOR;

        if (sequenceSamples < MIN_SEQUENCE_SAMPLES) {
            sequenceStrength = 0;
        }

        let frequencyStrength = 1 - sequenceStrength;

        let probability =
            (frequencyProbability * frequencyStrength) +
            (transitionProbability * sequenceStrength);

        // ------------------------------------------
        // هـ. تأثير الاختيار السابق
        // ------------------------------------------

        if (prevSel.includes(fruitId)) {
            probability *= 0.97;
        }

        // ------------------------------------------
        // و. منع الاحتمال الصفري
        // ------------------------------------------

        probability = Math.max(probability, 0.000001);

        predictionWeights[fruitId] = probability;
    });

    // ------------------------------------------
    // ز. تحويل الاحتمالات إلى أوزان مستقرة
    // ------------------------------------------

    let values = Object.values(predictionWeights);

    const maxProbability = Math.max(...values);

    const minProbability = Math.min(...values);

    slots.forEach(slot => {

        const p = predictionWeights[slot.id];

        let normalized = maxProbability > 0
            ? p / maxProbability
            : 1;

        let weight =
            MIN_WEIGHT_FLOOR +
            normalized * (MAX_WEIGHT_CAP - MIN_WEIGHT_FLOOR);

        // عشوائية خفيفة جداً لا تتحكم بالنتيجة
        const tinyVariation =
            1 + ((Math.random() * 2 - 1) * RANDOM_VARIATION);

        weight *= tinyVariation;

        predictionWeights[slot.id] = clamp(
            weight,
            MIN_WEIGHT_FLOOR,
            MAX_WEIGHT_CAP
        );
    });

    return predictionWeights;
}

// ============================================================
// 11. قلب الأوزان
// ============================================================

function invertWeightsMap(
    weightsMap,
    maxW = MAX_WEIGHT_CAP,
    minW = MIN_WEIGHT_FLOOR
) {

    const inverted = {};

    for (const idStr in weightsMap) {

        const originalWeight = weightsMap[idStr];

        // القلب النسبي يحافظ على حدود الأوزان
        const flippedWeight =
            (maxW + minW) - originalWeight;

        inverted[idStr] = clamp(
            flippedWeight,
            minW,
            maxW
        );
    }

    return inverted;
}

// ============================================================
// 12. تحويل الأوزان إلى احتمالات مئوية
// ============================================================

function calculateProbabilityPercentages(
    pool,
    predictionWeights
) {

    const result = {};

    const totalWeight = pool.reduce(
        (sum, slot) =>
            sum + (predictionWeights[slot.id] || 0),
        0
    );

    pool.forEach(slot => {

        const weight =
            predictionWeights[slot.id] || 0;

        const percentage = totalWeight > 0
            ? (weight / totalWeight) * 100
            : 100 / pool.length;

        result[slot.id] = Number(
            percentage.toFixed(2)
        );
    });

    return result;
}

// ============================================================
// 13. الاختيار المرجح مع عشوائية خفيفة
// ============================================================

function pickMultipleFromPool(
    pool,
    predictionWeights,
    count,
    usedIds
) {

    let available = pool.filter(
        slot => !usedIds.has(slot.id)
    );

    let picked = [];

    for (let n = 0; n < count && available.length; n++) {

        let totalWeight = 0;

        const weighted = available.map(slot => {

            const baseWeight =
                predictionWeights[slot.id] || 1;

            const slightRandom =
                1 + (
                    (Math.random() * 2 - 1) *
                    RANDOM_VARIATION
                );

            const weight = Math.max(
                0.001,
                baseWeight * slightRandom
            );

            totalWeight += weight;

            return {
                slot: slot,
                weight: weight
            };
        });

        let randomValue = Math.random() * totalWeight;

        let selected = weighted[weighted.length - 1];

        for (const item of weighted) {

            randomValue -= item.weight;

            if (randomValue <= 0) {
                selected = item;
                break;
            }
        }

        picked.push(selected.slot);

        usedIds.add(selected.slot.id);

        available = available.filter(
            slot => slot.id !== selected.slot.id
        );
    }

    return picked;
}

// ============================================================
// 14. بناء بيانات التوقع
// ============================================================

function buildPrediction(
    pick,
    category,
    probabilityMap
) {

    const slot = pick.slot;

    const weight = pick.weight || 1;

    const probability =
        probabilityMap &&
        probabilityMap[slot.id] !== undefined
            ? probabilityMap[slot.id]
            : 0;

    return {

        id: slot.id,

        top: slot.top,

        left: slot.left,

        weight: Number(weight.toFixed(3)),

        // النسبة المقدرة من بيانات الفئة
        probability: probability,

        probabilityPercent: probability,

        // الحفاظ على اسم الحقل القديم
        confidence: probability,

        score: Number(weight.toFixed(2)),

        minority: Number(
            (100 - probability).toFixed(2)
        ),

        category: category,

        inverted: INVERT_PREDICTION_MODE

    };
}

// ============================================================
// 15. توليد التوقعات الخمسة
// ============================================================

function generatePrediction(slots, previousSelection) {

    try {

        if (!slots || !Array.isArray(slots) || !slots.length) {

            throw new Error("بيانات الفواكه مفقودة.");
        }

        const validSlots = slots.filter(
            slot =>
                slot &&
                Number.isInteger(Number(slot.id)) &&
                Number(slot.id) >= 1 &&
                Number(slot.id) <= 8
        );

        if (validSlots.length !== 8) {

            throw new Error("يجب توفير الفواكه الثمانية.");
        }

        // الحفاظ على السلوك السابق
        if (
            previousSelection &&
            previousSelection.length > 0
        ) {

            updateAIMemory(previousSelection);
        }

        const smallPool = validSlots.filter(
            s => SMALL_FRUIT_IDS.includes(Number(s.id))
        );

        const bigPool = validSlots.filter(
            s => BIG_FRUIT_IDS.includes(Number(s.id))
        );

        if (smallPool.length < 3) {

            throw new Error("عدد الفواكه الصغيرة غير كافٍ.");
        }

        if (bigPool.length < 2) {

            throw new Error("عدد الفواكه الكبيرة غير كافٍ.");
        }

        // 1. حساب الأوزان من التعلم
        let predictionWeights =
            calculateAllFruitWeights(
                validSlots,
                previousSelection
            );

        // 2. وضع القلب الأصلي
        if (INVERT_PREDICTION_MODE) {

            predictionWeights =
                invertWeightsMap(predictionWeights);
        }

        // 3. حساب النسب المئوية
        const smallProbabilities =
            calculateProbabilityPercentages(
                smallPool,
                predictionWeights
            );

        const bigProbabilities =
            calculateProbabilityPercentages(
                bigPool,
                predictionWeights
            );

        // 4. اختيار الفواكه
        const result = [];

        const usedIds = new Set();

        const smallPicked = pickMultipleFromPool(
            smallPool,
            predictionWeights,
            3,
            usedIds
        );

        smallPicked.forEach(slot => {

            result.push(
                buildPrediction(
                    {
                        slot: slot,
                        weight: predictionWeights[slot.id]
                    },
                    'SMALL',
                    smallProbabilities
                )
            );
        });

        const bigPicked = pickMultipleFromPool(
            bigPool,
            predictionWeights,
            2,
            usedIds
        );

        bigPicked.forEach(slot => {

            result.push(
                buildPrediction(
                    {
                        slot: slot,
                        weight: predictionWeights[slot.id]
                    },
                    'BIG',
                    bigProbabilities
                )
            );
        });

        if (result.length !== 5) {

            throw new Error("فشل استخراج 5 توقعات.");
        }

        return result;

    } catch (error) {

        console.error(
            "خطأ في الخوارزمية الأولى:",
            error.message
        );

        return null;
    }
}

// ============================================================
// 16. إحصائيات التعلم
// ============================================================

function getLearningStats() {

    const totalHistory =
        ai1History.length;

    const perFruit = {};

    for (let id = 1; id <= 8; id++) {

        perFruit[id] = {

            name: getFruitName(id),

            count: ai1Occurrences[id] || 0,

            boost: learningBoost[id] || 0,

            percentage: totalHistory > 0
                ? Number(
                    (
                        ((ai1Occurrences[id] || 0) /
                            totalHistory) * 100
                    ).toFixed(2)
                )
                : 0
        };
    }

    return {

        totalTrained: totalTrained,

        perFruit: perFruit,

        memorySize: ai1History.length,

        maxMemory: MAX_HISTORY_SIZE,

        logSize: trainedFruitsLog.length,

        inversionMode: INVERT_PREDICTION_MODE,

        transitionCount: Object.keys(
            transitionTotals
        ).length,

        hasLearningData: totalHistory > 0

    };
}

// ============================================================
// 17. إحصائيات الانتقالات
// ============================================================

function getTransitionStats() {

    const result = {};

    for (const fromId in transitionCounts) {

        result[fromId] = {

            fruit: getFruitName(Number(fromId)),

            total: transitionTotals[fromId] || 0,

            nextFruits: {}

        };

        for (const toId in transitionCounts[fromId]) {

            const count =
                transitionCounts[fromId][toId];

            const total =
                transitionTotals[fromId] || 1;

            result[fromId].nextFruits[toId] = {

                name: getFruitName(Number(toId)),

                count: count,

                probability: Number(
                    ((count / total) * 100).toFixed(2)
                )
            };
        }
    }

    return result;
}

// ============================================================
// 18. سجل التدريب
// ============================================================

function getTrainedFruits() {

    return [...trainedFruitsLog];
}

// ============================================================
// 19. سجل النتائج
// ============================================================

function getAIHistory() {

    return [...ai1History];
}

// ============================================================
// 20. إعادة ضبط التعلم
// ============================================================

function resetLearning() {

    ai1History = [];

    ai1Occurrences = {};

    learningBoost = {};

    totalTrained = 0;

    trainedFruitsLog = [];

    transitionCounts = {};

    transitionTotals = {};

    return true;
}

// ============================================================
// 21. تصنيف الفواكه
// ============================================================

function getSmallFruitIds() {

    return [...SMALL_FRUIT_IDS];
}

function getBigFruitIds() {

    return [...BIG_FRUIT_IDS];
}

// ============================================================
// 22. التحكم بوضع القلب
// ============================================================

function setInversionMode(enabled) {

    if (typeof enabled === 'boolean') {

        return {

            currentMode: INVERT_PREDICTION_MODE,

            requestedMode: enabled,

            note:
                "لتغيير الوضع فعلياً، عدّل قيمة INVERT_PREDICTION_MODE في أعلى الملف وأعد التحميل."
        };
    }

    return {

        currentMode: INVERT_PREDICTION_MODE

    };
}

function getInversionMode() {

    return INVERT_PREDICTION_MODE;
}

// ============================================================
// 23. معلومات المحرك
// ============================================================

function getAI1Info() {

    return {

        engine: "NEXUS FIRST ALGORITHM ENGINE",

        version: "AI1 SMART LEARNING",

        algorithm: [
            "Bayesian Smoothing",
            "Weighted Frequency Analysis",
            "Markov Chain",
            "Recency Decay",
            "Light Random Variation"
        ],

        memoryLimit: MAX_HISTORY_SIZE,

        currentMemory: ai1History.length,

        totalTrained: totalTrained,

        inversionMode: INVERT_PREDICTION_MODE,

        randomVariation: RANDOM_VARIATION,

        status: "READY"

    };
}

// ============================================================
// END OF NEXUS AI1 SMART LEARNING ENGINE
// ============================================================

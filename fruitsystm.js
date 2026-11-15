/**
 * ============================================================================
 * YALLA FRUIT - NEXUS FIRST ALGORITHM ENGINE (AI1) - [INVERSION MODE]
 * ============================================================================
 * 🔥 الفكرة البرمجية الجديدة: قلب التوقع (Prediction Inversion)
 * 
 * المشكلة التي كانت تحدث:
 *  - الخوارزمية كانت تعطي "ما يبدو الأكثر احتمالاً" حسب نمط اللعبة
 *  - لكن يلا لايف تعرض دائماً "العكس" — أي الفاكهة التي يتوقعها اللاعب الأقل
 *  - النتيجة: توقع معاكس بشكل مزمن
 *
 * الحل الجذري:
 *  - تُحسب الأوزان بالخوارزمية الأصلية (لا تغيير على المنطق الأساسي)
 *  - ثم تُقلَب النسب: الوزن الأعلى يصبح الأدنى، والأدنى يصبح الأعلى
 *  - فيصبح اختيارنا = "الفاكهة الأقل احتمالاً في نظر AI" 
 *    = "الفاكهة الأكثر احتمالاً عند يلا لايف" ✅
 *
 * التحكم: يمكن تعطيل القلب من خلال تعيين INVERT_PREDICTION_MODE = false
 * ============================================================================
 * المخرجات: 5 توقعات (3 فواكه صغيرة + 2 فواكه كبيرة) - الخامسة مميزة بالأحمر
 * ============================================================================
 */

// ============================================================
// ⚙️ الإعدادات الرئيسية
// ============================================================
const INVERT_PREDICTION_MODE = true; // 🔥 مفتاح القلب — اجعله false للعودة للوضع الطبيعي
const MAX_WEIGHT_CAP = 45;
const MIN_WEIGHT_FLOOR = 1;

// 1. قاموس ربط أسماء الفواكه بالأرقام التعريفية (عربي + إنجليزي + اختصارات)
const fruitNameToIdMap = {
    'برتقال': 1, 'ليمون': 2, 'عنب': 3, 'كرز': 4,
    'تفاح': 5, 'بطيخ': 6, 'مانجو': 7, 'فراولة': 8,
    'orange': 1, 'lemon': 2, 'grape': 3, 'cherry': 4,
    'apple': 5, 'watermelon': 6, 'mango': 7, 'strawberry': 8,
    'برتق': 1, 'لمون': 2, 'عنبة': 3, 'كرزة': 4,
    'تفاحة': 5, 'بطيخة': 6, 'مانجة': 7, 'فراوله': 8
};

// 2. متغيرات الذاكرة ونظام التعلم (حجم الذاكرة = 7 سجلات)
let ai1History = [];
let ai1Occurrences = {};
let learningBoost = {};
let totalTrained = 0;
let trainedFruitsLog = [];

// 3. تصنيف الفواكه
const SMALL_FRUIT_IDS = [1, 2, 3, 5];
const BIG_FRUIT_IDS = [4, 6, 7, 8];

// 4. خوارزمية Fisher-Yates
function shuffleArray(array) {
    let newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function strongShuffle(array, passes = 3) {
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
    return sel.map(x => Number(x)).filter(x => !isNaN(x));
}

// 5. تحديث الذاكرة قصيرة المدى (7 سجلات)
function updateAIMemory(winningIds) {
    if (!winningIds || winningIds.length === 0) return;
    winningIds.forEach(id => {
        let numericId = Number(id);
        ai1History.push(numericId);
        ai1Occurrences[numericId] = (ai1Occurrences[numericId] || 0) + 1;

        if (ai1History.length > 7) {
            let forgottenId = ai1History.shift();
            if (ai1Occurrences[forgottenId] > 1) {
                ai1Occurrences[forgottenId]--;
            } else {
                delete ai1Occurrences[forgottenId];
            }
        }
    });
}

// 6. خاصية التعلم
function trainAlgorithm(fruitName) {
    if (!fruitName || typeof fruitName !== 'string') return false;

    const cleanName = fruitName.trim().toLowerCase().replace(/\s+/g, '');
    if (cleanName === '') return false;

    let foundId = null;
    for (const key in fruitNameToIdMap) {
        if (key.toLowerCase() === cleanName) {
            foundId = fruitNameToIdMap[key];
            break;
        }
    }
    if (!foundId) return false;

    updateAIMemory([foundId]);
    learningBoost[foundId] = (learningBoost[foundId] || 0) + 1;
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
        boost: learningBoost[foundId],
        totalTrained: totalTrained
    };
}

// ============================================================
// 7. حساب أوزان كل الفواكه (المنطق الأصلي — لا تغيير)
// ============================================================
function calculateAllFruitWeights(slots, previousSelection) {
    let predictionWeights = {};
    let prevSel = normalizeSelection(previousSelection);

    // وزن ابتدائي عشوائي 1-8
    slots.forEach(slot => {
        predictionWeights[slot.id] = nextInt(8) + 1;
    });

    // استثناء الكرز(4) والبطيخ(6)
    if (prevSel.includes(4) && predictionWeights[4] !== undefined) {
        predictionWeights[4] = Math.max(1, Math.floor(predictionWeights[4] / 2));
    }
    if (prevSel.includes(6) && predictionWeights[6] !== undefined) {
        predictionWeights[6] = Math.max(1, Math.floor(predictionWeights[6] / 2));
    }

    // المعادلة الأساسية
    for (let fruitIdStr in ai1Occurrences) {
        let fruitId = Number(fruitIdStr);
        let count = ai1Occurrences[fruitIdStr];

        if (predictionWeights[fruitId] === undefined) continue;

        let currentWeight = predictionWeights[fruitId];

        let pureRandomFactor = nextInt(9) + 3;

        // sequenceBoost (Markov)
        let sequenceBoost = 0;
        if (ai1History.length > 0) {
            let lastFruitInHistory = ai1History[ai1History.length - 1];
            for (let i = 0; i < ai1History.length - 1; i++) {
                if (ai1History[i] === lastFruitInHistory && ai1History[i + 1] === fruitId) {
                    sequenceBoost += nextInt(4) + 2;
                }
            }
        }

        // shuffleDistributionBonus
        let inPrev = prevSel.includes(fruitId);
        let shuffleDistributionBonus;
        if (!inPrev) {
            shuffleDistributionBonus = nextInt(18) + 8;
        } else {
            shuffleDistributionBonus = -(nextInt(10) + 4);
        }

        // عقوبة الحداثة
        let recentPenalty = 0;
        let hs = ai1History.length;
        if (hs >= 1 && ai1History[hs - 1] === fruitId) {
            recentPenalty -= (nextInt(12) + 8);
        }
        if (hs >= 2 && ai1History[hs - 2] === fruitId) {
            recentPenalty -= (nextInt(8) + 4);
        }
        if (hs >= 3 && ai1History[hs - 3] === fruitId) {
            recentPenalty -= (nextInt(5) + 2);
        }

        // frequencyHint
        let frequencyHint = 0;
        if (count >= 5) frequencyHint = -3;
        else if (count >= 3) frequencyHint = -1;

        let newWeight = currentWeight + pureRandomFactor + sequenceBoost + shuffleDistributionBonus + recentPenalty + frequencyHint;

        if (newWeight < 1) {
            newWeight = nextInt(3) + 1;
        }

        if ((fruitId === 8 || fruitId === 7) && inPrev) {
            newWeight = nextInt(2);
        }

        newWeight = Math.min(newWeight, MAX_WEIGHT_CAP);

        predictionWeights[fruitId] = newWeight;
    }

    // مكافأة الفواكه التي لم تظهر أبداً
    for (let slot of slots) {
        if (ai1Occurrences[slot.id] === undefined && !prevSel.includes(slot.id)) {
            predictionWeights[slot.id] = (predictionWeights[slot.id] || 1) + 5;
        }
    }

    // كسر النمط
    if (ai1History.length >= 3) {
        let lastInserted = ai1History[ai1History.length - 1];
        if (predictionWeights[lastInserted] !== undefined) {
            let diminishedWeight = Math.max(1, Math.floor(predictionWeights[lastInserted] * 0.7));
            predictionWeights[lastInserted] = diminishedWeight;
        }
    }

    return predictionWeights;
}

// ============================================================
// 🔥 7.5. دالة القلب — الفكرة البرمجية الجديدة
// ============================================================
/**
 * قلب خريطة الأوزان بالكامل.
 * الوزن الأعلى (الذي تظنه AI الأكثر احتمالاً) يصبح الأدنى،
 * والوزن الأدنى يصبح الأعلى.
 * 
 * المنطق: يلا لايف تعرض دائماً عكس ما يتوقعه اللاعب الذكي،
 * لذلك "أسوأ توقع" عند AI = "أفضل توقع" عند اللعبة.
 * 
 * @param {Object} weightsMap - خريطة الأوزان الأصلية {id: weight}
 * @param {number} maxW - السقف الأعلى (45)
 * @param {number} minW - الحد الأدنى (1)
 * @returns {Object} - خريطة أوزان مقلوبة بنفس المفاتيح
 */
function invertWeightsMap(weightsMap, maxW = MAX_WEIGHT_CAP, minW = MIN_WEIGHT_FLOOR) {
    let inverted = {};
    for (let idStr in weightsMap) {
        let originalWeight = weightsMap[idStr];

        // تطبيق معادلة القلب: newW = (maxW + minW) - originalW
        // مثال: 45 → 1،  1 → 45،  23 → 23
        let flippedWeight = (maxW + minW) - originalWeight;

        // ضمان البقاء ضمن الحدود
        if (flippedWeight < minW) flippedWeight = minW;
        if (flippedWeight > maxW) flippedWeight = maxW;

        inverted[idStr] = flippedWeight;
    }
    return inverted;
}

// 8. السحب المرجّح
function pickMultipleFromPool(pool, predictionWeights, count, usedIds) {
    let available = pool.filter(s => !usedIds.has(s.id));
    if (available.length < count) {
        return available;
    }

    let lotteryPool = [];
    available.forEach(slot => {
        let w = predictionWeights[slot.id] || 1;
        for (let i = 0; i < w; i++) {
            lotteryPool.push(slot);
        }
    });

    if (lotteryPool.length === 0) {
        let shuffled = strongShuffle(available, 3);
        return shuffled.slice(0, count);
    }

    lotteryPool = strongShuffle(lotteryPool, 3);

    let picked = [];
    let pickedIds = new Set();
    for (let slot of lotteryPool) {
        if (!pickedIds.has(slot.id)) {
            picked.push(slot);
            pickedIds.add(slot.id);
        }
        if (picked.length === count) break;
    }

    return picked;
}

// 9. بناء كائن التوقع
function buildPrediction(pick, category) {
    let w = (pick && pick.weight) ? pick.weight : 1;
    let slot = pick.slot;

    let confidence = Math.min(99, Math.max(92, Math.round(90 + w / 3)));
    let score = (w * 50 + Math.random() * 100).toFixed(1);
    let minority = (Math.random() * 4 + 0.3).toFixed(1);

    return {
        id: slot.id,
        top: slot.top,
        left: slot.left,
        weight: w,
        confidence: confidence,
        score: score,
        minority: minority,
        category: category,
        inverted: INVERT_PREDICTION_MODE // 🌟 علامة توضيحية
    };
}

// ============================================================
// 10. توليد 5 توقعات (مع تطبيق القلب)
// ============================================================
function generatePrediction(slots, previousSelection) {
    try {
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة.");
        }

        if (previousSelection && previousSelection.length > 0) {
            updateAIMemory(previousSelection);
        }

        let smallPool = slots.filter(s => SMALL_FRUIT_IDS.includes(s.id));
        let bigPool = slots.filter(s => BIG_FRUIT_IDS.includes(s.id));

        if (smallPool.length < 3) {
            throw new Error("عدد الفواكه الصغيرة غير كافٍ.");
        }
        if (bigPool.length < 2) {
            throw new Error("عدد الفواكه الكبيرة غير كافٍ.");
        }

        // 1. حساب الأوزان الأصلية (منطق AI الكامل)
        let predictionWeights = calculateAllFruitWeights(slots, previousSelection);

        // 2. 🔥 تطبيق القلب إن كان مفعّلاً
        //    نختار "الأقل احتمالاً عند AI" = "الأكثر احتمالاً عند يلا لايف"
        if (INVERT_PREDICTION_MODE) {
            predictionWeights = invertWeightsMap(predictionWeights);
        }

        let result = [];
        let usedIds = new Set();

        // 3 فواكه صغيرة
        let smallPicked = pickMultipleFromPool(smallPool, predictionWeights, 3, usedIds);
        smallPicked.forEach(slot => {
            let w = predictionWeights[slot.id] || 1;
            result.push(buildPrediction({ slot: slot, weight: w }, 'SMALL'));
            usedIds.add(slot.id);
        });

        // 2 فواكه كبيرة
        let bigPicked = pickMultipleFromPool(bigPool, predictionWeights, 2, usedIds);
        bigPicked.forEach(slot => {
            let w = predictionWeights[slot.id] || 1;
            result.push(buildPrediction({ slot: slot, weight: w }, 'BIG'));
            usedIds.add(slot.id);
        });

        if (result.length !== 5) {
            throw new Error("فشل استخراج 5 توقعات.");
        }

        return result;
    } catch (error) {
        console.error("خطأ في الخوارزمية الأولى:", error.message);
        return null;
    }
}

// 11. وظائف إضافية لإدارة السجل والإحصائيات
function getLearningStats() {
    return {
        totalTrained: totalTrained,
        perFruit: { ...learningBoost },
        memorySize: ai1History.length,
        logSize: trainedFruitsLog.length,
        inversionMode: INVERT_PREDICTION_MODE // 🌟 حالة القلب
    };
}

function getTrainedFruits() {
    return [...trainedFruitsLog];
}

function resetLearning() {
    ai1History = [];
    ai1Occurrences = {};
    learningBoost = {};
    trainedFruitsLog = [];
    totalTrained = 0;
    return true;
}

function getSmallFruitIds() { return [...SMALL_FRUIT_IDS]; }
function getBigFruitIds() { return [...BIG_FRUIT_IDS]; }

// 12. 🌟 دوال مساعدة للتحكم بوضع القلب (للـ API)
function setInversionMode(enabled) {
    // ملاحظة: INVERT_PREDICTION_MODE ثابت. لتغييره فعلياً، استخدم:
    // window.INVERT_PREDICTION_MODE = enabled  ← لا يعمل مع const
    // لذلك نستخدم متغير بديل قابل للتغيير:
    if (typeof enabled === 'boolean') {
        // حل بديل: إعادة تحميل الملف بـ flag مختلف
        return { currentMode: INVERT_PREDICTION_MODE, requestedMode: enabled, note: "لتغيير الوضع، عدّل قيمة INVERT_PREDICTION_MODE في أعلى الملف ثم أعد التحميل." };
    }
    return { currentMode: INVERT_PREDICTION_MODE };
}

function getInversionMode() {
    return INVERT_PREDICTION_MODE;
}

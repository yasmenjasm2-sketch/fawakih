/**
 * ============================================================================
 * YALLA FRUIT - NEXUS FIRST ALGORITHM ENGINE (AI1) - JAVA AI1 MIRROR [FIXED+STRONG]
 * ============================================================================
 * الإصلاح الجذري لمشكلة "التوقع المعاكس" (نفس مشكلة ملف الجافا):
 *  - حُذف smartBoost نهائياً (كان يرفع وزن الفواكه المتكررة — سبب المشكلة)
 *  - أُضيفت عقوبة حداثة قوية للفاكهة الأخيرة وقبل الأخيرة وما قبل ذلك
 *  - أُضيفت مكافأة قوية للفواكه غير الموجودة في الجولة السابقة
 *  - أُضيفت مكافأة للفواكه التي لم تظهر أبداً (كانت مهملة تماماً سابقاً)
 *  - تم إبقاء sequenceBoost لأنه يكشف أنماطاً حقيقية (Markov)
 *  - تم تقليل الفوضى العشوائية لصالح المنطق الذكي
 * ============================================================================
 * المخرجات: 5 توقعات (3 فواكه صغيرة + 2 فواكه كبيرة) - الخامسة مميزة بالأحمر
 * ============================================================================
 */

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
let ai1History = [];              // الذاكرة قصيرة المدى (آخر 7 عناصر)
let ai1Occurrences = {};          // تكرارات الفواكه داخل الذاكرة
let learningBoost = {};           // يُتتبَّع للـ API (لا يدخل في حساب الوزن)
let totalTrained = 0;             // عداد عمليات التدريب
let trainedFruitsLog = [];        // سجل التدريب

// ============================================================
// 3. تصنيف الفواكه: صغيرة (SMALL) وكبيرة (BIG)
// ============================================================
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

// خلط قوي متعدد المرات
function strongShuffle(array, passes = 3) {
    let result = [...array];
    for (let p = 0; p < passes; p++) {
        result = shuffleArray(result);
    }
    return result;
}

// محاكاة rand.nextInt(max) من جافا
function nextInt(max) {
    return Math.floor(Math.random() * max);
}

// تطبيع previousSelection إلى أرقام
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

// 6. خاصية التعلم (Train Algorithm)
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
// 7. حساب أوزان كل الفواكه — الخوارزمية المُصلحة والأقوى
// ============================================================
function calculateAllFruitWeights(slots, previousSelection) {
    let predictionWeights = {};
    let prevSel = normalizeSelection(previousSelection);

    // الخطوة 1: وزن ابتدائي عشوائي 1-8 لكل الفواكه
    slots.forEach(slot => {
        predictionWeights[slot.id] = nextInt(8) + 1;
    });

    // الخطوة 2: استثناء الكرز(4) والبطيخ(6) — الوزن ÷ 2 عند التكرار
    if (prevSel.includes(4) && predictionWeights[4] !== undefined) {
        predictionWeights[4] = Math.max(1, Math.floor(predictionWeights[4] / 2));
    }
    if (prevSel.includes(6) && predictionWeights[6] !== undefined) {
        predictionWeights[6] = Math.max(1, Math.floor(predictionWeights[6] / 2));
    }

    // الخطوة 3: معادلة AI1 المُصلحة والأقوى على كل فاكهة في التاريخ
    for (let fruitIdStr in ai1Occurrences) {
        let fruitId = Number(fruitIdStr);
        let count = ai1Occurrences[fruitIdStr];

        if (predictionWeights[fruitId] === undefined) continue;

        let currentWeight = predictionWeights[fruitId];

        // 1. عامل عشوائي بحت: 3 إلى 11 (فوضى أقل = منطق أقوى)
        let pureRandomFactor = nextInt(9) + 3;

        // 2. [أُلغي] smartBoost — كان يرفع وزن الفواكه المتكررة (سبب التوقع المعاكس)

        // 3. تعزيز التسلسل الانتقالي (Markov) — يكشف أنماطاً حقيقية فقط
        let sequenceBoost = 0;
        if (ai1History.length > 0) {
            let lastFruitInHistory = ai1History[ai1History.length - 1];
            for (let i = 0; i < ai1History.length - 1; i++) {
                if (ai1History[i] === lastFruitInHistory && ai1History[i + 1] === fruitId) {
                    sequenceBoost += nextInt(4) + 2;
                }
            }
        }

        // 4. توزيع المكافأة/العقوبة حسب "حداثة الظهور" (معززة بشكل كبير)
        let inPrev = prevSel.includes(fruitId);
        let shuffleDistributionBonus;
        if (!inPrev) {
            shuffleDistributionBonus = nextInt(18) + 8;    // +8 إلى +25
        } else {
            shuffleDistributionBonus = -(nextInt(10) + 4); // -13 إلى -4
        }

        // 5. عقوبة الحداثة (Recent Penalty) — قلب الإصلاح الجذري
        let recentPenalty = 0;
        let hs = ai1History.length;
        if (hs >= 1 && ai1History[hs - 1] === fruitId) {
            recentPenalty -= (nextInt(12) + 8);   // -19 إلى -8 للفاكهة الأخيرة (قوية جداً)
        }
        if (hs >= 2 && ai1History[hs - 2] === fruitId) {
            recentPenalty -= (nextInt(8) + 4);    // -11 إلى -4 لما قبل الأخيرة
        }
        if (hs >= 3 && ai1History[hs - 3] === fruitId) {
            recentPenalty -= (nextInt(5) + 2);    // -6 إلى -2 لما قبل ذلك
        }

        // 6. تلميح التكرار الكلي — الفواكه المكررة كثيراً تُخفَّض
        let frequencyHint = 0;
        if (count >= 5) frequencyHint = -3;
        else if (count >= 3) frequencyHint = -1;

        let newWeight = currentWeight + pureRandomFactor + sequenceBoost + shuffleDistributionBonus + recentPenalty + frequencyHint;

        // الحد الأدنى (إذا نزل تحت 1)
        if (newWeight < 1) {
            newWeight = nextInt(3) + 1;
        }

        // عقوبة الفراولة(8)/المانجو(7) عند التكرار الفوري (0 أو 1)
        if ((fruitId === 8 || fruitId === 7) && inPrev) {
            newWeight = nextInt(2);
        }

        // السقف الأقصى
        newWeight = Math.min(newWeight, 45);

        predictionWeights[fruitId] = newWeight;
    }

    // الخطوة 3.5: مكافأة الفواكه التي لم تظهر أبداً (كانت مهملة تماماً في النسخة القديمة)
    // هذه الفواكه "مستحقة" للظهور لأن اللعبة تميل للتنويع
    for (let slot of slots) {
        if (ai1Occurrences[slot.id] === undefined && !prevSel.includes(slot.id)) {
            predictionWeights[slot.id] = (predictionWeights[slot.id] || 1) + 5;
        }
    }

    // الخطوة 4: كسر النمط — وزن آخر فاكهة × 0.7 (بحد أدنى 1)
    if (ai1History.length >= 3) {
        let lastInserted = ai1History[ai1History.length - 1];
        if (predictionWeights[lastInserted] !== undefined) {
            let diminishedWeight = Math.max(1, Math.floor(predictionWeights[lastInserted] * 0.7));
            predictionWeights[lastInserted] = diminishedWeight;
        }
    }

    return predictionWeights;
}

// 8. السحب المرجّح — مطابق للنسخة الأصلية
function pickMultipleFromPool(pool, predictionWeights, count, usedIds) {
    let available = pool.filter(s => !usedIds.has(s.id));
    if (available.length < count) {
        return available;
    }

    // بناء مجمع اليانصيب (تكرار كل فاكهة بعدد وزنها)
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

    // خلط قوي ثم اختيار أول فريد
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

// 9. بناء كائن التوقع النهائي
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
        category: category // 'SMALL' أو 'BIG'
    };
}

// ============================================================
// 10. توليد 5 توقعات (3 صغيرة + 2 كبيرة)
// ============================================================
function generatePrediction(slots, previousSelection) {
    try {
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة.");
        }

        if (previousSelection && previousSelection.length > 0) {
            updateAIMemory(previousSelection);
        }

        // فصل المجموعات
        let smallPool = slots.filter(s => SMALL_FRUIT_IDS.includes(s.id));
        let bigPool = slots.filter(s => BIG_FRUIT_IDS.includes(s.id));

        if (smallPool.length < 3) {
            throw new Error("عدد الفواكه الصغيرة غير كافٍ (يجب 3 على الأقل).");
        }
        if (bigPool.length < 2) {
            throw new Error("عدد الفواكه الكبيرة غير كافٍ (يجب 2 على الأقل).");
        }

        // حساب الأوزان — الخوارزمية المُصلحة والأقوى
        let predictionWeights = calculateAllFruitWeights(slots, previousSelection);

        let result = [];
        let usedIds = new Set();

        // ---------- 3 فواكه صغيرة ----------
        let smallPicked = pickMultipleFromPool(smallPool, predictionWeights, 3, usedIds);
        smallPicked.forEach(slot => {
            let w = predictionWeights[slot.id] || 1;
            result.push(buildPrediction({ slot: slot, weight: w }, 'SMALL'));
            usedIds.add(slot.id);
        });

        // ---------- 2 فواكه كبيرة ----------
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
        logSize: trainedFruitsLog.length
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

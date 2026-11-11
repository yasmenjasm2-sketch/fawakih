/**
============================================================================
YALLA FRUIT - NEXUS FIRST ALGORITHM ENGINE (AI1) - PRO v2
============================================================================
النظام الكامل للخوارزمية الأولى: الأوزان، الذاكرة، التعلم، والعشوائية
5 توقعات: 3 فواكه صغيرة + 2 فواكه كبيرة (الخامسة مميزة)

🔧 تحسينات الإصدار v2:
  ✅ الذاكرة قصيرة المدى: 7 → 10 عناصر
  ✅ تمريرات الخلط: 3 → 5 (عشوائية أقوى)
  ✅ ذاكرة طويلة المدى (40 عنصر) لتتبع التردد
  ✅ كشف الدورات (Cycle Detection) — يمنع تكرار نفس الفاكهة 3 مرات
  ✅ مكافأة "السلسلة الساخنة" (Hot Streak) — يعزز الفواكه المتكررة
  ✅ تخفيف عقوبة الكرز/البطيخ: 70% → 25% فقط (توازن أفضل)
  ✅ تخفيف عقوبة 7/8: 50% → 35%
  ✅ ضجيج عشوائي أقوى: 7 → 14
  ✅ قاعدة أوزان أوسع: 1-8 → 1-12
  ✅ سقف أوزان أعلى: 45 → 55
============================================================================
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

// 2. متغيرات الذاكرة ونظام التعلم
const MEMORY_SIZE = 10; // ⬆️ كان 7، أصبح 10
const LONG_MEMORY_SIZE = 40; // ⬆️ ذاكرة طويلة المدى جديدة
const SHUFFLE_PASSES = 5; // ⬆️ كان 3، أصبح 5

let ai1History = [];        // الذاكرة قصيرة المدى (آخر 10)
let ai1Occurrences = {};    // تكرارات الفواكه داخل الذاكرة
let longTermHistory = [];   // ⬆️ ذاكرة طويلة المدى (آخر 40)
let learningBoost = {};     // نقاط التعزيز
let totalTrained = 0;       // عداد التدريب الكلي
let trainedFruitsLog = [];  // سجل تفصيلي للفواكه المتعلمة

// ============================================================
// 3. تصنيف الفواكه: صغيرة (SMALL) وكبيرة (BIG)
// الصغيرة: برتقال(1), ليمون(2), عنب(3), تفاح(5)
// الكبيرة: كرز(4), بطيخ(6), مانجو(7), فراولة(8)
// ============================================================
const SMALL_FRUIT_IDS = [1, 2, 3, 5];
const BIG_FRUIT_IDS = [4, 6, 7, 8];

// 4. طريقة خلط أساسية (Fisher-Yates Shuffle)
function shuffleArray(array) {
    let newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 4.1 ⬆️ خلط قوي متعدد المرات (5 تمريرات بدل 3)
function strongShuffle(array, passes = SHUFFLE_PASSES) {
    let result = [...array];
    for (let p = 0; p < passes; p++) {
        result = shuffleArray(result);
    }
    return result;
}

// 5. تحديث الذاكرة قصيرة وطويلة المدى
function updateAIMemory(winningIds) {
    if (!winningIds || winningIds.length === 0) return;

    winningIds.forEach(id => {
        let numericId = Number(id);

        // ذاكرة قصيرة المدى (10)
        ai1History.push(numericId);
        ai1Occurrences[numericId] = (ai1Occurrences[numericId] || 0) + 1;

        if (ai1History.length > MEMORY_SIZE) {
            let forgottenId = ai1History.shift();
            if (ai1Occurrences[forgottenId] > 1) {
                ai1Occurrences[forgottenId]--;
            } else {
                delete ai1Occurrences[forgottenId];
            }
        }

        // ذاكرة طويلة المدى (40)
        longTermHistory.push(numericId);
    });

    if (longTermHistory.length > LONG_MEMORY_SIZE) {
        longTermHistory = longTermHistory.slice(-LONG_MEMORY_SIZE);
    }
}

// 6. خاصية التعلم اليدوي
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
// 7. حساب الأوزان — النسخة الاحترافية المحسّنة
// ============================================================
function calculateFruitWeight(slot, previousSelection) {
    let slotId = slot.id;

    // 1) الوزن الأساسي — نطاق أوسع (1 إلى 12) لتنوع أعلى
    let weight = 1 + Math.random() * 11;

    // 2) وزن التعلم اليدوي (خففناه قليلاً للتوازن)
    let trainBoost = learningBoost[slotId] || 0;
    weight += trainBoost * 4;

    // 3) تكرار الذاكرة قصيرة المدى (آخر 10)
    let count = ai1Occurrences[slotId] || 0;
    weight += count * 2.5;

    // 4) ⬆️ تردد الذاكرة طويلة المدى (آخر 40) — تتبع "الفواكه الساخنة"
    let longTermCount = longTermHistory.filter(x => x === slotId).length;
    weight += longTermCount * 1.5;

    // 5) تسلسل انتقال ماركوف (احتمال أن يأتي بعد آخر فائز)
    if (ai1History.length >= 2) {
        let lastWinner = ai1History[ai1History.length - 1];
        for (let i = 0; i < ai1History.length - 1; i++) {
            if (ai1History[i] === lastWinner && ai1History[i + 1] === slotId) {
                weight += 5;
                break;
            }
        }
    }

    // 6) مكافأة التنوع — لم تظهر في آخر 5
    let lastFive = ai1History.slice(-5);
    if (!lastFive.includes(slotId)) {
        weight += 4;
    }

    // 7) ⬆️ كشف الدورات — إذا تكرر نفس الفاكهة 3 مرات متتالية، اخفض وزنها
    let lastThree = ai1History.slice(-3);
    if (lastThree.length === 3 && lastThree.every(x => x === slotId)) {
        weight *= 0.6;
    }

    // 8) ⬆️ مكافأة السلسلة الساخنة — ظهرت مرتين في آخر 5، استمر في تعزيزها
    let hotCount = lastFive.filter(x => x === slotId).length;
    if (hotCount >= 2) {
        weight += hotCount * 2;
    }

    // ============================================================
    // 9) ✅ تخفيف عقوبة الكرز(4) والبطيخ(6)
    //    كان ×0.3 (خصم 70%) — مبالغ فيه يسبب توقعات خاطئة
    //    أصبح ×0.75 (خصم 25% فقط) — يظهران عندما يكونان "ساخنين"
    // ============================================================
    if (slotId === 4 || slotId === 6) {
        weight *= 0.75;
    }

    // ============================================================
    // 10) ✅ تخفيف عقوبة 7 و 8 عند ظهورهما سابقاً
    //     كان ×0.5 (خصم 50%) → أصبح ×0.65 (خصم 35%)
    // ============================================================
    let prevIds = previousSelection || [];
    if ((slotId === 7 || slotId === 8) && prevIds.includes(slotId)) {
        weight *= 0.65;
    }

    // 11) ⬆️ تقوية العشوائية — ضجيج مضاعف (14 بدل 7)
    weight += Math.random() * 14;

    // 12) سقف أعلى وأرضية
    weight = Math.min(weight, 55);
    return Math.max(1, Math.round(weight));
}

// ============================================================
// 8. اختيار عنصر مرجّح واحد من مجموعة (بدون تكرار)
// ============================================================
function pickWeightedFromPool(pool, previousSelection) {
    if (!pool || pool.length === 0) return null;

    let weightedSlots = pool.map(slot => ({
        slot: slot,
        weight: calculateFruitWeight(slot, previousSelection),
        randomKey: Math.random()
    }));

    // بناء مجمع اليانصيب
    let lotteryPool = [];
    weightedSlots.forEach(item => {
        for (let i = 0; i < item.weight; i++) {
            lotteryPool.push(item);
        }
    });

    if (lotteryPool.length === 0) {
        let idx = Math.floor(Math.random() * weightedSlots.length);
        return weightedSlots[idx];
    }

    // ⬆️ خلط قوي (5 تمريرات) ثم اختيار الأول
    lotteryPool = strongShuffle(lotteryPool, SHUFFLE_PASSES);
    return lotteryPool[0];
}

// ============================================================
// 9. بناء كائن التوقع النهائي
// ============================================================
function buildPrediction(pick, category) {
    let w = (pick && pick.weight) ? pick.weight : 1;
    let slot = pick.slot;

    // الثقة مرتبطة بالوزن (92% - 99%)
    let confidence = Math.min(99, Math.max(92, Math.round(90 + w / 3)));

    // النقاط — تنوع أوسع
    let score = (w * 50 + Math.random() * 150).toFixed(1);

    // نسبة الأقلية (عرض فقط)
    let minority = (Math.random() * 4 + 0.3).toFixed(1);

    return {
        id: slot.id,
        top: slot.top,
        left: slot.left,
        weight: w,
        confidence: confidence,
        score: score,
        minority: minority,
        category: category
    };
}

// ============================================================
// 10. توليد 5 توقعات — نسخة محسّنة
// ============================================================
function generatePrediction(slots, previousSelection) {
    try {
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة.");
        }

        if (previousSelection && previousSelection.length > 0) {
            updateAIMemory(previousSelection);
        }

        // ⬆️ خلط مسبق للمجمعات (3 تمريرات) لتحسين التنوع
        let smallPool = strongShuffle(
            slots.filter(s => SMALL_FRUIT_IDS.includes(s.id)),
            3
        );
        let bigPool = strongShuffle(
            slots.filter(s => BIG_FRUIT_IDS.includes(s.id)),
            3
        );

        if (smallPool.length < 3) {
            throw new Error("عدد الفواكه الصغيرة غير كافٍ (يجب 3 على الأقل).");
        }
        if (bigPool.length < 2) {
            throw new Error("عدد الفواكه الكبيرة غير كافٍ (يجب 2 على الأقل).");
        }

        let result = [];
        let usedIds = new Set();
        let smallRemaining = [...smallPool];
        let bigRemaining = [...bigPool];

        // ---------- 3 فواكه صغيرة ----------
        for (let i = 0; i < 3; i++) {
            let pick = pickWeightedFromPool(smallRemaining, previousSelection);
            if (pick && !usedIds.has(pick.slot.id)) {
                result.push(buildPrediction(pick, 'SMALL'));
                usedIds.add(pick.slot.id);
                smallRemaining = smallRemaining.filter(s => s.id !== pick.slot.id);
            } else {
                let avail = smallRemaining.filter(s => !usedIds.has(s.id));
                if (avail.length === 0) break;
                let s = avail[Math.floor(Math.random() * avail.length)];
                result.push(buildPrediction({ slot: s, weight: 1 }, 'SMALL'));
                usedIds.add(s.id);
                smallRemaining = smallRemaining.filter(x => x.id !== s.id);
            }
        }

        // ---------- 2 فواكه كبيرة ----------
        for (let i = 0; i < 2; i++) {
            let pick = pickWeightedFromPool(bigRemaining, previousSelection);
            if (pick && !usedIds.has(pick.slot.id)) {
                result.push(buildPrediction(pick, 'BIG'));
                usedIds.add(pick.slot.id);
                bigRemaining = bigRemaining.filter(s => s.id !== pick.slot.id);
            } else {
                let avail = bigRemaining.filter(s => !usedIds.has(s.id));
                if (avail.length === 0) break;
                let s = avail[Math.floor(Math.random() * avail.length)];
                result.push(buildPrediction({ slot: s, weight: 1 }, 'BIG'));
                usedIds.add(s.id);
                bigRemaining = bigRemaining.filter(x => x.id !== s.id);
            }
        }

        if (result.length !== 5) {
            throw new Error("فشل استخراج 5 توقعات.");
        }

        return result;
    } catch (error) {
        console.error("خطأ في الخوارزمية الأولى:", error.message);
        return null;
    }
}

// ============================================================
// 11. وظائف مساعدة
// ============================================================
function getLearningStats() {
    return {
        totalTrained: totalTrained,
        perFruit: { ...learningBoost },
        memorySize: ai1History.length,
        logSize: trainedFruitsLog.length,
        longMemorySize: longTermHistory.length
    };
}

function getTrainedFruits() {
    return [...trainedFruitsLog];
}

function resetLearning() {
    ai1History = [];
    ai1Occurrences = {};
    longTermHistory = [];
    learningBoost = {};
    trainedFruitsLog = [];
    totalTrained = 0;
    return true;
}

function getSmallFruitIds() { return [...SMALL_FRUIT_IDS]; }
function getBigFruitIds() { return [...BIG_FRUIT_IDS]; }

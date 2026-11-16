/**
 * ============================================================================
 * YALLA FRUIT - NEXUS FIRST ALGORITHM ENGINE (AI1)
 * SMART PROBABILISTIC — 10-LAYER LEARNING ENGINE
 * ============================================================================
 * محرك احتمالي بـ 10 طبقات تعليمية حقيقية تعمل معاً:
 *
 *  L1: Frequency     — تحليل التكرار (قصير/متوسط/طويل)
 *  L2: Recency       — اضمحلال أسي من آخر ظهور
 *  L3: Markov 1      — P(next | last)
 *  L4: Markov 2      — P(next | last-1, last)
 *  L5: Coverage      — مكافأة الفواكه الغائبة
 *  L6: Gap           — كشف الفواكه "المستحقة" (Overdue)
 *  L7: Co-occurrence — أنماط الظهور المتزامن
 *  L8: Volatility    — موثوقية التنبؤ (انحراف معياري)
 *  L9: Streak        — كشف الدورات والتتابع
 *  L10: Bayesian     — تمهيد موحّد مضاد للتطرف
 *
 * المخرجات:
 *  - 5 توقعات (3 صغيرة + 2 كبيرة)
 *  - probability حقيقية لكل فاكهة (مجموع كل مجموعة = 100%)
 *  - confidence مبني على الاحتمال الحقيقي
 *  - breakdown تفصيلي لكل طبقة
 * ============================================================================
 */

// ============================================================
// ⚙️ 1. الإعدادات
// ============================================================
const INVERT_PREDICTION_MODE = true;
const LIGHT_JITTER_RANGE = 0.10;
const MAX_WEIGHT_CAP = 45;
const MIN_WEIGHT_FLOOR = 1;

// أوزان الدمج (Ensemble) — كل الطبقات تُجمع بهذه الأوزان
const ENSEMBLE_WEIGHTS = {
    frequency:    0.10,
    recency:      0.18,
    markov1:      0.14,
    markov2:      0.08,
    coverage:     0.10,
    gap:          0.14,
    cooccurrence: 0.06,
    volatility:   0.06,
    streak:       0.06,
    bayesian:     0.08
};

// نافذة الذاكرة قصيرة المدى
const MEMORY_WINDOW = 7;
// نافذة الفجوات
const MAX_GAPS_PER_FRUIT = 20;

// ============================================================
// 🗂️ 2. قاموس الفواكه
// ============================================================
const fruitNameToIdMap = {
    'برتقال': 1, 'ليمون': 2, 'عنب': 3, 'كرز': 4,
    'تفاح': 5, 'بطيخ': 6, 'مانجو': 7, 'فراولة': 8,
    'orange': 1, 'lemon': 2, 'grape': 3, 'cherry': 4,
    'apple': 5, 'watermelon': 6, 'mango': 7, 'strawberry': 8,
    'برتق': 1, 'لمون': 2, 'عنبة': 3, 'كرزة': 4,
    'تفاحة': 5, 'بطيخة': 6, 'مانجة': 7, 'فراوله': 8
};

const FRUIT_NAMES_AR = {
    1: 'برتقال', 2: 'ليمون', 3: 'عنب', 4: 'كرز',
    5: 'تفاح', 6: 'بطيخ', 7: 'مانجو', 8: 'فراولة'
};

const SMALL_FRUIT_IDS = [1, 2, 3, 5];
const BIG_FRUIT_IDS = [4, 6, 7, 8];

// ============================================================
// 🧠 3. حالة الذاكرة الموسّعة
// ============================================================
// الذاكرة الأساسية
let ai1History = [];           // نافذة 7 سجلات
let ai1Occurrences = {};       // عدّادات في النافذة
let learningBoost = {};        // تعزيزات
let totalTrained = 0;
let trainedFruitsLog = [];

// الذاكرة الطويلة (غير محدودة)
let fullHistory = [];          // كل سجل منذ البداية
let fullOccurrences = {};      // عدادات تراكمية كاملة
let roundCounter = 0;          // عدّاد الجولات

// ذاكرة ماركوف
let markov1Matrix = {};        // {fromId: {toId: count}}
let markov2Matrix = {};        // {fromKey: {toId: count}}   where fromKey="a_b"

// ذاكرة التزامن
let cooccurrenceMatrix = {};   // {idA: {idB: count}}

// ذاكرة الفجوات
let gapHistory = {};           // {id: [gap1, gap2, ...]}
let lastAppearanceRound = {};  // {id: lastRoundNumber}

// ذاكرة السلاسل
let streakHistory = {};        // {id: [streakLengths...]}

// ذاكرة الوقت
let hourDistribution = {};     // {hour: {id: count}}

// ============================================================
// 🛠️ 4. أدوات مساعدة
// ============================================================
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
    for (let p = 0; p < passes; p++) result = shuffleArray(result);
    return result;
}

function nextInt(max) { return Math.floor(Math.random() * max); }

function normalizeSelection(sel) {
    if (!sel || !Array.isArray(sel)) return [];
    return sel.map(x => Number(x)).filter(x => !isNaN(x));
}

function clamp(v, min, max) {
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

function safeDivide(a, b, fallback = 0) {
    return (b === 0 || !isFinite(b)) ? fallback : a / b;
}

function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    let s = 0;
    for (let v of arr) s += v;
    return s / arr.length;
}

function stdDev(arr) {
    if (!arr || arr.length < 2) return 0;
    let m = mean(arr);
    let s = 0;
    for (let v of arr) s += (v - m) * (v - m);
    return Math.sqrt(s / arr.length);
}

function ensureObj(obj, key) {
    if (!obj[key]) obj[key] = {};
    return obj[key];
}

function ensureArr(obj, key) {
    if (!obj[key]) obj[key] = [];
    return obj[key];
}

function ensureNum(obj, key, def = 0) {
    if (obj[key] === undefined) obj[key] = def;
    return obj[key];
}

// ============================================================
// 📚 5. دوال التحديث (التعلم الشامل)
// ============================================================

/**
 * تحديث النافذة قصيرة المدى (7 سجلات)
 */
function updateAIMemory(winningIds) {
    if (!winningIds || winningIds.length === 0) return;
    for (let rawId of winningIds) {
        let id = Number(rawId);
        if (isNaN(id)) continue;

        // النافذة
        ai1History.push(id);
        ai1Occurrences[id] = (ai1Occurrences[id] || 0) + 1;
        if (ai1History.length > MEMORY_WINDOW) {
            let forgotten = ai1History.shift();
            if (ai1Occurrences[forgotten] > 1) ai1Occurrences[forgotten]--;
            else delete ai1Occurrences[forgotten];
        }

        // الذاكرة الطويلة
        fullHistory.push(id);
        fullOccurrences[id] = (fullOccurrences[id] || 0) + 1;

        // الفجوات
        if (lastAppearanceRound[id] !== undefined) {
            let gap = roundCounter - lastAppearanceRound[id];
            let gaps = ensureArr(gapHistory, id);
            gaps.push(gap);
            if (gaps.length > MAX_GAPS_PER_FRUIT) gaps.shift();
        }
        lastAppearanceRound[id] = roundCounter;

        // السلاسل
        let streakList = ensureArr(streakHistory, id);
        if (streakList.length === 0 || streakList[streakList.length - 1].closed) {
            streakList.push({ length: 1, closed: false });
        } else {
            streakList[streakList.length - 1].length++;
        }

        // الوقت
        let hour = new Date().getHours();
        let hourDist = ensureObj(hourDistribution, hour);
        hourDist[id] = (hourDist[id] || 0) + 1;
    }

    // ماركوف — يُحدّث بعد إضافة كل السجلات
    updateMarkovMatrices(winningIds);

    // التزامن
    updateCooccurrence(winningIds);

    roundCounter++;
}

/**
 * تحديث مصفوفتي ماركوف (الطلب 1 و 2)
 */
function updateMarkovMatrices(winningIds) {
    let ids = winningIds.map(Number).filter(x => !isNaN(x));
    if (ids.length === 0) return;

    // ماركوف 1: كل زوج (a→b) من تاريخ كامل
    if (fullHistory.length >= 2) {
        let prev = fullHistory[fullHistory.length - 2];
        let curr = fullHistory[fullHistory.length - 1];
        // تجاهل التحديث المكرر — يُعالج مرة واحدة فقط
    }

    // الأصح: تحديث بناءً على النافذة الكاملة بعد الإضافة
    let size = fullHistory.length;
    // تحديث آخر 5 انتقالات
    let start = Math.max(0, size - 5);
    for (let i = Math.max(1, start); i < size; i++) {
        let from = fullHistory[i - 1];
        let to = fullHistory[i];
        let row = ensureObj(markov1Matrix, from);
        row[to] = (row[to] || 0) + 1;

        if (i >= 2) {
            let from2 = fullHistory[i - 2] + '_' + fullHistory[i - 1];
            let row2 = ensureObj(markov2Matrix, from2);
            row2[to] = (row2[to] || 0) + 1;
        }
    }
}

/**
 * تحديث مصفوفة التزامن
 */
function updateCooccurrence(winningIds) {
    let ids = winningIds.map(Number).filter(x => !isNaN(x));
    for (let a of ids) {
        for (let b of ids) {
            if (a === b) continue;
            let rowA = ensureObj(cooccurrenceMatrix, a);
            rowA[b] = (rowA[b] || 0) + 1;
        }
    }
}

// ============================================================
// 🎓 6. واجهة التدريب (trainAlgorithm)
// ============================================================
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
        round: roundCounter,
        time: new Date().toLocaleTimeString()
    });

    return {
        success: true,
        id: foundId,
        boost: learningBoost[foundId],
        totalTrained: totalTrained,
        round: roundCounter
    };
}

// ============================================================
// 🧩 7. الطبقة 1: تحليل التكرار (Frequency Layer)
// ============================================================
/**
 * يجمع ثلاث نوافذ زمنية:
 *  - النافذة القصيرة (7): أهم وزن، تكشف الحالة الآنية
 *  - النافذة المتوسطة (14): لرؤية سياق أوسع
 *  - الذاكرة الطويلة: لمعرفة الاتجاه العام
 * القيمة الناتجة: 0..1 (أعلى = الفاكهة شائعة أكثر)
 */
function layerFrequency(slots) {
    let result = {};
    let shortTotal = ai1History.length;
    let midTotal = Math.min(14, fullHistory.length);
    let longTotal = fullHistory.length;

    // النافذة المتوسطة
    let midCounts = {};
    let midSlice = fullHistory.slice(-14);
    for (let id of midSlice) midCounts[id] = (midCounts[id] || 0) + 1;

    for (let slot of slots) {
        let id = slot.id;
        let shortCount = ai1Occurrences[id] || 0;
        let midCount = midCounts[id] || 0;
        let longCount = fullOccurrences[id] || 0;

        let shortFreq = safeDivide(shortCount, shortTotal, 0);
        let midFreq   = safeDivide(midCount, midTotal, 0);
        let longFreq  = safeDivide(longCount, longTotal, 0);

        // المزج الموزون — نافذة قصيرة لها وزن أكبر
        let score = (shortFreq * 0.5) + (midFreq * 0.3) + (longFreq * 0.2);

        result[id] = clamp(score, 0, 1);
    }

    return result;
}

// ============================================================
// 🌟 8. الطبقة 2: اضمحلال الحداثة (Recency Layer)
// ============================================================
/**
 * اضمحلال أسي:
 *  - إذا ظهرت الفاكهة في الجولة الأخيرة: score ≈ 0
 *  - إذا ظهرت منذ 7 جولات: score ≈ 0.7
 *  - إذا لم تظهر أبداً: score = 1
 * القيمة الناتجة: 0..1 (أعلى = الفاكهة "متأخرة" عن الظهور)
 */
function layerRecency(slots) {
    let result = {};
    let halfLife = 4.0; // نصف العمر — كل 4 جولات تنخفض القيمة للنصف
    let currentRound = roundCounter;

    for (let slot of slots) {
        let id = slot.id;
        let lastRound = lastAppearanceRound[id];

        if (lastRound === undefined) {
            // لم تظهر أبداً — أعلى أولوية
            result[id] = 1.0;
            continue;
        }

        let roundsSince = currentRound - lastRound;
        if (roundsSince < 0) roundsSince = 0;

        // اضمحلال أسي: score = 1 - exp(-roundsSince / halfLife)
        let decay = 1 - Math.exp(-roundsSince / halfLife);
        result[id] = clamp(decay, 0, 1);
    }

    return result;
}

// ============================================================
// 🔗 9. الطبقة 3: ماركوف من الدرجة الأولى (Markov1)
// ============================================================
/**
 * P(next | last):
 *  - يعتمد على آخر فاكهة ظهرت
 *  - يبحث في markov1Matrix عن الصف المطابق
 *  - يحسب الاحتمالية النسبية لكل فاكهة
 * القيمة الناتجة: 0..1
 */
function layerMarkov1(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0;

    if (fullHistory.length < 2) return result;

    let lastFruit = fullHistory[fullHistory.length - 1];
    let row = markov1Matrix[lastFruit];
    if (!row) return result;

    // مجموع الانتقالات من هذه الفاكهة
    let rowSum = 0;
    for (let k in row) rowSum += row[k];
    if (rowSum === 0) return result;

    for (let slot of slots) {
        let id = slot.id;
        let count = row[id] || 0;
        result[id] = clamp(count / rowSum, 0, 1);
    }

    return result;
}

// ============================================================
// 🔗🔗 10. الطبقة 4: ماركوف من الدرجة الثانية (Markov2)
// ============================================================
/**
 * P(next | last-1, last):
 *  - يعتمد على آخر فاكهتين
 *  - أكثر تخصصاً من ماركوف 1
 * القيمة الناتجة: 0..1
 */
function layerMarkov2(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0;

    if (fullHistory.length < 3) return result;

    let size = fullHistory.length;
    let key = fullHistory[size - 2] + '_' + fullHistory[size - 1];
    let row = markov2Matrix[key];
    if (!row) return result;

    let rowSum = 0;
    for (let k in row) rowSum += row[k];
    if (rowSum === 0) return result;

    for (let slot of slots) {
        let id = slot.id;
        let count = row[id] || 0;
        result[id] = clamp(count / rowSum, 0, 1);
    }

    return result;
}

// ============================================================
// 🎯 11. الطبقة 5: التغطية (Coverage)
// ============================================================
/**
 * مكافأة للفواكه الغائبة من النافذة الحالية
 *  - غائبة تماماً من النافذة (7) = 1.0
 *  - ظهرت مرة واحدة = 0.5
 *  - ظهرت مرتين = 0.25
 * القيمة الناتجة: 0..1
 */
function layerCoverage(slots) {
    let result = {};
    for (let slot of slots) {
        let id = slot.id;
        let count = ai1Occurrences[id] || 0;
        if (count === 0) result[id] = 1.0;
        else result[id] = 1.0 / (count + 1);
    }
    return result;
}

// ============================================================
// 📏 12. الطبقة 6: تحليل الفجوات (Gap Layer)
// ============================================================
/**
 * لكل فاكهة، نحسب متوسط الفجوة التاريخية.
 * ثم نقارن الفجوة الحالية بالمتوسط:
 *  - إذا كانت الفجوة الحالية > المتوسط = "متأخرة" = مكافأة
 *  - إذا كانت أقل = "حديثة" = لا مكافأة
 * القيمة الناتجة: 0..1
 */
function layerGap(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0.5; // افتراضي محايد

    let currentRound = roundCounter;

    for (let slot of slots) {
        let id = slot.id;
        let gaps = gapHistory[id];
        let lastRound = lastAppearanceRound[id];

        if (!gaps || gaps.length === 0) {
            // لا توجد فجوات مسجلة
            if (lastRound === undefined) {
                // لم تظهر أبداً = مستحقة
                result[id] = 1.0;
            } else {
                // ظهرت مرة واحدة فقط — نعطيها مكافأة متوسطة
                let roundsSince = currentRound - lastRound;
                result[id] = clamp(roundsSince / 10, 0, 1);
            }
            continue;
        }

        let avgGap = mean(gaps);
        if (avgGap <= 0) avgGap = 1;

        let currentGap = lastRound !== undefined ? (currentRound - lastRound) : avgGap * 2;
        if (currentGap < 0) currentGap = 0;

        // نسبة "التأخر"
        let overdueRatio = currentGap / avgGap;

        // اقبض بين 0 و 2 ثم نورم إلى 0..1
        overdueRatio = clamp(overdueRatio, 0, 2);
        result[id] = overdueRatio / 2;
    }

    return result;
}

// ============================================================
// 👥 13. الطبقة 7: التزامن (Co-occurrence)
// ============================================================
/**
 * يعتمد على أي الفواكه ظهرت في الجولة السابقة
 * إذا كانت فاكهة ما ترافق بشدة فاكهة ظهرت للتو → مكافأة
 * القيمة الناتجة: 0..1
 */
function layerCooccurrence(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0;

    if (fullHistory.length < 2) return result;

    // الفواكه الأخيرة (آخر جولة)
    let lastRoundFruits = [];
    let lastRound = -1;
    // نبني مجموعة الفواكه التي ظهرت في الجولة السابقة
    // (نعتبرها آخر 5 عناصر كتقريب)
    let recent = fullHistory.slice(-5);
    let recentSet = new Set(recent);

    for (let slot of slots) {
        let id = slot.id;
        let row = cooccurrenceMatrix[id];
        if (!row) continue;

        let total = 0;
        for (let k in row) total += row[k];
        if (total === 0) continue;

        // مجموع مرات التزامن مع الفواكه الأخيرة
        let coSum = 0;
        for (let otherId in row) {
            if (recentSet.has(Number(otherId))) {
                coSum += row[otherId];
            }
        }
        result[id] = clamp(coSum / total, 0, 1);
    }

    return result;
}

// ============================================================
// 📊 14. الطبقة 8: التذبذب (Volatility Layer)
// ============================================================
/**
 * الانحراف المعياري للفجوات:
 *  - إذا كان منخفضاً = الفاكهة "منتظمة" = تنبؤ أكثر دقة
 *  - إذا كان مرتفعاً = عشوائية = تنبؤ أقل دقة
 * نُرجّح: الفاكهة المنتظمة إذا كانت متأخرة = مكافأة قوية
 * القيمة الناتجة: 0..1
 */
function layerVolatility(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0.5;

    for (let slot of slots) {
        let id = slot.id;
        let gaps = gapHistory[id];

        if (!gaps || gaps.length < 2) continue;

        let avg = mean(gaps);
        if (avg <= 0) continue;

        let std = stdDev(gaps);
        let cv = std / avg; // معامل الاختلاف

        // cv منخفض = منتظم = موثوق
        let reliability = 1 / (1 + cv); // 0..1

        // هل الفاكهة متأخرة؟
        let lastRound = lastAppearanceRound[id];
        let currentGap = lastRound !== undefined ? (roundCounter - lastRound) : avg;

        let overdue = currentGap / avg;
        overdue = clamp(overdue, 0, 1.5);

        // الدمج: الموثوقية × درجة التأخر
        result[id] = clamp(reliability * (overdue / 1.5), 0, 1);
    }

    return result;
}

// ============================================================
// 🔁 15. الطبقة 9: كشف السلاسل (Streak Layer)
// ============================================================
/**
 * إذا كانت الفاكهة تظهر في سلاسل (تفاح تفاح تفاح)، والآن السلسلة مقطوعة
 * فهي "مستحقة" للعودة.
 * القيمة الناتجة: 0..1
 */
function layerStreak(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0;

    for (let slot of slots) {
        let id = slot.id;
        let streaks = streakHistory[id];

        if (!streaks || streaks.length === 0) {
            // لا سلاسل مسجلة = فرصة عادلة
            result[id] = 0.5;
            continue;
        }

        let avgStreak = mean(streaks.map(s => s.length));
        if (avgStreak <= 0) avgStreak = 1;

        // السلسلة الحالية
        let currentStreak = streaks[streaks.length - 1];
        let currentLen = currentStreak.length;

        if (currentStreak.closed) {
            // السلسلة مغلقة = مستحقة
            result[id] = clamp(avgStreak / 3, 0, 1);
        } else {
            // السلسلة مفتوحة — إذا كانت قصيرة، مرشح للاستمرار؛ إذا طويلة، مرشح للإغلاق
            if (currentLen < avgStreak) {
                result[id] = 0.3;
            } else {
                result[id] = 0.6;
            }
        }
    }

    return result;
}

// ============================================================
// ⚖️ 16. الطبقة 10: التمهيد البايزي (Bayesian Prior)
// ============================================================
/**
 * يُضاف تمهيد موحّد صغير لكل فاكهة
 * الهدف: منع التطرف (احتمال 0% أو 100%)
 * القيمة الناتجة: 0..1 (شبه ثابت)
 */
function layerBayesian(slots) {
    let result = {};
    let priorStrength = 0.15;

    for (let slot of slots) {
        let id = slot.id;
        let count = fullOccurrences[id] || 0;
        // التمهيد: (count + prior) / (total + prior * n)
        let total = fullHistory.length;
        let n = slots.length || 8;
        let score = safeDivide(count + priorStrength, total + priorStrength * n, 1 / n);
        result[id] = clamp(score * n, 0, 1);
    }

    return result;
}

// ============================================================
// 🧬 17. مجمّع الطبقات (Ensemble Combiner)
// ============================================================
/**
 * يجمع كل الطبقات بأوزان محددة
 * المخرج: score خام لكل فاكهة (بلا تطبيع)
 */
function computeEnsembleScores(slots, prevSel) {
    // تشغيل كل الطبقات
    let L_freq   = layerFrequency(slots);
    let L_rec    = layerRecency(slots);
    let L_m1     = layerMarkov1(slots);
    let L_m2     = layerMarkov2(slots);
    let L_cov    = layerCoverage(slots);
    let L_gap    = layerGap(slots);
    let L_co     = layerCooccurrence(slots);
    let L_vol    = layerVolatility(slots);
    let L_streak = layerStreak(slots);
    let L_bayes  = layerBayesian(slots);

    // عقوبات/مكافآت إضافية
    let prevPenalty = {};
    for (let slot of slots) {
        prevPenalty[slot.id] = prevSel.includes(slot.id) ? -0.15 : 0;
    }

    // الدمج
    let ensemble = {};
    for (let slot of slots) {
        let id = slot.id;
        let score =
            (L_freq[id]   || 0) * ENSEMBLE_WEIGHTS.frequency +
            (L_rec[id]    || 0) * ENSEMBLE_WEIGHTS.recency +
            (L_m1[id]     || 0) * ENSEMBLE_WEIGHTS.markov1 +
            (L_m2[id]     || 0) * ENSEMBLE_WEIGHTS.markov2 +
            (L_cov[id]    || 0) * ENSEMBLE_WEIGHTS.coverage +
            (L_gap[id]    || 0) * ENSEMBLE_WEIGHTS.gap +
            (L_co[id]     || 0) * ENSEMBLE_WEIGHTS.cooccurrence +
            (L_vol[id]    || 0) * ENSEMBLE_WEIGHTS.volatility +
            (L_streak[id] || 0) * ENSEMBLE_WEIGHTS.streak +
            (L_bayes[id]  || 0) * ENSEMBLE_WEIGHTS.bayesian +
            prevPenalty[id];

        // ضمان عدم الوصول لصفر مطلق
        if (score < 0.001) score = 0.001;
        ensemble[id] = score;
    }

    return {
        scores: ensemble,
        breakdown: {
            frequency: L_freq,
            recency: L_rec,
            markov1: L_m1,
            markov2: L_m2,
            coverage: L_cov,
            gap: L_gap,
            cooccurrence: L_co,
            volatility: L_vol,
            streak: L_streak,
            bayesian: L_bayes
        }
    };
}

// ============================================================
// 📊 18. التطبيع إلى احتمالات
// ============================================================
function normalizeToProbabilities(scores) {
    let total = 0;
    for (let id in scores) total += scores[id];

    if (total <= 0) {
        let keys = Object.keys(scores);
        let uniform = {};
        let n = keys.length || 1;
        for (let id of keys) uniform[id] = 100 / n;
        return uniform;
    }

    let probs = {};
    for (let id in scores) probs[id] = (scores[id] / total) * 100;
    return probs;
}

// ============================================================
// 🎲 19. عشوائية خفيفة (Jitter)
// ============================================================
function applyLightJitter(probs) {
    let jittered = {};
    for (let id in probs) {
        let jitter = (1 - LIGHT_JITTER_RANGE) + Math.random() * (2 * LIGHT_JITTER_RANGE);
        jittered[id] = probs[id] * jitter;
    }
    let total = 0;
    for (let id in jittered) total += jittered[id];
    if (total <= 0) return probs;
    for (let id in jittered) jittered[id] = (jittered[id] / total) * 100;
    return jittered;
}

// ============================================================
// 🔄 20. القلب (Inversion)
// ============================================================
function invertProbabilities(probs) {
    let inverted = {};
    for (let id in probs) inverted[id] = 100 - probs[id];
    let total = 0;
    for (let id in inverted) total += inverted[id];
    if (total <= 0) return probs;
    for (let id in inverted) inverted[id] = (inverted[id] / total) * 100;
    return inverted;
}

// ============================================================
// 🧮 21. حساب الاحتمالات النهائية (المدخل الرئيسي)
// ============================================================
function calculateAllProbabilities(slots, previousSelection) {
    let prevSel = normalizeSelection(previousSelection);

    // 1. درجات خام من كل الطبقات
    let ensemble = computeEnsembleScores(slots, prevSel);

    // 2. تطبيع لاحتمالات 0-100
    let probs = normalizeToProbabilities(ensemble.scores);

    // 3. عشوائية خفيفة
    probs = applyLightJitter(probs);

    // 4. قلب
    if (INVERT_PREDICTION_MODE) probs = invertProbabilities(probs);

    return {
        probabilities: probs,
        breakdown: ensemble.breakdown
    };
}

// ============================================================
// 🏋️ 22. حساب الأوزان الصحيحة (Legacy Compatible)
// ============================================================
function calculateAllFruitWeights(slots, previousSelection) {
    let result = calculateAllProbabilities(slots, previousSelection);
    let weights = {};
    for (let id in result.probabilities) {
        weights[id] = Math.max(1, Math.round(result.probabilities[id]));
    }
    return weights;
}

// ============================================================
// 🎰 23. السحب المرجّح
// ============================================================
function pickMultipleFromPool(pool, predictionWeights, count, usedIds) {
    let available = pool.filter(s => !usedIds.has(s.id));
    if (available.length < count) return available;

    let lotteryPool = [];
    for (let slot of available) {
        let w = predictionWeights[slot.id] || 1;
        for (let i = 0; i < w; i++) lotteryPool.push(slot);
    }

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

// ============================================================
// 🏗️ 24. بناء كائن التوقع — احتمالات حقيقية
// ============================================================
function buildPrediction(slot, category, allProbs, breakdown) {
    let groupIds = category === 'SMALL' ? SMALL_FRUIT_IDS : BIG_FRUIT_IDS;

    // مجموع احتمالات المجموعة (يجب أن يكون ≈ 50% لأن هناك مجموعتان)
    let groupTotal = 0;
    for (let gid of groupIds) {
        if (allProbs[gid] !== undefined) groupTotal += allProbs[gid];
    }

    // احتمالية داخل المجموعة (مجموعها 100%)
    let rawProb = groupTotal > 0
        ? (allProbs[slot.id] / groupTotal) * 100
        : 100 / groupIds.length;

    // دقة عشرية واحدة
    let probability = Math.round(rawProb * 10) / 10;

    // الثقة — مشتقة من الاحتمال (لكن تمنع الأرقام المتطرفة)
    let confidence = Math.round(clamp(probability + 25, 40, 99));

    // تفكيك الطبقات — للشفافية
    let layerDetails = {};
    for (let layerName in breakdown) {
        let layerMap = breakdown[layerName];
        if (layerMap && layerMap[slot.id] !== undefined) {
            layerDetails[layerName] = Math.round(layerMap[slot.id] * 1000) / 1000;
        }
    }

    return {
        id: slot.id,
        nameAr: FRUIT_NAMES_AR[slot.id] || '',
        top: slot.top,
        left: slot.left,
        weight: Math.max(1, Math.round(allProbs[slot.id] || 1)),
        probability: probability,       // 🌟 احتمال حقيقي 0-100%
        confidence: confidence,          // ثقة 0-100%
        score: (probability * 10).toFixed(1),
        minority: (probability / 10).toFixed(1),
        category: category,
        inverted: INVERT_PREDICTION_MODE,
        layers: layerDetails
    };
}

// ============================================================
// 🎯 25. توليد 5 توقعات
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

        // حساب الاحتمالات مع تفكيك الطبقات
        let calc = calculateAllProbabilities(slots, previousSelection);
        let probs = calc.probabilities;
        let breakdown = calc.breakdown;

        // أوزان صحيحة للسحب
        let weights = {};
        for (let id in probs) weights[id] = Math.max(1, Math.round(probs[id]));

        let result = [];
        let usedIds = new Set();

        // 3 صغيرة
        let smallPicked = pickMultipleFromPool(smallPool, weights, 3, usedIds);
        for (let slot of smallPicked) {
            result.push(buildPrediction(slot, 'SMALL', probs, breakdown));
            usedIds.add(slot.id);
        }

        // 2 كبيرة
        let bigPicked = pickMultipleFromPool(bigPool, weights, 2, usedIds);
        for (let slot of bigPicked) {
            result.push(buildPrediction(slot, 'BIG', probs, breakdown));
            usedIds.add(slot.id);
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
// 📈 26. إحصائيات تفصيلية
// ============================================================
function getDetailedStats() {
    let fruitStats = {};
    for (let id in FRUIT_NAMES_AR) {
        let numId = Number(id);
        let gaps = gapHistory[numId] || [];
        fruitStats[id] = {
            nameAr: FRUIT_NAMES_AR[id],
            fullCount: fullOccurrences[id] || 0,
            windowCount: ai1Occurrences[id] || 0,
            lastRound: lastAppearanceRound[id] !== undefined ? lastAppearanceRound[id] : null,
            roundsSince: lastAppearanceRound[id] !== undefined
                ? (roundCounter - lastAppearanceRound[id])
                : null,
            avgGap: gaps.length > 0 ? Math.round(mean(gaps) * 100) / 100 : null,
            gapStd: gaps.length > 1 ? Math.round(stdDev(gaps) * 100) / 100 : null,
            totalStreaks: (streakHistory[numId] || []).length
        };
    }

    return {
        roundCounter,
        totalTrained,
        memorySize: ai1History.length,
        fullHistorySize: fullHistory.length,
        logSize: trainedFruitsLog.length,
        inversionMode: INVERT_PREDICTION_MODE,
        fruits: fruitStats
    };
}

// ============================================================
// 🔧 27. إدارة الحالة (Compatibility API)
// ============================================================
function getLearningStats() {
    return {
        totalTrained: totalTrained,
        perFruit: { ...learningBoost },
        memorySize: ai1History.length,
        fullHistorySize: fullHistory.length,
        logSize: trainedFruitsLog.length,
        inversionMode: INVERT_PREDICTION_MODE,
        roundCounter: roundCounter
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

    fullHistory = [];
    fullOccurrences = {};
    roundCounter = 0;

    markov1Matrix = {};
    markov2Matrix = {};
    cooccurrenceMatrix = {};
    gapHistory = {};
    lastAppearanceRound = {};
    streakHistory = {};
    hourDistribution = {};

    return true;
}

function getSmallFruitIds() { return [...SMALL_FRUIT_IDS]; }
function getBigFruitIds() { return [...BIG_FRUIT_IDS]; }

function getInversionMode() {
    return INVERT_PREDICTION_MODE;
}

function setInversionMode(enabled) {
    if (typeof enabled === 'boolean') {
        return {
            currentMode: INVERT_PREDICTION_MODE,
            requestedMode: enabled,
            note: "لتغيير الوضع، عدّل قيمة INVERT_PREDICTION_MODE في أعلى الملف."
        };
    }
    return { currentMode: INVERT_PREDICTION_MODE };
}

// ============================================================
// 🔙 28. توافق عكسي (Legacy)
// ============================================================
function invertWeightsMap(weightsMap, maxW = MAX_WEIGHT_CAP, minW = MIN_WEIGHT_FLOOR) {
    let inverted = {};
    for (let idStr in weightsMap) {
        let orig = weightsMap[idStr];
        let flipped = (maxW + minW) - orig;
        if (flipped < minW) flipped = minW;
        if (flipped > maxW) flipped = maxW;
        inverted[idStr] = flipped;
    }
    return inverted;
}

// ============================================================
// 🔬 29. أداة تشخيص — عرض احتمالات كل الفواكه (للتطوير)
// ============================================================
function debugPrintAllProbabilities(slots, previousSelection) {
    let calc = calculateAllProbabilities(slots, previousSelection);
    let probs = calc.probabilities;

    let out = {
        small: {},
        big: {}
    };

    // نطبع النسب داخل كل مجموعة
    let smallTotal = 0, bigTotal = 0;
    for (let gid of SMALL_FRUIT_IDS) smallTotal += (probs[gid] || 0);
    for (let gid of BIG_FRUIT_IDS) bigTotal += (probs[gid] || 0);

    for (let gid of SMALL_FRUIT_IDS) {
        out.small[gid] = {
            nameAr: FRUIT_NAMES_AR[gid],
            probability: smallTotal > 0
                ? Math.round((probs[gid] / smallTotal) * 1000) / 10
                : 25
        };
    }

    for (let gid of BIG_FRUIT_IDS) {
        out.big[gid] = {
            nameAr: FRUIT_NAMES_AR[gid],
            probability: bigTotal > 0
                ? Math.round((probs[gid] / bigTotal) * 1000) / 10
                : 25
        };
    }

    return out;
}

// ============================================================
// 🧪 30. اختبار سريع (يمكن استدعاؤه يدوياً)
// ============================================================
function runSelfTest() {
    let slots = [
        { id: 1, top: '10%', left: '10%' },
        { id: 2, top: '10%', left: '30%' },
        { id: 3, top: '10%', left: '50%' },
        { id: 5, top: '10%', left: '70%' },
        { id: 4, top: '50%', left: '10%' },
        { id: 6, top: '50%', left: '30%' },
        { id: 7, top: '50%', left: '50%' },
        { id: 8, top: '50%', left: '70%' }
    ];

    trainAlgorithm('تفاح');
    trainAlgorithm('برتقال');
    trainAlgorithm('كرز');
    trainAlgorithm('مانجو');
    trainAlgorithm('عنب');

    let preds = generatePrediction(slots, []);
    let debug = debugPrintAllProbabilities(slots, []);

    return { predictions: preds, probabilities: debug, stats: getDetailedStats() };
}

/**
 * ============================================================================
 * YALLA FRUIT - NEXUS FIRST ALGORITHM ENGINE (AI1)
 * SMART PROBABILISTIC — 12-LAYER LEARNING ENGINE [REPEAT-AWARE + SMALL-FRUIT-ROTATION]
 * ============================================================================
 * محرك احتمالي بـ 12 طبقة تعليمية حقيقية تعمل معاً
 *
 * 🆕 إضافة هذه النسخة (دون تغيير أي شيء آخر):
 *  - تتبع توقع الفواكه الصغيرة: smallPredictionTracker
 *  - 🆕 selectSmallFruitsWithForcedInclusion:
 *      أي فاكهة صغيرة (برتقال، ليمون، عنب، تفاح) لم تُذكر في توقع الجولة
 *      الماضية → تُدرج إجبارياً في التوقعات القادمة (الأقدم أولاً)
 *  - الفواكه الكبيرة (كرز، بطيخ، مانجو، فراولة) — بدون تغيير، تختار طبيعياً
 *
 * الطبقات الـ 12:
 *  L1:  Frequency        — تحليل التكرار
 *  L2:  Recency          — اضمحلال مع أرضية
 *  L3:  Markov 1         — P(next | last)
 *  L4:  Markov 2         — P(next | last-1, last)
 *  L5:  Coverage         — تشجيع التكرار المرن
 *  L6:  Gap              — كشف الفواكه "المستحقة"
 *  L7:  Co-occurrence    — أنماط الظهور المتزامن
 *  L8:  Volatility       — موثوقية التنبؤ
 *  L9:  Streak           — كشف السلاسل
 *  L10: Bayesian         — تمهيد موحّد مضاد للتطرف
 *  L11: RepeatTendency   — ميل الفاكهة للتكرار
 *  L12: LoopCycle        — كشف الدورات القصيرة
 * ============================================================================
 */

// ============================================================
// ⚙️ 1. الإعدادات
// ============================================================
const INVERT_PREDICTION_MODE = true;
const LIGHT_JITTER_RANGE = 0.10;
const MAX_WEIGHT_CAP = 45;
const MIN_WEIGHT_FLOOR = 1;

const RECENCY_FLOOR = 0.35;
const COVERAGE_FLOOR = 0.40;

const ENSEMBLE_WEIGHTS = {
    frequency:      0.08,
    recency:        0.12,
    markov1:        0.10,
    markov2:        0.06,
    coverage:       0.08,
    gap:            0.10,
    cooccurrence:   0.05,
    volatility:     0.05,
    streak:         0.05,
    bayesian:       0.06,
    repeatTendency: 0.15,
    loopCycle:      0.10
};

const MEMORY_WINDOW = 7;
const MAX_GAPS_PER_FRUIT = 20;
const REPEAT_LOOKBACK = 10;

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
let ai1History = [];
let ai1Occurrences = {};
let learningBoost = {};
let totalTrained = 0;
let trainedFruitsLog = [];

let fullHistory = [];
let fullOccurrences = {};
let roundCounter = 0;

let markov1Matrix = {};
let markov2Matrix = {};
let cooccurrenceMatrix = {};
let gapHistory = {};
let lastAppearanceRound = {};
let streakHistory = {};
let hourDistribution = {};

let repeatOutcomes = {};
let roundSnapshots = [];

// 🆕 متتبّع توقع الفواكه الصغيرة
// {id: predictionRoundNumber} — رقم جولة التوقع التي ذُكرت فيها آخر مرة
let smallPredictionTracker = {};
let currentPredictionRound = 0;

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
function updateAIMemory(winningIds) {
    if (!winningIds || winningIds.length === 0) return;

    let roundIds = winningIds.map(Number).filter(x => !isNaN(x));
    roundSnapshots.push({
        round: roundCounter,
        ids: [...roundIds]
    });
    if (roundSnapshots.length > 20) roundSnapshots.shift();

    updateRepeatOutcomes(roundIds);

    for (let rawId of winningIds) {
        let id = Number(rawId);
        if (isNaN(id)) continue;

        ai1History.push(id);
        ai1Occurrences[id] = (ai1Occurrences[id] || 0) + 1;
        if (ai1History.length > MEMORY_WINDOW) {
            let forgotten = ai1History.shift();
            if (ai1Occurrences[forgotten] > 1) ai1Occurrences[forgotten]--;
            else delete ai1Occurrences[forgotten];
        }

        fullHistory.push(id);
        fullOccurrences[id] = (fullOccurrences[id] || 0) + 1;

        if (lastAppearanceRound[id] !== undefined) {
            let gap = roundCounter - lastAppearanceRound[id];
            let gaps = ensureArr(gapHistory, id);
            gaps.push(gap);
            if (gaps.length > MAX_GAPS_PER_FRUIT) gaps.shift();
        }
        lastAppearanceRound[id] = roundCounter;

        let streakList = ensureArr(streakHistory, id);
        if (streakList.length === 0 || streakList[streakList.length - 1].closed) {
            streakList.push({ length: 1, closed: false });
        } else {
            streakList[streakList.length - 1].length++;
        }

        let hour = new Date().getHours();
        let hourDist = ensureObj(hourDistribution, hour);
        hourDist[id] = (hourDist[id] || 0) + 1;
    }

    updateMarkovMatrices(winningIds);
    updateCooccurrence(winningIds);

    roundCounter++;
}

function updateRepeatOutcomes(currentRoundIds) {
    if (roundSnapshots.length < 2) return;

    let prevSnapshot = roundSnapshots[roundSnapshots.length - 2];
    let currSnapshot = roundSnapshots[roundSnapshots.length - 1];

    let currSet = new Set(currSnapshot.ids);

    for (let id of prevSnapshot.ids) {
        let repeated = currSet.has(id);
        let rec = ensureObj(repeatOutcomes, id);
        if (!rec.nextRepeats) rec.nextRepeats = 0;
        if (!rec.nextTotal) rec.nextTotal = 0;
        rec.nextTotal++;
        if (repeated) rec.nextRepeats++;
    }

    for (let id of currSnapshot.ids) {
        let rec = ensureObj(repeatOutcomes, id);
        if (rec.appearances === undefined) rec.appearances = 0;
        rec.appearances++;
    }
}

function updateMarkovMatrices(winningIds) {
    let ids = winningIds.map(Number).filter(x => !isNaN(x));
    if (ids.length === 0) return;

    let size = fullHistory.length;
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
// 🎓 6. واجهة التدريب
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
// 🧩 7. الطبقة 1: تحليل التكرار
// ============================================================
function layerFrequency(slots) {
    let result = {};
    let shortTotal = ai1History.length;
    let midTotal = Math.min(14, fullHistory.length);
    let longTotal = fullHistory.length;

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

        let score = (shortFreq * 0.5) + (midFreq * 0.3) + (longFreq * 0.2);
        result[id] = clamp(score, 0, 1);
    }

    return result;
}

// ============================================================
// 🌟 8. الطبقة 2: اضمحلال الحداثة (مع أرضية)
// ============================================================
function layerRecency(slots) {
    let result = {};
    let halfLife = 5.0;
    let currentRound = roundCounter;

    for (let slot of slots) {
        let id = slot.id;
        let lastRound = lastAppearanceRound[id];

        if (lastRound === undefined) {
            result[id] = 1.0;
            continue;
        }

        let roundsSince = currentRound - lastRound;
        if (roundsSince < 0) roundsSince = 0;

        let decay = 1 - Math.exp(-roundsSince / halfLife);
        let finalScore = RECENCY_FLOOR + (1 - RECENCY_FLOOR) * decay;
        result[id] = clamp(finalScore, RECENCY_FLOOR, 1);
    }

    return result;
}

// ============================================================
// 🔗 9. الطبقة 3: ماركوف 1
// ============================================================
function layerMarkov1(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0;

    if (fullHistory.length < 2) return result;

    let lastFruit = fullHistory[fullHistory.length - 1];
    let row = markov1Matrix[lastFruit];
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
// 🔗🔗 10. الطبقة 4: ماركوف 2
// ============================================================
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
// 🎯 11. الطبقة 5: التغطية
// ============================================================
function layerCoverage(slots) {
    let result = {};
    for (let slot of slots) {
        let id = slot.id;
        let count = ai1Occurrences[id] || 0;

        if (count === 0) {
            result[id] = 1.0;
        } else {
            let score = COVERAGE_FLOOR + 0.08 * count;
            result[id] = clamp(score, COVERAGE_FLOOR, 0.75);
        }
    }
    return result;
}

// ============================================================
// 📏 12. الطبقة 6: تحليل الفجوات
// ============================================================
function layerGap(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0.5;

    let currentRound = roundCounter;

    for (let slot of slots) {
        let id = slot.id;
        let gaps = gapHistory[id];
        let lastRound = lastAppearanceRound[id];

        if (!gaps || gaps.length === 0) {
            if (lastRound === undefined) {
                result[id] = 1.0;
            } else {
                let roundsSince = currentRound - lastRound;
                result[id] = clamp(roundsSince / 10, 0, 1);
            }
            continue;
        }

        let avgGap = mean(gaps);
        if (avgGap <= 0) avgGap = 1;

        let currentGap = lastRound !== undefined ? (currentRound - lastRound) : avgGap * 2;
        if (currentGap < 0) currentGap = 0;

        let overdueRatio = currentGap / avgGap;
        overdueRatio = clamp(overdueRatio, 0, 2);
        result[id] = overdueRatio / 2;
    }

    return result;
}

// ============================================================
// 👥 13. الطبقة 7: التزامن
// ============================================================
function layerCooccurrence(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0;

    if (fullHistory.length < 2) return result;

    let recent = fullHistory.slice(-5);
    let recentSet = new Set(recent);

    for (let slot of slots) {
        let id = slot.id;
        let row = cooccurrenceMatrix[id];
        if (!row) continue;

        let total = 0;
        for (let k in row) total += row[k];
        if (total === 0) continue;

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
// 📊 14. الطبقة 8: التذبذب
// ============================================================
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
        let cv = std / avg;
        let reliability = 1 / (1 + cv);

        let lastRound = lastAppearanceRound[id];
        let currentGap = lastRound !== undefined ? (roundCounter - lastRound) : avg;

        let overdue = currentGap / avg;
        overdue = clamp(overdue, 0, 1.5);

        result[id] = clamp(reliability * (overdue / 1.5), 0, 1);
    }

    return result;
}

// ============================================================
// 🔁 15. الطبقة 9: كشف السلاسل
// ============================================================
function layerStreak(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0;

    for (let slot of slots) {
        let id = slot.id;
        let streaks = streakHistory[id];

        if (!streaks || streaks.length === 0) {
            result[id] = 0.5;
            continue;
        }

        let avgStreak = mean(streaks.map(s => s.length));
        if (avgStreak <= 0) avgStreak = 1;

        let currentStreak = streaks[streaks.length - 1];
        let currentLen = currentStreak.length;

        if (currentStreak.closed) {
            result[id] = clamp(avgStreak / 3, 0, 1);
        } else {
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
// ⚖️ 16. الطبقة 10: التمهيد البايزي
// ============================================================
function layerBayesian(slots) {
    let result = {};
    let priorStrength = 0.15;

    for (let slot of slots) {
        let id = slot.id;
        let count = fullOccurrences[id] || 0;
        let total = fullHistory.length;
        let n = slots.length || 8;
        let score = safeDivide(count + priorStrength, total + priorStrength * n, 1 / n);
        result[id] = clamp(score * n, 0, 1);
    }

    return result;
}

// ============================================================
// 🆕 17. الطبقة 11: ميل التكرار
// ============================================================
function layerRepeatTendency(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0.5;

    if (fullHistory.length < 2) return result;

    let lastRound = roundSnapshots.length > 0
        ? roundSnapshots[roundSnapshots.length - 1]
        : null;

    let recentIds = new Set(lastRound ? lastRound.ids : []);

    for (let slot of slots) {
        let id = slot.id;
        let rec = repeatOutcomes[id];

        if (!rec || !rec.nextTotal || rec.nextTotal === 0) {
            result[id] = 0.5;
            continue;
        }

        let repeatRate = safeDivide(rec.nextRepeats, rec.nextTotal, 0.5);

        if (recentIds.has(id)) {
            result[id] = clamp(0.5 + repeatRate * 0.5, 0, 1);
        } else {
            result[id] = clamp(0.3 + repeatRate * 0.3, 0, 1);
        }
    }

    return result;
}

// ============================================================
// 🆕 18. الطبقة 12: كشف الدورات القصيرة
// ============================================================
function layerLoopCycle(slots) {
    let result = {};
    for (let slot of slots) result[slot.id] = 0.5;

    let currentRound = roundCounter;

    for (let slot of slots) {
        let id = slot.id;
        let gaps = gapHistory[id];

        if (!gaps || gaps.length < 3) continue;

        let avgGap = mean(gaps);
        let stdGap = stdDev(gaps);

        if (avgGap <= 0) continue;

        let cv = stdGap / avgGap;

        if (cv > 0.5) {
            result[id] = 0.3;
            continue;
        }

        let lastRound = lastAppearanceRound[id];
        if (lastRound === undefined) {
            result[id] = 0.5;
            continue;
        }

        let roundsSince = currentRound - lastRound;
        let expectedRounds = avgGap;

        let distance = Math.abs(roundsSince - expectedRounds);
        let proximity = 1 - clamp(distance / (expectedRounds + 1), 0, 1);
        let regularity = 1 - cv;

        result[id] = clamp(proximity * regularity + 0.2, 0, 1);
    }

    return result;
}

// ============================================================
// 🧬 19. مجمّع الطبقات
// ============================================================
function computeEnsembleScores(slots, prevSel) {
    let L_freq    = layerFrequency(slots);
    let L_rec     = layerRecency(slots);
    let L_m1      = layerMarkov1(slots);
    let L_m2      = layerMarkov2(slots);
    let L_cov     = layerCoverage(slots);
    let L_gap     = layerGap(slots);
    let L_co      = layerCooccurrence(slots);
    let L_vol     = layerVolatility(slots);
    let L_streak  = layerStreak(slots);
    let L_bayes   = layerBayesian(slots);
    let L_repeat  = layerRepeatTendency(slots);
    let L_loop    = layerLoopCycle(slots);

    let prevBonus = {};
    for (let slot of slots) {
        prevBonus[slot.id] = prevSel.includes(slot.id) ? 0.05 : 0;
    }

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
            (L_repeat[id] || 0) * ENSEMBLE_WEIGHTS.repeatTendency +
            (L_loop[id]   || 0) * ENSEMBLE_WEIGHTS.loopCycle +
            prevBonus[id];

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
            bayesian: L_bayes,
            repeatTendency: L_repeat,
            loopCycle: L_loop
        }
    };
}

// ============================================================
// 📊 20. التطبيع
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
// 🎲 21. Jitter
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
// 🔄 22. القلب
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
// 🧮 23. حساب الاحتمالات النهائية
// ============================================================
function calculateAllProbabilities(slots, previousSelection) {
    let prevSel = normalizeSelection(previousSelection);

    let ensemble = computeEnsembleScores(slots, prevSel);
    let probs = normalizeToProbabilities(ensemble.scores);
    probs = applyLightJitter(probs);
    if (INVERT_PREDICTION_MODE) probs = invertProbabilities(probs);

    return {
        probabilities: probs,
        breakdown: ensemble.breakdown
    };
}

// ============================================================
// 🏋️ 24. حساب الأوزان
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
// 🎰 25. السحب المرجّح
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
// 🆕 25.5. اختيار الفواكه الصغيرة مع الإدراج الإجباري
// ============================================================
/**
 * 🆕 القاعدة الجذرية:
 *  - أي فاكهة صغيرة (برتقال=1، ليمون=2، عنب=3، تفاح=5) لم تُذكر في توقع
 *    الجولة الماضية → تُدرج إجبارياً في التوقعات القادمة
 *  - الأولوية للأقدم (الأكثر غياباً عن التوقعات)
 *  - الباقي من الخانات يُملأ بالأوزان الطبيعية
 *
 * المنطق الرياضي:
 *  - roundsOut = currentPredictionRound - lastPred - 1
 *    - roundsOut = 0 → ذُكرت في التوقع الماضي (ليست مستحقة)
 *    - roundsOut >= 1 → غائبة لـ 1+ جولات (مستحقة للإدراج الإجباري)
 *    - lastPred غير موجود → لم تُذكر أبداً (أعلى أولوية)
 *
 * مثال عملي (4 فواكه صغيرة، 3 خانات):
 *  - الجولة 0: [برتقال، عنب، تفاح] → ليمون غائب
 *  - الجولة 1: ليمون إجباري + 2 بالوزن
 *  - الجولة 2: الفاكهة الغائبة من الجولة 1 إجبارية + 2 بالوزن
 *  - … دوران مستمر بلا نسيان
 *
 * @param {Array} smallPool - الفواكه الصغيرة المتاحة
 * @param {Object} weights - الأوزان المحسوبة
 * @param {Number} count - عدد الخانات المطلوبة (3)
 * @param {Set} usedIds - معرفات مستخدمة (عادة فارغة هنا)
 * @returns {Array} - الفواكه المختارة
 */
function selectSmallFruitsWithForcedInclusion(smallPool, weights, count, usedIds) {
    usedIds = usedIds || new Set();

    // 1. حساب "درجة الغياب" لكل فاكهة
    let items = smallPool
        .filter(slot => !usedIds.has(slot.id))
        .map(slot => {
            let lastPred = smallPredictionTracker[slot.id];
            let roundsOut;
            if (lastPred === undefined) {
                // لم تُذكر في أي توقع سابق — أولوية قصوى
                roundsOut = 999;
            } else {
                // عدد الجولات التي مرت منذ آخر توقع
                // -1 لأننا نطرح الجولة الحالية من الحساب
                roundsOut = currentPredictionRound - lastPred - 1;
                if (roundsOut < 0) roundsOut = 0;
            }
            return { slot: slot, roundsOut: roundsOut };
        });

    // 2. ترتيب: الأكثر غياباً أولاً، ثم الأثقل وزناً (كسر التعادل)
    items.sort((a, b) => {
        if (b.roundsOut !== a.roundsOut) return b.roundsOut - a.roundsOut;
        let wa = weights[a.slot.id] || 1;
        let wb = weights[b.slot.id] || 1;
        return wb - wa;
    });

    let picked = [];
    let pickedIds = new Set();

    // 3. تمريرة 1: الإدراج الإجباري للمستحقة (roundsOut >= 1)
    for (let item of items) {
        if (picked.length >= count) break;
        if (item.roundsOut >= 1 && !pickedIds.has(item.slot.id)) {
            picked.push(item.slot);
            pickedIds.add(item.slot.id);
        }
    }

    // 4. تمريرة 2: الباقي بالوزن الطبيعي (بدون إجبار)
    if (picked.length < count) {
        let remaining = items
            .filter(x => !pickedIds.has(x.slot.id))
            .map(x => x.slot);

        let needed = count - picked.length;
        let more = pickMultipleFromPool(remaining, weights, needed, pickedIds);

        for (let s of more) {
            picked.push(s);
            pickedIds.add(s.id);
        }
    }

    return picked;
}

// ============================================================
// 🏗️ 26. بناء كائن التوقع
// ============================================================
function buildPrediction(slot, category, allProbs, breakdown) {
    let groupIds = category === 'SMALL' ? SMALL_FRUIT_IDS : BIG_FRUIT_IDS;

    let groupTotal = 0;
    for (let gid of groupIds) {
        if (allProbs[gid] !== undefined) groupTotal += allProbs[gid];
    }

    let rawProb = groupTotal > 0
        ? (allProbs[slot.id] / groupTotal) * 100
        : 100 / groupIds.length;

    let probability = Math.round(rawProb * 10) / 10;
    let confidence = Math.round(clamp(probability + 25, 40, 99));

    let layerDetails = {};
    for (let layerName in breakdown) {
        let layerMap = breakdown[layerName];
        if (layerMap && layerMap[slot.id] !== undefined) {
            layerDetails[layerName] = Math.round(layerMap[slot.id] * 1000) / 1000;
        }
    }

    // 🆕 معلومات الغياب عن التوقعات (للفواكه الصغيرة)
    let roundsSincePredicted = null;
    if (category === 'SMALL') {
        let lastPred = smallPredictionTracker[slot.id];
        if (lastPred === undefined) {
            roundsSincePredicted = 'never';
        } else {
            roundsSincePredicted = currentPredictionRound - lastPred - 1;
            if (roundsSincePredicted < 0) roundsSincePredicted = 0;
        }
    }

    return {
        id: slot.id,
        nameAr: FRUIT_NAMES_AR[slot.id] || '',
        top: slot.top,
        left: slot.left,
        weight: Math.max(1, Math.round(allProbs[slot.id] || 1)),
        probability: probability,
        confidence: confidence,
        score: (probability * 10).toFixed(1),
        minority: (probability / 10).toFixed(1),
        category: category,
        inverted: INVERT_PREDICTION_MODE,
        roundsSincePredicted: roundsSincePredicted, // 🆕
        layers: layerDetails
    };
}

// ============================================================
// 🎯 27. توليد 5 توقعات
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

        let calc = calculateAllProbabilities(slots, previousSelection);
        let probs = calc.probabilities;
        let breakdown = calc.breakdown;

        let weights = {};
        for (let id in probs) weights[id] = Math.max(1, Math.round(probs[id]));

        let result = [];
        let usedIds = new Set();

        // 🆕 3 فواكه صغيرة — مع الإدراج الإجباري للمستحقة
        let smallPicked = selectSmallFruitsWithForcedInclusion(smallPool, weights, 3, usedIds);
        for (let slot of smallPicked) {
            result.push(buildPrediction(slot, 'SMALL', probs, breakdown));
            usedIds.add(slot.id);
            // 🆕 تسجيل أن هذه الفاكهة ذُكرت في هذه الجولة
            smallPredictionTracker[slot.id] = currentPredictionRound;
        }
        // 🆕 زيادة عدّاد جولات التوقع (للجميع، صغير وكبير — لكن التتبع للصغير فقط)
        currentPredictionRound++;

        // 2 فواكه كبيرة — بدون تغيير
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
// 📈 28. إحصائيات تفصيلية
// ============================================================
function getDetailedStats() {
    let fruitStats = {};
    for (let id in FRUIT_NAMES_AR) {
        let numId = Number(id);
        let gaps = gapHistory[numId] || [];
        let rec = repeatOutcomes[numId] || {};
        let lastPred = smallPredictionTracker[numId];

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
            totalStreaks: (streakHistory[numId] || []).length,
            repeatRate: rec.nextTotal ? Math.round(safeDivide(rec.nextRepeats, rec.nextTotal) * 100) / 100 : null,
            repeatTotal: rec.nextTotal || 0,
            repeatCount: rec.nextRepeats || 0,
            // 🆕 معلومات التوقع (للفواكه الصغيرة)
            lastPredictedRound: lastPred !== undefined ? lastPred : null,
            roundsSincePredicted: lastPred !== undefined
                ? Math.max(0, currentPredictionRound - lastPred - 1)
                : 'never'
        };
    }

    return {
        roundCounter,
        totalTrained,
        memorySize: ai1History.length,
        fullHistorySize: fullHistory.length,
        logSize: trainedFruitsLog.length,
        inversionMode: INVERT_PREDICTION_MODE,
        recencyFloor: RECENCY_FLOOR,
        coverageFloor: COVERAGE_FLOOR,
        currentPredictionRound: currentPredictionRound, // 🆕
        fruits: fruitStats
    };
}

// ============================================================
// 🔧 29. إدارة الحالة
// ============================================================
function getLearningStats() {
    return {
        totalTrained: totalTrained,
        perFruit: { ...learningBoost },
        memorySize: ai1History.length,
        fullHistorySize: fullHistory.length,
        logSize: trainedFruitsLog.length,
        inversionMode: INVERT_PREDICTION_MODE,
        roundCounter: roundCounter,
        recencyFloor: RECENCY_FLOOR,
        coverageFloor: COVERAGE_FLOOR,
        repeatSnapshots: roundSnapshots.length,
        currentPredictionRound: currentPredictionRound, // 🆕
        smallPredictionTracker: { ...smallPredictionTracker } // 🆕
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

    repeatOutcomes = {};
    roundSnapshots = [];

    // 🆕 إعادة تعيين متتبّع التوقع
    smallPredictionTracker = {};
    currentPredictionRound = 0;

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
// 🔙 30. توافق عكسي
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
// 🔬 31. تشخيص
// ============================================================
function debugPrintAllProbabilities(slots, previousSelection) {
    let calc = calculateAllProbabilities(slots, previousSelection);
    let probs = calc.probabilities;

    let out = {
        small: {},
        big: {}
    };

    let smallTotal = 0, bigTotal = 0;
    for (let gid of SMALL_FRUIT_IDS) smallTotal += (probs[gid] || 0);
    for (let gid of BIG_FRUIT_IDS) bigTotal += (probs[gid] || 0);

    for (let gid of SMALL_FRUIT_IDS) {
        let lastPred = smallPredictionTracker[gid];
        out.small[gid] = {
            nameAr: FRUIT_NAMES_AR[gid],
            probability: smallTotal > 0
                ? Math.round((probs[gid] / smallTotal) * 1000) / 10
                : 25,
            roundsSincePredicted: lastPred === undefined
                ? 'never'
                : Math.max(0, currentPredictionRound - lastPred - 1)
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
// 🧪 32. اختبار ذاتي
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
    trainAlgorithm('تفاح');
    trainAlgorithm('ليمون');
    trainAlgorithm('تفاح');

    let preds = generatePrediction(slots, []);
    let debug = debugPrintAllProbabilities(slots, []);
    let stats = getDetailedStats();

    return { predictions: preds, probabilities: debug, stats: stats };
}

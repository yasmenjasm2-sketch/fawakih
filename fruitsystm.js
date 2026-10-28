/**
 * ============================================================================
 * YALLA FRUIT - NEXUS FIRST ALGORITHM ENGINE (AI1) - v8.0
 * 5 تخمينات: 3 فواكه صغيرة + 2 فواكه كبيرة | الخامسة مميزة بالأحمر المتوهج
 * ============================================================================
 */

// 1. قاموس ربط الأسماء بالأرقام
const fruitNameToIdMap = {
    'برتقال': 1, 'ليمون': 2, 'عنب': 3, 'كرز': 4,
    'تفاح': 5, 'بطيخ': 6, 'مانجو': 7, 'فراولة': 8,
    'orange': 1, 'lemon': 2, 'grape': 3, 'cherry': 4,
    'apple': 5, 'watermelon': 6, 'mango': 7, 'strawberry': 8,
    'برتق': 1, 'لمون': 2, 'عنبة': 3, 'كرزة': 4,
    'تفاحة': 5, 'بطيخة': 6, 'مانجة': 7, 'فراوله': 8
};

// 2. تصنيف الفواكه (الصغيرة والكبيرة)
const SMALL_FRUIT_IDS = [1, 2, 3, 5];   // برتقال، ليمون، عنب، تفاح
const BIG_FRUIT_IDS = [4, 6, 7, 8];     // كرز، بطيخ، مانجو، فراولة

// 3. متغيرات الذاكرة ونظام التعلم
let ai1History = [];
let ai1Occurrences = {};
let learningBoost = {};
let totalTrained = 0;
let trainedFruitsLog = [];

// 4. العشوائية (Fisher-Yates)
function shuffleArray(array) {
    let newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 5. تحديث الذاكرة قصيرة المدى
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

// 7. حساب وزن الفاكهة
function calculateFruitWeight(slot, previousSelection) {
    const slotId = slot.id;

    // وزن عشوائي أساسي
    let weight = Math.floor(Math.random() * 8) + 1;

    // مكافأة التعلم
    weight += (learningBoost[slotId] || 0) * 5;

    // مكافأة التكرار في الذاكرة
    weight += (ai1Occurrences[slotId] || 0) * 3;

    // انتقال ماركوف
    if (ai1History.length >= 2) {
        const lastWinner = ai1History[ai1History.length - 1];
        for (let i = 0; i < ai1History.length - 1; i++) {
            if (ai1History[i] === lastWinner && ai1History[i + 1] === slotId) {
                weight += 4;
                break;
            }
        }
    }

    // مكافأة التنوع
    const lastThree = ai1History.slice(-3);
    if (!lastThree.includes(slotId)) {
        weight += 3;
    }

    // ضمان وزن إيجابي دائمًا (إصلاح مشكلة الوزن الصفري)
    weight = Math.max(1, Math.min(weight, 50));
    return weight;
}

// 8. اختيار موزون (بدون تكرار) - الإصلاح الأساسي لمشاكل التخمين
function weightedSelect(poolSlots, count, previousSelection) {
    if (!poolSlots || poolSlots.length === 0) return [];

    const selected = [];
    let available = [...poolSlots];
    const target = Math.min(count, available.length);

    for (let i = 0; i < target; i++) {
        const weighted = available.map(slot => ({
            slot,
            weight: calculateFruitWeight(slot, previousSelection)
        }));

        // بناء مجمع اليانصيب
        let lotteryPool = [];
        weighted.forEach(item => {
            for (let w = 0; w < item.weight; w++) {
                lotteryPool.push(item.slot);
            }
        });

        if (lotteryPool.length === 0) {
            lotteryPool = available.slice();
        }

        lotteryPool = shuffleArray(lotteryPool);
        const chosen = lotteryPool[0];

        selected.push(chosen);
        available = available.filter(s => s.id !== chosen.id);
    }

    return selected;
}

// 9. توليد التوقعات (5 تخمينات: 3 صغيرة + 2 كبيرة)
function generatePrediction(slots, previousSelection) {
    try {
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة.");
        }

        if (previousSelection && previousSelection.length > 0) {
            updateAIMemory(previousSelection);
        }

        const smallSlots = slots.filter(s => SMALL_FRUIT_IDS.includes(s.id));
        const bigSlots = slots.filter(s => BIG_FRUIT_IDS.includes(s.id));

        // 3 فواكه صغيرة + 2 فواكه كبيرة = 5
        const selectedSmall = weightedSelect(smallSlots, 3, previousSelection);
        const selectedBig = weightedSelect(bigSlots, 2, previousSelection);

        const result = [...selectedSmall, ...selectedBig];

        if (result.length !== 5) {
            throw new Error(`فشل في استخراج 5 توقعات (تم استخراج ${result.length}).`);
        }

        return result;

    } catch (error) {
        console.error("خطأ في الخوارزمية الأولى:", error.message);
        return null;
    }
}

// 10. وظائف إدارة السجل
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

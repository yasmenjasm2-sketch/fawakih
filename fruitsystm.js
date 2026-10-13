// ============================================================================
// YALLA FRUIT v7.0 - NEXUS SINGLE BRAIN ENGINE (fruitsystm.js)
// عقل واحد فقط (AI1) مع سجل كامل لعمليات التعلم
// ============================================================================

// 1. قاموس ربط الأسماء بالأرقام (عربي + إنجليزي + اختصارات)
const fruitNameToIdMap = {
    'برتقال': 1, 'ليمون': 2, 'عنب': 3, 'كرز': 4,
    'تفاح': 5, 'بطيخ': 6, 'مانجو': 7, 'فراولة': 8,
    'orange': 1, 'lemon': 2, 'grape': 3, 'cherry': 4,
    'apple': 5, 'watermelon': 6, 'mango': 7, 'strawberry': 8,
    'برتق': 1, 'لمون': 2, 'عنبة': 3, 'كرزة': 4,
    'تفاحة': 5, 'بطيخة': 6, 'مانجة': 7, 'فراوله': 8
};

// 2. متغيرات الذاكرة
let ai1History = [];
let ai1Occurrences = {};
let learningBoost = {};
let totalTrained = 0;

// ✨ سجل كامل لجميع الفواكه المُتعلمة بالترتيب (لعرضها في الواجهة)
let trainedFruitsLog = [];

// دالة خلط المصفوفات (Fisher-Yates)
function shuffleArray(array) {
    let newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 3. تحديث الذاكرة قصيرة المدى
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

// 4. ✨ دالة التعلم - تُغذّي العقل وتُسجّل الفاكهة في السجل
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

    // 🧠 التغذية الفعلية للعقل
    updateAIMemory([foundId]);
    learningBoost[foundId] = (learningBoost[foundId] || 0) + 1;
    totalTrained++;

    // ✨ إضافة الفاكهة للسجل الدائم
    trainedFruitsLog.push({
        name: fruitName.trim(),
        id: foundId,
        boost: learningBoost[foundId],
        time: Date.now()
    });

    return {
        success: true,
        id: foundId,
        boost: learningBoost[foundId],
        totalTrained: totalTrained
    };
}

// 5. ✨ إحصائيات التعلم
function getLearningStats() {
    const stats = {};
    for (const id in learningBoost) {
        stats[id] = learningBoost[id];
    }
    return {
        totalTrained: totalTrained,
        perFruit: stats,
        memorySize: ai1History.length,
        logSize: trainedFruitsLog.length
    };
}

// 6. ✨ استرجاع سجل الفواكه المُتعلمة (للنافذة المنبثقة)
function getTrainedFruits() {
    return [...trainedFruitsLog];
}

// 7. إعادة تعيين ذاكرة التعلم
function resetLearning() {
    ai1History = [];
    ai1Occurrences = {};
    learningBoost = {};
    trainedFruitsLog = [];
    totalTrained = 0;
    return true;
}

// 8. حساب الوزن
function calculateFruitWeight(slot, previousSelection) {
    let slotId = slot.id;

    if (slotId === 4 || slotId === 6) return 0;

    let weight = Math.floor(Math.random() * 8) + 1;

    // ✨ مكافأة التعلم
    let trainBoost = learningBoost[slotId] || 0;
    weight += trainBoost * 5;

    // تكرار في الذاكرة
    let count = ai1Occurrences[slotId] || 0;
    weight += count * 3;

    // التسلسل الانتقالي (Markov)
    if (ai1History.length >= 2) {
        let lastWinner = ai1History[ai1History.length - 1];
        for (let i = 0; i < ai1History.length - 1; i++) {
            if (ai1History[i] === lastWinner && ai1History[i + 1] === slotId) {
                weight += 4;
                break;
            }
        }
    }

    // مكافأة التنوع
    let lastThree = ai1History.slice(-3);
    if (!lastThree.includes(slotId)) {
        weight += 3;
    }

    // استثناءات
    let prevIds = previousSelection || [];
    if ((slotId === 8 || slotId === 7) && prevIds.includes(slotId)) {
        weight = 0;
    }

    weight = Math.min(weight, 45);
    return Math.max(0, weight);
}

// 9. توليد التوقعات
function generatePrediction(slots, previousSelection) {
    try {
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة.");
        }

        if (previousSelection && previousSelection.length > 0) {
            updateAIMemory(previousSelection);
        }

        let lotteryPool = [];
        let weightedSlots = slots.map(slot => {
            let w = calculateFruitWeight(slot, previousSelection);
            return { slot: slot, weight: w };
        });

        weightedSlots.forEach(item => {
            for (let i = 0; i < item.weight; i++) {
                lotteryPool.push(item.slot);
            }
        });

        lotteryPool = shuffleArray(lotteryPool);

        let selectedSlots = [];
        for (let slot of lotteryPool) {
            if (!selectedSlots.some(s => s.id === slot.id)) {
                selectedSlots.push(slot);
            }
            if (selectedSlots.length === 4) break;
        }

        if (selectedSlots.length < 4) {
            let remainingSlots = slots.filter(s => 
                !selectedSlots.some(sel => sel.id === s.id) && 
                s.id !== 4 && s.id !== 6
            );
            remainingSlots = shuffleArray(remainingSlots);
            while (selectedSlots.length < 4 && remainingSlots.length > 0) {
                selectedSlots.push(remainingSlots.pop());
            }
        }

        selectedSlots = shuffleArray(selectedSlots);

        if (selectedSlots.length !== 4) {
            throw new Error("فشل استخراج 4 توقعات.");
        }

        return selectedSlots;

    } catch (error) {
        console.error("خطأ في الخوارزمية:", error.message);
        return null;
    }
}

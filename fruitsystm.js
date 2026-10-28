/**
 * ============================================================================
 * YALLA FRUIT - NEXUS FIRST ALGORITHM ENGINE (AI1)
 * النظام الكامل للخوارزمية الأولى: الأوزان، الذاكرة قصيرة المدى، التعلم، والعشوائية
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

// 2. متغيرات الذاكرة ونظام التعلم
let ai1History = [];            // الذاكرة قصيرة المدى (تتسع لآخر 7 عناصر)
let ai1Occurrences = {};        // تكرارات الفواكه داخل الذاكرة
let learningBoost = {};         // نقاط التعزيز الخاصة بخاصية التعلم اليدوي/التلقائي
let totalTrained = 0;           // عداد عمليات التدريب الكلية
let trainedFruitsLog = [];      // سجل تفصيلي لجميع الفواكه المتعلمة

// 3. طريقة عمل العشوائية (Fisher-Yates Shuffle Algorithm)
function shuffleArray(array) {
    let newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 3.1 دالة خلط قوية متعدد المرات لضمان عشوائية حقيقية
function strongShuffle(array, passes = 3) {
    let result = [...array];
    for (let p = 0; p < passes; p++) {
        result = shuffleArray(result);
    }
    return result;
}

// 4. تحديث الذاكرة قصيرة المدى
function updateAIMemory(winningIds) {
    if (!winningIds || winningIds.length === 0) return;
    winningIds.forEach(id => {
        let numericId = Number(id);
        ai1History.push(numericId);
        ai1Occurrences[numericId] = (ai1Occurrences[numericId] || 0) + 1;
        
        // الحفاظ على حجم الذاكرة بحد أقصى 7 عناصر
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

// 5. خاصية التعلم (Train Algorithm) - لتغذية العقل بمعلومات جديدة
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

    // تغذية الذاكرة وزيادة نقاط التعزيز
    updateAIMemory([foundId]);
    learningBoost[foundId] = (learningBoost[foundId] || 0) + 1;
    totalTrained++;

    // تسجيل العملية في السجل الدائم
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

// 6. حساب الأوزان لكل فاكهة بناءً على المعايير الخوارزمية
function calculateFruitWeight(slot, previousSelection) {
    let slotId = slot.id;

    // الوزن الأساسي العشوائي البسيط (بين 1 و 8)
    let weight = Math.floor(Math.random() * 8) + 1;

    // إضافة وزن خاصية التعلم (كل عملية تعلّم تزيد الأفضلية بـ 5 نقاط)
    let trainBoost = learningBoost[slotId] || 0;
    weight += trainBoost * 5;

    // إضافة وزن التكرار داخل الذاكرة قصيرة المدى (كل تكرار يزيد الوزن بـ 3 نقاط)
    let count = ai1Occurrences[slotId] || 0;
    weight += count * 3;

    // تسلسل انتقال ماركوف (Markov Chain Transition)
    if (ai1History.length >= 2) {
        let lastWinner = ai1History[ai1History.length - 1];
        for (let i = 0; i < ai1History.length - 1; i++) {
            if (ai1History[i] === lastWinner && ai1History[i + 1] === slotId) {
                weight += 4;
                break;
            }
        }
    }

    // مكافأة التنوع (إذا لم تكن الفاكهة ضمن آخر 3 عناصر تم اختيارها)
    let lastThree = ai1History.slice(-3);
    if (!lastThree.includes(slotId)) {
        weight += 3;
    }

    // ============================================================
    // 🔻 تقليل ظهور الكرز (4) والبطيخ (6) بشكل قوي
    // - تخفيض الوزن بنسبة 75% ثم خصم إضافي عشوائي
    // - هذا يجعل ظهورهما نادرًا جدًا دون إلغاء كامل
    // ============================================================
    if (slotId === 4 || slotId === 6) {
        weight = Math.floor(weight * 0.25);          // تخفيض 75%
        weight = Math.max(0, weight - (Math.floor(Math.random() * 2) + 1)); // خصم إضافي 1-2
    }

    // استثناءات وتخفيض أوزان بعض العناصر بناءً على الجولة السابقة
    let prevIds = previousSelection || [];
    if ((slotId === 8 || slotId === 7) && prevIds.includes(slotId)) {
        weight = 0;
    }

    // ============================================================
    // 🎲 تقوية العشوائية: إضافة "Jitter" عشوائي على كل وزن
    // هذا يمنع الجمود ويجعل التوزيع غير متوقع حتى مع وجود التعلم
    // ============================================================
    weight += Math.random() * 7;   // ضجيج عشوائي قوي (0 - 7)

    // سقف الأوزان بحد أقصى 45 وضمان عدم نزوله عن 0
    weight = Math.min(weight, 45);
    return Math.max(0, weight);
}

// 7. طريقة التخمين والعشوائية الذكية وتوليد التوقعات (Generate Prediction)
function generatePrediction(slots, previousSelection) {
    try {
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة.");
        }

        if (previousSelection && previousSelection.length > 0) {
            updateAIMemory(previousSelection);
        }

        // ============================================================
        // بناء قائمة مرجّحة مع مفتاح عشوائي لكل عنصر
        // ============================================================
        let weightedSlots = slots.map(slot => {
            let w = calculateFruitWeight(slot, previousSelection);
            return {
                slot: slot,
                weight: w,
                randomKey: Math.random()   // مفتاح عشوائي إضافي لكسر التعادل
            };
        });

        // خلط قوي متعدد المرات لقائمة الأوزان نفسها
        weightedSlots = strongShuffle(weightedSlots, 4);

        // ترتيب عشوائي مرجّح: الوزن + ضجيج عشوائي قوي
        weightedSlots.sort((a, b) => {
            let scoreA = a.weight + (a.randomKey * 8);
            let scoreB = b.weight + (b.randomKey * 8);
            return scoreB - scoreA;
        });

        // ============================================================
        // بناء مجمع اليانصيب (Lottery Pool) بناءً على الأوزان المحسوبة
        // ============================================================
        let lotteryPool = [];
        weightedSlots.forEach(item => {
            for (let i = 0; i < item.weight; i++) {
                lotteryPool.push(item.slot);
            }
        });

        // خلط المجمع بقوة عشوائية عالية (5 مرات متتالية)
        lotteryPool = strongShuffle(lotteryPool, 5);

        let selectedSlots = [];
        for (let slot of lotteryPool) {
            if (!selectedSlots.some(s => s.id === slot.id)) {
                selectedSlots.push(slot);
            }
            if (selectedSlots.length === 4) break;
        }

        // ============================================================
        // استكمال النقص إن وجد بعناصر عشوائية غير مكررة
        // (بدون استبعاد صريح للكرز/البطيخ — الوزن المنخفض يتكفل بالتقليل)
        // ============================================================
        if (selectedSlots.length < 4) {
            let remainingSlots = slots.filter(s =>
                !selectedSlots.some(sel => sel.id === s.id)
            );
            remainingSlots = strongShuffle(remainingSlots, 3);
            while (selectedSlots.length < 4 && remainingSlots.length > 0) {
                // اختيار عشوائي حقيقي من المتبقي
                let randIdx = Math.floor(Math.random() * remainingSlots.length);
                selectedSlots.push(remainingSlots.splice(randIdx, 1)[0]);
            }
        }

        // ============================================================
        // خلط نهائي قوي جداً لترتيب التوقعات (توزيع عشوائي كامل)
        // ============================================================
        selectedSlots = strongShuffle(selectedSlots, 5);

        if (selectedSlots.length !== 4) {
            throw new Error("فشل استخراج 4 توقعات.");
        }

        return selectedSlots;

    } catch (error) {
        console.error("خطأ في الخوارزمية الأولى:", error.message);
        return null;
    }
}

// 8. وظائف إضافية لإدارة السجل والإحصائيات
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

// ============================================================================
// YALLA FRUIT v7.0 - NEXUS HYBRID ENGINE (fruitsystm.js)
// الخوارزمية الكاملة: نظام العقول المزدوجة، الذاكرة قصيرة المدى، القرعة الموزونة
// ============================================================================

// 1. قاموس ربط الأسماء بالأرقام التعريفية
const fruitNameToIdMap = {
    'برتقال': 1, 'ليمون': 2, 'عنب': 3,
    'كرز': 4, 'تفاح': 5, 'بطيخ': 6,
    'مانجو': 7, 'فراولة': 8
};

// 2. متغيرات الذاكرة قصيرة المدى ونظام التبديل بين العقول
let ai1History = [];            // الذاكرة قصيرة المدى (مصفوفة تتسع لـ 7 فواكه)
let ai1Occurrences = {};        // كائن لحساب تكرارات الفواكه في الذاكرة
let activeAIMode = "AI1";       // AI1: العقل المدبر | AI2: العقل المنطقي
let consecutiveErrors = 0;      // عداد الأخطاء المتتالية للتبديل التلقائي

// دالة لخلط المصفوفات لضمان العشوائية النظيفة
function shuffleArray(array) {
    let newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 3. تحديث الذاكرة قصيرة المدى (Short-Term Memory - 7 عناصر كحد أقصى)
function updateAIMemory(winningIds) {
    if (!winningIds || winningIds.length === 0) return;

    winningIds.forEach(id => {
        let numericId = Number(id);
        ai1History.push(numericId);
        ai1Occurrences[numericId] = (ai1Occurrences[numericId] || 0) + 1;

        // عند تجاوز الـ 7 فواكه يتم حذف الفاكهة الأقدم
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

// 4. دالة استقبال الاسم وتغذية الخوارزمية (Train Algorithm)
function trainAlgorithm(fruitName) {
    let id = fruitNameToIdMap[fruitName.trim()];
    if (id) {
        updateAIMemory([id]);
        return true; // نجاح التغذية
    }
    return false; // اسم غير معروف
}

// 5. دالة تسجيل النتيجة لتقييم الأخطاء والتبديل التلقائي بين العقول
function recordRoundResult(predictedIds, actualWinnerId) {
    if (!actualWinnerId) return;

    let isHit = predictedIds.includes(actualWinnerId);
    if (isHit) {
        consecutiveErrors = 0;
        if (activeAIMode !== "AI1") {
            activeAIMode = "AI1"; // العودة للعقل المدبر عند النجاح
        }
    } else {
        consecutiveErrors++;
        // التبديل التلقائي بعد 4 أخطاء متتالية
        if (consecutiveErrors >= 4) {
            activeAIMode = (activeAIMode === "AI1") ? "AI2" : "AI1";
            consecutiveErrors = 0; // إعادة ضبط العداد بعد التبديل
        }
    }
    updateAIMemory([actualWinnerId]);
}

// 6. خوارزمية حساب أوزان الفواكه بناءً على العقل النشط والقواعد الصارمة
function calculateFruitWeight(slot, previousSelection) {
    let slotId = slot.id;

    // أ) الأساس العشوائي (Chaos Value: من 1 إلى 8)
    let weight = Math.floor(Math.random() * 8) + 1;

    // ب) حساب نقاط الوزن بناءً على نمط العقل (AI 1 أو AI 2)
    if (activeAIMode === "AI1") {
        // --- العقل الأول: العقل المدبر ---
        // 1. نقاط التكرار في الذاكرة قصيرة المدى
        let count = ai1Occurrences[slotId] || 0;
        weight += count * 3;

        // 2. التسلسل الانتقالي (Markov Sequence Probability)
        if (ai1History.length >= 2) {
            let lastWinner = ai1History[ai1History.length - 1];
            for (let i = 0; i < ai1History.length - 1; i++) {
                if (ai1History[i] === lastWinner && ai1History[i + 1] === slotId) {
                    weight += 4; // مكافأة 4 نقاط عند كشف تسلسل انتقالي
                    break;
                }
            }
        }

        // 3. مكافأة التنوع (Diversity Bonus)
        let lastThree = ai1History.slice(-3);
        if (!lastThree.includes(slotId)) {
            weight += 3;
        }

    } else {
        // --- العقل الثاني: العقل المنطقي ---
        // 1. درجة الحداثة (Recency Score)
        let recencyIndex = ai1History.lastIndexOf(slotId);
        if (recencyIndex !== -1) {
            let distance = ai1History.length - 1 - recencyIndex;
            weight += Math.max(1, 6 - distance);
        } else {
            weight += 5; // تشجيع ظهور الفواكه التي لم تظهر مؤخراً
        }

        // 2. كبح الأوزان عبر القسمة على عدد الأخطاء المتتالية
        let errorPenalty = Math.max(1, consecutiveErrors);
        weight = Math.floor(weight / errorPenalty);
    }

    // ج) قواعد الاستثناء الصارمة (Strict Exceptions)
    let prevIds = previousSelection || [];

    // 1. الفراولة (آيدي 8) والمانجو (آيدي 7): وزن = 0 إذا ظهرت في الجولة السابقة (منع التكرار)
    if ((slotId === 8 || slotId === 7) && prevIds.includes(slotId)) {
        weight = 0;
    }

    // 2. الكرز (آيدي 4) والبطيخ (آيدي 6): تنصيف الوزن إلى النصف إذا ظهرت سابقاً
    if ((slotId === 4 || slotId === 6) && prevIds.includes(slotId)) {
        weight = Math.floor(weight / 2);
    }

    // د) كبح الأوزان (Cap Weight at 45)
    weight = Math.min(weight, 45);

    return Math.max(0, weight);
}

// 7. الخوارزمية الرئيسية لتوليد التوقعات (Weighted Lottery Engine)
function generatePrediction(slots, previousSelection) {
    try {
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة أو غير صالحة.");
        }

        // 1. تحديث الذاكرة بالتوقعات السابقة
        if (previousSelection && previousSelection.length > 0) {
            updateAIMemory(previousSelection);
        }

        // 2. حساب أوزان جميع الصناديق وبناء سلة القرعة الموزونة (Weighted Lottery Pool)
        let lotteryPool = [];
        let weightedSlots = slots.map(slot => {
            let w = calculateFruitWeight(slot, previousSelection);
            return { slot: slot, weight: w };
        });

        // 3. تكرار كل فاكهة في سلة القرعة بناءً على وزنها النهائي
        weightedSlots.forEach(item => {
            for (let i = 0; i < item.weight; i++) {
                lotteryPool.push(item.slot);
            }
        });

        // 4. خلط سلة القرعة لضمان التوزيع العشوائي الموزون
        lotteryPool = shuffleArray(lotteryPool);

        // 5. اختيار أعلى 4 فواكه فريدة بدون تكرار
        let selectedSlots = [];
        for (let slot of lotteryPool) {
            if (!selectedSlots.some(s => s.id === slot.id)) {
                selectedSlots.push(slot);
            }
            if (selectedSlots.length === 4) break;
        }

        // 6. في حال عدم اكتمال 4 فواكه (بسبب استثناءات الأوزان 0)، يتم إكمالها من الفواكه المتبقية
        if (selectedSlots.length < 4) {
            let remainingSlots = slots.filter(s => !selectedSlots.some(sel => sel.id === s.id));
            remainingSlots = shuffleArray(remainingSlots);
            while (selectedSlots.length < 4 && remainingSlots.length > 0) {
                selectedSlots.push(remainingSlots.pop());
            }
        }

        // 7. الخلط النهائي للتوقعات
        selectedSlots = shuffleArray(selectedSlots);

        if (selectedSlots.length !== 4) {
            throw new Error("فشل في استخراج 4 توقعات.");
        }

        return selectedSlots;

    } catch (error) {
        console.error("خطأ في خوارزمية التخمين:", error.message);
        return null;
    }
}

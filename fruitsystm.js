/**
 * fruitsystm.js
 * ملف العقل الرئيسي المستقل لخوارزمية التخمين والتعلم الآلي
 * (طابق خوارزمية Java بنسبة 100%: الأوزان، الذاكرة 7 جولات، ندرة الكرز والبطيخ 15%، وحاسبة الأخطاء والتبديل)
 */

// ----------------- دالة الخلط العشوائي (Shuffle) -----------------
function shuffleArray(array) {
    let newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// ----------------- متغيرات الذاكرة وإدارة النظام -----------------
let ai1History = [];            // سجل الذاكرة لآخر 7 نتائج (FIFO)
let ai1Occurrences = {};        // عداد تكرارات الفواكه في الذاكرة
let wrongGuessesCount = 0;      // عداد الأخطاء المتتالية
let currentBrain = "AI 1";       // العقل النشط حالياً ("AI 1" أو "AI 2")
let lastRarePicked = null;      // لتطبيق عقوبة النصف إذا تكررت الفاكهة النادرة

/**
 * دالة تسجيل الفاكهة الصحيحة الفائزة وتحديث الذاكرة وتقييم الأخطاء
 * @param {number} winningId - معرف الفاكهة التي فازت بالواقع
 * @param {Array<number>} lastPredictions - التوقعات الأربعة التي قدمها النظام في الجولة السابقة
 * @returns {Object} تقرير تحديث التعلم
 */
function recordWinningFruit(winningId, lastPredictions) {
    winningId = Number(winningId);

    // 1. إضافة الفاكهة إلى سجل الذاكرة (Short-Term Memory - Max 7)
    ai1History.push(winningId);
    ai1Occurrences[winningId] = (ai1Occurrences[winningId] || 0) + 1;

    // إذا تجاوز السجل 7 عناصر، نقوم بحذف أقدم عنصر (FIFO)
    if (ai1History.length > 7) {
        let forgottenId = ai1History.shift();
        if (ai1Occurrences[forgottenId] > 1) {
            ai1Occurrences[forgottenId]--;
        } else {
            delete ai1Occurrences[forgottenId];
        }
    }

    // 2. تقييم هل كان التوقع السابق صحيحاً؟
    let wasCorrect = false;
    if (lastPredictions && lastPredictions.length > 0) {
        wasCorrect = lastPredictions.includes(winningId);
        if (wasCorrect) {
            // نجاح التخمين: خفض عداد الأخطاء
            if (wrongGuessesCount > 0) wrongGuessesCount--;
            // إعادة التبديل إلى AI 1 إذا نجحنا
            if (wrongGuessesCount < 4) currentBrain = "AI 1";
        } else {
            // فشل التخمين: زيادة عداد الأخطاء
            wrongGuessesCount++;
            // التبديل التلقائي إلى AI 2 عند الوصول لـ 4 أخطاء
            if (wrongGuessesCount >= 4) {
                currentBrain = "AI 2";
            }
        }
    }

    return {
        isCorrect: wasCorrect,
        wrongGuessesCount: wrongGuessesCount,
        currentBrain: currentBrain,
        history: [...ai1History]
    };
}

/**
 * الخوارزمية الأساسية لتوليد التوقعات الموزونة (NEXUS ENGINE)
 * @param {Array} slots - قائمة الفواكه المتاحة
 * @param {Array} previousSelection - التوقعات السابقة
 * @param {number|null} winningFruitId - الفاكهة الصحيحة التي أدخلها المستخدم مؤخراً (إن وجدت)
 */
function generatePrediction(slots, previousSelection, winningFruitId = null) {
    try {
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة أو غير صالحة.");
        }

        // إذا أرسل المستخدم فاكهة فائزة جديدة، يتم تدريب الذاكرة أولاً
        if (winningFruitId !== null && winningFruitId !== undefined && winningFruitId !== '') {
            recordWinningFruit(winningFruitId, previousSelection);
        }

        // ----------------- 1. تصفية القائمة ونظام الندرة (Rarity System) -----------------
        // الفواكه الأساسية الـ 6 (1, 2, 3, 5, 7, 8)
        let availableSlots = slots.filter(s => s.id !== 4 && s.id !== 6);
        let rareSlots = slots.filter(s => s.id === 4 || s.id === 6); // الكرز (4) والبطيخ (6)

        // تطبيق نسبة الدخول للكرز والبطيخ (15% فقط: Math.random() > 0.85)
        rareSlots.forEach(rareItem => {
            if (Math.random() > 0.85) {
                availableSlots.push(rareItem);
            }
        });

        // ----------------- 2. نمط الذكاء الاصطناعي (AI 1 مقابل AI 2) -----------------
        let selectedSlots = [];

        if (currentBrain === "AI 1") {
            // === خوارزمية AI 1 (العقل الإحصائي المدبر) ===
            
            // البحث عن الفاكهة الأكثر تكراراً في الذاكرة (Most Frequent)
            let maxCount = -1;
            let topCandidates = [];

            availableSlots.forEach(slot => {
                let count = ai1Occurrences[slot.id] || 0;
                
                // عقوبة النصف إذا ظهرت فاكهة نادرة في الجولة السابقة
                if ((slot.id === 4 || slot.id === 6) && lastRarePicked === slot.id) {
                    count = Math.floor(count / 2);
                }

                if (count > maxCount) {
                    maxCount = count;
                    topCandidates = [slot];
                } else if (count === maxCount) {
                    topCandidates.push(slot);
                }
            });

            // اختيار الفاكهة الإحصائية الأولى
            let primarySlot = null;
            if (topCandidates.length > 0 && maxCount > 0) {
                primarySlot = topCandidates[Math.floor(Math.random() * topCandidates.length)];
            } else {
                primarySlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
            }

            selectedSlots.push(primarySlot);

            // استبعاد الفاكهة الأولى ثم خلط القائمة المتبقية
            let remaining = availableSlots.filter(s => s.id !== primarySlot.id);
            remaining = shuffleArray(remaining);

            // سحب 3 فواكه إضافية ليصبح المجموع 4 فواكه
            for (let i = 0; i < 3 && i < remaining.length; i++) {
                selectedSlots.push(remaining[i]);
            }

        } else {
            // === خوارزمية AI 2 (العقل العشوائي الموزون - وضع حماية الأخطاء) ===
            let shuffled = shuffleArray(availableSlots);
            selectedSlots = shuffled.slice(0, 4);
        }

        // ----------------- 3. إكمال النقص الاحتياطي -----------------
        if (selectedSlots.length < 4) {
            let needed = 4 - selectedSlots.length;
            let fallback = slots.filter(s => !selectedSlots.some(sel => sel.id === s.id));
            fallback = shuffleArray(fallback);
            selectedSlots = selectedSlots.concat(fallback.slice(0, needed));
        }

        // ----------------- 4. الاقتراع الموزون وتحديث حالة الفاكهة النادرة -----------------
        let pickedRare = selectedSlots.find(s => s.id === 4 || s.id === 6);
        lastRarePicked = pickedRare ? pickedRare.id : null;

        // خلط النتيجة النهائية لتفادي النمط التكراري
        selectedSlots = shuffleArray(selectedSlots);

        if (selectedSlots.length !== 4) {
            throw new Error("فشل في استخراج 4 مواقع متطابقة.");
        }

        return selectedSlots;

    } catch (error) {
        console.error("خطأ في الخوارزمية:", error.message);
        return null;
    }
}

/**
 * دالة جلب معلومات التعلم الحالية للواجهة
 */
function getAIBrainStatus() {
    return {
        wrongGuessesCount: wrongGuessesCount,
        currentBrain: currentBrain,
        history: [...ai1History],
        occurrences: { ...ai1Occurrences }
    };
}



// دالة لخلط المصفوفات لضمان العشوائية
function shuffleArray(array) {
    let newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// ----------------- نظام الذاكرة قصيرة المدى (Short-term Memory) -----------------
// متغيرات عالمية لمحاكاة الذاكرة (أحدث 7 جولات)
let ai1History = [];
let ai1Occurrences = {};

// دالة لتحديث الذاكرة بناءً على الجولات السابقة (7-Item History)
function updateAIMemory(winningIds) {
    if (!winningIds || winningIds.length === 0) return;

    winningIds.forEach(id => {
        // إضافة الفاكهة لتاريخ الجولات
        ai1History.push(id);
        // تحديث عداد التكرارات
        ai1Occurrences[id] = (ai1Occurrences[id] || 0) + 1;

        // الحفاظ على الذاكرة لآخر 7 عناصر فقط (حذف الأقدم)
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
// ---------------------------------------------------------------------------------

// الخوارزمية الأساسية المستقلة (AI 1)
function generatePrediction(slots, previousSelection) {
    try {
        // التحقق من وجود بيانات الفواكه الأساسية
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة أو غير صالحة.");
        }

        // 1. تحديث الذاكرة الإحصائية بناءً على الجولة السابقة
        if (previousSelection && previousSelection.length > 0) {
            updateAIMemory(previousSelection);
        }

        // 2. نظام الندرة (Rarity System) للكرز (4) والبطيخ (6)
        // الفواكه الأساسية (6 فواكه) متاحة دائماً
        let availableSlots = slots.filter(s => s.id !== 4 && s.id !== 6);
        let rareSlots = slots.filter(s => s.id === 4 || s.id === 6);

        // إعطاء فرصة 15% فقط للكرز أو البطيخ بالدخول في قائمة التخمينات المتاحة
        rareSlots.forEach(rareItem => {
            if (Math.random() > 0.85) {
                availableSlots.push(rareItem);
            }
        });

        // 3. التحليل الإحصائي (إيجاد الفاكهة الأكثر تكراراً)
        let mostFrequentSlot = null;
        let maxCount = -1;
        let topCandidates = [];

        // البحث في سجل الذاكرة عن الفاكهة الأكثر تكراراً من ضمن القائمة *المتاحة*
        availableSlots.forEach(slot => {
            let count = ai1Occurrences[slot.id] || 0;
            if (count > maxCount) {
                maxCount = count;
                topCandidates = [slot]; // تصفير القائمة ووضع المتصدر الجديد
            } else if (count === maxCount) {
                topCandidates.push(slot); // إضافته في حال التعادل
            }
        });

        if (topCandidates.length > 0 && maxCount > 0) {
            // في حال وجود تعادل، يتم اختيار واحدة منها عشوائياً
            mostFrequentSlot = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        } else {
            // في حال عدم وجود سجل مسبق، يتم التخمين العشوائي
            mostFrequentSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        }

        // 4. إكمال الصناديق الأربعة (Pick exactly 4 Fruits)
        let selectedSlots = [];
        selectedSlots.push(mostFrequentSlot); // تثبيت الفاكهة الإحصائية كخيار مؤكد

        // استبعاد الفاكهة الإحصائية من القائمة المتبقية حتى لا تتكرر
        let remainingSlots = availableSlots.filter(s => s.id !== mostFrequentSlot.id);
        
        // خلط الفواكه المتبقية (Shuffle)
        remainingSlots = shuffleArray(remainingSlots);

        // اختيار 3 فواكه إضافية ليصبح المجموع 4 تخمينات تماماً
        for (let i = 0; i < 3 && i < remainingSlots.length; i++) {
            selectedSlots.push(remainingSlots[i]);
        }

        // --- معالجة نقص العدد (إجراء أمان) ---
        // في حالة نادرة (مثل عدم استيفاء العدد بسبب الفلترة)، نُكمل العدد من الفواكه المستبعدة
        if (selectedSlots.length < 4) {
            let needed = 4 - selectedSlots.length;
            let fallbackSlots = slots.filter(s => !selectedSlots.some(selected => selected.id === s.id));
            fallbackSlots = shuffleArray(fallbackSlots);
            selectedSlots = selectedSlots.concat(fallbackSlots.slice(0, needed));
        }

        // 5. الخلط النهائي للتوقعات (Final Shuffle)
        // لضمان عدم ظهور الفاكهة الإحصائية دائماً في الخانة الأولى ولكسر النمط
        selectedSlots = shuffleArray(selectedSlots);

        // اختبار الأمان: التأكد أن الخوارزمية قامت باختيار 4 فواكه بالضبط
        if (selectedSlots.length !== 4) {
            throw new Error("فشل في تحديد المواقع (العدد غير مطابق).");
        }

        return selectedSlots; // إرجاع التخمين الناجح للشاشة
        
    } catch (error) {
        console.error("خطأ في خوارزمية التخمين:", error.message);
        return null; // إرجاع القيمة فارغة حتى تظهر رسالة الخطأ للمستخدم
    }
}

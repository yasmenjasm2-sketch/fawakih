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
let ai1History = [];
let ai1Occurrences = {};

// قاموس لربط اسم الفاكهة بالآيدي الخاص بها (لاستقبال البيانات من حقل الإدخال)
const fruitNameToIdMap = {
    'برتقال': 1, 'ليمون': 2, 'عنب': 3,
    'كرز': 4, 'تفاح': 5, 'بطيخ': 6,
    'مانجو': 7, 'فراولة': 8
};

// دالة جديدة لتلقي اسم الفاكهة من الواجهة وتغذية الخوارزمية (Train Algorithm)
function trainAlgorithm(fruitName) {
    let id = fruitNameToIdMap[fruitName];
    if (id) {
        // إدخال النتيجة الواردة من المستخدم إلى الذاكرة الإحصائية لتعديل المسار
        updateAIMemory([id]);
        return true; // نجاح
    } else {
        return false; // فشل بسبب اسم غير صحيح
    }
}

// دالة لتحديث الذاكرة بناءً على الجولات السابقة والبيانات المدخلة
function updateAIMemory(winningIds) {
    if (!winningIds || winningIds.length === 0) return;

    winningIds.forEach(id => {
        ai1History.push(id);
        ai1Occurrences[id] = (ai1Occurrences[id] || 0) + 1;

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

// الخوارزمية الأساسية
function generatePrediction(slots, previousSelection) {
    try {
        if (!slots || slots.length === 0) {
            throw new Error("بيانات الفواكه مفقودة أو غير صالحة.");
        }

        // 1. تحديث الذاكرة الإحصائية بناءً على التوقعات السابقة
        if (previousSelection && previousSelection.length > 0) {
            updateAIMemory(previousSelection);
        }

        // 2. نظام الندرة (Rarity System)
        let availableSlots = slots.filter(s => s.id !== 4 && s.id !== 6);
        let rareSlots = slots.filter(s => s.id === 4 || s.id === 6);

        rareSlots.forEach(rareItem => {
            if (Math.random() > 0.85) {
                availableSlots.push(rareItem);
            }
        });

        // 3. التحليل الإحصائي (إيجاد الفاكهة الأكثر تكراراً بالاعتماد على التدريب)
        let mostFrequentSlot = null;
        let maxCount = -1;
        let topCandidates = [];

        availableSlots.forEach(slot => {
            let count = ai1Occurrences[slot.id] || 0;
            if (count > maxCount) {
                maxCount = count;
                topCandidates = [slot]; 
            } else if (count === maxCount) {
                topCandidates.push(slot); 
            }
        });

        if (topCandidates.length > 0 && maxCount > 0) {
            mostFrequentSlot = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        } else {
            mostFrequentSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        }

        // 4. إكمال الصناديق الأربعة (Pick exactly 4 Fruits)
        let selectedSlots = [];
        selectedSlots.push(mostFrequentSlot); 

        let remainingSlots = availableSlots.filter(s => s.id !== mostFrequentSlot.id);
        remainingSlots = shuffleArray(remainingSlots);

        for (let i = 0; i < 3 && i < remainingSlots.length; i++) {
            selectedSlots.push(remainingSlots[i]);
        }

        if (selectedSlots.length < 4) {
            let needed = 4 - selectedSlots.length;
            let fallbackSlots = slots.filter(s => !selectedSlots.some(selected => selected.id === s.id));
            fallbackSlots = shuffleArray(fallbackSlots);
            selectedSlots = selectedSlots.concat(fallbackSlots.slice(0, needed));
        }

        // 5. الخلط النهائي للتوقعات
        selectedSlots = shuffleArray(selectedSlots);

        if (selectedSlots.length !== 4) {
            throw new Error("فشل في تحديد المواقع (العدد غير مطابق).");
        }

        return selectedSlots; 
        
    } catch (error) {
        console.error("خطأ في خوارزمية التخمين:", error.message);
        return null; 
    }
}

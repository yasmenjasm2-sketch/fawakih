// ============================================================================
// YALLA FRUIT v7.0 - FAWAKIH AI DUAL-ENGINE (fruitsystm.js)
// الخوارزمية الكاملة المنقولة بالكامل من خوارزمية YallaGameActivity الأصلي:
// - نظام العقلين (AI1 الإحصائي المطابق / AI2 المنطقي الديناميكي)
// - نظام القرعة الموزونة (Weighted Lottery Engine)
// - الذاكرة قصيرة المدى (7 عناصر كحد أقصى)
// - نظام كسر النمط (Pattern Breaker) ومكافأة الحداثة (Recency)
// - نظام إدارة الأخطاء المتتالية والتبديل التلقائي عند 4 أخطاء
// ============================================================================

// 1. قاموس ربط الأسماء العربية والإنجليزية بالأرقام التعريفية والرموز
const fruitNameToIdMap = {
    'برتقال': 1, 'orange': 1,
    'ليمون': 2,  'lemon': 2,
    'عنب': 3,    'grape': 3,
    'كرز': 4,    'cherry': 4,
    'تفاح': 5,   'apple': 5,
    'بطيخ': 6,   'watermelon': 6,
    'مانجو': 7,  'mango': 7,
    'فراولة': 8, 'فراوله': 8, 'strawberry': 8
};

const idToFruitKeyMap = {
    1: 'orange',
    2: 'lemon',
    3: 'grape',
    4: 'cherry',
    5: 'apple',
    6: 'watermelon',
    7: 'mango',
    8: 'strawberry'
};

const fruitKeyToIdMap = {
    'orange': 1,
    'lemon': 2,
    'grape': 3,
    'cherry': 4,
    'apple': 5,
    'watermelon': 6,
    'mango': 7,
    'strawberry': 8
};

const VALID_FRUITS_AR = [
    "عنب", "ليمون", "برتقال", "تفاح", "كرز", "بطيخ", "فراولة", "فراوله", "مانجو"
];

// 2. متغيرات الذكاء الاصطناعي والذاكرة قصيرة المدى (مطابقة للـ Native Vault)
let currentAI = 1;                     // العقل النشط الحالي (1 = العقل الإحصائي | 2 = العقل المنطقي)
let wrongGuessesCount = 0;             // عداد التوقعات الخاطئة المتتالية
let internalPlayCount = 0;             // العداد الداخلي للجولات
let isAIActive = true;                 // حالة تفعيل الذكاء الاصطناعي

// ذاكرة العقل الأول (AI 1)
let fruitOccurrencesAI1 = {};          // تكرارات الفواكه في الذاكرة قصيرة المدى
let fruitHistoryAI1 = [];              // مصفوفة التسجيل (حد أقصى 7 فواكه)

// ذاكرة العقل الثاني (AI 2)
let fruitOccurrencesAI2 = {};          // تكرارات الفواكه في الذاكرة قصيرة المدى
let fruitHistoryAI2 = [];              // مصفوفة التسجيل (حد أقصى 7 فواكه)

// التوقعات الأخيرة للجولة السابقة
let lastRoundGuesses = [];             // أسماء الفواكه المخمنة في آخر جولة

// 3. دالة الخلط العشوائي لضمان عشوائية القرعة الموزونة
function shuffleArray(array) {
    let newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 4. دالة تحويل الاسم إلى المعرف القياسي المترجم
function translateFruit(input) {
    if (!input) return "";
    let lower = input.toString().toLowerCase().trim();
    switch (lower) {
        case "عنب": return "grape";
        case "ليمون": return "lemon";
        case "برتقال": return "orange";
        case "تفاح": return "apple";
        case "كرز": return "cherry";
        case "بطيخ": return "watermelon";
        case "فراولة": case "فراوله": return "strawberry";
        case "مانجو": return "mango";
        default:
            return fruitNameToIdMap[lower] ? idToFruitKeyMap[fruitNameToIdMap[lower]] : lower;
    }
}

// 5. دالة معالجة مدخلات المستخدم وتغذية الذاكرة (processUserFruit / trainAlgorithm)
function processUserFruit(fruitName) {
    if (!isAIActive) return false;

    let translated = translateFruit(fruitName);
    if (!translated) return false;

    // تقييم التوقع السابق وتعديل عداد الأخطاء
    if (lastRoundGuesses.length > 0) {
        if (!lastRoundGuesses.includes(translated)) {
            wrongGuessesCount++;
        } else {
            // تخفيف مسح الأخطاء لإبقاء الخوارزمية حذرة
            wrongGuessesCount = Math.max(0, wrongGuessesCount - 1);
        }
    }

    // التبديل التلقائي بين العقول عند الوصول إلى 4 أخطاء متتالية
    if (wrongGuessesCount === 4) {
        currentAI = (currentAI === 1) ? 2 : 1;
    }

    // تصفير العداد إذا تجاوز 5 أخطاء للحد من تكرار الأخطاء
    if (wrongGuessesCount > 5) {
        wrongGuessesCount = 0;
    }

    let activeOccurrences = (currentAI === 1) ? fruitOccurrencesAI1 : fruitOccurrencesAI2;
    let activeHistory = (currentAI === 1) ? fruitHistoryAI1 : fruitHistoryAI2;

    let currentCount = activeOccurrences[translated] || 0;
    activeOccurrences[translated] = currentCount + 1;
    activeHistory.push(translated);

    // الذاكرة قصيرة المدى (7 سجلات كحد أقصى)
    if (activeHistory.length > 7) {
        let forgottenFruit = activeHistory.shift();
        let forgottenCount = activeOccurrences[forgottenFruit] || 0;
        if (forgottenCount > 1) {
            activeOccurrences[forgottenFruit] = forgottenCount - 1;
        } else {
            delete activeOccurrences[forgottenFruit];
        }
    }

    return true;
}

// واجهة التغذية الخارجية المباشرة
function trainAlgorithm(fruitName) {
    return processUserFruit(fruitName);
}

// 6. دالة تسجيل نتيجة الجولة وتقييم الأخطاء
function recordRoundResult(predictedIds, actualWinner) {
    let winnerKey = translateFruit(actualWinner);
    if (!winnerKey) return;

    let predictedKeys = predictedIds.map(p => translateFruit(typeof p === 'object' ? (p.name || p.key || p.id) : p));
    lastRoundGuesses = predictedKeys;

    processUserFruit(winnerKey);
}

// 7. دالة تصفير ذاكرة الذكاء الاصطناعي بالكامل (resetAIMemory)
function resetAIMemory() {
    fruitOccurrencesAI1 = {};
    fruitHistoryAI1 = [];
    fruitOccurrencesAI2 = {};
    fruitHistoryAI2 = [];
    lastRoundGuesses = [];
    currentAI = 1;
    wrongGuessesCount = 0;
    internalPlayCount = 0;
}

// 8. دالة حساب وزن الفاكهة الفردية بناءً على النظام النشط والقواعد الصارمة
function calculateFruitWeight(slot, previousSelection) {
    let fruitKey = translateFruit(typeof slot === 'object' ? (slot.key || slot.name || slot.id) : slot);
    let prevKeys = (previousSelection || lastRoundGuesses).map(p => translateFruit(typeof p === 'object' ? (p.key || p.name || p.id) : p));

    // أ) الأساس العشوائي الإلكتروني (Chaos Base: من 1 إلى 8)
    let weight = Math.floor(Math.random() * 8) + 1;

    // استثناءات الجولة السابقة (تنصيف وزن الكرز والبطيخ إذا ظهرت سابقاً)
    if (fruitKey === "cherry" && prevKeys.includes("cherry")) {
        weight = Math.max(1, Math.floor(weight / 2));
    }
    if (fruitKey === "watermelon" && prevKeys.includes("watermelon")) {
        weight = Math.max(1, Math.floor(weight / 2));
    }

    if (!isAIActive) return weight;

    if (currentAI === 1) {
        // --- العقل الأول: حظر الكرز والبطيخ تماماً ---
        if (fruitKey === "cherry" || fruitKey === "watermelon") {
            return 0;
        }

        let validTargets = ["grape", "lemon", "orange", "apple", "mango", "strawberry"];
        if (!validTargets.includes(fruitKey)) return 0;

        let maxCount = -1;
        let topFruits = [];
        for (let key of validTargets) {
            let count = fruitOccurrencesAI1[key] || 0;
            if (count > maxCount) {
                maxCount = count;
                topFruits = [key];
            } else if (count === maxCount) {
                topFruits.push(key);
            }
        }

        let mostFrequent = topFruits.length > 0 ? topFruits[Math.floor(Math.random() * topFruits.length)] : validTargets[Math.floor(Math.random() * validTargets.length)];
        
        let chosenFruits = [mostFrequent];
        let remaining = validTargets.filter(f => f !== mostFrequent);
        remaining = shuffleArray(remaining);
        for (let i = 0; i < 3 && i < remaining.length; i++) {
            chosenFruits.push(remaining[i]);
        }

        return chosenFruits.includes(fruitKey) ? 100 : 0;

    } else {
        // --- العقل الثاني: العقل المنطقي الديناميكي ---
        let count = fruitOccurrencesAI2[fruitKey] || 0;
        let activeHistory = fruitHistoryAI2;

        let recencyScore = 0;
        let historySize = activeHistory.length;
        for (let i = 0; i < historySize; i++) {
            if (activeHistory[i] === fruitKey) {
                recencyScore += (i + 1);
            }
        }

        let logicalBoost = (count * 2) + (recencyScore * 2);
        if (wrongGuessesCount > 0) {
            logicalBoost = Math.max(1, Math.floor(logicalBoost / (wrongGuessesCount + 1)));
        }

        weight += logicalBoost;

        // نظام كسر النمط
        if (activeHistory.length >= 3) {
            let lastInserted = activeHistory[activeHistory.length - 1];
            if (fruitKey === lastInserted) {
                weight = Math.max(1, Math.floor(weight * 0.7));
            }
        }

        // كبح الوزن الأعلى عند 45
        return Math.min(weight, 45);
    }
}

// 9. الخوارزمية الرئيسية لتوليد التوقعات (Weighted Lottery Engine)
function generatePrediction(slots, previousSelection) {
    try {
        internalPlayCount++;

        if (previousSelection && previousSelection.length > 0) {
            lastRoundGuesses = previousSelection.map(s => translateFruit(typeof s === 'object' ? (s.key || s.name || s.id) : s));
        }

        const defaultFruitKeys = ["grape", "lemon", "orange", "apple", "cherry", "watermelon", "strawberry", "mango"];
        let slotsArray = (slots && slots.length > 0) ? slots : defaultFruitKeys.map(k => ({
            id: fruitKeyToIdMap[k],
            name: k,
            key: k
        }));

        let nameToSlotMap = {};
        slotsArray.forEach(s => {
            let key = translateFruit(typeof s === 'object' ? (s.key || s.name || s.id) : s);
            nameToSlotMap[key] = s;
        });

        let predictionWeights = {};
        let isConfirmedGuess = false;

        // 1. العقل العشوائي الإلكتروني (الأساس: Chaos Base)
        defaultFruitKeys.forEach(key => {
            predictionWeights[key] = Math.floor(Math.random() * 8) + 1;
        });

        // استثناءات الجولة السابقة
        if (lastRoundGuesses.includes("cherry") && predictionWeights.hasOwnProperty("cherry")) {
            predictionWeights["cherry"] = Math.max(1, Math.floor(predictionWeights["cherry"] / 2));
        }
        if (lastRoundGuesses.includes("watermelon") && predictionWeights.hasOwnProperty("watermelon")) {
            predictionWeights["watermelon"] = Math.max(1, Math.floor(predictionWeights["watermelon"] / 2));
        }

        // 2. تطبيق خوارزمية الذكاء الاصطناعي النشطة
        if (isAIActive) {
            if (currentAI === 1) {
                // --- خوارزمية العقل الأول الإحصائية ---
                predictionWeights["cherry"] = 0;
                predictionWeights["watermelon"] = 0;

                let validTargets = ["grape", "lemon", "orange", "apple", "mango", "strawberry"];

                let maxCount = -1;
                let topFruits = [];

                for (let key in fruitOccurrencesAI1) {
                    if (validTargets.includes(key)) {
                        let cnt = fruitOccurrencesAI1[key];
                        if (cnt > maxCount) {
                            maxCount = cnt;
                            topFruits = [key];
                        } else if (cnt === maxCount) {
                            topFruits.push(key);
                        }
                    }
                }

                let mostFrequent = null;
                if (topFruits.length > 0) {
                    mostFrequent = topFruits[Math.floor(Math.random() * topFruits.length)];
                } else {
                    mostFrequent = validTargets[Math.floor(Math.random() * validTargets.length)];
                }

                let chosenFruits = [mostFrequent];
                let remainingTargets = validTargets.filter(f => f !== mostFrequent);
                remainingTargets = shuffleArray(remainingTargets);

                for (let i = 0; i < 3 && i < remainingTargets.length; i++) {
                    chosenFruits.push(remainingTargets[i]);
                }

                defaultFruitKeys.forEach(fruit => {
                    if (chosenFruits.includes(fruit)) {
                        predictionWeights[fruit] = 100;
                    } else {
                        predictionWeights[fruit] = 0;
                    }
                });

                isConfirmedGuess = false;

            } else {
                // --- خوارزمية العقل الثاني المنطقية ---
                let activeOccurrences = fruitOccurrencesAI2;
                let activeHistory = fruitHistoryAI2;

                for (let fruit in activeOccurrences) {
                    if (predictionWeights.hasOwnProperty(fruit)) {
                        let count = activeOccurrences[fruit];
                        let currentWeight = predictionWeights[fruit];

                        let recencyScore = 0;
                        let historySize = activeHistory.length;
                        for (let i = 0; i < historySize; i++) {
                            if (activeHistory[i] === fruit) {
                                recencyScore += (i + 1);
                            }
                        }

                        let logicalBoost = (count * 2) + (recencyScore * 2);
                        if (wrongGuessesCount > 0) {
                            logicalBoost = Math.max(1, Math.floor(logicalBoost / (wrongGuessesCount + 1)));
                        }

                        let newWeight = currentWeight + logicalBoost;
                        if (newWeight >= 25) {
                            isConfirmedGuess = true;
                        }

                        newWeight = Math.min(newWeight, 45);
                        predictionWeights[fruit] = newWeight;
                    }
                }

                if (activeHistory.length >= 3) {
                    let lastInserted = activeHistory[activeHistory.length - 1];
                    if (predictionWeights.hasOwnProperty(lastInserted)) {
                        let diminishedWeight = Math.max(1, Math.floor(predictionWeights[lastInserted] * 0.7));
                        predictionWeights[lastInserted] = diminishedWeight;
                    }
                }
            }
        }

        // 3. حساب نسبة الثقة وعدد الصناديق المستهدفة
        let totalWeight = 0;
        let maxWeight = 0;
        for (let key in predictionWeights) {
            let w = predictionWeights[key];
            totalWeight += w;
            if (w > maxWeight) maxWeight = w;
        }

        let confidencePercentage = (totalWeight > 0) ? Math.floor((maxWeight * 100) / totalWeight) : 0;

        let boxesToShow;
        if (isConfirmedGuess && confidencePercentage >= 55) {
            boxesToShow = (Math.random() * 100 > 80) ? 4 : 3;
        } else {
            boxesToShow = 4;
        }

        // 4. بناء سلة القرعة الموزونة (Weighted Lottery Pool)
        let lotteryPool = [];
        for (let key in predictionWeights) {
            let weight = predictionWeights[key];
            let slotObj = nameToSlotMap[key] || {
                id: fruitKeyToIdMap[key],
                name: key,
                key: key
            };
            if (weight > 0) {
                for (let i = 0; i < weight; i++) {
                    lotteryPool.push(slotObj);
                }
            }
        }

        // 5. خلط سلة القرعة واختيار الفواكه الفريدة
        lotteryPool = shuffleArray(lotteryPool);

        let selectedSlots = [];
        for (let slotItem of lotteryPool) {
            let itemKey = translateFruit(typeof slotItem === 'object' ? (slotItem.key || slotItem.name || slotItem.id) : slotItem);
            if (!selectedSlots.some(s => translateFruit(typeof s === 'object' ? (s.key || s.name || s.id) : s) === itemKey)) {
                selectedSlots.push(slotItem);
            }
            if (selectedSlots.length === boxesToShow) break;
        }

        // 6. إكمال التوقعات في حال عدم الوصول لعدد الصناديق المطلوب
        if (selectedSlots.length < boxesToShow) {
            let remaining = defaultFruitKeys
                .map(k => nameToSlotMap[k] || { id: fruitKeyToIdMap[k], name: k, key: k })
                .filter(s => {
                    let k = translateFruit(typeof s === 'object' ? (s.key || s.name || s.id) : s);
                    return !selectedSlots.some(sel => translateFruit(typeof sel === 'object' ? (sel.key || sel.name || sel.id) : sel) === k);
                });
            remaining = shuffleArray(remaining);
            while (selectedSlots.length < boxesToShow && remaining.length > 0) {
                selectedSlots.push(remaining.pop());
            }
        }

        // 7. الخلط النهائي لتنسيق ترتيب العرض
        selectedSlots = shuffleArray(selectedSlots);

        // تحديث سجل السحب الأخير
        lastRoundGuesses = selectedSlots.map(s => translateFruit(typeof s === 'object' ? (s.key || s.name || s.id) : s));

        return selectedSlots;

    } catch (error) {
        console.error("خطأ في خوارزمية التخمين:", error.message);
        return null;
    }
}

// 10. دوال الاستعلام عن حالة المحرك والذكاء الاصطناعي
function getActiveAIMode() {
    return `العقل ${currentAI}`;
}

function getWrongGuessesCount() {
    return wrongGuessesCount;
}

function setAIActiveState(state) {
    isAIActive = Boolean(state);
}

// تصدير النماذج والبيانات للبيئات الداعمة للـ Modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fruitNameToIdMap,
        idToFruitKeyMap,
        fruitKeyToIdMap,
        VALID_FRUITS_AR,
        trainAlgorithm,
        processUserFruit,
        recordRoundResult,
        resetAIMemory,
        calculateFruitWeight,
        generatePrediction,
        shuffleArray,
        getActiveAIMode,
        getWrongGuessesCount,
        setAIActiveState
    };
}

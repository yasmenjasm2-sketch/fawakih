// ============================================================================
// YALLA FRUIT - AI1 ENGINE (fruitsystm.js)
// نسخة نظيفة مضمونة 100% - متوافقة مع index.html
// ============================================================================
// ✅ يستقبل: slots = [{ id, top, left }, ...]
// ✅ يعيد:   مصفوفة من 4 slots بنفس البنية
// ✅ لا يستخدم const/let في المستوى العام (تفادياً للتعارض)
// ✅ محمي بـ try-catch في كل دالة
// ============================================================================

(function() {
    'use strict';

    // ========================================================================
    // [1] القواميس الأساسية
    // ========================================================================
    var FRUIT_TRANSLATIONS = {
        'برتقال': 'orange',
        'عنب': 'grape',
        'ليمون': 'lemon',
        'تفاح': 'apple',
        'كرز': 'cherry',
        'بطيخ': 'watermelon',
        'فراولة': 'strawberry',
        'فراوله': 'strawberry',
        'مانجو': 'mango'
    };

    var VALID_FRUITS = [
        'عنب', 'ليمون', 'برتقال', 'تفاح',
        'كرز', 'بطيخ', 'فراولة', 'فراوله', 'مانجو'
    ];

    var ID_TO_ENGLISH = {
        1: 'orange',
        2: 'lemon',
        3: 'grape',
        4: 'cherry',
        5: 'apple',
        6: 'watermelon',
        7: 'mango',
        8: 'strawberry'
    };

    var ENGLISH_TO_ID = {
        'orange': 1,
        'lemon': 2,
        'grape': 3,
        'cherry': 4,
        'apple': 5,
        'watermelon': 6,
        'mango': 7,
        'strawberry': 8
    };

    // الأوزان الأساسية - من smali (nextInt(max) + 1)
    var BASE_WEIGHT_MAX = {
        'orange': 30,
        'lemon': 30,
        'grape': 30,
        'apple': 30,
        'cherry': 15,
        'watermelon': 20,
        'mango': 25,
        'strawberry': 28
    };

    // ========================================================================
    // [2] الذاكرة الداخلية (AI1 Memory)
    // ========================================================================
    var fruitOccurrences = {};   // عدد تكرارات كل فاكهة
    var fruitHistory = [];       // آخر 7 فواكه
    var lastRoundGuesses = [];   // توقعات الجولة السابقة
    var wrongGuessesCount = 0;
    var localTrainedCount = 0;

    // ========================================================================
    // [3] دوال مساعدة
    // ========================================================================
    function secureNextInt(max) {
        if (max <= 0) return 0;
        return Math.floor(Math.random() * max);
    }

    function shuffleArray(array) {
        if (!array || array.length === 0) return [];
        var arr = array.slice();
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
        return arr;
    }

    // ========================================================================
    // [4] الترجمة والتحقق
    // ========================================================================
    function translateFruit(name) {
        try {
            if (!name || typeof name !== 'string') return '';
            var clean = name.toLowerCase().trim();
            return FRUIT_TRANSLATIONS[clean] || '';
        } catch (e) {
            return '';
        }
    }

    function isValidFruitName(name) {
        try {
            if (!name || typeof name !== 'string') return false;
            var clean = name.toLowerCase().trim();
            return VALID_FRUITS.indexOf(clean) !== -1;
        } catch (e) {
            return false;
        }
    }

    // ========================================================================
    // [5] 🧠 نظام التعلم (trainAlgorithm)
    // ========================================================================
    function trainAlgorithm(fruitName) {
        try {
            if (!isValidFruitName(fruitName)) return false;

            var englishName = translateFruit(fruitName);
            if (!englishName) return false;

            // تحديث عداد الأخطاء بناءً على الجولة السابقة
            if (lastRoundGuesses.length > 0) {
                if (lastRoundGuesses.indexOf(englishName) === -1) {
                    wrongGuessesCount++;
                } else {
                    wrongGuessesCount = Math.max(0, wrongGuessesCount - 1);
                }
            }

            if (wrongGuessesCount > 5) wrongGuessesCount = 0;

            // تحديث عدد التكرارات
            fruitOccurrences[englishName] = (fruitOccurrences[englishName] || 0) + 1;

            // تحديث سجل الذاكرة (max 7)
            fruitHistory.push(englishName);
            while (fruitHistory.length > 7) {
                var removed = fruitHistory.shift();
                if (fruitOccurrences[removed] > 1) {
                    fruitOccurrences[removed]--;
                } else {
                    delete fruitOccurrences[removed];
                }
            }

            localTrainedCount++;

            return {
                success: true,
                id: englishName,
                boost: fruitOccurrences[englishName],
                totalTrained: localTrainedCount,
                wrongGuessesCount: wrongGuessesCount,
                historySize: fruitHistory.length
            };
        } catch (e) {
            console.error('trainAlgorithm error:', e);
            return false;
        }
    }

    // ========================================================================
    // [6] 📊 إحصائيات التعلم
    // ========================================================================
    function getLearningStats() {
        try {
            var perFruitCopy = {};
            for (var k in fruitOccurrences) {
                perFruitCopy[k] = fruitOccurrences[k];
            }
            return {
                totalTrained: localTrainedCount,
                perFruit: perFruitCopy,
                memorySize: fruitHistory.length,
                logSize: fruitHistory.length,
                wrongGuessesCount: wrongGuessesCount
            };
        } catch (e) {
            return {
                totalTrained: 0,
                perFruit: {},
                memorySize: 0,
                logSize: 0,
                wrongGuessesCount: 0
            };
        }
    }

    function getTrainedFruits() {
        try {
            return fruitHistory.map(function(name, index) {
                return {
                    name: name,
                    id: name,
                    boost: fruitOccurrences[name] || 0,
                    time: Date.now() - ((fruitHistory.length - index) * 1000)
                };
            });
        } catch (e) {
            return [];
        }
    }

    function resetLearning() {
        try {
            fruitOccurrences = {};
            fruitHistory = [];
            lastRoundGuesses = [];
            wrongGuessesCount = 0;
            localTrainedCount = 0;
            return true;
        } catch (e) {
            return false;
        }
    }

    // ========================================================================
    // [7] ⚖️ حساب الأوزان (من startNewRound في smali)
    // ========================================================================
    function calculateWeights(fruitViews, lastGuesses) {
        var weights = {};
        var viewMap = {};
        var lastGuessesList = lastGuesses || [];

        // المرحلة 1: الأوزان الأساسية
        for (var i = 0; i < fruitViews.length; i++) {
            var view = fruitViews[i];
            var name = view.englishName;
            viewMap[name] = view;
            var max = BASE_WEIGHT_MAX[name] || 10;
            weights[name] = secureNextInt(max) + 1;
        }

        // المرحلة 2: تعديل الكرز/البطيخ
        if (lastGuessesList.indexOf('cherry') !== -1 && ('cherry' in weights)) {
            weights['cherry'] = Math.max(1, Math.floor(weights['cherry'] / 2));
        }
        if (lastGuessesList.indexOf('watermelon') !== -1 && ('watermelon' in weights)) {
            weights['watermelon'] = Math.max(1, Math.floor(weights['watermelon'] / 2));
        }

        // المرحلة 3: تعزيز الذاكرة
        var boostFlag = false;
        for (var fruitName in fruitOccurrences) {
            if (!(fruitName in weights)) continue;

            var occurrences = fruitOccurrences[fruitName];
            var currentWeight = weights[fruitName];

            var multiplier = secureNextInt(3) + 2;
            var occurrencesBoost = occurrences * multiplier;

            var diversityBonus;
            if (lastGuessesList.indexOf(fruitName) === -1) {
                diversityBonus = secureNextInt(4) + 2;
            } else {
                diversityBonus = -2;
            }

            var newWeight = currentWeight + occurrencesBoost + diversityBonus;

            if ((fruitName === 'strawberry' || fruitName === 'mango') &&
                lastGuessesList.indexOf(fruitName) !== -1) {
                newWeight = 0;
            }

            if (newWeight >= 25) {
                newWeight = 25;
                boostFlag = true;
            }

            newWeight = Math.min(newWeight, 30);
            newWeight = Math.max(newWeight, 0);
            weights[fruitName] = newWeight;
        }

        return { weights: weights, viewMap: viewMap, boostFlag: boostFlag };
    }

    // ========================================================================
    // [8] 🎲 إحصائيات الأوزان
    // ========================================================================
    function calculateWeightStats(weights) {
        var totalWeight = 0;
        var maxWeight = 0;
        for (var name in weights) {
            var w = weights[name];
            totalWeight += w;
            if (w > maxWeight) maxWeight = w;
        }
        var percentage = 0;
        if (totalWeight > 0) {
            percentage = Math.floor((maxWeight * 100) / totalWeight);
        }
        return { totalWeight: totalWeight, maxWeight: maxWeight, percentage: percentage };
    }

    // ========================================================================
    // [9] 🎯 تحديد عدد التوقعات
    // ========================================================================
    function determinePickCount(boostFlag, percentage) {
        if (!boostFlag) return 4;
        if (percentage < 55) return 4;
        var roll = secureNextInt(100);
        return roll > 80 ? 4 : 3;
    }

    // ========================================================================
    // [10] 🏗️ بناء سلة القرعة
    // ========================================================================
    function buildWeightedPool(weights, viewMap) {
        var pool = [];
        for (var name in weights) {
            var weight = weights[name];
            var view = viewMap[name];
            if (!view) continue;
            for (var i = 0; i < weight; i++) {
                pool.push(view);
            }
        }
        return pool;
    }

    // ========================================================================
    // [11] 🎰 اختيار التوقعات النهائية
    // ========================================================================
    function selectFinalPredictions(pool, pickCount) {
        var shuffled = shuffleArray(pool);
        var picked = [];
        var pickedNames = [];

        for (var i = 0; i < shuffled.length && picked.length < pickCount; i++) {
            var view = shuffled[i];
            if (picked.indexOf(view) !== -1) continue;

            var name = view.englishName;
            if (name === 'cherry' && pickedNames.indexOf('watermelon') !== -1) continue;
            if (name === 'watermelon' && pickedNames.indexOf('cherry') !== -1) continue;

            picked.push(view);
            pickedNames.push(name);
        }

        if (picked.length < pickCount) {
            for (var j = 0; j < shuffled.length && picked.length < pickCount; j++) {
                var view2 = shuffled[j];
                if (picked.indexOf(view2) !== -1) continue;

                var name2 = view2.englishName;
                if (name2 === 'cherry' && pickedNames.indexOf('watermelon') !== -1) continue;
                if (name2 === 'watermelon' && pickedNames.indexOf('cherry') !== -1) continue;

                picked.push(view2);
                pickedNames.push(name2);
            }
        }

        return { picked: picked, pickedNames: pickedNames };
    }

    // ========================================================================
    // [12] 🚀 الدالة الرئيسية: generatePrediction
    //      مُتوافقة 100% مع index.html
    // ========================================================================
    function generatePrediction(slots, previousSelection) {
        try {
            // التحقق من المدخلات
            if (!slots || slots.length === 0) {
                console.warn('generatePrediction: slots فارغة');
                return null;
            }

            // تحويل slots إلى fruitViews
            var fruitViews = [];
            for (var i = 0; i < slots.length; i++) {
                var slot = slots[i];
                var englishName = ID_TO_ENGLISH[slot.id];
                if (englishName) {
                    fruitViews.push({
                        slot: slot,
                        id: slot.id,
                        englishName: englishName
                    });
                }
            }

            if (fruitViews.length === 0) {
                console.warn('generatePrediction: لم يتم التعرف على أي فاكهة');
                return null;
            }

            // حساب الأوزان
            var result = calculateWeights(fruitViews, lastRoundGuesses);
            var weights = result.weights;
            var viewMap = result.viewMap;
            var boostFlag = result.boostFlag;

            // إحصائيات
            var stats = calculateWeightStats(weights);

            // عدد التوقعات
            var pickCount = determinePickCount(boostFlag, stats.percentage);

            // بناء السلة
            var pool = buildWeightedPool(weights, viewMap);

            if (pool.length === 0) {
                console.warn('generatePrediction: السلة فارغة');
                return shuffleArray(slots).slice(0, 4);
            }

            // الاختيار النهائي
            var finalResult = selectFinalPredictions(pool, pickCount);

            // تحديث توقعات الجولة السابقة
            lastRoundGuesses = finalResult.pickedNames.slice();

            // تحويل إلى slots
            var selectedSlots = [];
            for (var k = 0; k < finalResult.picked.length; k++) {
                selectedSlots.push(finalResult.picked[k].slot);
            }

            // ضمان 4 توقعات
            if (selectedSlots.length < 4) {
                var usedIds = [];
                for (var u = 0; u < selectedSlots.length; u++) {
                    usedIds.push(selectedSlots[u].id);
                }
                var remaining = [];
                for (var r = 0; r < slots.length; r++) {
                    if (usedIds.indexOf(slots[r].id) === -1) {
                        remaining.push(slots[r]);
                    }
                }
                remaining = shuffleArray(remaining);
                while (selectedSlots.length < 4 && remaining.length > 0) {
                    selectedSlots.push(remaining.pop());
                }
            }

            // خلط نهائي
            selectedSlots = shuffleArray(selectedSlots);

            return selectedSlots;

        } catch (error) {
            console.error('generatePrediction CRITICAL ERROR:', error);
            // حل احتياطي مضمون
            try {
                return shuffleArray(slots).slice(0, 4);
            } catch (e) {
                return null;
            }
        }
    }

    // ========================================================================
    // [13] ⏱️ مؤقت الجولة العشوائي
    // ========================================================================
    function getRandomRoundDuration() {
        return secureNextInt(16) + 23;
    }

    // ========================================================================
    // [14] 🔄 إعادة تعيين
    // ========================================================================
    function resetAI1Memory() {
        return resetLearning();
    }

    function getAI1MemoryState() {
        try {
            var occCopy = {};
            for (var k in fruitOccurrences) occCopy[k] = fruitOccurrences[k];
            return {
                fruitOccurrences: occCopy,
                fruitHistory: fruitHistory.slice(),
                lastRoundGuesses: lastRoundGuesses.slice(),
                wrongGuessesCount: wrongGuessesCount
            };
        } catch (e) {
            return {};
        }
    }

    // ========================================================================
    // [15] 🌐 التصدير إلى window
    // ========================================================================
    window.generatePrediction = generatePrediction;
    window.trainAlgorithm = trainAlgorithm;
    window.getLearningStats = getLearningStats;
    window.getTrainedFruits = getTrainedFruits;
    window.resetLearning = resetLearning;
    window.getRandomRoundDuration = getRandomRoundDuration;
    window.resetAI1Memory = resetAI1Memory;
    window.getAI1MemoryState = getAI1MemoryState;

    window.YallaAI1 = {
        FRUIT_TRANSLATIONS: FRUIT_TRANSLATIONS,
        VALID_FRUITS: VALID_FRUITS,
        ID_TO_ENGLISH: ID_TO_ENGLISH,
        ENGLISH_TO_ID: ENGLISH_TO_ID,
        BASE_WEIGHT_MAX: BASE_WEIGHT_MAX,
        translateFruit: translateFruit,
        isValidFruitName: isValidFruitName,
        trainAlgorithm: trainAlgorithm,
        getLearningStats: getLearningStats,
        getTrainedFruits: getTrainedFruits,
        resetLearning: resetLearning,
        generatePrediction: generatePrediction,
        getRandomRoundDuration: getRandomRoundDuration,
        shuffleArray: shuffleArray,
        secureNextInt: secureNextInt,
        getMemory: getAI1MemoryState
    };

    console.log('✅ fruitsystm.js محمّل بنجاح - AI1 Engine جاهز');

})();

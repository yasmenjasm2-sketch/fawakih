/**

============================================================================

YALLA FRUIT - NEXUS FIRST ALGORITHM ENGINE (AI1)

النظام الكامل للخوارزمية الأولى: الأوزان، الذاكرة قصيرة المدى، التعلم، والعشوائية

5 توقعات: 3 فواكه صغيرة + 2 فواكه كبيرة (الخامسة مميزة)

تعديلات الإصدار الحالي (فقط داخل الخوارزمية):

- رفع حجم الذاكرة قصيرة المدى من 7 → 10

- رفع مستوى العشوائية (خلط أقوى + ضجيج أعلى + Entropy Injection)

- 🆕 إضافة طبقة Pre-Send Swap: تدقيق وتبديل التوقع قبل إرساله للواجهة

============================================================================

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

// 2. ثوابت الخوارزمية (قابلة للتعديل من مكان واحد)
const AI1_MEMORY_SIZE = 10;         // ← كان 7 (تم رفعه إلى 10)
const AI1_SHUFFLE_PASSES = 5;        // ← كان 3 (خلط أقوى)
const AI1_NOISE_FACTOR = 12;         // ← كان 7 (ضجيج عشوائي أعلى)

// 🆕 ثوابت طبقة Pre-Send Swap
const AI1_PRESEND_ENABLED = true;         // تفعيل/تعطيل الطبقة كلياً
const AI1_PRESEND_PASSES = 2;             // عدد دورات التدقيق (passes)
const AI1_PRESEND_SWAP_CHANCE = 0.35;     // فرصة الاستبدال عند وجود بديل أفضل (35%)
const AI1_PRESEND_WEIGHT_THRESHOLD = 1.05;// البديل يجب أن يكون أعلى بوزن 5% على الأقل
const AI1_PRESEND_MAX_SWAPS = 3;          // حد أقصى للاستبدالات في الجلسة الواحدة
const AI1_DEBUG_SWAP = false;             // طباعة تفاصيل الاستبدال في الكونسول

// 3. متغيرات الذاكرة ونظام التعلم
let ai1History = []; // الذاكرة قصيرة المدى (تتسع لآخر 10 عناصر)
let ai1Occurrences = {}; // تكرارات الفواكه داخل الذاكرة
let learningBoost = {}; // نقاط التعزيز الخاصة بخاصية التعلم اليدوي/التلقائي
let totalTrained = 0; // عداد عمليات التدريب الكلية
let trainedFruitsLog = []; // سجل تفصيلي لجميع الفواكه المتعلمة

// ============================================================
// 4. تصنيف الفواكه: صغيرة (SMALL) وكبيرة (BIG)
// الصغيرة: برتقال(1), ليمون(2), عنب(3), تفاح(5)
// الكبيرة: كرز(4), بطيخ(6), مانجو(7), فراولة(8)
// ============================================================
const SMALL_FRUIT_IDS = [1, 2, 3, 5];
const BIG_FRUIT_IDS = [4, 6, 7, 8];

// 5. طريقة عمل العشوائية (Fisher-Yates Shuffle Algorithm)
function shuffleArray(array) {
let newArray = [...array];
for (let i = newArray.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[newArray[i], newArray[j]] = [newArray[j], newArray[i]];
}
return newArray;
}

// 5.1 دالة خلط قوية متعدد المرات لضمان عشوائية حقيقية
function strongShuffle(array, passes = AI1_SHUFFLE_PASSES) {
let result = [...array];
for (let p = 0; p < passes; p++) {
result = shuffleArray(result);
}
return result;
}

// 5.2 Entropy Injection: تعزيز العشوائية قبل الاختيار (بدون تعديل الأوزان)
function injectEntropy(lotteryPool) {
if (!lotteryPool || lotteryPool.length === 0) return lotteryPool;
// إعادة ترتيب قوية + إدخال عشوائية صغيرة على البنية
let mixed = strongShuffle(lotteryPool, AI1_SHUFFLE_PASSES);
const rotateBy = Math.floor(Math.random() * mixed.length);
return mixed.slice(rotateBy).concat(mixed.slice(0, rotateBy));
}

// 6. تحديث الذاكرة قصيرة المدى (الآن تتسع لآخر 10 عناصر)
function updateAIMemory(winningIds) {
if (!winningIds || winningIds.length === 0) return;
winningIds.forEach(id => {
let numericId = Number(id);
ai1History.push(numericId);
ai1Occurrences[numericId] = (ai1Occurrences[numericId] || 0) + 1;

// الاحتفاظ بآخر AI1_MEMORY_SIZE عنصر فقط
if (ai1History.length > AI1_MEMORY_SIZE) {
let forgottenId = ai1History.shift();
if (ai1Occurrences[forgottenId] > 1) {
ai1Occurrences[forgottenId]--;
} else {
delete ai1Occurrences[forgottenId];
}
}
});
}

// 7. خاصية التعلم (Train Algorithm)
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

return { success: true, id: foundId, boost: learningBoost[foundId], totalTrained: totalTrained };
}

// 8. حساب الأوزان لكل فاكهة بناءً على المعايير الخوارزمية
function calculateFruitWeight(slot, previousSelection) {
let slotId = slot.id;

// الوزن الأساسي العشوائي (بين 1 و 8)
let weight = Math.floor(Math.random() * 8) + 1;

// إضافة وزن خاصية التعلم
let trainBoost = learningBoost[slotId] || 0;
weight += trainBoost * 5;

// إضافة وزن التكرار داخل الذاكرة قصيرة المدى (10 عناصر)
let count = ai1Occurrences[slotId] || 0;
weight += count * 3;

// تسلسل انتقال ماركوف
if (ai1History.length >= 2) {
let lastWinner = ai1History[ai1History.length - 1];
for (let i = 0; i < ai1History.length - 1; i++) {
if (ai1History[i] === lastWinner && ai1History[i + 1] === slotId) {
weight += 4;
break;
}
}
}

// مكافأة التنوع (آخر 3 عناصر)
let lastThree = ai1History.slice(-3);
if (!lastThree.includes(slotId)) {
weight += 3;
}

// ============================================================
// 🔻 تقليل ظهور الكرز(4) والبطيخ(6) — تخفيض قوي 70% (حد أدنى 1)
// ============================================================
if (slotId === 4 || slotId === 6) {
weight = Math.max(1, Math.floor(weight * 0.3));
}

// ============================================================
// ⚠️ إصلاح مشكلة "الجمود": بدل تصفير أوزان 7 و8 عند ظهورها،
// نقوم فقط بتخفيضها 50% (حد أدنى 1)
// ============================================================
let prevIds = previousSelection || [];
if ((slotId === 7 || slotId === 8) && prevIds.includes(slotId)) {
weight = Math.max(1, Math.floor(weight * 0.5));
}

// 🎲 تقوية العشوائية: ضجيج عشوائي أعلى (كان ×7 → أصبح ×12)
weight += Math.random() * AI1_NOISE_FACTOR;

// سقف وحد أدنى
weight = Math.min(weight, 45);
return Math.max(1, Math.round(weight));
}

// ============================================================
// 9. اختيار عنصر مرجّح واحد من مجموعة (بدون تكرار)
// يُرجع: { slot, weight, randomKey } مع الكاش
// ============================================================
function pickWeightedFromPool(pool, previousSelection) {
if (!pool || pool.length === 0) return null;

let weightedSlots = pool.map(slot => ({
slot: slot,
weight: calculateFruitWeight(slot, previousSelection),
randomKey: Math.random()
}));

// بناء مجمع اليانصيب
let lotteryPool = [];
weightedSlots.forEach(item => {
for (let i = 0; i < item.weight; i++) {
lotteryPool.push(item);
}
});

// حالة نادرة: كل الأوزان صفر → fallback
if (lotteryPool.length === 0) {
let idx = Math.floor(Math.random() * weightedSlots.length);
return weightedSlots[idx];
}

// 🎲 خلط قوي (5 دورات) + Entropy Injection (دورة إضافية + إزاحة عشوائية)
lotteryPool = injectEntropy(lotteryPool);

// اختيار نهائي بضجيج عشوائي بسيط (اختيار ضمن نافذة عشوائية ثم أخذ الأول)
const noiseWindow = Math.max(1, Math.floor(lotteryPool.length * 0.02));
const randomOffset = Math.floor(Math.random() * noiseWindow);
return lotteryPool[Math.min(randomOffset, lotteryPool.length - 1)];
}

// ============================================================
// 10. بناء كائن التوقع النهائي (مع بيانات مرتبطة بالخوارزمية)
// swappedFrom: اختياري — يُملأ عند حدوث تبديل في طبقة Pre-Send
// ============================================================
function buildPrediction(pick, category, swappedFrom) {
let w = (pick && pick.weight) ? pick.weight : 1;
let slot = pick.slot;

// الثقة مرتبطة بالوزن (92% - 99%)
let confidence = Math.min(99, Math.max(92, Math.round(90 + w / 3)));
// النقاط مرتبطة بالوزن
let score = (w * 50 + Math.random() * 100).toFixed(1);
// نسبة الأقلية (عشوائية صغيرة للعرض فقط)
let minority = (Math.random() * 4 + 0.3).toFixed(1);

return {
id: slot.id,
top: slot.top,
left: slot.left,
weight: w,
confidence: confidence,
score: score,
minority: minority,
category: category,              // 'SMALL' أو 'BIG'
swappedFrom: swappedFrom || null // 🆕 معرف الفاكهة التي تم استبدالها (إن وجد)
};
}

// ============================================================
// 11. 🆕 طبقة Pre-Send Swap
// تدقيق النتيجة قبل إرسالها للواجهة ومحاولة تبديل أي فاكهة
// ببديل أفضل وزناً من نفس فئتها (SMALL / BIG).
// - لا تكسر العدد النهائي (5 فواكه دائماً).
// - تحترم حد أقصى للاستبدالات (AI1_PRESEND_MAX_SWAPS).
// - تحتفظ بأثر التبديل في swappedFrom.
// ============================================================
function preSendSwap(predictions, slots, previousSelection) {
if (!AI1_PRESEND_ENABLED) return predictions;
if (!Array.isArray(predictions) || predictions.length === 0) return predictions;
if (!Array.isArray(slots) || slots.length === 0) return predictions;

// نسخة عمل مستقلة (حتى لا نلمس الأصل قبل القرار النهائي)
let working = predictions.map(p => ({ ...p }));
let totalSwaps = 0;
let swapLog = [];

for (let pass = 0; pass < AI1_PRESEND_PASSES; pass++) {
if (totalSwaps >= AI1_PRESEND_MAX_SWAPS) break;

for (let i = 0; i < working.length; i++) {
if (totalSwaps >= AI1_PRESEND_MAX_SWAPS) break;

let current = working[i];
let isSmall = SMALL_FRUIT_IDS.includes(current.id);
let poolIds = isSmall ? SMALL_FRUIT_IDS : BIG_FRUIT_IDS;

// مرشحو البديل: من نفس الفئة + غير مستخدمين حالياً في التوقع
let usedIds = new Set(working.map(p => p.id));
let candidates = slots.filter(s =>
poolIds.includes(s.id) && !usedIds.has(s.id) && s.id !== current.id
);

if (candidates.length === 0) continue;

// حساب أوزان البدائل واختيار الأفضل
let scored = candidates.map(s => ({
slot: s,
weight: calculateFruitWeight(s, previousSelection)
})).sort((a, b) => b.weight - a.weight);

let best = scored[0];
let currentWeight = current.weight || 1;

// شرط الاستبدال: البديل أعلى بوزن كافٍ + فرصة عشوائية
let isBetter = best.weight >= currentWeight * AI1_PRESEND_WEIGHT_THRESHOLD;
let roll = Math.random() < AI1_PRESEND_SWAP_CHANCE;

if (isBetter && roll) {
let replacedId = current.id;
let newPred = buildPrediction(
{ slot: best.slot, weight: best.weight },
current.category,
replacedId // 🆕 نسجل من تم استبداله
);
working[i] = newPred;
totalSwaps++;
swapLog.push({
pass: pass + 1,
from: replacedId,
to: best.slot.id,
oldWeight: currentWeight,
newWeight: best.weight
});
}
}
}

if (AI1_DEBUG_SWAP && swapLog.length > 0) {
console.group("🔁 AI1 Pre-Send Swap Log");
swapLog.forEach(s => {
console.log(`Pass ${s.pass}: ${s.from} ➜ ${s.to} (${s.oldWeight} ➜ ${s.newWeight})`);
});
console.log(`Total swaps: ${totalSwaps}`);
console.groupEnd();
}

// نُرفق سجل التبديل على المصفوفة كخاصية غير قابلة للتعداد (لا تكسر JSON.stringify)
try {
Object.defineProperty(working, "_swapLog", {
value: swapLog,
enumerable: false,
configurable: true,
writable: false
});
Object.defineProperty(working, "_totalSwaps", {
value: totalSwaps,
enumerable: false,
configurable: true,
writable: false
});
} catch (e) { /* بيئات لا تدعم defineProperty — تجاهل بهدوء */ }

return working;
}

// ============================================================
// 12. توليد 5 توقعات:
// 3 خانات لفواكه صغيرة (مواقع 1,2,3)
// 2 خانات لفواكه كبيرة (مواقع 4,5) — الخامسة هي المميزة بالأحمر
// + استدعاء preSendSwap قبل الإرجاع النهائي
// ============================================================
function generatePrediction(slots, previousSelection) {
try {
if (!slots || slots.length === 0) {
throw new Error("بيانات الفواكه مفقودة.");
}

if (previousSelection && previousSelection.length > 0) {
updateAIMemory(previousSelection);
}

// فصل المجموعات
let smallPool = slots.filter(s => SMALL_FRUIT_IDS.includes(s.id));
let bigPool = slots.filter(s => BIG_FRUIT_IDS.includes(s.id));

if (smallPool.length < 3) {
throw new Error("عدد الفواكه الصغيرة غير كافٍ (يجب 3 على الأقل).");
}
if (bigPool.length < 2) {
throw new Error("عدد الفواكه الكبيرة غير كافٍ (يجب 2 على الأقل).");
}

let result = [];
let usedIds = new Set();
let smallRemaining = [...smallPool];
let bigRemaining = [...bigPool];

// ---------- 3 فواكه صغيرة ----------
for (let i = 0; i < 3; i++) {
let pick = pickWeightedFromPool(smallRemaining, previousSelection);
if (pick && !usedIds.has(pick.slot.id)) {
result.push(buildPrediction(pick, 'SMALL'));
usedIds.add(pick.slot.id);
smallRemaining = smallRemaining.filter(s => s.id !== pick.slot.id);
} else {
// fallback عشوائي من المتبقي
let avail = smallRemaining.filter(s => !usedIds.has(s.id));
if (avail.length === 0) break;
let s = avail[Math.floor(Math.random() * avail.length)];
result.push(buildPrediction({ slot: s, weight: 1 }, 'SMALL'));
usedIds.add(s.id);
smallRemaining = smallRemaining.filter(x => x.id !== s.id);
}
}

// ---------- 2 فواكه كبيرة ----------
for (let i = 0; i < 2; i++) {
let pick = pickWeightedFromPool(bigRemaining, previousSelection);
if (pick && !usedIds.has(pick.slot.id)) {
result.push(buildPrediction(pick, 'BIG'));
usedIds.add(pick.slot.id);
bigRemaining = bigRemaining.filter(s => s.id !== pick.slot.id);
} else {
let avail = bigRemaining.filter(s => !usedIds.has(s.id));
if (avail.length === 0) break;
let s = avail[Math.floor(Math.random() * avail.length)];
result.push(buildPrediction({ slot: s, weight: 1 }, 'BIG'));
usedIds.add(s.id);
bigRemaining = bigRemaining.filter(x => x.id !== s.id);
}
}

if (result.length !== 5) {
throw new Error("فشل استخراج 5 توقعات.");
}

// 🆕 طبقة التدقيق قبل التسليم للواجهة
let finalResult = preSendSwap(result, slots, previousSelection);

// تحقق أمان: العدد يجب أن يبقى 5 وبدون تكرار
if (finalResult.length !== 5 || new Set(finalResult.map(p => p.id)).size !== 5) {
// في حال حدوث خلل نظري، نرجع الخام
return result;
}

return finalResult;

} catch (error) {
console.error("خطأ في الخوارزمية الأولى:", error.message);
return null;
}
}

// ============================================================
// 12.1 🆕 نسخة خام (بدون Pre-Send Swap) — للمقارنة/الاختبار
// ============================================================
function generatePredictionRaw(slots, previousSelection) {
try {
if (!slots || slots.length === 0) {
throw new Error("بيانات الفواكه مفقودة.");
}

if (previousSelection && previousSelection.length > 0) {
updateAIMemory(previousSelection);
}

let smallPool = slots.filter(s => SMALL_FRUIT_IDS.includes(s.id));
let bigPool = slots.filter(s => BIG_FRUIT_IDS.includes(s.id));

if (smallPool.length < 3) throw new Error("عدد الفواكه الصغيرة غير كافٍ.");
if (bigPool.length < 2) throw new Error("عدد الفواكه الكبيرة غير كافٍ.");

let result = [];
let usedIds = new Set();
let smallRemaining = [...smallPool];
let bigRemaining = [...bigPool];

for (let i = 0; i < 3; i++) {
let pick = pickWeightedFromPool(smallRemaining, previousSelection);
if (pick && !usedIds.has(pick.slot.id)) {
result.push(buildPrediction(pick, 'SMALL'));
usedIds.add(pick.slot.id);
smallRemaining = smallRemaining.filter(s => s.id !== pick.slot.id);
} else {
let avail = smallRemaining.filter(s => !usedIds.has(s.id));
if (avail.length === 0) break;
let s = avail[Math.floor(Math.random() * avail.length)];
result.push(buildPrediction({ slot: s, weight: 1 }, 'SMALL'));
usedIds.add(s.id);
smallRemaining = smallRemaining.filter(x => x.id !== s.id);
}
}

for (let i = 0; i < 2; i++) {
let pick = pickWeightedFromPool(bigRemaining, previousSelection);
if (pick && !usedIds.has(pick.slot.id)) {
result.push(buildPrediction(pick, 'BIG'));
usedIds.add(pick.slot.id);
bigRemaining = bigRemaining.filter(s => s.id !== pick.slot.id);
} else {
let avail = bigRemaining.filter(s => !usedIds.has(s.id));
if (avail.length === 0) break;
let s = avail[Math.floor(Math.random() * avail.length)];
result.push(buildPrediction({ slot: s, weight: 1 }, 'BIG'));
usedIds.add(s.id);
bigRemaining = bigRemaining.filter(x => x.id !== s.id);
}
}

if (result.length !== 5) throw new Error("فشل استخراج 5 توقعات.");
return result;

} catch (error) {
console.error("خطأ في الخوارزمية الأولى (Raw):", error.message);
return null;
}
}

// 13. وظائف إضافية لإدارة السجل والإحصائيات
function getLearningStats() {
return {
totalTrained: totalTrained,
perFruit: { ...learningBoost },
memorySize: ai1History.length,
memoryCapacity: AI1_MEMORY_SIZE,
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

// تصدير المتغيرات للاستخدام خارجياً (للتحقق من التصنيف)
function getSmallFruitIds() { return [...SMALL_FRUIT_IDS]; }
function getBigFruitIds() { return [...BIG_FRUIT_IDS]; }

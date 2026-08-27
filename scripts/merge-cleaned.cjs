const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const rawPath = path.join(ROOT, 'data/generated/questions.raw.json');
const enrichedDir = path.join(ROOT, 'data/generated/_enriched');
const outPath = path.join(ROOT, 'data/generated/questions.cleaned.json');
const needsReviewOutPath = path.join(ROOT, 'data/generated/questions-needs-review.json');

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

const enrichedMap = new Map();
for (let i = 1; i <= 14; i++) {
  const file = path.join(enrichedDir, `batch-${String(i).padStart(2, '0')}.json`);
  const batch = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const rec of batch) {
    if (enrichedMap.has(rec.id)) {
      throw new Error(`Duplicate id across enriched batches: ${rec.id}`);
    }
    enrichedMap.set(rec.id, rec);
  }
}

const missingEnriched = [];
const cleaned = raw.map((r) => {
  const enr = enrichedMap.get(r.id);
  if (!enr) {
    missingEnriched.push(r.id);
    return null;
  }
  const out = {
    id: r.id,
    cilt: r.cilt,
    sourcePdf: r.sourcePdf,
    bolum: r.bolum,
    bolumTitle: r.bolumTitle,
    test: r.test,
    questionNumber: r.questionNumber,
    examYear: r.examYear,
    examType: r.examType,
    question: enr.question,
    answerLetter: r.answerLetter,
    answerText: enr.answerText,
    explanation: r.sourceText,
    needsReview: enr.needsReview,
  };
  if (enr.needsReviewReason) {
    out.needsReviewReason = enr.needsReviewReason;
  }
  return out;
});

if (missingEnriched.length > 0) {
  console.error('ERROR: missing enriched records for ids:', missingEnriched);
  process.exit(1);
}

const extraEnriched = [...enrichedMap.keys()].filter(
  (id) => !raw.some((r) => r.id === id)
);
if (extraEnriched.length > 0) {
  console.error('ERROR: enriched ids not present in raw data:', extraEnriched);
  process.exit(1);
}

fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 1));

const needsReviewIds = cleaned.filter((r) => r.needsReview).map((r) => r.id);
fs.writeFileSync(needsReviewOutPath, JSON.stringify(needsReviewIds, null, 1));

console.log('=== MERGE REPORT ===');
console.log('Toplam kayit:', cleaned.length);
console.log('needsReview=false:', cleaned.filter((r) => !r.needsReview).length);
console.log('needsReview=true:', cleaned.filter((r) => r.needsReview).length);
console.log('answerText dolu:', cleaned.filter((r) => r.answerText !== null && r.answerText !== undefined).length);
console.log('answerText null:', cleaned.filter((r) => r.answerText === null || r.answerText === undefined).length);
console.log('question uretilemeyen:', cleaned.filter((r) => !r.question).length);
console.log('');
console.log('Cilt bazinda dagilim:');
const ciltCounts = {};
for (const r of cleaned) {
  const key = r.cilt || 'bilinmiyor';
  ciltCounts[key] = (ciltCounts[key] || 0) + 1;
}
console.log(ciltCounts);

const fs = require('fs');
const path = require('path');

const outDir = process.argv[2];
const d = require('../data/generated/questions.enriched.json');
const safe = d.filter(x => x.needsReview === false);
const BATCH = 63;
let n = 0;
for (let i = 0; i < safe.length; i += BATCH) {
  n++;
  const slice = safe.slice(i, i + BATCH).map(x => ({
    id: x.id,
    question: x.question,
    answerText: x.answerText,
    explanation: x.explanation,
    memoryNote: x.memoryNote,
    memoryType: x.memoryType,
  }));
  fs.writeFileSync(
    path.join(outDir, 'batch-' + String(n).padStart(2, '0') + '.json'),
    JSON.stringify(slice, null, 1),
    'utf-8'
  );
}
console.log('batches written:', n, 'total safe:', safe.length);

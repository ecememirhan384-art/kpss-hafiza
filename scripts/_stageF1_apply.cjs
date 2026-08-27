const fs = require('fs');
const path = require('path');

const finalData = require('../data/generated/questions.final.json');

// All 22 reviewed ids resolved to "approved" (needsMemoryReview:false).
// Only one required an actual text correction (missing list item, confirmed by source).
const corrections = {
  'cilt2-b9-t4-q2': {
    memoryNote: 'Tarım inkılapları: Aşar kaldırıldı, Ziraat Enstitüsü, Numune/Atatürk Orman Çiftlikleri, Tarım Kredi Kooperatifleri, Toprak Mahsulleri Ofisi, Çiftçiyi Topraklandırma Kanunu.',
  },
};

const reviewedIds = [
  'b4-t1-q5', 'cilt2-b1-t1-q3', 'cilt2-b3-t3-q1', 'cilt2-b3-t3-q2', 'cilt2-b3-t3-q3',
  'cilt2-b3-t3-q4', 'cilt2-b3-t3-q6', 'cilt2-b4-t3-q5', 'cilt2-b4-t4-q1', 'cilt2-b4-t4-q8',
  'cilt2-b4-t4-q7', 'cilt2-b4-t6-q2', 'cilt2-b5-t3-q2', 'cilt2-b5-t3-q9', 'cilt2-b7-t2-q13',
  'cilt2-b9-t1-q7', 'cilt2-b9-t3-q9', 'cilt2-b9-t4-q2', 'cilt2-b9-t5-q12', 'cilt2-b9-t5-q3',
  'cilt2-b13-t1-q10', 'cilt2-b13-t4-q4',
];
const reviewedSet = new Set(reviewedIds);

let approvedCount = 0;
let correctedCount = 0;

const approved = finalData.map(x => {
  if (!reviewedSet.has(x.id)) return x; // untouched: the other 731 safe + 30 skipped
  if (corrections[x.id]) {
    correctedCount++;
    return { ...x, memoryNote: corrections[x.id].memoryNote, needsMemoryReview: false };
  }
  approvedCount++;
  return { ...x, needsMemoryReview: false };
});

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'generated', 'questions.approved.json'),
  JSON.stringify(approved, null, 1),
  'utf-8'
);

// nothing left unresolved
fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'generated', 'memory-review-unresolved.json'),
  JSON.stringify([], null, 1),
  'utf-8'
);

const totalSafeNeedsMemReviewFalse = approved.filter(x => x.needsReview === false && x.needsMemoryReview === false).length;
const memoryNoteNull = approved.filter(x => x.needsReview === false && x.memoryNote === null).length;

console.log(JSON.stringify({
  total: approved.length,
  reviewedIn_Stage_F1: reviewedIds.length,
  approvedUnchanged: approvedCount,
  corrected: correctedCount,
  unresolved: 0,
  finalSafeNeedsMemoryReviewFalse: totalSafeNeedsMemReviewFalse,
  memoryNoteNull_amongSafe: memoryNoteNull,
}, null, 1));

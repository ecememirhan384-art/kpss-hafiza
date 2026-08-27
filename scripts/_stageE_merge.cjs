const fs = require('fs');
const path = require('path');

const outDir = process.argv[2]; // stageE_out dir
const cleaned = require('../data/generated/questions.cleaned.json');

// --- Load and merge all batch outputs ---
const batchFiles = fs.readdirSync(outDir).filter(f => /^batch-\d+\.json$/.test(f)).sort();
const byId = new Map();
let batchTotal = 0;
for (const f of batchFiles) {
  const arr = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf-8'));
  batchTotal += arr.length;
  for (const rec of arr) {
    if (byId.has(rec.id)) {
      console.error('DUPLICATE ID ACROSS BATCHES:', rec.id, 'in', f);
    }
    byId.set(rec.id, rec);
  }
}
console.log('batch files:', batchFiles.length, 'total records in batches:', batchTotal, 'unique ids:', byId.size);

// --- Build enriched dataset, preserving original order and fields ---
const enriched = [];
const missingFromBatches = [];
for (const rec of cleaned) {
  if (rec.needsReview === true) {
    enriched.push({ ...rec, memoryNote: null, memoryType: null, needsMemoryReview: true });
  } else {
    const m = byId.get(rec.id);
    if (!m) {
      missingFromBatches.push(rec.id);
      enriched.push({ ...rec, memoryNote: null, memoryType: null, needsMemoryReview: true });
    } else {
      enriched.push({
        ...rec,
        memoryNote: m.memoryNote ?? null,
        memoryType: m.memoryType ?? null,
        needsMemoryReview: m.needsMemoryReview === true || m.memoryNote == null,
      });
    }
  }
}

if (missingFromBatches.length) {
  console.error('MISSING FROM BATCH OUTPUT (fell back to null/review):', missingFromBatches.length, missingFromBatches.slice(0, 20));
}

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'generated', 'questions.enriched.json'),
  JSON.stringify(enriched, null, 1),
  'utf-8'
);

// --- Quality control ---
const total = enriched.length;
const safeCount = enriched.filter(x => x.needsReview === false).length;
const withNote = enriched.filter(x => x.memoryNote !== null).length;
const noteNull = enriched.filter(x => x.memoryNote === null).length;
const needsMemReviewTrue = enriched.filter(x => x.needsMemoryReview === true).length;
const skippedDueToNeedsReview = enriched.filter(x => x.needsReview === true).length;

const lens = enriched.filter(x => x.memoryNote).map(x => x.memoryNote.length);
const avgLen = lens.reduce((a, b) => a + b, 0) / (lens.length || 1);
const maxLen = Math.max(...lens);
const over100 = lens.filter(l => l > 100).length;
const over140 = lens.filter(l => l > 140).length;

const typeDist = {};
for (const x of enriched) {
  if (x.memoryType) typeDist[x.memoryType] = (typeDist[x.memoryType] || 0) + 1;
}

const cilt2Count = enriched.filter(x => x.cilt === 2).length;
const cilt3Count = enriched.filter(x => x.cilt === 3).length;

// --- Flag suspicious records (do NOT auto-fix) ---
const flagged = [];

// duplicate memoryNote text used for >1 different id
const noteToIds = new Map();
for (const x of enriched) {
  if (!x.memoryNote) continue;
  const key = x.memoryNote.trim().toLowerCase();
  if (!noteToIds.has(key)) noteToIds.set(key, []);
  noteToIds.get(key).push(x.id);
}
for (const [note, ids] of noteToIds) {
  if (ids.length > 1) {
    for (const id of ids) {
      const rec = enriched.find(x => x.id === id);
      flagged.push({ id, question: rec.question, answerText: rec.answerText, memoryNote: rec.memoryNote, reason: 'duplicate_memoryNote_shared_with_' + ids.filter(i => i !== id).join(',') });
    }
  }
}

for (const x of enriched) {
  if (x.needsReview === true) continue; // already excluded by design, not a QC flag
  if (x.memoryNote && x.memoryNote.length > 140) {
    flagged.push({ id: x.id, question: x.question, answerText: x.answerText, memoryNote: x.memoryNote, reason: 'exceeds_140_chars_len_' + x.memoryNote.length });
  }
  if (x.memoryNote === null && x.needsMemoryReview === true) {
    flagged.push({ id: x.id, question: x.question, answerText: x.answerText, memoryNote: null, reason: 'agent_flagged_insufficient_source' });
  }
  if (x.memoryNote) {
    const norm = s => s.toLowerCase().replace(/[^a-z0-9ığüşöç ]/gi, '').trim();
    if (x.answerText && norm(x.memoryNote) === norm(x.answerText)) {
      flagged.push({ id: x.id, question: x.question, answerText: x.answerText, memoryNote: x.memoryNote, reason: 'memoryNote_is_verbatim_answerText' });
    }
    if (x.memoryNote.trim().length < 10) {
      flagged.push({ id: x.id, question: x.question, answerText: x.answerText, memoryNote: x.memoryNote, reason: 'suspiciously_short_note' });
    }
  }
}

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'generated', 'memory-review.json'),
  JSON.stringify(flagged, null, 1),
  'utf-8'
);

// Propagate needsMemoryReview:true onto the enriched records for anything QC flagged
// (per instructions: do NOT auto-fix the note itself, only mark it for review)
const flaggedIds = new Set(flagged.map(f => f.id));
for (const x of enriched) {
  if (flaggedIds.has(x.id)) x.needsMemoryReview = true;
}
fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'generated', 'questions.enriched.json'),
  JSON.stringify(enriched, null, 1),
  'utf-8'
);

const finalNeedsMemReviewTrue = enriched.filter(x => x.needsMemoryReview === true).length;

console.log(JSON.stringify({
  total,
  safeCount,
  withNote,
  noteNull,
  needsMemReviewTrue_beforeQCFlagging: needsMemReviewTrue,
  needsMemReviewTrue_final: finalNeedsMemReviewTrue,
  skippedDueToNeedsReview,
  avgLen: Math.round(avgLen * 10) / 10,
  maxLen,
  over100,
  over140,
  typeDist,
  cilt2Count,
  cilt3Count,
  flaggedCount: flagged.length,
  missingFromBatches: missingFromBatches.length,
}, null, 1));

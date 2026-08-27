const fs = require('fs');
const path = require('path');

const outDir = process.argv[2]; // stageF_out dir
const enriched = require('../data/generated/questions.enriched.json');

// --- Load and merge all batch outputs ---
const batchFiles = fs.readdirSync(outDir).filter(f => /^batch-\d+\.json$/.test(f)).sort();
const byId = new Map();
let batchTotal = 0;
for (const f of batchFiles) {
  const arr = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf-8'));
  batchTotal += arr.length;
  for (const rec of arr) {
    if (byId.has(rec.id)) console.error('DUPLICATE ID ACROSS BATCHES:', rec.id, 'in', f);
    byId.set(rec.id, rec);
  }
}
console.log('batch files:', batchFiles.length, 'total records in batches:', batchTotal, 'unique ids:', byId.size);

// --- Build final dataset, preserving original order and fields ---
const finalData = [];
const missingFromBatches = [];
let changedCount = 0;
for (const rec of enriched) {
  if (rec.needsReview === true) {
    // untouched: 30 skipped records
    finalData.push({ ...rec });
    continue;
  }
  const m = byId.get(rec.id);
  if (!m) {
    missingFromBatches.push(rec.id);
    finalData.push({ ...rec }); // fall back to Stage E value, unchanged
    continue;
  }
  if (m.changed) changedCount++;
  finalData.push({
    ...rec,
    memoryNote: m.memoryNote ?? null,
    memoryType: m.memoryType ?? rec.memoryType,
    needsMemoryReview: m.needsMemoryReview === true || m.memoryNote == null,
  });
}

if (missingFromBatches.length) {
  console.error('MISSING FROM BATCH OUTPUT:', missingFromBatches.length, missingFromBatches.slice(0, 20));
}

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'generated', 'questions.final.json'),
  JSON.stringify(finalData, null, 1),
  'utf-8'
);

// --- Final QC ---
const total = finalData.length;
const safeCount = finalData.filter(x => x.needsReview === false).length;
const unsafeCount = finalData.filter(x => x.needsReview === true).length;
const withNote = finalData.filter(x => x.needsReview === false && x.memoryNote !== null).length;
const noteNull = finalData.filter(x => x.needsReview === false && x.memoryNote === null).length;

const lens = finalData.filter(x => x.needsReview === false && x.memoryNote).map(x => x.memoryNote.length);
const avgLen = lens.reduce((a, b) => a + b, 0) / (lens.length || 1);
const maxLen = Math.max(...lens);
const over80 = lens.filter(l => l > 80).length;
const over100 = lens.filter(l => l > 100).length;
const over120 = lens.filter(l => l > 120).length;

// --- Flag suspicious records (do NOT auto-fix) ---
const flagged = [];

const noteToIds = new Map();
for (const x of finalData) {
  if (x.needsReview === true || !x.memoryNote) continue;
  const key = x.memoryNote.trim().toLowerCase();
  if (!noteToIds.has(key)) noteToIds.set(key, []);
  noteToIds.get(key).push(x.id);
}
for (const [note, ids] of noteToIds) {
  if (ids.length > 1) {
    for (const id of ids) {
      const rec = finalData.find(x => x.id === id);
      flagged.push({ id, question: rec.question, answerText: rec.answerText, memoryNote: rec.memoryNote, reason: 'duplicate_memoryNote_shared_with_' + ids.filter(i => i !== id).join(',') });
    }
  }
}

for (const x of finalData) {
  if (x.needsReview === true) continue;

  if (x.memoryNote && x.memoryNote.length > 120) {
    flagged.push({ id: x.id, question: x.question, answerText: x.answerText, memoryNote: x.memoryNote, reason: 'exceeds_120_chars_len_' + x.memoryNote.length });
  }
  if (x.memoryNote === null) {
    flagged.push({ id: x.id, question: x.question, answerText: x.answerText, memoryNote: null, reason: 'null_memoryNote' });
  }
  if (x.needsMemoryReview === true) {
    flagged.push({ id: x.id, question: x.question, answerText: x.answerText, memoryNote: x.memoryNote, reason: 'agent_flagged_for_review' });
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

// dedupe flagged (same id might get multiple reasons -> merge into one entry per id, keep first reason list)
const flaggedById = new Map();
for (const f of flagged) {
  if (!flaggedById.has(f.id)) {
    flaggedById.set(f.id, { id: f.id, question: f.question, answerText: f.answerText, memoryNote: f.memoryNote, reason: f.reason });
  } else {
    flaggedById.get(f.id).reason += ';' + f.reason;
  }
}
const flaggedFinal = [...flaggedById.values()];

// Propagate needsMemoryReview:true onto final records for anything QC flagged
const flaggedIds = new Set(flaggedFinal.map(f => f.id));
for (const x of finalData) {
  if (flaggedIds.has(x.id)) x.needsMemoryReview = true;
}
fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'generated', 'questions.final.json'),
  JSON.stringify(finalData, null, 1),
  'utf-8'
);

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'generated', 'memory-review-final.json'),
  JSON.stringify(flaggedFinal, null, 1),
  'utf-8'
);

const finalNeedsMemReviewTrue = finalData.filter(x => x.needsMemoryReview === true).length;

console.log(JSON.stringify({
  total,
  safeCount,
  unsafeCount,
  withNote,
  noteNull,
  changedByStageF: changedCount,
  needsMemReviewTrue_final: finalNeedsMemReviewTrue,
  avgLen: Math.round(avgLen * 10) / 10,
  maxLen,
  over80,
  over100,
  over120,
  flaggedCount: flaggedFinal.length,
  missingFromBatches: missingFromBatches.length,
}, null, 1));

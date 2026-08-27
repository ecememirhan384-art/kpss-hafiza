const fs = require('fs');
const path = require('path');
const outPath = process.argv[2];
const f = require('../data/generated/questions.final.json');
const review = require('../data/generated/memory-review-final.json');
const ids = review.map(r => r.id);
const byId = new Map(f.map(x => [x.id, x]));
const out = ids.map(id => {
  const r = byId.get(id);
  return { id: r.id, question: r.question, answerText: r.answerText, explanation: r.explanation, memoryNote: r.memoryNote, memoryType: r.memoryType };
});
fs.writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf-8');
console.log('written', out.length);

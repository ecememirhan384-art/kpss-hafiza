const fs = require('fs');
const path = require('path');

const approved = require('../data/generated/questions.approved.json');

const usable = approved.filter(
  (x) => x.needsReview === false && x.needsMemoryReview === false
);

console.log('usable count:', usable.length);

// --- Validation before export ---
const ids = usable.map((x) => x.id);
const idSet = new Set(ids);
console.log('duplicate ids:', ids.length - idSet.size);

const missingMemoryNote = usable.filter((x) => !x.memoryNote).length;
const missingAnswerText = usable.filter((x) => !x.answerText).length;
const missingQuestion = usable.filter((x) => !x.question).length;
const missingExplanation = usable.filter((x) => !x.explanation).length;
console.log('missing memoryNote:', missingMemoryNote);
console.log('missing answerText:', missingAnswerText);
console.log('missing question:', missingQuestion);
console.log('missing explanation:', missingExplanation);

// --- Map to the frontend Question shape ---
const mapped = usable.map((x) => ({
  id: x.id,
  cilt: x.cilt,
  bolum: x.bolum,
  bolumTitle: x.bolumTitle,
  test: x.test,
  questionNumber: x.questionNumber,
  examYear: x.examYear,
  examType: x.examType,
  question: x.question,
  answerText: x.answerText,
  explanation: x.explanation,
  memoryNote: x.memoryNote,
  memoryType: x.memoryType,
}));

fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'data', 'questions.json'),
  JSON.stringify(mapped, null, 2),
  'utf-8'
);

console.log('written to src/data/questions.json, count:', mapped.length);

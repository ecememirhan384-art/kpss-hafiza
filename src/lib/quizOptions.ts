import type { Question } from '../types/question';

const OPTION_COUNT = 4;

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

// Elimination-style answers carry a parenthetical explanation, e.g.
// "Belçika (tarafsız bir ülkeydi)". Comparisons should only look at the
// actual answer, not the aside.
function coreAnswer(text: string): string {
  const idx = text.indexOf(' (');
  return (idx > 0 ? text.slice(0, idx) : text).trim();
}

// Elimination-style answers often trail off into a justification clause —
// "Wilson İlkeleri'nin yayımlanması (I. Dünya Savaşı devam ederken
// yayımlanmıştır)". That reasoning belongs in the explanation panel, not
// crammed into an option button: it reads as a run-on sentence and makes
// the option list harder to scan. Strip only a single TRAILING
// parenthetical (never one in the middle — some answers like "Almanya
// (Doğu-Batı Almanya) ve Kore (Kuzey-Güney Kore)" use parentheses as part
// of the actual content, and only the trailing one is safe to assume is a
// justification aside).
export function cleanAnswerForDisplay(text: string): string {
  const cleaned = text.replace(/\s*\([^()]*\)\s*$/, '').trim();
  return cleaned.length > 0 ? cleaned : text.trim();
}

// A one-word answer next to a full sentence reads as an obviously fake
// option. Only pair up answers whose lengths are in the same ballpark.
function lengthCloseEnough(correctLen: number, candidateLen: number): boolean {
  const tolerance = Math.max(15, correctLen * 0.6);
  return Math.abs(candidateLen - correctLen) <= tolerance;
}

function extractYear(text: string): number | null {
  const m = text.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return m ? parseInt(m[1], 10) : null;
}

// The same fact sometimes carries a different memoryType tag on different
// rows (e.g. "Bulgaristan" shows up tagged place/organization/agreement
// depending on the question). Trusting a single row's tag let a country
// name slip in as an option for an "which organization" question. Vote
// across every row sharing this exact answer and use the winner as that
// answer's real type.
function buildCanonicalTypeMap(questions: Question[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const q of questions) {
    const key = normalize(q.answerText);
    if (!counts.has(key)) counts.set(key, new Map());
    const typeCounts = counts.get(key)!;
    typeCounts.set(q.memoryType, (typeCounts.get(q.memoryType) ?? 0) + 1);
  }
  const canonical = new Map<string, string>();
  for (const [key, typeCounts] of counts) {
    let bestType = '';
    let bestCount = -1;
    for (const [type, count] of typeCounts) {
      if (count > bestCount) {
        bestType = type;
        bestCount = count;
      }
    }
    canonical.set(key, bestType);
  }
  return canonical;
}

function explanationMentionsCandidate(question: Question, candidateAnswer: string): boolean {
  const core = coreAnswer(candidateAnswer);
  if (core.length < 6) return false;
  return normalize(question.explanation).includes(normalize(core));
}

// A candidate whose answer is literally the subject named in the question
// itself isn't a wrong answer — it's what the question is about (e.g.
// "Balkan Antantı'na katılmayan devlet?" naming "Balkan Antantı" as an
// option). Drop those.
function isSelfReferential(question: Question, candidateAnswer: string): boolean {
  const core = coreAnswer(candidateAnswer);
  if (core.length < 6) return false;
  return normalize(question.question).includes(normalize(core));
}

let canonicalTypeCache: { source: Question[]; map: Map<string, string> } | null = null;

function getCanonicalType(question: Question, allQuestions: Question[]): string {
  if (canonicalTypeCache?.source !== allQuestions) {
    canonicalTypeCache = { source: allQuestions, map: buildCanonicalTypeMap(allQuestions) };
  }
  const key = normalize(question.answerText);
  return canonicalTypeCache.map.get(key) ?? question.memoryType;
}

/**
 * Builds a shuffled multiple-choice option set, or null if fewer than 3
 * plausible distractors exist for this question (caller should fall back
 * to a reveal/self-report flow for that question instead of forcing a
 * misleading multiple-choice UI).
 *
 * Candidates are gated to the answer's *canonical* memoryType (a place next
 * to a place, a date next to a date — see buildCanonicalTypeMap), a similar
 * answer length, and never the question's own subject. Among survivors,
 * same-bölüm (same topic) and answers explicitly mentioned in this
 * question's explanation are ranked highest since those are the distractors
 * a student could genuinely confuse with the right answer; close years get
 * an extra boost for date questions.
 */
export function buildOptions(question: Question, allQuestions: Question[]): string[] | null {
  const correct = question.answerText;
  const correctLen = correct.length;
  const correctKey = normalize(correct);
  const anchorType = getCanonicalType(question, allQuestions);
  const correctYear = anchorType === 'date' ? extractYear(correct) : null;
  const seen = new Set([correctKey]);

  const scored: Array<{ text: string; score: number }> = [];
  for (const candidate of allQuestions) {
    if (candidate.id === question.id) continue;
    const candidateKey = normalize(candidate.answerText);
    if (seen.has(candidateKey)) continue;

    const candidateType = getCanonicalType(candidate, allQuestions);
    if (candidateType !== anchorType) continue;
    if (!lengthCloseEnough(correctLen, candidate.answerText.length)) continue;
    if (isSelfReferential(question, candidate.answerText)) continue;

    const mentioned = explanationMentionsCandidate(question, candidate.answerText);
    const sameBolum = candidate.bolum === question.bolum;

    let score = 0;
    if (mentioned && sameBolum) score += 6;
    else if (sameBolum) score += 4;
    else if (mentioned) score += 2;

    if (anchorType === 'date' && correctYear) {
      const candidateYear = extractYear(candidate.answerText);
      if (candidateYear) {
        const diff = Math.abs(candidateYear - correctYear);
        if (diff <= 10) score += 3;
        else if (Math.floor(candidateYear / 100) === Math.floor(correctYear / 100)) score += 1;
      }
    }

    scored.push({ text: candidate.answerText, score });
    seen.add(candidateKey);
  }

  scored.sort((a, b) => b.score - a.score);

  // Shuffle within each score tier so the same top candidates don't always
  // win the coin-flip on repeat visits, then take the best 3 overall.
  const byScore = new Map<number, string[]>();
  for (const s of scored) {
    if (!byScore.has(s.score)) byScore.set(s.score, []);
    byScore.get(s.score)!.push(s.text);
  }
  const distractors: string[] = [];
  for (const level of [...byScore.keys()].sort((a, b) => b - a)) {
    if (distractors.length >= OPTION_COUNT - 1) break;
    for (const text of shuffle(byScore.get(level)!)) {
      if (distractors.length >= OPTION_COUNT - 1) break;
      distractors.push(text);
    }
  }

  if (distractors.length < OPTION_COUNT - 1) return null;

  return shuffle([correct, ...distractors]);
}

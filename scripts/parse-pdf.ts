/**
 * PDF -> ham (raw) soru verisi çıkarma script'i.
 *
 * "Tarihin Kara Kutusu" serisinin çözümler kitaplarını (birden fazla cilt
 * olabilir) pdftotext ile düz metne çevirir, BÖLÜM / TEST / soru numarası /
 * "Cevap X" / "(YIL-SINAV)" etiketi gibi yapıları tespit ederek
 * data/generated/questions.raw.json dosyasını üretir.
 *
 * kaynak-pdf/ klasöründeki TÜM .pdf dosyaları otomatik olarak işlenir.
 * Her kaynak kendi BÖLÜM/TEST numaralandırmasıyla (1'den) başladığından,
 * id çakışmasını önlemek için ilk işlenen (geriye dönük uyumluluk için
 * LEGACY_PDF_FILENAME) kaynak hariç her kaynağın id'sine kendi cilt/slug
 * öneki eklenir. LEGACY kaynağın id'leri hiç değiştirilmez.
 *
 * Kaynak metne müdahale etmez: soru/çözüm metnini olduğu gibi bırakır,
 * sadece yapısal işaretleri (BÖLÜM, TEST, Cevap X, sınav etiketi) ayrı
 * alanlara çıkarır. Kaynakta bulunmayan bilgi (ör. eksik sınav yılı) null
 * bırakılır, asla tahmin edilmez.
 *
 * Çalıştırmak için: npm run parse-pdf
 * Gereksinim: sistemde `pdftotext` (poppler-utils) kurulu olmalı.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const KAYNAK_DIR = join(PROJECT_ROOT, 'kaynak-pdf');
const RAW_DIR = join(PROJECT_ROOT, 'data', 'raw');
const GENERATED_DIR = join(PROJECT_ROOT, 'data', 'generated');

// İlk işlenen ve 154 sorunun üretildiği kaynak dosya. Geriye dönük
// uyumluluk için bu dosyanın id'leri önek almadan üretilmeye devam eder
// (b1-t1-q1 gibi). Sonradan eklenen her ek kaynak kendi slug önekini alır.
const LEGACY_PDF_FILENAME =
  '4050 - TARİHİN KARA KUTUSU 3. CİLT ÇÖZÜMLER DK V9.pdf';

interface RawQuestion {
  id: string;
  sourcePdf: string;
  cilt: number | null;
  bolum: number;
  bolumTitle: string | null;
  test: number | null;
  questionNumber: number;
  sourceText: string;
  answerLetter: string | null;
  examYear: number | null;
  examType: string | null;
  note: string | null;
  // Kaynakta aynı test içinde questionNumber tekrar ediyorsa (gerçek bir
  // baskı/numaralandırma tekrarıysa) her iki kayıt da questionNumber'ı
  // (= kaynaktaki orijinal soru numarası) korur, sadece id benzersizleştirilir.
  needsReview: boolean;
  duplicateType: 'exact' | 'possible' | null;
}

interface BolumSummary {
  bolum: number;
  title: string | null;
  tests: number[];
  questionCount: number;
}

interface SourceValidationReport {
  sourcePdf: string;
  cilt: number | null;
  bolumCount: number;
  testCount: number;
  questionCount: number;
  questionsWithoutAnswer: number;
  questionsWithoutExamTag: number;
  bolumBreakdown: BolumSummary[];
  warnings: string[];
}

interface CombinedValidationReport {
  generatedAt: string;
  sources: SourceValidationReport[];
  totalQuestionCount: number;
  totalQuestionsWithoutAnswer: number;
  totalQuestionsWithoutExamTag: number;
  duplicateSummary: {
    duplicateCount: number;
    possibleDuplicateCount: number;
    reportPath: string;
  };
}

// ---- PDF -> düz metin ----

function extractPdfText(pdfPath: string): string {
  if (!existsSync(pdfPath)) {
    throw new Error(`PDF bulunamadı: ${pdfPath}`);
  }

  return execFileSync('pdftotext', ['-enc', 'UTF-8', pdfPath, '-'], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 50,
  });
}

// ---- Yapısal desenler ----

const STATIC_NOISE_PATTERNS = [
  /^İNFORMAL YAYINLARI KARA KUTU YAYIN(\s+İNFORMAL YAYINLARI KARA KUTU YAYIN)*$/,
  /^ÇÖZÜMLER$/,
  /^Tarihin Kara Kutusu$/,
  /^\d{1,4}$/,
  /^\d+\.\s*C[İI]LT\b/i,
];

const BOLUM_RE = /^BÖLÜM\s*:\s*(\d+)/;
const TEST_RE = /^TEST\s*-\s*(\d+)/;
const QUESTION_START_RE = /^(\d+)\.\s+(.*)$/;
const ANSWER_RE = /Cevap\s+([A-E])\b/g;
const HAS_ANSWER_RE = /Cevap\s+[A-E]\b/;
// Sınav etiketi kaynakta her zaman aynı biçimde yazılmıyor: yıl ile tire
// arasında boşluk olabilir ("2013- KPSS"), etiket ay adı içerebilir
// ("2022-Temmuz/KPSS") veya birden fazla kelime + nokta içerebilir
// ("2018-Sos. Bilg. ÖABT"). Bu yüzden tip kısmı harfle başlayıp harf/boşluk/
// nokta/eğik çizgi içerebilecek şekilde toleranslı tutulur. Salt rakamdan
// oluşan parantez içi tarih aralıkları ("1938-1950") tip kısmı bir harfle
// başlamak zorunda olduğu için eşleşmez.
const TAG_RE =
  /\((\d{4})\s*-\s*([A-Za-zÇĞİÖŞÜçğıöşü][A-Za-zÇĞİÖŞÜçğıöşü .\/]*?)\)/g;
const NOTE_RE = /NOT\s*:\s*(.+?)(?=\s*Cevap\s+[A-E]\b)/;
const CILT_LINE_RE = /^(\d+)\.\s*C[İI]LT\b/i;

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function isStaticNoise(line: string): boolean {
  return STATIC_NOISE_PATTERNS.some((pattern) => pattern.test(line));
}

/**
 * Kaynağın en başındaki "N. CİLT: ..." satırından cilt numarasını çıkarır.
 * Bulunamazsa null döner (tahmin edilmez).
 */
function detectCiltNumber(rawText: string): number | null {
  const firstLines = rawText.split('\n').slice(0, 5);
  for (const raw of firstLines) {
    const line = normalizeLine(raw);
    if (!line) continue;
    const match = line.match(CILT_LINE_RE);
    if (match) return Number(match[1]);
  }
  return null;
}

/**
 * Bir kaynağı diğerlerinden ayırmak için kısa, dosya-sistemi güvenli bir
 * slug üretir. Cilt numarası biliniyorsa "cilt2" gibi anlamlı bir isim,
 * bilinmiyorsa dosya adından türetilmiş bir isim kullanılır.
 */
const COMBINING_DIACRITICS_RE = new RegExp('[\\u0300-\\u036f]', 'g');

function slugForSource(fileName: string, cilt: number | null): string {
  if (cilt !== null) return `cilt${cilt}`;
  return (
    fileName
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(COMBINING_DIACRITICS_RE, '')
      .replace(/\.pdf$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'kaynak'
  );
}

/**
 * Bazı bölüm geçişi sayfalarında konu başlığı "BÖLÜM: N" satırından ÖNCE
 * bir kez daha (önizleme gibi) geçiyor. Başlık rakamla başlıyorsa
 * ("2. DÜNYA SAVAŞI...") bu satır soru numarası deseniyle çakışıp yanlışlıkla
 * yeni bir soru başlangıcı sanılabilir. Bunu önlemek için tüm bölüm
 * başlıklarını baştan tarayıp her yerde (BÖLÜM'den önce veya sonra,
 * sayfa üstbilgisi olarak tekrar etse de) gürültü olarak işaretliyoruz.
 */
function collectKnownBolumTitles(lines: string[]): Set<string> {
  const titles = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    if (BOLUM_RE.test(lines[i])) {
      // "BÖLÜM: N" ile gerçek başlık arasına filigran/gürültü satırı
      // girebilir (özellikle iki sütunlu sayfalarda); başlığı bulana
      // kadar gürültüyü atla, aksi halde gürültü satırı "başlık" sanılıp
      // gerçek başlık hiç bilinen-başlık kümesine girmez.
      let j = i + 1;
      while (j < lines.length && isStaticNoise(lines[j])) j++;
      if (j < lines.length) titles.add(lines[j]);
    }
  }
  return titles;
}

// ---- Ham metin -> yapılandırılmış sorular ----

function parseQuestions(
  rawText: string,
  sourcePdf: string,
  cilt: number | null,
  idPrefix: string,
): {
  questions: RawQuestion[];
  warnings: string[];
} {
  const lines = rawText
    .split('\n')
    .map(normalizeLine)
    .filter((line) => line.length > 0);

  const knownBolumTitles = collectKnownBolumTitles(lines);
  const questions: RawQuestion[] = [];
  const warnings: string[] = [];

  let currentBolum: number | null = null;
  let currentBolumTitle: string | null = null;
  let currentTest: number | null = null;
  let awaitingTopic = false;

  let bufferLines: string[] = [];
  let bufferQuestionNumber: number | null = null;

  function flushQuestion(): void {
    if (bufferQuestionNumber === null || bufferLines.length === 0) {
      bufferLines = [];
      bufferQuestionNumber = null;
      return;
    }

    if (currentBolum === null) {
      warnings.push(
        `Bölüm bilgisi olmadan soru bulundu, atlandı: soru ${bufferQuestionNumber}`,
      );
      bufferLines = [];
      bufferQuestionNumber = null;
      return;
    }

    if (currentTest === null) {
      warnings.push(
        `Test bilgisi olmadan soru bulundu: bölüm ${currentBolum}, soru ${bufferQuestionNumber}`,
      );
    }

    const fullText = bufferLines.join(' ').replace(/\s+/g, ' ').trim();

    const answerMatches = [...fullText.matchAll(ANSWER_RE)];
    const lastAnswer = answerMatches[answerMatches.length - 1] ?? null;

    const tagMatches = [...fullText.matchAll(TAG_RE)];
    const lastTag = tagMatches[tagMatches.length - 1] ?? null;

    const noteMatch = fullText.match(NOTE_RE);

    let sourceText =
      lastAnswer && lastAnswer.index !== undefined
        ? fullText.slice(0, lastAnswer.index).trim()
        : fullText;
    sourceText = sourceText.replace(/^\d+\.\s*/, '').trim();

    if (!lastAnswer) {
      warnings.push(
        `Cevap bulunamadı: bölüm ${currentBolum}, test ${currentTest}, soru ${bufferQuestionNumber}`,
      );
    }

    questions.push({
      id: `${idPrefix}b${currentBolum}-t${currentTest ?? 0}-q${bufferQuestionNumber}`,
      sourcePdf,
      cilt,
      bolum: currentBolum,
      bolumTitle: currentBolumTitle,
      test: currentTest,
      questionNumber: bufferQuestionNumber,
      sourceText,
      answerLetter: lastAnswer ? lastAnswer[1] : null,
      examYear: lastTag ? Number(lastTag[1]) : null,
      examType: lastTag ? lastTag[2].trim() : null,
      note: noteMatch ? noteMatch[1].trim() : null,
      needsReview: !lastAnswer,
      duplicateType: null,
    });

    bufferLines = [];
    bufferQuestionNumber = null;
  }

  for (const line of lines) {
    // Bölüm başlığı, "BÖLÜM: N" satırından sonraki İLK GERÇEK (gürültü
    // olmayan) satırdır. Aradaki gürültü (filigran, sayfa numarası vb.)
    // yanlışlıkla başlık sanılmamalı; aksi halde gerçek başlık hiç
    // yakalanmaz ve rakamla başlayan başlıklar ("1. DÜNYA SAVAŞI...")
    // sayfa üstbilgisi olarak tekrarlandıkça soru numarası sanılır.
    if (awaitingTopic) {
      if (isStaticNoise(line)) continue;
      currentBolumTitle = line;
      awaitingTopic = false;
      continue;
    }

    if (isStaticNoise(line) || knownBolumTitles.has(line)) continue;

    const bolumMatch = line.match(BOLUM_RE);
    if (bolumMatch) {
      flushQuestion();
      currentBolum = Number(bolumMatch[1]);
      currentBolumTitle = null;
      currentTest = null;
      awaitingTopic = true;
      continue;
    }

    const testMatch = line.match(TEST_RE);
    if (testMatch) {
      flushQuestion();
      currentTest = Number(testMatch[1]);
      continue;
    }

    const questionMatch = line.match(QUESTION_START_RE);
    if (questionMatch) {
      const candidateNumber = Number(questionMatch[1]);
      // Bir sorunun kendi metni içinde geçen numaralı alt madde listeleri
      // ("1. Aşama...", "2. Aşama..." gibi) soru numarası deseniyle
      // çakışabiliyor. Hâlâ açık ve henüz cevabı bulunmamış bir arabellek
      // varken gelen, o arabelleğin numarasından KÜÇÜK VEYA EŞİT bir
      // aday, gerçek bir yeni soru olamaz (kaynakta soru numaraları bir
      // test içinde hep artar) - bu yüzden yeni soru başlangıcı sayılmaz,
      // mevcut sorunun devamı olarak arabelleğe eklenir. Arabellekte zaten
      // "Cevap X" bulunuyorsa (gerçek bir tekrarlanan soru numarası
      // olabilir) bu koruma devre dışı kalır ve satır normal şekilde yeni
      // soru başlangıcı sayılır.
      const isLikelySubListItem =
        bufferQuestionNumber !== null &&
        candidateNumber <= bufferQuestionNumber &&
        !HAS_ANSWER_RE.test(bufferLines.join(' '));

      if (!isLikelySubListItem) {
        flushQuestion();
        bufferQuestionNumber = candidateNumber;
        bufferLines = [line];
        continue;
      }
      // isLikelySubListItem: aşağıya düşer, satır normal devam metni gibi
      // arabelleğe eklenir.
    }

    if (bufferLines.length > 0) {
      bufferLines.push(line);
    }
    // Aksi halde: henüz bir soru başlamamışken gelen satır (ön kapak /
    // cilt başlığı gibi) - yoksayılır.
  }

  flushQuestion();

  return { questions, warnings };
}

// ---- Doğrulama raporu (tek kaynak) ----

function buildValidationReport(
  questions: RawQuestion[],
  baseWarnings: string[],
  sourcePdf: string,
  cilt: number | null,
): SourceValidationReport {
  const warnings = [...baseWarnings];

  // Kaynakta aynı bölüm/test içinde soru numarası tekrarı olabiliyor
  // (kitabın kendi numaralandırma hatası/baskı düzeni). Bunu sessizce
  // "düzeltmek" (örn. numarayı değiştirmek) kaynakta olmayan bir bilgi
  // uydurmak olur; questionNumber (kaynaktaki orijinal numara) dokunulmadan
  // korunur, sadece çakışan id'ler benzersizleştirilir (2. ve sonraki
  // kayıtlara -dup2, -dup3... eki eklenir) ve durum uyarı olarak işaretlenir.
  const groups = new Map<string, RawQuestion[]>();
  for (const question of questions) {
    const list = groups.get(question.id);
    if (list) list.push(question);
    else groups.set(question.id, [question]);
  }
  for (const [id, group] of groups) {
    if (group.length > 1) {
      for (let i = 1; i < group.length; i++) {
        group[i].id = `${id}-dup${i + 1}`;
      }
      const finalIds = group.map((q) => q.id).join(', ');
      warnings.push(
        `Tekrarlanan soru numarası: ${id} (${group.length} kez) - kaynakta aynı test içinde bu numara birden fazla kez kullanılmış (questionNumber korunur, id'ler benzersizleştirildi: ${finalIds}), elle kontrol edilmeli`,
      );
    }
  }

  const bolumMap = new Map<number, BolumSummary>();

  for (const question of questions) {
    let summary = bolumMap.get(question.bolum);
    if (!summary) {
      summary = {
        bolum: question.bolum,
        title: question.bolumTitle,
        tests: [],
        questionCount: 0,
      };
      bolumMap.set(question.bolum, summary);
    }
    if (question.test !== null && !summary.tests.includes(question.test)) {
      summary.tests.push(question.test);
    }
    summary.questionCount += 1;
  }

  const bolumBreakdown = [...bolumMap.values()].sort(
    (a, b) => a.bolum - b.bolum,
  );
  for (const summary of bolumBreakdown) {
    summary.tests.sort((a, b) => a - b);
  }

  const testCount = bolumBreakdown.reduce(
    (sum, summary) => sum + summary.tests.length,
    0,
  );

  return {
    sourcePdf,
    cilt,
    bolumCount: bolumBreakdown.length,
    testCount,
    questionCount: questions.length,
    questionsWithoutAnswer: questions.filter((q) => q.answerLetter === null)
      .length,
    questionsWithoutExamTag: questions.filter((q) => q.examYear === null)
      .length,
    bolumBreakdown,
    warnings,
  };
}

// ---- Duplicate / possible_duplicate tespiti ----

interface DuplicatePair {
  type: 'duplicate' | 'possible_duplicate';
  similarity: number;
  sameSource: boolean;
  a: {
    id: string;
    sourcePdf: string;
    bolum: number;
    test: number | null;
    questionNumber: number;
  };
  b: {
    id: string;
    sourcePdf: string;
    bolum: number;
    test: number | null;
    questionNumber: number;
  };
}

function normalizeForCompare(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(normalized: string): Set<string> {
  return new Set(normalized.split(' ').filter((t) => t.length >= 4));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const token of small) {
    if (big.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const DUPLICATE_JACCARD_THRESHOLD = 0.6;
const DUPLICATE_LENGTH_RATIO_FLOOR = 0.4;

function toPairRef(q: RawQuestion): DuplicatePair['a'] {
  return {
    id: q.id,
    sourcePdf: q.sourcePdf,
    bolum: q.bolum,
    test: q.test,
    questionNumber: q.questionNumber,
  };
}

function findDuplicates(questions: RawQuestion[]): DuplicatePair[] {
  const normalized = questions.map((q) => normalizeForCompare(q.sourceText));
  const tokens = normalized.map(tokenSet);
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      if (!normalized[i] || !normalized[j]) continue;

      let type: DuplicatePair['type'] | null = null;
      let similarity = 0;

      if (normalized[i] === normalized[j]) {
        type = 'duplicate';
        similarity = 1;
      } else {
        const lenA = normalized[i].length;
        const lenB = normalized[j].length;
        const lenRatio = Math.min(lenA, lenB) / Math.max(lenA, lenB);
        if (lenRatio >= DUPLICATE_LENGTH_RATIO_FLOOR) {
          const sim = jaccard(tokens[i], tokens[j]);
          if (sim >= DUPLICATE_JACCARD_THRESHOLD) {
            type = 'possible_duplicate';
            similarity = sim;
          }
        }
      }

      if (type) {
        pairs.push({
          type,
          similarity: Math.round(similarity * 1000) / 1000,
          sameSource: questions[i].sourcePdf === questions[j].sourcePdf,
          a: toPairRef(questions[i]),
          b: toPairRef(questions[j]),
        });
      }
    }
  }

  return pairs.sort((x, y) => y.similarity - x.similarity);
}

// ---- Kaynak keşfi ----

function discoverSourcePdfs(): string[] {
  if (!existsSync(KAYNAK_DIR)) return [];
  const all = readdirSync(KAYNAK_DIR).filter((f) =>
    f.toLowerCase().endsWith('.pdf'),
  );
  all.sort((a, b) => {
    if (a === LEGACY_PDF_FILENAME) return -1;
    if (b === LEGACY_PDF_FILENAME) return 1;
    return a.localeCompare(b, 'tr');
  });
  return all;
}

// ---- main ----

function main(): void {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(GENERATED_DIR, { recursive: true });

  const pdfFiles = discoverSourcePdfs();
  if (pdfFiles.length === 0) {
    throw new Error(`kaynak-pdf/ içinde PDF bulunamadı: ${KAYNAK_DIR}`);
  }

  const allQuestions: RawQuestion[] = [];
  const sourceReports: SourceValidationReport[] = [];

  for (const fileName of pdfFiles) {
    const pdfPath = join(KAYNAK_DIR, fileName);
    const isLegacy = fileName === LEGACY_PDF_FILENAME;

    console.log(`\nPDF okunuyor: ${fileName}`);
    const rawText = extractPdfText(pdfPath);

    const cilt = detectCiltNumber(rawText);
    const slug = isLegacy ? null : slugForSource(fileName, cilt);
    const idPrefix = isLegacy || slug === null ? '' : `${slug}-`;

    const rawTextPath = isLegacy
      ? join(RAW_DIR, 'questions.raw.txt')
      : join(RAW_DIR, `${slug}.raw.txt`);
    writeFileSync(rawTextPath, rawText, 'utf-8');
    console.log(`Ham metin kaydedildi: ${rawTextPath}`);

    const { questions, warnings } = parseQuestions(
      rawText,
      fileName,
      cilt,
      idPrefix,
    );
    allQuestions.push(...questions);

    const report = buildValidationReport(questions, warnings, fileName, cilt);
    sourceReports.push(report);

    console.log(
      `  Cilt: ${cilt ?? '?'} | Bölüm: ${report.bolumCount} | Test: ${report.testCount} | Soru: ${report.questionCount} | Cevapsız: ${report.questionsWithoutAnswer} | Sınav etiketi yok: ${report.questionsWithoutExamTag}`,
    );

    if (!isLegacy && slug !== null) {
      const singleReportPath = join(
        GENERATED_DIR,
        `validation-report-${slug}.json`,
      );
      writeFileSync(
        singleReportPath,
        JSON.stringify(report, null, 2) + '\n',
        'utf-8',
      );
      console.log(`  Ayrı doğrulama raporu: ${singleReportPath}`);
    }
  }

  const duplicatePairs = findDuplicates(allQuestions);
  const duplicateCount = duplicatePairs.filter(
    (p) => p.type === 'duplicate',
  ).length;
  const possibleDuplicateCount = duplicatePairs.filter(
    (p) => p.type === 'possible_duplicate',
  ).length;

  // Her sorunun duplicateType'ını ilgili çiftlerden işaretle. Bir kayıt hem
  // "duplicate" hem "possible_duplicate" bir çiftte geçiyorsa "exact" öncelik
  // kazanır. Hiçbir kayıt SİLİNMEZ, sadece işaretlenir.
  const byRef = new Map<string, RawQuestion>();
  for (const q of allQuestions) byRef.set(`${q.sourcePdf}|${q.id}`, q);
  for (const pair of duplicatePairs) {
    for (const ref of [pair.a, pair.b]) {
      const q = byRef.get(`${ref.sourcePdf}|${ref.id}`);
      if (!q) continue;
      if (pair.type === 'duplicate') {
        q.duplicateType = 'exact';
      } else if (q.duplicateType !== 'exact') {
        q.duplicateType = 'possible';
      }
    }
  }

  writeFileSync(
    join(GENERATED_DIR, 'questions.raw.json'),
    JSON.stringify(allQuestions, null, 2) + '\n',
    'utf-8',
  );
  console.log(
    `\nBirleşik ham soru verisi kaydedildi: ${join(GENERATED_DIR, 'questions.raw.json')} (${allQuestions.length} soru)`,
  );

  writeFileSync(
    join(GENERATED_DIR, 'duplicates-report.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalQuestionsCompared: allQuestions.length,
        similarityMetric: 'jaccard-token-4char-min',
        duplicateCount,
        possibleDuplicateCount,
        pairs: duplicatePairs,
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );
  console.log(
    `Duplicate raporu kaydedildi: ${join(GENERATED_DIR, 'duplicates-report.json')} (${duplicateCount} duplicate, ${possibleDuplicateCount} possible_duplicate)`,
  );

  const combinedReport: CombinedValidationReport = {
    generatedAt: new Date().toISOString(),
    sources: sourceReports,
    totalQuestionCount: allQuestions.length,
    totalQuestionsWithoutAnswer: allQuestions.filter(
      (q) => q.answerLetter === null,
    ).length,
    totalQuestionsWithoutExamTag: allQuestions.filter(
      (q) => q.examYear === null,
    ).length,
    duplicateSummary: {
      duplicateCount,
      possibleDuplicateCount,
      reportPath: 'data/generated/duplicates-report.json',
    },
  };
  writeFileSync(
    join(GENERATED_DIR, 'validation-report.json'),
    JSON.stringify(combinedReport, null, 2) + '\n',
    'utf-8',
  );

  console.log('\n--- Genel Özet ---');
  for (const r of sourceReports) {
    console.log(
      `${r.sourcePdf}: ${r.questionCount} soru (cevapsız: ${r.questionsWithoutAnswer}, sınav etiketi yok: ${r.questionsWithoutExamTag})`,
    );
  }
  console.log(`Toplam soru: ${combinedReport.totalQuestionCount}`);
  console.log(
    `Duplicate: ${duplicateCount}, Olası duplicate: ${possibleDuplicateCount}`,
  );
}

main();

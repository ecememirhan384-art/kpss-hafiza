import type { Question } from '../types/question';

export interface ReviewTypeGroup {
  type: string;
  label: string;
  notes: string[];
}

export interface ReviewSection {
  id: string;
  bolum: number;
  bolumTitle: string;
  colorIndex: number;
  groups: ReviewTypeGroup[];
}

export const TYPE_ORDER: { key: string; label: string }[] = [
  { key: 'chronology', label: 'Kronoloji' },
  { key: 'date', label: 'Tarihler' },
  { key: 'person', label: 'Kişiler' },
  { key: 'agreement', label: 'Antlaşmalar' },
  { key: 'organization', label: 'Kurumlar' },
  { key: 'event', label: 'Olaylar' },
  { key: 'place', label: 'Yerler' },
  { key: 'concept', label: 'Kavramlar' },
  { key: 'other', label: 'Diğer' },
];

const KNOWN_TYPES = new Set(TYPE_ORDER.map((t) => t.key));

function slugify(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Groups every question's memoryNote by bolumTitle, then by memoryType within
 * each section. First-seen order is preserved for sections; memoryType
 * sub-groups follow a fixed reading order (TYPE_ORDER). Exact-duplicate notes
 * within the same (section, type) pair are shown once. No note text is
 * altered.
 */
export function buildReviewSections(questions: Question[]): ReviewSection[] {
  const sections = new Map<
    string,
    { bolum: number; bolumTitle: string; typeMap: Map<string, string[]> }
  >();

  for (const q of questions) {
    const note = q.memoryNote?.trim();
    if (!note) continue;

    const sectionKey = q.bolumTitle;
    let section = sections.get(sectionKey);
    if (!section) {
      section = { bolum: q.bolum, bolumTitle: sectionKey, typeMap: new Map() };
      sections.set(sectionKey, section);
    }

    const typeKey = KNOWN_TYPES.has(q.memoryType) ? q.memoryType : 'other';
    let notes = section.typeMap.get(typeKey);
    if (!notes) {
      notes = [];
      section.typeMap.set(typeKey, notes);
    }
    if (!notes.includes(note)) notes.push(note);
  }

  return Array.from(sections.values()).map((section, index) => ({
    id: `${slugify(section.bolumTitle)}-${section.bolum}`,
    bolum: section.bolum,
    bolumTitle: section.bolumTitle,
    colorIndex: index % 4,
    groups: TYPE_ORDER.filter((t) => section.typeMap.has(t.key)).map((t) => ({
      type: t.key,
      label: t.label,
      notes: section.typeMap.get(t.key)!,
    })),
  }));
}

export function filterReviewSections(
  sections: ReviewSection[],
  query: string,
): ReviewSection[] {
  const q = query.trim().toLocaleLowerCase('tr');
  if (!q) return sections;

  return sections
    .map((section) => ({
      ...section,
      groups: section.groups
        .map((group) => ({
          ...group,
          notes: group.notes.filter((note) =>
            note.toLocaleLowerCase('tr').includes(q),
          ),
        }))
        .filter((group) => group.notes.length > 0),
    }))
    .filter((section) => section.groups.length > 0);
}

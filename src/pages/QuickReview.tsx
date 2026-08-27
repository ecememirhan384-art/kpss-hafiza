import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Printer, Search } from 'lucide-react';
import questionsData from '../data/questions.json';
import {
  buildReviewSections,
  filterReviewSections,
} from '../lib/quickReviewNotes';
import type { Question } from '../types/question';

const allQuestions = questionsData as Question[];

const STRIPE_CLASSES = ['bg-stripe-0', 'bg-stripe-1', 'bg-stripe-2', 'bg-stripe-3'];

const TYPE_STYLES: Record<string, { bg: string; ink: string; border: string }> = {
  chronology: { bg: 'bg-tag-chronology', ink: 'text-tag-chronology-ink', border: 'border-tag-chronology-ink' },
  date: { bg: 'bg-tag-date', ink: 'text-tag-date-ink', border: 'border-tag-date-ink' },
  person: { bg: 'bg-tag-person', ink: 'text-tag-person-ink', border: 'border-tag-person-ink' },
  agreement: { bg: 'bg-tag-agreement', ink: 'text-tag-agreement-ink', border: 'border-tag-agreement-ink' },
  organization: { bg: 'bg-tag-organization', ink: 'text-tag-organization-ink', border: 'border-tag-organization-ink' },
  event: { bg: 'bg-tag-event', ink: 'text-tag-event-ink', border: 'border-tag-event-ink' },
  place: { bg: 'bg-tag-place', ink: 'text-tag-place-ink', border: 'border-tag-place-ink' },
  concept: { bg: 'bg-tag-concept', ink: 'text-tag-concept-ink', border: 'border-tag-concept-ink' },
  other: { bg: 'bg-tag-other', ink: 'text-tag-other-ink', border: 'border-tag-other-ink' },
};

// Wraps 4-digit years and "→" chronology arrows for visual emphasis without
// altering the underlying note text in any way.
function renderNote(note: string): ReactNode[] {
  return note.split(/(\d{4}|→)/g).map((part, i) => {
    if (/^\d{4}$/.test(part)) {
      return (
        <strong key={i} className="font-bold">
          {part}
        </strong>
      );
    }
    if (part === '→') {
      return (
        <span key={i} className="font-bold text-lila-dark">
          →
        </span>
      );
    }
    return part;
  });
}

interface QuickReviewProps {
  onExit: () => void;
}

export function QuickReview({ onExit }: QuickReviewProps) {
  const sections = useMemo(() => buildReviewSections(allQuestions), []);
  const [query, setQuery] = useState('');

  const visibleSections = useMemo(
    () => filterReviewSections(sections, query),
    [sections, query],
  );

  const scrollToSection = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-cream print:bg-white">
      <div className="mx-auto max-w-[900px] px-4 py-8 sm:py-12 print:max-w-none print:p-0 flex flex-col gap-6 print:gap-3">
        <div className="flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-soft"
          >
            <ArrowLeft size={18} />
            Ana Sayfa
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-navy/10 text-navy-soft text-xs font-semibold px-3 py-1.5"
          >
            <Printer size={14} />
            Yazdır
          </button>
        </div>

        <header className="text-center border-b border-navy/10 pb-5 print:pb-2 print:border-navy/30">
          <p className="text-xs font-bold tracking-[0.2em] text-lila-dark uppercase print:text-black">
            KPSS Tarih
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy print:text-xl">
            Hızlı Tekrar Notları
          </h1>
          <p className="mt-1 text-xs text-navy-soft">
            Geçmiş sınav çözümlerinden kısa hafıza kancaları
          </p>
        </header>

        <div className="print:hidden flex flex-col gap-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-soft"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Notlarda ara..."
              className="w-full rounded-2xl bg-white border border-navy/10 pl-10 pr-4 py-2.5 text-sm text-navy placeholder:text-navy-soft/60 outline-none focus:border-lila"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-navy-soft uppercase tracking-wide mb-2">
              Konular
            </p>
            <div className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className="rounded-full bg-pink-soft-light text-navy-soft text-xs font-semibold px-3 py-1.5 hover:bg-lila-light hover:text-lila-dark transition-colors"
                >
                  {section.bolumTitle}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibleSections.length === 0 ? (
          <p className="text-center text-navy-soft py-10">
            "{query}" ile eşleşen not bulunamadı.
          </p>
        ) : (
          <div className="columns-1 md:columns-2 print:columns-2 [column-gap:2.5rem] print:[column-gap:9mm]">
            {visibleSections.map((section) => (
              <div key={section.id} id={section.id} className="mb-5 print:mb-3">
                <div className="flex items-stretch gap-2.5 mb-2 break-after-avoid">
                  <span
                    className={`w-1 shrink-0 rounded-full ${STRIPE_CLASSES[section.colorIndex]}`}
                  />
                  <div>
                    <p className="text-[11px] font-bold text-navy-soft uppercase tracking-wide">
                      {section.bolum}. Bölüm
                    </p>
                    <h2 className="text-base sm:text-lg font-extrabold text-navy leading-snug print:text-base">
                      {section.bolumTitle}
                    </h2>
                  </div>
                </div>

                {section.groups.map((group) => {
                  const style = TYPE_STYLES[group.type];
                  return (
                    <div key={group.type} className="mb-2.5">
                      <span
                        className={`inline-block break-after-avoid text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 mb-1 ${style.bg} ${style.ink} print:border print:border-current/30`}
                      >
                        {group.label}
                      </span>
                      <ul className="flex flex-col gap-1">
                        {group.notes.map((note) => (
                          <li
                            key={note}
                            className={`break-inside-avoid text-[13px] leading-snug text-navy border-l-2 ${style.border} ${style.bg} rounded-r-[4px] py-1.5 px-2.5 print:py-1 print:px-2`}
                          >
                            {renderNote(note)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface MemoryNoteBoxProps {
  note: string;
}

export function MemoryNoteBox({ note }: MemoryNoteBoxProps) {
  return (
    <div className="rounded-2xl bg-pink-soft-light border border-pink-soft px-4 py-3">
      <p className="text-xs font-bold text-lila-dark tracking-wide">
        🧠 Hafıza Kancası
      </p>
      <p className="mt-1 text-sm text-navy leading-relaxed break-words">{note}</p>
    </div>
  );
}

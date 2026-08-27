export function WelcomeBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-lila/15 bg-gradient-to-br from-lila-light via-pink-soft-light to-lila-light px-5 py-6 sm:px-10 sm:py-9 text-center">
      <div className="mx-auto mb-3 h-px w-14 bg-lila/40" />

      <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-wide text-navy break-words">
        ECEM HANIM’A ÖZEL
      </p>
      <p className="mt-2 text-sm sm:text-base font-medium text-lila-dark">
        KPSS Tarih Hafıza
      </p>

      <div className="mx-auto mt-3 h-px w-14 bg-lila/40" />
    </div>
  );
}

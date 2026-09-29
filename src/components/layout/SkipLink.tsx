export function SkipLink() {
  return (
    <a
      href="#app-content"
      className="pointer-events-none fixed left-3 top-3 z-[100] -translate-y-16 rounded-[var(--radius-control)] bg-[var(--brand-navy)] px-4 py-3 font-semibold text-white opacity-0 focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2"
    >
      Bỏ qua điều hướng
    </a>
  );
}

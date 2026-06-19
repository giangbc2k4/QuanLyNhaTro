export default function ServicesLoading() {
  return (
    <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="glass h-48 rounded-2xl border border-white/[0.06]"
        />
      ))}
    </div>
  );
}

const stats = [
  { value: "26", label: "estados atendidos" },
  { value: "100%", label: "vendedor verificado" },
  { value: "Grátis", label: "para anunciar" },
  { value: "Direto", label: "do produtor" },
];

export function StatsBar() {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {stats.map(({ value, label }) => (
          <div key={label}>
            <p className="text-green-700 font-bold text-xl md:text-2xl">{value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

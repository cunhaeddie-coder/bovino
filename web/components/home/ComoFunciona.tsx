const steps = [
  { icon: "📝", title: "Cadastre-se grátis", desc: "Crie sua conta em minutos com CPF e celular verificado." },
  { icon: "📸", title: "Anuncie seu gado", desc: "Adicione fotos, raça, peso e preço. Seu anúncio vai ao ar na hora." },
  { icon: "🤝", title: "Negocie com segurança", desc: "Converse diretamente com o comprador pelo chat integrado." },
];

export function ComoFunciona() {
  return (
    <section className="bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Como funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl">
                {s.icon}
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-green-700 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{i + 1}</span>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
              </div>
              <p className="text-gray-500 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

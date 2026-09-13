export default function App() {
  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col px-[24px] py-8 sm:px-12">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest">Proyecto vecinal</p>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-8 py-16">
        <p className="w-fit rounded-lg bg-ink px-4 py-2 text-sm text-balance font-bold text-paper">
          En desarrollo · Solo demostración local
        </p>
        <h1 className="max-w-3xl text-4xl leading-tight font-bold sm:text-6xl">
          La Cuenta Pendiente
        </h1>
        <p className="max-w-2xl text-2xl text-balance leading-snug">
          Los reclamos de la ciudad, en un solo mapa.
        </p>
        <section aria-labelledby="development" className="max-w-xl border-l-4 border-ink pl-6">
          <h2 id="development" className="text-lg font-bold">
            Estamos preparando este espacio
          </h2>
          <p className="mt-4 leading-relaxed">
            Esta versión todavía no recibe reclamos ni muestra un mapa o datos reales. No es un
            canal oficial municipal.
          </p>
        </section>
      </main>
      <footer className="border-t border-ink pt-6 text-sm">
        Sin recepción de reclamos. No ingreses datos personales.
      </footer>
    </div>
  );
}

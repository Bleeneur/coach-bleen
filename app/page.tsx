import DocteurGazonChat from "@/components/BleenChat";

export default function Home() {
  return (
    <main className="min-h-screen p-8" style={{ background: "var(--bleen-50)" }}>
      <h1 className="text-3xl font-bold" style={{color:"var(--bleen)"}}>Docteur Gazon – Prototype</h1>
      <p className="mt-2">Clique sur le bouton en bas à droite pour parler au docteur 😉</p>
      <DocteurGazonChat />
    </main>
  );
}

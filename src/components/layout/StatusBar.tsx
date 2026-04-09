export default function StatusBar() {
  return (
    <footer className="px-8 py-3 bg-inverse-surface flex justify-between items-center">
      <div className="flex gap-8">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-inverse-on-surface">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          System Active
        </span>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-inverse-on-surface">
          <span className="material-symbols-outlined text-[12px]">memory</span>
          AI Engine V2.4
        </span>
      </div>
      <div className="flex gap-8 text-[10px] uppercase tracking-widest font-bold text-inverse-on-surface">
        <span>OPS_DASHBOARD v0.1</span>
        <span>Latency: —</span>
      </div>
    </footer>
  );
}

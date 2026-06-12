import { ShieldCheck } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand__mark"><ShieldCheck size={20} strokeWidth={2.2} /></span>
      <span>Theorie Direkt</span>
    </div>
  );
}

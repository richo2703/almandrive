import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Topbar({ query, onChange }: { query: string; onChange(value: string): void }) {
  const { t } = useTranslation("translation");
  return (
    <div className="admin-topbar">
      <label className="admin-search">
        <Search size={16} />
        <input className="admin-input" value={query} onChange={(event) => onChange(event.target.value)} placeholder={t("layout.searchPlaceholder")} />
      </label>
    </div>
  );
}

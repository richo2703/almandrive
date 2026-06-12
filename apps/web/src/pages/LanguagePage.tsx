import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Language } from "../lib/api";
import { useApp } from "../context/AppContext";

export function LanguagePage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const { language, setLanguage, t } = useApp();
  useEffect(() => { api.languages().then(setLanguages); }, []);
  return (
    <section>
      <p className="eyebrow">{t("language.eyebrow")}</p>
      <h1>{t("language.title")}</h1>
      <p className="page-intro">{t("language.intro")}</p>
      <div className="selection-list">
        {languages.map((item) => (
          <button key={item.id} onClick={() => setLanguage(item.code)}>
            <span><strong>{item.nativeName}</strong><small>{item.name} · {item.isContentActive ? t("language.contentAvailable") : t("language.englishFallback")}</small></span>
            {language === item.code && <Check size={20} />}
          </button>
        ))}
      </div>
    </section>
  );
}

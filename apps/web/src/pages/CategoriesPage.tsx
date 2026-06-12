import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Category } from "../lib/api";
import { useApp } from "../context/AppContext";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const { category, setCategory, t } = useApp();
  useEffect(() => { api.categories().then(setCategories); }, []);
  return (
    <section>
      <p className="eyebrow">{t("categories.eyebrow")}</p>
      <h1>{t("categories.title")}</h1>
      <p className="page-intro">{t("categories.intro")}</p>
      <div className="category-grid">
        {categories.map((item) => (
          <button className={category === item.code ? "selected" : ""} key={item.id} onClick={() => setCategory(item.code)}>
            <span className="category-code">{item.code}</span>
            <span>{item.name}</span>
            {category === item.code && <Check size={18} />}
          </button>
        ))}
      </div>
    </section>
  );
}

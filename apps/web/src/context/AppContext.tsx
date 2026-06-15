import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, authenticate } from "../lib/api";
import {
  isSupportedLanguage,
  translate,
  type SupportedLanguage,
  type Translate,
} from "../i18n";

interface AppState {
  ready: boolean;
  error: string | null;
  firstName: string;
  isAdmin: boolean;
  category: string;
  setCategory(value: string): void;
  language: SupportedLanguage;
  setLanguage(value: string): void;
  t: Translate;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("Driver");
  const [isAdmin, setIsAdmin] = useState(false);
  const [category, setCategoryState] = useState(localStorage.getItem("category") ?? "");
  const storedLanguage = localStorage.getItem("language") ?? "en";
  const [language, setLanguageState] = useState<SupportedLanguage>(
    isSupportedLanguage(storedLanguage) ? storedLanguage : "en",
  );

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();
    authenticate(webApp?.initData ?? "")
      .then((user) => {
        setFirstName(user.firstName ?? "Driver");
        setIsAdmin(user.isAdmin);
        if (
          !localStorage.getItem("language") &&
          isSupportedLanguage(user.interfaceLanguage)
        ) {
          setLanguageState(user.interfaceLanguage);
        }
      })
      .catch((reason: unknown) => {
        localStorage.removeItem("theorie-token");
        setError(reason instanceof Error ? reason.message : "Could not sign in.");
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      error,
      firstName,
      isAdmin,
      category,
      setCategory(value: string) {
        localStorage.setItem("category", value);
        setCategoryState(value);
        void api.preferences({ category: value });
      },
      language,
      setLanguage(value: string) {
        const nextLanguage = isSupportedLanguage(value) ? value : "en";
        localStorage.setItem("language", nextLanguage);
        setLanguageState(nextLanguage);
        void api.preferences({ language: nextLanguage });
      },
      t: (key, params) => translate(language, key, params),
    }),
    [ready, error, firstName, isAdmin, category, language],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider.");
  return context;
}

import "../../i18n/admin";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../lib/api";
import { useAdminTheme } from "../../components/admin/ThemeToggle";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("translation");
  useAdminTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.adminLogin(username.trim(), password);
      window.location.href = "/admin";
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 429) {
        setError(reason.message);
      } else {
        setError(reason instanceof Error ? reason.message : t("login.error"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-auth-card" onSubmit={submit}>
        <p className="admin-eyebrow">Admin</p>
        <h1>{t("login.title")}</h1>
        <p>{t("login.subtitle")}</p>
        <label className="admin-field">
          <span>{t("login.username")}</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label className="admin-field">
          <span>{t("login.password")}</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </label>
        {error ? <div className="admin-alert admin-alert--danger">{error}</div> : null}
        <div className="admin-actions">
          <button className="admin-button admin-button--primary" type="submit" disabled={loading}>
            {loading ? t("login.signingIn") : t("login.button")}
          </button>
          <button className="admin-button admin-button--secondary" type="button" onClick={() => navigate("/")}>
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

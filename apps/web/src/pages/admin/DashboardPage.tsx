import "../../i18n/admin";
import { useEffect, useState } from "react";
import { api, type AdminDashboard } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { useTranslation } from "react-i18next";
import { AdminCard } from "../../components/admin/Card";

export function DashboardPage() {
  const { isAdmin } = useApp();
  const { t } = useTranslation("translation");
  const [data, setData] = useState<AdminDashboard | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    api.adminDashboard().then(setData).catch(() => setData(null));
  }, [isAdmin]);

  if (!isAdmin) return null;
  if (!data) return <div className="admin-loading">{t("common.loading")}…</div>;

  return (
    <div className="admin-stack">
      <AdminCard title={t("dashboard.overview")} subtitle={t("dashboard.intro")}>
        <div className="admin-metrics">
          <Metric label={t("dashboard.totalUsers")} value={data.totalUsers} />
          <Metric label={t("dashboard.activeSubscribers")} value={data.activeSubscribers} />
          <Metric label={t("dashboard.revenueStars")} value={`${data.revenueStars} ⭐`} />
          <Metric label={t("dashboard.ordersToday")} value={data.ordersToday} />
          <Metric label={t("dashboard.ordersMonth")} value={data.ordersMonth} />
          <Metric label={t("dashboard.activePromoCodes")} value={data.activePromoCodes} />
          <Metric label={t("dashboard.activeBanners")} value={data.activeBanners} />
          <Metric label={t("dashboard.adminIds")} value={data.adminTelegramIds.length} />
        </div>
      </AdminCard>
      <AdminCard title={t("dashboard.recentOrders")}>
        <div className="admin-list">
          {data.recentOrders.map((order) => (
            <article className="admin-list__item" key={order.id}>
              <div>
                <strong>{order.product?.title ?? "Product"}</strong>
                <p>{order.user?.firstName ?? order.user?.username ?? order.user?.telegramId}</p>
              </div>
              <span>{order.amountStarsFinal} ⭐</span>
            </article>
          ))}
        </div>
      </AdminCard>
      <AdminCard title={t("dashboard.recentUsers")}>
        <div className="admin-list">
          {data.recentUsers.map((user) => (
            <article className="admin-list__item" key={user.id}>
              <div>
                <strong>{user.firstName ?? user.username ?? user.telegramId}</strong>
                <p>{user.username ?? user.telegramId}</p>
              </div>
            </article>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

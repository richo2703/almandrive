import "../../i18n/admin";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Image, ShoppingCart, Star, Tag, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, type AdminDashboard, type AdminDashboardCharts } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { useTranslation } from "react-i18next";
import { AdminCard } from "../../components/admin/Card";

export function DashboardPage() {
  const { isAdmin } = useApp();
  const { t } = useTranslation("translation");
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [charts, setCharts] = useState<AdminDashboardCharts | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([api.adminDashboard(), api.adminDashboardCharts(30)])
      .then(([dashboard, chartRows]) => {
        setData(dashboard);
        setCharts(chartRows);
      })
      .catch(() => {
        setData(null);
        setCharts(null);
      });
  }, [isAdmin]);

  if (!isAdmin) return null;
  if (!data) return <div className="admin-loading">{t("common.loading")}…</div>;

  return (
    <div className="admin-stack">
      <AdminCard title={t("dashboard.overview")} subtitle={t("dashboard.intro")}>
        <div className="admin-metrics">
          <Metric icon={<Users size={18} />} label={t("dashboard.totalUsers")} value={data.totalUsers} />
          <Metric icon={<Bell size={18} />} label={t("dashboard.activeSubscribers")} value={data.activeSubscribers} />
          <Metric icon={<Star size={18} />} label={t("dashboard.revenueStars")} value={`${data.revenueStars} ⭐`} />
          <Metric icon={<ShoppingCart size={18} />} label={t("dashboard.ordersToday")} value={data.ordersToday} />
          <Metric icon={<ShoppingCart size={18} />} label={t("dashboard.ordersMonth")} value={data.ordersMonth} />
          <Metric icon={<Tag size={18} />} label={t("dashboard.activePromoCodes")} value={data.activePromoCodes} />
          <Metric icon={<Image size={18} />} label={t("dashboard.activeBanners")} value={data.activeBanners} />
          <Metric icon={<Users size={18} />} label={t("dashboard.adminIds")} value={data.adminTelegramIds.length} />
        </div>
      </AdminCard>
      {charts ? (
        <div className="admin-chart-grid">
          <ChartCard title={t("dashboard.revenueChart")}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={charts.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenueStars" stroke="var(--admin-accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("dashboard.newUsersChart")}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.newUsers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="newUsers" fill="var(--admin-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("dashboard.ordersStatusChart")}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={charts.ordersByStatus} dataKey="count" nameKey="status" outerRadius={86} label>
                  {charts.ordersByStatus.map((entry, index) => <Cell key={entry.status} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("dashboard.topProductsChart")}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="title" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="salesCount" fill="var(--admin-accent)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : null}
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

const chartColors = ["#4f8cff", "#2ecc71", "#f5a623", "#ef4444", "#8b5cf6"];

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <div className="admin-metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="admin-chart-card">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

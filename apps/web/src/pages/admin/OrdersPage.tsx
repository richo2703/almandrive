import "../../i18n/admin";
import { ChevronDown, Download, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminButton } from "../../components/admin/Button";
import { AdminCard } from "../../components/admin/Card";
import { DateTimePicker } from "../../components/admin/DateTimePicker";
import { Input } from "../../components/admin/Input";
import { Select } from "../../components/admin/Select";
import { api, type PaymentOrder } from "../../lib/api";
import { useApp } from "../../context/AppContext";

const emptyFilters = {
  status: "",
  userId: "",
  from: "",
  to: "",
  minAmount: "",
  maxAmount: "",
  promoCode: "",
};

export function OrdersPage() {
  const { isAdmin } = useApp();
  const { t } = useTranslation("translation");
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [openFilters, setOpenFilters] = useState(true);
  const [loading, setLoading] = useState(true);

  async function load(nextFilters = applied) {
    setLoading(true);
    try {
      setOrders(await api.adminOrders(nextFilters));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    void load(emptyFilters);
  }, [isAdmin]);

  const total = useMemo(() => orders.reduce((sum, order) => sum + order.amountStarsFinal, 0), [orders]);

  if (!isAdmin) return null;

  async function applyFilters() {
    setApplied(filters);
    await load(filters);
  }

  async function resetFilters() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    await load(emptyFilters);
  }

  async function updateStatus(order: PaymentOrder, status: "PAID" | "REFUNDED" | "CANCELLED") {
    try {
      await api.adminUpdateOrderStatus(order.id, status);
      await load();
      toast.success(t("toasts.orderUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.saveFailed"));
    }
  }

  function exportCsv() {
    const csv = [
      ["id", "status", "amountStarsFinal", "product", "user", "promoCode", "createdAt"].join(","),
      ...orders.map((order) =>
        [
          order.id,
          displayStatus(order.status),
          order.amountStarsFinal,
          csvCell(order.product?.title ?? ""),
          csvCell(displayUser(order)),
          order.promoCode?.code ?? "",
          order.createdAt,
        ].join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-stack">
      <AdminCard
        title={t("orders.title")}
        subtitle={t("orders.summary", { count: orders.length, total })}
        actions={<AdminButton type="button" onClick={exportCsv}><Download size={16} />{t("orders.exportCsv")}</AdminButton>}
      >
        <button className="admin-filter-toggle" type="button" onClick={() => setOpenFilters((value) => !value)}>
          <span>{t("orders.filter")}</span>
          <ChevronDown size={16} className={openFilters ? "is-open" : ""} />
        </button>
        {openFilters ? (
          <div className="admin-filter-panel">
            <Select
              label={t("orders.status")}
              value={filters.status || "all"}
              onChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
              options={["all", "PENDING", "PAID", "CANCELLED", "REFUNDED"].map((status) => ({
                value: status,
                label: t(`orders.statuses.${status}`),
              }))}
            />
            <Input label={t("orders.userId")} value={filters.userId} onChange={(event) => setFilters({ ...filters, userId: event.target.value })} />
            <DateTimePicker label={t("orders.from")} value={filters.from} onChange={(value) => setFilters({ ...filters, from: value })} />
            <DateTimePicker label={t("orders.to")} value={filters.to} onChange={(value) => setFilters({ ...filters, to: value })} />
            <Input label={t("orders.minAmount")} type="number" value={filters.minAmount} onChange={(event) => setFilters({ ...filters, minAmount: event.target.value })} />
            <Input label={t("orders.maxAmount")} type="number" value={filters.maxAmount} onChange={(event) => setFilters({ ...filters, maxAmount: event.target.value })} />
            <Input label={t("orders.promoCode")} value={filters.promoCode} onChange={(event) => setFilters({ ...filters, promoCode: event.target.value })} />
            <div className="admin-actions">
              <AdminButton variant="primary" type="button" onClick={() => void applyFilters()}>{t("orders.apply")}</AdminButton>
              <AdminButton type="button" onClick={() => void resetFilters()}>{t("orders.reset")}</AdminButton>
            </div>
          </div>
        ) : null}
      </AdminCard>

      {loading ? <div className="admin-skeleton-list"><span /><span /><span /></div> : null}
      {!loading && orders.length === 0 ? <div className="admin-empty"><Star size={24} /><p>{t("orders.empty")}</p></div> : null}
      <div className="admin-order-list">
        {orders.map((order) => (
          <article className="admin-order-card" key={order.id}>
            <div>
              <span className={`admin-status ${orderStatusClass(order.status)}`}>{t(`orders.statuses.${displayStatus(order.status)}`)}</span>
              <h3><Star size={16} />{order.amountStarsFinal} {t("orders.stars")}</h3>
              <p>{order.product?.title ?? t("orders.product")} · {order.product?.isLifetime ? t("products.lifetime") : `${order.product?.accessDays ?? 0} ${t("orders.days")}`}</p>
            </div>
            <div>
              <Link className="admin-link" to={`/admin/users?q=${encodeURIComponent(order.user?.telegramId ?? order.userId)}`}>{displayUser(order)}</Link>
              <p>{formatDateTime(order.createdAt)}</p>
              {order.promoCode ? <span className="admin-badge">{order.promoCode.code}</span> : null}
            </div>
            <div className="admin-actions">
              {order.status === "PENDING" ? <AdminButton variant="primary" type="button" onClick={() => void updateStatus(order, "PAID")}>{t("orders.confirmManually")}</AdminButton> : null}
              {order.status === "PAID" ? <AdminButton type="button" onClick={() => void updateStatus(order, "REFUNDED")}>{t("orders.refund")}</AdminButton> : null}
              {order.status !== "REFUNDED" && order.status !== "FAILED" ? <AdminButton variant="danger" type="button" onClick={() => void updateStatus(order, "CANCELLED")}>{t("orders.cancel")}</AdminButton> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function displayStatus(status: PaymentOrder["status"]) {
  return status === "FAILED" ? "CANCELLED" : status;
}

function orderStatusClass(status: PaymentOrder["status"]) {
  if (status === "PAID") return "is-success";
  if (status === "PENDING") return "is-warning";
  if (status === "REFUNDED") return "is-info";
  return "is-muted";
}

function displayUser(order: PaymentOrder) {
  if (!order.user) return order.userId;
  const name = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ");
  return name || order.user.username || order.user.telegramId;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

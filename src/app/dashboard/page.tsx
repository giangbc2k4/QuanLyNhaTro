import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  DoorOpen,
  FileText,
  MessageCircle,
  ReceiptText,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatVND, formatVNDShort } from "@/lib/design-system";

const activeContractStatuses = ["active", "expiring"];

function vietnamDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function recentMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1);
    return {
      key: monthKey(date),
      label: `T${date.getMonth() + 1}`,
    };
  });
}

function relativeTime(value: string) {
  const difference = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(difference / 60_000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const months = recentMonths(6);
  const today = vietnamDate();
  const currentMonth = today.slice(0, 7);
  const thirtyDaysLater = new Date(`${today}T00:00:00+07:00`);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const warningDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(thirtyDaysLater);

  const [
    roomsResult,
    contractsResult,
    tenantsResult,
    invoicesResult,
    readingsResult,
  ] = await Promise.all([
    supabase
      .from("rooms")
      .select(`
        id, room_number, monthly_rent, status,
        buildings!rooms_building_id_fkey(name)
      `)
      .eq("account_id", userId)
      .order("room_number"),
    supabase
      .from("contracts")
      .select(`
        id, room_id, end_date, status, created_at,
        tenants!contracts_main_tenant_id_fkey(full_name),
        rooms!contracts_room_id_fkey(
          room_number,
          buildings!rooms_building_id_fkey(name)
        )
      `)
      .eq("account_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("account_id", userId),
    supabase
      .from("invoices")
      .select(`
        id, invoice_code, billing_month, due_date, status,
        total_amount, created_at, paid_at,
        rooms!invoices_room_id_fkey(room_number)
      `)
      .eq("account_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("meter_reading_submissions")
      .select(`
        id, status, confirmed_at, created_at,
        rooms!meter_reading_submissions_room_id_fkey(room_number),
        meter_reading_values(service_name, current_reading, unit)
      `)
      .eq("account_id", userId)
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false })
      .limit(5),
  ]);

  const error =
    roomsResult.error ??
    contractsResult.error ??
    tenantsResult.error ??
    invoicesResult.error ??
    readingsResult.error;
  if (error) {
    return (
      <div className="glass rounded-2xl border border-red-500/20 p-6">
        <h2 className="font-semibold text-white">Không thể tải trang tổng quan</h2>
        <p className="mt-2 text-xs text-red-400">{error.message}</p>
      </div>
    );
  }

  const rooms = roomsResult.data ?? [];
  const contracts = contractsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const activeContracts = contracts.filter((contract) =>
    activeContractStatuses.includes(contract.status)
  );
  const activeContractByRoom = new Map(
    activeContracts.map((contract) => [contract.room_id, contract])
  );
  const maintenanceRooms = rooms.filter(
    (room) => room.status === "maintenance"
  ).length;
  const occupiedRooms = activeContractByRoom.size;
  const vacantRooms = Math.max(0, rooms.length - occupiedRooms - maintenanceRooms);
  const occupancyRate = rooms.length
    ? Math.round((occupiedRooms / rooms.length) * 100)
    : 0;

  const currentMonthPaid = invoices
    .filter(
      (invoice) =>
        invoice.status === "paid" &&
        invoice.billing_month.slice(0, 7) === currentMonth
    )
    .reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);
  const outstanding = invoices
    .filter((invoice) => invoice.status === "issued")
    .reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);
  const overdueInvoices = invoices.filter(
    (invoice) => invoice.status === "issued" && invoice.due_date < today
  );
  const expiringContracts = activeContracts.filter(
    (contract) => contract.end_date >= today && contract.end_date <= warningDate
  );

  const revenueByMonth = new Map(months.map((month) => [month.key, 0]));
  for (const invoice of invoices) {
    if (invoice.status !== "paid") continue;
    const key = invoice.billing_month.slice(0, 7);
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(
        key,
        (revenueByMonth.get(key) ?? 0) + Number(invoice.total_amount)
      );
    }
  }
  const revenueData = months.map((month) => ({
    ...month,
    value: revenueByMonth.get(month.key) ?? 0,
  }));
  const maxRevenue = Math.max(...revenueData.map((item) => item.value), 1);

  const activities: Array<{
    id: string;
    text: string;
    time: string;
    date: string;
    icon: typeof CheckCircle2;
    color: string;
  }> = [];
  for (const reading of readingsResult.data ?? []) {
    const room = Array.isArray(reading.rooms) ? reading.rooms[0] : reading.rooms;
    const values = reading.meter_reading_values ?? [];
    activities.push({
      id: `reading-${reading.id}`,
      text: `P${room?.room_number ?? "—"} đã xác nhận ${values
        .map(
          (value) =>
            `${value.service_name}: ${Number(value.current_reading).toLocaleString("vi-VN")} ${value.unit}`
        )
        .join(", ") || "chỉ số công tơ"}`,
      time: relativeTime(reading.confirmed_at ?? reading.created_at),
      date: reading.confirmed_at ?? reading.created_at,
      icon: CheckCircle2,
      color: "text-success",
    });
  }
  for (const invoice of invoices.slice(0, 5)) {
    const room = Array.isArray(invoice.rooms) ? invoice.rooms[0] : invoice.rooms;
    activities.push({
      id: `invoice-${invoice.id}`,
      text: `Hóa đơn ${invoice.invoice_code} · P${room?.room_number ?? "—"} · ${formatVND(Number(invoice.total_amount))}`,
      time: relativeTime(invoice.created_at),
      date: invoice.created_at,
      icon: ReceiptText,
      color: invoice.status === "paid" ? "text-success" : "text-accent",
    });
  }
  const recentActivities = activities
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const stats = [
    {
      label: "Tổng phòng",
      value: String(rooms.length),
      helper: `${maintenanceRooms} phòng bảo trì`,
      icon: Building2,
      color: "bg-accent/10 text-accent",
    },
    {
      label: "Đang thuê",
      value: String(occupiedRooms),
      helper: `Lấp đầy ${occupancyRate}%`,
      icon: Users,
      color: "bg-success/10 text-success",
    },
    {
      label: "Phòng trống",
      value: String(vacantRooms),
      helper: "Sẵn sàng cho thuê",
      icon: DoorOpen,
      color: "bg-warning/10 text-warning",
    },
    {
      label: `Đã thu T${Number(currentMonth.slice(5))}`,
      value: formatVNDShort(currentMonthPaid),
      helper: `Còn phải thu ${formatVNDShort(outstanding)}`,
      icon: TrendingUp,
      color: "bg-purple/10 text-purple",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="glass rounded-2xl border border-white/[0.06] p-5"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-[10px] text-text-muted">{stat.helper}</p>
          </article>
        ))}
      </div>

      {(overdueInvoices.length > 0 ||
        expiringContracts.length > 0 ||
        maintenanceRooms > 0) && (
        <div className="grid gap-3 md:grid-cols-3">
          <AlertCard
            href="/dashboard/invoices"
            icon={AlertCircle}
            label="Hóa đơn quá hạn"
            value={overdueInvoices.length}
            detail={formatVND(
              overdueInvoices.reduce(
                (sum, invoice) => sum + Number(invoice.total_amount),
                0
              )
            )}
            color="text-red-400"
          />
          <AlertCard
            href="/dashboard/contracts"
            icon={Clock3}
            label="Hợp đồng sắp hết hạn"
            value={expiringContracts.length}
            detail="Trong 30 ngày tới"
            color="text-warning"
          />
          <AlertCard
            href="/dashboard/buildings"
            icon={Wrench}
            label="Phòng bảo trì"
            value={maintenanceRooms}
            detail="Chưa thể tạo hợp đồng"
            color="text-orange-400"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass rounded-2xl border border-white/[0.06] p-6 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-white">Doanh thu đã thu 6 tháng</h2>
              <p className="mt-1 text-xs text-text-muted">
                Chỉ tính các hóa đơn đã thanh toán
              </p>
            </div>
            <span className="text-xs font-semibold text-success">
              {formatVND(
                revenueData.reduce((sum, month) => sum + month.value, 0)
              )}
            </span>
          </div>
          <div className="mt-7 flex h-52 items-end gap-3">
            {revenueData.map((month) => {
              const height = Math.max(4, (month.value / maxRevenue) * 170);
              return (
                <div key={month.key} className="group flex flex-1 flex-col items-center gap-2">
                  <span className="text-[9px] text-text-muted opacity-0 transition group-hover:opacity-100">
                    {formatVNDShort(month.value)}
                  </span>
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-accent/45 to-purple/70 transition group-hover:from-accent group-hover:to-purple"
                    style={{ height }}
                  />
                  <span className="text-[10px] font-medium text-text-muted">
                    {month.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass rounded-2xl border border-white/[0.06] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Hoạt động gần đây</h2>
            <Link href="/dashboard/invoices" className="text-[10px] text-accent">
              Xem hóa đơn
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <activity.icon
                  size={15}
                  className={`mt-0.5 shrink-0 ${activity.color}`}
                />
                <div className="min-w-0">
                  <p className="text-xs leading-relaxed text-text-secondary">
                    {activity.text}
                  </p>
                  <p className="mt-1 text-[9px] text-text-muted">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
            {!recentActivities.length && (
              <p className="py-8 text-center text-xs text-text-muted">
                Chưa có hoạt động mới.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickAction
          href="/dashboard/invoices"
          icon={FileText}
          label="Tạo hóa đơn"
          detail="Thủ công hoặc hàng loạt"
          color="bg-purple/10 text-purple"
        />
        <QuickAction
          href="/dashboard/zalo"
          icon={MessageCircle}
          label="Zalo Bot"
          detail="Kiểm tra ảnh và liên kết"
          color="bg-accent/10 text-accent"
        />
        <QuickAction
          href="/dashboard/tenants"
          icon={Users}
          label="Người thuê"
          detail={`${tenantsResult.count ?? 0} hồ sơ đang quản lý`}
          color="bg-teal/10 text-teal"
        />
        <QuickAction
          href="/dashboard/buildings"
          icon={Building2}
          label="Nhà & phòng"
          detail="Thêm và cập nhật phòng"
          color="bg-success/10 text-success"
        />
      </div>

      <section className="glass rounded-2xl border border-white/[0.06] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold text-white">Tình trạng phòng</h2>
            <p className="mt-1 text-xs text-text-muted">
              <span className="text-accent">●</span> Đang thuê ({occupiedRooms}){" "}
              · <span className="text-success">●</span> Trống ({vacantRooms}) ·{" "}
              <span className="text-warning">●</span> Bảo trì ({maintenanceRooms})
            </p>
          </div>
          <Link
            href="/dashboard/buildings"
            className="flex items-center gap-1 text-xs font-medium text-accent"
          >
            Quản lý phòng <ArrowRight size={13} />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-8">
          {rooms.map((room) => {
            const contract = activeContractByRoom.get(room.id);
            const tenant = contract
              ? Array.isArray(contract.tenants)
                ? contract.tenants[0]
                : contract.tenants
              : null;
            const building = Array.isArray(room.buildings)
              ? room.buildings[0]
              : room.buildings;
            const status = room.status === "maintenance"
              ? "maintenance"
              : contract
                ? "occupied"
                : "vacant";
            const colors =
              status === "occupied"
                ? "border-accent/20 bg-accent/[0.06] text-accent"
                : status === "maintenance"
                  ? "border-warning/20 bg-warning/[0.06] text-warning"
                  : "border-success/20 bg-success/[0.06] text-success";
            return (
              <Link
                key={room.id}
                href="/dashboard/buildings"
                className={`rounded-xl border p-3 text-center transition hover:-translate-y-0.5 ${colors}`}
              >
                <p className="text-sm font-bold">{room.room_number}</p>
                <p className="mt-1 truncate text-[9px] text-text-muted">
                  {building?.name ?? "—"}
                </p>
                <p className="mt-1 truncate text-[10px] text-text-secondary">
                  {status === "maintenance"
                    ? "Bảo trì"
                    : tenant?.full_name ?? "Trống"}
                </p>
                <p className="mt-1 text-[9px] text-text-muted">
                  {formatVNDShort(Number(room.monthly_rent))}
                </p>
              </Link>
            );
          })}
          {!rooms.length && (
            <p className="col-span-full py-10 text-center text-xs text-text-muted">
              Chưa có phòng. Hãy thêm nhà và phòng để bắt đầu.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function AlertCard({
  href,
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  href: string;
  icon: typeof AlertCircle;
  label: string;
  value: number;
  detail: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="glass flex items-center gap-4 rounded-2xl border border-white/[0.06] p-4 transition hover:border-white/[0.12]"
    >
      <Icon size={19} className={color} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        <p className="mt-1 text-[10px] text-text-muted">{detail}</p>
      </div>
      <span className={`text-xl font-bold ${color}`}>{value}</span>
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  detail,
  color,
}: {
  href: string;
  icon: typeof Zap;
  label: string;
  detail: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl border border-white/[0.06] p-4 transition hover:border-white/[0.12] ${color}`}
    >
      <Icon size={20} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-[9px] opacity-65">{detail}</p>
      </div>
    </Link>
  );
}

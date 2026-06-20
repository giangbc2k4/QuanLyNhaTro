import ServicesClient, {
  type ServiceView,
} from "@/components/services/ServicesClient";
import { createClient } from "@/lib/supabase/server";

interface ServiceRow {
  id: string;
  name: string;
  unit: string;
  price: number;
  billing_type: "metered" | "fixed" | "per_person" | "free";
  description: string | null;
  is_active: boolean;
  is_default: boolean;
}

interface RoomServiceRow {
  service_id: string;
}

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (!userId) return null;

  const [servicesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id, name, unit, price, billing_type, description, is_active, is_default"
      )
      .eq("account_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("room_services")
      .select("service_id")
      .eq("account_id", userId),
  ]);

  const error = servicesResult.error ?? assignmentsResult.error;

  if (error) {
    return (
      <div className="glass rounded-2xl border border-red-500/20 p-6">
        <h2 className="font-semibold text-white">Không thể tải dịch vụ</h2>
        <p className="mt-2 text-xs text-red-400">{error.message}</p>
        <p className="mt-3 text-xs text-text-muted">
          Hãy chạy migration 0004_services_and_room_services.sql trong Supabase.
        </p>
      </div>
    );
  }

  const usageCount = new Map<string, number>();
  for (const row of (assignmentsResult.data ?? []) as RoomServiceRow[]) {
    usageCount.set(row.service_id, (usageCount.get(row.service_id) ?? 0) + 1);
  }

  const services = ((servicesResult.data ?? []) as ServiceRow[]).map<ServiceView>(
    (service) => ({
      id: service.id,
      name: service.name,
      unit: service.unit,
      price: service.price,
      billingType: service.billing_type,
      description: service.description,
      isActive: service.is_active,
      isDefault: service.is_default,
      roomCount: usageCount.get(service.id) ?? 0,
    })
  );

  return <ServicesClient services={services} />;
}

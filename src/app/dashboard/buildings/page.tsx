import BuildingsClient, {
  type BuildingView,
  type RoomView,
} from "@/components/buildings/BuildingsClient";
import { createClient } from "@/lib/supabase/server";

interface BuildingRow {
  id: string;
  name: string;
  address: string;
  description: string | null;
}

interface RoomRow {
  id: string;
  building_id: string;
  room_number: string;
  monthly_rent: number;
  status: "vacant" | "occupied" | "maintenance";
  floor_number: number | null;
  area_m2: number | null;
  description: string | null;
}

interface ContractRow {
  room_id: string;
  tenants:
    | {
        full_name: string;
      }
    | {
        full_name: string;
      }[]
    | null;
}

interface ServiceRow {
  id: string;
  name: string;
  unit: string;
  price: number;
  billing_type: "metered" | "fixed" | "free";
  is_active: boolean;
}

interface RoomServiceRow {
  room_id: string;
  service_id: string;
}

export default async function BuildingsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (!userId) return null;

  const [
    buildingsResult,
    roomsResult,
    contractsResult,
    servicesResult,
    roomServicesResult,
  ] = await Promise.all([
    supabase
      .from("buildings")
      .select("id, name, address, description")
      .eq("account_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("rooms")
      .select("id, building_id, room_number, monthly_rent, status, floor_number, area_m2, description")
      .eq("account_id", userId)
      .order("floor_number", { ascending: true, nullsFirst: false })
      .order("room_number", { ascending: true }),
    supabase
      .from("contracts")
      .select("room_id, tenants!contracts_main_tenant_id_fkey(full_name)")
      .eq("account_id", userId)
      .in("status", ["active", "expiring"]),
    supabase
      .from("services")
      .select("id, name, unit, price, billing_type, is_active")
      .eq("account_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("room_services")
      .select("room_id, service_id")
      .eq("account_id", userId),
  ]);

  const queryError =
    buildingsResult.error ??
    roomsResult.error ??
    contractsResult.error ??
    servicesResult.error ??
    roomServicesResult.error;

  if (queryError) {
    return (
      <div className="glass rounded-2xl border border-red-500/20 p-6">
        <h2 className="text-base font-semibold text-white">
          Không thể tải dữ liệu nhà và phòng
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-red-400">
          {queryError.message}
        </p>
        <p className="mt-3 text-xs text-text-muted">
          Hãy kiểm tra đã chạy migration, bật Data API và đăng nhập đúng tài khoản.
        </p>
      </div>
    );
  }

  const tenantByRoom = new Map<string, string>();
  const serviceIdsByRoom = new Map<string, string[]>();

  for (const assignment of (roomServicesResult.data ?? []) as RoomServiceRow[]) {
    const current = serviceIdsByRoom.get(assignment.room_id) ?? [];
    current.push(assignment.service_id);
    serviceIdsByRoom.set(assignment.room_id, current);
  }

  for (const contract of (contractsResult.data ?? []) as ContractRow[]) {
    const tenant = Array.isArray(contract.tenants)
      ? contract.tenants[0]
      : contract.tenants;

    if (tenant?.full_name) {
      tenantByRoom.set(contract.room_id, tenant.full_name);
    }
  }

  const rooms = ((roomsResult.data ?? []) as RoomRow[]).map<RoomView>((room) => ({
    id: room.id,
    buildingId: room.building_id,
    number: room.room_number,
    price: room.monthly_rent,
    status: room.status === "maintenance" ? "maintenance" : "vacant",
    tenant: tenantByRoom.get(room.id) ?? null,
    floor: room.floor_number,
    area: room.area_m2,
    description: room.description,
    serviceIds: serviceIdsByRoom.get(room.id) ?? [],
  }));

  const buildings = ((buildingsResult.data ?? []) as BuildingRow[]).map<BuildingView>(
    (building) => {
      const buildingRooms = rooms.filter(
        (room) => room.buildingId === building.id
      );

      return {
        id: building.id,
        name: building.name,
        address: building.address,
        description: building.description,
        totalRooms: buildingRooms.length,
        occupied: buildingRooms.filter((room) => room.tenant).length,
        vacant: buildingRooms.filter(
          (room) => room.status === "vacant" && !room.tenant
        ).length,
        maintenance: buildingRooms.filter(
          (room) => room.status === "maintenance" && !room.tenant
        ).length,
      };
    }
  );

  const services = ((servicesResult.data ?? []) as ServiceRow[]).map(
    (service) => ({
      id: service.id,
      name: service.name,
      unit: service.unit,
      price: service.price,
      billingType: service.billing_type,
      isActive: service.is_active,
    })
  );

  return (
    <BuildingsClient buildings={buildings} rooms={rooms} services={services} />
  );
}

import ContractsClient, {
  type ContractView,
  type OwnerContractInfo,
  type RoomOption,
  type TenantOption,
} from "@/components/contracts/ContractsClient";
import DashboardDataError from "@/components/dashboard/DashboardDataError";
import { createClient } from "@/lib/supabase/server";

export default async function ContractsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const [
    contractsResult,
    roomsResult,
    tenantsResult,
    ownerResult,
    accountResult,
    identitiesResult,
    roomMeterReadingsResult,
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select(`
        id, contract_code, room_id, main_tenant_id, start_date, end_date,
        monthly_rent, deposit_amount, status, note, created_at,
        rooms!contracts_room_id_fkey(room_number, buildings!rooms_building_id_fkey(name, address)),
        tenants!contracts_main_tenant_id_fkey(full_name, phone, date_of_birth, permanent_address),
        contract_members(id, tenant_id, full_name, phone, relationship),
        contract_services(id, service_name, unit, price, billing_type)
      `)
      .eq("account_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("rooms")
      .select(`
        id, room_number, monthly_rent, status,
        buildings!rooms_building_id_fkey(name, address),
        room_services(
          service_id,
          services!inner(name, unit, billing_type)
        )
      `)
      .eq("account_id", userId)
      .order("room_number"),
    supabase
      .from("tenants")
      .select("id, full_name, phone, date_of_birth, permanent_address")
      .eq("account_id", userId)
      .order("full_name"),
    supabase
      .from("owner_profiles")
      .select("id, full_name, date_of_birth, permanent_address")
      .eq("account_id", userId)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("phone")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("identity_documents")
      .select("owner_type, owner_profile_id, tenant_id, document_number, issued_at, issued_by")
      .eq("account_id", userId),
    supabase
      .from("room_meter_readings")
      .select("room_id, service_id, reading_value, recorded_at")
      .eq("account_id", userId)
      .order("recorded_at", { ascending: false }),
  ]);

  const error =
    contractsResult.error ??
    roomsResult.error ??
    tenantsResult.error ??
    ownerResult.error ??
    accountResult.error ??
    identitiesResult.error ??
    roomMeterReadingsResult.error;
  if (error) {
    return (
      <DashboardDataError
        title="Không thể tải hợp đồng"
        message={error.message}
      />
    );
  }

  const rawContracts = contractsResult.data ?? [];
  const identities = identitiesResult.data ?? [];
  const tenantIdentityById = new Map(
    identities
      .filter((identity) => identity.owner_type === "tenant" && identity.tenant_id)
      .map((identity) => [identity.tenant_id as string, identity])
  );
  const tenantById = new Map(
    (tenantsResult.data ?? []).map((tenant) => [tenant.id, tenant])
  );
  const ownerIdentity = identities.find(
    (identity) => identity.owner_type === "owner"
  );
  const owner: OwnerContractInfo = {
    fullName: ownerResult.data?.full_name ?? "",
    dateOfBirth: ownerResult.data?.date_of_birth ?? null,
    permanentAddress: ownerResult.data?.permanent_address ?? "",
    phone:
      accountResult.data?.phone ??
      (typeof authData.user?.user_metadata?.phone === "string"
        ? authData.user.user_metadata.phone
        : ""),
    documentNumber: ownerIdentity?.document_number ?? "",
    issuedAt: ownerIdentity?.issued_at ?? null,
    issuedBy: ownerIdentity?.issued_by ?? "",
  };
  const occupiedRoomIds = new Set(
    rawContracts
      .filter((contract) =>
        ["active", "expiring"].includes(contract.status)
      )
      .map((contract) => contract.room_id)
  );
  const latestReadingByRoomService = new Map<string, number>();
  for (const reading of roomMeterReadingsResult.data ?? []) {
    const key = `${reading.room_id}:${reading.service_id}`;
    if (!latestReadingByRoomService.has(key)) {
      latestReadingByRoomService.set(key, Number(reading.reading_value));
    }
  }
  const occupiedTenantIds = new Set<string>();
  for (const contract of rawContracts) {
    if (!["active", "expiring"].includes(contract.status)) continue;
    occupiedTenantIds.add(contract.main_tenant_id);
    for (const member of contract.contract_members ?? []) {
      if (member.tenant_id) occupiedTenantIds.add(member.tenant_id);
    }
  }

  const contracts = rawContracts.map((contract) => {
    const room = Array.isArray(contract.rooms)
      ? contract.rooms[0]
      : contract.rooms;
    const tenant = Array.isArray(contract.tenants)
      ? contract.tenants[0]
      : contract.tenants;
    const building = room
      ? Array.isArray(room.buildings)
        ? room.buildings[0]
        : room.buildings
      : null;
    const tenantIdentity = tenantIdentityById.get(contract.main_tenant_id);

    return {
      id: contract.id,
      code: contract.contract_code,
      roomId: contract.room_id,
      roomNumber: room?.room_number ?? "—",
      buildingName: building?.name ?? "—",
      buildingAddress: building?.address ?? "",
      tenantId: contract.main_tenant_id,
      tenantName: tenant?.full_name ?? "—",
      tenantPhone: tenant?.phone ?? "",
      tenantDateOfBirth: tenant?.date_of_birth ?? null,
      tenantPermanentAddress: tenant?.permanent_address ?? "",
      tenantDocumentNumber: tenantIdentity?.document_number ?? "",
      tenantDocumentIssuedAt: tenantIdentity?.issued_at ?? null,
      tenantDocumentIssuedBy: tenantIdentity?.issued_by ?? "",
      startDate: contract.start_date,
      endDate: contract.end_date,
      monthlyRent: Number(contract.monthly_rent),
      deposit: Number(contract.deposit_amount),
      status: contract.status,
      note: contract.note ?? "",
      members: (contract.contract_members ?? []).map((member) => {
        const memberTenant = member.tenant_id
          ? tenantById.get(member.tenant_id)
          : null;
        const memberIdentity = member.tenant_id
          ? tenantIdentityById.get(member.tenant_id)
          : null;
        return {
          ...member,
          date_of_birth: memberTenant?.date_of_birth ?? null,
          permanent_address: memberTenant?.permanent_address ?? "",
          document_number: memberIdentity?.document_number ?? "",
        };
      }),
      services: contract.contract_services ?? [],
    } satisfies ContractView;
  });

  const rooms = (roomsResult.data ?? []).map((room) => {
    const building = Array.isArray(room.buildings)
      ? room.buildings[0]
      : room.buildings;
    return {
      id: room.id,
      number: room.room_number,
      buildingName: building?.name ?? "—",
      monthlyRent: Number(room.monthly_rent),
      maintenance: room.status === "maintenance",
      occupied: occupiedRoomIds.has(room.id),
      meterServices: (room.room_services ?? [])
        .map((roomService) => {
          const service = Array.isArray(roomService.services)
            ? roomService.services[0]
            : roomService.services;
          if (!service || service.billing_type !== "metered") return null;
          return {
            serviceId: roomService.service_id,
            name: service.name,
            unit: service.unit,
            suggestedReading:
              latestReadingByRoomService.get(
                `${room.id}:${roomService.service_id}`
              ) ?? null,
          };
        })
        .filter((service) => service !== null),
    } satisfies RoomOption;
  });

  const tenants = (tenantsResult.data ?? [])
    .filter((tenant) => !occupiedTenantIds.has(tenant.id))
    .map(
      (tenant) =>
        ({
          id: tenant.id,
          name: tenant.full_name,
          phone: tenant.phone,
        }) satisfies TenantOption
    );

  return (
    <ContractsClient
      contracts={contracts}
      rooms={rooms}
      tenants={tenants}
      owner={owner}
    />
  );
}

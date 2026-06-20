import ZaloClient, {
  type ZaloLinkView,
} from "@/components/zalo/ZaloClient";
import { createClient } from "@/lib/supabase/server";

export default async function ZaloPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const [linksResult, submissionsResult] = await Promise.all([
    supabase
      .from("zalo_room_links")
      .select(`
        id, zalo_user_id, verified_at, created_at,
        contracts!zalo_room_links_contract_id_fkey(
          contract_code, start_date, end_date, status,
          tenants!contracts_main_tenant_id_fkey(full_name, phone),
          rooms!contracts_room_id_fkey(
            room_number,
            buildings!rooms_building_id_fkey(name, address)
          )
        )
      `)
      .eq("account_id", userId)
      .order("verified_at", { ascending: false }),
    supabase
      .from("meter_reading_submissions")
      .select("zalo_user_id, status, created_at")
      .eq("account_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const error = linksResult.error ?? submissionsResult.error;
  if (error) {
    return (
      <div className="glass rounded-2xl border border-red-500/20 p-6">
        <h2 className="font-semibold text-white">
          Không thể tải dữ liệu Zalo Bot
        </h2>
        <p className="mt-2 text-xs text-red-400">{error.message}</p>
        <p className="mt-3 text-xs text-text-muted">
          Hãy chắc chắn migration 0014_zalo_meter_readings.sql đã được chạy.
        </p>
      </div>
    );
  }

  const latestSubmissionByZalo = new Map<
    string,
    { status: string; created_at: string }
  >();
  for (const submission of submissionsResult.data ?? []) {
    if (!latestSubmissionByZalo.has(submission.zalo_user_id)) {
      latestSubmissionByZalo.set(submission.zalo_user_id, submission);
    }
  }

  const links: ZaloLinkView[] = (linksResult.data ?? []).map((link) => {
    const contract = Array.isArray(link.contracts)
      ? link.contracts[0]
      : link.contracts;
    const tenant = contract
      ? Array.isArray(contract.tenants)
        ? contract.tenants[0]
        : contract.tenants
      : null;
    const room = contract
      ? Array.isArray(contract.rooms)
        ? contract.rooms[0]
        : contract.rooms
      : null;
    const building = room
      ? Array.isArray(room.buildings)
        ? room.buildings[0]
        : room.buildings
      : null;
    const latestSubmission = latestSubmissionByZalo.get(link.zalo_user_id);

    return {
      id: link.id,
      zaloUserId: link.zalo_user_id,
      verifiedAt: link.verified_at,
      tenantName: tenant?.full_name ?? "Không xác định",
      tenantPhone: tenant?.phone ?? "",
      contractCode: contract?.contract_code ?? "—",
      contractStatus: contract?.status ?? "terminated",
      contractStart: contract?.start_date ?? null,
      contractEnd: contract?.end_date ?? null,
      roomNumber: room?.room_number ?? "—",
      buildingName: building?.name ?? "—",
      buildingAddress: building?.address ?? "",
      latestSubmissionStatus: latestSubmission?.status ?? null,
      latestSubmissionAt: latestSubmission?.created_at ?? null,
    };
  });

  return <ZaloClient links={links} botConfigured={Boolean(process.env.ZALO_BOT_TOKEN)} />;
}


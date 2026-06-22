import ZaloClient, {
  type ZaloLinkView,
  type ZaloSubmissionView,
} from "@/components/zalo/ZaloClient";
import DashboardDataError from "@/components/dashboard/DashboardDataError";
import type { MeterSubmissionStatus } from "@/lib/domain-types";
import { createClient } from "@/lib/supabase/server";

const meterSubmissionStatuses = new Set<MeterSubmissionStatus>([
  "processing",
  "awaiting_confirmation",
  "confirmed",
  "rejected",
  "failed",
]);

function meterSubmissionStatus(value: string): MeterSubmissionStatus {
  return meterSubmissionStatuses.has(value as MeterSubmissionStatus)
    ? (value as MeterSubmissionStatus)
    : "failed";
}

export default async function ZaloPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const [linksResult, submissionsResult] = await Promise.all([
    supabase
      .from("zalo_room_links")
      .select(`
        id, contract_id, zalo_user_id, verified_at, created_at,
        contracts!zalo_room_links_contract_id_fkey(
          contract_code, start_date, end_date, status,
          tenants!contracts_main_tenant_id_fkey(full_name, phone),
          contract_services(service_name, unit, billing_type),
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
      .select(`
        id, contract_id, zalo_user_id, billing_month, image_path, status, ai_provider,
        ai_model, ai_payload, error_message, confirmed_at, created_at,
        rooms!meter_reading_submissions_room_id_fkey(
          room_number,
          buildings!rooms_building_id_fkey(name)
        ),
        meter_reading_values(
          service_name, unit, current_reading, confidence
        )
      `)
      .eq("account_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const error = linksResult.error ?? submissionsResult.error;
  if (error) {
    return (
      <DashboardDataError
        title="Không thể tải dữ liệu Zalo Bot"
        message={error.message}
        hint="Hãy kiểm tra database và cấu hình Zalo Bot trên server."
      />
    );
  }

  const latestSubmissionByContract = new Map<
    string,
    { status: MeterSubmissionStatus; created_at: string }
  >();
  for (const submission of submissionsResult.data ?? []) {
    if (!latestSubmissionByContract.has(submission.contract_id)) {
      latestSubmissionByContract.set(submission.contract_id, {
        status: meterSubmissionStatus(submission.status),
        created_at: submission.created_at,
      });
    }
  }

  const signedImageEntries = await Promise.all(
    (submissionsResult.data ?? [])
      .filter(
        (submission): submission is typeof submission & { image_path: string } =>
          Boolean(submission.image_path)
      )
      .map(async (submission) => {
        const { data } = await supabase.storage
          .from("meter-readings")
          .createSignedUrl(submission.image_path, 60 * 15);
        return [submission.id, data?.signedUrl ?? null] as const;
      })
  );
  const signedImageBySubmission = new Map(signedImageEntries);

  const submissionsByContract = new Map<string, ZaloSubmissionView[]>();
  for (const submission of submissionsResult.data ?? []) {
    const room = Array.isArray(submission.rooms)
      ? submission.rooms[0]
      : submission.rooms;
    const building = room
      ? Array.isArray(room.buildings)
        ? room.buildings[0]
        : room.buildings
      : null;
    const payload =
      submission.ai_payload &&
      typeof submission.ai_payload === "object" &&
      !Array.isArray(submission.ai_payload)
        ? (submission.ai_payload as Record<string, unknown>)
        : {};
    const ocr =
      payload.ocr && typeof payload.ocr === "object" && !Array.isArray(payload.ocr)
        ? (payload.ocr as Record<string, unknown>)
        : {};
    const rawReadings = Array.isArray(ocr.readings) ? ocr.readings : [];
    const aiReadings = rawReadings.flatMap((reading) => {
      if (!reading || typeof reading !== "object" || Array.isArray(reading)) {
        return [];
      }
      const value = reading as Record<string, unknown>;
      return typeof value.value === "number"
        ? [
            {
              type: typeof value.type === "string" ? value.type : "unknown",
              value: value.value,
              unit: typeof value.unit === "string" ? value.unit : "",
              confidence:
                typeof value.confidence === "number"
                  ? value.confidence
                  : null,
            },
          ]
        : [];
    });
    const confirmedValues = (submission.meter_reading_values ?? []).map(
      (value) => ({
        serviceName: value.service_name,
        value: Number(value.current_reading),
        unit: value.unit,
        confidence:
          value.confidence === null ? null : Number(value.confidence),
      })
    );
    const view: ZaloSubmissionView = {
      id: submission.id,
      billingMonth: submission.billing_month,
      status: meterSubmissionStatus(submission.status),
      imageUrl: signedImageBySubmission.get(submission.id) ?? null,
      roomNumber: room?.room_number ?? "—",
      buildingName: building?.name ?? "—",
      aiProvider: submission.ai_provider,
      aiModel: submission.ai_model,
      aiReadings,
      confirmedValues,
      errorMessage: submission.error_message,
      confirmedAt: submission.confirmed_at,
      createdAt: submission.created_at,
    };
    const history = submissionsByContract.get(submission.contract_id) ?? [];
    history.push(view);
    submissionsByContract.set(submission.contract_id, history);
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
    const latestSubmission = latestSubmissionByContract.get(link.contract_id);
    const contractServices = contract?.contract_services ?? [];
    const meterKinds = [
      ...new Set(
        contractServices.flatMap((service) => {
          if (service.billing_type !== "metered") return [];
          const normalizedService = `${service.service_name} ${service.unit}`
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[đĐ]/g, "d")
            .toLowerCase();
          if (
            normalizedService.includes("dien") ||
            normalizedService.includes("kwh")
          ) {
            return ["electric" as const];
          }
          if (
            normalizedService.includes("nuoc") ||
            normalizedService.includes("m3") ||
            normalizedService.includes("m³")
          ) {
            return ["water" as const];
          }
          return [];
        })
      ),
    ];

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
      meterKinds,
      submissions: submissionsByContract.get(link.contract_id) ?? [],
    };
  });

  return <ZaloClient links={links} botConfigured={Boolean(process.env.ZALO_BOT_TOKEN)} />;
}

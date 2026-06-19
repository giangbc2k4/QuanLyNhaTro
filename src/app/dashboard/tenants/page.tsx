import TenantsClient, {
  type TenantView,
} from "@/components/tenants/TenantsClient";
import { createClient } from "@/lib/supabase/server";

interface TenantRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  hometown: string | null;
  permanent_address: string | null;
  occupation: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

interface IdentityRow {
  id: string;
  tenant_id: string | null;
  document_number: string;
  issued_at: string | null;
  verification_status: "pending" | "ocr_completed" | "verified" | "rejected";
  front_image_path: string | null;
  back_image_path: string | null;
}

interface ContractRow {
  main_tenant_id: string;
  status: "draft" | "active" | "expiring" | "expired" | "terminated";
  contract_members: Array<{
    tenant_id: string | null;
  }>;
}

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (!userId) return null;

  const [tenantsResult, identitiesResult, contractsResult] = await Promise.all([
    supabase
      .from("tenants")
      .select(
        "id, full_name, phone, email, date_of_birth, gender, hometown, permanent_address, occupation, emergency_contact_name, emergency_contact_phone"
      )
      .eq("account_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("identity_documents")
      .select(
        "id, tenant_id, document_number, issued_at, verification_status, front_image_path, back_image_path"
      )
      .eq("account_id", userId)
      .eq("owner_type", "tenant"),
    supabase
      .from("contracts")
      .select("main_tenant_id, status, contract_members(tenant_id)")
      .eq("account_id", userId)
      .in("status", ["draft", "active", "expiring"]),
  ]);

  const error =
    tenantsResult.error ?? identitiesResult.error ?? contractsResult.error;

  if (error) {
    return (
      <div className="glass rounded-2xl border border-red-500/20 p-6">
        <h2 className="font-semibold text-white">Không thể tải người thuê</h2>
        <p className="mt-2 text-xs text-red-400">{error.message}</p>
      </div>
    );
  }

  const identityByTenant = new Map(
    ((identitiesResult.data ?? []) as IdentityRow[])
      .filter((identity) => identity.tenant_id)
      .map((identity) => [identity.tenant_id as string, identity])
  );
  const contractTenantIds = new Set<string>();
  for (const contract of (contractsResult.data ?? []) as ContractRow[]) {
    contractTenantIds.add(contract.main_tenant_id);
    for (const member of contract.contract_members ?? []) {
      if (member.tenant_id) contractTenantIds.add(member.tenant_id);
    }
  }

  const identities = (identitiesResult.data ?? []) as IdentityRow[];
  const signedUrlEntries = await Promise.all(
    identities.flatMap((identity) =>
      [
        ["front", identity.front_image_path],
        ["back", identity.back_image_path],
      ]
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(async ([side, path]) => {
          const { data } = await supabase.storage
            .from("identity-documents")
            .createSignedUrl(path, 60 * 15);
          return [`${identity.id}:${side}`, data?.signedUrl ?? null] as const;
        })
    )
  );
  const signedUrls = new Map(signedUrlEntries);

  const tenants = ((tenantsResult.data ?? []) as TenantRow[]).map<TenantView>(
    (tenant) => {
      const identity = identityByTenant.get(tenant.id);
      return {
        id: tenant.id,
        identityDocumentId: identity?.id ?? null,
        fullName: tenant.full_name,
        phone: tenant.phone,
        email: tenant.email,
        dateOfBirth: tenant.date_of_birth,
        gender: tenant.gender,
        hometown: tenant.hometown,
        permanentAddress: tenant.permanent_address,
        occupation: tenant.occupation,
        emergencyContactName: tenant.emergency_contact_name,
        emergencyContactPhone: tenant.emergency_contact_phone,
        documentNumber: identity?.document_number ?? "",
        issuedAt: identity?.issued_at ?? null,
        verificationStatus: identity?.verification_status ?? "pending",
        hasIdentityImages: Boolean(
          identity?.front_image_path && identity?.back_image_path
        ),
        frontImageUrl: identity
          ? signedUrls.get(`${identity.id}:front`) ?? null
          : null,
        backImageUrl: identity
          ? signedUrls.get(`${identity.id}:back`) ?? null
          : null,
        hasContract: contractTenantIds.has(tenant.id),
      };
    }
  );

  return <TenantsClient tenants={tenants} />;
}

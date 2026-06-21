function normalizeBankName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export interface VietQrBank {
  bin: string;
  code: string;
  name: string;
  shortName: string;
}

export async function getVietQrBanks(): Promise<VietQrBank[]> {
  try {
    const response = await fetch("https://api.vietqr.io/v2/banks", {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return [];

    const body = (await response.json()) as {
      data?: Array<{
        bin?: string;
        code?: string;
        name?: string;
        shortName?: string;
        short_name?: string;
      }>;
    };

    return (body.data ?? [])
      .flatMap((bank) => {
        const bin = bank.bin?.trim();
        const code = bank.code?.trim();
        const name = bank.name?.trim();
        const shortName = (bank.shortName || bank.short_name)?.trim();
        return bin && code && name && shortName
          ? [{ bin, code, name, shortName }]
          : [];
      })
      .sort((a, b) => a.shortName.localeCompare(b.shortName, "vi"));
  } catch {
    return [];
  }
}

export async function resolveVietQrBankId(bankName: string) {
  const banks = await getVietQrBanks();
  const expected = normalizeBankName(bankName);
  const bank =
    banks.find((item) =>
      [item.bin, item.code, item.shortName, item.name]
        .filter(Boolean)
        .some((value) => normalizeBankName(String(value)) === expected)
    ) ??
    banks.find((item) =>
      [item.code, item.shortName, item.name]
        .filter(Boolean)
        .some((value) => {
          const normalized = normalizeBankName(String(value));
          return normalized.includes(expected) || expected.includes(normalized);
        })
    );

  return bank?.bin || bankName.trim();
}

export function invoiceTransferContent(invoiceCode: string) {
  return `NT ${invoiceCode}`.replace(/[^a-zA-Z0-9 ]/g, "").trim();
}

export function vietQrImageUrl(input: {
  bankId: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
}) {
  const params = new URLSearchParams({
    amount: String(input.amount),
    addInfo: input.description,
    accountName: input.accountName,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(input.bankId)}-${encodeURIComponent(input.accountNumber)}-compact2.png?${params.toString()}`;
}

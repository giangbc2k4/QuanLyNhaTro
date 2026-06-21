/**
 * Các kiểu nghiệp vụ dùng chung giữa Server Components, Client Components
 * và Server Actions. Giá trị phải luôn đồng bộ với enum trong PostgreSQL.
 */

export type RoomOperationalStatus = "vacant" | "maintenance";

export type ServiceBillingType =
  | "metered"
  | "fixed"
  | "per_person"
  | "free";

export type ContractStatus =
  | "draft"
  | "active"
  | "expiring"
  | "expired"
  | "terminated";

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";

export type InvoiceItemType = "rent" | "service" | "additional";

export type IdentityVerificationStatus =
  | "pending"
  | "ocr_completed"
  | "verified"
  | "rejected";

export type MeterSubmissionStatus =
  | "processing"
  | "awaiting_confirmation"
  | "confirmed"
  | "rejected"
  | "failed";

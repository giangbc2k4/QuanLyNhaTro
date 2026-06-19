"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  DoorOpen,
  Edit2,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  deleteBuildingAction,
  deleteRoomAction,
  saveBuildingAction,
  saveRoomAction,
  type ActionResult,
  type BuildingInput,
  type RoomInput,
} from "@/app/dashboard/buildings/actions";
import { formatVND } from "@/lib/design-system";

export interface BuildingView {
  id: string;
  name: string;
  address: string;
  description: string | null;
  totalRooms: number;
  occupied: number;
  vacant: number;
  maintenance: number;
}

export interface RoomView {
  id: string;
  buildingId: string;
  number: string;
  price: number;
  status: "vacant" | "maintenance";
  tenant: string | null;
  floor: number | null;
  area: number | null;
  description: string | null;
  serviceIds: string[];
}

export interface ServiceOption {
  id: string;
  name: string;
  unit: string;
  price: number;
  billingType: "metered" | "fixed" | "free";
  isActive: boolean;
}

interface BuildingsClientProps {
  buildings: BuildingView[];
  rooms: RoomView[];
  services: ServiceOption[];
}

type Editor =
  | { kind: "building"; building?: BuildingView }
  | { kind: "room"; room?: RoomView; buildingId: string }
  | null;

type DeleteTarget =
  | { kind: "building"; id: string; label: string; roomCount: number }
  | { kind: "room"; id: string; label: string }
  | null;

interface ToastState {
  success: boolean;
  message: string;
}

function formatMoneyInput(value: string | number) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
}

function parseMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export default function BuildingsClient({
  buildings,
  rooms,
  services,
}: BuildingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    buildings[0]?.id ?? ""
  );
  const [searchRoom, setSearchRoom] = useState("");
  const [editor, setEditor] = useState<Editor>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const selectedBuilding =
    buildings.find((building) => building.id === selectedBuildingId) ??
    buildings[0] ??
    null;

  const selectedRooms = selectedBuilding
    ? rooms.filter((room) => room.buildingId === selectedBuilding.id)
    : [];

  const query = searchRoom.trim().toLocaleLowerCase("vi");
  const filteredRooms = selectedRooms.filter(
    (room) =>
      room.number.toLocaleLowerCase("vi").includes(query) ||
      room.tenant?.toLocaleLowerCase("vi").includes(query)
  );
  const servicesById = new Map(
    services.map((service) => [service.id, service])
  );

  function runAction(
    action: () => Promise<ActionResult>,
    onSuccess?: () => void
  ) {
    setToast(null);
    startTransition(async () => {
      const result = await action();
      setToast(result);

      if (result.success) {
        onSuccess?.();
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;

    const action =
      deleteTarget.kind === "building"
        ? () => deleteBuildingAction(deleteTarget.id)
        : () => deleteRoomAction(deleteTarget.id);

    runAction(action, () => {
      if (
        deleteTarget.kind === "building" &&
        selectedBuildingId === deleteTarget.id
      ) {
        setSelectedBuildingId("");
      }
      setDeleteTarget(null);
    });
  }

  if (buildings.length === 0) {
    return (
      <>
        <div className="glass flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-white/[0.06] px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <Building2 size={28} className="text-accent" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-white">
            Chưa có tòa nhà
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted">
            Hãy tạo tòa nhà đầu tiên để bắt đầu quản lý phòng.
          </p>
          <button
            type="button"
            onClick={() => setEditor({ kind: "building" })}
            className="btn-primary mt-6 flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Thêm tòa nhà đầu tiên
          </button>
        </div>

        {editor?.kind === "building" && (
          <BuildingFormModal
            building={editor.building}
            pending={isPending}
            onClose={() => setEditor(null)}
            onSubmit={(input) =>
              runAction(() => saveBuildingAction(input), () => setEditor(null))
            }
          />
        )}
        <ActionToast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass overflow-hidden rounded-2xl border border-white/[0.06]">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="text-base font-semibold text-white">
              Danh sách tòa nhà
            </h3>
            <p className="mt-1 text-[10px] text-text-muted">
              {buildings.length} tòa nhà · {rooms.length} phòng từ Supabase
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditor({ kind: "building" })}
            className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs"
            id="btn-add-building"
          >
            <Plus size={14} /> Thêm tòa nhà
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Tên tòa nhà",
                  "Địa chỉ",
                  "Tổng phòng",
                  "Đang thuê",
                  "Trống",
                  "Bảo trì",
                  "Thao tác",
                ].map((heading, index) => (
                  <th
                    key={heading}
                    className={`${index >= 2 ? "text-center" : "text-left"} px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buildings.map((building) => (
                <tr
                  key={building.id}
                  onClick={() => setSelectedBuildingId(building.id)}
                  className={`cursor-pointer border-b border-border transition-colors ${
                    selectedBuilding?.id === building.id
                      ? "bg-accent/[0.06]"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                        <Building2 size={16} className="text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {building.name}
                        </p>
                        {building.description && (
                          <p className="mt-0.5 max-w-56 truncate text-[10px] text-text-muted">
                            {building.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <MapPin size={12} /> {building.address}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center text-sm font-semibold text-white">
                    {building.totalRooms}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
                      {building.occupied}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                      {building.vacant}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                      {building.maintenance}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditor({ kind: "building", building });
                        }}
                        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.06] hover:text-white"
                        aria-label={`Sửa ${building.name}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget({
                            kind: "building",
                            id: building.id,
                            label: building.name,
                            roomCount: building.totalRooms,
                          });
                        }}
                        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                        aria-label={`Xóa ${building.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBuilding && (
        <div className="glass rounded-2xl border border-white/[0.06] p-6">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-semibold text-white">
                Phòng — {selectedBuilding.name}
              </h3>
              <p className="mt-0.5 text-xs text-text-muted">
                <span className="text-accent">●</span> Đang thuê (
                {
                  selectedRooms.filter(
                    (room) => room.tenant
                  ).length
                }
                &nbsp; <span className="text-success">●</span> Trống (
                {
                  selectedRooms.filter(
                    (room) => room.status === "vacant" && !room.tenant
                  ).length
                }
                &nbsp; <span className="text-warning">●</span> Bảo trì (
                {
                  selectedRooms.filter(
                    (room) => room.status === "maintenance" && !room.tenant
                  ).length
                }
                )
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="search"
                  placeholder="Tìm phòng, người thuê..."
                  value={searchRoom}
                  onChange={(event) => setSearchRoom(event.target.value)}
                  className="w-48 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-text-muted focus:border-accent/40"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditor({
                    kind: "room",
                    buildingId: selectedBuilding.id,
                  })
                }
                className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs"
                id="btn-add-room"
              >
                <Plus size={14} /> Thêm phòng
              </button>
            </div>
          </div>

          {filteredRooms.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredRooms.map((room) => {
                const isOccupied = Boolean(room.tenant);
                const isMaintenance = room.status === "maintenance";
                const roomServices = room.serviceIds
                  .map((serviceId) => servicesById.get(serviceId))
                  .filter(
                    (service): service is ServiceOption => service !== undefined
                  );

                return (
                  <div
                    key={room.id}
                    className={`group relative min-h-52 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-1 ${
                      isOccupied
                        ? "border-accent/20 bg-accent/[0.06] hover:border-accent/40"
                        : isMaintenance
                          ? "border-warning/20 bg-warning/[0.06] hover:border-warning/40"
                          : "border-success/20 bg-success/[0.06] hover:border-success/40"
                    }`}
                  >
                    <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          setEditor({
                            kind: "room",
                            room,
                            buildingId: room.buildingId,
                          })
                        }
                        className="rounded-md bg-black/30 p-1 text-text-secondary hover:text-white"
                        aria-label={`Sửa phòng ${room.number}`}
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            kind: "room",
                            id: room.id,
                            label: room.number,
                          })
                        }
                        className="rounded-md bg-black/30 p-1 text-text-secondary hover:text-red-400"
                        aria-label={`Xóa phòng ${room.number}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="pr-14">
                      <p
                        className={`text-xl font-bold ${
                          isOccupied
                            ? "text-accent"
                            : isMaintenance
                              ? "text-warning"
                              : "text-success"
                        }`}
                      >
                        {room.number}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isOccupied
                              ? "bg-accent/15 text-accent"
                              : isMaintenance
                                ? "bg-warning/15 text-warning"
                                : "bg-success/15 text-success"
                          }`}
                        >
                          {isOccupied
                            ? "Đang thuê"
                            : isMaintenance
                              ? "Bảo trì"
                              : "Trống"}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {formatVND(room.price)}/tháng
                        </span>
                      </div>
                    </div>

                    {room.tenant && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent/15 bg-accent/[0.05] px-3 py-2">
                        <UserRound size={14} className="shrink-0 text-accent" />
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-wide text-text-muted">
                            Người thuê
                          </p>
                          <p className="truncate text-xs font-semibold text-white">
                            {room.tenant}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                        Dịch vụ
                      </p>
                      {roomServices.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {roomServices.map((service) => (
                            <span
                              key={service.id}
                              title={
                                service.billingType === "free"
                                  ? "Miễn phí"
                                  : `${service.price.toLocaleString("vi-VN")} VND/${service.unit}`
                              }
                              className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-[10px] text-text-secondary"
                            >
                              {service.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[10px] italic text-text-muted">
                          Chưa cấu hình dịch vụ
                        </p>
                      )}
                    </div>

                    {(room.floor !== null || room.area !== null) && (
                      <p className="mt-4 border-t border-white/[0.05] pt-3 text-[10px] text-text-muted">
                        {room.floor !== null ? `Tầng ${room.floor}` : ""}
                        {room.floor !== null && room.area !== null ? " · " : ""}
                        {room.area !== null ? `${room.area}m²` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-center">
              <DoorOpen size={24} className="text-text-muted" />
              <p className="mt-3 text-sm font-medium text-white">
                {selectedRooms.length === 0
                  ? "Tòa nhà này chưa có phòng"
                  : "Không tìm thấy phòng phù hợp"}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {selectedRooms.length === 0
                  ? "Nhấn “Thêm phòng” để bắt đầu quản lý."
                  : "Hãy thử từ khóa khác."}
              </p>
            </div>
          )}
        </div>
      )}

      {editor?.kind === "building" && (
        <BuildingFormModal
          building={editor.building}
          pending={isPending}
          onClose={() => setEditor(null)}
          onSubmit={(input) =>
            runAction(() => saveBuildingAction(input), () => setEditor(null))
          }
        />
      )}

      {editor?.kind === "room" && (
        <RoomFormModal
          buildings={buildings}
          services={services}
          room={editor.room}
          initialBuildingId={editor.buildingId}
          pending={isPending}
          onClose={() => setEditor(null)}
          onSubmit={(input) =>
            runAction(() => saveRoomAction(input), () => {
              setSelectedBuildingId(input.buildingId);
              setEditor(null);
            })
          }
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          target={deleteTarget}
          pending={isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      <ActionToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function BuildingFormModal({
  building,
  pending,
  onClose,
  onSubmit,
}: {
  building?: BuildingView;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: BuildingInput) => void;
}) {
  const [name, setName] = useState(building?.name ?? "");
  const [address, setAddress] = useState(building?.address ?? "");
  const [description, setDescription] = useState(building?.description ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ id: building?.id, name, address, description });
  }

  return (
    <ModalShell
      title={building ? "Sửa tòa nhà" : "Thêm tòa nhà"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-6">
          <FormField label="Tên tòa nhà">
            <input
              autoFocus
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="form-input"
              placeholder="Ví dụ: Nhà trọ Nguyễn Trãi"
            />
          </FormField>
          <FormField label="Địa chỉ">
            <input
              required
              minLength={5}
              maxLength={300}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="form-input"
              placeholder="Số nhà, đường, phường, quận..."
            />
          </FormField>
          <FormField label="Ghi chú">
            <textarea
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="form-input resize-none"
              placeholder="Thông tin thêm về tòa nhà"
            />
          </FormField>
        </div>
        <ModalActions pending={pending} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function RoomFormModal({
  buildings,
  services,
  room,
  initialBuildingId,
  pending,
  onClose,
  onSubmit,
}: {
  buildings: BuildingView[];
  services: ServiceOption[];
  room?: RoomView;
  initialBuildingId: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: RoomInput) => void;
}) {
  const [buildingId, setBuildingId] = useState(
    room?.buildingId ?? initialBuildingId
  );
  const [number, setNumber] = useState(room?.number ?? "");
  const [price, setPrice] = useState(
    room ? formatMoneyInput(room.price) : ""
  );
  const [status, setStatus] = useState<RoomView["status"]>(
    room?.status ?? "vacant"
  );
  const [floor, setFloor] = useState(
    room?.floor === null || room?.floor === undefined ? "" : String(room.floor)
  );
  const [area, setArea] = useState(
    room?.area === null || room?.area === undefined ? "" : String(room.area)
  );
  const [description, setDescription] = useState(room?.description ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(
    room?.serviceIds ?? []
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      id: room?.id,
      buildingId,
      number,
      price: parseMoneyInput(price),
      status,
      floor: floor === "" ? null : Number(floor),
      area: area === "" ? null : Number(area),
      description,
      serviceIds,
    });
  }

  return (
    <ModalShell title={room ? "Sửa phòng" : "Thêm phòng"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 p-6">
          <div className="col-span-2">
            <FormField label="Tòa nhà">
              <select
                required
                value={buildingId}
                onChange={(event) => setBuildingId(event.target.value)}
                className="form-input"
              >
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Số/Tên phòng">
            <input
              autoFocus
              required
              maxLength={50}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              className="form-input"
              placeholder="P101"
            />
          </FormField>
          <FormField label="Giá thuê/tháng (VND)">
            <div className="relative">
              <input
                required
                type="text"
                inputMode="numeric"
                value={price}
                onChange={(event) =>
                  setPrice(formatMoneyInput(event.target.value))
                }
                className="form-input pr-14"
                placeholder="3.000.000"
                aria-label="Giá thuê mỗi tháng bằng VND"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-text-muted">
                VND
              </span>
            </div>
          </FormField>
          <FormField label="Tầng">
            <input
              type="number"
              min={0}
              step={1}
              value={floor}
              onChange={(event) => setFloor(event.target.value)}
              className="form-input"
              placeholder="1"
            />
          </FormField>
          <FormField label="Diện tích (m²)">
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className="form-input"
              placeholder="25"
            />
          </FormField>
          <div className="col-span-2">
            <FormField label="Tình trạng vận hành">
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as RoomView["status"])
                }
                className="form-input"
              >
                <option value="vacant">Sẵn sàng cho thuê</option>
                <option value="maintenance">Bảo trì</option>
              </select>
              <span className="mt-2 block text-[10px] leading-relaxed text-text-muted">
                Trạng thái đang thuê hoặc trống được hệ thống xác định tự động
                theo hợp đồng.
              </span>
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Dịch vụ áp dụng">
              {services.filter(
                (service) =>
                  service.isActive || serviceIds.includes(service.id)
              ).length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {services
                    .filter(
                      (service) =>
                        service.isActive || serviceIds.includes(service.id)
                    )
                    .map((service) => {
                      const checked = serviceIds.includes(service.id);
                      return (
                        <label
                          key={service.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                            checked
                              ? "border-accent/30 bg-accent/[0.07]"
                              : "border-white/[0.06] bg-white/[0.02]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setServiceIds((current) =>
                                event.target.checked
                                  ? [...current, service.id]
                                  : current.filter((id) => id !== service.id)
                              )
                            }
                            className="mt-0.5 h-4 w-4 accent-blue-500"
                          />
                          <span className="min-w-0">
                            <span className="block text-xs font-medium text-white">
                              {service.name}
                            </span>
                            <span className="mt-1 block text-[10px] text-text-muted">
                              {service.billingType === "free"
                                ? "Miễn phí"
                                : `${service.price.toLocaleString("vi-VN")} VND/${service.unit}`}
                              {!service.isActive ? " · Đã tạm tắt" : ""}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-white/[0.08] p-4 text-xs text-text-muted">
                  Chưa có dịch vụ đang hoạt động. Hãy tạo hoặc bật dịch vụ tại
                  trang Dịch vụ.
                </p>
              )}
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Ghi chú">
              <textarea
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="form-input resize-none"
                placeholder="Nội thất, tình trạng phòng..."
              />
            </FormField>
          </div>
        </div>
        <ModalActions pending={pending} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass my-auto w-full max-w-lg rounded-2xl border border-white/[0.08] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h4 className="text-base font-semibold text-white">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-white/[0.05] hover:text-white"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}

function ModalActions({
  pending,
  onClose,
}: {
  pending: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-text-secondary hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
      >
        Hủy
      </button>
      <button
        type="submit"
        disabled={pending}
        className="btn-primary flex min-w-24 items-center justify-center gap-2 rounded-xl px-5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
    </div>
  );
}

function ConfirmDeleteModal({
  target,
  pending,
  onClose,
  onConfirm,
}: {
  target: Exclude<DeleteTarget, null>;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isBuilding = target.kind === "building";

  return (
    <ModalShell title={isBuilding ? "Xóa tòa nhà" : "Xóa phòng"} onClose={onClose}>
      <div className="p-6">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <Trash2 size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              Bạn chắc chắn muốn xóa “{target.label}”?
            </p>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              {isBuilding
                ? `Tòa nhà có ${target.roomCount} phòng. Các phòng không vướng hợp đồng cũng sẽ bị xóa.`
                : "Phòng đang gắn với hợp đồng sẽ không thể xóa."}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-text-secondary hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="flex min-w-24 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-2 text-xs font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          {pending ? "Đang xóa..." : "Xóa"}
        </button>
      </div>
    </ModalShell>
  );
}

function ActionToast({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  if (!toast) return null;

  return (
    <div className="fixed right-5 top-5 z-[1100] w-[min(360px,calc(100vw-40px))]">
      <div
        className={`glass flex items-start gap-3 rounded-2xl border p-4 shadow-2xl ${
          toast.success
            ? "border-success/25 bg-success/[0.08]"
            : "border-red-500/25 bg-red-500/[0.08]"
        }`}
      >
        {toast.success ? (
          <CheckCircle2 size={19} className="mt-0.5 text-success" />
        ) : (
          <AlertCircle size={19} className="mt-0.5 text-red-400" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {toast.success ? "Thành công" : "Không thành công"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-white"
          aria-label="Đóng thông báo"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

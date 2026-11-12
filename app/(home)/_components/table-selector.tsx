"use client";

import { Button } from "@/components/ui/button";
import { useTables } from "@/hooks/useTables";
import { useTableStore, TableItem } from "@/store/table";
import { useOrderStore } from "@/store/order";
import { Clock3, LayoutDashboard, ShoppingBag, UtensilsCrossed } from "lucide-react";
import ConfirmSignOutButton from "@/components/confirm-sign-out-button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const DEFAULT_TABLES: TableItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: `default-${i + 1}`,
  table_number: i + 1,
  capacity: i < 4 ? 2 : i < 14 ? 4 : 6,
  status: "available" as const,
}));

interface TableSelectorProps {
  posUser: { name: string; role: string };
  onSignOut: () => void;
  onTableSelected: () => void;
}

const STATUS_CONFIG = {
  available: {
    label: "Trống",
    className: "border-emerald-200 bg-emerald-50/60 hover:border-emerald-400 hover:bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
  },
  draft: {
    label: "Đang chọn",
    className: "border-amber-200 bg-amber-50/60 hover:border-amber-400 hover:bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
  },
  occupied: {
    label: "Đã lên đơn",
    className: "border-rose-200 bg-rose-50/60 hover:border-rose-400 hover:bg-rose-50",
    badge: "bg-rose-100 text-rose-700",
  },
  reserved: {
    label: "Đặt trước",
    className: "border-sky-200 bg-sky-50/60 hover:border-sky-400 hover:bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
  },
};

const DASHBOARD_ROLES = ["Admin", "Owner"];

const formatOrderTime = (value?: string) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const TableSelector = ({
  posUser,
  onSignOut,
  onTableSelected,
}: TableSelectorProps) => {
  const { data: dbTables, isLoading } = useTables();
  const { selectTable, clearTable } = useTableStore();
  const { ordersByTable, setActiveTable } = useOrderStore();
  const router = useRouter();
  const canAccessDashboard = DASHBOARD_ROLES.includes(posUser.role);
  const tables = dbTables && dbTables.length > 0 ? dbTables : DEFAULT_TABLES;

  const handleSelectTable = (table: TableItem) => {
    selectTable(table);
    setActiveTable(`table-${table.table_number}`);
    router.push(`/?table=${table.table_number}`);
    onTableSelected();
  };

  const handleNoTable = () => {
    const takeawayKey = `takeaway-${Date.now()}`;
    clearTable();
    setActiveTable(takeawayKey);
    router.push(`/?takeaway=${takeawayKey}`);
    onTableSelected();
  };

  if (isLoading) {
    return (
      <div className="col-span-full flex h-full items-center justify-center">
        <p className="text-sm text-gray-400 animate-pulse">Đang tải danh sách bàn...</p>
      </div>
    );
  }

  return (
    <div className="col-span-full flex h-full flex-col gap-4 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">POS</p>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Chọn bàn</h1>
        </div>
        <div className="flex items-center gap-1">
          <div
            title={`${posUser.name} · ${posUser.role}`}
            className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-2 shadow-sm ring-1 ring-slate-200"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {posUser.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-24 truncate text-xs font-semibold text-slate-700 sm:block">
              {posUser.name}
            </span>
          </div>
          {canAccessDashboard && (
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-blue-600" asChild>
              <Link href="/dashboard" title="Bảng điều khiển">
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <ConfirmSignOutButton onConfirm={onSignOut} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white px-3 py-2.5 text-xs ring-1 ring-slate-200">
        <span className="font-semibold text-slate-500">Trạng thái</span>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <span key={key} className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium", config.badge)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {config.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 content-start gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        <button
          type="button"
          onClick={handleNoTable}
          className="group flex min-h-[132px] flex-col items-center justify-center rounded-2xl border-2 border-violet-200 bg-violet-50 p-3 text-violet-950 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:bg-violet-100"
        >
          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold">Mang về</span>
          <span className="mt-1 text-[11px] text-violet-700">Không dùng bàn</span>
        </button>

        {tables.map((table) => {
          const tableOrder = ordersByTable[`table-${table.table_number}`];
          const itemCount = tableOrder?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
          const effectiveStatus = itemCount > 0
            ? tableOrder?.isOrdered ? "occupied" : "draft"
            : table.status;
          const config = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.available;

          return (
            <button
              type="button"
              key={table.id}
              onClick={() => handleSelectTable(table)}
              className={cn(
                "group flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 p-3 shadow-sm transition-all hover:-translate-y-0.5",
                config.className,
              )}
            >
              <span className="text-base font-bold text-slate-800">Bàn {table.table_number}</span>
              <span className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold", config.badge)}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {config.label}
              </span>
              {itemCount > 0 && <span className="mt-2 text-[11px] font-semibold text-slate-600">{itemCount} món</span>}
              {tableOrder?.isOrdered && tableOrder.orderedAt && (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                  <Clock3 className="h-3 w-3" />
                  {formatOrderTime(tableOrder.orderedAt)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-center gap-1 border-t border-slate-200 pt-3 text-xs text-slate-400">
        <UtensilsCrossed className="h-3.5 w-3.5" />
        Chạm vào bàn để bắt đầu gọi món
      </div>
    </div>
  );
};

export default TableSelector;

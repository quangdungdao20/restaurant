"use client";

import { useState } from "react";
import {
  useTables,
  useCreateTable,
  useUpdateTableStatus,
  useDeleteTable,
} from "@/hooks/useTables";
import { useProfile } from "@/hooks/useProfile";
import { useOrderStore } from "@/store/order";
import { TableItem } from "@/store/table";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  available: { label: "Trống", className: "bg-green-100 text-green-700" },
  occupied: { label: "Có khách", className: "bg-red-100 text-red-700" },
  reserved: { label: "Đặt trước", className: "bg-yellow-100 text-yellow-700" },
};

const TablesManager = () => {
  const { data: tables, isLoading } = useTables();
  const { data: profile } = useProfile();
  const { ordersByTable } = useOrderStore();
  const createTable = useCreateTable();
  const updateStatus = useUpdateTableStatus();
  const deleteTable = useDeleteTable();

  const [tableNumber, setTableNumber] = useState("");

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(tableNumber, 10);
    if (!num || num <= 0 || !profile?.business_id) return;

    createTable.mutate(
      {
        business_id: profile.business_id,
        table_number: num,
        capacity: 4,
      },
      {
        onSuccess: () => {
          setTableNumber("");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý bàn"
        description="Theo dõi trạng thái, thêm mới và điều chỉnh danh sách bàn"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thêm bàn mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTable} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Số bàn</label>
              <Input
                type="number"
                min={1}
                placeholder="VD: 21"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-32"
              />
            </div>
            <Button
              type="submit"
              disabled={createTable.isPending || !tableNumber}
              className="gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {createTable.isPending ? "Đang thêm..." : "Thêm bàn"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-sm text-gray-500 py-8 text-center">
          Đang tải danh sách bàn...
        </div>
      ) : !tables || tables.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            Chưa có bàn nào trong cơ sở dữ liệu. Hệ thống POS đang dùng 20 bàn mặc định (Bàn 1 - Bàn 20). Bạn có thể thêm bàn mới ở trên sau khi chạy migration bảng <code>tables</code>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((table: TableItem) => {
            const tableOrder = ordersByTable[`table-${table.table_number}`];
            const itemCount =
              tableOrder?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
            const effectiveStatus = itemCount > 0 ? "occupied" : table.status;
            const badge = STATUS_LABELS[effectiveStatus] ?? STATUS_LABELS.available;

            return (
              <Card key={table.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">
                      Bàn {table.table_number}
                    </span>
                    <Badge className={cn("font-medium", badge.className)}>
                      {badge.label}
                    </Badge>
                  </div>
                  {itemCount > 0 && (
                    <div className="text-xs font-semibold text-red-600">
                      {itemCount} món đang phục vụ
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Select
                      value={table.status}
                      onValueChange={(val) =>
                        updateStatus.mutate({
                          id: table.id,
                          status: val as "available" | "occupied" | "reserved",
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs flex-1 cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Trống</SelectItem>
                        <SelectItem value="occupied">Có khách</SelectItem>
                        <SelectItem value="reserved">Đặt trước</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 cursor-pointer"
                      onClick={() => deleteTable.mutate(table.id)}
                      title="Xóa bàn"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TablesManager;


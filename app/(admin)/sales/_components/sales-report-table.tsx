"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileDown,
  FileText,
  TrendingUp,
  ShoppingBag,
  DollarSign,
} from "lucide-react";
import { useSalesReport, SalesReportRow } from "@/hooks/useSalesReport";
import { exportToCSV, exportToPDF } from "@/lib/sales-export";
import { formatVND } from "@/lib/utils";
import DateRangeFilter, {
  DateRangeValue,
  getPresetDateRange,
} from "@/components/date-range-filter";
import { format } from "date-fns";
import DataTableFilter from "@/components/data-table-filter";
import { useActivityLogger } from "@/hooks/useActivityLogger";

const statusVariant = (status: string) => {
  if (status === "Completed") return "default";
  if (status === "Pending") return "secondary";
  return "destructive";
};

const SalesReportTable = () => {
  const [dateRange, setDateRange] = useState<DateRangeValue>(
    getPresetDateRange("this_month"),
  );

  const [filters, setFilters] = useState<{
    statuses: string[];
    paymentMethods: string[];
  }>({
    statuses: [],
    paymentMethods: [],
  });

  const { data: report, isLoading, error } = useSalesReport(dateRange);
  const { log } = useActivityLogger();

  const handleDateRangeChange = (range: DateRangeValue) => {
    setDateRange(range);
  };

  const filteredRows = useMemo(() => {
    if (!report?.rows) return [];

    return report.rows.filter((row) => {
      const inStatus =
        filters.statuses.length === 0 || filters.statuses.includes(row.status);
      const inPayment =
        filters.paymentMethods.length === 0 ||
        filters.paymentMethods.includes(row.payment_method);

      return inStatus && inPayment;
    });
  }, [report?.rows, filters]);

  const periodLabel = `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`;

  const columns: ColumnDef<SalesReportRow>[] = [
    {
      accessorKey: "transaction_number",
      header: "Mã giao dịch",
      cell: ({ row }) => (
        <span className="font-medium text-sm">
          {row.getValue("transaction_number")}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Ngày tạo",
      accessorFn: (row) => {
        if (!row.created_at) return "-";
        return new Date(row.created_at).toLocaleString("vi-VN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
      cell: ({ row }) => {
        const d = new Date(row.original.created_at as string);
        return (
          <span className="text-sm text-gray-600">
            {d.toLocaleString("vi-VN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        );
      },
    },
    {
      accessorKey: "customer_name",
      header: "Khách hàng",
      cell: ({ row }) => (
        <span className="text-sm">
          {(row.getValue("customer_name") as string) ?? "Khách vãng lai"}
        </span>
      ),
    },
    {
      id: "items",
      header: "Món",
      size: 200,
      cell: ({ row }) => {
        const items = row.original.items;
        const text =
          items.length === 0
            ? "—"
            : items.map((i) => `${i.product_name} ×${i.quantity}`).join(", ");
        return (
          <span
            className="text-sm text-gray-600 block max-w-[200px] truncate"
            title={text}
          >
            {text}
          </span>
        );
      },
    },
    {
      accessorKey: "subtotal",
      header: "Tạm tính",
      cell: ({ row }) => (
        <span className="text-sm">
          {formatVND(row.getValue("subtotal") as number)}
        </span>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Tổng tiền",
      cell: ({ row }) => (
        <span className="font-semibold text-sm">
          {formatVND(row.getValue("total_amount") as number)}
        </span>
      ),
    },
    {
      accessorKey: "payment_method",
      header: "Thanh toán",
      cell: ({ row }) => {
        const method = row.getValue("payment_method") as string;
        const label =
          method === "Cash"
            ? "Tiền mặt"
            : method === "Credit Card"
              ? "Thẻ tín dụng"
              : method === "Debit Card"
                ? "Thẻ ghi nợ"
                : method === "E-Wallet"
                  ? "Ví điện tử"
                  : method;
        return <span className="text-sm">{label}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusLabel =
          status === "Completed"
            ? "Hoàn thành"
            : status === "Pending"
              ? "Chờ xử lý"
              : "Đã hủy";
        return (
          <Badge variant={statusVariant(status)} className="text-xs">
            {statusLabel}
          </Badge>
        );
      },
    },
  ];

  const s = report?.summary;

  const statCards = [
    {
      label: "Tổng doanh thu",
      value: formatVND(s?.totalRevenue ?? 0),
      icon: TrendingUp,
      highlight: true,
    },
    {
      label: "Tổng đơn hàng",
      value: String(s?.totalOrders ?? 0),
      icon: ShoppingBag,
    },
    {
      label: "Giá trị TB/đơn",
      value: formatVND(s?.avgOrderValue ?? 0),
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Báo cáo doanh thu</h1>
          <p className="text-sm text-gray-500 mt-0.5">{periodLabel}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter onChange={handleDateRangeChange} />

          {/* Export buttons */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-sm cursor-pointer"
            disabled={!report || isLoading}
            onClick={async () => {
              if (!report) return;
              exportToCSV(report);
              await log({
                action: "view",
                subject: "transaction",
                entityName: `CSV Export - ${periodLabel}`,
              });
            }}
          >
            <FileDown className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            size="sm"
            className="gap-2 text-sm cursor-pointer"
            disabled={!report || isLoading}
            onClick={async () => {
              if (!report) return;
              exportToPDF(report);
              await log({
                action: "view",
                subject: "transaction",
                entityName: `PDF Export - ${periodLabel}`,
              });
            }}
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className={
              card.highlight ? "bg-gray-900 text-white border-gray-900" : ""
            }
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-medium uppercase tracking-wide ${
                    card.highlight ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {card.label}
                </span>
                <card.icon
                  className={`h-4 w-4 ${card.highlight ? "text-gray-400" : "text-gray-400"}`}
                />
              </div>
              <div
                className={`text-2xl font-bold ${
                  isLoading ? "text-gray-300 animate-pulse" : ""
                }`}
              >
                {isLoading ? "—" : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment method breakdown */}
      {s && Object.keys(s.byPaymentMethod).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(s.byPaymentMethod).map(([method, amount]) => (
            <div
              key={method}
              className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm"
            >
              <span className="text-gray-500">{method}</span>
              <span className="font-semibold text-gray-900">
                {formatVND(amount)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-gray-500">Hoàn thành</span>
            <span className="font-semibold text-green-700">
              {s.completedOrders}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">Chờ xử lý</span>
            <span className="font-semibold text-yellow-600">
              {s.pendingOrders}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">Đã hủy</span>
            <span className="font-semibold text-red-600">
              {s.cancelledOrders}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredRows}
        filterComponent={
          <DataTableFilter
            filterType="transaction"
            onFilterChange={(f) =>
              setFilters({
                statuses: f.statuses ?? [],
                paymentMethods: f.paymentMethods ?? [],
              })
            }
          />
        }
        emptyMessage="Không có giao dịch nào trong khoảng thời gian này."
        searchPlaceholder="Tìm kiếm giao dịch..."
        isLoading={isLoading}
        loadingText="Đang tải báo cáo..."
        error={error}
        errorText="Lỗi khi tải báo cáo"
      />
    </div>
  );
};

export default SalesReportTable;

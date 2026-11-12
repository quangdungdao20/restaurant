"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionWithItems } from "@/types/transactions.types";
import ActionsDropdown, { ActionItem } from "@/components/actions-dropdown";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, Printer } from "lucide-react";
import ViewTransactionDetailsModal from "@/components/modals/transactions/view-transaction-details-modal";
import PrintReceiptModal from "@/components/modals/transactions/print-receipt-modal";
import DateRangeFilter, {
  DateRangeValue,
  getPresetDateRange,
} from "@/components/date-range-filter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatVND } from "@/lib/utils";
import DataTableFilter from "@/components/data-table-filter";
import { useActivityLogger } from "@/hooks/useActivityLogger";

const TransactionHistoryTable = () => {
  const { data: transactions = [], isLoading, error } = useTransactions();
  const { log } = useActivityLogger();

  const [
    isViewTransactionDetailsModalOpen,
    setIsViewTransactionDetailsModalOpen,
  ] = useState(false);
  const [isPrintReceiptModalOpen, setIsPrintReceiptModalOpen] = useState(false);

  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionWithItems | null>(null);

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

  const filteredData = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.created_at) return false;
      const d = new Date(t.created_at);
      const inDateRange = d >= dateRange.from && d <= dateRange.to;

      const inStatus =
        filters.statuses.length === 0 || filters.statuses.includes(t.status);

      const inPayment =
        filters.paymentMethods.length === 0 ||
        filters.paymentMethods.includes(t.payment_method);

      return inDateRange && inStatus && inPayment;
    });
  }, [transactions, dateRange, filters]);

  const handleCopyTransactionId = (transaction: TransactionWithItems) => {
    navigator.clipboard.writeText(transaction.transaction_number);
    toast.success("Đã sao chép mã giao dịch!");
  };

  const handleViewTransactionDetails = async (
    transaction: TransactionWithItems,
  ) => {
    setSelectedTransaction(transaction);
    setIsViewTransactionDetailsModalOpen(true);

    await log({
      action: "view",
      subject: "transaction",
      entityId: transaction.id,
      entityName: transaction.transaction_number,
    });
  };

  const handlePrintReceipt = (transaction: TransactionWithItems) => {
    setSelectedTransaction(transaction);
    setIsPrintReceiptModalOpen(true);
  };

  const columns: ColumnDef<TransactionWithItems>[] = [
    {
      accessorKey: "transaction_number",
      header: "Mã giao dịch",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("transaction_number")}</div>
      ),
    },
    {
      accessorKey: "customer_name",
      header: "Khách hàng",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue("customer_name") || "Khách vãng lai"}
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Tổng tiền",
      cell: ({ row }) => {
        const amount = row.getValue("total_amount") as number;
        return <div className="font-medium">{formatVND(amount)}</div>;
      },
    },
    {
      accessorKey: "payment_method",
      header: "Phương thức",
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
        return <div>{label}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const status = row.getValue("status") as TransactionWithItems["status"];
        const statusLabel =
          status === "Completed"
            ? "Hoàn thành"
            : status === "Pending"
              ? "Chờ xử lý"
              : "Đã hủy";
        return (
          <Badge
            variant={
              status === "Completed"
                ? "default"
                : status === "Pending"
                  ? "secondary"
                  : "destructive"
            }
          >
            {statusLabel}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Ngày tạo",
      accessorFn: (row) => {
        if (!row.created_at) return "-";
        return new Date(row.created_at).toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
      cell: ({ row }) => {
        const dateString = row.original.created_at;
        if (!dateString) return <div>-</div>;

        const date = new Date(dateString);
        return (
          <div>
            {date.toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      size: 60,
      cell: ({ row }) => {
        const transaction = row.original;

        const actions: ActionItem[] = [
          {
            label: "Sao chép mã GD",
            icon: Copy,
            onClick: () => handleCopyTransactionId(transaction),
          },
          {
            label: "Xem chi tiết",
            icon: Eye,
            onClick: () => handleViewTransactionDetails(transaction),
          },
          {
            label: "In hóa đơn",
            icon: Printer,
            onClick: () => handlePrintReceipt(transaction),
          },
        ];

        return <ActionsDropdown actions={actions} />;
      },
      enableSorting: false,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredData}
        filterComponent={
          <div className="flex items-center gap-2">
            <DateRangeFilter onChange={setDateRange} />
            <DataTableFilter
              filterType="transaction"
              onFilterChange={(f) =>
                setFilters({
                  statuses: f.statuses ?? [],
                  paymentMethods: f.paymentMethods ?? [],
                })
              }
            />
          </div>
        }
        emptyMessage="Không tìm thấy giao dịch nào."
        searchPlaceholder="Tìm kiếm giao dịch..."
        isLoading={isLoading}
        loadingText="Đang tải giao dịch..."
        error={error}
        errorText="Lỗi khi tải giao dịch"
      />

      <ViewTransactionDetailsModal
        open={isViewTransactionDetailsModalOpen}
        onOpenChange={setIsViewTransactionDetailsModalOpen}
        transaction={selectedTransaction}
      />

      <PrintReceiptModal
        open={isPrintReceiptModalOpen}
        onOpenChange={setIsPrintReceiptModalOpen}
        transaction={selectedTransaction}
      />
    </>
  );
};

export default TransactionHistoryTable;

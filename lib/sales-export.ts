import { format } from "date-fns";
import { SalesReport } from "@/hooks/useSalesReport";
import { formatVND } from "@/lib/utils";

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function exportToCSV(report: SalesReport): void {
  const { rows, summary, dateRange } = report;

  const headers = [
    "Mã giao dịch",
    "Ngày tạo",
    "Khách hàng",
    "Món",
    "Tạm tính",
    "Tổng tiền",
    "Phương thức",
    "Trạng thái",
  ];

  const escape = (val: string | number | null | undefined): string => {
    const str = String(val ?? "");
    // Wrap in quotes if contains comma, quote, or newline
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const dataRows = rows.map((row) => [
    escape(row.transaction_number),
    escape(
      new Date(row.created_at).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    ),
    escape(row.customer_name ?? "Walk-in"),
    escape(
      row.items.length === 0
        ? "—"
        : row.items.map((i) => `${i.product_name} x${i.quantity}`).join("; "),
    ),
    escape(formatVND(row.subtotal)),
    escape(formatVND(row.total_amount)),
    escape(row.payment_method),
    escape(row.status),
  ]);

  // Summary rows appended at the bottom
  const summaryRows = [
    [],
    ["Tổng kết"],
    ["Tổng doanh thu", formatVND(summary.totalRevenue)],
    ["Tổng đơn hàng", String(summary.totalOrders)],
    ["Giá trị TB/đơn", formatVND(summary.avgOrderValue)],
    ["Hoàn thành", String(summary.completedOrders)],
    ["Chờ xử lý", String(summary.pendingOrders)],
    ["Đã hủy", String(summary.cancelledOrders)],
    [],
    ["Theo phương thức thanh toán"],
    ...Object.entries(summary.byPaymentMethod).map(([method, amount]) => [
      method,
      formatVND(amount),
    ]),
  ];

  const csvContent = [
    headers.join(","),
    ...dataRows.map((r) => r.join(",")),
    ...summaryRows.map((r) => r.join(",")),
  ].join("\n");

  const fromStr = format(dateRange.from, "yyyy-MM-dd");
  const toStr = format(dateRange.to, "yyyy-MM-dd");
  const filename = `sales-report_${fromStr}_${toStr}.csv`;

  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export function exportToPDF(report: SalesReport): void {
  const { rows, summary, dateRange } = report;

  const fromStr = format(dateRange.from, "MMM d, yyyy");
  const toStr = format(dateRange.to, "MMM d, yyyy");
  const generatedAt = format(new Date(), "MMM d, yyyy h:mm a");

  const tableRows = rows
    .map(
      (row) => `
      <tr>
        <td>${row.transaction_number}</td>
        <td>${new Date(row.created_at).toLocaleString("en-PH", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}</td>
        <td>${row.customer_name ?? "Walk-in"}</td>
        <td>${
          row.items.length === 0
            ? "—"
            : row.items
                .map((i) => `${i.product_name} ×${i.quantity}`)
                .join(", ")
        }</td>
        <td>${formatVND(row.subtotal)}</td>
        <td><strong>${formatVND(row.total_amount)}</strong></td>
        <td>${row.payment_method}</td>
        <td>${row.status}</td>
      </tr>`,
    )
    .join("");

  const paymentBreakdown = Object.entries(summary.byPaymentMethod)
    .map(
      ([method, amount]) =>
        `<span class="badge">${method}: <strong>${formatVND(amount)}</strong></span>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Sales Report – ${fromStr} to ${toStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #111; padding: 32px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
    .meta { font-size: 11px; color: #666; margin-bottom: 24px; }
    .stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .stat { background: #f4f4f5; border-radius: 8px; padding: 12px 16px; min-width: 120px; }
    .stat.highlight { background: #111; color: #fff; }
    .stat label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; display: block; margin-bottom: 4px; }
    .stat.highlight label { color: #aaa; }
    .stat value { font-size: 18px; font-weight: 700; }
    .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .badge { background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 6px; padding: 4px 10px; font-size: 11px; color: #555; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f4f4f5; text-align: left; padding: 7px 8px; font-weight: 600; border-bottom: 1px solid #e4e4e7; }
    td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 24px; font-size: 10px; color: #999; text-align: right; }
    @media print {
      body { padding: 16px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>Báo cáo doanh thu</h1>
  <p class="meta">${fromStr} – ${toStr} &nbsp;·&nbsp; Tạo lúc ${generatedAt}</p>

  <div class="stats">
    <div class="stat highlight">
      <label>Tổng doanh thu</label>
      <value>${formatVND(summary.totalRevenue)}</value>
    </div>
    <div class="stat">
      <label>Tổng đơn hàng</label>
      <value>${summary.totalOrders}</value>
    </div>
    <div class="stat">
      <label>Giá trị TB/đơn</label>
      <value>${formatVND(summary.avgOrderValue)}</value>
    </div>
  </div>

  <div class="badges">
    ${paymentBreakdown}
    <span class="badge">Hoàn thành: <strong style="color:#15803d">${summary.completedOrders}</strong></span>
    <span class="badge">Chờ xử lý: <strong style="color:#b45309">${summary.pendingOrders}</strong></span>
    <span class="badge">Đã hủy: <strong style="color:#b91c1c">${summary.cancelledOrders}</strong></span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Mã giao dịch</th>
        <th>Ngày tạo</th>
        <th>Khách hàng</th>
        <th>Món</th>
        <th>Tạm tính</th>
        <th>Tổng tiền</th>
        <th>Thanh toán</th>
        <th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <p class="footer">Sales Report · ${rows.length} transaction(s) · ${fromStr} – ${toStr}</p>

  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;

  // const fromFileStr = format(dateRange.from, "yyyy-MM-dd");
  // const toFileStr = format(dateRange.to, "yyyy-MM-dd");

  // Open in a new tab and trigger print dialog (acts as PDF export)
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onafterprint = () => URL.revokeObjectURL(url);
  }
}

// ─── Shared helper ────────────────────────────────────────────────────────────

function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

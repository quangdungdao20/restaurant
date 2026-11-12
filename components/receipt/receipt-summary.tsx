import { TransactionWithItems } from "@/types/transactions.types";
import { formatVND } from "@/lib/utils";

interface ReceiptSummaryProps {
  transaction: TransactionWithItems;
}

const ReceiptSummary = ({ transaction }: ReceiptSummaryProps) => {
  return (
    <div className="text-sm space-y-1">
      <div className="flex justify-between">
        <span>Tạm tính:</span>
        <span>{formatVND(transaction.subtotal)}</span>
      </div>
      {transaction.discount_amount > 0 && (
        <div className="flex justify-between">
          <span>Giảm giá:</span>
          <span>-{formatVND(transaction.discount_amount)}</span>
        </div>
      )}
      <div className="border-t-2 border-black my-2"></div>
      <div className="flex justify-between text-lg font-bold">
        <span>TỔNG CỘNG:</span>
        <span>{formatVND(transaction.total_amount)}</span>
      </div>
    </div>
  );
};

export default ReceiptSummary;

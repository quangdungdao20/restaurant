import React from "react";
import { TransactionItems } from "@/types/transaction-items.types";
import { formatVND } from "@/lib/utils";

interface ReceiptItemProps {
  item: TransactionItems;
}

const ReceiptItem = ({ item }: ReceiptItemProps) => {
  return (
    <div key={item.id} className="text-sm">
      <div className="font-semibold">{item.product_name}</div>
      <div className="flex justify-between text-xs text-gray-700 mt-1">
        <span>
          {item.quantity} x {formatVND(item.product_price)}
        </span>
        <span className="font-semibold">{formatVND(item.subtotal)}</span>
      </div>
      <div className="border-b border-dashed border-gray-400 mt-2"></div>
    </div>
  );
};

export default ReceiptItem;

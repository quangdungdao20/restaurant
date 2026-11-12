"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus } from "lucide-react";
import { OrderItem, calculateOrderTotals } from "@/store/order";
import { formatVND } from "@/lib/utils";

interface SplitPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: OrderItem[];
  onConfirmSelection: (selectedItems: OrderItem[]) => void;
}

const SplitPaymentModal = ({
  open,
  onOpenChange,
  items,
  onConfirmSelection,
}: SplitPaymentModalProps) => {
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      const initial: Record<string, number> = {};
      items.forEach((item) => {
        initial[item.id] = 0;
      });
      setSelectedQty(initial);
    }
  }, [open, items]);

  const toggleItem = (item: OrderItem, checked: boolean) => {
    setSelectedQty((prev) => ({
      ...prev,
      [item.id]: checked ? item.quantity : 0,
    }));
  };

  const adjustQty = (item: OrderItem, delta: number) => {
    setSelectedQty((prev) => {
      const current = prev[item.id] ?? 0;
      const next = Math.max(0, Math.min(item.quantity, current + delta));
      return { ...prev, [item.id]: next };
    });
  };

  const selectedItems: OrderItem[] = items
    .map((item) => {
      const qty = selectedQty[item.id] ?? 0;
      return qty > 0 ? { ...item, quantity: qty } : null;
    })
    .filter((i): i is OrderItem => i !== null);

  const { subtotal, total } = calculateOrderTotals(selectedItems);

  const handleProceed = () => {
    if (selectedItems.length === 0) return;
    onOpenChange(false);
    onConfirmSelection(selectedItems);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>Tách đơn — Thanh toán từng món</DialogTitle>
          <DialogDescription>
            Chọn món và số lượng cần thanh toán trước
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
          {items.map((item) => {
            const qty = selectedQty[item.id] ?? 0;
            const isChecked = qty > 0;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-gray-50/60"
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      toggleItem(item, Boolean(checked))
                    }
                    className="mt-1 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatVND(item.price)} · Còn {item.quantity} món
                    </p>
                    {item.note && (
                      <p className="text-xs text-amber-700 italic truncate">
                        Ghi chú: {item.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 rounded-full cursor-pointer"
                    onClick={() => adjustQty(item, -1)}
                    disabled={qty <= 0}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="min-w-[24px] text-center text-sm font-semibold">
                    {qty}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 rounded-full cursor-pointer"
                    onClick={() => adjustQty(item, 1)}
                    disabled={qty >= item.quantity}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Tạm tính (đã chọn)</span>
            <span>{formatVND(subtotal)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>Tổng thanh toán</span>
            <span>{formatVND(total)}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="flex-1 cursor-pointer"
            disabled={selectedItems.length === 0}
            onClick={handleProceed}
          >
            Thanh toán ({selectedItems.reduce((s, i) => s + i.quantity, 0)} món)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SplitPaymentModal;


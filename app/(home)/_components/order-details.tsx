"use client";

import { useOrderStore, OrderItem } from "@/store/order";
import { useTableStore } from "@/store/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import OrderItems from "./order-items";
import PaymentModal from "@/components/modals/transactions/payment-modal";
import SplitPaymentModal from "@/components/modals/transactions/split-payment-modal";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { StickyNote, ClipboardCheck, Split } from "lucide-react";
import { toast } from "sonner";
import { formatVND } from "@/lib/utils";

interface OrderDetailsProps {
  className?: string;
}

const OrderDetails = ({ className }: OrderDetailsProps) => {
  const {
    items,
    subtotal,
    total,
    tableNote,
    isOrdered,
    setTableNote,
    confirmOrder,
    clearOrder,
    promo,
    setDiscountPercentage,
    activeTableKey,
  } = useOrderStore();
  const { selectedTable } = useTableStore();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitItems, setSplitItems] = useState<OrderItem[] | null>(null);

  const takeawayNumber = activeTableKey.startsWith("takeaway-")
    ? activeTableKey.replace("takeaway-", "").slice(-6)
    : "";
  const tableTitle = selectedTable
    ? `Bàn ${selectedTable.table_number}`
    : takeawayNumber
      ? `Khách mang về #${takeawayNumber}`
      : "Khách mang về";

  const handleConfirmOrder = () => {
    if (items.length === 0) return;
    confirmOrder();
    toast.success(`Đã lên đơn cho ${tableTitle}!`);
  };

  const handleFullPayment = () => {
    setSplitItems(null);
    setIsPaymentModalOpen(true);
  };

  const handleSplitConfirm = (selected: OrderItem[]) => {
    setSplitItems(selected);
    setIsPaymentModalOpen(true);
  };

  return (
    <>
      <div
        className={
          className ??
          "col-span-12 md:col-span-4 xl:col-span-3 flex flex-col bg-white rounded-lg shadow-sm h-full p-4 space-y-3 overflow-hidden"
        }
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">Chi tiết đơn</h2>
          <div className="flex items-center gap-1.5">
            {items.length > 0 && (
              <Badge
                className={
                  isOrdered
                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                }
              >
                {isOrdered ? "Đã lên đơn" : "Chưa lên đơn"}
              </Badge>
            )}
            <span className="text-xs font-medium bg-gray-100 text-gray-800 px-2.5 py-1 rounded-full">
              {tableTitle}
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pr-1">
          {/* Order items */}
          <div className="space-y-2">
            {items.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <OrderItems
                    key={item.id}
                    id={item.id}
                    imageUrl={item.image?.url ?? ""}
                    name={item.name}
                    price={item.price}
                    quantity={item.quantity}
                    maxQuantity={item.maxQuantity}
                    note={item.note}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">
                Chưa có món trong đơn hàng
              </div>
            )}
          </div>

          {/* Ghi chú bàn */}
          <div className="relative shrink-0 m-1 mb-3">
            <StickyNote className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              type="text"
              placeholder="Ghi chú chung cho bàn..."
              value={tableNote}
              onChange={(e) => setTableNote(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>

        <Separator />

        {/* Order summary */}
        <div className="space-y-1.5 py-2">
          <div className="flex justify-between text-sm">
            <span>Tạm tính</span>
            <span>{formatVND(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="discount-percentage" className="text-sm">
              Giảm giá
            </label>
            <div className="relative w-24">
              <Input
                id="discount-percentage"
                type="number"
                min={0}
                max={100}
                step="1"
                value={promo.discountValue || ""}
                onChange={(event) =>
                  setDiscountPercentage(Number(event.target.value))
                }
                placeholder="0"
                className="h-8 pr-7 text-right text-sm"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                %
              </span>
            </div>
          </div>
          {promo.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Tiền giảm</span>
              <span>-{formatVND(promo.discountAmount)}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between font-semibold text-lg">
          <span>Tổng thanh toán</span>
          <span>{formatVND(total)}</span>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-1">
          <Button
            className="w-full cursor-pointer gap-1.5 bg-amber-600 hover:bg-amber-700"
            disabled={items.length === 0}
            onClick={handleConfirmOrder}
          >
            <ClipboardCheck className="w-4 h-4" />
            {isOrdered ? "Cập nhật đơn (Order)" : "Lên đơn (Order)"}
          </Button>

          {isOrdered && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full cursor-pointer text-xs sm:text-sm"
                disabled={items.length === 0}
                onClick={handleFullPayment}
              >
                Thanh toán hết
              </Button>
              <Button
                variant="outline"
                className="w-full cursor-pointer gap-1 text-xs sm:text-sm"
                disabled={items.length === 0}
                onClick={() => setIsSplitModalOpen(true)}
              >
                <Split className="w-3.5 h-3.5" />
                Tách đơn
              </Button>
            </div>
          )}

          <Button
            variant="secondary"
            className="w-full cursor-pointer"
            onClick={clearOrder}
            disabled={items.length === 0 && !tableNote}
          >
            Xóa đơn bàn này
          </Button>
        </div>
      </div>

      <SplitPaymentModal
        open={isSplitModalOpen}
        onOpenChange={setIsSplitModalOpen}
        items={items}
        onConfirmSelection={handleSplitConfirm}
      />

      <PaymentModal
        open={isPaymentModalOpen}
        onOpenChange={(open) => {
          setIsPaymentModalOpen(open);
          if (!open) setSplitItems(null);
        }}
        itemsOverride={splitItems}
      />
    </>
  );
};

export default OrderDetails;

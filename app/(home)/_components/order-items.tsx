
"use client";

import { useState, useEffect } from "react";
import ReusableImage from "@/components/reusable-image";
import { Input } from "@/components/ui/input";
import {
  Minus,
  Plus,
  StickyNote,
  X,
  Check,
  Pencil,
} from "lucide-react";
import { useOrderStore } from "@/store/order";
import QuantityModal from "@/components/modals/transactions/quantity-modal";
import { formatVND } from "@/lib/utils";

interface OrderItemsProps {
  id: string;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  note?: string;
}

const OrderItems = ({
  id,
  imageUrl,
  name,
  price,
  quantity,
  maxQuantity,
  note,
}: OrderItemsProps) => {
  const { updateQuantity, removeItem, updateItemNote } = useOrderStore();

  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note ?? "");

  // Đồng bộ ghi chú nếu dữ liệu bên ngoài thay đổi
  useEffect(() => {
    if (!isEditingNote) {
      setNoteDraft(note ?? "");
    }
  }, [note, isEditingNote]);

  const subtotal = price * quantity;

  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      updateQuantity(id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity <= 1) {
      removeItem(id);
    } else {
      updateQuantity(id, quantity - 1);
    }
  };

  const handleSaveNote = () => {
    updateItemNote(id, noteDraft.trim());
    setIsEditingNote(false);
  };

  const handleCancelNote = () => {
    setNoteDraft(note ?? "");
    setIsEditingNote(false);
  };

  return (
    <>
      <div className="border-b border-gray-100 py-3 last:border-b-0">
        {/* Product information */}
        <div className="flex gap-3">
          <ReusableImage
            src={imageUrl}
            alt={name}
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
            fallbackText={name}
          />

          <div className="min-w-0 flex-1">
            {/* Product name */}
            <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-gray-800">
              {name}
            </p>

            {/* Price + Quantity */}
            <div className="mt-2 flex items-center justify-between gap-2">
              {/* Unit price */}
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400">
                  Đơn giá
                </p>
                <p className="text-xs font-medium text-gray-700">
                  {formatVND(price)}
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={handleDecrement}
                  aria-label="Giảm số lượng"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white hover:text-red-500"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsQtyModalOpen(true)}
                  aria-label="Chỉnh sửa số lượng"
                  title="Nhấn để nhập số lượng"
                  className="min-w-[28px] px-1 text-center text-xs font-semibold text-gray-800"
                >
                  {quantity}
                </button>

                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= maxQuantity}
                  aria-label="Tăng số lượng"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Subtotal */}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                Thành tiền
              </span>

              <span className="text-sm font-bold tabular-nums text-gray-900">
                {formatVND(subtotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Product note */}
        <div className="mt-2 pl-[60px]">
          {isEditingNote ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Ít đá, không đường..."
                className="h-8 min-w-0 flex-1 rounded-md text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNote();
                  if (e.key === "Escape") handleCancelNote();
                }}
              />

              <button
                type="button"
                onClick={handleSaveNote}
                aria-label="Lưu ghi chú"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <Check className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleCancelNote}
                aria-label="Hủy ghi chú"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNoteDraft(note ?? "");
                setIsEditingNote(true);
              }}
              className="inline-flex max-w-full items-center gap-1.5 text-[11px] transition-colors hover:text-amber-700"
            >
              {note ? (
                <>
                  <StickyNote className="h-3 w-3 shrink-0 text-amber-600" />
                  <span className="truncate text-left italic text-amber-700">
                    {note}
                  </span>
                  <Pencil className="h-3 w-3 shrink-0 text-gray-400" />
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-400">
                    Thêm ghi chú
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <QuantityModal
        open={isQtyModalOpen}
        onOpenChange={setIsQtyModalOpen}
        id={id}
        name={name}
        quantity={quantity}
        maxQuantity={maxQuantity}
      />
    </>
  );
};

export default OrderItems;

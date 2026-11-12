"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PaymentForm, {
  paymentSchema,
  PaymentFormValues,
} from "@/components/forms/payment-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  useOrderStore,
  OrderItem,
  calculateOrderTotals,
} from "@/store/order";
import { useTableStore } from "@/store/table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useActivityLogger } from "@/hooks/useActivityLogger";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsOverride?: OrderItem[] | null;
  onSuccess?: () => void;
}

const PaymentModal = ({
  open,
  onOpenChange,
  itemsOverride,
  onSuccess,
}: PaymentModalProps) => {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { log } = useActivityLogger();

  const {
    items: storeItems,
    subtotal: storeSubtotal,
    tax: storeTax,
    total: storeTotal,
    promo,
    clearOrder,
    payPartialItems,
  } = useOrderStore();
  const { selectedTable } = useTableStore();

  const isSplit = Boolean(itemsOverride && itemsOverride.length > 0);
  const activeItems = isSplit ? itemsOverride! : storeItems;
  const { subtotal, tax, total } = isSplit
    ? calculateOrderTotals(activeItems, promo.discountAmount)
    : { subtotal: storeSubtotal, tax: storeTax, total: storeTotal };

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customer_name: "",
      payment_method: "Cash",
      promo_code: undefined,
    },
  });

  const handleDialogChange = () => {
    onOpenChange(false);
    form.reset();
  };

  const onSubmit = async (values: PaymentFormValues) => {
    if (activeItems.length === 0) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Người dùng chưa đăng nhập");
      if (!profile?.business_id)
        throw new Error("Không tìm thấy thông tin cửa hàng");

      const business_id = profile.business_id;
      const tableLabel = selectedTable
        ? `Bàn ${selectedTable.table_number}`
        : null;
      const finalCustomerName = values.customer_name
        ? tableLabel
          ? `${values.customer_name} (${tableLabel})`
          : values.customer_name
        : tableLabel;

      // 1. Insert transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          business_id,
          customer_name: finalCustomerName,
          subtotal,
          discount_amount: promo.discountAmount,
          promo_code: promo.promoCode ?? null,
          tax_rate: 0,
          payment_method: values.payment_method,
          status: "Completed",
          user_id: user.id,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // 2. Insert transaction items
      const itemsToInsert = activeItems.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.id,
        product_name: item.note
          ? `${item.name} (${item.note})`
          : item.name,
        product_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(itemsToInsert);

      if (itemsError) {
        await supabase.from("transactions").delete().eq("id", transaction.id);
        throw itemsError;
      }

      // 3. Log after all steps are successful
      await log({
        action: "create",
        subject: "transaction",
        entityId: transaction.id,
        entityName: transaction.transaction_number,
      });

      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["notifications", profile?.business_id],
      });
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });

      toast.success(
        isSplit
          ? `Tách đơn thanh toán ${transaction.transaction_number} thành công!`
          : `Giao dịch ${transaction.transaction_number} đã hoàn tất!`,
      );

      if (isSplit) {
        payPartialItems(
          activeItems.map((i) => ({ id: i.id, quantity: i.quantity })),
        );
      } else {
        clearOrder();
      }

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Thanh toán thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent>
        <DialogHeader className="text-left">
          <DialogTitle>
            {isSplit ? "Thanh toán tách đơn" : "Hoàn tất thanh toán"}
          </DialogTitle>
          <DialogDescription>
            {isSplit
              ? `Thanh toán ${activeItems.reduce((s, i) => s + i.quantity, 0)} món đã chọn`
              : "Nhập thông tin khách hàng và chọn phương thức thanh toán"}
          </DialogDescription>
        </DialogHeader>
        <PaymentForm
          form={form}
          onSubmit={onSubmit}
          handleCancel={handleDialogChange}
          subtotal={subtotal}
          tax={tax}
          total={total}
          submitLabel="Xác nhận thanh toán"
          submitLoadingLabel="Đang xử lý..."
        />
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;

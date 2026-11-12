"use client";

import { z } from "zod";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useOrderStore } from "@/store/order";
import { formatVND } from "@/lib/utils";

export const paymentSchema = z.object({
  customer_name: z.string().optional(),
  payment_method: z.enum(["Cash", "Credit Card", "Debit Card", "E-Wallet"]),
  promo_code: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  form: UseFormReturn<PaymentFormValues>;
  onSubmit: (values: PaymentFormValues) => Promise<void> | void;
  handleCancel: () => void;
  subtotal: number;
  tax: number;
  total: number;
  submitLabel: string;
  submitLoadingLabel: string;
}

const PaymentForm = ({
  form,
  onSubmit,
  handleCancel,
  subtotal,
  total,
  submitLabel,
  submitLoadingLabel,
}: PaymentFormProps) => {
  const { promo } = useOrderStore();

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customer_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên khách hàng (Tùy chọn)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isSubmitting}
                  placeholder="Nhập tên khách hàng"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phương thức thanh toán</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="Chọn phương thức thanh toán" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Cash" className="cursor-pointer">
                    Tiền mặt
                  </SelectItem>
                  <SelectItem value="Credit Card" className="cursor-pointer">
                    Thẻ tín dụng
                  </SelectItem>
                  <SelectItem value="Debit Card" className="cursor-pointer">
                    Thẻ ghi nợ
                  </SelectItem>
                  <SelectItem value="E-Wallet" className="cursor-pointer">
                    Ví điện tử
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Tạm tính</span>
            <span>{formatVND(subtotal)}</span>
          </div>
          {promo.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Giảm giá ({promo.discountValue}%)</span>
              <span>-{formatVND(promo.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-lg">
            <span>Tổng cộng</span>
            <span>{formatVND(total)}</span>
          </div>
        </div>

        <div className="w-full flex items-center gap-2 justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleCancel}
            className="cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            {isSubmitting ? submitLoadingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentForm;

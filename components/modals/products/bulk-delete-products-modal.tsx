"use client";

import { useState } from "react";
import { Products } from "@/types/product.types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useActivityLogger } from "@/hooks/useActivityLogger";

interface BulkDeleteProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Products[];
  onSuccess: () => void;
}

const BulkDeleteProductsModal = ({
  open,
  onOpenChange,
  products,
  onSuccess,
}: BulkDeleteProductsModalProps) => {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { log } = useActivityLogger();

  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkDelete = async () => {
    if (products.length === 0) return;

    setIsDeleting(true);
    try {
      const ids = products.map((p) => p.id);
      let deletedCount = ids.length;
      const { data: usedProducts, error: usageError } = await supabase
        .from("transaction_items")
        .select("product_id")
        .in("product_id", ids);

      if (usageError) throw usageError;

      const usedProductIds = new Set(
        (usedProducts ?? []).map((item) => item.product_id),
      );

      if (usedProductIds.size > 0) {
        const deletableIds = ids.filter((id) => !usedProductIds.has(id));

        if (deletableIds.length === 0) {
          toast.error(
            "Không thể xóa các sản phẩm đã phát sinh giao dịch để bảo toàn lịch sử bán hàng.",
          );
          return;
        }

        deletedCount = deletableIds.length;
        toast.warning(
          `Đã bỏ qua ${usedProductIds.size} sản phẩm đã phát sinh giao dịch.`,
        );

        const { error: partialDeleteError } = await supabase
          .from("products")
          .delete()
          .in("id", deletableIds);

        if (partialDeleteError) throw partialDeleteError;
      } else {
        const { error } = await supabase
          .from("products")
          .delete()
          .in("id", ids);

        if (error) throw error;
      }

      await log({
        action: "delete",
        subject: "product",
        entityName: `Xóa hàng loạt ${products.length} sản phẩm`,
      });

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Đã xóa ${deletedCount} sản phẩm thành công`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23503"
      ) {
        toast.error(
          "Không thể xóa món đã phát sinh giao dịch. Hãy giữ lại món này để bảo toàn lịch sử bán hàng.",
        );
      } else {
        toast.error("Không thể xóa các sản phẩm đã chọn. Vui lòng thử lại.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle>Xác nhận xóa hàng loạt?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này sẽ xóa vĩnh viễn{" "}
            <span className="font-semibold text-foreground">
              {products.length} sản phẩm
            </span>{" "}
            đã chọn. Không thể hoàn tác sau khi xóa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2">
          <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
          >
            {isDeleting ? "Đang xóa..." : `Xóa ${products.length} sản phẩm`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkDeleteProductsModal;

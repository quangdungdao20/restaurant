"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmSignOutButtonProps {
  onConfirm: () => void;
}

const ConfirmSignOutButton = ({ onConfirm }: ConfirmSignOutButtonProps) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-gray-500 hover:text-red-600 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle>Xác nhận đăng xuất?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn đăng xuất khỏi tài khoản POS này không?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2">
          <AlertDialogCancel className="cursor-pointer">Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
          >
            Đăng xuất
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmSignOutButton;

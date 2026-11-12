// config/nav-items.ts
import {
  Home,
  ShoppingBag,
  User2,
  Receipt,
  BarChart2,
  LayoutGrid,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { title: "Bảng điều khiển", url: "/dashboard", icon: Home },
  { title: "Quản lý bàn", url: "/tables", icon: LayoutGrid },
  { title: "Sản phẩm", url: "/products", icon: ShoppingBag },
  { title: "Lịch sử giao dịch", url: "/transactions", icon: Receipt },
  { title: "Báo cáo doanh thu", url: "/sales", icon: BarChart2 },
  { title: "Nhân viên", url: "/users", icon: User2 },
  { title: "Nhật ký hoạt động", url: "/activity-logs", icon: BarChart2 },
];

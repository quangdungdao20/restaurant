"use client";

import {
  TrendingUp,
  ShoppingBag,
  UsersIcon,
  Package,
  DollarSign,
  CalendarDays,
  Clock,
} from "lucide-react";
import StatCard from "./stat-card";
import { DashboardStats } from "@/hooks/useDashboardData";
import { formatVND } from "@/lib/utils";

interface StatsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
  error?: Error | null;
}

const Stats = ({ stats, isLoading, error }: StatsProps) => {
  const salesDesc = () => {
    if (isLoading) return "Đang tải...";
    if (error) return "Không thể tải";
    const p = stats?.salesChangePercent ?? 0;
    if (p > 0) return `+${p}% so với hôm qua`;
    if (p < 0) return `${p}% so với hôm qua`;
    return "Như hôm qua";
  };

  const ordersDesc = () => {
    if (isLoading) return "Đang tải...";
    if (error) return "Không thể tải";
    const d = stats?.ordersChangeFromLastWeek ?? 0;
    if (d > 0) return `+${d} so với tuần trước`;
    if (d < 0) return `${d} so với tuần trước`;
    return "Như tuần trước";
  };

  const stockDesc = () => {
    if (isLoading) return "Đang tải...";
    if (error) return "Không thể tải";
    const n = stats?.lowStockCount ?? 0;
    if (n === 0) return "Tất cả sản phẩm còn hàng";
    return `${n} sản phẩm ${n === 1 ? "" : ""}sắp hết hàng`;
  };

  const monthDesc = () => {
    if (isLoading) return "Đang tải...";
    if (error) return "Không thể tải";
    const p = stats?.monthlyRevenueChange ?? 0;
    if (p > 0) return `+${p}% so với tháng trước`;
    if (p < 0) return `${p}% so với tháng trước`;
    return "Như tháng trước";
  };

  const statCards = [
    {
      title: "Doanh số hôm nay",
      value: formatVND(stats?.todaysSales ?? 0),
      description: salesDesc(),
      icon: TrendingUp,
      isLoading,
    },
    {
      title: "Tổng đơn hàng",
      value: stats?.totalOrders ?? 0,
      description: ordersDesc(),
      icon: ShoppingBag,
      isLoading,
    },
    {
      title: "Sản phẩm đang hoạt động",
      value: stats?.activeProducts ?? 0,
      description: stockDesc(),
      icon: Package,
      isLoading,
    },
    {
      title: "Nhân viên đang hoạt động",
      value: stats?.activeUsers ?? 0,
      description: isLoading
        ? "Đang tải..."
        : error
          ? "Không thể tải"
          : "Tất cả thành viên",
      icon: UsersIcon,
      isLoading,
    },
    {
      title: "Giá trị đơn hàng TB",
      value: formatVND(stats?.avgOrderValue ?? 0),
      description: "Dựa trên tuần này",
      icon: DollarSign,
      isLoading,
    },
    {
      title: "Doanh thu tháng",
      value: formatVND(stats?.monthlyRevenue ?? 0),
      description: monthDesc(),
      icon: CalendarDays,
      isLoading,
    },
    {
      title: "Đơn chờ xử lý",
      value: stats?.pendingTransactions ?? 0,
      description: "Chờ hoàn thành",
      icon: Clock,
      isLoading,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default Stats;

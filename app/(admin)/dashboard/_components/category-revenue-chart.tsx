"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVND } from "@/lib/utils";
import { PieChartIcon } from "lucide-react";
import { CategoryRevenue } from "@/hooks/useDashboardData";

interface CategoryRevenueChartProps {
  data: CategoryRevenue[];
  isLoading?: boolean;
}

const COLORS: Record<string, string> = {
  Coffee: "#92400e",
  Food: "#16a34a",
  Dessert: "#db2777",
  Unknown: "#9ca3af",
};

const FALLBACK_COLORS = ["#18181b", "#52525b", "#a1a1aa", "#d4d4d8"];

const CustomTooltip = ({
  active,
  payload,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as CategoryRevenue;
    return (
      <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700">{item.category}</p>
        <p className="text-gray-900">
          <span className="text-gray-500">Doanh thu: </span>
          <span className="font-medium">{formatVND(item.revenue)}</span>
        </p>
        <p className="text-gray-500">{item.percentage}% tổng doanh thu</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ data }: { data: CategoryRevenue[] }) => (
  <div className="flex flex-col gap-2 mt-2">
    {data.map((item, i) => (
      <div
        key={item.category}
        className="flex items-center justify-between text-sm"
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{
              backgroundColor:
                COLORS[item.category] ??
                FALLBACK_COLORS[i % FALLBACK_COLORS.length],
            }}
          />
          <span className="text-gray-600">{item.category}</span>
        </div>
        <span className="font-medium text-gray-800">{item.percentage}%</span>
      </div>
    ))}
  </div>
);

const CategoryRevenueChart = ({
  data,
  isLoading,
}: CategoryRevenueChartProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          Doanh thu theo danh mục
        </CardTitle>
        <PieChartIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            Đang tải biểu đồ...
          </div>
        ) : data.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            Chưa có dữ liệu doanh số.
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="revenue"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.category}
                      fill={
                        COLORS[entry.category] ??
                        FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <CustomLegend data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryRevenueChart;

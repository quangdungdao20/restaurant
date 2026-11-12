import { Metadata } from "next";
import PageHeader from "@/components/page-header";
import PageTransition from "@/components/page-transition";
import ActivityLogsTable from "./_components/activity-logs-table";

export const metadata: Metadata = {
  title: "Nhật ký hoạt động - Quán Ăn POS",
  description: "Xem nhật ký hoạt động của hệ thống",
};

const ActivityLogsPage = () => {
  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Nhật ký hoạt động"
          description="Theo dõi toàn bộ thao tác chỉnh sửa món, xóa, giao dịch và hoạt động nhân viên."
        />
        <ActivityLogsTable />
      </div>
    </PageTransition>
  );
};

export default ActivityLogsPage;

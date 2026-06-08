import { useAuth } from "@/lib/auth-context";
import { 
  useGetDashboardSummary, 
  useGetUrgencyBreakdown, 
  useGetTechnicianWorkload, 
  useGetRecentActivity,
  ActivityItem
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, FileText, CheckCircle2, Clock, Users, Wrench } from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: urgency, isLoading: isLoadingUrgency } = useGetUrgencyBreakdown();
  const { data: workload, isLoading: isLoadingWorkload } = useGetTechnicianWorkload();
  const { data: recent, isLoading: isLoadingRecent } = useGetRecentActivity({ limit: 10 });

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500">Overview of the CRM system and open issues.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Open Complaints</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-20" /> : (
                <div className="text-2xl font-bold">{summary?.openComplaints || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-20" /> : (
                <div className="text-2xl font-bold">{summary?.inProgress || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-20" /> : (
                <div className="text-2xl font-bold text-red-600">{summary?.critical || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Technicians</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-20" /> : (
                <div className="text-2xl font-bold">{summary?.activeTechnicians || 0} / {summary?.totalTechnicians || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Urgency Breakdown */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Urgency Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUrgency ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Skeleton className="h-[200px] w-[200px] rounded-full" />
                </div>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={urgency}
                        dataKey="count"
                        nameKey="urgency"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        {urgency?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.urgencyColor || '#ccc'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technician Workload */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Technician Workload</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingWorkload ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workload} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="technicianName" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="open" name="Open" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRecent ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recent && recent.length > 0 ? (
              <div className="space-y-6">
                {recent.map((item: ActivityItem) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: item.urgencyColor || '#ccc' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded mr-2">{item.ticketId}</span>
                          {item.customerName}
                        </p>
                        <span className="text-xs text-gray-500">{format(new Date(item.createdAt), 'p')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

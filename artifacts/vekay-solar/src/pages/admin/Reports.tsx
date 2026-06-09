import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetDailyReport, getGetDailyReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Download, CalendarIcon, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api-base";

export default function Reports() {
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isDownloading, setIsDownloading] = useState(false);
  const [isBackupDownloading, setIsBackupDownloading] = useState(false);

  const { data: report, isLoading } = useGetDailyReport(
    { date },
    { query: { queryKey: getGetDailyReportQueryKey({ date }) } }
  );

  const downloadFile = async (url: string, filename: string, setLoading: (v: boolean) => void) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Reports</h1>
            <p className="text-gray-500">View complaint metrics and download the full data.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => downloadFile(`${API_BASE}/api/reports/excel`, `greenpass-${format(new Date(), 'yyyy-MM-dd')}.xlsx`, setIsDownloading)}
              disabled={isDownloading}
              variant="outline"
            >
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export Excel
            </Button>
            <Button
              onClick={() => downloadFile(`${API_BASE}/api/reports/excel/backup`, `greenpass-backup.xlsx`, setIsBackupDownloading)}
              disabled={isBackupDownloading}
              variant="secondary"
              title="Last saved when admin logged in"
            >
              {isBackupDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Backup Excel
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : report ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Complaints (To Date)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report.totalComplaints}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">New Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report.newComplaints}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{report.resolved}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>By Urgency (All Time)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {report.byUrgency.map(u => (
                    <div key={u.urgency} className="flex items-center gap-2 p-4 border rounded-lg">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.urgencyColor }} />
                      <div>
                        <p className="text-sm font-medium capitalize">{u.urgency}</p>
                        <p className="text-xl font-bold">{u.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Complaints Registered on {format(new Date(date + 'T00:00:00'), 'PPP')}</CardTitle>
                <CardDescription>Filtered by selected date</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.complaints && report.complaints.length > 0 ? (
                      report.complaints.map(complaint => (
                        <TableRow key={complaint.id}>
                          <TableCell className="font-mono text-xs">{complaint.ticketId}</TableCell>
                          <TableCell className="font-medium">{complaint.customerName}</TableCell>
                          <TableCell>{complaint.placeName}</TableCell>
                          <TableCell className="capitalize">{complaint.status.replace("_", " ")}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No complaints registered on this date.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">Failed to load report data.</div>
        )}
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect } from "react";
import { useGetSalesSummaryQuery } from "@/services/orderApi";
import { socket } from "@/utils/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetSessionsQuery, useUpdateSessionMutation, useDeleteSessionMutation } from "@/services/sessionApi";
import { useGetAllStaffQuery } from "@/services/staffService";
import { useGetProductsQuery } from "@/services/productApi";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  FileSpreadsheet,
  Filter,
  Edit,
  Trash2
} from "lucide-react";

import { generatePDF } from "@/components/GeneratePdf";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { toast } from "react-hot-toast";

interface OrderItem {
  product: { name: string };
  size: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  table?: { name: string };
  customerName?: string;
  status: string;
  totalPrice: number;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
  customOrderID?: string;
}

interface StatusBreakdownItem {
  _id: string;
  count: number;
}

const SummaryManagement = () => {
  const { role } = useSelector((state: RootState) => state.user);
  const [updateSession] = useUpdateSessionMutation();
  const [deleteSession] = useDeleteSessionMutation();

  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCashier, setEditCashier] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editStatus, setEditStatus] = useState("open");
  const [editStartingBalance, setEditStartingBalance] = useState<number>(0);
  const [editEndingBalance, setEditEndingBalance] = useState<number>(0);
  const [editTotalSales, setEditTotalSales] = useState<number>(0);

  const formatForDatetimeLocal = (dateString?: string | Date) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleOpenEdit = (sess: any) => {
    setSelectedSession(sess);
    setEditCashier(sess.cashier?._id || sess.user?._id || "");
    setEditStartTime(formatForDatetimeLocal(sess.startTime));
    setEditEndTime(formatForDatetimeLocal(sess.endTime));
    setEditStatus(sess.status || "open");
    setEditStartingBalance(sess.startingBalance || 0);
    setEditEndingBalance(sess.endingBalance || 0);
    setEditTotalSales(sess.totalSales || 0);
    setIsEditModalOpen(true);
  };

  const handleSaveSession = async () => {
    if (!selectedSession) return;
    try {
      const body: any = {
        cashier: editCashier || undefined,
        startTime: editStartTime ? new Date(editStartTime).toISOString() : undefined,
        endTime: editEndTime ? new Date(editEndTime).toISOString() : null,
        status: editStatus,
        startingBalance: Number(editStartingBalance),
        endingBalance: editStatus === "closed" ? Number(editEndingBalance) : undefined,
        totalSales: Number(editTotalSales),
      };

      await updateSession({ id: selectedSession._id, body }).unwrap();
      toast.success("Session updated successfully");
      setIsEditModalOpen(false);
      refetchSessions(); // Refresh session table
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to update session");
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this session? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
      await deleteSession(selectedSession._id).unwrap();
      toast.success("Session deleted successfully");
      setIsEditModalOpen(false);
      refetchSessions(); // Refresh session table
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to delete session");
    }
  };

  const [status, setStatus] = useState<string>("all");
  const [search] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [sessionId, setSessionId] = useState<string>("all");
  const [responsibleStaff, setResponsibleStaff] = useState<string>("all");
  const [productId, setProductId] = useState<string>("all");

  const [openDetails, setOpenDetails] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // --- API State ---
  const { data: sessionsData, refetch: refetchSessions } = useGetSessionsQuery();
  const { data: staffData } = useGetAllStaffQuery(undefined);
  const { data: productsData } = useGetProductsQuery();

  const { data, isLoading, refetch } = useGetSalesSummaryQuery({
    startDate: new Date(`${startDate}T00:00:00+06:00`).toISOString(),
    endDate: new Date(`${endDate}T23:59:59+06:00`).toISOString(),
    status: status !== "all" ? status : undefined,
    search: search || undefined,
    sessionId: sessionId !== "all" ? sessionId : undefined,
    responsibleStaff: responsibleStaff !== "all" ? responsibleStaff : undefined,
    productId: productId !== "all" ? productId : undefined,
  });

  const handleExportXLS = () => {
    if (!filteredOrders.length) return;

    // Create CSV Header
    const headers = ["Order ID", "Table", "Status", "Items", "Total Price", "Payment", "Date", "Staff"];
    const rows = filteredOrders.map(o => [
      o.customOrderID || o._id,
      o.table?.name || "Walk-in",
      o.status,
      o.items.map(i => `${i.quantity}x ${i.product?.name}`).join("; "),
      o.totalPrice,
      o.paymentMethod,
      new Date(o.createdAt).toLocaleString(),
      (o as any).responsibleStaff?.name || "N/A"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Odoo_POS_Report_${startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const fetchData = async () => {
      Swal.fire({
        title: "Loading...",
        text: "Fetching orders, please wait.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        await refetch();
      } finally {
        Swal.close();
      }
    };

    fetchData();
  }, [status, startDate, endDate, search, refetch]);

  useEffect(() => {
    socket.on("newOrder", refetch);
    socket.on("orderUpdated", refetch);
    socket.on("orderConfirmed", refetch);
    socket.on("itemStatusChanged", refetch);

    return () => {
      socket.off("newOrder", refetch);
      socket.off("orderUpdated", refetch);
      socket.off("orderConfirmed", refetch);
      socket.off("itemStatusChanged", refetch);
    };
  }, [refetch]);

  // --- Extracted Data ---
  const summary = data?.summary ?? { totalOrders: 0, totalSales: 0 };
  const statusBreakdown = data?.statusBreakdown ?? [];
  const allData = data?.allData ?? {};

  const getStatusCount = (st: string) =>
    statusBreakdown.find((s: StatusBreakdownItem) => s._id === st)?.count ?? 0;

  const filteredOrders: Order[] = selectedStatus
    ? allData[selectedStatus as keyof typeof allData] ?? []
    : Object.values(allData).flat();

  // --- Utils ---
  const formatPrice = (price?: number | null) => {
    const safe = typeof price === "number" && !isNaN(price) ? price : 0;
    return `INR ${safe.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusVariant = (st: string) => {
    switch (st) {
      case "pending":
        return "secondary";
      case "preparing":
        return "default";
      case "served":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  // --- Render ---
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">📊 Sales Summary Management</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExportXLS}
            className="flex gap-2 rounded-xl h-12 font-bold border-green-200 text-green-700 bg-green-50/50 hover:bg-green-600 hover:text-white"
          >
            <FileSpreadsheet size={18} /> Export XLS
          </Button>
          <Button
            onClick={() =>
              generatePDF(
                "custom",
                startDate,
                endDate,
                status,
                summary,
                filteredOrders
              )
            }
            className="bg-blue-600 hover:bg-blue-700 rounded-xl h-12 font-bold px-6 flex gap-2"
          >
            <Download size={18} /> Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-3xl border-none shadow-sm dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center gap-3">
          <Filter className="w-5 h-5 text-blue-600" />
          <div>
            <CardTitle>Enterprise Filter Suite</CardTitle>
            <CardDescription>Analyze by Session, Product, or Responsible User</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 items-end">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">POS Session</Label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="border dark:border-gray-700 dark:bg-gray-900 rounded-xl h-11 px-4 w-full text-sm font-bold"
              >
                <option value="all">All Shifts</option>
                {sessionsData?.data?.map((s: any) => (
                  <option key={s._id} value={s._id}>
                    Shift: {new Date(s.startTime).toLocaleDateString()} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Responsible User</Label>
              <select
                value={responsibleStaff}
                onChange={(e) => setResponsibleStaff(e.target.value)}
                className="border dark:border-gray-700 dark:bg-gray-900 rounded-xl h-11 px-4 w-full text-sm font-bold"
              >
                <option value="all">Any Staff</option>
                {staffData?.staffs?.map((u: any) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Track Product</Label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="border dark:border-gray-700 dark:bg-gray-900 rounded-xl h-11 px-4 w-full text-sm font-bold"
              >
                <option value="all">All best-sellers</option>
                {(productsData as any)?.data?.map((p: any) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stage Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border dark:border-gray-700 dark:bg-gray-900 rounded-xl h-11 px-4 w-full text-sm font-bold"
              >
                <option value="all">All Life-stages</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="served">Served</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Until Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i} className="shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{summary.totalOrders}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => {
                    setSelectedStatus(null);
                    setOpenDetails(true);
                  }}
                >
                  See Details
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatPrice(summary.totalSales)}
                </p>
              </CardContent>
            </Card>

            {["pending", "preparing", "served", "cancelled"].map((st) => (
              <Card key={st} className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg capitalize">
                    {st} Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{getStatusCount(st)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      setSelectedStatus(st);
                      setOpenDetails(true);
                    }}
                  >
                    See Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Advanced Insights Section */}
      <AdvancedAnalytics filter="monthly" />

      {/* Session History & Shift Audits */}
      <Card className="rounded-3xl border-none shadow-sm dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Session History & Shift Audits</CardTitle>
          <CardDescription>Review open/closed cashier sessions, starting/closing times, and total revenue.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Cashier</th>
                  <th className="p-2 text-left">Start Time</th>
                  <th className="p-2 text-left">End Time</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Starting Balance</th>
                  <th className="p-2 text-left">Closing Sales</th>
                  <th className="p-2 text-left">Ending Balance</th>
                  {role === "admin" && <th className="p-2 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sessionsData?.data && sessionsData.data.length > 0 ? (
                  sessionsData.data.map((sess: any) => (
                    <tr key={sess._id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-bold">{sess.cashier?.name || sess.user?.name || "Operator"}</td>
                      <td className="p-2 font-mono text-xs">{new Date(sess.startTime).toLocaleString("en-IN")}</td>
                      <td className="p-2 font-mono text-xs">{sess.endTime ? new Date(sess.endTime).toLocaleString("en-IN") : "Active Session"}</td>
                      <td className="p-2">
                        <Badge variant={sess.status === "open" ? "default" : "secondary"}>
                          {sess.status}
                        </Badge>
                      </td>
                      <td className="p-2">INR {(sess.startingBalance || 0).toFixed(2)}</td>
                      <td className="p-2 font-bold text-green-600">INR {(sess.totalSales || 0).toFixed(2)}</td>
                      <td className="p-2">{sess.endingBalance !== undefined ? `INR ${sess.endingBalance.toFixed(2)}` : "-"}</td>
                      {role === "admin" && (
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 hover:bg-muted"
                            onClick={() => handleOpenEdit(sess)}
                          >
                            <Edit size={14} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={role === "admin" ? 8 : 7} className="text-center py-4 text-muted-foreground italic">No session logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedStatus
                ? `${selectedStatus.charAt(0).toUpperCase() +
                selectedStatus.slice(1)
                } Orders`
                : "All Orders"}
            </DialogTitle>
            <DialogDescription>
              Showing {filteredOrders.length} orders
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-auto flex-1">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No orders found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Table</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Total</th>
                      <th className="p-2 text-left">Payment</th>
                      <th className="p-2 text-left">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, i) => (
                      <tr
                        key={order._id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">{order.table?.name || "-"}</td>
                        <td className="p-2">
                          <Badge variant={getStatusVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="p-2 font-medium">
                          {formatPrice(order.totalPrice)}
                        </td>
                        <td className="p-2 capitalize">
                          {order.paymentMethod}
                        </td>
                        <td className="p-2">{formatDate(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() =>
                generatePDF(
                  "custom",
                  startDate,
                  endDate,
                  status,
                  summary,
                  filteredOrders
                )
              }
            >
              Export as PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Edit Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>Modify Session Details & Shift Settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Operator */}
            <div className="space-y-2">
              <Label>Cashier / Operator</Label>
              <select
                value={editCashier}
                onChange={(e) => setEditCashier(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="">Select Cashier</option>
                {staffData?.staffs?.map((u: any) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="datetime-local"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
              />
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="datetime-local"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Starting Balance */}
            <div className="space-y-2">
              <Label>Starting Balance (INR)</Label>
              <Input
                type="number"
                value={editStartingBalance}
                onChange={(e) => setEditStartingBalance(Number(e.target.value))}
              />
            </div>

            {/* Closing Sales */}
            <div className="space-y-2">
              <Label>Total Sales (INR)</Label>
              <Input
                type="number"
                value={editTotalSales}
                onChange={(e) => setEditTotalSales(Number(e.target.value))}
              />
            </div>

            {/* Ending Balance */}
            {editStatus === "closed" && (
              <div className="space-y-2">
                <Label>Ending Balance (INR)</Label>
                <Input
                  type="number"
                  value={editEndingBalance}
                  onChange={(e) => setEditEndingBalance(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 justify-between border-t">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSession}
            >
              <Trash2 size={16} className="mr-1 inline" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveSession}
              >
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SummaryManagement;

import { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  TrendingUp,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePDF } from "@/components/GeneratePdf";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useUpdateSessionMutation, useDeleteSessionMutation } from "@/services/sessionApi";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";
const token = () => localStorage.getItem("token");
const headers = () => ({ Authorization: `Bearer ${token()}` });

const COLORS = ["#F5B400", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

type FilterType = "today" | "this-week" | "this-month" | "custom";

interface OverviewData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
}

interface SalesTrendData {
  date: string;
  totalRevenue: number;
  totalOrders: number;
}

interface TopCategoryData {
  _id: string;
  categoryName: string;
  totalRevenue: number;
}

interface TopOrderData {
  _id: string;
  orderNumber: string;
  customerName?: string;
  revenue: number;
}

interface TopProductData {
  _id: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface EmployeeData {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface SessionData {
  _id: string;
  user?: { name: string; _id?: string };
  cashier?: { name: string; _id?: string };
  startTime: string;
  endTime?: string;
  status: string;
  startingBalance?: number;
  totalSales?: number;
  endingBalance?: number;
}

interface ProductData {
  _id: string;
  name: string;
}

const Reports = () => {
  const { role } = useSelector((state: RootState) => state.user);
  const [updateSession] = useUpdateSessionMutation();
  const [deleteSession] = useDeleteSessionMutation();

  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
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

  const handleOpenEdit = (sess: SessionData) => {
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
      fetchFilterOptions(); // Refresh the session list in table
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
      fetchFilterOptions(); // Refresh session list
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to delete session");
    }
  };

  const [filter, setFilter] = useState<FilterType>("today");
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [employeeId, setEmployeeId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");

  const [overview, setOverview] = useState<OverviewData>({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 });
  const [salesTrends, setSalesTrends] = useState<SalesTrendData[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategoryData[]>([]);
  const [topOrders, setTopOrders] = useState<TopOrderData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const params: any = { filter };
      if (filter === "custom") {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      if (employeeId) params.employeeId = employeeId;
      if (sessionId) params.sessionId = sessionId;
      if (productId) params.productId = productId;

      const [overviewRes, trendsRes, categoriesRes, ordersRes, productsRes] = await Promise.all([
        axios.get(`${API}/api/analytics/overview`, { headers: headers(), params }),
        axios.get(`${API}/api/analytics/sales-trends`, { headers: headers(), params }),
        axios.get(`${API}/api/analytics/top-categories`, { headers: headers(), params }),
        axios.get(`${API}/api/analytics/top-orders`, { headers: headers(), params }),
        axios.get(`${API}/api/analytics/top-products`, { headers: headers(), params })
      ]);

      setOverview(overviewRes.data.data || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 });
      setSalesTrends(trendsRes.data.data || []);
      setTopCategories(categoriesRes.data.data || []);
      setTopOrders(ordersRes.data.data || []);
      setTopProducts(productsRes.data.data || []);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [empRes, sessRes, prodRes] = await Promise.all([
        axios.get(`${API}/api/analytics/employees`, { headers: headers() }),
        axios.get(`${API}/api/analytics/sessions`, { headers: headers() }),
        axios.get(`${API}/api/analytics/products-list`, { headers: headers() })
      ]);
      setEmployees(empRes.data.data || []);
      setSessions(sessRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [filter, startDate, endDate, employeeId, sessionId, productId]);

  const formatPrice = (price?: number) => {
    const safe = typeof price === "number" && !isNaN(price) ? price : 0;
    return `INR ${safe.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let y = 20;

    // Header
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(245, 180, 0); // Golden Yellow
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ODOO COIMBATORE CAFE", pageWidth / 2, 18, { align: "center" });

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("SALES & SHIFT ANALYTICS REPORT", pageWidth / 2, 28, { align: "center" });

    y = 50;

    // Report Meta
    doc.setTextColor(10, 10, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Report Details", margin, y);
    y += 4;
    doc.setDrawColor(10, 10, 10);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, margin, y);
    doc.text(`Time Period: ${filter.toUpperCase()}`, pageWidth / 2, y);
    y += 6;

    if (filter === "custom") {
      doc.text(`Date Range: ${startDate} to ${endDate}`, margin, y);
      y += 6;
    }

    const currentEmployeeName = employees.find(e => e._id === employeeId)?.name || "All Employees";
    const currentSessionLabel = sessionId ? "Specific Session" : "All Sessions";
    const currentProductName = products.find(p => p._id === productId)?.name || "All Products";

    doc.text(`Employee: ${currentEmployeeName}`, margin, y);
    doc.text(`Product: ${currentProductName}`, pageWidth / 2, y);
    y += 6;
    doc.text(`Session: ${currentSessionLabel}`, margin, y);
    y += 12;

    // Summary Metrics
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Key Performance Metrics", margin, y);
    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: [
        ["Total Orders", String(overview.totalOrders)],
        ["Total Revenue", formatPrice(overview.totalRevenue)],
        ["Average Order Value", formatPrice(overview.avgOrderValue)]
      ],
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [245, 180, 0], textColor: [10, 10, 10], fontStyle: "bold" },
      margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Top Categories
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Top Categories Performance", margin, y);
    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["#", "Category", "Revenue"]],
      body: topCategories.map((c, i) => [
        String(i + 1),
        c.categoryName,
        formatPrice(c.totalRevenue)
      ]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [10, 10, 10], textColor: [255, 255, 255], fontStyle: "bold" },
      margin: { left: margin, right: margin }
    });

    // Add page break for products and orders
    doc.addPage();
    y = 20;

    // Top Products
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Top Products Performance", margin, y);
    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["#", "Product Name", "Quantity Sold", "Revenue"]],
      body: topProducts.map((p, i) => [
        String(i + 1),
        p.productName,
        String(p.totalQuantity),
        formatPrice(p.totalRevenue)
      ]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [10, 10, 10], textColor: [255, 255, 255], fontStyle: "bold" },
      margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Top Orders
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Top Orders (Highest Revenue)", margin, y);
    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Order #", "Customer", "Revenue"]],
      body: topOrders.map((o) => [
        o.orderNumber.slice(-8),
        o.customerName || "Walk-in",
        formatPrice(o.revenue)
      ]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [10, 10, 10], textColor: [255, 255, 255], fontStyle: "bold" },
      margin: { left: margin, right: margin }
    });

    // Page Numbers and Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      doc.text("Odoo Coimbatore Cafe - Confidential Sales Analytics", margin, pageHeight - 10);
    }

    doc.save(`Odoo_Cafe_Sales_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleExportXLS = () => {
    const headers = ["Report Metric", "Value"];
    const rows = [
      ["ODOO COIMBATORE CAFE - SALES SUMMARY REPORT", ""],
      ["Generated Date", new Date().toLocaleString("en-IN")],
      ["Time Period Filter", filter.toUpperCase()],
      filter === "custom" ? ["Date Range", `${startDate} to ${endDate}`] : [],
      employeeId ? ["Employee Filter ID", employeeId] : ["Employee Filter", "All Employees"],
      sessionId ? ["Session Filter ID", sessionId] : ["Session Filter", "All Sessions"],
      productId ? ["Product Filter ID", productId] : ["Product Filter", "All Products"],
      [],
      ["KEY METRICS", ""],
      ["Total Orders", overview.totalOrders],
      ["Total Revenue", overview.totalRevenue],
      ["Average Order Value", overview.avgOrderValue],
      [],
      ["TOP ORDERS", ""],
      ["Order ID", "Customer", "Revenue"],
      ...topOrders.map(o => [o.orderNumber, o.customerName || "Walk-in", o.revenue]),
      [],
      ["TOP PRODUCTS", ""],
      ["Product Name", "Quantity Sold", "Revenue"],
      ...topProducts.map(p => [p.productName, p.totalQuantity, p.totalRevenue]),
      [],
      ["CATEGORIES PERFORMANCE", ""],
      ["Category", "Revenue"],
      ...topCategories.map(c => [c.categoryName, c.totalRevenue])
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
      + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Odoo_Cafe_Sales_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-warm-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-deep-black pb-6">
        <div>
          <span className="bg-deep-black text-golden-yellow px-2 py-1 font-mono font-black text-xs">
            REPORTS_DASHBOARD
          </span>
          <h1 className="text-4xl font-black italic tracking-tight mt-2 text-deep-black">
            Odoo Cafe <span className="text-golden-yellow">Reports</span>
          </h1>
          <p className="font-mono text-xs text-gray-500 mt-1 uppercase tracking-widest">
            Real-time business intelligence and analytics
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={fetchAllData}
            className="bg-deep-black hover:bg-gray-800 text-white flex gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExportXLS}
            className="flex gap-2 border-green-200 text-green-700 bg-green-50/50 hover:bg-green-600 hover:text-white"
          >
            <FileSpreadsheet size={16} /> Export XLS
          </Button>
          <Button
            onClick={handleExportPDF}
            className="bg-blue-600 hover:bg-blue-700 flex gap-2"
          >
            <Download size={16} /> Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-2 border-deep-black shadow-[4px_4px_0_0_#0A0A0A]">
        <CardHeader className="flex flex-row items-center gap-3">
          <Filter className="w-6 h-6 text-golden-yellow" />
          <div>
            <CardTitle className="text-xl font-black">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Time Period</Label>
              <div className="flex flex-wrap gap-2">
                {(["today", "this-week", "this-month", "custom"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all border-2 border-deep-black ${
                      filter === f
                        ? "bg-deep-black text-golden-yellow"
                        : "bg-white text-deep-black hover:bg-gray-100"
                    }`}
                  >
                    {f.replace("-", " ")}
                  </button>
                ))}
              </div>
              {filter === "custom" && (
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">From</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">To</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Employee</Label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="border-2 border-deep-black rounded-none w-full px-3 py-2 font-mono text-sm"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Session Filter */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Session</Label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="border-2 border-deep-black rounded-none w-full px-3 py-2 font-mono text-sm"
              >
                <option value="">All Sessions</option>
                {sessions.map((sess) => (
                  <option key={sess._id} value={sess._id}>
                    {sess.cashier?.name || sess.user?.name || "Operator"} - {new Date(sess.startTime).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Filter */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Product</Label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="border-2 border-deep-black rounded-none w-full px-3 py-2 font-mono text-sm"
              >
                <option value="">All Products</option>
                {products.map((prod) => (
                  <option key={prod._id} value={prod._id}>
                    {prod.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-2 border-deep-black shadow-[4px_4px_0_0_#0A0A0A]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-golden-yellow border-2 border-deep-black flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-deep-black" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Total Orders</p>
                <p className="text-3xl font-black text-deep-black">{overview.totalOrders}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-2 border-deep-black shadow-[4px_4px_0_0_#0A0A0A]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-golden-yellow border-2 border-deep-black flex items-center justify-center">
                <FileText className="w-6 h-6 text-deep-black" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Total Revenue</p>
                <p className="text-3xl font-black text-deep-black">{formatPrice(overview.totalRevenue)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-2 border-deep-black shadow-[4px_4px_0_0_#0A0A0A]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-golden-yellow border-2 border-deep-black flex items-center justify-center">
                <Calendar className="w-6 h-6 text-deep-black" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Avg Order Value</p>
                <p className="text-3xl font-black text-deep-black">{formatPrice(overview.avgOrderValue)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <Card className="border-2 border-deep-black shadow-[4px_4px_0_0_#0A0A0A]">
          <CardHeader>
            <CardTitle className="text-xl font-black">Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ border: "2px solid #0A0A0A", borderRadius: 0, fontFamily: "monospace", fontSize: 12 }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalRevenue"
                  name="Revenue"
                  stroke="#F5B400"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#0A0A0A", strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalOrders"
                  name="Orders"
                  stroke="#0A0A0A"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#F5B400", strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Categories Chart */}
        <Card className="border-2 border-deep-black shadow-[4px_4px_0_0_#0A0A0A]">
          <CardHeader>
            <CardTitle className="text-xl font-black">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ categoryName, percent }) => `${categoryName} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="totalRevenue"
                >
                  {topCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatPrice(value), "Revenue"]}
                  contentStyle={{ border: "2px solid #0A0A0A", borderRadius: 0, fontFamily: "monospace", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Orders */}
        <Card className="border-2 border-deep-black shadow-[4px_4px_0_0_#0A0A0A]">
          <CardHeader>
            <CardTitle className="text-xl font-black">Top Orders</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-deep-black">
                  <th className="text-left py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Order #</th>
                  <th className="text-left py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Customer</th>
                  <th className="text-right py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topOrders.map((order, i) => (
                  <tr key={order._id} className="border-b border-gray-200">
                    <td className="py-2 px-1 font-bold">{order.orderNumber.slice(-8)}</td>
                    <td className="py-2 px-1">{order.customerName || "Walk-in"}</td>
                    <td className="py-2 px-1 text-right font-bold">{formatPrice(order.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border-2 border-deep-black shadow-[4px_4px_0_0_#0A0A0A] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-black">Top Products</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-deep-black">
                  <th className="text-left py-2 px-1 font-mono text-[10px] uppercase tracking-widest">#</th>
                  <th className="text-left py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Product Name</th>
                  <th className="text-right py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Quantity Sold</th>
                  <th className="text-right py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, i) => (
                  <tr key={product._id} className="border-b border-gray-200">
                    <td className="py-2 px-1 font-bold text-golden-yellow">{i + 1}</td>
                    <td className="py-2 px-1 font-bold">{product.productName}</td>
                    <td className="py-2 px-1 text-right font-bold">{product.totalQuantity}</td>
                    <td className="py-2 px-1 text-right font-bold">{formatPrice(product.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories Table */}
      <Card className="border-2 border-deep-black shadow-[4px_4px_0_0_#0A0A0A]">
        <CardHeader>
          <CardTitle className="text-xl font-black">Categories Performance</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-deep-black">
                <th className="text-left py-2 px-1 font-mono text-[10px] uppercase tracking-widest">#</th>
                <th className="text-left py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Category</th>
                <th className="text-right py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topCategories.map((category, i) => (
                <tr key={category._id} className="border-b border-gray-200">
                  <td className="py-2 px-1 font-bold text-golden-yellow">{i + 1}</td>
                  <td className="py-2 px-1 font-bold">{category.categoryName}</td>
                  <td className="py-2 px-1 text-right font-bold">{formatPrice(category.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Session History & Shift Audits */}
      <Card className="border-2 border-deep-black shadow-[4px_4px_0_0_#0A0A0A] mt-6">
        <CardHeader>
          <CardTitle className="text-xl font-black">Session History & Shift Audits</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-deep-black">
                <th className="text-left py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Cashier</th>
                <th className="text-left py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Start Time</th>
                <th className="text-left py-2 px-1 font-mono text-[10px] uppercase tracking-widest">End Time</th>
                <th className="text-center py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Status</th>
                <th className="text-right py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Starting Balance</th>
                <th className="text-right py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Closing Sales</th>
                <th className="text-right py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Ending Balance</th>
                {role === "admin" && (
                  <th className="text-center py-2 px-1 font-mono text-[10px] uppercase tracking-widest">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sessions && sessions.length > 0 ? (
                sessions.map((sess) => (
                  <tr key={sess._id} className="border-b border-gray-200">
                    <td className="py-2 px-1 font-bold">{sess.cashier?.name || sess.user?.name || "Operator"}</td>
                    <td className="py-2 px-1 font-mono text-xs">{new Date(sess.startTime).toLocaleString("en-IN")}</td>
                    <td className="py-2 px-1 font-mono text-xs">{sess.endTime ? new Date(sess.endTime).toLocaleString("en-IN") : "Active Session"}</td>
                    <td className="py-2 px-1 text-center font-bold">
                      <span className={`px-2 py-1 font-mono text-[9px] uppercase tracking-widest border-2 border-deep-black ${
                        sess.status === "open" ? "bg-golden-yellow text-deep-black" : "bg-deep-black text-warm-white"
                      }`}>
                        {sess.status}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-right">INR {(sess.startingBalance || 0).toFixed(2)}</td>
                    <td className="py-2 px-1 text-right font-bold text-green-600">INR {(sess.totalSales || 0).toFixed(2)}</td>
                    <td className="py-2 px-1 text-right">{sess.endingBalance !== undefined ? `INR ${sess.endingBalance.toFixed(2)}` : "-"}</td>
                    {role === "admin" && (
                      <td className="py-2 px-1 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 hover:bg-gray-200 border border-transparent hover:border-deep-black"
                          onClick={() => handleOpenEdit(sess)}
                        >
                          <Edit size={14} className="text-deep-black" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={role === "admin" ? 8 : 7} className="text-center py-4 text-gray-500 italic">No session logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Session Edit Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-warm-white border-4 border-deep-black shadow-[8px_8px_0_0_#0A0A0A] max-w-md p-6 font-sans text-deep-black">
          <DialogHeader className="border-b-2 border-deep-black pb-4">
            <DialogTitle className="text-2xl font-black italic uppercase">
              Edit Session
            </DialogTitle>
            <DialogDescription className="font-mono text-xs uppercase tracking-widest text-gray-500">
              Modify Session Details & Shift Settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Operator */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Cashier / Operator</Label>
              <select
                value={editCashier}
                onChange={(e) => setEditCashier(e.target.value)}
                className="border-2 border-deep-black rounded-none w-full px-3 py-2 font-mono text-sm bg-white"
              >
                <option value="">Select Cashier</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Start Time</Label>
              <Input
                type="datetime-local"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="border-2 border-deep-black rounded-none font-mono text-sm"
              />
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">End Time</Label>
              <Input
                type="datetime-local"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="border-2 border-deep-black rounded-none font-mono text-sm"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Status</Label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="border-2 border-deep-black rounded-none w-full px-3 py-2 font-mono text-sm bg-white"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Starting Balance */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Starting Balance (INR)</Label>
              <Input
                type="number"
                value={editStartingBalance}
                onChange={(e) => setEditStartingBalance(Number(e.target.value))}
                className="border-2 border-deep-black rounded-none font-mono text-sm"
              />
            </div>

            {/* Closing Sales */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Total Sales (INR)</Label>
              <Input
                type="number"
                value={editTotalSales}
                onChange={(e) => setEditTotalSales(Number(e.target.value))}
                className="border-2 border-deep-black rounded-none font-mono text-sm"
              />
            </div>

            {/* Ending Balance */}
            {editStatus === "closed" && (
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest">Ending Balance (INR)</Label>
                <Input
                  type="number"
                  value={editEndingBalance}
                  onChange={(e) => setEditEndingBalance(Number(e.target.value))}
                  className="border-2 border-deep-black rounded-none font-mono text-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t-2 border-deep-black pt-4 justify-between">
            <Button
              type="button"
              onClick={handleDeleteSession}
              className="bg-red-600 hover:bg-red-700 text-white font-black uppercase border-2 border-deep-black shadow-[2px_2px_0_0_#000] hover:shadow-none transition-all"
            >
              <Trash2 size={16} className="mr-1 inline" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="border-2 border-deep-black rounded-none font-black uppercase"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveSession}
                className="bg-golden-yellow hover:bg-yellow-500 text-deep-black font-black uppercase border-2 border-deep-black shadow-[2px_2px_0_0_#000] hover:shadow-none transition-all"
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

export default Reports;

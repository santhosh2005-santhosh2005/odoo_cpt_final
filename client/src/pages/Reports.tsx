import { useState, useEffect } from "react";
import axios from "axios";
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
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePDF } from "@/components/GeneratePdf";

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
  user: { name: string };
  startTime: string;
  status: string;
}

interface ProductData {
  _id: string;
  name: string;
}

const Reports = () => {
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
    // Using existing generatePDF with dummy data for now (can enhance later)
    generatePDF(
      filter,
      startDate,
      endDate,
      "all",
      { totalOrders: overview.totalOrders, totalSales: overview.totalRevenue },
      []
    );
  };

  const handleExportXLS = () => {
    const headers = ["Report Data", "Value"];
    const rows = [
      ["Total Orders", overview.totalOrders],
      ["Total Revenue", overview.totalRevenue],
      ["Average Order Value", overview.avgOrderValue],
      [],
      ["Top Products", ""],
      ["Product Name", "Quantity Sold", "Revenue"],
      ...topProducts.map(p => [p.productName, p.totalQuantity, p.totalRevenue])
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Odoo_Cafe_Report_${new Date().toISOString().split("T")[0]}.csv`);
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
                    {sess.user.name} - {new Date(sess.startTime).toLocaleDateString()}
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
    </div>
  );
};

export default Reports;

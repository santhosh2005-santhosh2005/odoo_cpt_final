import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface OrderItemPayload {
  productId: string;
  quantity: number;
  size: string;
  price: number;
}

export interface CreateOrderPayload {
  items: OrderItemPayload[];
  paymentMethod: "cash" | "card" | "online" | "upi" | "digital";
  tableId?: string;
  customerId?: string;
  employeeId?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  totalAmount?: number;
}

export interface UpdateOrderPayload {
  status?: "draft" | "pending" | "preparing" | "ready" | "served" | "cancelled" | "completed" | "paid";
  paymentMethod?: "cash" | "card" | "online" | "upi" | "digital";
  tableId?: string;
  customerId?: string;
  employeeId?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  totalAmount?: number;
}

// Define the Order type to be used in the allData object
interface Order {
  _id: string;
  orderNumber?: string;
  customOrderID?: string;
  table?: { tableNumber: string };
  tableId?: any;
  status: string;
  totalPrice: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  totalAmount?: number;
  paymentMethod: string;
  createdAt: string;
  customerId?: any;
  employeeId?: any;
  items?: any[];
}

// Define the StatusBreakdown type
export interface StatusBreakdown {
  _id: "pending" | "preparing" | "ready" | "served" | "cancelled" | "completed" | "paid" | "draft";
  count: number;
}

// Define the AllData type
export interface AllData {
  pending?: Order[];
  preparing?: Order[];
  served?: Order[];
  cancelled?: Order[];
  draft?: Order[];
  paid?: Order[];
}

// 📊 Corrected Sales Summary Response type to match API response
export interface SalesSummaryResponse {
  summary: {
    totalOrders: number;
    totalSales: number;
  };
  statusBreakdown: StatusBreakdown[];
  allData: AllData;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001";

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: fetchBaseQuery({ 
    baseUrl: baseUrl + "/api/orders",
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Orders", "Summary", "Chart"],
  endpoints: (builder) => ({
    createOrder: builder.mutation({
      query: (order) => ({
        url: "/",
        method: "POST",
        body: order,
      }),
      invalidatesTags: ["Orders", "Summary"],
    }),

    // Get all orders
    getOrders: builder.query<
      {
        data: Order[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      },
      {
        page?: number;
        limit?: number;
        status?: string;
        tableId?: string;
        startDate?: string;
        endDate?: string;
        orderId?: string;
      }
    >({
      query: ({
        page = 1,
        limit = 10,
        status,
        tableId,
        startDate,
        endDate,
        orderId,
      } = {}) => {
        let url = `/?page=${page}&limit=${limit}`;
        if (status) url += `&status=${status}`;
        if (tableId) url += `&tableId=${tableId}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        if (orderId) url += `&orderId=${orderId}`;
        return url;
      },
      providesTags: ["Orders"],
    }),

    // Search orders
    searchOrders: builder.query<any, { search?: string; status?: string }>({
      query: ({ search, status }) => {
        let url = `/search?`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (status) url += `status=${status}`;
        return url;
      },
      providesTags: ["Orders"],
    }),

    // Get order by ID
    getOrderById: builder.query({
      query: (id) => `/${id}`,
      providesTags: ["Orders"],
    }),

    // Update order
    updateOrder: builder.mutation({
      query: ({ id, body }) => ({
        url: `/${id}`,
        method: "PUT",
        body: body,
      }),
      invalidatesTags: ["Orders", "Summary"],
    }),

    // Delete order
    deleteOrder: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Orders", "Summary"],
    }),

    // Cancel order
    cancelOrder: builder.mutation<any, string>({
      query: (id) => ({
        url: `/${id}/cancel`,
        method: "PUT",
      }),
      invalidatesTags: ["Orders", "Summary"],
    }),

    getSalesSummary: builder.query<
      SalesSummaryResponse,
      {
        startDate: string;
        endDate: string;
        status?: string;
        search?: string;
        sessionId?: string;
        responsibleStaff?: string;
        productId?: string;
      }
    >({
      query: ({ startDate, endDate, status, search, sessionId, responsibleStaff, productId }) => {
        let url = `/summary/report?`;

        url += `startDate=${startDate}&endDate=${endDate}&`;

        if (status && status !== "all") {
          url += `status=${status}&`;
        }

        if (search) {
          url += `search=${encodeURIComponent(search)}&`;
        }

        if (sessionId && sessionId !== "all") {
          url += `sessionId=${sessionId}&`;
        }

        if (responsibleStaff && responsibleStaff !== "all") {
          url += `responsibleStaff=${responsibleStaff}&`;
        }

        if (productId && productId !== "all") {
          url += `productId=${productId}&`;
        }

        return url;
      },
      providesTags: ["Summary"],
    }),

    getSalesByDateRange: builder.query<
      { success: boolean; data: { date: string; totalSales: number }[] },
      { startDate: string; endDate: string }
    >({
      query: ({ startDate, endDate }) =>
        `/sales/last-7-days?startDate=${encodeURIComponent(
          startDate
        )}&endDate=${encodeURIComponent(endDate)}`,
      providesTags: ["Chart"],
    }),

    // ── REAL-TIME ITEM STATUS ─────────────────────────────────────────────
    updateItemStatus: builder.mutation<
      any,
      { orderId: string; itemId: string; itemStatus: string }
    >({
      query: ({ orderId, itemId, itemStatus }) => ({
        url: `/${orderId}/items/${itemId}/status`,
        method: "PATCH",
        body: { itemStatus },
      }),
      invalidatesTags: ["Orders", "Summary"],
    }),
    confirmDraftOrder: builder.mutation<any, string>({
      query: (id) => ({
        url: `/${id}/confirm`,
        method: "PATCH",
      }),
      invalidatesTags: ["Orders", "Summary"],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrdersQuery,
  useSearchOrdersQuery,
  useGetOrderByIdQuery,
  useUpdateOrderMutation,
  useDeleteOrderMutation,
  useCancelOrderMutation,
  useGetSalesSummaryQuery,
  useGetSalesByDateRangeQuery,
  useUpdateItemStatusMutation,
  useConfirmDraftOrderMutation,
} = orderApi;

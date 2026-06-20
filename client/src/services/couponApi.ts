import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export const couponApi = createApi({
  reducerPath: "couponApi",
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Coupon", "Promotion"],
  endpoints: (builder) => ({
    getCoupons: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => "/api/coupons",
      providesTags: ["Coupon"],
    }),
    createCoupon: builder.mutation<any, Partial<any>>({
      query: (body) => ({
        url: "/api/coupons",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Coupon"],
    }),
    updateCoupon: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/api/coupons/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Coupon"],
    }),
    deleteCoupon: builder.mutation<any, string>({
      query: (id) => ({
        url: `/api/coupons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Coupon"],
    }),
    validateCoupon: builder.mutation<{ success: boolean; status: string; message: string; data?: any }, { couponCode: string; orderAmount: number; userId?: string; productIds?: string[]; categoryIds?: string[] }>({
      query: (body) => ({
        url: "/api/coupons/validate",
        method: "POST",
        body,
      }),
    }),
    getCouponAnalytics: builder.query<any, void>({
      query: () => "/api/coupons/analytics",
    }),
    getPromotions: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => "/api/promotions",
      providesTags: ["Promotion"],
    }),
    createPromotion: builder.mutation<any, Partial<any>>({
      query: (body) => ({
        url: "/api/promotions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Promotion"],
    }),
    updatePromotion: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/api/promotions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Promotion"],
    }),
    deletePromotion: builder.mutation<any, string>({
      query: (id) => ({
        url: `/api/promotions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Promotion"],
    }),
    getPromotionAnalytics: builder.query<any, void>({
      query: () => "/api/promotions/analytics",
    }),
  }),
});

export const {
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  useValidateCouponMutation,
  useGetCouponAnalyticsQuery,
  useGetPromotionsQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useDeletePromotionMutation,
  useGetPromotionAnalyticsQuery,
} = couponApi;

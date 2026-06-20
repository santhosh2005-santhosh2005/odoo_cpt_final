import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001";

export const receiptApi = createApi({
  reducerPath: "receiptApi",
  baseQuery: fetchBaseQuery({ 
    baseUrl: baseUrl + "/api/receipts",
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    downloadReceipt: builder.mutation<Blob, string>({
      query: (orderId) => ({
        url: `/download/${orderId}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    emailReceipt: builder.mutation({
      query: ({ orderId, recipientEmail }) => ({
        url: "/email",
        method: "POST",
        body: { orderId, recipientEmail },
      }),
    }),
  }),
});

export const { useDownloadReceiptMutation, useEmailReceiptMutation } = receiptApi;

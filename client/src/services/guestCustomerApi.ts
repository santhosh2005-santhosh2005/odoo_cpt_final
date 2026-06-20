import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export interface GuestCustomerIdentifyRequest {
  phone: string;
  email: string;
  name?: string;
}

export interface GuestCustomerIdentifyResponse {
  success: boolean;
  isNewCustomer: boolean;
  data: {
    _id: string;
    phone: string;
    email: string;
    visitCount: number;
    name?: string;
  };
  message: string;
}

export const guestCustomerApi = createApi({
  reducerPath: "guestCustomerApi",
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: (builder) => ({
    identifyGuestCustomer: builder.mutation<
      GuestCustomerIdentifyResponse,
      GuestCustomerIdentifyRequest
    >({
      query: (body) => ({
        url: "/api/guest-customers/identify",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useIdentifyGuestCustomerMutation } = guestCustomerApi;

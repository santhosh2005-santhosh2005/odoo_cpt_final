import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const sessionApi = createApi({
  reducerPath: "sessionApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/sessions`,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Session"],
  endpoints: (builder) => ({
    getSessions: builder.query<any, void>({
      query: () => "/",
      providesTags: ["Session"],
    }),
    getActiveSession: builder.query<any, void>({
      query: () => "/active",
      providesTags: ["Session"],
    }),
    openSession: builder.mutation<any, { startingBalance: number }>({
      query: (body) => ({
        url: "/open",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Session"],
    }),
    closeSession: builder.mutation<any, { id: string; endingBalance: number }>({
      query: ({ id, endingBalance }) => ({
        url: `/close/${id}`,
        method: "POST",
        body: { endingBalance },
      }),
      invalidatesTags: ["Session"],
    }),
    getSessionSummary: builder.query<any, string>({
      query: (id) => `/summary/${id}`,
      providesTags: ["Session"],
    }),
    updateSession: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Session"],
    }),
    deleteSession: builder.mutation<any, string>({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Session"],
    }),
  }),
});

export const {
  useGetSessionsQuery,
  useGetActiveSessionQuery,
  useOpenSessionMutation,
  useCloseSessionMutation,
  useGetSessionSummaryQuery,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
} = sessionApi;

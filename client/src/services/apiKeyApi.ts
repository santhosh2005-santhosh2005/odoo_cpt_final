import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export const apiKeyApi = createApi({
  reducerPath: "apiKeyApi",
  baseQuery: fetchBaseQuery({
    baseUrl: baseUrl + "/api/keys",
    prepareHeaders: (headers, { getState }) => {
      const token =
        (getState() as any).user?.token || localStorage.getItem("token");
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["ApiKey"],
  endpoints: (builder) => ({
    getApiKeys: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => "/",
      providesTags: ["ApiKey"],
    }),
    createApiKey: builder.mutation<any, { name: string; scopes: string[]; expiresAt?: string }>({
      query: (body) => ({ url: "/", method: "POST", body }),
      invalidatesTags: ["ApiKey"],
    }),
    revokeApiKey: builder.mutation<any, string>({
      query: (id) => ({ url: `/${id}/revoke`, method: "PATCH" }),
      invalidatesTags: ["ApiKey"],
    }),
    deleteApiKey: builder.mutation<any, string>({
      query: (id) => ({ url: `/${id}`, method: "DELETE" }),
      invalidatesTags: ["ApiKey"],
    }),
  }),
});

export const {
  useGetApiKeysQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
  useDeleteApiKeyMutation,
} = apiKeyApi;

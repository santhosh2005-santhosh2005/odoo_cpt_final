
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const apiRoot = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001";

export const selfOrderingSettingsApi = createApi({
  reducerPath: "selfOrderingSettingsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: apiRoot,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["SelfOrderingSettings"],
  endpoints: (builder) => ({
    getSelfOrderingSettings: builder.query<any, void>({
      query: () => "/api/self-ordering-settings",
      providesTags: ["SelfOrderingSettings"],
    }),
    updateSelfOrderingSettings: builder.mutation<any, Partial<any>>({
      query: (body) => ({
        url: "/api/self-ordering-settings",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SelfOrderingSettings"],
    }),
  }),
});

export const { useGetSelfOrderingSettingsQuery, useUpdateSelfOrderingSettingsMutation } = selfOrderingSettingsApi;

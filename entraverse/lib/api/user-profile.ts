import type { AxiosResponse } from "axios";
import client from "@/lib/api/client";
import type { ApiResponse } from "@/types/auth.types";
import type { UserProfile } from "@/lib/api/types/user-profile.types";

const PROFILE_ENDPOINT = "/user";
const PROFILE_UPDATE_ENDPOINT = "/user/update";

export const userProfileApi = {
  async getProfile(signal?: AbortSignal): Promise<UserProfile> {
    const response = await client.get<ApiResponse<UserProfile>>(PROFILE_ENDPOINT, { signal });
    return response.data.data;
  },

  async updateProfile(formData: FormData): Promise<UserProfile> {
    formData.append("_method", "PUT");

    const response: AxiosResponse<ApiResponse<UserProfile>> = await client.post(PROFILE_UPDATE_ENDPOINT, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.data;
  },
};

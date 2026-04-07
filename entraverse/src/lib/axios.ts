import axios from "axios";
import { API_BASE_URL } from "@/lib/api-config";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

export default api;

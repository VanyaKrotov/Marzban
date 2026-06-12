import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { getAuthToken } from "utils/authStorage";

type DataAxiosInstance = Omit<
  AxiosInstance,
  "request" | "get" | "delete" | "head" | "options" | "post" | "put" | "patch"
> & {
  request<T = unknown, D = unknown>(
    config: AxiosRequestConfig<D>
  ): Promise<T>;
  get<T = unknown, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<T>;
  delete<T = unknown, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<T>;
  head<T = unknown, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<T>;
  options<T = unknown, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<T>;
  post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<T>;
  put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<T>;
  patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<T>;
};

const createClient = (authenticated: boolean): DataAxiosInstance => {
  const client = axios.create({
    baseURL: import.meta.env.VITE_BASE_API,
  });

  if (authenticated) {
    client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      }
    );
  }

  client.interceptors.response.use(
    (response: AxiosResponse) => response.data
  );

  return client as DataAxiosInstance;
};

export const api = createClient(true);
export const publicApi = createClient(false);

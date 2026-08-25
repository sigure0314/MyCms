import axios from 'axios';
import type { MenuItem } from '../types/posAsyncKitchen';

// 1. 定義並匯出型別 (DTO)
// 這樣 StoryGenerator.tsx 就可以 import 這個 interface 來用
export interface CreateStoryRequest {
  topic: string;
  pages: number;
  age: string;
}
// 定義資料型別
export interface GenerateScriptRequest {
  topic: string;
  pages: number;
  age: string;
}

export interface StoryPageDto {
  pageIndex: number;
  content: string;
  imagePrompt: string;
}

export interface StoryDraft {
  title: string;
  summary: string;
  pages: StoryPageDto[];
}

export type InstagramPostStatus = 'PendingReview' | 'Approved' | 'Rejected' | 'Published';

export interface InstagramPost {
  id: number;
  caption: string;
  status: InstagramPostStatus;
  imageUrl: string;
  createdAt: string;
  updatedAt?: string;
  scheduledAt?: string;
  publishedAt?: string;
}

export interface UpdateInstagramPostRequest {
  caption?: string;
  status?: InstagramPostStatus;
  scheduledAt?: string;
}

export interface Role {
  id: number;
  name: string;
  userCount: number;
}

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  role: string;
  roleId: number;
}

export interface OnlineUser {
  username: string;
  totalSeconds: number;
  currentPage: string;
  loginIp: string;
  loginAtUtc: string;
  lastSeenUtc: string;
}

export interface Permission {
  id: number;
  parentId?: number | null;
  code: string;
  name: string;
  type: number;
  routePath?: string | null;
  apiMethod?: string | null;
  apiPath?: string | null;
  icon?: string | null;
  sortOrder: number;
  isEnabled: boolean;
}

export interface CreateMenuItemRequest {
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface UpdateMenuItemRequest {
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  roleId: number;
}

export interface UpdateUserRequest {
  username: string;
  email: string;
  roleId: number;
  password?: string;
}

export interface FramePlaylistSettings {
  layoutMode: string;
  intervalMs: number;
  transitionMs: number;
  cacheBustMode: string;
  startAtEpochMs: number;
  version: number;
}

export interface FramePlaylistItem {
  id: string;
  fileName: string;
  originalFileName: string;
  order: number;
  version: number;
  imageUrl: string;
}

export interface FramePlaylistAdminResponse {
  settings: FramePlaylistSettings;
  items: FramePlaylistItem[];
}

export interface FramePlaylistItemOrder {
  id: string;
  order: number;
}

export interface FramePlaylistUpdateRequest {
  layoutMode: string;
  items: FramePlaylistItemOrder[];
}


export type PropertyCategory = 1 | 2 | 3 | 4;

export interface PropertyArea {
  id: number;
  name: string;
  location: string;
  category: PropertyCategory;
  categoryName: string;
  qrToken: string;
  qrCodePayload: string;
  qrCodeImageUrl: string;
  createdAtUtc: string;
}

export interface PropertyDashboardSummary {
  dateUtc: string;
  todayCompletedCount: number;
  categoryStats: Record<string, number>;
  recentActivities: PropertyCheckInHistoryItem[];
}

export interface PropertyCheckInHistoryItem {
  logId: number;
  areaId: number;
  areaName: string;
  location: string;
  category: PropertyCategory;
  categoryName: string;
  username: string;
  checkInAtUtc: string;
  note?: string;
}

export interface PropertyCheckInHistoryResponse {
  totalCount: number;
  items: PropertyCheckInHistoryItem[];
}

export interface CreatePropertyAreaRequest {
  name: string;
  location: string;
  category: PropertyCategory;
}

export interface PropertyCheckInRequest {
  qrToken: string;
  note?: string;
}

export interface PropertyCheckInResponse {
  logId: number;
  areaId: number;
  areaName: string;
  category: PropertyCategory;
  categoryName: string;
  checkInAtUtc: string;
  username: string;
}

export interface LiveKitTokenRequest {
  roomName: string;
  participantName?: string;
}


export interface TaiwanStockKLinePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TaiwanStockKLineResponse {
  stockNo: string;
  data: TaiwanStockKLinePoint[];
}

export interface TaiwanStockOpenDataSnapshot {
  stockNo: string;
  name: string;
  market: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  turnover: number;
  peRatio?: number | null;
  pbRatio?: number | null;
  dividendYield?: number | null;
  updatedAt: string;
  source: string;
}

export interface TaiwanInstitutionalTradingSnapshot {
  stockNo: string;
  name: string;
  tradeDate?: string | null;
  foreignInvestorBuy: number;
  foreignInvestorSell: number;
  foreignInvestorNet: number;
  investmentTrustBuy: number;
  investmentTrustSell: number;
  investmentTrustNet: number;
  dealerBuy: number;
  dealerSell: number;
  dealerNet: number;
  totalNet: number;
  source: string;
}


export interface YoutubeComment {
  id: string;
  videoId: string;
  author: string;
  content: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
}

export interface FetchYoutubeCommentsResponse {
  tempFileId: string;
  pageCount: number;
  totalCount: number;
  comments: YoutubeComment[];
}

export interface FetchYoutubeCommentsRequest {
  videoInput: string;
}
export interface LiveKitTokenResponse {
  token: string;
  serverUrl: string;
  roomName: string;
  participantName: string;
}

// 2. 設定 Base URL
// 建議：正式開發時將 URL 放到 .env 檔案 (例如 import.meta.env.VITE_API_URL)
// 先以環境變數為主，沒有設定時維持你原本的 dev URL
export const normalizeApiBaseUrl = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '/api';
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const FALLBACK_BASE_URL = import.meta.env.PROD
  ? '/api'
  : 'https://ideal-goggles-rwvj9vg75qph54gg-5250.app.github.dev/api';

const BASE_URL = import.meta.env.VITE_API_URL ?? FALLBACK_BASE_URL;

const axiosInstance = axios.create({ 
    baseURL: BASE_URL 
});

export const getApiBaseUrl = () => normalizeApiBaseUrl(axiosInstance.defaults.baseURL);

let pendingRequests = 0;

const notifyLoadingChange = () => {
  window.dispatchEvent(new CustomEvent('api:loading', { detail: pendingRequests }));
};

const startLoading = () => {
  pendingRequests += 1;
  notifyLoadingChange();
};

const stopLoading = () => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  notifyLoadingChange();
};

// 3. Request Interceptor: 注入 Token
axiosInstance.interceptors.request.use((config) => {
  startLoading();
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  stopLoading();
  return Promise.reject(error);
});

// 4. Response Interceptor: 僅在「已登入狀態失效」時導回登入頁
axiosInstance.interceptors.response.use(
    res => {
        stopLoading();
        return res;
    },
    err => {
        stopLoading();
        const requestUrl = err.config?.url ?? '';
        const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/guest');
        const hasToken = Boolean(localStorage.getItem('token'));

        // 未登入訪客遇到 401 不應被強制導到 /login，避免阻斷匿名瀏覽
        if (err.response && err.response.status === 401 && !isAuthRequest && hasToken) {
            const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            if (returnPath.startsWith('/') && !returnPath.startsWith('//')) {
              sessionStorage.setItem('authReturnPath', returnPath);
            }
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('permissionRoutes');
            window.location.replace(`/login?returnUrl=${encodeURIComponent(returnPath)}`);
        }
        return Promise.reject(err);
    }
);

// 5. 封裝並匯出 API 物件
const api = {
  // 保留原始 axios 方法，讓其他既有程式碼 (api.get, api.post) 可以繼續運作
  get: axiosInstance.get,
  post: axiosInstance.post,
  put: axiosInstance.put,
  delete: axiosInstance.delete,
  patch: axiosInstance.patch,
  
  // 暴露原始 instance (以備不時之需)
  defaults: axiosInstance.defaults,

  // --- 專屬業務邏輯 API ---

  // ✨ 新增：呼叫 AI 生成童書
  generateStory: (data: CreateStoryRequest) => {
    // 特別設定 timeout 為 120 秒 (120000ms)，因為 AI 生成圖片非常耗時
    // 如果沒有設這個，axios 預設可能 10 秒就 timeout 報錯了
    return axiosInstance.post('/story/generate', data, { timeout: 120000 });
  },
  // 1. 取得草稿 (文字)
  generateDraft: (data: GenerateScriptRequest) => {
    return axiosInstance.post<StoryDraft>('/story/draft', data);
  },

  // 2. 正式生成 (圖片+存檔)
  finalizeStory: (data: StoryDraft) => {
    return axiosInstance.post('/story/finalize', data, { timeout: 180000 }); // 給 3 分鐘
  },
  getInstagramPosts: () => {
    return axiosInstance.get<InstagramPost[]>('/instagramposts');
  },
  createInstagramPost: (data: FormData) => {
    return axiosInstance.post<InstagramPost>('/instagramposts', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateInstagramPost: (id: number, data: UpdateInstagramPostRequest) => {
    return axiosInstance.put<InstagramPost>(`/instagramposts/${id}`, data);
  },
  publishInstagramPostNow: (id: number) => {
    return axiosInstance.post<InstagramPost>(`/instagramposts/${id}/publish`);
  },
  getRoles: () => {
    return axiosInstance.get<Role[]>('/roles');
  },
  createRole: (name: string) => {
    return axiosInstance.post<Role>('/roles', { name });
  },
  updateRole: (id: number, name: string) => {
    return axiosInstance.put<Role>(`/roles/${id}`, { name });
  },
  deleteRole: (id: number) => {
    return axiosInstance.delete(`/roles/${id}`);
  },
  getUsers: () => {
    return axiosInstance.get<UserSummary[]>('/users');
  },
  getOnlineUsers: () => {
    return axiosInstance.get<OnlineUser[]>('/onlineusers');
  },
  heartbeatOnlineUser: (currentPage: string) => {
    return axiosInstance.post('/onlineusers/heartbeat', { currentPage });
  },
  updateUserRole: (id: number, roleId: number) => {
    return axiosInstance.patch<UserSummary>(`/users/${id}/role`, { roleId });
  },
  createUser: (data: CreateUserRequest) => {
    return axiosInstance.post<UserSummary>('/users', data);
  },
  updateUser: (id: number, data: UpdateUserRequest) => {
    return axiosInstance.put<UserSummary>(`/users/${id}`, data);
  },
  getPermissions: () => {
    return axiosInstance.get<Permission[]>('/permissions');
  },
  createPermission: (data: Omit<Permission, 'id'>) => {
    return axiosInstance.post<Permission>('/permissions', data);
  },
  updatePermission: (id: number, data: Omit<Permission, 'id'>) => {
    return axiosInstance.put<Permission>(`/permissions/${id}`, data);
  },
  deletePermission: (id: number) => {
    return axiosInstance.delete(`/permissions/${id}`);
  },
  getRolePermissions: (roleId: number) => {
    return axiosInstance.get<number[]>(`/roles/${roleId}/permissions`);
  },
  updateRolePermissions: (roleId: number, permissionIds: number[]) => {
    return axiosInstance.put(`/roles/${roleId}/permissions`, { permissionIds });
  },
  getMenuItems: () => {
    return axiosInstance.get<MenuItem[]>('/menu');
  },
  createMenuItem: (data: CreateMenuItemRequest) => {
    return axiosInstance.post<MenuItem>('/menu', data);
  },
  updateMenuItem: (id: number, data: UpdateMenuItemRequest) => {
    return axiosInstance.put<MenuItem>(`/menu/${id}`, data);
  },
  deleteMenuItem: (id: number) => {
    return axiosInstance.delete(`/menu/${id}`);
  },
  getFramePlaylistAdmin: () => {
    return axiosInstance.get<FramePlaylistAdminResponse>('/frame/admin');
  },
  updateFramePlaylist: (data: FramePlaylistUpdateRequest) => {
    return axiosInstance.put<FramePlaylistAdminResponse>('/frame/playlist', data);
  },
  uploadFrameImage: (data: FormData) => {
    return axiosInstance.post<FramePlaylistAdminResponse>('/frame/images', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteFrameItem: (id: string) => {
    return axiosInstance.delete<FramePlaylistAdminResponse>(`/frame/items/${id}`);
  },

  getPropertyAreas: () => {
    return axiosInstance.get<PropertyArea[]>('/property-management/areas');
  },
  createPropertyArea: (data: CreatePropertyAreaRequest) => {
    return axiosInstance.post<PropertyArea>('/property-management/areas', data);
  },
  propertyCheckIn: (data: PropertyCheckInRequest) => {
    return axiosInstance.post<PropertyCheckInResponse>('/property-management/checkin', data);
  },
  getPropertyDashboard: () => {
    return axiosInstance.get<PropertyDashboardSummary>('/property-management/dashboard');
  },
  getPropertyHistory: (params: {
    page?: number;
    pageSize?: number;
    category?: PropertyCategory;
    username?: string;
  }) => {
    return axiosInstance.get<PropertyCheckInHistoryResponse>('/property-management/history', { params });
  },

  createLiveKitToken: (data: LiveKitTokenRequest) => {
    return axiosInstance.post<LiveKitTokenResponse>('/livekit/token', data);
  },
  getStockChart: (stockNo: string) => {
    return axiosInstance.get<TaiwanStockKLineResponse>(`/stocks/${stockNo}`);
  },
  getStockDashboard: (stockNo: string) => {
    return axiosInstance.get<TaiwanStockOpenDataSnapshot>(`/stocks/${stockNo}/dashboard`);
  },
  getInstitutionalTrading: (stockNo: string) => {
    return axiosInstance.get<TaiwanInstitutionalTradingSnapshot>(`/stocks/${stockNo}/institutional-trading`);
  },

  fetchYoutubeComments: () => {
    return axiosInstance.get<FetchYoutubeCommentsResponse>('/youtube-comments');
  },
  fetchYoutubeCommentsByInput: (data: FetchYoutubeCommentsRequest) => {
    return axiosInstance.post<FetchYoutubeCommentsResponse>('/youtube-comments/fetch', data);
  },
};

export default api;

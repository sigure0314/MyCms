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

export interface LiveKitTokenRequest {
  roomName: string;
  participantName?: string;
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

// 4. Response Interceptor: 處理 401 登出
axiosInstance.interceptors.response.use(
    res => {
        stopLoading();
        return res;
    }, 
    err => {
        stopLoading();
        const requestUrl = err.config?.url ?? '';
        const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/guest');
        if (err.response && err.response.status === 401 && !isAuthRequest) {
            localStorage.removeItem('token');
            // 這裡建議使用 window.location.href 強制跳轉，確保清除狀態
            window.location.href = '/login';
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
  createLiveKitToken: (data: LiveKitTokenRequest) => {
    return axiosInstance.post<LiveKitTokenResponse>('/livekit/token', data);
  }
};

export default api;

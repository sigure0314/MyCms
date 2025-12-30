import axios from 'axios';

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

export type InstagramPostStatus = 'PendingReview' | 'Published';

export interface InstagramPost {
  id: number;
  caption: string;
  status: InstagramPostStatus;
  imageUrl: string;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface UpdateInstagramPostRequest {
  caption?: string;
  status?: InstagramPostStatus;
}

// 2. 設定 Base URL
// 建議：正式開發時將 URL 放到 .env 檔案 (例如 import.meta.env.VITE_API_URL)
// 目前先維持你原本的設定
const BASE_URL = 'https://ideal-goggles-rwvj9vg75qph54gg-5250.app.github.dev/api';
// const BASE_URL = 'http://localhost:5000/api'; // 本機開發用

const axiosInstance = axios.create({ 
    baseURL: BASE_URL 
});

// 3. Request Interceptor: 注入 Token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 4. Response Interceptor: 處理 401 登出
axiosInstance.interceptors.response.use(
    res => res, 
    err => {
        if (err.response && err.response.status === 401) {
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
  }
};

export default api;

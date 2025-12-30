// 請替換成你真正的 Supabase 專案網址
const SUPABASE_PROJECT_URL = "https://你的專案ID.supabase.co"; 
const BUCKET_NAME = "story-images";

export const getImageUrl = (path: string) => {
  if (!path) return "https://via.placeholder.com/800x600?text=No+Image";
  if (path.startsWith("http")) return path; // 相容測試用的 picsum 網址
  return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
};
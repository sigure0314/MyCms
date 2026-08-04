# 1. 前端建置階段
FROM node:22-alpine AS frontend
WORKDIR /src/my-cms-client
COPY my-cms-client/package.json my-cms-client/package-lock.json ./
RUN npm ci
COPY my-cms-client/ ./
RUN npm run build

# 2. API 建置階段 (Build Stage) - 使用 .NET 9 SDK
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# 關鍵修正：路徑要包含子資料夾名稱 "MyCMS.API"
COPY ["MyCMS.API/MyCMS.API.csproj", "MyCMS.API/"]

# 還原 Nuget 套件
RUN dotnet restore "MyCMS.API/MyCMS.API.csproj"

# 複製其餘檔案
COPY . .

# 使用前端建置階段的輸出，避免在 Git 中提交每次都改名的 Vite bundle。
RUN rm -rf /src/MyCMS.API/wwwroot/assets /src/MyCMS.API/wwwroot/index.html
COPY --from=frontend /src/my-cms-client/dist/ /src/MyCMS.API/wwwroot/

# 切換工作目錄到專案層
WORKDIR "/src/MyCMS.API"

# 編譯
RUN dotnet build "MyCMS.API.csproj" -c Release -o /app/build

# 發布
FROM build AS publish
RUN dotnet publish "MyCMS.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 3. 執行階段 (Runtime Stage)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Render 會注入 PORT，且必須監聽在 0.0.0.0 才能被健康檢查掃描到。
# 若未提供 PORT，預設使用 8080 方便本地容器測試。
EXPOSE 8080

# 啟動時動態綁定到 0.0.0.0:${PORT:-8080}
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} dotnet MyCMS.API.dll"]

# 1. 建置階段 (Build Stage) - 使用 .NET 9 SDK
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# 關鍵修正：路徑要包含子資料夾名稱 "MyCMS.API"
COPY ["MyCMS.API/MyCMS.API.csproj", "MyCMS.API/"]

# 還原 Nuget 套件
RUN dotnet restore "MyCMS.API/MyCMS.API.csproj"

# 複製其餘檔案
COPY . .

# 切換工作目錄到專案層
WORKDIR "/src/MyCMS.API"

# 編譯
RUN dotnet build "MyCMS.API.csproj" -c Release -o /app/build

# 發布
FROM build AS publish
RUN dotnet publish "MyCMS.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 2. 執行階段 (Runtime Stage)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# 設定 Render 需要的 Port (Render 預設 Port 環境變數，但 .NET 需明確指定)
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# 啟動點 (名稱必須對應你的 Project Name)
ENTRYPOINT ["dotnet", "MyCMS.API.dll"]
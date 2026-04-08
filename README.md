# MyCms# MyCms
---
# MyCms

## 🚀 專案概述

MyCms 是一個整合式的專案，結合了 **POS 點餐系統**、**AI 自動化內容生成**與**社群媒體管理**。本專案展示了如何利用最新的 .NET 9 與 React 19 架構，構建一個高可靠性、即時響應且具備 AI 賦能的現代化 Web 應用。

## 🛠 技術架構 (Technical Stack)

### **後端核心 (Backend)**

* **框架：** .NET 9 Web API (最新長期支援版本)
* **即時通訊：** **SignalR** 實現前後端雙向資料同步 (POS 點餐、廚房看板)
* **資料庫：** Supabase (PostgreSQL) 雲端資料庫整合
* **快取機制：** **Redis** 用於使用者狀態管理與高頻存取優化
* **驗證授權：** JWT (JSON Web Token) + Role-based Authorization (RBAC)

### **前端核心 (Frontend)**

* **框架：** React 19 + TypeScript (利用最新 Hooks 與 Concurrent Rendering)
* **構建工具：** Vite (極速開發體驗)
* **UI 庫：** Ant Design (企業級元件庫) / Tailwind CSS

---

## ✨ 核心模組與實作細節

### 1. 智慧型 POS 營運系統

* **即時同步：** 利用 **SignalR** 實作。前台下單後，廚房看板無需重新整理即可即時接收工單，顯著提升出餐效率。
* **狀態流轉：** 完整的訂單週期管理（已點餐 -> 製作中 -> 已完成 -> 已結帳）。

### 2. AI 賦能：自動化童書生成器

* **內容生成：** 整合 OpenAI API (或相關 AI 模型)，根據使用者提供的關鍵字自動產出創意故事。
* **異步處理：** 採用 Background Task 處理耗時的 AI 生成請求，防止 API 阻塞。

### 3. 社群行銷管理 (Instagram API)

* **數據整合：** 透過 Instagram Graph API 進行貼文數據追蹤。
* **自動化流程：** 協助企業集中管理多個社群平台的行銷內容。


## ⚙️ 如何在本地開發運行

### 後端 Backend

1. 進入 `/Backend` 目錄
2. 配置 `appsettings.json` (設定 DB 連接字串、Redis、JWT Secret)
3. 執行指令：
```bash
dotnet watch run

```
### 前端 Frontend

1. 進入 `/Frontend` 目錄
2. 安裝依賴：
```bash
npm install

```
3. 啟動開發伺服器：
```bash
npm run dev

```
---
## 📄 授權協議 (License)

本專案採用 **MIT License**。


## 📈 Stock Chart Dashboard (New)

### Backend API

* `GET /api/stocks/{symbol}`
* 回傳內容包含：`prices` (OHLCV)、`ma5`、`ma20`
* 目前採用 **Mock historical data**（可延伸接 Yahoo Finance）

### Frontend Dashboard

* Dashboard 頁面整合 TradingView Lightweight Charts（透過 standalone script）
* 支援：
  * Candlestick
  * MA5 / MA20
  * Volume 子圖
* Symbol 輸入框預設 `AAPL`，按 `Load` 重新載入歷史資料

### Realtime (Finnhub WebSocket)

前端請設定：

```bash
# my-cms-client/.env
VITE_FINNHUB_TOKEN=your_finnhub_token
```

啟動後會：

* 顯示即時最新價
* 訂閱目前 symbol 的即時成交資料
* 動態更新最後一根 K 棒 close/high/low

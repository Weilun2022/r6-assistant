# R6 戰術選角助手

一個基於 HTML + CSS + JavaScript 的 Rainbow Six Siege 戰術選角助手，無需打包工具，開箱即用。

## 專案結構

```
r6-assistant/
├── index.html           # HTML 入口
├── style.css            # 完整樣式表（深色軍事風格）
├── main.js              # JavaScript 邏輯與狀態管理
├── README.md            # 本說明文件
└── data/
    ├── maps.json        # 地圖資料（27 個地圖）
    ├── operators.json   # 幹員資料（20 個幹員）
    └── tactics.json     # 戰術推薦（244 個戰術組合）
```

## 快速開始

### 方法 1：使用 Python HTTP 伺服器（推薦）

在專案根目錄執行：

```bash
cd /sessions/loving-sleepy-tesla/mnt/assets/r6-assistant
python3 -m http.server 8000
```

然後在瀏覽器中開啟：
```
http://localhost:8000
```

### 方法 2：使用其他 HTTP 伺服器

- **Node.js + http-server**：
  ```bash
  npx http-server
  ```

- **PHP 內建伺服器**：
  ```bash
  php -S localhost:8000
  ```

- **直接打開 HTML**（部分功能受限）：
  雙擊 `index.html`（由於跨域限制，JSON 加載可能失敗）

## 功能特性

### 三步驟流程

1. **選擇地圖**
   - 27 個 R6 遊戲地圖
   - 實時搜尋（支援中文、英文、別名）
   - 視覺化卡片選擇

2. **選擇陣營與點位**
   - 攻擊 / 防守 兩大陣營
   - 每個地圖的防守點位列表
   - 清晰的按鈕選擇界面

3. **查看推薦幹員**
   - 根據地圖、陣營、點位推薦最佳幹員
   - 完整的幹員資訊：
     - 幹員名稱與職位標籤
     - 選擇原因說明
     - 可折疊的技巧與提示
     - 替代幹員建議
   - 主要任務與常見錯誤提示

### 設計特色

- **深色軍事主題**：沉浸式遊戲風格
  - 背景色：#0a0c0f（深黑）
  - 強調色：#f4a20a（R6 品牌橙黃）
  - 卡片背景：#141820

- **完全響應式**：支援桌面、平板、手機

- **流暢動畫**：
  - 淡入淡出效果
  - 按鈕 Hover 效果
  - 選中狀態高亮
  - 技巧折疊/展開動畫

- **無依賴**：純 HTML/CSS/JS，無第三方框架

## 技術細節

### 資料來源

- **maps.json**：包含 mapId、name_zh、name_en、aliases、sites[]
- **operators.json**：包含 name_zh、name_en、roles[]
- **tactics.json**：包含 mapId、side、siteId、topTasks[]、commonMistakes[]、recommendedOperators[]

### 戰術查詢邏輯

1. 優先查詢完全匹配：`mapId + side + siteId`
2. 若無結果，查詢備用方案：`mapId + side`（siteId 為空或 null）
3. 若仍無結果，顯示「暫無推薦」

### 狀態管理

使用簡單的全局 `state` 物件：
```javascript
state = {
    selectedMap: null,      // 選中的地圖
    selectedSide: null,     // 攻擊或防守
    selectedSite: null,     // 防守點位
    searchQuery: '',        // 搜尋文字
    mapsList: [],          // 所有地圖
    operatorsList: [],     // 所有幹員
    tacticsList: [],       // 所有戰術
    expandedTips: Set()    // 展開的技巧
}
```

每次狀態改變時，自動觸發 `render()` 重新繪製頁面。

### 事件系統

- 點擊地圖卡片：更新 `selectedMap`
- 輸入搜尋框：更新 `searchQuery`
- 點擊陣營按鈕：更新 `selectedSide`
- 點擊點位按鈕：更新 `selectedSite`
- 點擊技巧按鈕：切換 `expandedTips`

## 瀏覽器兼容性

- Chrome / Edge：100% 支援
- Firefox：100% 支援
- Safari：100% 支援
- 移動瀏覽器：100% 支援

## 自訂與擴展

### 修改顏色主題

編輯 `style.css` 中的 CSS 變數（搜尋 `#f4a20a` 或 `#0a0c0f`）：

```css
body {
    background-color: #0a0c0f;  /* 背景色 */
    color: #e5e7eb;             /* 文字色 */
}
```

### 新增/編輯戰術資料

直接編輯 `data/` 目錄中的 JSON 檔案：

```json
{
    "mapId": "bank",
    "side": "Attack",
    "siteId": "vault",
    "topTasks": ["...", "..."],
    "commonMistakes": ["...", "..."],
    "recommendedOperators": [
        {
            "operatorName": "Twitch",
            "reason": "...",
            "tips": ["...", "..."],
            "alternatives": ["...", "..."]
        }
    ]
}
```

### 語言本地化

修改 HTML 中的硬編碼文字或新增 i18n 系統。

## 效能最佳化

- JSON 檔案一次性加載（約 380KB 合計）
- 使用 `Set` 存儲展開狀態以提升查詢速度
- DOM 渲染使用字符串模板（無虛擬 DOM 開銷）

## 已知限制

1. **CORS 限制**：若直接開啟 HTML，JSON 加載會失敗（必須使用 HTTP 伺服器）
2. **離線功能**：無 ServiceWorker，需要網路連線
3. **儲存功能**：無本地儲存或收藏功能（可自行擴展 localStorage）

## 故障排除

### JSON 加載失敗

確保：
1. 使用 HTTP 伺服器，而非直接打開 HTML 檔案
2. JSON 檔案位於 `data/` 目錄
3. 伺服器運行於 `http://localhost:8000` 或類似位址

### 樣式未加載

確保：
1. `style.css` 在正確位置
2. `<link>` 標籤路徑正確
3. 瀏覽器快取已清除（Ctrl+Shift+Delete）

### 按鈕無反應

檢查：
1. 瀏覽器開發者工具的 Console 是否有錯誤
2. `main.js` 語法是否正確（已驗證）
3. 事件監聽器是否正確綁定

## 許可證

此專案為教學用途，可自由修改與分發。

---

**最後更新**：2026-03-13
**版本**：1.0.0

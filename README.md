# 迴歸實驗室｜物聯網數據分析與應用

本次主要繳交：**Problem 1 — 新創公司利潤預測與特徵選擇**。第二題以汽車燃油效率為情境，實際執行同一套可重現分析 workflow。網頁為繁體中文、純靜態 HTML / CSS / JavaScript；分析在 Web Worker 進行，不需要 Flask、Python 後端、CDN 或 npm 套件。

預計繳交網址：<https://benson103081.github.io/AIoT-DIC2-MultipleLR/>  
自己的 Repository：<https://github.com/benson103081/AIoT-DIC2-MultipleLR>

**部署狀態（2026-10-15）：自己的網站尚未驗證部署成功。** 本機實作、數值及瀏覽器測試已完成。老師的 [參考網站](https://huanchen1107.github.io/AIoT-DIC2-MultipleLR/) 僅作功能與視覺參考，不是本作業部署目的地；以自己的 repository、Actions run 及公開網址作為繳交證據。

## 快速開始

需要 Node.js 24；數值核對另需 Python 3.12+。不用 `npm install`。

```powershell
node scripts/serve.mjs
```

開啟 <http://127.0.0.1:4173/AIoT-DIC2-MultipleLR/>。不要用 `file://` 直接開啟 HTML，瀏覽器模組、fetch 與 Worker 需要 HTTP。

1. 上方選擇分析問題，預設資料會載入並自動分析。
2. 可輸入公開 CSV URL，或上傳 UTF-8 CSV；自行載入後選擇目標與特徵，再按「執行分析」。自訂資料以「已載入」狀態列顯示實際來源；問題說明仍是所選教學情境。
3. 更改目標／特徵會隱藏舊結果，重新分析後才顯示新結果。載入失敗不保留舊模型供誤用。
4. 切換方法與 k，查看 KPI、CV 曲線、完整比較表、係數、方程式及殘差。
5. 即時預測表單只顯示模型非零係數所需原始欄位。輸入超出訓練範圍時提醒外推；結果不是因果或決策保證。
6. 「下載分析 JSON」保存切分列號、CV 分數、前處理參數、係數與測試預測。

Windows 如遇 `npm.ps1` 執行政策限制，使用 `npm.cmd`，或直接執行下列 `node` 命令。

## 作業要求對照

| 要求 | 實作／證據 |
| --- | --- |
| 兩個不同 problem、指定主要繳交 | startups 為主題；mtcars 為第二題；頁首下拉選單 |
| 第二題實際套用 skill 或 workflow | `scripts/analyze.mjs` 已執行，產出 `reports/mtcars.json`；未宣稱使用不存在的分析 skill |
| CSV URL 與本機上傳 | `src/data-loader.js`；串流限制、UTF-8 驗證、HTTP 錯誤、20 秒載入逾時與替代說明 |
| 預覽、型態、缺值、目標／特徵選擇 | 資料工作台；目標限數值；目標不會出現在候選特徵 |
| 缺值、編碼、標準化 | 每一訓練折獨立擬合中位數／眾數、drop-first 編碼、平均值／標準差 |
| OLS 與五種方法比較 | `src/core.js`；方法與 k 選單、CV 曲線及全方法比較表 |
| RMSE、MAE、R²、Adjusted R² | 測試 RMSE／MAE／R²；訓練集 OLS Adjusted R²，無法定義時列出原因 |
| 方程式、係數、動態預測、殘差 | 以當前模型係數與前處理參數計算，不讀舊版 model_data.js |
| 固定 seed、無資料洩漏 | seed 20261015；保留測試集；CV 每折重做選擇與前處理；測試隔離回歸測試 |
| Exhaustive 規模限制 | ≤6 原始欄、≤500 訓練筆；超限停用並說明 |
| 桌面／手機 | 使用者帳號已執行 Chrome 實測；390px／320px 無頁面水平溢位，截圖見 reports |
| GitHub Pages | 相對路徑、無後端；`.github/workflows/pages.yml` 測試通過才部署 `dist/` |
| 數值正確性 | QR 已知解、Lasso／Elastic Net 解析解與 KKT；29 個 OLS 模型與 Python Decimal 獨立解比較 |

## 兩個問題與資料

### Problem 1：新創公司利潤預測（主要繳交）

- 目標：`Profit`；候選：`R&D Spend`、`Administration`、`Marketing Spend`、`State`。
- [公開 CSV 原始來源](https://raw.githubusercontent.com/Avik-Jain/100-Days-Of-ML-Code/master/datasets/50_Startups.csv)，本地快照 `data/50_Startups.csv`，50 筆。
- 探討支出與州別能否預測公司利潤，以及精簡模型能否保留預測能力。資料未附完整單位及抽樣背景，金額保留原始數值單位，不自行推斷經濟因果。
- 固定切分為訓練 40 筆、測試 10 筆。`State` 的全部 dummy 一起選入，所以 k 最大為 **4 個原始欄位**，完整模型通常為 **5 個編碼特徵**（不含截距）。這與參考圖將 dummy 分別計數的 k=5 不同。

### Problem 2：汽車燃油效率預測

- 目標：`mpg`（英里／美制加侖）；候選：`wt`（千磅）、`hp`（馬力）、`disp`（立方英吋）、`qsec`（四分之一英里秒數）、`am`（0 自排、1 手排）。二元 `am` 保持數值 0/1，相當於一個指標變數。
- [公開 mtcars CSV](https://raw.githubusercontent.com/vincentarelbundock/Rdatasets/master/csv/datasets/mtcars.csv)，本地快照 `data/mtcars.csv`，32 筆；`rownames` 是識別名稱，不納入預設模型。
- [R 官方資料說明](https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/mtcars.html)：1974 Motor Trend 的 1973–74 年車輛資料。訓練 25 筆、測試 7 筆；樣本少且年代久，不能直接推廣至現代車輛、即時感測器或未來油耗。
- 實際使用 workflow：下節指令已於本工作區執行；使用的是自建分析 workflow，不是 Sites skill 的分析功能。

兩份快照取自上述公開 CSV；資料來源、擷取日期與再散布注意事項見 `data/README.md`。圖中示範統計值沒有抄入程式。

## 已執行的可重現 workflow

```powershell
node --test tests/*.test.mjs
node scripts/analyze.mjs
python scripts/verify_numeric.py
node scripts/build.mjs
```

1. **定義問題**：固定目標、候選欄位與 seed。
2. **清理與檢查**：讀 CSV、型態／缺值檢查；只刪除缺少目標的列；缺少特徵保留供訓練折內填補。拒絕常數目標、樣本不足、過多類別與不合理尺度。
3. **切分**：固定 LCG + Fisher–Yates 洗牌，前 `ceil(n×0.2)` 筆作測試，其餘作訓練；不是 scikit-learn 的 seed=42 切分。
4. **訓練集內比較**：5-fold CV 比較每種方法與 k；正則化另比較 alpha／L1 ratio。每個驗證折內的選擇器只能使用該折訓練資料。
5. **選模、重訓**：先依平均 CV RMSE 排序，完全同分優先較小 k；再以完整訓練集擬合各設定。推薦模型 ID 在讀取測試評估結果前鎖定。
6. **評估與輸出**：計算測試 RMSE、MAE、R²、殘差；輸出 JSON 包含資料 SHA-256、seed、訓練／測試 CSV 列號、每個模型前處理參數、係數、CV 分數與個別預測。沒有以測試分數回頭選模。

執行產物：[`reports/startups.json`](reports/startups.json)、[`reports/mtcars.json`](reports/mtcars.json)、[`reports/numeric-verification.json`](reports/numeric-verification.json)。瀏覽器與 CLI 共用同一個 `src/core.js`。

本次實際結果（四捨五入，精確值見 JSON）：

| 問題 | CV 推薦方法 | k／選入欄位 | CV RMSE | 測試 RMSE | 測試 MAE | 測試 R² | 訓練 Adjusted R² |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 新創公司 | RFE | 2：R&D Spend、Marketing Spend | 9,815.864 | 6,884.666 | 5,939.206 | 0.961301 | 0.942879 |
| 汽車效率 | Forward Selection | 3：disp、am、qsec | 2.310124 | 4.565209 | 4.374756 | 0.230212 | 0.829943 |

第二題測試結果明顯比 CV 弱，反映小樣本估計的不穩定性，**沒有挑選另一個測試成績較好的模型取代推薦**。第一題也不能因這一次測試表現良好，就認定兩欄模型普遍最優；需要重複切分或獨立新資料。

## 方法定義與限制

| 方法 | 本實作定義 |
| --- | --- |
| OLS baseline | 所有候選欄位，含截距；重新正交化的 modified Gram–Schmidt QR 求解，不直接求 XᵀX 的反矩陣 |
| Lasso | 每個訓練折先擬合 L1 模型，以標準化係數群組平方和排序選 top-k 原始欄位，再以 Lasso 重訓 |
| Forward Selection | 從空子集逐一加欄；每一步用當前訓練資料內的 3-fold CV RMSE 選擇，最後 OLS |
| RFE | 以 OLS 標準化係數群組平方和，反覆刪除最小者，直到 k 個原始欄位，再 OLS |
| Elastic Net | 同 Lasso 的 top-k 排序流程，但以 L1+L2 正則化排序並重訓 |
| Exhaustive Search | 枚舉固定 k 的所有原始欄位組合；內層 3-fold CV 選擇，再 OLS |

正則化使用 coordinate descent，X 與 y 均在當前訓練折標準化；目標函數為 `||y-Xβ||²/(2n) + α·l1·||β||₁ + α·(1-l1)·||β||²/2`。Lasso 的 l1=1；Elastic Net 的 l1∈{0.3,0.7}；alpha∈{0.001,0.01,0.1}。截距不懲罰；最後把係數還原原始尺度。收斂門檻為係數最大變化 <1e-8，最多 10,000 次，未收斂的候選設定會列出錯誤。

Lasso／Elastic Net 的 **k 是排序後保留的原始欄位數，不保證剛好 k 個非零係數**；介面另列編碼欄數及非零係數數量。這是明示的 ranking + regularized refit 流程，並非宣稱標準 Lasso 可任意指定稀疏度。

每一折以訓練資料判定特徵型態、計算填補值及編碼類別；數值中位數、類別眾數；類別字典以固定字串順序排序、去除第一類作基準。測試遇到未見類別時全零編碼並顯示筆數，等同參考類別，預測能力有其限制。全缺值訓練欄拒絕擬合，不偷看驗證／測試資料填補。

RMSE=`sqrt(mean(error²))`、MAE=`mean(abs(error))`、R²=`1-SSE/SST`。訓練 Adjusted R²=`1-(1-R²)(n-1)/(n-p-1)`，p 是編碼欄數，不含截距；它只是選後 OLS 的描述性訓練指標。正則化、秩不足、實際值常數、n≤p+1 時顯示原因而不顯示假數值。JSON 也含同公式的測試 adjusted 值供追溯，但 UI 不把它當作傳統 OLS 自由度推論。

不顯示 p-value、F-test、VIF 或信賴區間；特徵選後／正則化不能直接沿用一般 OLS 推論。共線性造成秩不足時，QR 將相依欄係數置零，其解可能不是唯一，也不是 SVD 最小範數解；預測仍可計算，Adjusted R² 會停用。

CV 曲線為訓練集 5 折 RMSE 與各折 R² 的算術平均。SD 用五折分數相對均值的平方偏差平均開根號，是描述性折間差異，不是標準誤或信賴區間。選 alpha、方法及 k 共用這些 CV 折，CV 最優值仍有選擇偏差；最後的保留測試集才提供選模後評估。單次較高誤差不能證明過度擬合。

限制：至少 25 筆有效目標；最多 1,000 筆、50 個 CSV 欄、8 個候選欄、每欄 12 類、24 個編碼欄；Exhaustive 另限 6 欄與 500 訓練筆。使用者需自行排除結果衍生欄位或資料洩漏欄位；時序／群組資料應改用對應切分，本版隨機切分不適用。`__row` 是保留欄名。欄位必須使用標準數值，不自動去除貨幣字元、百分號或千分位。常數目標、全缺值特徵、混合型態、非 UTF-8、異常尺度等會顯示具體錯誤。

## 驗證紀錄

- 核心測試：已執行，包括兩份真實資料、六種方法、每次重跑一致；改變測試目標／類別不影響推薦或模型；缺值、共線性、錯誤處理及規模限制。
- 數值核對：29 個非正則化模型，使用獨立 Python 50 位 Decimal、帶 pivot 的 Gaussian elimination 解 normal equations，比較係數、測試 RMSE／MAE，誤差全部 <1e-6。
- Lasso／Elastic Net：正交資料解析解與相關特徵的 KKT 最優性條件均通過。
- 載入：共用瀏覽器實際使用的 loader，測試真實本機 HTTP 跨來源端點、File 位元組、大小限制、UTF-8、HTTP 404、取消及後續分析；另外已在 Chrome 實測公開 GitHub CSV URL 成功。
- 介面與手機：使用者於 2026-10-15 15:40（台灣時間）實際執行 `node scripts/browser-test.mjs`，13 項檢查全部通過，包括兩題切換、全部方法與 k、動態預測、目標與特徵變更、公開 CSV URL、本機上傳、錯誤處理及 390px／320px 版面。報告與截圖保存在 reports。部署腳本及 CI 仍會重跑作為必要 gate。
- 靜態檢查：HTML ID、內部連結、資源路徑、JavaScript 語法及部署產物範圍。

詳細狀態見 [`reports/verification.json`](reports/verification.json)。成功執行瀏覽器測試後會新增 `reports/browser-verification.json`、`desktop.png`、`mobile-390.png`、`mobile-320.png`。也可設定 `CHROME_PATH` 指向 Chrome／Edge 執行檔。無外部 npm 瀏覽器自動化依賴，不關閉 Chrome sandbox。

## 部署自己的 GitHub Pages 作業

初始本機只有介面參考圖 `image.png`。本作業自行實作瀏覽器分析核心與介面；曾閱讀老師公開範例的 README、Python、HTML 與 workflow，作功能比較參考。老師的 repository 沒有開放學生推播，因此不向它提交變更。

工作區中的 `legacy/`、原始參考圖及先前 `.deploy/` checkout 保留在本機，但不提交到學生的新 repository。新部署建立自己的 Git 歷史，只包含本次實作、兩份公開資料、測試與結果，不把老師的程式與統計主張當作自己的成果。

先用 `benson103081` 登入 GitHub，建立 **Public**、名稱為 **AIoT-DIC2-MultipleLR** 的空 repository；不要勾選 README、.gitignore 或 license。然後在本工作區的 PowerShell 執行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy.ps1
```

這只為該次腳本設定 execution policy，不修改系統永久設定。需要已安裝 Git、Node 24、Python、Chrome 或 Edge，並透過正常 Git Credential Manager／GitHub 登入驗證；不要把 Token 放進程式、URL 或提交。

腳本會：

1. 確認 `benson103081/AIoT-DIC2-MultipleLR` 可存取且為空；若已有任何 refs，停止以保留遠端內容。
2. 在忽略的 `.deploy/student-*` 建立獨立 checkout，只複製本次作業清單中的檔案。
3. 初始化自己的 main 分支，設定 origin 為自己的 repository，使用 `benson103081` 認證；不操作老師的 repository。
4. 執行數值、HTTP、靜態、瀏覽器及手機版測試，打包 `dist/`；失敗即停止。
5. 建立必要 commit 並普通 `git push origin main`；沒有 force push。若遠端同時更新，正常推播會拒絕，需處理衝突。

僅想先完成檢查與 commit，可加 `-PrepareOnly`；之後於腳本列出的 checkout 執行 `git push -u origin main`。首次部署後的更新，請在該 checkout 正常修改、commit、push；初次發布腳本會拒絕覆蓋已非空的遠端。

`.github/workflows/pages.yml`：main 推播／手動觸發 → Node/Python → 全部測試及分析 → 瀏覽器檢查與截圖 artifact → build → Pages artifact → deploy。網站只發布 `dist/`。CI 尚未在本次提交實際執行，Chrome 啟動或其他環境問題會使 gate 失敗，需要依 Actions log 修正。

首次推播後，到自己 repository 的 **Settings → Pages → Source → GitHub Actions**。到 [自己的 Actions](https://github.com/benson103081/AIoT-DIC2-MultipleLR/actions) 確認最新 run 成功；若第一次因 Pages 尚未設定失敗，設定完成後按 Re-run all jobs。再開啟預計網址，確認有「分析問題」選單且能切換兩題，最後繳交自己的 repository 與網站網址。

## 主要檔案

```text
index.html / styles.css       繁體中文響應式分析工作台
src/core.js                  CSV、前處理、QR、正則化、特徵選擇、CV 與評估
src/data-loader.js           URL 串流讀取與 File UTF-8 解碼
src/app.js / src/worker.js    狀態、圖表、預測與背景運算
data/                        兩份真實公開 CSV 快照及來源
scripts/analyze.mjs          第二題實際使用的可重現 workflow
scripts/verify_numeric.py    獨立高精度數值核對
scripts/browser-test.mjs     真實瀏覽器操作與桌機／手機截圖
scripts/deploy.ps1           自己的空 repository 首次發布、檢查、commit 與推播
tests/                       核心、邊界、HTTP/File 與靜態測試
reports/                     實際計算輸出及驗證證據
.github/workflows/pages.yml  GitHub Pages CI 與部署
```

## 可直接用於繳交的簡短成果說明

本作業以新創公司利潤預測為主要主題，完成 OLS baseline、Lasso、Forward Selection、RFE、Elastic Net 與 Exhaustive Search 的比較；另以 mtcars 完成燃油效率預測，實際執行可重現 workflow 並保存資料指紋、切分與模型結果。網頁可切換分析問題、讀取公開 CSV URL 或本機 CSV、調整目標及候選特徵，並呈現 CV 曲線、評估指標、方程式、係數、即時預測及殘差。所有結果由實際資料計算；選模使用訓練集 CV，保留測試集僅作最終評估，並以獨立高精度實作驗證核心迴歸計算。GitHub Pages 部署檔已備妥；正式繳交時請依實際 Actions 與公開網站驗證結果補記部署狀態。

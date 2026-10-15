# 資料來源與快照

2026-10-15 從下列公開原始 CSV 取得完整觀測資料；網站預設讀取隨站提供的快照，避免初次分析依賴第三方 CORS 或可用性。資料中的數值是來源觀測值，沒有由介面參考圖產生或改造結果。

| 檔案 | 原始來源 | 筆數 |
| --- | --- | ---: |
| `50_Startups.csv` | https://raw.githubusercontent.com/Avik-Jain/100-Days-Of-ML-Code/master/datasets/50_Startups.csv | 50 |
| `mtcars.csv` | https://raw.githubusercontent.com/vincentarelbundock/Rdatasets/master/csv/datasets/mtcars.csv | 32 |

mtcars 欄位與背景依 [R 官方說明](https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/mtcars.html)。預設候選欄位排除 `rownames`，但保留全部原始欄位供使用者選擇。每次 workflow 在 `reports/*.json` 寫入本地 CSV SHA-256，供核對實際分析資料版本。

保留原資料的命名與數值。資料權利仍依原始來源授權；公開可存取不代表可任意商業使用，本專案未替上游資料另行授權。

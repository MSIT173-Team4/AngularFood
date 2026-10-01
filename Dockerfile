# ============ 第一階段：建置 Angular ============
FROM node:22-alpine AS build
WORKDIR /app

# 先裝套件（利用快取）
COPY package.json package-lock.json ./
RUN npm ci

# 再建置
COPY . .
RUN npx ng build --configuration production

# ============ 第二階段：nginx 提供靜態檔＋轉發 API ============
FROM nginx:1.27-alpine

# 官方 nginx 映像檔啟動時，會把 /etc/nginx/templates/*.template 裡的 ${環境變數}
# 替換成實際值，輸出到 /etc/nginx/conf.d/
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist/MSI173Team4Angular/browser /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080

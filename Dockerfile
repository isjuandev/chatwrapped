# ---- Build: compila la app estática con Vite ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# ID del sitio en Umami: Vite lo incrusta en el bundle en tiempo de build.
# Sin valor la app compila igual y la analítica queda desactivada.
ARG VITE_UMAMI_WEBSITE_ID=""
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID
RUN npm run build

# ---- Runtime: nginx sirve /dist (no hay backend: el chat nunca sale del celular) ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1

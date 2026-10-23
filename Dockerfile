# syntax=docker/dockerfile:1
# apreu-web · build de Angular servido con nginx. Construir desde esta carpeta:
#   docker build -t apreu-web .
# nginx reenvía /api/ a apreu-api (variable APREU_API_URL, ver .env.example), así el
# navegador usa el mismo origen y no se necesita CORS.

FROM node:22-alpine AS build
ENV NG_CLI_ANALYTICS=false
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
ENV NGINX_PORT=80 \
    APREU_API_URL=http://apreu-api:3000 \
    CLIENT_MAX_BODY_SIZE=20m
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/apreu-web/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- "http://127.0.0.1:${NGINX_PORT}/" > /dev/null || exit 1

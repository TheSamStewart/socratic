FROM node:22-alpine AS deps
WORKDIR /srv/frontend
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /srv/frontend
# NEXT_PUBLIC_* values are baked into the browser bundle at build time.
# The browser runs on your machine, so it reaches the backend at localhost:8000 (published port).
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_FACE=simli
ARG NEXT_PUBLIC_DEMO_OFFLINE=0
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_FACE=$NEXT_PUBLIC_FACE \
    NEXT_PUBLIC_DEMO_OFFLINE=$NEXT_PUBLIC_DEMO_OFFLINE \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /srv/frontend/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /srv/frontend
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build /srv/frontend ./
EXPOSE 3000
CMD ["npm", "run", "start"]

# syntax=docker/dockerfile:1
# https://docs.docker.com/reference/dockerfile/

ARG NODE_VERSION=20.12.1
ARG PNPM_VERSION=9.4.0

# Install Node
FROM node:${NODE_VERSION}-alpine

RUN apk add python3 make g++ ffmpeg git curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Install pnpm 
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION}

# Copy files, setup CWD and user
WORKDIR /home/jukebot
COPY . .
RUN chown -R node /home/jukebot
USER node

# Install all dependencies and build
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm run build

# Install production dependencies
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

ENV NODE_ENV=production

ENV IN_DOCKER=true

CMD node .

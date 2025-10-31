# syntax=docker/dockerfile:1
# https://docs.docker.com/reference/dockerfile/

ARG NODE_VERSION=20.12.1
ARG PNPM_VERSION=9.4.0

# Install Node
FROM node:${NODE_VERSION}-alpine

RUN apk add python3 make g++ ffmpeg git curl opus-dev && \
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

# Force building native modules from source (useful for Alpine Linux)
# PREBUILD_SKIP_DOWNLOAD forces prebuild-install to skip prebuilt binaries and build from source
ENV PREBUILD_SKIP_DOWNLOAD=true
ENV npm_config_build_from_source=true

# Install production dependencies
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# Rebuild native modules to ensure they're compiled for the target platform
# Remove any failed prebuild attempts and force rebuild from source
RUN find node_modules -path "*@discordjs/opus/prebuild" -type d -exec rm -rf {} + 2>/dev/null || true
# Manually trigger build in the opus module directory (pnpm uses a specific structure)
RUN OPUS_DIR=$(find node_modules -type d -path "*@discordjs/opus" | head -1) && \
    if [ -n "$OPUS_DIR" ] && [ -d "$OPUS_DIR" ]; then \
        cd "$OPUS_DIR" && \
        rm -rf prebuild build && \
        npm run install 2>&1 || npm install 2>&1 || true; \
    fi
RUN pnpm rebuild @discordjs/opus sodium-native

ENV NODE_ENV=production

ENV IN_DOCKER=true

CMD node .

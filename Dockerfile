# Development Dockerfile for the Reloading tool
# Using Debian-based image for maximum compatibility with pnpm + native modules
# Must use Node 22+ because pnpm 11.5+ (our version) requires Node >= 22.13
FROM node:22

WORKDIR /app

# Copy only package files first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Enable corepack, pin exact pnpm version (from packageManager field),
# and install dependencies.
# We use --ignore-scripts + explicit rebuild to reliably allow sharp
# and unrs-resolver postinstall scripts in non-interactive Docker builds
# (pnpm 11 is very strict about build scripts by default).
RUN corepack enable && \
    corepack prepare pnpm@11.5.0 --activate && \
    pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm rebuild sharp unrs-resolver

# Copy the rest of the source
COPY . .

# Generate Prisma Client during build
RUN pnpm prisma generate

EXPOSE 3000

# Default command - can be overridden in docker-compose
CMD ["pnpm", "dev"]

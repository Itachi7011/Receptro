# This Dockerfile builds the Receptro app into a Docker image.
#
# It has 3 stages (3 separate "FROM" steps). We do it in stages so the
# final image doesn't contain any of the extra stuff (source code, build
# tools) that we only needed WHILE building — it only contains the
# finished app. This keeps the final image small.
#
# Stage 1 "deps"    -> just installs the npm packages
# Stage 2 "builder" -> copies in our code and runs "npm run build"
# Stage 3 "runner"  -> the actual small image that gets shipped/run


# ---- Stage 1: install dependencies ----------------------------------
FROM node:20-alpine AS deps

# All our commands from here on run inside this folder in the container.
WORKDIR /app

# Copy over just the files needed to install packages first. Docker
# caches each step, so if these two files don't change, Docker will
# reuse the cached "npm ci" result next time instead of redoing it.
COPY package.json package-lock.json ./

# Installs the exact versions from package-lock.json. Faster and more
# reliable than "npm install" for a build like this.
RUN npm ci


# ---- Stage 2: build the app -------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Bring in the node_modules folder we already installed in Stage 1,
# instead of installing everything again.
COPY --from=deps /app/node_modules ./node_modules

# Now copy in the rest of our actual source code.
COPY . .

# Building the app needs a DATABASE_URL to exist (even a fake one is
# fine) because Next.js loads our code while building. It does NOT
# actually connect to a database during the build.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/receptro"
ENV JWT_SECRET="build-time-placeholder-not-used-at-runtime"

# This creates the production build. Because we set "output: standalone"
# in next.config.ts, this also creates a small, self-contained
# ".next/standalone" folder with only the files needed to run the app.
RUN npm run build


# ---- Stage 3: the final, small image -----------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Don't run the app as the root user — better security practice.
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the finished, standalone app from the builder stage.
# This is the whole reason we used multiple stages: none of our source
# code, dev dependencies, or build tools end up in this final image.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# The app listens on this port inside the container.
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# This starts the actual app. "server.js" is created automatically by
# Next.js as part of the standalone build in Stage 2.
CMD ["node", "server.js"]

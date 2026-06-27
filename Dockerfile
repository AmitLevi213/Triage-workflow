# Bug-report triage workflow — container image.
# Build:  docker build -t triage .
# Run:    docker run -it --rm -e ANTHROPIC_API_KEY=sk-ant-... triage
FROM node:22-slim

WORKDIR /app

# Install deps first so this layer caches when only source changes.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source.
COPY tsconfig.json ./
COPY src ./src

# Run as a non-root user.
USER node

# Interactive run (the workflow prompts a human for approval on risky cases).
CMD ["npm", "start"]

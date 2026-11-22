# The image the CI test jobs use (.github/workflows/ci.yml): Ubuntu 24.04 with Node, the
# Playwright browsers and their system libraries. Its tag must match @playwright/test in
# package-lock.json; `npm run check:playwright-image` (run in CI) fails if they differ.
FROM mcr.microsoft.com/playwright:v1.65.1-noble

WORKDIR /app

# Dependencies first, so this layer is reused until package-lock.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Extra arguments go to `playwright test`, e.g. `docker run ... awara-qa-tests --project=api`.
ENTRYPOINT ["npx", "playwright", "test"]

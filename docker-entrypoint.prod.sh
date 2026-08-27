#!/bin/sh
set -e

mkdir -p public/uploads/range-logs public/uploads/factory-ammo

echo "Running Prisma migrations..."
pnpm prisma migrate deploy

echo "Starting Next.js..."
exec pnpm start

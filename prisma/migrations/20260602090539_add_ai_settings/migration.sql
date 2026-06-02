-- CreateTable
CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "provider" TEXT NOT NULL DEFAULT 'grok',
    "apiKey" TEXT,
    "model" TEXT,
    "baseUrl" TEXT,
    "temperature" DOUBLE PRECISION,
    "maxTokens" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

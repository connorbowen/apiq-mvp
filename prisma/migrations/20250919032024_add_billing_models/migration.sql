-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'UNPAID');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('API_CONNECTION', 'WORKFLOW_EXECUTION', 'DIRECT_API_CALL');

-- CreateTable
CREATE TABLE "user_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL DEFAULT 'FREE',
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "apiConnectionsLimit" INTEGER NOT NULL DEFAULT 5,
    "workflowExecutionsLimit" INTEGER NOT NULL DEFAULT 50,
    "directApiCallsLimit" INTEGER NOT NULL DEFAULT 50,
    "totalExecutionsLimit" INTEGER NOT NULL DEFAULT 100,
    "currentConnections" INTEGER NOT NULL DEFAULT 0,
    "currentWorkflowExecutions" INTEGER NOT NULL DEFAULT 0,
    "currentDirectApiCalls" INTEGER NOT NULL DEFAULT 0,
    "currentTotalExecutions" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usageType" "UsageType" NOT NULL,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "planType" "PlanType" NOT NULL,
    "apiConnections" INTEGER NOT NULL DEFAULT 0,
    "workflowExecutions" INTEGER NOT NULL DEFAULT 0,
    "directApiCalls" INTEGER NOT NULL DEFAULT 0,
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,
    "apiConnectionsLimit" INTEGER NOT NULL,
    "workflowExecutionsLimit" INTEGER NOT NULL,
    "directApiCallsLimit" INTEGER NOT NULL,
    "totalExecutionsLimit" INTEGER NOT NULL,
    "overageAmount" INTEGER NOT NULL DEFAULT 0,
    "overageCharges" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_limits" (
    "id" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "apiConnectionsLimit" INTEGER NOT NULL,
    "workflowExecutionsLimit" INTEGER NOT NULL,
    "directApiCallsLimit" INTEGER NOT NULL,
    "totalExecutionsLimit" INTEGER NOT NULL,
    "priceMonthly" INTEGER NOT NULL,
    "priceYearly" INTEGER NOT NULL,
    "stripePriceIdMonthly" TEXT,
    "stripePriceIdYearly" TEXT,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_plans_userId_key" ON "user_plans"("userId");

-- CreateIndex
CREATE INDEX "usage_records_userId_usageType_idx" ON "usage_records"("userId", "usageType");

-- CreateIndex
CREATE INDEX "usage_records_userId_createdAt_idx" ON "usage_records"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "usage_summaries_year_month_idx" ON "usage_summaries"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "usage_summaries_userId_year_month_key" ON "usage_summaries"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "plan_limits_planType_key" ON "plan_limits"("planType");

-- AddForeignKey
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_plan_fkey" FOREIGN KEY ("userId") REFERENCES "user_plans"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_summaries" ADD CONSTRAINT "usage_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_summaries" ADD CONSTRAINT "usage_summaries_user_plan_fkey" FOREIGN KEY ("userId") REFERENCES "user_plans"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `action` on the `workflow_steps` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "workflow_steps" DROP COLUMN "action";

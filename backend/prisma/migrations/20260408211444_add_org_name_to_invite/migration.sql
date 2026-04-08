/*
  Warnings:

  - Added the required column `orgName` to the `org_invites` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "org_invites" ADD COLUMN     "orgName" TEXT NOT NULL;

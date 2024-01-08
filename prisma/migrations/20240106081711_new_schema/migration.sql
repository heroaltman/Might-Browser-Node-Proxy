/*
  Warnings:

  - You are about to drop the column `blacklist` on the `URL` table. All the data in the column will be lost.
  - Added the required column `isAdult` to the `URL` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `URL` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "URL" DROP COLUMN "blacklist",
ADD COLUMN     "isAdult" BOOLEAN NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

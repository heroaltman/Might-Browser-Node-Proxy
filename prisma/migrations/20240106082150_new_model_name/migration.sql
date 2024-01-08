/*
  Warnings:

  - You are about to drop the `URL` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "URL";

-- CreateTable
CREATE TABLE "website" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "isAdult" BOOLEAN NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "website_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "website_domain_key" ON "website"("domain");

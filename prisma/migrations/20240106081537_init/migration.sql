-- CreateTable
CREATE TABLE "URL" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "blacklist" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "URL_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "URL_domain_key" ON "URL"("domain");

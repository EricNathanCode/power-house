-- CreateTable
CREATE TABLE "trade_in_photos" (
    "id" SERIAL NOT NULL,
    "tradeInId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_in_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trade_in_photos_tradeInId_idx" ON "trade_in_photos"("tradeInId");

-- AddForeignKey
ALTER TABLE "trade_in_photos" ADD CONSTRAINT "trade_in_photos_tradeInId_fkey" FOREIGN KEY ("tradeInId") REFERENCES "trade_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

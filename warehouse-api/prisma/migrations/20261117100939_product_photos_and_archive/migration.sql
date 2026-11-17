-- AlterTable
ALTER TABLE "products" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "product_images" (
    "sku" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("sku")
);

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_sku_fkey" FOREIGN KEY ("sku") REFERENCES "products"("sku") ON DELETE CASCADE ON UPDATE CASCADE;

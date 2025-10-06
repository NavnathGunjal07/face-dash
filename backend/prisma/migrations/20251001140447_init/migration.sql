-- AlterTable
ALTER TABLE "public"."Alert" ADD COLUMN     "detectedFaces" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Camera" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

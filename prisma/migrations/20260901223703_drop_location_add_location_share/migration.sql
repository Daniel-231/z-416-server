/*
  Warnings:

  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LocationShareStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'ENDED', 'DECLINED');

-- AlterEnum
ALTER TYPE "FriendshipStatus" ADD VALUE 'NONE';

-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_userId_fkey";

-- AlterTable
ALTER TABLE "Friendship" ALTER COLUMN "status" SET DEFAULT 'NONE';

-- DropTable
DROP TABLE "Location";

-- CreateTable
CREATE TABLE "LocationShare" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "sharerId" TEXT NOT NULL,
    "status" "LocationShareStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "LocationShare_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LocationShare" ADD CONSTRAINT "LocationShare_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationShare" ADD CONSTRAINT "LocationShare_sharerId_fkey" FOREIGN KEY ("sharerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

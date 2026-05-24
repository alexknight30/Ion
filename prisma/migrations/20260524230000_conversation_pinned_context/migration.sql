-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "pinnedProjectIds" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Conversation" ADD COLUMN "pinnedArtifactIds" TEXT NOT NULL DEFAULT '[]';

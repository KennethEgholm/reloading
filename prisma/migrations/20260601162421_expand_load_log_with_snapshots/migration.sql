-- DropForeignKey
ALTER TABLE "LoadLog" DROP CONSTRAINT "LoadLog_recipeId_fkey";

-- AddForeignKey
ALTER TABLE "LoadLog" ADD CONSTRAINT "LoadLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

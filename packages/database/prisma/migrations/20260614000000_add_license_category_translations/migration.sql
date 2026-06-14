-- CreateTable
CREATE TABLE "LicenseCategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "LicenseCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LicenseCategoryTranslation_categoryId_languageId_key" ON "LicenseCategoryTranslation"("categoryId", "languageId");

-- AddForeignKey
ALTER TABLE "LicenseCategoryTranslation" ADD CONSTRAINT "LicenseCategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LicenseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseCategoryTranslation" ADD CONSTRAINT "LicenseCategoryTranslation_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

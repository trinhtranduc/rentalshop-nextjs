-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "status" "public"."PostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" INTEGER NOT NULL,
    "featuredImage" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostCategoryRelation" (
    "postId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "PostCategoryRelation_pkey" PRIMARY KEY ("postId","categoryId")
);

-- CreateTable
CREATE TABLE "public"."PostTagRelation" (
    "postId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "PostTagRelation_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "public"."Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_publishedAt_idx" ON "public"."Post"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_slug_idx" ON "public"."Post"("slug");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "public"."Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "public"."Post"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostCategory_slug_key" ON "public"."PostCategory"("slug");

-- CreateIndex
CREATE INDEX "PostCategory_slug_idx" ON "public"."PostCategory"("slug");

-- CreateIndex
CREATE INDEX "PostCategory_isActive_idx" ON "public"."PostCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PostTag_slug_key" ON "public"."PostTag"("slug");

-- CreateIndex
CREATE INDEX "PostTag_slug_idx" ON "public"."PostTag"("slug");

-- CreateIndex
CREATE INDEX "PostTag_isActive_idx" ON "public"."PostTag"("isActive");

-- CreateIndex
CREATE INDEX "PostCategoryRelation_categoryId_idx" ON "public"."PostCategoryRelation"("categoryId");

-- CreateIndex
CREATE INDEX "PostCategoryRelation_postId_idx" ON "public"."PostCategoryRelation"("postId");

-- CreateIndex
CREATE INDEX "PostTagRelation_tagId_idx" ON "public"."PostTagRelation"("tagId");

-- CreateIndex
CREATE INDEX "PostTagRelation_postId_idx" ON "public"."PostTagRelation"("postId");

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostCategoryRelation" ADD CONSTRAINT "PostCategoryRelation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostCategoryRelation" ADD CONSTRAINT "PostCategoryRelation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."PostCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostTagRelation" ADD CONSTRAINT "PostTagRelation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostTagRelation" ADD CONSTRAINT "PostTagRelation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."PostTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

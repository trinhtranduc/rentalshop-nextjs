-- Blog CMS: Post, Category, Tag (idempotent for Railway DBs missing these tables)

DO $$ BEGIN
    CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PostCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PostCategory_slug_key" ON "PostCategory"("slug");
CREATE INDEX IF NOT EXISTS "PostCategory_slug_idx" ON "PostCategory"("slug");
CREATE INDEX IF NOT EXISTS "PostCategory_isActive_idx" ON "PostCategory"("isActive");

CREATE TABLE IF NOT EXISTS "PostTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PostTag_slug_key" ON "PostTag"("slug");
CREATE INDEX IF NOT EXISTS "PostTag_slug_idx" ON "PostTag"("slug");

CREATE TABLE IF NOT EXISTS "Post" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" INTEGER NOT NULL,
    "featuredImage" TEXT,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey"
        FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Post_slug_locale_key" ON "Post"("slug", "locale");
CREATE INDEX IF NOT EXISTS "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "Post_slug_idx" ON "Post"("slug");
CREATE INDEX IF NOT EXISTS "Post_locale_idx" ON "Post"("locale");
CREATE INDEX IF NOT EXISTS "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX IF NOT EXISTS "Post_createdAt_idx" ON "Post"("createdAt");
CREATE INDEX IF NOT EXISTS "Post_locale_status_idx" ON "Post"("locale", "status");

CREATE TABLE IF NOT EXISTS "PostCategoryRelation" (
    "postId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    CONSTRAINT "PostCategoryRelation_pkey" PRIMARY KEY ("postId", "categoryId")
);

DO $$ BEGIN
    ALTER TABLE "PostCategoryRelation" ADD CONSTRAINT "PostCategoryRelation_postId_fkey"
        FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "PostCategoryRelation" ADD CONSTRAINT "PostCategoryRelation_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "PostCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "PostCategoryRelation_categoryId_idx" ON "PostCategoryRelation"("categoryId");

CREATE TABLE IF NOT EXISTS "PostTagRelation" (
    "postId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    CONSTRAINT "PostTagRelation_pkey" PRIMARY KEY ("postId", "tagId")
);

DO $$ BEGIN
    ALTER TABLE "PostTagRelation" ADD CONSTRAINT "PostTagRelation_postId_fkey"
        FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "PostTagRelation" ADD CONSTRAINT "PostTagRelation_tagId_fkey"
        FOREIGN KEY ("tagId") REFERENCES "PostTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "PostTagRelation_tagId_idx" ON "PostTagRelation"("tagId");

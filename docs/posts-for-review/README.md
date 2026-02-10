# 📝 Posts for Review

## 📋 Overview

This folder contains blog posts that need to be reviewed before importing into the database.

## 🔄 Workflow

1. **Posts are created** in JSON format in `docs/seo-articles/`
2. **Converted to Markdown** for easier review
3. **Saved here** for review process
4. **Reviewed and edited** by content team
5. **Updated in JSON files** after review
6. **Imported to database** when approved

## 📁 File Structure

```
docs/posts-for-review/
├── README.md (this file)
├── article-1-*.md
├── article-2-*.md
└── ...
```

## ✅ Review Checklist

Before approving a post for import:

- [ ] Content is original (no plagiarism)
- [ ] No duplicate paragraphs or sections
- [ ] Word count meets minimum (2000+ words)
- [ ] Proper heading structure (H1, H2, H3)
- [ ] Images have proper alt text (not placeholders)
- [ ] SEO metadata is complete and accurate
- [ ] Categories and tags are appropriate
- [ ] Internal links are included
- [ ] CTA mentions AnyRent naturally
- [ ] Content is proofread (no typos)
- [ ] Vietnamese and English versions are complete
- [ ] Content is factually accurate
- [ ] Content provides value to readers
- [ ] Follows all rules in `docs/post-creation-rules.md`

## 📝 How to Review

1. Open the markdown file
2. Read through the entire article
3. Check for:
   - Duplicate content
   - Grammar and spelling errors
   - Factual accuracy
   - SEO optimization
   - Image quality
   - Link validity
4. Make notes or edit directly
5. Mark as reviewed when done

## 🚀 After Review

Once a post is reviewed and approved:

1. Update the corresponding JSON file in `docs/seo-articles/`
2. Mark the post as "approved" (rename or move to approved folder)
3. Import to database when ready

## ⚠️ Status

- **Draft**: Initial creation, needs review
- **In Review**: Currently being reviewed
- **Needs Revision**: Requires changes before approval
- **Approved**: Ready for import
- **Published**: Already imported and published

## 📚 Related Documents

- [Post Creation Rules](../post-creation-rules.md)
- [SEO Articles Markdown](../seo-articles-markdown/README.md)

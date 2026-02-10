/**
 * Script to clean duplicate content from article JSON files
 * 
 * This script will:
 * 1. Read all article JSON files
 * 2. Remove duplicate paragraphs (exact text matches)
 * 3. Remove duplicate patterns (Chi tiết quan trọng về...)
 * 4. Keep only unique, valuable content
 * 5. Save cleaned files
 */

const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, '../docs/seo-articles');

// Patterns to identify and remove duplicate content
const duplicatePatterns = [
  /^Chi tiết quan trọng về .*: Đây là một trong những yếu tố then chốt quyết định sự thành công của cửa hàng cho thuê\. Bằng cách hiểu rõ và áp dụng đúng các nguyên tắc này, bạn có thể tối ưu hóa hoạt động và đạt được kết quả tốt nhất\. Các best practices đã được chứng minh hiệu quả qua nhiều case studies thực tế từ các cửa hàng cho thuê hàng đầu\.$/,
  /^Important details about .*: This is one of the key factors determining the success of a rental shop\. By understanding and correctly applying these principles, you can optimize operations and achieve the best results\. Best practices have been proven effective through many real case studies from leading rental shops\.$/
];

// Extract text from TipTap content node
function extractTextFromNode(node) {
  if (!node || !node.content) return '';
  
  if (node.type === 'text') {
    return node.text || '';
  }
  
  if (Array.isArray(node.content)) {
    return node.content.map(child => extractTextFromNode(child)).join('');
  }
  
  return '';
}

// Check if text matches duplicate pattern
function isDuplicatePattern(text) {
  if (!text || typeof text !== 'string') return false;
  
  const normalized = text.trim();
  
  // Check against known duplicate patterns
  for (const pattern of duplicatePatterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  
  // Check for very short or generic text
  if (normalized.length < 50) {
    return false; // Don't remove short paragraphs
  }
  
  return false;
}

// Clean content by removing duplicates
function cleanContent(content) {
  if (!content || !content.content || !Array.isArray(content.content)) {
    return content;
  }
  
  const cleanedNodes = [];
  const seenTexts = new Set();
  let lastNodeType = null;
  
  for (const node of content.content) {
    // Always keep headings, images, lists, etc.
    if (node.type !== 'paragraph') {
      cleanedNodes.push(node);
      lastNodeType = node.type;
      continue;
    }
    
    // Extract text from paragraph
    const paragraphText = extractTextFromNode(node);
    const normalizedText = paragraphText.trim().toLowerCase();
    
    // Skip empty paragraphs
    if (!normalizedText) {
      continue;
    }
    
    // Skip if it matches duplicate pattern
    if (isDuplicatePattern(paragraphText)) {
      continue;
    }
    
    // Skip if we've seen this exact text before (exact duplicate)
    if (seenTexts.has(normalizedText)) {
      continue;
    }
    
    // Skip if very similar to previous paragraph (90% similarity)
    let isSimilar = false;
    for (const seenText of seenTexts) {
      const similarity = calculateSimilarity(normalizedText, seenText);
      if (similarity > 0.9) {
        isSimilar = true;
        break;
      }
    }
    
    if (isSimilar) {
      continue;
    }
    
    // Keep this paragraph
    seenTexts.add(normalizedText);
    cleanedNodes.push(node);
    lastNodeType = node.type;
  }
  
  return {
    ...content,
    content: cleanedNodes
  };
}

// Calculate similarity between two texts (simple Jaccard similarity)
function calculateSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  
  return intersection.size / union.size;
}

// Clean a single article file
function cleanArticleFile(filePath) {
  try {
    const articleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Count original content nodes
    const originalViNodes = articleData.content_vi?.content?.length || 0;
    const originalEnNodes = articleData.content_en?.content?.length || 0;
    
    // Clean Vietnamese content
    if (articleData.content_vi) {
      articleData.content_vi = cleanContent(articleData.content_vi);
    }
    
    // Clean English content
    if (articleData.content_en) {
      articleData.content_en = cleanContent(articleData.content_en);
    }
    
    // Count cleaned content nodes
    const cleanedViNodes = articleData.content_vi?.content?.length || 0;
    const cleanedEnNodes = articleData.content_en?.content?.length || 0;
    
    // Save cleaned file
    fs.writeFileSync(
      filePath,
      JSON.stringify(articleData, null, 2),
      'utf8'
    );
    
    return {
      file: path.basename(filePath),
      originalVi: originalViNodes,
      cleanedVi: cleanedViNodes,
      removedVi: originalViNodes - cleanedViNodes,
      originalEn: originalEnNodes,
      cleanedEn: cleanedEnNodes,
      removedEn: originalEnNodes - cleanedEnNodes
    };
  } catch (error) {
    console.error(`   ✗ Error cleaning ${filePath}:`, error.message);
    return null;
  }
}

// Main function
function main() {
  console.log('🧹 Cleaning duplicate content from article JSON files...\n');
  
  const files = fs.readdirSync(articlesDir)
    .filter(f => f.endsWith('.json') && f.startsWith('article-'))
    .sort();
  
  if (files.length === 0) {
    console.log('   ⚠️  No article JSON files found!');
    return;
  }
  
  console.log(`   Found ${files.length} article files\n`);
  
  let successCount = 0;
  let errorCount = 0;
  let totalRemovedVi = 0;
  let totalRemovedEn = 0;
  
  for (const file of files) {
    const filePath = path.join(articlesDir, file);
    const result = cleanArticleFile(filePath);
    
    if (result) {
      console.log(`   ✓ Cleaned: ${result.file}`);
      console.log(`     VI: ${result.originalVi} → ${result.cleanedVi} (removed ${result.removedVi})`);
      console.log(`     EN: ${result.originalEn} → ${result.cleanedEn} (removed ${result.removedEn})`);
      successCount++;
      totalRemovedVi += result.removedVi;
      totalRemovedEn += result.removedEn;
    } else {
      errorCount++;
    }
  }
  
  console.log('\n✅ Cleaning complete!');
  console.log('\n📊 Summary:');
  console.log(`   - Files processed: ${files.length}`);
  console.log(`   - Success: ${successCount}`);
  console.log(`   - Errors: ${errorCount}`);
  console.log(`   - Total removed (VI): ${totalRemovedVi} duplicate paragraphs`);
  console.log(`   - Total removed (EN): ${totalRemovedEn} duplicate paragraphs`);
  console.log('\n📝 Next steps:');
  console.log('   1. Review cleaned JSON files');
  console.log('   2. Delete old posts: yarn posts:delete-all');
  console.log('   3. Import cleaned articles: yarn posts:import');
}

main();

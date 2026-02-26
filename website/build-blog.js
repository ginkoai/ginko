#!/usr/bin/env node

/**
 * @fileType: build-script
 * @status: current
 * @updated: 2025-12-03
 * @tags: [blog, markdown, static-site-generator, build]
 * @related: [content/blog, templates]
 * @priority: high
 * @complexity: medium
 * @dependencies: [marked, gray-matter, highlight.js]
 */

/**
 * Ginko Marketing Blog Build Script
 *
 * Generates static HTML blog pages from markdown files with YAML frontmatter.
 *
 * Features:
 * - Parse markdown files with YAML frontmatter
 * - Convert markdown to HTML with syntax highlighting
 * - Generate individual post pages
 * - Generate blog listing page
 * - Generate RSS feed
 * - Template-based rendering
 *
 * Usage:
 *   node build-blog.js
 *
 * Directory structure:
 *   content/blog/          - Markdown blog posts
 *   templates/             - HTML templates
 *   blog/                  - Generated output
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import matter from 'gray-matter';
import hljs from 'highlight.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  contentDir: path.join(__dirname, 'content', 'blog'),
  templatesDir: path.join(__dirname, 'templates'),
  partialsDir: path.join(__dirname, 'partials'),
  outputDir: path.join(__dirname, 'blog'),
  websiteDir: __dirname,
  baseUrl: 'https://ginkoai.com',
  siteName: 'Ginko Blog',
  siteDescription: 'Insights on AI-assisted development and context management',
  author: 'Chris Norton',
  postsPerPage: 10,
};

/**
 * Configure marked with syntax highlighting
 */
function configureMarked() {
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (err) {
          console.error(`Syntax highlighting error for language ${lang}:`, err.message);
        }
      }
      return hljs.highlightAuto(code).value;
    },
    langPrefix: 'hljs language-',
    gfm: true, // GitHub Flavored Markdown
    breaks: false,
    pedantic: false,
  });
}

/**
 * Ensure directory exists, create if needed
 * @param {string} dirPath - Directory path to ensure
 */
async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`✓ Created directory: ${dirPath}`);
  }
}

/**
 * Read and parse a markdown file with frontmatter
 * @param {string} filePath - Path to markdown file
 * @returns {Promise<Object>} Parsed post object
 */
async function parseMarkdownFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    // Validate required frontmatter fields
    const required = ['title', 'date', 'description', 'slug'];
    const missing = required.filter(field => !frontmatter[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required frontmatter fields: ${missing.join(', ')}`);
    }

    // Parse date
    const date = new Date(frontmatter.date);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${frontmatter.date}`);
    }

    // Convert markdown to HTML
    const html = marked.parse(content);

    return {
      ...frontmatter,
      date,
      dateISO: date.toISOString(),
      dateFormatted: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      content: html,
      fileName: path.basename(filePath),
      tags: frontmatter.tags || [],
      author: frontmatter.author || CONFIG.author,
    };
  } catch (error) {
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }
}

/**
 * Read all markdown files from content directory
 * @returns {Promise<Array>} Array of parsed post objects
 */
async function readAllPosts() {
  try {
    await fs.access(CONFIG.contentDir);
  } catch {
    console.warn(`⚠ Content directory not found: ${CONFIG.contentDir}`);
    console.log('Creating example content directory...');
    await ensureDir(CONFIG.contentDir);
    return [];
  }

  const files = await fs.readdir(CONFIG.contentDir);
  const markdownFiles = files.filter(file => file.endsWith('.md'));

  if (markdownFiles.length === 0) {
    console.warn('⚠ No markdown files found in content directory');
    return [];
  }

  const posts = [];
  const errors = [];

  for (const file of markdownFiles) {
    const filePath = path.join(CONFIG.contentDir, file);
    try {
      const post = await parseMarkdownFile(filePath);
      posts.push(post);
      console.log(`✓ Parsed: ${file}`);
    } catch (error) {
      errors.push({ file, error: error.message });
      console.error(`✗ Error parsing ${file}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.warn(`\n⚠ ${errors.length} file(s) failed to parse`);
  }

  // Sort posts by date (newest first)
  posts.sort((a, b) => b.date - a.date);

  return posts;
}

/**
 * Load template file
 * @param {string} templateName - Template file name
 * @returns {Promise<string>} Template content
 */
async function loadTemplate(templateName) {
  const templatePath = path.join(CONFIG.templatesDir, templateName);

  try {
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    console.warn(`⚠ Template not found: ${templateName}, using default`);
    return getDefaultTemplate(templateName);
  }
}

/**
 * Get default template if file doesn't exist
 * @param {string} templateName - Template name
 * @returns {string} Default template content
 */
function getDefaultTemplate(templateName) {
  const templates = {
    'blog-post.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}} - ${CONFIG.siteName}</title>
  <meta name="description" content="{{description}}">
  <link rel="stylesheet" href="/styles.css?v=rebrand-2026">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/blog/">Blog</a>
    </nav>
  </header>
  <main>
    <article class="blog-post">
      <header>
        <h1>{{title}}</h1>
        <div class="post-meta">
          <time datetime="{{dateISO}}">{{dateFormatted}}</time>
          <span class="author">by {{author}}</span>
        </div>
        {{#tags}}
        <div class="tags">
          {{#each tags}}
          <span class="tag">{{this}}</span>
          {{/each}}
        </div>
        {{/tags}}
      </header>
      <div class="post-content">
        {{content}}
      </div>
    </article>
  </main>
</body>
</html>`,

    'blog-list.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${CONFIG.siteName}</title>
  <meta name="description" content="${CONFIG.siteDescription}">
  <link rel="stylesheet" href="/styles.css?v=rebrand-2026">
  <link rel="alternate" type="application/rss+xml" title="${CONFIG.siteName} RSS Feed" href="/blog/feed.xml">
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/blog/">Blog</a>
    </nav>
  </header>
  <main>
    <h1>Blog</h1>
    <div class="blog-list">
      {{posts}}
    </div>
  </main>
</body>
</html>`,
  };

  return templates[templateName] || '<html><body>{{content}}</body></html>';
}

/**
 * Simple template engine (supports {{variable}} and {{#array}}...{{/array}})
 * @param {string} template - Template string
 * @param {Object} data - Data object
 * @returns {string} Rendered template
 */
function renderTemplate(template, data) {
  let result = template;

  // Replace simple variables: {{variable}}
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
  });

  // Handle conditional blocks: {{#tags}}...{{/tags}}
  result = result.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (match, key, content) => {
    const value = data[key];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return '';
    }
    return content;
  });

  // Handle array iteration: {{#each tags}}...{{/each}}
  result = result.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (match, key, itemTemplate) => {
    const array = data[key];
    if (!Array.isArray(array) || array.length === 0) {
      return '';
    }
    return array.map(item => {
      return itemTemplate.replace(/{{this}}/g, item);
    }).join('');
  });

  return result;
}

/**
 * Generate post navigation HTML
 * @param {Object|null} prevPost - Previous post object or null
 * @param {Object|null} nextPost - Next post object or null
 * @returns {string} Navigation HTML
 */
function generatePostNavigation(prevPost, nextPost) {
  const prevHtml = prevPost ? `
                <a href="/blog/${prevPost.slug}/" class="blog-nav-cell nav-prev" rel="prev">
                    <span class="nav-label"><span class="nav-arrow">&lt;</span> PREVIOUS</span>
                    <span class="nav-title">${prevPost.title}</span>
                </a>` : `<div class="blog-nav-cell nav-prev nav-empty"></div>`;

  const nextHtml = nextPost ? `
                <a href="/blog/${nextPost.slug}/" class="blog-nav-cell nav-next" rel="next">
                    <span class="nav-label">NEXT <span class="nav-arrow">&gt;</span></span>
                    <span class="nav-title">${nextPost.title}</span>
                </a>` : `<div class="blog-nav-cell nav-next nav-empty"></div>`;

  return `<nav class="blog-nav-row" aria-label="Post navigation">
                ${prevHtml}
                ${nextHtml}
            </nav>`;
}

/**
 * Generate individual post page
 * @param {Object} post - Post object
 * @param {string} template - Post template
 * @param {Object|null} prevPost - Previous post or null
 * @param {Object|null} nextPost - Next post or null
 */
async function generatePostPage(post, template, prevPost, nextPost) {
  const postDir = path.join(CONFIG.outputDir, post.slug);
  await ensureDir(postDir);

  // Add navigation HTML to post data
  const postData = {
    ...post,
    postNavigation: generatePostNavigation(prevPost, nextPost),
  };

  const html = renderTemplate(template, postData);
  const outputPath = path.join(postDir, 'index.html');

  await fs.writeFile(outputPath, html, 'utf-8');
  console.log(`✓ Generated: ${post.slug}/index.html`);
}

/**
 * Generate blog listing page
 * @param {Array} posts - Array of post objects
 * @param {string} template - Blog list template
 */
async function generateBlogListPage(posts, template) {
  // Map tags to categories for filtering
  const getCategory = (tags) => {
    const tagStr = tags.join(' ').toLowerCase();
    if (tagStr.includes('ai-development') || tagStr.includes('ai-collaboration') || tagStr.includes('developer-tools')) return 'ai-development';
    if (tagStr.includes('context') || tagStr.includes('knowledge')) return 'context-management';
    if (tagStr.includes('productivity') || tagStr.includes('flow') || tagStr.includes('workflow')) return 'productivity';
    if (tagStr.includes('tutorial') || tagStr.includes('how-to') || tagStr.includes('getting-started')) return 'tutorials';
    return 'ai-development'; // default
  };

  const postsHtml = posts.map(post => {
    const category = getCategory(post.tags);
    return `
    <a href="/blog/${post.slug}/" class="post-card" data-category="${category}">
      <div class="post-card-header">
        <span class="post-date">${post.dateFormatted} · by ${post.author}</span>
        <h2 class="post-title">${post.title}</h2>
      </div>
      <p class="post-excerpt">${post.description}</p>
      ${post.tags.length > 0 ? `
        <div class="post-tags">
          ${post.tags.slice(0, 4).map(tag => `<span class="post-tag">${tag}</span>`).join('')}
        </div>
      ` : ''}
      <span class="post-read-cta">Read</span>
    </a>
  `;
  }).join('\n');

  const html = renderTemplate(template, { posts: postsHtml });
  const outputPath = path.join(CONFIG.outputDir, 'index.html');

  await fs.writeFile(outputPath, html, 'utf-8');
  console.log(`✓ Generated: blog/index.html`);
}

/**
 * Generate RSS feed
 * @param {Array} posts - Array of post objects
 */
async function generateRSSFeed(posts) {
  const items = posts.slice(0, 20).map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${CONFIG.baseUrl}/blog/${post.slug}/</link>
      <guid isPermaLink="true">${CONFIG.baseUrl}/blog/${post.slug}/</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <author>${escapeXml(post.author)}</author>
      ${post.tags.map(tag => `<category>${escapeXml(tag)}</category>`).join('\n      ')}
    </item>
  `).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(CONFIG.siteName)}</title>
    <link>${CONFIG.baseUrl}/blog/</link>
    <description>${escapeXml(CONFIG.siteDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${CONFIG.baseUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  const outputPath = path.join(CONFIG.outputDir, 'feed.xml');
  await fs.writeFile(outputPath, rss, 'utf-8');
  console.log(`✓ Generated: blog/feed.xml`);
}

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Load a partial file
 * @param {string} partialName - Partial file name
 * @returns {Promise<string>} Partial content
 */
async function loadPartial(partialName) {
  const partialPath = path.join(CONFIG.partialsDir, partialName);
  try {
    return await fs.readFile(partialPath, 'utf-8');
  } catch (error) {
    console.warn(`⚠ Partial not found: ${partialName}`);
    return '';
  }
}

/**
 * Find all HTML files in a directory recursively
 * @param {string} dir - Directory to search
 * @param {Array<string>} excludeDirs - Directories to exclude
 * @returns {Promise<Array<string>>} Array of file paths
 */
async function findHtmlFiles(dir, excludeDirs = []) {
  const files = [];

  async function scan(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (!excludeDirs.includes(entry.name) && !excludeDirs.includes(relativePath)) {
          await scan(fullPath);
        }
      } else if (entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  }

  await scan(dir);
  return files;
}

/**
 * Inject footer partial into all HTML files
 * Replaces <!-- FOOTER_PLACEHOLDER --> with footer content
 */
async function injectFooter() {
  console.log('\n🦶 Injecting footer into all pages...');

  const footerContent = await loadPartial('footer.html');
  if (!footerContent) {
    console.warn('⚠ No footer partial found, skipping footer injection');
    return;
  }

  // Find all HTML files, excluding templates and partials directories
  const htmlFiles = await findHtmlFiles(CONFIG.websiteDir, ['templates', 'partials', 'node_modules', 'content']);

  let injectedCount = 0;
  let skippedCount = 0;

  for (const filePath of htmlFiles) {
    try {
      let content = await fs.readFile(filePath, 'utf-8');

      if (content.includes('<!-- FOOTER_PLACEHOLDER -->')) {
        content = content.replace('<!-- FOOTER_PLACEHOLDER -->', footerContent);
        await fs.writeFile(filePath, content, 'utf-8');
        injectedCount++;
        const relativePath = path.relative(CONFIG.websiteDir, filePath);
        console.log(`✓ Injected footer: ${relativePath}`);
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`✗ Error processing ${filePath}: ${error.message}`);
    }
  }

  console.log(`✓ Footer injected into ${injectedCount} files (${skippedCount} skipped - no placeholder)`);
}

/**
 * Generate build statistics
 * @param {Array} posts - Array of post objects
 */
function printBuildStats(posts) {
  const totalTags = new Set(posts.flatMap(p => p.tags)).size;
  const totalWords = posts.reduce((sum, post) => {
    const wordCount = post.content.split(/\s+/).length;
    return sum + wordCount;
  }, 0);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Build Statistics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Posts:        ${posts.length}`);
  console.log(`Tags:         ${totalTags}`);
  console.log(`Total words:  ${totalWords.toLocaleString()}`);
  console.log(`Output dir:   ${CONFIG.outputDir}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Clean output directory
 * @param {boolean} keepDir - Keep the directory itself
 */
async function cleanOutputDir(keepDir = true) {
  try {
    await fs.access(CONFIG.outputDir);

    const entries = await fs.readdir(CONFIG.outputDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(CONFIG.outputDir, entry.name);

      if (entry.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }
    }

    console.log('✓ Cleaned output directory');
  } catch (error) {
    // Directory doesn't exist, which is fine
    if (keepDir) {
      await ensureDir(CONFIG.outputDir);
    }
  }
}

/**
 * Main build function
 */
async function build() {
  console.log('\n🚀 Starting Ginko blog build...\n');

  const startTime = Date.now();

  try {
    // Configure marked
    configureMarked();

    // Clean and prepare output directory
    await cleanOutputDir();
    await ensureDir(CONFIG.outputDir);

    // Read all posts
    console.log('📖 Reading blog posts...');
    const posts = await readAllPosts();

    if (posts.length === 0) {
      console.log('\n⚠️  No posts to build. Add markdown files to content/blog/');
      console.log('\nExample frontmatter:');
      console.log('---');
      console.log('title: "My First Post"');
      console.log('date: 2025-12-03');
      console.log('description: "An introduction to our blog"');
      console.log('author: "Chris Norton"');
      console.log('tags: ["announcement", "updates"]');
      console.log('slug: "my-first-post"');
      console.log('---\n');
      return;
    }

    // Load templates
    console.log('\n📄 Loading templates...');
    const postTemplate = await loadTemplate('blog-post.html');
    const listTemplate = await loadTemplate('blog-list.html');

    // Generate individual post pages
    console.log('\n✏️  Generating post pages...');
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      // Posts are sorted newest first, so "prev" is newer (i-1), "next" is older (i+1)
      const prevPost = i > 0 ? posts[i - 1] : null;
      const nextPost = i < posts.length - 1 ? posts[i + 1] : null;
      await generatePostPage(post, postTemplate, prevPost, nextPost);
    }

    // Generate blog listing page
    console.log('\n📋 Generating blog listing...');
    await generateBlogListPage(posts, listTemplate);

    // Generate RSS feed
    console.log('\n📡 Generating RSS feed...');
    await generateRSSFeed(posts);

    // Inject footer into all HTML pages
    await injectFooter();

    // Print statistics
    printBuildStats(posts);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Build complete in ${duration}s\n`);

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run build if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}

export { build, readAllPosts, generatePostPage, generateBlogListPage, generateRSSFeed };

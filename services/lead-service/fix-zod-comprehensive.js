#!/usr/bin/env node
/**
 * Comprehensive Zod to JSON Schema converter for Fastify route files
 * This script finds and replaces Zod schema references in Fastify schema blocks
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Simple replacements for common patterns
const SIMPLE_REPLACEMENTS = [
  // Single UUID param patterns
  {
    pattern: /params:\s+z\.object\(\{\s*(\w+):\s+z\.string\(\)\.uuid\(\)\s*\}\)/g,
    replacement: (match, paramName) => `params: { type: 'object', properties: { ${paramName}: { type: 'string', format: 'uuid' } }, required: ['${paramName}'] }`
  },

  // Two UUID params
  {
    pattern: /params:\s+z\.object\(\{\s*(\w+):\s+z\.string\(\)\.uuid\(\),\s*(\w+):\s+z\.string\(\)\.uuid\(\),?\s*\}\)/g,
    replacement: (match, param1, param2) => `params: { type: 'object', properties: { ${param1}: { type: 'string', format: 'uuid' }, ${param2}: { type: 'string', format: 'uuid' } }, required: ['${param1}', '${param2}'] }`
  },

  // Three UUID params
  {
    pattern: /params:\s+z\.object\(\{\s*(\w+):\s+z\.string\(\)\.uuid\(\),\s*(\w+):\s+z\.string\(\)\.uuid\(\),\s*(\w+):\s+z\.string\(\)\.uuid\(\),?\s*\}\)/g,
    replacement: (match, param1, param2, param3) => `params: { type: 'object', properties: { ${param1}: { type: 'string', format: 'uuid' }, ${param2}: { type: 'string', format: 'uuid' }, ${param3}: { type: 'string', format: 'uuid' } }, required: ['${param1}', '${param2}', '${param3}'] }`
  },
];

// Files that reference schema variables need to be noted for manual review
const SCHEMA_REF_PATTERN = /(params|querystring|body|headers):\s+(\w+Schema)/g;

async function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changeCount = 0;

    // Track schema references for manual review
    const schemaRefs = [];
    let match;
    while ((match = SCHEMA_REF_PATTERN.exec(content)) !== null) {
      schemaRefs.push({ type: match[1], schema: match[2], line: getLineNumber(content, match.index) });
    }

    // Apply simple replacements
    for (const { pattern, replacement } of SIMPLE_REPLACEMENTS) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        changeCount += matches.length;
      }
    }

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ ${filePath}: Fixed ${changeCount} simple patterns`);

      if (schemaRefs.length > 0) {
        console.log(`  ⚠ Warning: ${schemaRefs.length} schema references need manual conversion:`);
        schemaRefs.forEach(ref => {
          console.log(`    - Line ${ref.line}: ${ref.type}: ${ref.schema}`);
        });
      }
      return true;
    } else if (schemaRefs.length > 0) {
      console.log(`- ${filePath}: No simple patterns, but ${schemaRefs.length} schema refs need manual conversion`);
      return null;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

async function main() {
  console.log('Finding route files with Zod schemas...\n');

  const files = glob.sync('src/**/*.routes.ts', {
    cwd: '/Users/oscarvalois/Documents/Github/zuclubit-smart-crm/services/lead-service'
  });

  console.log(`Found ${files.length} route files\n`);

  let fixedCount = 0;
  let needsManualCount = 0;

  for (const file of files) {
    const fullPath = path.join('/Users/oscarvalois/Documents/Github/zuclubit-smart-crm/services/lead-service', file);
    const result = await processFile(fullPath);

    if (result === true) fixedCount++;
    else if (result === null) needsManualCount++;
  }

  console.log(`\nSummary:`);
  console.log(`- Fixed: ${fixedCount} files`);
  console.log(`- Need manual review: ${needsManualCount} files`);
  console.log(`\nNote: Complex schema references (body, querystring with schema variables) require manual conversion.`);
}

main().catch(console.error);

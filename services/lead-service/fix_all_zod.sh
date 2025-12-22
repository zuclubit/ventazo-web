#!/bin/bash
# Script to fix common Zod schema patterns in route files

# Find all route files with Zod usage
files=$(grep -rl "z\.object\|z\.string\|z\.array\|z\.nativeEnum" src --include="*.routes.ts")

echo "Found files with Zod schemas:"
echo "$files"
echo ""

for file in $files; do
    echo "Processing: $file"

    # Backup the file
    cp "$file" "$file.bak"

    # Fix pattern: params: z.object({ id: z.string().uuid() })
    perl -i -pe 's/params:\s+z\.object\(\{\s*id:\s+z\.string\(\)\.uuid\(\)\s*\}\)/params: { type: '\''object'\'', properties: { id: { type: '\''string'\'', format: '\''uuid'\'' } }, required: ['\''id'\''] }/g' "$file"

    # Fix pattern: params: z.object({ leadId: z.string().uuid() })
    perl -i -pe 's/params:\s+z\.object\(\{\s*leadId:\s+z\.string\(\)\.uuid\(\)\s*\}\)/params: { type: '\''object'\'', properties: { leadId: { type: '\''string'\'', format: '\''uuid'\'' } }, required: ['\''leadId'\''] }/g' "$file"

    # Fix pattern: params: z.object({ tenantId: z.string().uuid() })
    perl -i -pe 's/params:\s+z\.object\(\{\s*tenantId:\s+z\.string\(\)\.uuid\(\)\s*\}\)/params: { type: '\''object'\'', properties: { tenantId: { type: '\''string'\'', format: '\''uuid'\'' } }, required: ['\''tenantId'\''] }/g' "$file"

    # Fix pattern: params: z.object({ userId: z.string().uuid() })
    perl -i -pe 's/params:\s+z\.object\(\{\s*userId:\s+z\.string\(\)\.uuid\(\)\s*\}\)/params: { type: '\''object'\'', properties: { userId: { type: '\''string'\'', format: '\''uuid'\'' } }, required: ['\''userId'\''] }/g' "$file"

    # Fix pattern: params: z.object({ contactId: z.string().uuid() })
    perl -i -pe 's/params:\s+z\.object\(\{\s*contactId:\s+z\.string\(\)\.uuid\(\)\s*\}\)/params: { type: '\''object'\'', properties: { contactId: { type: '\''string'\'', format: '\''uuid'\'' } }, required: ['\''contactId'\''] }/g' "$file"

    # Fix pattern: params: z.object({ taskId: z.string().uuid() })
    perl -i -pe 's/params:\s+z\.object\(\{\s*taskId:\s+z\.string\(\)\.uuid\(\)\s*\}\)/params: { type: '\''object'\'', properties: { taskId: { type: '\''string'\'', format: '\''uuid'\'' } }, required: ['\''taskId'\''] }/g' "$file"

    # Check if file changed
    if ! cmp -s "$file" "$file.bak"; then
        echo "  ✓ Fixed simple patterns in $file"
    else
        echo "  - No simple patterns found in $file"
        rm "$file.bak"
    fi
done

echo ""
echo "Done! Backup files (.bak) created for changed files."
echo "Complex schemas (body, querystring) still need manual conversion."

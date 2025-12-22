#!/usr/bin/env python3
"""
Script to fix Zod schema validation issues in route files.
Converts Zod schemas to JSON Schema format in Fastify schema definitions.
"""

import re
import sys
from pathlib import Path

def convert_simple_zod_to_json_schema(zod_ref: str) -> str:
    """
    Convert simple Zod schema references to JSON Schema.
    For complex schemas, this returns a placeholder that needs manual conversion.
    """
    # Simple UUID param
    if "z.object({ id: z.string().uuid() })" in zod_ref:
        return """{ type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] }"""

    # Single leadId param
    if "z.object({ leadId: z.string().uuid() })" in zod_ref:
        return """{ type: 'object', properties: { leadId: { type: 'string', format: 'uuid' } }, required: ['leadId'] }"""

    # Return placeholder for complex schemas
    return "COMPLEX_SCHEMA_NEEDS_MANUAL_CONVERSION"

def fix_route_file(file_path: Path) -> tuple[bool, int]:
    """
    Fix Zod schemas in a route file.
    Returns (changed, num_fixes)
    """
    try:
        content = file_path.read_text()
        original_content = content
        fixes = 0

        # Pattern 1: params: z.object(...)
        pattern1 = r'params:\s+z\.object\(\{\s*(\w+):\s+z\.string\(\)\.uuid\(\)\s*\}\)'
        def replace_params(match):
            nonlocal fixes
            param_name = match.group(1)
            fixes += 1
            return f"params: {{ type: 'object', properties: {{ {param_name}: {{ type: 'string', format: 'uuid' }} }}, required: ['{param_name}'] }}"

        content = re.sub(pattern1, replace_params, content)

        # Pattern 2: Two params (leadId, contactId etc)
        pattern2 = r'params:\s+z\.object\(\{\s*(\w+):\s+z\.string\(\)\.uuid\(\),\s*(\w+):\s+z\.string\(\)\.uuid\(\),?\s*\}\)'
        def replace_two_params(match):
            nonlocal fixes
            param1 = match.group(1)
            param2 = match.group(2)
            fixes += 1
            return f"params: {{ type: 'object', properties: {{ {param1}: {{ type: 'string', format: 'uuid' }}, {param2}: {{ type: 'string', format: 'uuid' }} }}, required: ['{param1}', '{param2}'] }}"

        content = re.sub(pattern2, replace_two_params, content)

        changed = content != original_content
        if changed:
            file_path.write_text(content)
            print(f"Fixed {fixes} simple schemas in {file_path}")

        return changed, fixes
    except Exception as e:
        print(f"Error processing {file_path}: {e}", file=sys.stderr)
        return False, 0

def main():
    # Find all route files
    route_files = list(Path("/Users/oscarvalois/Documents/Github/zuclubit-smart-crm/services/lead-service").rglob("*.routes.ts"))

    total_files = 0
    total_fixes = 0

    for file_path in route_files:
        changed, fixes = fix_route_file(file_path)
        if changed:
            total_files += 1
            total_fixes += fixes

    print(f"\nTotal: Fixed {total_fixes} schemas in {total_files} files")
    print("Note: Complex schemas still need manual conversion")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Script to fix localization file format issues:
1. Remove duplicate keys (keep first occurrence)
2. Sync keys between EN and VI files
3. Ensure proper format
"""

import re
from collections import OrderedDict

def parse_localization_file(filepath):
    """Parse localization file and return keys with their values and line numbers"""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    keys = OrderedDict()
    key_pattern = re.compile(r'^\"([^\"]+)\"\s*=\s*\"([^\"]+)\";')
    comment_pattern = re.compile(r'^\"([^\"]+)\"\s*=\s*\"([^\"]+)\";\s*//.*')
    
    for i, line in enumerate(lines, 1):
        line_stripped = line.strip()
        
        # Skip empty lines and comments
        if not line_stripped or line_stripped.startswith('//') or line_stripped.startswith('/*'):
            continue
        
        # Check for key-value pair
        match = key_pattern.match(line_stripped)
        if match:
            key = match.group(1)
            value = match.group(2)
            
            # Keep first occurrence only (remove duplicates)
            if key not in keys:
                keys[key] = {
                    'value': value,
                    'line': i,
                    'original_line': line.rstrip('\n')
                }
            else:
                print(f"  Removing duplicate key '{key}' at line {i}")
    
    return keys, lines

def write_localization_file(filepath, keys, original_lines):
    """Write localization file with deduplicated keys"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    seen_keys = set()
    i = 0
    
    while i < len(lines):
        line = lines[i]
        line_stripped = line.strip()
        
        # Keep comments and empty lines as-is
        if not line_stripped or line_stripped.startswith('//') or line_stripped.startswith('/*'):
            new_lines.append(line)
            i += 1
            continue
        
        # Check if this is a key-value line
        key_pattern = re.compile(r'^\"([^\"]+)\"\s*=\s*\"([^\"]+)\";')
        match = key_pattern.match(line_stripped)
        
        if match:
            key = match.group(1)
            if key in seen_keys:
                # Skip duplicate
                print(f"  Skipping duplicate '{key}' at line {i+1}")
                i += 1
                continue
            else:
                seen_keys.add(key)
                # Use value from keys dict if available
                if key in keys:
                    new_lines.append(f'"{key}" = "{keys[key]["value"]}";')
                else:
                    new_lines.append(line)
        else:
            new_lines.append(line)
        
        i += 1
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))

def sync_keys(en_keys, vi_keys, en_filepath, vi_filepath):
    """Sync keys between EN and VI files"""
    en_key_set = set(en_keys.keys())
    vi_key_set = set(vi_keys.keys())
    
    missing_in_vi = en_key_set - vi_key_set
    missing_in_en = vi_key_set - en_key_set
    
    if missing_in_vi:
        print(f"\n⚠️  Adding {len(missing_in_vi)} missing keys to VI file:")
        # Read VI file
        with open(vi_filepath, 'r', encoding='utf-8') as f:
            vi_content = f.read()
        
        # Add missing keys at the end (before error codes section if exists)
        error_section = vi_content.find('// MARK: - Error Codes')
        if error_section != -1:
            # Insert before error codes
            new_keys = []
            for key in sorted(missing_in_vi):
                en_value = en_keys[key]['value']
                # Use English value as placeholder (should be translated later)
                new_keys.append(f'"{key}" = "{en_value}"; // TODO: Translate to Vietnamese')
                print(f"  Added: {key}")
            vi_content = vi_content[:error_section] + '\n'.join(new_keys) + '\n\n' + vi_content[error_section:]
        else:
            # Append at end
            new_keys = []
            for key in sorted(missing_in_vi):
                en_value = en_keys[key]['value']
                new_keys.append(f'"{key}" = "{en_value}"; // TODO: Translate to Vietnamese')
                print(f"  Added: {key}")
            vi_content = vi_content.rstrip() + '\n' + '\n'.join(new_keys) + '\n'
        
        with open(vi_filepath, 'w', encoding='utf-8') as f:
            f.write(vi_content)
    
    if missing_in_en:
        print(f"\n⚠️  Adding {len(missing_in_en)} missing keys to EN file:")
        # Read EN file
        with open(en_filepath, 'r', encoding='utf-8') as f:
            en_content = f.read()
        
        # Add missing keys at the end (before error codes section if exists)
        error_section = en_content.find('// MARK: - Error Codes')
        if error_section != -1:
            # Insert before error codes
            new_keys = []
            for key in sorted(missing_in_en):
                vi_value = vi_keys[key]['value']
                # Use VI value as placeholder
                new_keys.append(f'"{key}" = "{vi_value}"; // TODO: Translate to English')
                print(f"  Added: {key}")
            en_content = en_content[:error_section] + '\n'.join(new_keys) + '\n\n' + en_content[error_section:]
        else:
            # Append at end
            new_keys = []
            for key in sorted(missing_in_en):
                vi_value = vi_keys[key]['value']
                new_keys.append(f'"{key}" = "{vi_value}"; // TODO: Translate to English')
                print(f"  Added: {key}")
            en_content = en_content.rstrip() + '\n' + '\n'.join(new_keys) + '\n'
        
        with open(en_filepath, 'w', encoding='utf-8') as f:
            f.write(en_content)

def main():
    en_filepath = 'POS ADBD/en.lproj/Localizable.strings'
    vi_filepath = 'POS ADBD/vi-VN.lproj/Localizable.strings'
    
    print("=== Fixing localization file format ===\n")
    
    # Parse files
    print("Parsing EN file...")
    en_keys, en_lines = parse_localization_file(en_filepath)
    print(f"  Found {len(en_keys)} unique keys")
    
    print("\nParsing VI file...")
    vi_keys, vi_lines = parse_localization_file(vi_filepath)
    print(f"  Found {len(vi_keys)} unique keys")
    
    # Remove duplicates
    print("\n=== Removing duplicates ===")
    print("Processing EN file...")
    write_localization_file(en_filepath, en_keys, en_lines)
    
    print("\nProcessing VI file...")
    write_localization_file(vi_filepath, vi_keys, vi_lines)
    
    # Sync keys
    print("\n=== Syncing keys between files ===")
    sync_keys(en_keys, vi_keys, en_filepath, vi_filepath)
    
    print("\n✓ Format fixing completed!")

if __name__ == "__main__":
    main()

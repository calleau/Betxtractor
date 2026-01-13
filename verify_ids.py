#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Quick script to verify IDs are extracted"""

import json
from pathlib import Path
from test_html_parser import parse_html_file, generate_json_from_events

# Parse files
foot_file = Path('exemples/psel_foot_2.html')
events = parse_html_file(str(foot_file))

# Generate JSON
result = generate_json_from_events(events)

# Check first few matches for IDs
count = 0
for key, match in result.items():
    if count >= 3:
        break
    print(f"Match: {key[:50]}...")
    print(f"ID: {match.get('ids', {}).get('PSEL', 'N/A')}")
    print()
    count += 1

# Save to file
with open('exemples/generated_output.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent='\t')

print(f"Total matches: {len(result)}")
print("Saved to exemples/generated_output.json")

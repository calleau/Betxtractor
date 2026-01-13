#!/usr/bin/env python3
import json

with open('exemples/generated_output.json') as f:
    data = json.load(f)

# Check matches with Nul (football)
print("Football matches with Nul odds (correct order verification):\n")
count = 0
for key, match in data.items():
    odds_order = list(match['markets']['Vainqueur'].keys())
    if 'Nul' in odds_order:
        team1 = match['opponents'][0]
        team2 = match['opponents'][1]
        print(f"{count+1}. {team1} vs {team2}")
        print(f"   Order: {' → '.join(odds_order)}")
        
        # Verify Nul is in the middle
        if len(odds_order) == 3 and odds_order[1] == 'Nul':
            print(f"   ✓ CORRECT: Nul is between the two teams")
        else:
            print(f"   ✗ ERROR: Nul should be in the middle!")
        print()
        count += 1
        if count >= 5:
            break

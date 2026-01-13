#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script to parse HTML files and generate JSON matching JSON_final.json format
Using BeautifulSoup for robust HTML parsing
"""

import json
import re
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup


def normalize_joueur_label(label):
    """Normalize player/outcome labels to standard format"""
    if not label:
        return label
    
    label = label.strip()
    
    # Convert common abbreviations to standard names
    if label.lower() in ['n', 'nul', 'draw']:
        return 'Nul'
    
    return label


def parse_html_file(filepath):
    """Parse an HTML file and extract events using BeautifulSoup"""
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    events = []
    
    # Find all psel-event elements (both psel-event-main and psel-event-live)
    event_elements = soup.find_all(['psel-event-main', 'psel-event-live'])
    print(f"  Found {len(event_elements)} event elements")
    
    for idx, event_elem in enumerate(event_elements):
        try:
            event_data = {
                'opponents': [],
                'competition': None,
                'dateTime': None,
                'url': None,
                'id': None,
                'cotes': []
            }
            
            # Extract URL from psel-event__link
            link = event_elem.find('a', class_='psel-event__link')
            if link and link.get('href'):
                event_data['url'] = link['href']
                # Extract ID from href (e.g., /paris-football/.../3300308/match-name)
                # The ID is the second-to-last part before the match name
                href_parts = event_data['url'].split('/')
                if len(href_parts) >= 2:
                    # Try to get the numeric ID (second to last part)
                    potential_id = href_parts[-2]
                    if potential_id.isdigit():
                        event_data['id'] = potential_id
            
            # Extract competition
            comp_elem = event_elem.find('p', class_='psel-event-info__competition')
            if comp_elem:
                event_data['competition'] = comp_elem.get_text(strip=True)
            
            # Extract date/time
            timer_elem = event_elem.find('time', class_='psel-timer')
            if timer_elem:
                dateTime_raw = timer_elem.get_text(strip=True)
                if dateTime_raw:  # Only use if not empty
                    event_data['dateTime'] = dateTime_raw
            
            # Extract opponent names
            opponent_elems = event_elem.find_all(class_='psel-opponent__name')
            for opp_elem in opponent_elems:
                opp_name = opp_elem.get_text(strip=True)
                if opp_name:
                    event_data['opponents'].append(opp_name)
            
            # Extract odds from psel-outcome elements
            outcome_elems = event_elem.find_all('psel-outcome')
            for outcome_elem in outcome_elems:
                label_elem = outcome_elem.find(class_='psel-outcome__label')
                data_elem = outcome_elem.find(class_='psel-outcome__data')
                
                if label_elem and data_elem:
                    label = normalize_joueur_label(label_elem.get_text(strip=True))
                    data_text = data_elem.get_text(strip=True)
                    
                    try:
                        odd_value = float(data_text.replace(',', '.'))
                        if label and odd_value > 0:
                            event_data['cotes'].append({
                                'joueur': label,
                                'cote': odd_value
                            })
                    except (ValueError, AttributeError):
                        pass
            
            # Only add if we have valid data
            if event_data['opponents'] and event_data['cotes']:
                events.append(event_data)
                print(f"    ✓ Event {idx+1}: {' vs '.join(event_data['opponents'][:2])} - {len(event_data['cotes'])} odds")
        
        except Exception as e:
            print(f"    ✗ Error parsing event {idx+1}: {str(e)}")
            continue
    
    return events


def convert_datetime_to_iso(datestr):
    """Convert French date format to ISO format"""
    if not datestr:
        return None
    
    datestr = datestr.strip()
    
    # Try various patterns
    patterns = [
        (r'(\d{1,2})/(\d{1,2})\s+(\d{1,2})[h:](\d{2})', 'fr_date'),  # 12/01 23h30
        (r'Demain\s+(\d{1,2})[h:](\d{2})', 'demain'),  # Demain 23h30
        (r"Aujourd'hui\s+(\d{1,2})[h:](\d{2})", 'today'),  # Aujourd'hui 23h30
        (r'(\d{1,2})[h:](\d{2})', 'heure'),  # 23h30
    ]
    
    now = datetime.now()
    
    for pattern, ptype in patterns:
        match = re.search(pattern, datestr)
        if match:
            if ptype == 'fr_date':
                day = int(match.group(1))
                month = int(match.group(2))
                hour = int(match.group(3))
                minute = int(match.group(4))
                dt = datetime(now.year, month, day, hour, minute)
                return dt.isoformat()[:19]
            elif ptype == 'demain':
                hour = int(match.group(1))
                minute = int(match.group(2))
                # Adjust for next day
                if hour < now.hour or (hour == now.hour and minute < now.minute):
                    dt = datetime(now.year, now.month, now.day + 1, hour, minute)
                else:
                    dt = datetime(now.year, now.month, now.day + 1, hour, minute)
                return dt.isoformat()[:19]
            elif ptype == 'today':
                hour = int(match.group(1))
                minute = int(match.group(2))
                dt = datetime(now.year, now.month, now.day, hour, minute)
                return dt.isoformat()[:19]
            elif ptype == 'heure':
                hour = int(match.group(1))
                minute = int(match.group(2))
                dt = datetime(now.year, now.month, now.day, hour, minute)
                return dt.isoformat()[:19]
    
    return None


def generate_json_from_events(events):
    """Generate JSON in the format of JSON_final.json"""
    result = {}
    
    for event in events:
        if len(event['opponents']) < 2:
            continue
            
        datestr = convert_datetime_to_iso(event['dateTime'])
        if not datestr:
            datestr = datetime.now().isoformat()[:19]
        
        date_display = datestr.replace('T', ' ')
        match_key = f"{' vs '.join(event['opponents'][:2])} - {date_display} - {event.get('competition', 'Unknown')}"
        
        if match_key not in result:
            # Préserver l'ordre des joueurs/issues comme ils apparaissent dans les cotes
            # (dict ordonnés conservent l'ordre d'insertion en Python 3.7+)
            joueurs_ordered = []
            for cote in event['cotes']:
                joueur = cote.get('joueur', '').strip()
                if joueur and joueur not in joueurs_ordered:
                    joueurs_ordered.append(joueur)
            
            result[match_key] = {
                'competition': event.get('competition'),
                'dateTime': datestr,
                'opponents': event['opponents'][:2],  # Toujours stocker les 2 équipes
                'ids': {
                    'PSEL': event.get('id')
                },
                'markets': {
                    'Vainqueur': {}
                }
            }
            
            # Initialize tous les joueurs/issues dans le marché en préservant l'ordre
            for joueur in joueurs_ordered:
                result[match_key]['markets']['Vainqueur'][joueur] = {}
        
        # Add odds for PSEL
        for cote in event['cotes']:
            joueur = cote.get('joueur', '').strip()
            odd = cote.get('cote')
            if joueur and odd:
                if joueur not in result[match_key]['markets']['Vainqueur']:
                    result[match_key]['markets']['Vainqueur'][joueur] = {}
                result[match_key]['markets']['Vainqueur'][joueur]['PSEL'] = odd
    
    return result



# Test with example files
if __name__ == '__main__':
    tennis_file = Path('exemples/psel_tennis_1.html')
    foot_file = Path('exemples/psel_foot_2.html')
    
    print("=" * 60)
    print("Testing HTML Parser with BeautifulSoup")
    print("=" * 60)
    
    all_events = []
    
    if tennis_file.exists():
        print(f"\n✓ Parsing {tennis_file}...")
        tennis_events = parse_html_file(str(tennis_file))
        print(f"  → Found {len(tennis_events)} events in tennis file")
        all_events.extend(tennis_events)
    else:
        print(f"\n✗ {tennis_file} not found")
    
    if foot_file.exists():
        print(f"\n✓ Parsing {foot_file}...")
        foot_events = parse_html_file(str(foot_file))
        print(f"  → Found {len(foot_events)} events in football file")
        all_events.extend(foot_events)
    else:
        print(f"\n✗ {foot_file} not found")
    
    print(f"\n📊 Total events parsed: {len(all_events)}")
    
    if all_events:
        result = generate_json_from_events(all_events)
        print(f"✓ Generated {len(result)} match entries\n")
        
        # Save to file
        output_file = Path('exemples/generated_output.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"✓ Output saved to {output_file}")
        
        # Display sample
        print("\n" + "=" * 60)
        print("Sample output (first 3 matches):")
        print("=" * 60)
        for i, (key, value) in enumerate(list(result.items())[:3]):
            print(f"\n{i+1}. {key}")
            print(f"   Competition: {value['competition']}")
            print(f"   DateTime: {value['dateTime']}")
            print(f"   Opponents: {value['opponents']}")
            print(f"   Cotes:")
            for joueur in value['markets']['Vainqueur']:
                cote = value['markets']['Vainqueur'][joueur].get('PSEL', 'N/A')
                print(f"     {joueur}: {cote}")
    else:
        print("No events found!")

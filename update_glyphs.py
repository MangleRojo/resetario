import json
import collections

# Define the tactics mapping for the first 15 glyphs (IDs 0-14)
tactics_mapping = {
    0: "Captación Solar",          # Red
    1: "Cosecha de Lluvia",        # Blue
    2: "Huertos Urbanos",          # Green
    3: "Bioconstrucción",          # Yellow
    4: "Redes Mesh",               # Orange
    5: "Estufas Eficientes",       # Red
    6: "Compostaje Comunitario",   # Green
    7: "Filtración Bio-construida",# Blue
    8: "Radio Comunitaria",        # Orange
    9: "Reacondicionamiento",      # Yellow
    10: "Energía Cinética",        # Red
    11: "Conservación y Fermentos",# Green
    12: "Reciclaje de Aguas Grises",# Blue
    13: "Cifrado y Privacidad",    # Orange
    14: "Espacios Polivalentes"    # Yellow
}

file_path = 'public/data/glyph-dictionary.json'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    glyphs = data.get('glyphs', {})

    for key, glyph in glyphs.items():
        glyph_id = glyph.get('id')
        
        # Set tactic to empty string for now as requested
        tactic_value = ""
        
        combinations = glyph.get('combinations', {})
        for combo_key, combo_data in combinations.items():
            # Create new ordered dictionary to control field order
            new_combo = {}
            
            # Copy meaning
            if 'meaning' in combo_data:
                new_combo['meaning'] = combo_data['meaning']
            
            # Insert tactic
            new_combo['tactic'] = tactic_value
            
            # Copy description
            if 'description' in combo_data:
                new_combo['description'] = combo_data['description']
            
            # Copy any other fields just in case
            for k, v in combo_data.items():
                if k not in ['meaning', 'description']:
                    new_combo[k] = v
            
            # Update the combination in the glyph
            combinations[combo_key] = new_combo

    # Write back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("Successfully updated glyph-dictionary.json with tactic fields.")

except Exception as e:
    print(f"Error updating JSON: {e}")

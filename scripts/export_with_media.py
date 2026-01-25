import json
import urllib.request
import csv
import os
import shutil
import html
from pathlib import Path
import re
import unicodedata

# --- CONFIGURATION ---
# On récupère le dossier où se trouve le script actuel (scripts/)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# On définit la racine du projet (un dossier au dessus de scripts/)
BASE_DIR = os.path.dirname(SCRIPT_DIR)

# On définit les dossiers par rapport à la racine du projet
OUTPUT_DIR = os.path.join(BASE_DIR, "decks")
MEDIA_DIR = os.path.join(BASE_DIR, "media")

ANKI_URL = "http://localhost:8765"
ANKI_DB = os.path.expanduser("~/Library/Application Support/Anki2/Utilisateur 1/collection.anki2")
ANKI_MEDIA_PATH = os.path.expanduser("~/Library/Application Support/Anki2/Utilisateur 1/collection.media")

def request(action, **params):
    try:
        response = json.load(urllib.request.urlopen(urllib.request.Request(ANKI_URL, json.dumps({
            "action": action,
            "params": params,
            "version": 6
        }).encode("utf-8"))))
        if response.get("error") is not None:
            raise Exception(response["error"])
        return response
    except Exception as e:
        print(f"\n[ERREUR] Impossible de connecter à Anki : {e}")
        return None

def slugify(value):
    """Supprime les accents et caractères spéciaux"""
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^\w\s-]', '', value).strip().lower()
    return re.sub(r'[-\s]+', '_', value)

def copy_media_files(source_text, deck_name, media_subfolder):
    """
    Cherche les références aux médias dans le texte.
    Les copie du dossier Anki vers le repo.
    Retourne le texte modifié avec les nouveaux chemins.
    """
    # Créer le dossier s'il n'existe pas
    target_dir = os.path.join(MEDIA_DIR, media_subfolder)
    os.makedirs(target_dir, exist_ok=True)
    
    modified_text = source_text
    
    # Regex pour trouver les images (src="nomfichier.ext")
    # Anki exporte généralement des fichiers sans espaces avec des numéros
    image_pattern = r'src=["\']([^"\']+\.(jpg|jpeg|png|gif|svg))["\']'
    
    matches = re.findall(image_pattern, source_text, re.IGNORECASE)
    
    for match in matches:
        old_filename = match[0]
        old_path = os.path.join(ANKI_MEDIA_PATH, old_filename)
        
        # Copier le fichier depuis la base Anki vers le repo
        if os.path.exists(old_path):
            # Utiliser un nom de fichier "lisible" si possible
            # Sinon garder le nom original
            new_filename = old_filename
            new_path = os.path.join(target_dir, new_filename)
            
            try:
                shutil.copy2(old_path, new_path)
                print(f"  📸 Copié : {new_filename}")
                
                # Remplacer le chemin dans le texte
                new_relative_path = f"../media/{media_subfolder}/{new_filename}"
                modified_text = modified_text.replace(
                    f'src="{old_filename}"',
                    f'src="{new_relative_path}"'
                )
                modified_text = modified_text.replace(
                    f"src='{old_filename}'",
                    f"src='{new_relative_path}'"
                )
            except Exception as e:
                print(f"  ⚠️  Erreur lors de la copie de {old_filename}: {e}")
        else:
            print(f"  ⚠️  Fichier média introuvable: {old_filename}")
    
    return modified_text

def main():
    # Récupérer la liste des decks
    response = request("deckNames")
    if not response: return
    
    all_decks = response["result"]
    
    print("\n--- DECKS DISPONIBLES ---")
    for index, name in enumerate(all_decks):
        print(f"[{index}] {name}")
    
    user_input = input("\nEntrez les numéros à exporter (séparés par une virgule, ou 'all') : ")
    
    target_decks = []
    if user_input.lower().strip() == 'all' or user_input.strip() == '':
        target_decks = all_decks
    else:
        try:
            indices = [int(x.strip()) for x in user_input.split(",")]
            for i in indices:
                if 0 <= i < len(all_decks):
                    target_decks.append(all_decks[i])
        except ValueError:
            print("[ERREUR] Saisie invalide.")
            return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print(f"\nDébut de l'export pour {len(target_decks)} deck(s)...\n")

    for deck in target_decks:
        print(f"📦 Export de '{deck}'...")
        
        # Déterminer le dossier média (utiliser le premier mot du deck)
        # Ex: "PTSI::Maths" -> "maths"
        media_subfolder = slugify(deck.split("::")[-1])
        
        find_notes = request("findNotes", query=f'"deck:{deck}"')
        notes_info = request("notesInfo", notes=find_notes["result"])
        
            # On découpe le nom du deck
        parts = deck.split("::")

        # Cas 1 : Deck seul (ex: "Vocabulaire")
        if len(parts) == 1:
            matiere = "divers"
            safe_filename = slugify(parts[0])
        # Cas 2 : Deck avec sous-paquets (ex: "SI::Cycle5::Torseur")
        else:
            # La matière est toujours le premier mot
            matiere = slugify(parts[0])
            # Le nom du fichier est la suite, jointe par des underscores
            safe_filename = "_".join([slugify(p) for p in parts[1:]])

        # Création du dossier par matière : decks/matiere/
        # (matiere sera "si", "maths", "anglais", etc.)
        matiere_dir = os.path.join(OUTPUT_DIR, matiere)
        os.makedirs(matiere_dir, exist_ok=True)

        # Nom final du fichier CSV
        filename = os.path.join(matiere_dir, f"{safe_filename}.csv")

        
        try:
            with open(filename, "w", encoding="utf-8-sig", newline="") as f:
                writer = csv.writer(f, delimiter=";")
                
                count = 0
                for note in notes_info["result"]:
                    fields_values = []
                    
                    for f_obj in note["fields"].values():
                        raw_value = f_obj["value"]
                        clean_value = html.unescape(raw_value)
                        
                        # NOUVEAU : Copier les images et modifier les chemins
                        modified_value = copy_media_files(clean_value, deck, media_subfolder)
                        
                        fields_values.append(modified_value)
                    
                    tags = " ".join(note["tags"])
                    fields_values.append(tags)
                    
                    writer.writerow(fields_values)
                    count += 1
            print(f"✅ OK ({count} cartes avec images copiées)\n")
            
        except Exception as e:
            print(f"❌ ERREUR : {e}\n")

    print("--- Terminé ! N'oublie pas : git add . && git commit && git push ---")

if __name__ == "__main__":
    main()

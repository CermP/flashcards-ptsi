import genanki
import csv
import os
import re
import unicodedata

# --- CONFIGURATION AUTOMATIQUE DES CHEMINS ---
SCRIPT_PATH = os.path.realpath(__file__)
SCRIPT_DIR = os.path.dirname(SCRIPT_PATH)
BASE_DIR = os.path.dirname(SCRIPT_DIR)

DECKS_DIR = os.path.join(BASE_DIR, "decks")
MEDIA_DIR = os.path.join(BASE_DIR, "media")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# --- UTILITAIRE ---
def slugify(value):
    """Supprime les accents et caractères spéciaux (identique à l'export)"""
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^\w\s-]', '', value).strip().lower()
    return re.sub(r'[-\s]+', '_', value)

# --- MODÈLE ANKI ---
MODEL_ID = 1607392319
MY_MODEL = genanki.Model(
  MODEL_ID,
  'PTSI Modele Simple',
  fields=[{'name': 'Question'}, {'name': 'Reponse'}],
  templates=[{
      'name': 'Carte 1',
      'qfmt': '{{Question}}',
      'afmt': '{{FrontSide}}<hr id="answer">{{Reponse}}',
  }])

def get_unique_deck_id(deck_name):
    return abs(hash(deck_name)) % (10 ** 8)

def process_csv_file(csv_path):
    filename = os.path.basename(csv_path)
    # Le nom du deck pour Anki
    deck_name = filename.replace('.csv', '').replace('-', '::').replace('_', ' ')
    
    # CALCUL DU DOSSIER MEDIA
    last_part = deck_name.split('::')[-1]
    media_subfolder = slugify(last_part)
    
    print(f"🔨 Traitement de {deck_name}...")
    deck = genanki.Deck(get_unique_deck_id(deck_name), deck_name)
    media_files_to_include = []

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        for row in reader:
            if len(row) < 2: continue
            
            front, back = row[0], row[1]
            # Nettoyage des guillemets doublés du CSV
            front = front.replace('""', '"').strip('"')
            back = back.replace('""', '"').strip('"')

            # --- ÉTAPE CRUCIALE : NETTOYAGE DES CHEMINS POUR L'AFFICHAGE DANS ANKI ---
            # On transforme <img src="../media/si/photo.jpg"> en <img src="photo.jpg">
            # Sinon Anki cherche un dossier qui n'existe pas sur le téléphone/ordinateur
            front = re.sub(r'src="[^"]*/([^"/]+)"', r'src="\1"', front)
            back = re.sub(r'src="[^"]*/([^"/]+)"', r'src="\1"', back)

            # Création de la note avec le texte nettoyé
            note = genanki.Note(model=MY_MODEL, fields=[front, back])
            deck.add_note(note)

            # --- COLLECTE DES IMAGES POUR LE PAQUET APKG ---
            # Ici on garde le chemin complet pour que Python trouve le fichier sur ton Mac
            image_refs = re.findall(r'src="([^"]+)"', row[0] + row[1]) 
            for img_ref in image_refs:
                img_name = os.path.basename(img_ref)
                full_img_path = os.path.join(MEDIA_DIR, media_subfolder, img_name)
                
                if os.path.exists(full_img_path):
                    if full_img_path not in media_files_to_include:
                        media_files_to_include.append(full_img_path)
                else:
                    print(f"    ⚠️ Image manquante : {img_name} (cherchée dans {media_subfolder})")

    # Génération du fichier .apkg final
    output_filename = os.path.join(OUTPUT_DIR, filename.replace('.csv', '.apkg'))
    package = genanki.Package(deck)
    package.media_files = media_files_to_include
    package.write_to_file(output_filename)
    print(f"    ✅ Créé : {output_filename}")


# --- LANCEMENT ---
for root, dirs, files in os.walk(DECKS_DIR):
    for file in files:
        if file.endswith(".csv"):
            process_csv_file(os.path.join(root, file))

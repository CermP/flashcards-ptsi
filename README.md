# Flashcards PTSI collaboratives
## Pourquoi un repo ?
J'avais déjà commencé à créer des packs Anki pour mon utilisation personnelle. Je me suis dit pourquoi pas les partager à qui veut et en a besoin. 

De plus, créer un repo permet à n'importe qui de participer à ce projet. C'est une invitation ! Si vous êtes en PTSI et que vous souhaitez ajouter vos cartes/decks ou corriger des cartes pour rendre ce repo encore plus merveilleux, ne vous gênez pas !

## Structure

- `decks/` : Les fichiers CSV des flashcards
- `media/` : Les images (schémas, graphiques) organisées par matière
- `scripts/` : Les outils d'export/import

## Comment Contribuer

### Pour ajouter/corriger des cartes :

1. Éditez le fichier CSV directement sur GitHub (cliquez sur le crayon).
2. OU téléchargez le CSV, importez-le dans Anki, modifiez, puis relancez `export_with_media.py`.

### Pour ajouter des images :

1. Importez votre image dans Anki (en créant une carte avec l'image).
2. Relancez le script : `python3 scripts/export_with_media.py`
3. Le script copiera automatiquement les images dans le dossier `media/`.

## Installation

1. Clonez le repo : `git clone https://github.com/VOTRE_PSEUDO/anki-ptsi.git`
2. Installez AnkiConnect (addon Anki).
3. Lancez Anki.
4. Relancez le script d'export.

#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
from datetime import date
from urllib.parse import quote

# --- CONFIGURATION ---
SCRIPT_PATH = os.path.realpath(__file__)
SCRIPT_DIR = os.path.dirname(SCRIPT_PATH)
BASE_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(BASE_DIR, "docs")

print("="*60)
print("📊 GÉNÉRATION DE L'INDEX DES DECKS")
print("="*60)
print(f"📂 Dossier de sortie : {OUTPUT_DIR}")
print()

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)
    print("ℹ️ Dossier docs créé")

def collect_decks():
    decks_by_subject = {}
    
    try:
        # Search for .apkg files in the docs directory
        files = os.listdir(OUTPUT_DIR)
    except Exception as e:
        print(f"❌ Erreur lecture dossier : {e}")
        return decks_by_subject
    
    apkg_files = [f for f in files if f.endswith('.apkg')]
    print(f"🔍 Fichiers .apkg trouvés : {len(apkg_files)}")
    
    for filename in sorted(apkg_files):
        try:
            base = filename.replace('.apkg', '')
            
            if '-' in base:
                parts = base.split('-', 1)
                subject = parts[0].capitalize()
                title = parts[1].replace('_', ' ')
            else:
                subject = "Autres"
                title = base.replace('_', ' ')
            
            filepath = os.path.join(OUTPUT_DIR, filename)
            size_bytes = os.path.getsize(filepath)
            
            if size_bytes < 1024 * 1024:
                size_str = f"{size_bytes / 1024:.1f} KB"
            else:
                size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
            
            if subject not in decks_by_subject:
                decks_by_subject[subject] = []
            
            decks_by_subject[subject].append({
                'name': title,
                'filename': filename,
                'size': size_str,
                'date': date.fromtimestamp(os.path.getmtime(filepath)).strftime("%d/%m/%Y")
            })
            
            print(f"   ✅ {subject} : {title} ({size_str})")
            
        except Exception as e:
            print(f"   ⚠️ Erreur pour {filename}: {e}")
    
    return decks_by_subject

def save_json(data):
    path = os.path.join(OUTPUT_DIR, 'decks.json')
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\\n✅ JSON créé : decks.json")
    except Exception as e:
        print(f"\\n❌ Erreur JSON : {e}")

def save_sitemap(data):
    """Génère le fichier sitemap.xml pour le référencement"""
    today = date.today().isoformat()
    base_url = "https://cermp.github.io/anki-ptsi/"
    
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Page d'accueil (landing)
    xml += '  <url>\n'
    xml += f'    <loc>{base_url}</loc>\n'
    xml += f'    <lastmod>{today}</lastmod>\n'
    xml += '    <changefreq>daily</changefreq>\n'
    xml += '  </url>\n'
    
    # Page des decks
    xml += '  <url>\n'
    xml += f'    <loc>{base_url}decks.html</loc>\n'
    xml += f'    <lastmod>{today}</lastmod>\n'
    xml += '    <changefreq>daily</changefreq>\n'
    xml += '  </url>\n'
    
    # Ajouter chaque deck (fichier .apkg)
    if data:
        for subject, deck_list in data.items():
            for deck in deck_list:
                filename = deck['filename']
                xml += '  <url>\n'
                xml += f'    <loc>{base_url}{filename}</loc>\n'
                xml += f'    <lastmod>{today}</lastmod>\n'
                xml += '  </url>\n'
                
    xml += '</urlset>'
    
    path = os.path.join(OUTPUT_DIR, 'sitemap.xml')
    try:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(xml)
        print(f"✅ Sitemap créé : sitemap.xml")
    except Exception as e:
        print(f"❌ Erreur Sitemap : {e}")

def save_html(data):
    total_decks = sum(len(d) for d in data.values()) if data else 0
    total_subjects = len(data) if data else 0
    
    html = f'''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="google-site-verification" content="DmmybIY5FSzQJMfHe_74H2ciJW4PxvPLA-KXHtOE3_I" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anki PTSI — Téléchargement des Decks</title>
    <meta name="description" content="Téléchargez les decks Anki pour la PTSI : Maths, Physique, SI, et plus. Projet collaboratif par et pour les étudiants.">
    
    <!-- Link to external CSS -->
    <link rel="stylesheet" href="css/style.css">
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar">
        <div class="container navbar-inner">
            <a href="index.html" class="navbar-brand">Anki PTSI</a>
            <div class="navbar-links">
                <a href="index.html" class="nav-link">Accueil</a>
                <a href="decks.html" class="nav-link active">Decks</a>
                <a href="https://github.com/CermP/anki-ptsi" target="_blank" rel="noopener" class="nav-link nav-github">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
            </div>
        </div>
    </nav>

    <header>
        <div class="container hero-content">
            <h1 class="hero-title">Anki PTSI</h1>
            <p class="hero-subtitle">Mémorisez vos cours efficacement avec nos decks collaboratifs. <br>Maths, Physique, SI... tout y est !</p>
            
            <div class="search-container">
                <span class="search-icon">🔍</span>
                <input type="text" id="search-input" class="search-input" placeholder="Rechercher un chapitre, une matière... ( / )">
            </div>

            <div class="stats-container">
                <div class="stat-badge">
                    <strong>{total_decks}</strong> Decks
                </div>
                <div class="stat-badge">
                    <strong>{total_subjects}</strong> Matières
                </div>
                <div class="stat-badge">
                    <strong>Collaboratif</strong> & Open Source
                </div>
            </div>
        </div>
    </header>

    <div class="container main-content">'''
    
    if not data or total_decks == 0:
        html += '''
        <div class="empty-state">
            <h2>📦 Aucun deck disponible</h2>
            <p>Les decks seront générés automatiquement. Revenez plus tard !</p>
        </div>'''
    else:
        # Create a hidden No Results div
        html += '<div id="no-results" class="no-results" style="display: none;">❌ Aucun résultat trouvé pour votre recherche.</div>'

        for subject in sorted(data.keys()):
            html += f'''
            <section class="subject-section">
                <div class="subject-header">
                    <span class="subject-icon"></span>
                    <h2 class="subject-title">{subject}</h2>
                </div>
                
                <div class="deck-grid">'''
            
            for deck in data[subject]:
                html += f'''
                    <div class="deck-card">
                        <div class="deck-info">
                            <h3 class="deck-name">{deck['name']}</h3>
                            <div class="deck-meta">
                                <span>📅 {deck.get('date', '')}</span>
                                <span>📦 {deck['size']}</span>
                            </div>
                        </div>
                        <a href="{quote(deck['filename'])}" class="download-btn" download="{deck['filename']}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Télécharger
                        </a>
                    </div>'''
            
            html += '''
                </div>
            </section>'''
    
    html += '''
    </div>

    <footer>
        <div class="container">
            <p>Projet open source maintenu par <a href="https://github.com/CermP/anki-ptsi" target="_blank" rel="noopener">CermP</a></p>
            <p style="margin-top: 0.5rem; opacity: 0.6;">Contribuez sur GitHub pour ajouter vos propres decks !</p>
        </div>
    </footer>

    <!-- Stats & Scripts -->
    <script src="js/main.js"></script>
</body>
</html>'''
    
    path = os.path.join(OUTPUT_DIR, 'decks.html')
    try:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ HTML créé : decks.html")
    except Exception as e:
        print(f"❌ Erreur HTML : {e}")

if __name__ == "__main__":
    decks = collect_decks()
    save_json(decks)
    save_html(decks)
    save_sitemap(decks)
    
    print("\\n" + "="*60)
    if decks:
        total = sum(len(d) for d in decks.values())
        print(f"✨ SUCCÈS : {total} deck(s) dans {len(decks)} matières")
    else:
        print("ℹ️ Aucun deck trouvé (mais index généré quand même)")
    print("="*60)

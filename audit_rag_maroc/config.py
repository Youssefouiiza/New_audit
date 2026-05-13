# ============================================================
# config.py — Configuration centrale du projet RAG
# RAG Audit Juridique Marocain
# ============================================================

import os

# ── Chemins ─────────────────────────────────────────────────
# Dossier racine des documents juridiques PDF
DATA_PATH = "./data"

# Dossier de la base vectorielle ChromaDB (créé automatiquement)
VECTOR_DB_PATH = "./vector_db"

# Nom de la collection ChromaDB
COLLECTION_NAME = "droit_marocain"

# ── Paramètres de découpage (chunking) ──────────────────────
# Taille de chaque chunk en caractères
CHUNK_SIZE = 1000

# Chevauchement entre chunks consécutifs (pour ne pas perdre le contexte)
CHUNK_OVERLAP = 200

# ── Paramètres de récupération (retrieval) ──────────────────
# Nombre de chunks récupérés pour chaque requête
RETRIEVAL_K = 8

# Type de recherche : "similarity" ou "mmr" (Maximum Marginal Relevance)
# mmr = diversifie les sources pour éviter les répétitions
RETRIEVAL_TYPE = "mmr"

# Score de similarité minimum (0 = tout accepter, 1 = parfait)
SIMILARITY_THRESHOLD = 0.3

# Température du LLM (0.0 = déterministe, anti-hallucination)
TEMPERATURE = 0.0

# Interdit de citer le CGI hors contexte fiscal (anti-hallucination)
INTERDIT_CGI = True

# ── Modèle d'embeddings ─────────────────────────────────────
# Modèle gratuit, léger et performant (pas de clé API requise)
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# ── Modèles LLM disponibles via Ollama ──────────────────────
# Structure : {clé: {nom, description, qualité, RAM, commande_ollama}}
AVAILABLE_MODELS = {
    "llama3": {
        "nom": "Llama 3 (8B)",
        "description": "Meilleure qualité de raisonnement juridique",
        "qualite": "⭐⭐⭐⭐⭐",
        "ram_requise": "8 GB",
        "commande_ollama": "ollama pull llama3",
        "contexte_max": 8192,
        "recommande": True,
    },
    "mistral": {
        "nom": "Mistral (7B)",
        "description": "Bon équilibre qualité/vitesse, excellent en français",
        "qualite": "⭐⭐⭐⭐",
        "ram_requise": "6 GB",
        "commande_ollama": "ollama pull mistral",
        "contexte_max": 8192,
        "recommande": True,
    },
    "phi3": {
        "nom": "Phi-3 Mini (3.8B)",
        "description": "Léger et rapide, idéal pour machines avec peu de RAM",
        "qualite": "⭐⭐⭐",
        "ram_requise": "4 GB",
        "commande_ollama": "ollama pull phi3",
        "contexte_max": 4096,
        "recommande": False,
    },
    "gemma2": {
        "nom": "Gemma 2 (9B)",
        "description": "Précis mais plus lent, bon pour l'analyse fine",
        "qualite": "⭐⭐⭐⭐",
        "ram_requise": "8 GB",
        "commande_ollama": "ollama pull gemma2",
        "contexte_max": 8192,
        "recommande": False,
    },
}

# Modèle par défaut
DEFAULT_MODEL = "mistral"

# ── Catégories juridiques marocaines ────────────────────────
# Correspondance entre nom de dossier et libellé affiché
CATEGORIES_JURIDIQUES = {
    "droit bancaire et financier": "Droit Bancaire et Financier",
    "droit de la concurrence et consommation": "Droit de la Concurrence et Consommation",
    "droit des données et numérique": "Droit des Données et Numérique",
    "droit des marchés publics": "Droit des Marchés Publics",
    "droit des obligations et contrats (doc)": "Droit des Obligations et Contrats (DOC)",
    "droit des sociétés corporate": "Droit des Sociétés Corporate",
    "droit du travail": "Droit du Travail",
    "droit fiscal": "Droit Fiscal",
    "droit immobilier et foncier": "Droit Immobilier et Foncier",
    "droit pénal et procédure pénale": "Droit Pénal et Procédure Pénale",
}

# ── Prompt d'audit corrigé ─────────────────────────────────────
AUDIT_PROMPT_TEMPLATE = """Tu es un expert senior en audit de conformité juridique marocaine.

═══════════════════════════════════════════════════
RÔLES DES DEUX ENTRÉES :
- BASE JURIDIQUE (ci-dessous) = Les TEXTES DE LOI MAROCAINS de référence
- DOCUMENT CLIENT (ci-dessous) = Le document soumis par l'entreprise à auditer
═══════════════════════════════════════════════════

BASE JURIDIQUE MAROCAINE (textes de référence) :
{context}

═══════════════════════════════════════════════════
DOCUMENT CLIENT À AUDITER :
{question}
═══════════════════════════════════════════════════

MISSION : Compare le DOCUMENT CLIENT avec la BASE JURIDIQUE.
- Identifie les clauses, montants, délais ou pratiques du document client qui
  sont contraires, manquants ou non conformes aux textes de loi marocains.
- Si le document client est conforme aux lois marocaines → réponds CONFORME.
- Si le document client contient des violations → liste chaque violation.

RÈGLES ABSOLUES :
1. Ne cite QUE des références exactes présentes dans la BASE JURIDIQUE.
2. N'invente aucun article, loi ou référence.
3. Si tu n'as pas assez d'information → réponds NON DISPONIBLE.
4. Sois précis : la violation doit citer le texte problématique du document client.

FORMAT DE RÉPONSE OBLIGATOIRE :

Si violation(s) trouvée(s) dans le document client :
=== VIOLATION ===
📌 TEXTE ORIGINAL : [extrait exact du document client qui pose problème]
📖 CITATION EXACTE DU DOCUMENT : "[article ou clause de la loi marocaine violée]"
📁 SOURCE : [nom du fichier de loi marocaine]

Si le document client est conforme :
✅ CONFORME - Le document respecte les dispositions du droit marocain applicable.

Si information insuffisante :
❌ NON DISPONIBLE - Données insuffisantes pour évaluer la conformité.
"""

# ── Paramètres Streamlit ─────────────────────────────────────
APP_TITLE = "⚖️ Audit Juridique Marocain — RAG"
APP_ICON = "⚖️"
APP_DESCRIPTION = "Assistant IA d'audit de conformité au droit marocain"
RESULTS_SECTION_TITLE = "## 📊 Résultats de l'audit"

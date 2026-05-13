# ⚖️ RAG Audit Juridique Marocain

> Assistant IA local d'audit de conformité au droit marocain — 100% gratuit, aucune clé API requise.

---

## 📋 Description

Ce projet implémente un système **RAG (Retrieval-Augmented Generation)** spécialisé pour l'audit juridique au Maroc. Il analyse vos contrats, rapports et documents juridiques, détecte les non-conformités avec la législation marocaine, et propose des corrections avec références légales précises.

**Fonctionnalités :**
- 🔍 Détection automatique des clauses non conformes
- ⚖️ Citation des articles exacts (lois, dahirs, codes)
- ✏️ Proposition de corrections
- ⚠️ Évaluation de la gravité (Faible / Moyenne / Critique)
- 💾 100% local — vos données ne quittent jamais votre machine

---

## 🗂️ Structure du projet

```
audit_rag_maroc/
├── data/                      ← Placez vos PDFs ici (organisés par sous-dossier)
│   ├── Droit bancaire et financier/
│   ├── Droit de la concurrence et consommation/
│   ├── Droit des données et numérique/
│   ├── Droit des marchés publics/
│   ├── Droit des obligations et contrats (DOC)/
│   ├── Droit des sociétés Corporate/
│   ├── Droit du travail/
│   ├── Droit fiscal/
│   ├── Droit immobilier et foncier/
│   └── Droit pénal et procédure pénale/
├── vector_db/                 ← Créé automatiquement (ChromaDB)
├── requirements.txt
├── config.py                  ← Configuration centrale
├── 01_load_and_index.py       ← Indexation des PDFs
├── 02_test_cli.py             ← Test en ligne de commande
├── 03_streamlit_app.py        ← Interface graphique
├── run.bat                    ← Lancement Windows
└── run.sh                     ← Lancement Linux/Mac
```

---

## 🚀 Installation et démarrage

### Prérequis

| Outil | Version | Lien |
|-------|---------|------|
| Python | ≥ 3.9 | https://python.org |
| Ollama | Dernière | https://ollama.ai |
| RAM | ≥ 6 GB | — |

### Étape 1 — Installer Ollama

**Windows / macOS :** Téléchargez l'installateur sur [https://ollama.ai](https://ollama.ai)

**Linux :**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Étape 2 — Télécharger un modèle LLM

```bash
# Recommandé (bon en français, 4 GB)
ollama pull mistral

# Meilleure qualité (5 GB)
ollama pull llama3

# Léger et rapide (2 GB)
ollama pull phi3

# Précis (5 GB)
ollama pull gemma2
```

### Étape 3 — Placer vos PDFs

Copiez vos documents juridiques dans `data/` en respectant la structure :

```
data/
├── Droit du travail/
│   ├── code_travail_maroc.pdf
│   └── jurisprudence_travail.pdf
├── Droit fiscal/
│   └── code_general_impots.pdf
└── ...
```

> ⚠️ Le nom des sous-dossiers est important — il sert à catégoriser les documents.

### Étape 4 — Lancement

**Windows :**
```batch
run.bat
```

**Linux / macOS :**
```bash
chmod +x run.sh
./run.sh
```

**Ou manuellement :**
```bash
pip install -r requirements.txt
python 01_load_and_index.py
streamlit run 03_streamlit_app.py
```

---

## 💻 Utilisation

### Interface Streamlit (recommandée)

1. Ouvrez http://localhost:8501 dans votre navigateur
2. Choisissez un modèle LLM dans la **sidebar gauche**
3. Chargez votre document (PDF/TXT) ou collez du texte
4. Cliquez **"Lancer l'audit"**
5. Lisez le rapport et téléchargez-le

### Test en ligne de commande

```bash
python 02_test_cli.py
```

---

## 🤖 Comparatif des modèles

| Modèle | Qualité FR | RAM | Vitesse | Recommandé |
|--------|-----------|-----|---------|------------|
| mistral | ⭐⭐⭐⭐⭐ | 6 GB | Moyen | ✅ Oui |
| llama3 | ⭐⭐⭐⭐⭐ | 8 GB | Moyen | ✅ Oui |
| phi3 | ⭐⭐⭐ | 4 GB | Rapide | Faible RAM |
| gemma2 | ⭐⭐⭐⭐ | 8 GB | Lent | Non |

---

## ⚙️ Configuration avancée

Modifiez `config.py` pour personnaliser :

```python
DATA_PATH = "./data"          # Chemin vers vos PDFs
CHUNK_SIZE = 1000             # Taille des chunks (caractères)
CHUNK_OVERLAP = 200           # Chevauchement entre chunks
RETRIEVAL_K = 5               # Nombre de sources récupérées
DEFAULT_MODEL = "mistral"     # Modèle par défaut
```

---

## 🔧 Dépannage

### ❌ "Ollama non démarré"
- Vérifiez que l'icône Ollama est dans la barre des tâches (Windows)
- Lancez Ollama manuellement : `ollama serve`

### ❌ "Modèle non trouvé"
```bash
ollama pull mistral   # ou le modèle souhaité
ollama list           # vérifier les modèles installés
```

### ❌ "Base vectorielle introuvable"
```bash
python 01_load_and_index.py
```

### ❌ "Aucun PDF trouvé"
- Vérifiez que vos PDFs sont dans `data/` (sous-dossiers inclus)
- Les fichiers `.pdf` doivent être lisibles et non protégés par mot de passe

### ❌ Erreur d'installation des dépendances
```bash
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir
```

### ❌ Réponses en anglais
Le modèle `mistral` est le meilleur pour le français. Ajoutez dans le prompt de `config.py` :
```
Réponds UNIQUEMENT en français.
```

---

## 📊 Architecture technique

```
PDF Documents
     │
     ▼
PyPDFLoader (LangChain)
     │
     ▼
RecursiveCharacterTextSplitter (1000 chars, overlap 200)
     │
     ▼
HuggingFace Embeddings (all-MiniLM-L6-v2)
     │
     ▼
ChromaDB (persistant)
     │
     ▼ (à l'audit)
Retriever (top-K similarité)
     │
     ▼
Ollama LLM (Mistral/Llama3/Phi3/Gemma2)
     │
     ▼
Rapport d'audit structuré
```

---

## 📜 Licence

Usage interne — Projet académique et professionnel.  
Les documents juridiques indexés restent la propriété de leurs auteurs respectifs.

#!/bin/bash
# ============================================================
# run.sh — Lancement automatique sur Linux/Mac
# RAG Audit Juridique Marocain
# ============================================================

set -e

echo ""
echo "============================================================"
echo "  ⚖️  RAG AUDIT JURIDIQUE MAROCAIN — Démarrage"
echo "============================================================"
echo ""

# ── Vérification Python ──────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    echo "❌ Python3 n'est pas installé."
    echo "   Ubuntu/Debian : sudo apt install python3 python3-pip"
    echo "   macOS         : brew install python"
    exit 1
fi

PY_VER=$(python3 --version 2>&1)
echo "✅ $PY_VER détecté"

# ── Environnement virtuel (recommandé) ───────────────────────
if [[ ! -d "venv" ]]; then
    echo ""
    echo "🔧 Création d'un environnement virtuel Python..."
    python3 -m venv venv
    echo "✅ Environnement virtuel créé"
fi

echo "🔧 Activation de l'environnement virtuel..."
source venv/bin/activate

# ── Installation des dépendances ─────────────────────────────
echo ""
echo "📦 Vérification des dépendances..."
if ! python -c "import streamlit" &>/dev/null; then
    echo "⬇️  Installation des dépendances (première fois, ~5 min)..."
    pip install --upgrade pip -q
    pip install -r requirements.txt
    echo "✅ Dépendances installées"
else
    echo "✅ Dépendances déjà installées"
fi

# ── Vérification Ollama ───────────────────────────────────────
echo ""
echo "🤖 Vérification d'Ollama..."
if ! command -v ollama &>/dev/null; then
    echo ""
    echo "⚠️  Ollama non installé."
    echo ""
    echo "👉 Installation :"
    echo "   Linux  : curl -fsSL https://ollama.ai/install.sh | sh"
    echo "   macOS  : brew install ollama"
    echo ""
    echo "💡 Modèles recommandés :"
    echo "   ollama pull mistral"
    echo "   ollama pull llama3"
    echo "   ollama pull phi3"
    echo ""
    echo "ℹ️  L'indexation continue, mais l'interface nécessite Ollama."
else
    echo "✅ $(ollama --version)"
fi

# ── Création du dossier data/ ─────────────────────────────────
if [[ ! -d "data" ]]; then
    echo ""
    mkdir -p data
    echo "📁 Dossier data/ créé"
    echo ""
    echo "============================================================"
    echo " 📂 IMPORTANT : Placez vos PDFs dans data/ avant de continuer"
    echo "============================================================"
    echo ""
    echo "Structure recommandée :"
    echo "  data/"
    echo "  ├── Droit bancaire et financier/"
    echo "  ├── Droit du travail/"
    echo "  ├── Droit fiscal/"
    echo "  └── ..."
    echo ""
    read -p "Appuyez sur Entrée une fois vos PDFs placés..."
fi

# ── Indexation si nécessaire ─────────────────────────────────
echo ""
if [[ ! -d "vector_db" ]]; then
    echo "🔍 Base vectorielle introuvable — Lancement de l'indexation..."
    python 01_load_and_index.py
else
    echo "✅ Base vectorielle existante"
    read -p "  🔄 Réindexer les documents ? (o/N) : " REINDEX
    if [[ "$REINDEX" =~ ^[oO]$ ]]; then
        python 01_load_and_index.py
    fi
fi

# ── Lancement Streamlit ───────────────────────────────────────
echo ""
echo "============================================================"
echo "  🚀 Lancement de l'interface Streamlit..."
echo "  📌 Ouvrez : http://localhost:8501"
echo "  🛑 Arrêt  : Ctrl+C"
echo "============================================================"
echo ""

streamlit run 03_streamlit_app.py --server.port 8501 --server.headless false

echo ""
echo "👋 Application arrêtée."

@echo off
REM ============================================================
REM run.bat — Lancement automatique sur Windows
REM RAG Audit Juridique Marocain
REM ============================================================
chcp 65001 > nul
setlocal

echo.
echo  ============================================================
echo   ⚖️  RAG AUDIT JURIDIQUE MAROCAIN — Démarrage Windows
echo  ============================================================
echo.

REM ── Vérification Python ─────────────────────────────────────
python --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  ❌ Python n'est pas installé ou pas dans le PATH.
    echo     Téléchargez Python sur : https://www.python.org/downloads/
    echo     Cochez "Add Python to PATH" pendant l'installation.
    pause
    exit /b 1
)

for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PY_VER=%%v
echo  ✅ Python détecté : %PY_VER%

REM ── Vérification/Installation des dépendances ────────────────
echo.
echo  📦 Vérification des dépendances Python...
python -c "import streamlit" > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  ⬇️  Installation des dépendances (première fois, ~5 minutes)...
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo  ❌ Erreur lors de l'installation des dépendances.
        echo     Essayez manuellement : pip install -r requirements.txt
        pause
        exit /b 1
    )
    echo  ✅ Dépendances installées avec succès
) else (
    echo  ✅ Dépendances déjà installées
)

REM ── Vérification Ollama ───────────────────────────────────────
echo.
echo  🤖 Vérification d'Ollama...
ollama --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ⚠️  Ollama n'est pas installé ou pas dans le PATH.
    echo.
    echo  👉 Instructions d'installation :
    echo     1. Allez sur https://ollama.ai
    echo     2. Téléchargez et installez Ollama pour Windows
    echo     3. Relancez ce script
    echo.
    echo  💡 Modèles recommandés à télécharger après installation :
    echo     ollama pull mistral    (recommandé, 4GB)
    echo     ollama pull llama3     (meilleure qualité, 5GB)
    echo     ollama pull phi3       (léger, 2GB)
    echo.
    echo  ℹ️  L'indexation va continuer, mais l'interface ne fonctionnera
    echo      pas sans Ollama.
    echo.
) else (
    for /f "tokens=*" %%v in ('ollama --version 2^>^&1') do echo  ✅ Ollama détecté : %%v
)

REM ── Vérification/Création du dossier data/ ───────────────────
echo.
if not exist "data\" (
    echo  📁 Création du dossier data/...
    mkdir data
    echo  ✅ Dossier data/ créé
    echo.
    echo  ============================================================
    echo   📂 IMPORTANT : Placez vos PDFs dans data/ avant de continuer
    echo  ============================================================
    echo.
    echo  Structure recommandée :
    echo    data\
    echo    ├── Droit bancaire et financier\
    echo    ├── Droit du travail\
    echo    ├── Droit fiscal\
    echo    └── ...
    echo.
    echo  Appuyez sur une touche une fois vos PDFs placés...
    pause
)

REM ── Indexation si nécessaire ──────────────────────────────────
echo.
if not exist "vector_db\" (
    echo  🔍 Base vectorielle introuvable — Lancement de l'indexation...
    echo.
    python 01_load_and_index.py
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  ❌ L'indexation a échoué. Vérifiez les erreurs ci-dessus.
        pause
        exit /b 1
    )
) else (
    echo  ✅ Base vectorielle existante détectée
    echo.
    set /p REINDEX="  🔄 Réindexer les documents ? (o/N) : "
    if /i "%REINDEX%"=="o" (
        echo  🔍 Réindexation en cours...
        python 01_load_and_index.py
    )
)

REM ── Lancement de Streamlit ────────────────────────────────────
echo.
echo  ============================================================
echo   🚀 Lancement de l'interface Streamlit...
echo   📌 Ouvrez votre navigateur sur : http://localhost:8501
echo   🛑 Pour arrêter : Ctrl+C dans ce terminal
echo  ============================================================
echo.

streamlit run 03_streamlit_app.py --server.port 8501 --server.headless false

echo.
echo  👋 Application arrêtée.
pause

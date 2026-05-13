#!/usr/bin/env python3
# ============================================================
# 03_streamlit_app.py — Interface Streamlit d'audit juridique
# RAG Audit Juridique Marocain
# ============================================================

import streamlit as st
import sys
import os
import io
import time
from pathlib import Path
from datetime import datetime

# Configuration du projet
from config import (
    VECTOR_DB_PATH, COLLECTION_NAME, EMBEDDING_MODEL,
    RETRIEVAL_K, RETRIEVAL_TYPE, TEMPERATURE,
    AVAILABLE_MODELS, DEFAULT_MODEL,
    AUDIT_PROMPT_TEMPLATE, APP_TITLE, APP_ICON, APP_DESCRIPTION,
    RESULTS_SECTION_TITLE,
)

# ── Configuration Streamlit ──────────────────────────────────
st.set_page_config(
    page_title="Audit Juridique Marocain",
    page_icon=APP_ICON,
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── CSS Personnalisé ─────────────────────────────────────────
st.markdown("""
<style>
    /* Thème global */
    .main { background-color: #0f1117; }
    
    /* Titre principal */
    .main-title {
        text-align: center;
        font-size: 2.2rem;
        font-weight: 800;
        background: linear-gradient(135deg, #c9a227, #e8c547, #c9a227);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.3rem;
    }
    .subtitle {
        text-align: center;
        color: #8b9ab0;
        font-size: 1rem;
        margin-bottom: 2rem;
    }

    /* Cartes de violations */
    .violation-card {
        background: linear-gradient(135deg, #1a1f2e, #1e2535);
        border-left: 4px solid #e8c547;
        border-radius: 8px;
        padding: 1.2rem;
        margin: 1rem 0;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    }
    .violation-critique { border-left-color: #ff4757; }
    .violation-moyenne  { border-left-color: #ffa502; }
    .violation-faible   { border-left-color: #2ed573; }

    /* Badge gravité */
    .badge-critique { background:#ff475720; color:#ff4757; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:700; }
    .badge-moyenne  { background:#ffa50220; color:#ffa502; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:700; }
    .badge-faible   { background:#2ed57320; color:#2ed573; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:700; }

    /* Source card */
    .source-card {
        background: #1a1f2e;
        border: 1px solid #2a3245;
        border-radius: 6px;
        padding: 0.8rem;
        margin: 0.4rem 0;
        font-size: 0.88rem;
    }

    /* Conforme */
    .conforme-box {
        background: linear-gradient(135deg, #0d2b1a, #0f3320);
        border: 1px solid #2ed573;
        border-radius: 8px;
        padding: 1.5rem;
        text-align: center;
        font-size: 1.2rem;
        color: #2ed573;
    }

    /* Audit history */
    .history-item {
        background: #1a1f2e;
        border-radius: 6px;
        padding: 0.6rem 1rem;
        margin: 0.3rem 0;
        font-size: 0.85rem;
        cursor: pointer;
        border-left: 3px solid #c9a227;
    }

    /* Bouton audit */
    .stButton > button {
        background: linear-gradient(135deg, #c9a227, #e8c547) !important;
        color: #0f1117 !important;
        font-weight: 700 !important;
        font-size: 1.05rem !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 0.7rem 2rem !important;
        width: 100% !important;
        transition: all 0.3s ease !important;
    }
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(201,162,39,0.4) !important;
    }

    /* Métriques */
    .metric-box {
        background: #1a1f2e;
        border-radius: 8px;
        padding: 1rem;
        text-align: center;
        border: 1px solid #2a3245;
    }
    .metric-number { font-size: 2rem; font-weight: 800; }
    .metric-label  { font-size: 0.8rem; color: #8b9ab0; }
</style>
""", unsafe_allow_html=True)


# ── Fonctions de chargement (avec cache Streamlit) ───────────

@st.cache_resource(show_spinner="🧠 Chargement du modèle d'embeddings...")
def charger_embeddings():
    """Charge le modèle d'embeddings une seule fois."""
    from langchain_community.embeddings import HuggingFaceEmbeddings
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


@st.cache_resource(show_spinner="💾 Connexion à ChromaDB...")
def charger_vectorstore(_embeddings):
    """Charge la base vectorielle ChromaDB."""
    from langchain_community.vectorstores import Chroma
    db_path = Path(VECTOR_DB_PATH)
    if not db_path.exists():
        return None
    vs = Chroma(
        persist_directory=VECTOR_DB_PATH,
        embedding_function=_embeddings,
        collection_name=COLLECTION_NAME,
    )
    return vs


def creer_chaine(vectorstore, modele: str, k: int):
    """Crée la chaîne RAG avec le modèle Ollama choisi.
    
    - temperature=0.0  : réponses déterministes, anti-hallucination
    - search_type=mmr  : Maximum Marginal Relevance, diversifie les sources
    """
    from langchain_community.llms import Ollama
    from langchain.chains import RetrievalQA
    from langchain.prompts import PromptTemplate

    # temperature=0.0 = le modèle ne "créé" pas, il récite
    llm = Ollama(
        model=modele,
        temperature=TEMPERATURE,  # 0.0 — défini dans config.py
        num_ctx=AVAILABLE_MODELS[modele].get("contexte_max", 4096),
    )
    prompt = PromptTemplate(
        template=AUDIT_PROMPT_TEMPLATE,
        input_variables=["context", "question"],
    )
    # MMR : récupère des sources variées (pas toutes du même document)
    retriever = vectorstore.as_retriever(
        search_type=RETRIEVAL_TYPE,      # "mmr" défini dans config.py
        search_kwargs={"k": k, "fetch_k": k * 3},  # fetch_k requis par MMR
    )
    return RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
        chain_type_kwargs={"prompt": prompt},
    )


def extraire_texte_pdf(fichier) -> str:
    """Extrait le texte d'un PDF uploadé."""
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(fichier.read()))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as e:
        return f"[Erreur extraction PDF: {e}]"


# ── Initialisation de la session ─────────────────────────────
if "historique" not in st.session_state:
    st.session_state.historique = []
if "resultat_courant" not in st.session_state:
    st.session_state.resultat_courant = None


# ── SIDEBAR — Configuration ───────────────────────────────────
with st.sidebar:
    st.markdown("## ⚙️ Configuration")
    st.markdown("---")

    # Choix du modèle LLM
    st.markdown("### 🤖 Modèle LLM")
    options_modeles = list(AVAILABLE_MODELS.keys())
    labels_modeles = [
        f"{info['qualite']} {info['nom']} ({info['ram_requise']})"
        for info in AVAILABLE_MODELS.values()
    ]
    idx_defaut = options_modeles.index(DEFAULT_MODEL) if DEFAULT_MODEL in options_modeles else 0
    modele_choisi = options_modeles[
        st.selectbox("Modèle", range(len(options_modeles)),
                     format_func=lambda i: labels_modeles[i],
                     index=idx_defaut)
    ]

    # Infos modèle
    info_modele = AVAILABLE_MODELS[modele_choisi]
    st.info(f"**{info_modele['nom']}**\n\n{info_modele['description']}\n\n"
            f"RAM requise : **{info_modele['ram_requise']}**")

    if not info_modele.get("recommande"):
        st.code(f"# Télécharger ce modèle :\n{info_modele['commande_ollama']}", language="bash")

    st.markdown("---")

    # Paramètres RAG
    st.markdown("### 🔧 Paramètres RAG")
    k_retrieval = st.slider(
        "Nombre de sources (k)",
        min_value=1, max_value=10,
        value=RETRIEVAL_K,
        help="Nombre de chunks juridiques récupérés pour chaque audit",
    )

    st.markdown("---")

    # Statut de la base
    st.markdown("### 📊 Statut de la base")
    db_path = Path(VECTOR_DB_PATH)
    if db_path.exists():
        st.success("✅ Base vectorielle disponible")
        try:
            emb = charger_embeddings()
            vs_check = charger_vectorstore(emb)
            if vs_check:
                count = vs_check._collection.count()
                st.metric("Chunks indexés", f"{count:,}")
        except Exception:
            pass
    else:
        st.error("❌ Base non trouvée")
        st.markdown("Exécutez d'abord :")
        st.code("python 01_load_and_index.py", language="bash")

    st.markdown("---")

    # Historique session
    st.markdown("### 📜 Historique session")
    if st.session_state.historique:
        for i, item in enumerate(reversed(st.session_state.historique[-5:])):
            st.markdown(
                f'<div class="history-item">🕐 {item["heure"]} — {item["modele"]}<br>'
                f'<small>{item["apercu"]}</small></div>',
                unsafe_allow_html=True,
            )
    else:
        st.caption("Aucun audit effectué")

    if st.button("🗑️ Effacer l'historique"):
        st.session_state.historique = []
        st.session_state.resultat_courant = None
        st.rerun()


# ── CORPS PRINCIPAL ───────────────────────────────────────────
st.markdown('<h1 class="main-title">⚖️ Audit Juridique Marocain</h1>', unsafe_allow_html=True)
st.markdown(
    '<p class="subtitle">Assistant IA de détection de non-conformités au droit marocain</p>',
    unsafe_allow_html=True,
)

# Vérification de la base vectorielle
if not db_path.exists():
    st.error(
        "❌ **Base vectorielle introuvable !**\n\n"
        "Étapes à suivre :\n"
        "1. Placez vos PDFs dans `data/`\n"
        "2. Exécutez `python 01_load_and_index.py`\n"
        "3. Rechargez cette page"
    )
    st.stop()

# Chargement des ressources
try:
    embeddings = charger_embeddings()
    vectorstore = charger_vectorstore(embeddings)
    if vectorstore is None:
        st.error("❌ Impossible de charger la base ChromaDB.")
        st.stop()
except Exception as e:
    st.error(f"❌ Erreur de chargement : {e}")
    st.stop()

# ── Zone de saisie et résultats ──────────────────────────────
col_gauche, col_droite = st.columns([1, 1], gap="large")

with col_gauche:
    st.markdown("## 📄 Document à auditer")

    # Onglets : Upload ou Coller
    tab_upload, tab_coller = st.tabs(["📁 Upload fichier", "📋 Coller du texte"])

    texte_document = ""

    with tab_upload:
        fichier = st.file_uploader(
            "Choisissez un fichier PDF ou TXT",
            type=["pdf", "txt"],
            help="Contrat, rapport, statuts, convention... tout document juridique",
        )
        if fichier:
            if fichier.type == "application/pdf":
                with st.spinner("Extraction du texte PDF..."):
                    texte_document = extraire_texte_pdf(fichier)
            else:
                texte_document = fichier.read().decode("utf-8", errors="ignore")

            if texte_document:
                st.success(f"✅ Fichier chargé : **{fichier.name}** ({len(texte_document):,} caractères)")
                with st.expander("👁️ Aperçu du document"):
                    st.text_area("Contenu", texte_document[:2000] + ("..." if len(texte_document) > 2000 else ""),
                                 height=200, disabled=True)

    with tab_coller:
        texte_colle = st.text_area(
            "Collez votre texte juridique ici",
            placeholder="Exemple :\nContrat de travail — Article 3 :\nLe salarié accepte de travailler 60h/semaine...\nLa période d'essai est de 12 mois...",
            height=300,
        )
        if texte_colle.strip():
            texte_document = texte_colle

    # Affichage du texte actif
    if texte_document:
        st.info(f"📝 Document prêt : **{len(texte_document):,} caractères**")

    st.markdown("---")

    # Bouton d'audit
    btn_audit = st.button(
        f"🔍 Lancer l'audit avec {info_modele['nom']}",
        disabled=not texte_document.strip(),
        use_container_width=True,
    )


# ── Exécution de l'audit ──────────────────────────────────────
if btn_audit and texte_document.strip():
    with col_droite:
        st.markdown(RESULTS_SECTION_TITLE)

        with st.spinner(f"⚖️ Analyse juridique en cours avec {modele_choisi}...\n(30-120 secondes selon votre machine)"):
            debut = time.time()
            try:
                chaine = creer_chaine(vectorstore, modele_choisi, k_retrieval)
                reponse = chaine.invoke({"query": texte_document})
                duree = time.time() - debut

                resultat_texte = reponse.get("result", "")
                sources = reponse.get("source_documents", [])

                # Sauvegarde en session
                apercu_doc = texte_document[:60].replace("\n", " ")
                st.session_state.historique.append({
                    "heure": datetime.now().strftime("%H:%M"),
                    "modele": modele_choisi,
                    "apercu": apercu_doc,
                    "resultat": resultat_texte,
                    "sources": sources,
                    "duree": duree,
                })
                st.session_state.resultat_courant = {
                    "texte": resultat_texte,
                    "sources": sources,
                    "duree": duree,
                }

            except Exception as e:
                err = str(e).lower()
                if "connection refused" in err or "connect" in err:
                    st.error(
                        "❌ **Ollama non démarré !**\n\n"
                        "1. Installez Ollama : https://ollama.ai\n"
                        "2. Lancez Ollama (icône barre des tâches)\n"
                        f"3. Téléchargez le modèle : `{info_modele['commande_ollama']}`"
                    )
                elif "model" in err:
                    st.error(f"❌ **Modèle non disponible !**\n\nTéléchargez-le avec :\n```\n{info_modele['commande_ollama']}\n```")
                else:
                    st.error(f"❌ Erreur inattendue : {e}")
                st.stop()

# ── Affichage du résultat courant ─────────────────────────────
if st.session_state.resultat_courant:
    res = st.session_state.resultat_courant

    with col_droite:
        st.markdown(RESULTS_SECTION_TITLE)

        # Métriques rapides
        texte = res["texte"]
        sources = res["sources"]
        nb_violations = texte.count("=== VIOLATION")
        nb_critique = texte.lower().count("critique")
        nb_moyenne = texte.lower().count("moyenne")
        nb_faible = texte.lower().count("faible")

        m1, m2, m3, m4 = st.columns(4)
        m1.metric("🔢 Violations", nb_violations)
        m2.metric("🔴 Critiques", nb_critique)
        m3.metric("🟡 Moyennes", nb_moyenne)
        m4.metric("🟢 Faibles", nb_faible)

        st.caption(f"⏱️ Analyse effectuée en {res['duree']:.1f}s avec **{modele_choisi}**")
        st.markdown("---")

        # Résultat conforme ?
        if "CONFORME" in texte.upper() and nb_violations == 0:
            st.markdown('<div class="conforme-box">✅ Document CONFORME — Aucune violation détectée</div>', unsafe_allow_html=True)
        else:
            # Affichage brut formaté
            with st.expander("📋 Rapport complet", expanded=True):
                st.markdown(texte)

        # Sources juridiques
        if sources:
            st.markdown("---")
            st.markdown(f"### 📚 Sources juridiques utilisées ({len(sources)})")
            sources_uniques = {}
            for doc in sources:
                nom = doc.metadata.get("nom_fichier", "Inconnu")
                cle = nom + str(doc.metadata.get("page", ""))
                if cle not in sources_uniques:
                    sources_uniques[cle] = doc

            for doc in sources_uniques.values():
                st.markdown(
                    f'<div class="source-card">'
                    f'📄 <b>{doc.metadata.get("nom_fichier","?")}</b> '
                    f'(p.{doc.metadata.get("page","?")}) — '
                    f'<span style="color:#c9a227">{doc.metadata.get("categorie","?")}</span><br>'
                    f'<small style="color:#8b9ab0">{doc.page_content[:120].replace(chr(10)," ")}...</small>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

        # Export
        st.markdown("---")
        st.download_button(
            "💾 Télécharger le rapport",
            data=texte,
            file_name=f"audit_{datetime.now().strftime('%Y%m%d_%H%M')}.txt",
            mime="text/plain",
            use_container_width=True,
        )

# Message d'accueil si rien encore
elif not btn_audit:
    with col_droite:
        st.markdown(RESULTS_SECTION_TITLE)
        st.markdown("""
        <div style="text-align:center; padding:3rem; color:#8b9ab0;">
            <div style="font-size:3rem;">⚖️</div>
            <h3>Prêt pour l'audit</h3>
            <p>Chargez ou collez votre document juridique,<br>puis cliquez sur <b>Lancer l'audit</b>.</p>
            <hr style="border-color:#2a3245; margin:1.5rem 0;">
            <p style="font-size:0.85rem;">
            Le système analysera votre document contre<br>
            les textes juridiques marocains indexés<br>
            et détectera les non-conformités.
            </p>
        </div>
        """, unsafe_allow_html=True)

# ── Footer ────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    '<p style="text-align:center; color:#8b9ab0; font-size:0.8rem;">'
    '⚖️ RAG Audit Juridique Marocain — 100% local, aucune clé API requise'
    '</p>',
    unsafe_allow_html=True,
)

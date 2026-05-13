#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# 01_load_and_index.py — Indexation des documents juridiques
# RAG Audit Juridique Marocain
#
# Ce script parcourt récursivement le dossier data/,
# charge tous les PDF, les découpe en chunks et les
# indexe dans ChromaDB avec leurs métadonnées.
# ============================================================

import os
import sys
import time
from pathlib import Path
from typing import List, Dict

import sys
import io
# Forcer UTF-8 sur Windows (évite l'erreur cp1252 avec les emojis)
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Colorama pour un affichage coloré dans le terminal
from colorama import init, Fore, Style
init(autoreset=True, strip=False)

# Barre de progression
from tqdm import tqdm

# LangChain
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# Configuration du projet
from config import (
    DATA_PATH,
    VECTOR_DB_PATH,
    COLLECTION_NAME,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    EMBEDDING_MODEL,
    CATEGORIES_JURIDIQUES,
)


# ── Fonctions utilitaires ────────────────────────────────────

def afficher_banniere():
    """Affiche la bannière de démarrage."""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"  ⚖️  RAG AUDIT JURIDIQUE MAROCAIN — Indexation")
    print(f"{'='*60}{Style.RESET_ALL}\n")


def normaliser_categorie(chemin_dossier: str) -> str:
    """
    Détermine la catégorie juridique d'un document
    à partir du nom de son dossier parent.
    """
    dossier = chemin_dossier.lower().strip()
    for cle, valeur in CATEGORIES_JURIDIQUES.items():
        if cle in dossier:
            return valeur
    # Si aucune correspondance, retourner le nom brut
    return chemin_dossier


def charger_pdfs(data_path: str) -> List:
    """
    Parcourt récursivement le dossier data/ et charge
    tous les fichiers PDF trouvés.

    Retourne une liste de documents LangChain avec métadonnées.
    """
    documents = []
    chemin_base = Path(data_path)

    # Vérification de l'existence du dossier
    if not chemin_base.exists():
        print(f"{Fore.YELLOW}⚠️  Dossier data/ introuvable. Création en cours...")
        chemin_base.mkdir(parents=True, exist_ok=True)
        print(f"{Fore.GREEN}✅ Dossier créé : {chemin_base.absolute()}")
        print(f"\n{Fore.YELLOW}👉 Placez vos PDF dans les sous-dossiers de data/ puis relancez ce script.")
        return []

    # Recherche de tous les PDFs
    pdfs_trouves = list(chemin_base.rglob("*.pdf"))

    if not pdfs_trouves:
        print(f"{Fore.YELLOW}⚠️  Aucun fichier PDF trouvé dans : {chemin_base.absolute()}")
        print(f"\n{Fore.CYAN}Structure attendue :")
        print("  data/")
        print("  ├── Droit bancaire et financier/")
        print("  │   ├── loi_bancaire.pdf")
        print("  │   └── ...")
        print("  ├── Droit du travail/")
        print("  └── ...")
        return []

    print(f"{Fore.GREEN}📂 {len(pdfs_trouves)} fichier(s) PDF trouvé(s)\n")

    # Statistiques par catégorie
    stats_categories: Dict[str, int] = {}
    erreurs = []

    # Chargement avec barre de progression
    for pdf_path in tqdm(pdfs_trouves, desc="📄 Chargement des PDFs", colour="cyan"):
        try:
            # Détermination de la catégorie juridique
            dossier_parent = pdf_path.parent.name
            categorie = normaliser_categorie(dossier_parent)

            # Chargement du PDF
            loader = PyPDFLoader(str(pdf_path))
            pages = loader.load()

            # Ajout des métadonnées à chaque page
            for page in pages:
                page.metadata.update({
                    "source": str(pdf_path),
                    "nom_fichier": pdf_path.name,
                    "filename": pdf_path.name,          # alias standard LangChain
                    "categorie": categorie,
                    "category": categorie,              # alias anglais pour compatibilité
                    "dossier_parent": dossier_parent,
                    "chemin_relatif": str(pdf_path.relative_to(chemin_base)),
                })

            documents.extend(pages)

            # Mise à jour des statistiques
            stats_categories[categorie] = stats_categories.get(categorie, 0) + 1

        except Exception as e:
            erreurs.append((str(pdf_path), str(e)))
            tqdm.write(f"{Fore.RED}  ❌ Erreur sur {pdf_path.name}: {e}")

    # Rapport de chargement
    print(f"\n{Fore.GREEN}✅ Chargement terminé !")
    print(f"   📄 Total pages chargées : {len(documents)}")
    print(f"   📁 Fichiers PDF traités : {len(pdfs_trouves) - len(erreurs)}")

    if erreurs:
        print(f"{Fore.YELLOW}   ⚠️  Erreurs : {len(erreurs)} fichier(s) non chargé(s)")

    print(f"\n{Fore.CYAN}📊 Répartition par catégorie juridique :")
    for cat, nb in sorted(stats_categories.items()):
        print(f"   • {cat} : {nb} document(s)")

    return documents


def decouper_documents(documents: List) -> List:
    """
    Découpe les documents en chunks de taille fixe
    avec chevauchement pour conserver le contexte.
    """
    if not documents:
        return []

    print(f"\n{Fore.CYAN}✂️  Découpage des documents en chunks...")
    print(f"   Taille : {CHUNK_SIZE} caractères | Overlap : {CHUNK_OVERLAP} caractères")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        # Séparateurs prioritaires pour les textes juridiques marocains :
        # Articles, alinéas, tirets, puis ponctuation standard
        separators=[
            "\n\n",
            "\nArticle ",
            "\nArt. ",
            "\nALINEA ",
            "\n- ",
            "\n",
            "; ",
            ", ",
            ". ",
            " ",
            "",
        ],
        length_function=len,
    )

    chunks = splitter.split_documents(documents)

    print(f"{Fore.GREEN}   ✅ {len(chunks)} chunks créés à partir de {len(documents)} pages")
    print(f"   📐 Ratio moyen : {len(chunks) / max(len(documents), 1):.1f} chunks/page")

    return chunks


def creer_base_vectorielle(chunks: List) -> bool:
    """
    Crée ou met à jour la base vectorielle ChromaDB
    à partir des chunks de documents.

    Retourne True si succès, False sinon.
    """
    if not chunks:
        print(f"{Fore.RED}❌ Aucun chunk à indexer.")
        return False

    print(f"\n{Fore.CYAN}🧠 Chargement du modèle d'embeddings...")
    print(f"   Modèle : {EMBEDDING_MODEL}")
    print(f"   (Premier téléchargement : quelques minutes selon votre connexion)")

    try:
        # Initialisation du modèle d'embeddings (gratuit, local)
        embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        print(f"{Fore.GREEN}   ✅ Modèle chargé avec succès")
    except Exception as e:
        print(f"{Fore.RED}❌ Erreur lors du chargement du modèle d'embeddings : {e}")
        print(f"{Fore.YELLOW}   Essayez : pip install sentence-transformers --upgrade")
        return False

    print(f"\n{Fore.CYAN}💾 Indexation dans ChromaDB...")
    print(f"   Dossier : {VECTOR_DB_PATH}")
    print(f"   Collection : {COLLECTION_NAME}")

    debut = time.time()

    try:
        # ChromaDB a une limite de batch (~5461 documents)
        # On insère donc les chunks par lots
        BATCH_SIZE = 5000
        db_path = Path(VECTOR_DB_PATH)
        if db_path.exists():
            print(f"{Fore.YELLOW}   ⚠️  Base existante détectée — Réindexation complète...")

        vectorstore = None
        nb_lots = (len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"   Insertion par lots de {BATCH_SIZE} ({nb_lots} lot(s) au total)")

        for i in range(0, len(chunks), BATCH_SIZE):
            lot = chunks[i:i + BATCH_SIZE]
            lot_num = i // BATCH_SIZE + 1
            print(f"   Lot {lot_num}/{nb_lots} : {len(lot)} chunks...", end=" ", flush=True)

            if vectorstore is None:
                # Premier lot : créer la collection
                vectorstore = Chroma.from_documents(
                    documents=lot,
                    embedding=embeddings,
                    persist_directory=VECTOR_DB_PATH,
                    collection_name=COLLECTION_NAME,
                )
            else:
                # Lots suivants : ajouter dans la collection existante
                vectorstore.add_documents(lot)

            print(f"{Fore.GREEN}OK{Style.RESET_ALL}")

        duree = time.time() - debut

        print(f"{Fore.GREEN}   ✅ Indexation terminée en {duree:.1f} secondes")
        print(f"   📦 {len(chunks)} chunks stockés dans ChromaDB")

        return True

    except Exception as e:
        print(f"{Fore.RED}❌ Erreur lors de l'indexation ChromaDB : {e}")
        print(f"{Fore.YELLOW}   Essayez : pip install chromadb --upgrade")
        return False


def afficher_statistiques_finales(documents: List, chunks: List):
    """Affiche un résumé complet de l'indexation."""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"  📊 RÉSUMÉ DE L'INDEXATION")
    print(f"{'='*60}")

    # Statistiques globales
    categories = {}
    for doc in chunks:
        cat = doc.metadata.get("categorie", "Inconnue")
        categories[cat] = categories.get(cat, 0) + 1

    print(f"\n  📄 Pages sources    : {len(documents)}")
    print(f"  ✂️  Chunks créés     : {len(chunks)}")
    print(f"  📁 Catégories       : {len(categories)}")
    print(f"  💾 Base de données  : {VECTOR_DB_PATH}/")
    print(f"\n  Détail par catégorie :")

    for cat, nb in sorted(categories.items(), key=lambda x: -x[1]):
        barre = "█" * min(nb // 5 + 1, 20)
        print(f"    {barre} {cat} ({nb} chunks)")

    print(f"\n{Fore.GREEN}  ✅ La base est prête ! Lancez maintenant :")
    print(f"     • 02_test_cli.py    — Test en ligne de commande")
    print(f"     • 03_streamlit_app.py — Interface graphique")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")


# ── Point d'entrée principal ─────────────────────────────────

def main():
    afficher_banniere()

    # Étape 1 : Chargement des PDFs
    print(f"{Fore.CYAN}{'─'*40}")
    print(f"ÉTAPE 1/3 : Chargement des documents")
    print(f"{'─'*40}")
    documents = charger_pdfs(DATA_PATH)

    if not documents:
        print(f"\n{Fore.YELLOW}ℹ️  Aucun document à indexer. Programme terminé.")
        print(f"   Placez vos PDFs dans le dossier : {Path(DATA_PATH).absolute()}")
        sys.exit(0)

    # Étape 2 : Découpage en chunks
    print(f"\n{Fore.CYAN}{'─'*40}")
    print(f"ÉTAPE 2/3 : Découpage en chunks")
    print(f"{'─'*40}")
    chunks = decouper_documents(documents)

    if not chunks:
        print(f"{Fore.RED}❌ Erreur lors du découpage. Programme terminé.")
        sys.exit(1)

    # Étape 3 : Indexation dans ChromaDB
    print(f"\n{Fore.CYAN}{'─'*40}")
    print(f"ÉTAPE 3/3 : Indexation dans ChromaDB")
    print(f"{'─'*40}")
    succes = creer_base_vectorielle(chunks)

    if not succes:
        print(f"{Fore.RED}❌ L'indexation a échoué. Vérifiez les erreurs ci-dessus.")
        sys.exit(1)

    # Affichage des statistiques finales
    afficher_statistiques_finales(documents, chunks)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# 02_test_cli.py — Test du RAG en ligne de commande
# RAG Audit Juridique Marocain
#
# Ce script permet de tester le système RAG directement
# depuis le terminal, sans interface graphique.
# ============================================================

import os
import sys
import io
from pathlib import Path

# Forcer UTF-8 sur Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from colorama import init, Fore, Style
init(autoreset=True, strip=False)

# Configuration
from config import (
    VECTOR_DB_PATH,
    COLLECTION_NAME,
    EMBEDDING_MODEL,
    RETRIEVAL_K,
    AVAILABLE_MODELS,
    DEFAULT_MODEL,
    AUDIT_PROMPT_TEMPLATE,
)

# ── Questions de test prédéfinies ────────────────────────────
QUESTIONS_TEST = [
    {
        "id": 1,
        "categorie": "Droit du Travail",
        "question": """Contrat de travail :
        Le salarié accepte de travailler 55 heures par semaine sans majoration de salaire.
        La période d'essai est fixée à 12 mois pour les employés non-cadres.
        En cas de licenciement, l'employeur n'est tenu à aucun préavis.""",
    },
    {
        "id": 2,
        "categorie": "Droit des Sociétés",
        "question": """Statuts de SARL :
        Le capital social est fixé à 5 000 dirhams.
        Les décisions sont prises à la majorité simple des associés présents.
        Aucun commissaire aux comptes n'est prévu, quel que soit le chiffre d'affaires.""",
    },
    {
        "id": 3,
        "categorie": "Droit Fiscal",
        "question": """Convention commerciale :
        Les honoraires sont payés en espèces pour un montant total de 250 000 dirhams.
        La TVA n'est pas mentionnée dans la facturation.
        Aucune retenue à la source n'est appliquée.""",
    },
    {
        "id": 4,
        "categorie": "Droit Bancaire",
        "question": """Contrat de crédit à la consommation :
        Le taux d'intérêt annuel est de 35%.
        Le client peut rembourser par anticipation avec une pénalité de 10%.
        Aucune information sur le TEG (Taux Effectif Global) n'est fournie.""",
    },
    {
        "id": 5,
        "categorie": "Question libre",
        "question": None,  # L'utilisateur saisit sa propre question
    },
]


# ── Fonctions d'affichage ────────────────────────────────────

def afficher_banniere():
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"  ⚖️  RAG AUDIT JURIDIQUE MAROCAIN — Test CLI")
    print(f"{'='*60}{Style.RESET_ALL}\n")


def afficher_modeles():
    """Affiche le tableau des modèles disponibles."""
    print(f"\n{Fore.CYAN}🤖 MODÈLES DISPONIBLES :\n")
    print(f"  {'N°':<4} {'Modèle':<20} {'Qualité':<15} {'RAM':<10} {'Recommandé'}")
    print(f"  {'─'*4} {'─'*20} {'─'*15} {'─'*10} {'─'*10}")

    for i, (cle, info) in enumerate(AVAILABLE_MODELS.items(), 1):
        recommande = "✅" if info.get("recommande") else ""
        print(f"  {i:<4} {info['nom']:<20} {info['qualite']:<15} {info['ram_requise']:<10} {recommande}")

    print()


def choisir_modele() -> str:
    """Demande à l'utilisateur de choisir un modèle LLM."""
    afficher_modeles()
    modeles = list(AVAILABLE_MODELS.keys())

    while True:
        choix = input(
            f"{Fore.YELLOW}Choisissez un modèle (1-{len(modeles)}) "
            f"[Entrée pour '{DEFAULT_MODEL}'] : {Style.RESET_ALL}"
        ).strip()

        if not choix:
            print(f"  → Modèle sélectionné : {Fore.GREEN}{DEFAULT_MODEL}")
            return DEFAULT_MODEL

        # Sélection par numéro
        if choix.isdigit():
            index = int(choix) - 1
            if 0 <= index < len(modeles):
                modele = modeles[index]
                print(f"  → Modèle sélectionné : {Fore.GREEN}{AVAILABLE_MODELS[modele]['nom']}")
                return modele
            print(f"{Fore.RED}  ❌ Numéro invalide. Choisissez entre 1 et {len(modeles)}.")
            continue

        # Sélection par nom direct
        if choix in modeles:
            print(f"  → Modèle sélectionné : {Fore.GREEN}{AVAILABLE_MODELS[choix]['nom']}")
            return choix

        print(f"{Fore.RED}  ❌ Modèle inconnu. Réessayez.")


def afficher_questions():
    """Affiche la liste des questions de test disponibles."""
    print(f"\n{Fore.CYAN}📋 QUESTIONS DE TEST PRÉDÉFINIES :\n")
    for q in QUESTIONS_TEST:
        if q["question"]:
            apercu = q["question"][:80].replace("\n", " ").strip() + "..."
            print(f"  {q['id']}. [{q['categorie']}] {apercu}")
        else:
            print(f"  {q['id']}. [Question libre] Saisir votre propre texte")
    print()


def saisir_texte_libre() -> str:
    """Demande à l'utilisateur de saisir son propre texte à auditer."""
    print(f"\n{Fore.YELLOW}📝 Saisissez le texte à auditer (terminez avec une ligne vide) :")
    lignes = []
    while True:
        ligne = input()
        if ligne == "" and lignes:
            break
        lignes.append(ligne)
    return "\n".join(lignes)


def choisir_question() -> str:
    """Affiche les questions de test et demande un choix."""
    afficher_questions()

    while True:
        choix = input(
            f"{Fore.YELLOW}Choisissez une question (1-{len(QUESTIONS_TEST)}) : {Style.RESET_ALL}"
        ).strip()

        try:
            index = int(choix)
            q = next((item for item in QUESTIONS_TEST if item["id"] == index), None)

            if not q:
                print(f"{Fore.RED}  ❌ Numéro invalide.")
                continue

            if q["question"] is None:
                return saisir_texte_libre()
            return q["question"]

        except ValueError:
            print(f"{Fore.RED}  ❌ Veuillez entrer un numéro valide.")


# ── Fonctions RAG ────────────────────────────────────────────

def charger_vectorstore():
    """Charge la base vectorielle ChromaDB existante."""
    db_path = Path(VECTOR_DB_PATH)

    if not db_path.exists():
        print(f"\n{Fore.RED}❌ Base vectorielle introuvable : {db_path.absolute()}")
        print(f"\n{Fore.YELLOW}💡 Solution : Exécutez d'abord :")
        print(f"   python 01_load_and_index.py")
        return None

    print(f"\n{Fore.CYAN}💾 Chargement de la base vectorielle...")

    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        from langchain_community.vectorstores import Chroma

        embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )

        vectorstore = Chroma(
            persist_directory=VECTOR_DB_PATH,
            embedding_function=embeddings,
            collection_name=COLLECTION_NAME,
        )

        # Vérification que la base n'est pas vide
        count = vectorstore._collection.count()
        print(f"{Fore.GREEN}   ✅ Base chargée : {count} chunks disponibles")

        return vectorstore

    except Exception as e:
        print(f"{Fore.RED}❌ Erreur lors du chargement : {e}")
        return None


def creer_chaine_rag(vectorstore, modele: str):
    """Crée la chaîne RAG avec le modèle Ollama sélectionné."""
    print(f"\n{Fore.CYAN}🔗 Connexion à Ollama ({modele})...")

    try:
        from langchain_community.llms import Ollama
        from langchain.chains import RetrievalQA
        from langchain.prompts import PromptTemplate

        # Connexion au LLM local via Ollama
        llm = Ollama(
            model=modele,
            temperature=0.1,  # Faible température pour des réponses précises
            num_ctx=AVAILABLE_MODELS[modele].get("contexte_max", 4096),
        )

        # Test de connexion
        llm.invoke("Test")
        print(f"{Fore.GREEN}   ✅ Ollama connecté avec le modèle : {modele}")

        # Création du prompt personnalisé
        prompt = PromptTemplate(
            template=AUDIT_PROMPT_TEMPLATE,
            input_variables=["context", "question"],
        )

        # Retriever avec paramètres
        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": RETRIEVAL_K},
        )

        # Chaîne RAG
        chaine = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=retriever,
            return_source_documents=True,
            chain_type_kwargs={"prompt": prompt},
        )

        return chaine

    except Exception as e:
        error_msg = str(e).lower()
        print(f"{Fore.RED}❌ Erreur de connexion à Ollama : {e}")

        if "connection refused" in error_msg or "connect" in error_msg:
            print(f"\n{Fore.YELLOW}💡 Ollama n'est pas démarré. Solutions :")
            print(f"   1. Installez Ollama : https://ollama.ai")
            print(f"   2. Démarrez Ollama (icône dans la barre des tâches)")
            print(f"   3. Téléchargez le modèle : {AVAILABLE_MODELS[modele]['commande_ollama']}")
        elif "model" in error_msg:
            print(f"\n{Fore.YELLOW}💡 Modèle non téléchargé. Exécutez :")
            print(f"   {AVAILABLE_MODELS[modele]['commande_ollama']}")

        return None


def afficher_resultats(reponse: dict):
    """Affiche les résultats de l'audit de manière formatée."""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"  📋 RÉSULTATS DE L'AUDIT")
    print(f"{'='*60}\n")

    # Réponse principale
    print(reponse.get("result", "Aucune réponse"))

    # Sources utilisées
    sources = reponse.get("source_documents", [])
    if sources:
        print(f"\n{Fore.CYAN}{'─'*40}")
        print(f"📚 SOURCES JURIDIQUES UTILISÉES ({len(sources)}) :")
        print(f"{'─'*40}")

        sources_uniques = {}
        for doc in sources:
            nom = doc.metadata.get("nom_fichier", "Inconnu")
            cat = doc.metadata.get("categorie", "Inconnue")
            page = doc.metadata.get("page", "?")
            cle = f"{nom}_p{page}"
            if cle not in sources_uniques:
                sources_uniques[cle] = {
                    "nom": nom,
                    "categorie": cat,
                    "page": page,
                    "extrait": doc.page_content[:150].replace("\n", " "),
                }

        for i, (_, src) in enumerate(sources_uniques.items(), 1):
            print(f"\n  {i}. 📄 {src['nom']}")
            print(f"     📁 Catégorie : {src['categorie']}")
            print(f"     📖 Page : {src['page']}")
            print(f"     💬 Extrait : \"{src['extrait']}...\"")

    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")


# ── Point d'entrée principal ─────────────────────────────────

def main():
    afficher_banniere()

    # Étape 1 : Choisir le modèle
    modele = choisir_modele()

    # Étape 2 : Charger la base vectorielle
    vectorstore = charger_vectorstore()
    if vectorstore is None:
        sys.exit(1)

    # Étape 3 : Créer la chaîne RAG
    chaine = creer_chaine_rag(vectorstore, modele)
    if chaine is None:
        sys.exit(1)

    # Boucle de test interactive
    print(f"\n{Fore.GREEN}✅ Système RAG prêt ! Lancement des tests...\n")

    continuer = True
    while continuer:
        # Sélection de la question
        question = choisir_question()

        print(f"\n{Fore.CYAN}🔍 Analyse en cours...")
        print(f"   (Ceci peut prendre 10-60 secondes selon votre machine)\n")

        try:
            # Exécution de la requête RAG
            reponse = chaine.invoke({"query": question})
            afficher_resultats(reponse)

        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}⚠️  Analyse interrompue par l'utilisateur.")
        except Exception as e:
            print(f"\n{Fore.RED}❌ Erreur lors de l'analyse : {e}")

        # Continuer ?
        suite = input(f"\n{Fore.YELLOW}Effectuer un autre test ? (o/N) : {Style.RESET_ALL}").strip().lower()
        continuer = suite in ("o", "oui", "y", "yes")

    print(f"\n{Fore.GREEN}👋 Merci d'avoir utilisé le RAG Audit Juridique Marocain !{Style.RESET_ALL}\n")


if __name__ == "__main__":
    main()

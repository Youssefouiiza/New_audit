# ⚖️ AuditPro — Système d'Audit Juridique avec RAG Local

<div align="center">

![AuditPro](https://img.shields.io/badge/AuditPro-v1.0-blue?style=for-the-badge)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.5-6DB33F?style=for-the-badge&logo=spring-boot)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)
![Ollama](https://img.shields.io/badge/Ollama-Mistral_7B-FF6B35?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?style=for-the-badge&logo=postgresql)

**Plateforme d'audit de conformité juridique marocaine avec analyse RAG locale (Retrieval-Augmented Generation)**

[📸 Screenshots](#screenshots) • [🚀 Quick Start](#quick-start) • [🏗️ Architecture](#architecture) • [📖 Documentation](#documentation)

</div>

---

## 🌟 Fonctionnalités

- **🔍 Analyse RAG Juridique** — Comparaison automatique des documents d'audit avec 32 967 chunks de droit marocain indexés (10 domaines juridiques)
- **🤖 LLM Local** — Analyse via Ollama + Mistral 7B, **100% local**, sans API externe ni coût
- **📄 Rapport Word** — Génération automatique de rapports `.docx` professionnels téléchargeables
- **📁 Gestion documentaire** — Upload, visualisation et suppression de documents par audit
- **👥 Multi-rôles** — ADMIN, MANAGER, AUDITOR, CLIENT avec permissions granulaires
- **🔔 Notifications temps réel** — WebSocket pour les alertes en direct
- **💬 Messagerie interne** — Système de messages entre auditeurs et clients
- **📊 Dashboard** — Statistiques et suivi des audits en temps réel

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIT SYSTEM STACK                        │
├─────────────┬──────────────┬────────────┬───────────────────┤
│  Frontend   │   Backend    │  RAG API   │  Infrastructure   │
│  Next.js 15 │ Spring Boot  │  FastAPI   │                   │
│  Port 3000  │  Port 8080   │  Port 8000 │  PostgreSQL :5433 │
│             │              │            │  MinIO/Local :9000 │
│  TypeScript │  Java 25     │  Python    │  Ollama :11434    │
│  Tailwind   │  JWT Auth    │  ChromaDB  │  Mistral 7B       │
└─────────────┴──────────────┴────────────┴───────────────────┘
```

### Domaines juridiques indexés
| # | Domaine |
|---|---------|
| 1 | Droit Bancaire et Financier |
| 2 | Droit de la Concurrence et Consommation |
| 3 | Droit des Données et Numérique |
| 4 | Droit des Marchés Publics |
| 5 | Droit des Obligations et Contrats (DOC) |
| 6 | Droit des Sociétés Corporate |
| 7 | Droit du Travail |
| 8 | Droit Fiscal |
| 9 | Droit Immobilier et Foncier |
| 10 | Droit Pénal et Procédure Pénale |

---

## 📋 Prérequis

| Outil | Version | Installation |
|-------|---------|-------------|
| **Java JDK** | 17+ (testé : 25) | [adoptium.net](https://adoptium.net) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **Python** | 3.10+ | [python.org](https://python.org) |
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com) |
| **Ollama** | Latest | [ollama.ai](https://ollama.ai) |
| **Git** | Latest | [git-scm.com](https://git-scm.com) |
| **Maven** | 3.8+ | Via wrapper `.mvn/` |

---

## 🚀 Quick Start

### Étape 1 — Cloner le projet

```bash
git clone https://github.com/Youssefouiiza/Audit_with_rag.git
cd Audit_with_rag
```

### Étape 2 — Lancer l'infrastructure (Docker)

```bash
docker-compose up -d
```

Cela démarre **PostgreSQL** (port 5433) et **MinIO** (port 9000).

> ⏳ Attendez ~10 secondes que les conteneurs soient prêts.

### Étape 3 — Installer et démarrer Ollama + Mistral

```bash
# Installer Ollama (https://ollama.ai)
# Puis télécharger le modèle Mistral :
ollama pull mistral

# Démarrer le serveur Ollama (si pas déjà en cours)
ollama serve
```

> ⏳ Le téléchargement de Mistral (~4.4 GB) peut prendre quelques minutes selon votre connexion.

### Étape 4 — Configurer et lancer le service RAG Python

```bash
cd audit_rag_maroc

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement
# Windows :
venv\Scripts\activate
# Linux/Mac :
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# (Premier lancement uniquement) Indexer la base juridique marocaine
python 01_load_and_index.py

# Lancer le service API RAG
python rag_api_service.py
```

> ✅ Le service RAG sera disponible sur `http://localhost:8000`
> 
> 📖 Documentation API interactive : `http://localhost:8000/docs`

### Étape 5 — Lancer le Backend Spring Boot

```bash
cd backend

# Windows (avec le wrapper Maven inclus)
mvn spring-boot:run

# Ou avec limitation mémoire :
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xmx512m"
```

> ✅ Le backend sera disponible sur `http://localhost:8080`

### Étape 6 — Lancer le Frontend Next.js

```bash
cd frontend

# Installer les dépendances (première fois)
npm install

# Lancer en mode développement
npm run dev
```

> ✅ L'application sera disponible sur `http://localhost:3000`

---

## ✅ Vérification de l'installation

Ouvrez `http://localhost:3000` et connectez-vous avec :

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | `admin@audit.ma` | `Admin@2024` |
| Manager | `manager@audit.ma` | `Manager@2024` |
| Auditeur | `auditeur@audit.ma` | `Audit@2024` |

---

## 📖 Comment utiliser l'analyse RAG

1. **Connexion** → Se connecter avec un compte auditeur
2. **Créer un audit** → Depuis le dashboard, créer une nouvelle mission d'audit
3. **Uploader des documents** → Ajouter les contrats, rapports ou conventions à auditer (PDF, DOCX, TXT)
4. **Lancer l'analyse** → Cliquer sur le bouton **"Analyse IA"** puis **"Lancer l'analyse juridique RAG"**
5. **Télécharger le rapport** → Une fois l'analyse terminée, télécharger le rapport Word professionnel

> ⏳ L'analyse prend environ **30-90 secondes** selon la taille des documents et les ressources machine.

---

## 🗂️ Structure du projet

```
Audit_with_rag/
├── 📁 backend/                    # API Spring Boot (Java)
│   ├── src/main/java/com/audit/
│   │   ├── modules/
│   │   │   ├── audit/             # Gestion des audits
│   │   │   ├── document/          # Upload, téléchargement, suppression
│   │   │   ├── user/              # Gestion des utilisateurs
│   │   │   ├── notification/      # Notifications WebSocket
│   │   │   └── ai/                # Interface IA (legacy)
│   │   └── config/                # Security, CORS, JWT
│   └── src/main/resources/
│       └── application.yml        # Configuration
│
├── 📁 frontend/                   # Interface Next.js (TypeScript)
│   └── src/app/
│       ├── audit/[id]/            # Page détail audit
│       │   └── analyse/           # 🆕 Page analyse RAG
│       ├── dashboard/             # Tableau de bord
│       └── login/                 # Authentification
│
├── 📁 audit_rag_maroc/            # 🆕 Service RAG Python (FastAPI)
│   ├── rag_api_service.py         # API REST principale
│   ├── config.py                  # Configuration RAG + prompt Mistral
│   ├── 01_load_and_index.py       # Indexation des PDFs juridiques
│   ├── requirements.txt           # Dépendances Python
│   ├── data/                      # PDFs juridiques marocains (10 domaines)
│   ├── vector_db/                 # Base ChromaDB (générée automatiquement)
│   └── reports/                   # Rapports Word générés
│
└── 📄 docker-compose.yml          # PostgreSQL + MinIO
```

---

## ⚙️ Configuration

### Variables d'environnement Backend (`backend/src/main/resources/application.yml`)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5433/auditdb
    username: audit_user
    password: audit_pass

app:
  upload:
    path: ${user.home}/audit-platform-uploads

jwt:
  secret: your-jwt-secret-key
  expiration: 86400000
```

### Variables d'environnement Frontend

Créez `frontend/.env.local` :
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_RAG_API_URL=http://localhost:8000
```

### Configuration RAG (`audit_rag_maroc/config.py`)

```python
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_MODEL = "mistral"        # Modèle Ollama par défaut
RETRIEVAL_K = 8                  # Nombre de chunks juridiques récupérés
CHUNK_SIZE = 1000                # Taille des chunks (caractères)
```

---

## 🔧 Ordre de lancement (important)

```
1. docker-compose up -d          → PostgreSQL + MinIO
2. ollama serve                  → Serveur LLM local
3. cd backend && mvn spring-boot:run  → API Backend
4. cd frontend && npm run dev    → Interface Web
5. cd audit_rag_maroc && python rag_api_service.py → RAG API
```

---

## 🩺 Health Checks

| Service | URL |
|---------|-----|
| Backend Health | `http://localhost:8080/actuator/health` |
| RAG API Status | `http://localhost:8000/health` |
| RAG API Docs | `http://localhost:8000/docs` |
| Ollama Models | `http://localhost:11434/api/tags` |

---

## 🛠️ Technologies utilisées

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Zustand, React Query |
| **Backend** | Spring Boot 3.3, Spring Security, JWT, WebSocket, JPA/Hibernate |
| **RAG Service** | FastAPI, LangChain, ChromaDB, HuggingFace Embeddings, pypdf |
| **LLM** | Ollama + Mistral 7B (quantizé Q4_K_M, ~4.4 GB) |
| **Base de données** | PostgreSQL 16 |
| **Stockage** | Système de fichiers local (compatible MinIO) |
| **Infrastructure** | Docker, Docker Compose |
| **Rapport** | python-docx (Word .docx) |

---

## 🚨 Dépannage

### Port déjà utilisé
```bash
# Trouver le processus qui utilise un port (ex: 8080)
netstat -ano | findstr :8080
# Arrêter le processus
taskkill /PID <PID> /F
```

### Le service RAG ne démarre pas
```bash
# Vérifier que le port 8000 est libre
netstat -ano | findstr :8000
# Réinstaller les dépendances
pip install -r requirements.txt --upgrade
```

### Ollama non détecté
```bash
# Vérifier qu'Ollama est lancé
curl http://localhost:11434/api/tags
# Redémarrer Ollama
ollama serve
```

### Base vectorielle vide
```bash
# Ré-indexer les documents juridiques
cd audit_rag_maroc
python 01_load_and_index.py
```

### Erreur de connexion PostgreSQL
```bash
# Vérifier que Docker tourne
docker-compose ps
# Relancer si nécessaire
docker-compose up -d
```

---

## 📄 Licence

Ce projet est développé dans le cadre d'un projet académique de fin d'études.

---

<div align="center">

Développé avec ❤️ par l'équipe **AuditPro**

</div>

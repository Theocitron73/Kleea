from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import uuid
import asyncio
from contextlib import asynccontextmanager
import sys

# Les modules voisins sont trouvés quel que soit le dossier de lancement.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# --- MODULES DU BACKEND ---
import base  # noqa: F401  (charge l'environnement avant tout le reste)
from securite import periodic_cleanup_task, refresh_banned_ips_cache, security_firewall_middleware
import securite
from routes import abonnements, alertes, compte, sessions, transactions, comptes_bancaires, theme, projets, previsions, categories, imports, tricount, statistiques, demenagement, powens, conges, streamdeck
from journaux import chemin_journalisable, logger


# 5. Lifespan (Démarrage / Arrêt)
@asynccontextmanager
async def lifespan(app: FastAPI):
    refresh_banned_ips_cache(force=True)
    cleanup_task = asyncio.create_task(periodic_cleanup_task())
    yield
    cleanup_task.cancel()

# 6. INSTANCIATION UNIQUE DE FASTAPI
app = FastAPI(lifespan=lifespan)

# 7. MIDDLEWARE CORS (DOIT ÊTRE PLACÉ IMMÉDIATEMENT APRÈS app = FastAPI)
origins = [
    orig for orig in [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        os.getenv("DOMAINE_DEFAULT"),
        os.getenv("SOUS_DOMAINE_URL"),
    ] if orig
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def erreur_non_geree(request: Request, exc: Exception):
    reference = uuid.uuid4().hex[:8]
    logger.error(
        f"Erreur non gérée [ref {reference}] {request.method} {chemin_journalisable(request.url.path)}",
        exc_info=exc,
    )
    reponse = JSONResponse(status_code=500, content={"detail": f"Erreur interne. Référence : {reference}", "reference": reference})
    origine = request.headers.get("origin")
    if origine in origins:
        reponse.headers["Access-Control-Allow-Origin"] = origine
        reponse.headers["Access-Control-Allow-Credentials"] = "true"
        reponse.headers["Vary"] = "Origin"
    return reponse


@app.get("/")
def read_root():
    return {"status": "L'API de finances est en ligne"}


# =========================================================================
# 🛡️ MODULE CYBERSÉCURITÉ : PARE-FEU, HONEYPOT & ANTI BRUTE-FORCE
# =========================================================================


app.middleware("http")(security_firewall_middleware)


@app.middleware("http")
async def add_security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


    


    


# Caches en mémoire pour le Rate-Limiting


    


    


# =========================================================================
# 📥 MOTEUR D'IMPORTATION UNIVERSEL : CSV, OFX, QIF & QFX
# =========================================================================

    


    


    


    
    
    


    
    
    


    


    

    


    


    


    


# =========================================================================
# 📦 DUPLICATION DE SCÉNARIO DÉMÉNAGEMENT
# =========================================================================

    

# =========================================================================
# 📝 BLOC-NOTES DÉMÉNAGEMENT (SAUVEGARDE ATOMIQUE SANS COLONNE MANQUANTE)
# =========================================================================


    


# =========================================================================
# 🟢 MODULE ANTI-DOUBLON INTELLIGENT (CSV <-> POWENS)
# =========================================================================


# 🟢 ROUTE POUR FORCER POWENS À SE CONNECTER EN DIRECT À LA VRAIE BANQUE


# =========================================================================
# 🏖️ MODULE GESTION DES CONGÉS & GÉNÉRATION PDF OFFICIEL ISA GROUP
# =========================================================================


# =========================================================================
# ✂️ MODULE SPLIT TRANSACTION (VENTILATION COMPTABLE)
# =========================================================================


# =========================================================================
# 🏦 MAPPING DES CATÉGORIES NATIVES POWENS VERS LES CATÉGORIES UTILISATEUR
# =========================================================================

# =========================================================================
# 🎨 GESTION DES PRESETS DE THÈMES (UNIQUEMENT L'HABILLAGE DU SITE)
# =========================================================================


# =========================================================================
# 🏠 ROUTES CRUD POUR LES ANNONCES DE DÉMÉNAGEMENT
# =========================================================================


# =========================================================================
# 📱 SYNCHRONISATION DES PAGES MASQUÉES DU MENU (MULTI-APPAREILS)
# =========================================================================


# =========================================================================
# 🎛️ STREAM DECK : VUES EN LECTURE SEULE POUR LE PLUGIN
# =========================================================================
# Le plugin s'authentifie avec un jeton dédié (généré depuis le profil), jamais
# avec le JWT de session : il ne peut que lire les soldes via /api/streamdeck/data.
# Seule l'empreinte SHA-256 du jeton est conservée en base.


app.include_router(securite.router)
app.include_router(compte.router)
app.include_router(transactions.router)
app.include_router(comptes_bancaires.router)
app.include_router(theme.router)
app.include_router(projets.router)
app.include_router(previsions.router)
app.include_router(categories.router)
app.include_router(imports.router)
app.include_router(tricount.router)
app.include_router(statistiques.router)
app.include_router(demenagement.router)
app.include_router(powens.router)
app.include_router(conges.router)
app.include_router(streamdeck.router)
app.include_router(abonnements.router)
app.include_router(alertes.router)
app.include_router(sessions.router)

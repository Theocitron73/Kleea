-- Tables utilisées par test_postgres.py, déduites des requêtes de main.py.
-- Ce n'est pas le schéma exact de la production : les types peuvent y être différents.
CREATE TABLE banned_ips (
    ip VARCHAR(50) PRIMARY KEY,
    reason TEXT,
    banned_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE projets (
    id SERIAL PRIMARY KEY,
    utilisateur TEXT,
    profil TEXT,
    nom TEXT,
    cout DOUBLE PRECISION,
    date TEXT,
    capa DOUBLE PRECISION,
    apport_epargne DOUBLE PRECISION DEFAULT 0,
    mode_epargne TEXT,
    date_debut TEXT,
    utiliser_capa_stricte BOOLEAN DEFAULT FALSE,
    ordre INTEGER
);
CREATE TABLE allocations (
    id SERIAL PRIMARY KEY,
    utilisateur TEXT,
    profil TEXT,
    projet TEXT,
    montant_alloue DOUBLE PRECISION,
    date_allocation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

"""Point de départ : la structure de production relevée sur Neon le 5 novembre 2026.

Sur une base vide, `alembic upgrade head` recrée les 28 tables de l'application. Sur la production, où elles existent
déjà, `upgrade` échoue dès la première table sans rien modifier : cette révision s'y marque avec `alembic stamp 0001`.
Le schéma neon_auth est géré par Neon et n'en fait pas partie.
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

TABLES = [
    """CREATE TABLE allocations (
    id SERIAL NOT NULL,
    utilisateur text NOT NULL,
    profil character varying(50) NOT NULL,
    projet text NOT NULL,
    montant_alloue double precision NOT NULL,
    date_allocation timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT allocations_pkey PRIMARY KEY (id)
)""",
    """CREATE TABLE annonces_logement (
    id SERIAL NOT NULL,
    utilisateur character varying(100) NOT NULL,
    titre character varying(255) NOT NULL,
    url text,
    source character varying(100),
    loyer numeric(10,2) DEFAULT 0,
    charges numeric(10,2) DEFAULT 0,
    surface numeric(10,2) DEFAULT 0,
    pieces integer DEFAULT 0,
    ville character varying(100),
    photos text,
    dossier_envoye boolean DEFAULT false,
    date_dossier character varying(50),
    visite_effectuee boolean DEFAULT false,
    date_visite character varying(50),
    statut_reponse character varying(50) DEFAULT 'en_attente'::character varying,
    notes text,
    favori boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT annonces_logement_pkey PRIMARY KEY (id)
)""",
    """CREATE TABLE banned_ips (
    ip character varying(50) NOT NULL,
    reason text,
    banned_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT banned_ips_pkey PRIMARY KEY (ip)
)""",
    """CREATE TABLE budgets (
    utilisateur text NOT NULL,
    mois text NOT NULL,
    compte text NOT NULL,
    type text,
    nom text,
    somme double precision,
    id SERIAL NOT NULL,
    annee smallint DEFAULT 2026,
    CONSTRAINT constraint_budg PRIMARY KEY (utilisateur, id, mois, compte)
)""",
    """CREATE TABLE categories (
    nom text NOT NULL,
    utilisateur text NOT NULL,
    icone character varying(50) DEFAULT 'tag'::character varying,
    couleur character varying(30) DEFAULT '#818cf8'::character varying,
    groupe character varying(100) DEFAULT 'Général'::character varying,
    CONSTRAINT constraint_2 PRIMARY KEY (utilisateur, nom)
)""",
    """CREATE TABLE categories_masquees (
    id SERIAL NOT NULL,
    nom character varying(255) NOT NULL,
    utilisateur character varying(100) NOT NULL,
    CONSTRAINT categories_masquees_pkey PRIMARY KEY (id)
)""",
    """CREATE TABLE config_categories (
    id SERIAL NOT NULL,
    categorie text,
    mots_cles text,
    utilisateur text,
    CONSTRAINT config_categories_pkey PRIMARY KEY (id),
    CONSTRAINT config_categories_categorie_key UNIQUE (categorie, utilisateur)
)""",
    """CREATE TABLE configuration (
    compte text NOT NULL,
    groupe text,
    objectif double precision,
    solde double precision,
    utilisateur text NOT NULL,
    couleur text,
    taux double precision,
    powens_name text,
    CONSTRAINT constraint_5 PRIMARY KEY (compte, utilisateur)
)""",
    """CREATE TABLE conges (
    id SERIAL NOT NULL,
    utilisateur character varying(100) NOT NULL,
    type character varying(20) NOT NULL,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    nb_jours numeric(5,2) NOT NULL,
    motif text,
    anticipe boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conges_pkey PRIMARY KEY (id)
)""",
    """CREATE TABLE conges_profile (
    utilisateur character varying(100) NOT NULL,
    nom character varying(100),
    prenom character varying(100),
    societe character varying(100),
    poste character varying(100),
    date_embauche date DEFAULT '2026-01-01'::date,
    jours_acquis_annuel numeric(5,2) DEFAULT 25,
    CONSTRAINT conges_profile_pkey PRIMARY KEY (utilisateur)
)""",
    """CREATE TABLE custom_stats (
    id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    utilisateur character varying(255) NOT NULL,
    titre character varying(255) NOT NULL,
    flux_type character varying(255) NOT NULL,
    operateur character varying(255) NOT NULL,
    regles jsonb NOT NULL,
    profil character varying(50) NOT NULL DEFAULT 'Tous'::character varying,
    couleur character varying(20) DEFAULT 'indigo'::character varying,
    icone character varying(20) DEFAULT 'star'::character varying,
    CONSTRAINT custom_stats_pkey PRIMARY KEY (id)
)""",
    """CREATE TABLE login_failed_attempts (
    id SERIAL NOT NULL,
    ip character varying(50) NOT NULL,
    attempted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT login_failed_attempts_pkey PRIMARY KEY (id)
)""",
    """CREATE TABLE memoire (
    nom text NOT NULL,
    categorie text,
    utilisateur text NOT NULL,
    CONSTRAINT constraint_4 PRIMARY KEY (nom, utilisateur)
)""",
    """CREATE TABLE notes (
    utilisateur text NOT NULL,
    texte text,
    CONSTRAINT constraint_1 PRIMARY KEY (utilisateur)
)""",
    """CREATE TABLE notes_demenagement (
    utilisateur character varying(255) NOT NULL,
    contenu text,
    mis_a_jour_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notes_demenagement_pkey PRIMARY KEY (utilisateur)
)""",
    """CREATE TABLE pages_masquees (
    utilisateur character varying(255) NOT NULL,
    pages text DEFAULT '[]'::text,
    CONSTRAINT pages_masquees_pkey PRIMARY KEY (utilisateur)
)""",
    """CREATE TABLE previsions (
    date timestamp without time zone NOT NULL,
    nom text NOT NULL,
    montant double precision NOT NULL,
    categorie text,
    compte text,
    mois text,
    annee double precision,
    utilisateur text NOT NULL,
    id SERIAL NOT NULL,
    actif boolean,
    CONSTRAINT constraint_prev PRIMARY KEY (nom, utilisateur, montant, date)
)""",
    """CREATE TABLE projets (
    utilisateur text,
    profil text,
    nom text,
    cout double precision,
    date timestamp without time zone,
    capa double precision,
    apport_epargne double precision DEFAULT 0,
    mode_epargne character varying(20) DEFAULT 'debut_annee'::character varying,
    date_debut character varying(50),
    utiliser_capa_stricte boolean DEFAULT false,
    id SERIAL NOT NULL,
    ordre integer
)""",
    """CREATE TABLE security_rate_limits (
    id SERIAL NOT NULL,
    key character varying(255) NOT NULL,
    action character varying(50) NOT NULL,
    attempted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT security_rate_limits_pkey PRIMARY KEY (id)
)""",
    """CREATE TABLE simulations_demenagement (
    id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    utilisateur character varying(255) NOT NULL,
    scenario character varying(255) NOT NULL,
    titre character varying(255) NOT NULL,
    flux_type character varying(255) NOT NULL,
    categorie character varying(255) NOT NULL,
    montant numeric(10,2) NOT NULL,
    frequence character varying(50) NOT NULL,
    cible character varying(50) NOT NULL,
    CONSTRAINT simulations_demenagement_pkey PRIMARY KEY (id)
)""",
    """CREATE TABLE split_sources (
    id SERIAL NOT NULL,
    utilisateur character varying(100) NOT NULL,
    date date NOT NULL,
    nom character varying(255) NOT NULL,
    montant numeric(10,2) NOT NULL,
    compte character varying(100) NOT NULL,
    split_id character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    categorie character varying(100),
    CONSTRAINT split_sources_pkey PRIMARY KEY (id),
    CONSTRAINT split_sources_split_id_key UNIQUE (split_id)
)""",
    """CREATE TABLE streamdeck_tokens (
    utilisateur character varying(255) NOT NULL,
    token_hash character varying(64) NOT NULL,
    created_at text NOT NULL,
    CONSTRAINT streamdeck_tokens_pkey PRIMARY KEY (utilisateur),
    CONSTRAINT streamdeck_tokens_token_hash_key UNIQUE (token_hash)
)""",
    """CREATE TABLE theme (
    element text NOT NULL,
    couleur text,
    "user" text NOT NULL,
    CONSTRAINT constraint_theme PRIMARY KEY (element, "user")
)""",
    """CREATE TABLE theme_presets (
    id SERIAL NOT NULL,
    utilisateur character varying(100) NOT NULL,
    nom character varying(100) NOT NULL,
    bg_site character varying(50) NOT NULL,
    primary_color character varying(50) NOT NULL,
    text_main character varying(50) NOT NULL,
    glass_bg character varying(100) NOT NULL,
    glass_blur character varying(20) NOT NULL,
    radius character varying(20) NOT NULL,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    secondary_color text,
    gradient_style text,
    gradient_intensity text,
    gradient_color text,
    gradient_angle text,
    gradient_shape text,
    gradient_center text,
    gradient_spread text,
    CONSTRAINT theme_presets_pkey PRIMARY KEY (id),
    CONSTRAINT unique_user_theme_nom UNIQUE (utilisateur, nom)
)""",
    """CREATE TABLE transactions (
    date timestamp without time zone,
    nom text,
    montant double precision,
    categorie text,
    compte text,
    mois text,
    annee double precision,
    utilisateur text,
    id SERIAL NOT NULL,
    enveloppe character varying(255),
    prevision_id integer,
    split_id character varying(50),
    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT constraint_3 UNIQUE (date, nom, montant, utilisateur)
)""",
    """CREATE TABLE tricount (
    date timestamp without time zone,
    libelle text,
    paye_par text,
    pour_qui text,
    montant double precision,
    groupe text,
    utilisateur text,
    id SERIAL NOT NULL,
    emoji text,
    token_partage text,
    CONSTRAINT constraint_tricount PRIMARY KEY (id)
)""",
    """CREATE TABLE user_theme (
    utilisateur text NOT NULL,
    bg_site text DEFAULT '#f8fafc'::text,
    primary_color text DEFAULT '#4f46e5'::text,
    text_main text DEFAULT '#0f172a'::text,
    radius text DEFAULT '1.5rem'::text,
    glass_blur text,
    glass_bg text,
    secondary_color text,
    CONSTRAINT constraint_theme2 PRIMARY KEY (utilisateur)
)""",
    """CREATE TABLE users (
    username text NOT NULL,
    email text,
    password text,
    name text,
    reset_token text,
    import_mode character varying(20) DEFAULT 'manual'::character varying,
    powens_token text,
    role character varying(20) DEFAULT 'user'::character varying,
    CONSTRAINT constraint_user PRIMARY KEY (username),
    CONSTRAINT check_user_role CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'user'::character varying])::text[])))
)""",
]

INDEX = [
    "CREATE INDEX idx_rate_limits_lookup ON security_rate_limits USING btree (key, action, attempted_at)",
    "CREATE INDEX idx_split_sources_lookup ON split_sources USING btree (utilisateur, date, montant, nom, compte)",
    "CREATE INDEX idx_transactions_prevision_id ON transactions USING btree (prevision_id)",
    "CREATE INDEX idx_transactions_utilisateur ON transactions USING btree (utilisateur)",
]


def upgrade() -> None:
    for instruction in TABLES + INDEX:
        op.execute(instruction)


def downgrade() -> None:
    # Revenir avant le point de départ reviendrait à supprimer toutes les tables, et donc toutes les données.
    raise RuntimeError("Le point de départ ne se défait pas : pour revenir en arrière, restaurer une branche Neon.")

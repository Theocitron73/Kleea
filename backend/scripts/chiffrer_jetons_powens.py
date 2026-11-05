"""Chiffre les jetons Powens encore en clair dans la table users. Sans --appliquer, ne fait que les compter.

Utilisation, depuis une machine qui a DATABASE_URL et IBAN_ENCRYPTION_KEY :
    python backend/scripts/chiffrer_jetons_powens.py
    python backend/scripts/chiffrer_jetons_powens.py --appliquer

Sauvegardez la base avant : sans cette clé, les jetons chiffrés sont illisibles et il faut reconnecter les banques.
Relancer le script ne chiffre pas deux fois. Il n'affiche jamais de jeton.
"""
import argparse
import os
import sys

import psycopg
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv


def est_chiffre(cipher: Fernet, jeton: str) -> bool:
    try:
        cipher.decrypt(jeton.encode())
        return True
    except InvalidToken:
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--appliquer", action="store_true", help="enregistre les jetons chiffrés")
    args = parser.parse_args()

    load_dotenv()
    url = os.getenv("DATABASE_URL")
    cle = os.getenv("IBAN_ENCRYPTION_KEY")
    if not url or not cle:
        print("DATABASE_URL et IBAN_ENCRYPTION_KEY sont obligatoires.", file=sys.stderr)
        return 1
    cipher = Fernet(cle.strip().encode())

    with psycopg.connect(url.replace("postgresql+psycopg://", "postgresql://")) as conn:
        lignes = conn.execute("SELECT username, powens_token FROM users WHERE powens_token IS NOT NULL").fetchall()
        en_clair = [(nom, jeton) for nom, jeton in lignes if not est_chiffre(cipher, jeton)]
        print(f"{len(lignes)} jeton(s) trouvé(s), dont {len(en_clair)} en clair.")
        if not args.appliquer:
            print("Rien n'a été modifié. Ajoutez --appliquer pour les chiffrer.")
            return 0
        for nom, jeton in en_clair:
            conn.execute(
                "UPDATE users SET powens_token = %s WHERE username = %s AND powens_token = %s",
                (cipher.encrypt(jeton.encode()).decode(), nom, jeton),
            )
    print(f"{len(en_clair)} jeton(s) chiffré(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

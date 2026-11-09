import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@127.0.0.1:1/test")
os.environ.setdefault("JWT_SECRET_KEY", "secret-de-test-suffisamment-long-pour-hs256")
os.environ.setdefault("GEMINI_API_KEY", "test")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes import conges  # noqa: E402


class LogoDuPdfDeConges(unittest.TestCase):
    def test_le_logo_isa_est_trouve(self):
        # Le PDF retombait sur un logo dessiné quand ce chemin pointait vers routes/assets/.
        self.assertTrue(os.path.isfile(conges.LOGO_ISA), conges.LOGO_ISA)


if __name__ == "__main__":
    unittest.main()

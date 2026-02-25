from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PERSONA_DIR = BASE_DIR / "personas"
TEMPLATE_DIR = BASE_DIR / "templates"

def load_persona(name: str) -> str:
    path = PERSONA_DIR / f"{name}.md"
    return path.read_text(encoding="utf-8")

def load_template(name: str) -> str:
    path = TEMPLATE_DIR / f"{name}.md"
    return path.read_text(encoding="utf-8")
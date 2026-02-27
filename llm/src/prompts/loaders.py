from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SRC_DIR = BASE_DIR.parent

PERSONA_DIRS = [
    BASE_DIR / "personas",
    SRC_DIR / "personas"
]

TEMPLATE_DIRS = [
    BASE_DIR / "templates",
    SRC_DIR / "templates",
    BASE_DIR
]

TEMPLATE_ALIASES = {
    "requirement_template": "rdd_template"
}


def _load_markdown(name: str, search_dirs: list[Path], aliases: dict[str, str] | None = None) -> str:
    candidate_names = [name]
    if aliases and name in aliases:
        candidate_names.append(aliases[name])

    for candidate_name in candidate_names:
        for directory in search_dirs:
            path = directory / f"{candidate_name}.md"
            if path.exists():
                return path.read_text(encoding="utf-8")

    searched = [str(directory / f"{candidate}.md") for candidate in candidate_names for directory in search_dirs]
    raise FileNotFoundError(f"Prompt file not found: {name}.md (searched: {', '.join(searched)})")

def load_persona(name: str) -> str:
    return _load_markdown(name, PERSONA_DIRS)

def load_template(name: str) -> str:
    return _load_markdown(name, TEMPLATE_DIRS, TEMPLATE_ALIASES)
"""Ensure the SAM Lambda artifact receives every application dependency."""

import re
import tomllib
from pathlib import Path


def _package_name(requirement: str) -> str:
    match = re.match(r"[A-Za-z0-9_.-]+", requirement.strip())
    assert match is not None, f"Unable to parse dependency: {requirement}"
    return re.sub(r"[-_.]+", "-", match.group(0)).lower()


def test_lambda_requirements_include_all_runtime_dependencies() -> None:
    repository_root = Path(__file__).resolve().parents[3]
    pyproject = tomllib.loads((repository_root / "pyproject.toml").read_text())
    declared = {
        _package_name(requirement)
        for requirement in pyproject["project"]["dependencies"]
    }

    exported = {
        _package_name(line)
        for line in (repository_root / "backend" / "requirements.txt")
        .read_text()
        .splitlines()
        if line and not line.startswith(("#", " "))
    }

    assert declared <= exported, (
        "backend/requirements.txt is stale; regenerate it with "
        "`uv export --format requirements-txt --no-dev --no-hashes "
        "--output-file backend/requirements.txt`. Missing: "
        f"{sorted(declared - exported)}"
    )

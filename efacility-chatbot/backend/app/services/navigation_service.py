from __future__ import annotations

from typing import Optional


class NavigationService:
    @staticmethod
    def is_main_menu_command(text: Optional[str]) -> bool:
        if not text:
            return False
        normalized = " ".join(text.strip().lower().split())
        return normalized in {
            "0",
            "menu",
            "main menu",
            "back to main menu",
            "go to main menu",
            "return to main menu",
            "back main menu",
        }


navigation_service = NavigationService()

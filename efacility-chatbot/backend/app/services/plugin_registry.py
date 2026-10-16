from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


class ChatbotPlugin(Protocol):
    key: str
    name: str
    enabled: bool

    def metadata(self) -> dict:
        ...


@dataclass(slots=True)
class PluginMetadata:
    key: str
    name: str
    enabled: bool = False
    description: str = ""

    def metadata(self) -> dict:
        return {
            "key": self.key,
            "name": self.name,
            "enabled": self.enabled,
            "description": self.description,
        }


class PluginRegistry:
    """Simple registry for future enterprise integrations."""

    def __init__(self):
        self._plugins: dict[str, ChatbotPlugin] = {}

    def register(self, plugin: ChatbotPlugin):
        self._plugins[plugin.key] = plugin

    def list_plugins(self) -> list[dict]:
        return [plugin.metadata() for plugin in self._plugins.values()]


plugin_registry = PluginRegistry()
plugin_registry.register(PluginMetadata(
    key="calendar",
    name="Calendar integration",
    enabled=False,
    description="Placeholder for future calendar availability sync.",
))
plugin_registry.register(PluginMetadata(
    key="notifications",
    name="Notifications",
    enabled=False,
    description="Placeholder for email/Teams booking notifications.",
))
plugin_registry.register(PluginMetadata(
    key="enterprise_auth",
    name="Enterprise auth",
    enabled=False,
    description="Placeholder for SSO/user-directory integration.",
))

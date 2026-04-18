"""Unit tests for app/services/graph_service.py — URL constants."""


from app.services.graph_service import GRAPH_BASE_URL, GRAPH_BETA_URL


class TestGraphUrlConstants:
    def test_base_url_is_string(self) -> None:
        assert isinstance(GRAPH_BASE_URL, str)

    def test_beta_url_is_string(self) -> None:
        assert isinstance(GRAPH_BETA_URL, str)

    def test_base_url_value(self) -> None:
        assert GRAPH_BASE_URL == "https://graph.microsoft.com/v1.0"

    def test_beta_url_value(self) -> None:
        assert GRAPH_BETA_URL == "https://graph.microsoft.com/beta"

    def test_base_url_uses_https(self) -> None:
        assert GRAPH_BASE_URL.startswith("https://")

    def test_beta_url_uses_https(self) -> None:
        assert GRAPH_BETA_URL.startswith("https://")

    def test_urls_are_distinct(self) -> None:
        assert GRAPH_BASE_URL != GRAPH_BETA_URL

    def test_base_url_contains_v1(self) -> None:
        assert "v1.0" in GRAPH_BASE_URL

    def test_beta_url_contains_beta(self) -> None:
        assert "beta" in GRAPH_BETA_URL

    def test_base_url_targets_graph_endpoint(self) -> None:
        assert "graph.microsoft.com" in GRAPH_BASE_URL

    def test_beta_url_targets_graph_endpoint(self) -> None:
        assert "graph.microsoft.com" in GRAPH_BETA_URL

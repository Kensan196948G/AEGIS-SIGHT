"""
AEGIS-SIGHT version information.

Single source of truth for version numbers across the application.
Import from this module in all places that need version information.

Usage:
    from app.version import __version__, __api_version__
"""

# Application version (follows semver)
__version__ = "0.24.0"

# API version (for /api/v{N}/ routing and OpenAPI spec)
__api_version__ = "1.0.0"

# Build metadata (populated by CI/CD)
__build__ = "dev"


def get_version_info() -> dict:
    """Return a dictionary of version information."""
    return {
        "version": __version__,
        "api_version": __api_version__,
        "build": __build__,
    }

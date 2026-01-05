"""
Ventazo CRM - Paleta de Colores Premium
Diseño glassmorphism con modo oscuro/claro
"""

from reportlab.lib import colors


class VentazoColors:
    """Paleta de colores Ventazo CRM - Premium Design System"""

    # =========================================
    # FONDOS (Dark Mode - Default)
    # =========================================
    BG_PRIMARY = colors.HexColor("#0f172a")       # Fondo principal oscuro (slate-900)
    BG_SECONDARY = colors.HexColor("#1e293b")     # Fondo secundario (slate-800)
    BG_CARD = colors.HexColor("#1e293b")          # Fondo de cards
    BG_ELEVATED = colors.HexColor("#334155")      # Elementos elevados (slate-700)

    # =========================================
    # BRAND COLORS - Ventazo
    # =========================================
    # Emerald/Teal (Primary Brand)
    EMERALD_DARK = colors.HexColor("#047857")     # emerald-700
    EMERALD_PRIMARY = colors.HexColor("#10b981")  # emerald-500
    EMERALD_LIGHT = colors.HexColor("#34d399")    # emerald-400
    EMERALD_GLOW = colors.HexColor("#6ee7b7")     # emerald-300

    # Teal (Secondary)
    TEAL_DARK = colors.HexColor("#0f766e")        # teal-700
    TEAL_PRIMARY = colors.HexColor("#14b8a6")     # teal-500
    TEAL_LIGHT = colors.HexColor("#2dd4bf")       # teal-400

    # Purple (Accent)
    PURPLE_DARK = colors.HexColor("#581c87")      # purple-900
    PURPLE_PRIMARY = colors.HexColor("#7c3aed")   # violet-500
    PURPLE_LIGHT = colors.HexColor("#a855f7")     # purple-500

    # =========================================
    # SEMANTIC COLORS
    # =========================================
    SUCCESS = colors.HexColor("#10b981")          # emerald-500
    WARNING = colors.HexColor("#f59e0b")          # amber-500
    ERROR = colors.HexColor("#ef4444")            # red-500
    INFO = colors.HexColor("#06b6d4")             # cyan-500

    # =========================================
    # TEXT COLORS
    # =========================================
    TEXT_WHITE = colors.HexColor("#ffffff")
    TEXT_GRAY_100 = colors.HexColor("#f1f5f9")    # slate-100
    TEXT_GRAY_300 = colors.HexColor("#cbd5e1")    # slate-300
    TEXT_GRAY_400 = colors.HexColor("#94a3b8")    # slate-400
    TEXT_GRAY_500 = colors.HexColor("#64748b")    # slate-500
    TEXT_GRAY_600 = colors.HexColor("#475569")    # slate-600

    # =========================================
    # BORDER COLORS
    # =========================================
    BORDER_DARK = colors.HexColor("#334155")      # slate-700
    BORDER_LIGHT = colors.HexColor("#475569")     # slate-600
    BORDER_SUBTLE = colors.HexColor("#1e293b")    # slate-800

    # =========================================
    # QUOTE STATUS COLORS
    # =========================================
    STATUS_DRAFT = colors.HexColor("#64748b")     # slate-500
    STATUS_SENT = colors.HexColor("#3b82f6")      # blue-500
    STATUS_VIEWED = colors.HexColor("#06b6d4")    # cyan-500
    STATUS_ACCEPTED = colors.HexColor("#10b981")  # emerald-500
    STATUS_REJECTED = colors.HexColor("#ef4444")  # red-500
    STATUS_EXPIRED = colors.HexColor("#f97316")   # orange-500

    # =========================================
    # GRADIENTS (Start/End for simulation)
    # =========================================
    GRADIENT_EMERALD_START = colors.HexColor("#047857")
    GRADIENT_EMERALD_END = colors.HexColor("#14b8a6")
    GRADIENT_PURPLE_START = colors.HexColor("#581c87")
    GRADIENT_PURPLE_END = colors.HexColor("#7c3aed")


class VentazoColorsLight:
    """Paleta de colores Ventazo CRM - Light Mode"""

    # Fondos
    BG_PRIMARY = colors.HexColor("#ffffff")
    BG_SECONDARY = colors.HexColor("#f8fafc")     # slate-50
    BG_CARD = colors.HexColor("#ffffff")
    BG_ELEVATED = colors.HexColor("#f1f5f9")      # slate-100

    # Brand (same as dark)
    EMERALD_PRIMARY = colors.HexColor("#10b981")
    TEAL_PRIMARY = colors.HexColor("#14b8a6")

    # Text
    TEXT_PRIMARY = colors.HexColor("#0f172a")     # slate-900
    TEXT_SECONDARY = colors.HexColor("#475569")   # slate-600
    TEXT_MUTED = colors.HexColor("#94a3b8")       # slate-400

    # Borders
    BORDER_DEFAULT = colors.HexColor("#e2e8f0")   # slate-200
    BORDER_SUBTLE = colors.HexColor("#f1f5f9")    # slate-100

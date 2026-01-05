"""
Ventazo CRM - Custom PDF Flowables
Componentes visuales premium para PDFs
"""

from reportlab.platypus import Flowable
from reportlab.lib import colors
from reportlab.lib.units import inch
from .colors import VentazoColors


class GradientRect(Flowable):
    """Rectángulo con gradiente vertical simulado"""

    def __init__(self, width, height, color1, color2, text="", text_color=colors.white,
                 corner_radius=0, font_size=14):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.color1 = color1
        self.color2 = color2
        self.text = text
        self.text_color = text_color
        self.corner_radius = corner_radius
        self.font_size = font_size

    def draw(self):
        # Simular gradiente con rectángulos
        steps = 20
        for i in range(steps):
            # Interpolar colores
            r = self.color1.red + (self.color2.red - self.color1.red) * i / steps
            g = self.color1.green + (self.color2.green - self.color1.green) * i / steps
            b = self.color1.blue + (self.color2.blue - self.color1.blue) * i / steps
            color = colors.Color(r, g, b)

            y = self.height - (self.height / steps) * (i + 1)
            h = self.height / steps + 1

            self.canv.setFillColor(color)
            if self.corner_radius > 0 and (i == 0 or i == steps - 1):
                self.canv.roundRect(0, y, self.width, h, self.corner_radius, fill=1, stroke=0)
            else:
                self.canv.rect(0, y, self.width, h, fill=1, stroke=0)

        # Agregar texto si existe
        if self.text:
            self.canv.setFillColor(self.text_color)
            self.canv.setFont("Helvetica-Bold", self.font_size)
            self.canv.drawCentredString(self.width / 2, self.height / 2 - 5, self.text)


class AccentLine(Flowable):
    """Línea decorativa con gradiente horizontal (emerald/teal)"""

    def __init__(self, width, height=4, color1=None, color2=None):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.color1 = color1 or VentazoColors.EMERALD_DARK
        self.color2 = color2 or VentazoColors.TEAL_LIGHT

    def draw(self):
        steps = 50
        for i in range(steps):
            x = (self.width / steps) * i
            w = self.width / steps + 1

            # Gradiente de oscuro a claro y de vuelta
            progress = i / steps
            if progress < 0.5:
                factor = progress * 2
            else:
                factor = (1 - progress) * 2

            r = self.color1.red + (self.color2.red - self.color1.red) * factor
            g = self.color1.green + (self.color2.green - self.color1.green) * factor
            b = self.color1.blue + (self.color2.blue - self.color1.blue) * factor

            self.canv.setFillColor(colors.Color(r, g, b))
            self.canv.rect(x, 0, w, self.height, fill=1, stroke=0)


class DarkCard(Flowable):
    """Card con estilo dark mode premium"""

    def __init__(self, width, height, content_func=None, bg_color=None,
                 border_color=None, corner_radius=10):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.content_func = content_func
        self.bg_color = bg_color or VentazoColors.BG_CARD
        self.border_color = border_color or VentazoColors.BORDER_DARK
        self.corner_radius = corner_radius

    def draw(self):
        # Fondo del card
        self.canv.setFillColor(self.bg_color)
        self.canv.roundRect(0, 0, self.width, self.height, self.corner_radius, fill=1, stroke=0)

        # Borde sutil
        self.canv.setStrokeColor(self.border_color)
        self.canv.setLineWidth(0.5)
        self.canv.roundRect(0, 0, self.width, self.height, self.corner_radius, fill=0, stroke=1)

        if self.content_func:
            self.content_func(self.canv, self.width, self.height)


class StatBox(Flowable):
    """Box de estadística/KPI con estilo premium"""

    def __init__(self, value, label, width=1.5 * inch, height=1 * inch,
                 value_color=None, accent_color=None):
        Flowable.__init__(self)
        self.value = str(value)
        self.label = label
        self.width = width
        self.height = height
        self.value_color = value_color or VentazoColors.EMERALD_LIGHT
        self.accent_color = accent_color or VentazoColors.EMERALD_PRIMARY

    def draw(self):
        # Fondo
        self.canv.setFillColor(VentazoColors.BG_SECONDARY)
        self.canv.roundRect(0, 0, self.width, self.height, 8, fill=1, stroke=0)

        # Línea de acento en top
        self.canv.setStrokeColor(self.accent_color)
        self.canv.setLineWidth(2)
        self.canv.line(10, self.height, self.width - 10, self.height)

        # Valor grande
        self.canv.setFillColor(self.value_color)
        self.canv.setFont("Helvetica-Bold", 24)
        self.canv.drawCentredString(self.width / 2, self.height - 35, self.value)

        # Label
        self.canv.setFillColor(VentazoColors.TEXT_GRAY_400)
        self.canv.setFont("Helvetica", 9)

        # Dividir label en líneas si es necesario
        words = self.label.split()
        if len(words) > 2:
            line1 = " ".join(words[:2])
            line2 = " ".join(words[2:])
            self.canv.drawCentredString(self.width / 2, 25, line1)
            self.canv.drawCentredString(self.width / 2, 12, line2)
        else:
            self.canv.drawCentredString(self.width / 2, 18, self.label)


class StatusBadge(Flowable):
    """Badge de estado con color dinámico"""

    STATUS_COLORS = {
        'draft': (VentazoColors.STATUS_DRAFT, 'Borrador'),
        'pending_review': (VentazoColors.WARNING, 'En Revisión'),
        'sent': (VentazoColors.STATUS_SENT, 'Enviada'),
        'viewed': (VentazoColors.STATUS_VIEWED, 'Vista'),
        'accepted': (VentazoColors.STATUS_ACCEPTED, 'Aceptada'),
        'rejected': (VentazoColors.STATUS_REJECTED, 'Rechazada'),
        'expired': (VentazoColors.STATUS_EXPIRED, 'Expirada'),
        'revised': (VentazoColors.PURPLE_PRIMARY, 'Revisada'),
    }

    def __init__(self, status, width=1.2 * inch, height=0.3 * inch):
        Flowable.__init__(self)
        self.status = status
        self.width = width
        self.height = height
        color, label = self.STATUS_COLORS.get(status, (VentazoColors.TEXT_GRAY_500, status))
        self.color = color
        self.label = label

    def draw(self):
        # Fondo del badge
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=0)

        # Texto
        self.canv.setFillColor(colors.white)
        self.canv.setFont("Helvetica-Bold", 9)
        self.canv.drawCentredString(self.width / 2, self.height / 2 - 3, self.label.upper())


class PriceDisplay(Flowable):
    """Display de precio grande con formato currency"""

    def __init__(self, amount, currency="MXN", width=3 * inch, height=1.2 * inch,
                 show_label=True, color=None):
        Flowable.__init__(self)
        self.amount = amount
        self.currency = currency
        self.width = width
        self.height = height
        self.show_label = show_label
        self.color = color or VentazoColors.EMERALD_PRIMARY

    def draw(self):
        # Fondo
        self.canv.setFillColor(VentazoColors.BG_SECONDARY)
        self.canv.roundRect(0, 0, self.width, self.height, 12, fill=1, stroke=0)

        # Borde de acento
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(2)
        self.canv.line(0, self.height, self.width, self.height)

        # Formatear cantidad
        formatted = "${:,.2f}".format(self.amount)

        # Cantidad grande
        self.canv.setFillColor(self.color)
        self.canv.setFont("Helvetica-Bold", 32)
        y_pos = self.height / 2 if not self.show_label else self.height / 2 + 8
        self.canv.drawCentredString(self.width / 2, y_pos, formatted)

        # Label
        if self.show_label:
            self.canv.setFillColor(VentazoColors.TEXT_GRAY_500)
            self.canv.setFont("Helvetica", 11)
            self.canv.drawCentredString(self.width / 2, 15, f"{self.currency} (IVA incluido)")


class CompanyLogo(Flowable):
    """Logo de empresa con manejo de errores"""

    def __init__(self, logo_path, width=1.5 * inch, height=1.5 * inch):
        Flowable.__init__(self)
        self.logo_path = logo_path
        self.width = width
        self.height = height

    def draw(self):
        try:
            if self.logo_path:
                from reportlab.lib.utils import ImageReader
                self.canv.drawImage(
                    self.logo_path,
                    0, 0,
                    width=self.width,
                    height=self.height,
                    preserveAspectRatio=True,
                    mask='auto'
                )
        except Exception as e:
            # Placeholder si no hay logo
            self.canv.setFillColor(VentazoColors.BG_ELEVATED)
            self.canv.roundRect(0, 0, self.width, self.height, 8, fill=1, stroke=0)
            self.canv.setFillColor(VentazoColors.TEXT_GRAY_500)
            self.canv.setFont("Helvetica", 10)
            self.canv.drawCentredString(self.width / 2, self.height / 2, "LOGO")

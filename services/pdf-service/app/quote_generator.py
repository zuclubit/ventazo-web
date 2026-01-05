"""
Ventazo CRM - Quote PDF Generator v2.0
Generador de cotizaciones PDF con soporte para secciones dinamicas y temas
"""

import io
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether
)
from reportlab.pdfgen import canvas

from .colors import VentazoColors, VentazoColorsLight
from .flowables import AccentLine, StatBox, StatusBadge, PriceDisplay, DarkCard
from .schemas import (
    SectionConfig, SectionType, StyleConfig, ColorConfig,
    get_default_sections, get_dark_style_config, get_light_style_config
)


class DynamicColorPalette:
    """Dynamic color palette that can be configured at runtime"""

    def __init__(self, config: Optional[ColorConfig] = None, theme: str = "dark"):
        self.theme = theme

        if config:
            # Parse colors from config
            primary = colors.HexColor(config.primary)
            secondary = colors.HexColor(config.secondary) if config.secondary else primary
            accent = colors.HexColor(config.accent) if config.accent else primary
            background = colors.HexColor(config.background)
            text = colors.HexColor(config.text)
            muted = colors.HexColor(config.muted) if config.muted else self._adjust_color(text, 0.6)
            border = colors.HexColor(config.border) if config.border else self._adjust_color(background, 0.8 if theme == "dark" else 0.9)
            table_header = colors.HexColor(config.tableHeader) if config.tableHeader else self._adjust_color(background, 0.85 if theme == "dark" else 0.95)
            table_alt = colors.HexColor(config.tableRowAlt) if config.tableRowAlt else self._adjust_color(background, 0.95 if theme == "dark" else 0.98)

            # Backgrounds
            self.BG_PRIMARY = background
            self.BG_SECONDARY = table_header
            self.BG_CARD = table_alt
            self.BG_ELEVATED = self._adjust_color(background, 0.7 if theme == "dark" else 0.85)

            # Primary color variants (generate dark/light variants from primary)
            self.EMERALD_PRIMARY = primary
            self.EMERALD_LIGHT = self._lighten_color(primary, 0.2)
            self.EMERALD_DARK = self._darken_color(primary, 0.3)
            self.EMERALD_GLOW = self._lighten_color(primary, 0.4)

            # Secondary/Accent
            self.SECONDARY = secondary
            self.ACCENT = accent

            # Text colors
            self.TEXT_WHITE = text
            self.TEXT_GRAY_100 = self._adjust_opacity(text, 0.9)
            self.TEXT_GRAY_300 = self._adjust_opacity(text, 0.8)
            self.TEXT_GRAY_400 = muted
            self.TEXT_GRAY_500 = self._adjust_opacity(muted, 0.85)
            self.TEXT_GRAY_600 = self._adjust_opacity(muted, 0.7)

            # Borders
            self.BORDER_DARK = border
            self.BORDER_LIGHT = self._adjust_color(border, 0.9)
            self.BORDER_SUBTLE = self._adjust_color(border, 1.1)

        elif theme == "light":
            self._from_static(VentazoColorsLight)
        else:
            self._from_static(VentazoColors)

    def _hex_to_rgb(self, hex_color) -> tuple:
        """Convert HexColor to RGB tuple (0-1 range)"""
        return (hex_color.red, hex_color.green, hex_color.blue)

    def _rgb_to_hex(self, r: float, g: float, b: float):
        """Convert RGB (0-1 range) to HexColor"""
        r = max(0, min(1, r))
        g = max(0, min(1, g))
        b = max(0, min(1, b))
        hex_str = "#{:02x}{:02x}{:02x}".format(int(r * 255), int(g * 255), int(b * 255))
        return colors.HexColor(hex_str)

    def _lighten_color(self, color, amount: float = 0.2):
        """Lighten a color by mixing with white"""
        r, g, b = self._hex_to_rgb(color)
        r = r + (1 - r) * amount
        g = g + (1 - g) * amount
        b = b + (1 - b) * amount
        return self._rgb_to_hex(r, g, b)

    def _darken_color(self, color, amount: float = 0.2):
        """Darken a color by reducing RGB values"""
        r, g, b = self._hex_to_rgb(color)
        r = r * (1 - amount)
        g = g * (1 - amount)
        b = b * (1 - amount)
        return self._rgb_to_hex(r, g, b)

    def _adjust_color(self, color, factor: float):
        """Adjust color brightness"""
        r, g, b = self._hex_to_rgb(color)
        if factor > 1:
            # Lighten
            return self._lighten_color(color, factor - 1)
        else:
            # Darken
            return self._darken_color(color, 1 - factor)

    def _adjust_opacity(self, color, factor: float):
        """Simulate opacity by blending with background-appropriate color"""
        r, g, b = self._hex_to_rgb(color)
        if self.theme == "dark":
            # Blend toward black
            r = r * factor
            g = g * factor
            b = b * factor
        else:
            # Blend toward white
            r = r + (1 - r) * (1 - factor)
            g = g + (1 - g) * (1 - factor)
            b = b + (1 - b) * (1 - factor)
        return self._rgb_to_hex(r, g, b)

    def _from_static(self, static_colors):
        """Copy from static color class"""
        self.BG_PRIMARY = static_colors.BG_PRIMARY
        self.BG_SECONDARY = getattr(static_colors, 'BG_SECONDARY', static_colors.BG_PRIMARY)
        self.BG_CARD = getattr(static_colors, 'BG_CARD', static_colors.BG_PRIMARY)
        self.BG_ELEVATED = getattr(static_colors, 'BG_ELEVATED', static_colors.BG_PRIMARY)
        self.EMERALD_PRIMARY = getattr(static_colors, 'EMERALD_PRIMARY', colors.HexColor("#10b981"))
        self.EMERALD_LIGHT = getattr(static_colors, 'EMERALD_LIGHT', colors.HexColor("#34d399"))
        self.EMERALD_DARK = getattr(static_colors, 'EMERALD_DARK', colors.HexColor("#047857"))
        self.EMERALD_GLOW = getattr(static_colors, 'EMERALD_GLOW', colors.HexColor("#6ee7b7"))
        self.SECONDARY = getattr(static_colors, 'PURPLE_PRIMARY', colors.HexColor("#7c3aed"))
        self.ACCENT = getattr(static_colors, 'TEAL_PRIMARY', colors.HexColor("#14b8a6"))
        self.TEXT_WHITE = getattr(static_colors, 'TEXT_WHITE', colors.HexColor("#ffffff"))
        self.TEXT_GRAY_100 = getattr(static_colors, 'TEXT_GRAY_100', colors.HexColor("#f1f5f9"))
        self.TEXT_GRAY_300 = getattr(static_colors, 'TEXT_GRAY_300', colors.HexColor("#cbd5e1"))
        self.TEXT_GRAY_400 = getattr(static_colors, 'TEXT_GRAY_400', colors.HexColor("#94a3b8"))
        self.TEXT_GRAY_500 = getattr(static_colors, 'TEXT_GRAY_500', colors.HexColor("#64748b"))
        self.TEXT_GRAY_600 = getattr(static_colors, 'TEXT_GRAY_600', colors.HexColor("#475569"))
        self.BORDER_DARK = getattr(static_colors, 'BORDER_DARK', colors.HexColor("#334155"))
        self.BORDER_LIGHT = getattr(static_colors, 'BORDER_LIGHT', colors.HexColor("#475569"))
        self.BORDER_SUBTLE = getattr(static_colors, 'BORDER_SUBTLE', colors.HexColor("#1e293b"))

        # Light mode specific
        if hasattr(static_colors, 'TEXT_PRIMARY'):
            self.TEXT_WHITE = static_colors.TEXT_PRIMARY
            self.TEXT_GRAY_300 = getattr(static_colors, 'TEXT_SECONDARY', colors.HexColor("#475569"))
            self.TEXT_GRAY_400 = getattr(static_colors, 'TEXT_MUTED', colors.HexColor("#94a3b8"))
            self.TEXT_GRAY_500 = getattr(static_colors, 'TEXT_MUTED', colors.HexColor("#94a3b8"))
            self.BORDER_DARK = getattr(static_colors, 'BORDER_DEFAULT', colors.HexColor("#e2e8f0"))


class QuotePDFGenerator:
    """Generador de PDF de cotizacion con soporte para secciones dinamicas"""

    def __init__(
        self,
        quote_data: Dict[str, Any],
        tenant_data: Optional[Dict[str, Any]] = None,
        logo_path: Optional[str] = None,
        theme: str = "dark",
        sections: Optional[List[SectionConfig]] = None,
        style_config: Optional[StyleConfig] = None
    ):
        self.quote = quote_data
        self.tenant = tenant_data or {}
        self.logo_path = logo_path
        self.theme = theme

        # Use provided sections or defaults
        self.sections = sections or get_default_sections()

        # Use provided style config or theme default
        if style_config:
            self.style_config = style_config
            self.colors = DynamicColorPalette(style_config.colors, style_config.theme)
        else:
            self.style_config = get_dark_style_config() if theme == "dark" else get_light_style_config()
            self.colors = DynamicColorPalette(None, theme)

        self.styles = self._create_styles()
        self.elements = []
        self.page_width, self.page_height = letter

    def _color_hex(self, color) -> str:
        """Convert a ReportLab color to hex string for HTML"""
        r = int(color.red * 255)
        g = int(color.green * 255)
        b = int(color.blue * 255)
        return "#{:02x}{:02x}{:02x}".format(r, g, b)

    def _create_styles(self) -> Dict:
        """Crea estilos de parrafo personalizados"""
        styles = getSampleStyleSheet()

        # Body text
        styles['BodyText'].fontName = 'Helvetica'
        styles['BodyText'].fontSize = 11
        styles['BodyText'].leading = 17
        styles['BodyText'].textColor = self.colors.TEXT_GRAY_300
        styles['BodyText'].alignment = TA_JUSTIFY

        # Hero Title
        styles.add(ParagraphStyle(
            name='HeroTitle',
            fontName='Helvetica-Bold',
            fontSize=36,
            leading=44,
            textColor=self.colors.TEXT_WHITE,
            alignment=TA_CENTER,
        ))

        # Hero Subtitle
        styles.add(ParagraphStyle(
            name='HeroSubtitle',
            fontName='Helvetica',
            fontSize=16,
            leading=22,
            textColor=self.colors.TEXT_GRAY_400,
            alignment=TA_CENTER,
        ))

        # Quote Number
        styles.add(ParagraphStyle(
            name='QuoteNumber',
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=self.colors.EMERALD_LIGHT,
            alignment=TA_CENTER,
        ))

        # Section Title
        styles.add(ParagraphStyle(
            name='SectionTitle',
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=26,
            textColor=self.colors.TEXT_WHITE,
            spaceBefore=20,
            spaceAfter=12,
        ))

        # SubTitle
        styles.add(ParagraphStyle(
            name='SubTitle',
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=self.colors.EMERALD_LIGHT,
            spaceBefore=14,
            spaceAfter=8,
        ))

        # Highlight
        styles.add(ParagraphStyle(
            name='Highlight',
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=self.colors.EMERALD_LIGHT,
            spaceAfter=6,
        ))

        # Price Tag
        styles.add(ParagraphStyle(
            name='PriceTag',
            fontName='Helvetica-Bold',
            fontSize=32,
            leading=40,
            textColor=self.colors.EMERALD_PRIMARY,
            alignment=TA_CENTER,
        ))

        # Label
        styles.add(ParagraphStyle(
            name='Label',
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=self.colors.TEXT_GRAY_500,
        ))

        # Note
        styles.add(ParagraphStyle(
            name='Note',
            fontName='Helvetica-Oblique',
            fontSize=9,
            leading=13,
            textColor=self.colors.TEXT_GRAY_500,
            leftIndent=10,
            rightIndent=10,
            spaceAfter=8,
        ))

        # Footer
        styles.add(ParagraphStyle(
            name='Footer',
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=self.colors.TEXT_GRAY_500,
            alignment=TA_CENTER,
        ))

        return styles

    def _add_page_background(self, canvas, doc):
        """Agrega fondo y elementos decorativos a cada pagina"""
        canvas.saveState()

        # Main background
        canvas.setFillColor(self.colors.BG_PRIMARY)
        canvas.rect(0, 0, self.page_width, self.page_height, fill=1, stroke=0)

        # Gradient at top (only for dark theme)
        if self.theme == "dark":
            gradient_height = 2 * inch
            steps = 30
            for i in range(steps):
                alpha = 0.12 * (1 - i / steps)
                y = self.page_height - (gradient_height / steps) * (i + 1)
                h = gradient_height / steps + 1

                r = self.colors.EMERALD_DARK.red * alpha + self.colors.BG_PRIMARY.red * (1 - alpha)
                g = self.colors.EMERALD_DARK.green * alpha + self.colors.BG_PRIMARY.green * (1 - alpha)
                b = self.colors.EMERALD_DARK.blue * alpha + self.colors.BG_PRIMARY.blue * (1 - alpha)

                canvas.setFillColor(colors.Color(r, g, b))
                canvas.rect(0, y, self.page_width, h, fill=1, stroke=0)

        # Top accent line
        canvas.setStrokeColor(self.colors.EMERALD_PRIMARY)
        canvas.setLineWidth(3)
        canvas.line(0, self.page_height - 3, self.page_width, self.page_height - 3)

        # Header (page 2+)
        if doc.page > 1:
            canvas.setStrokeColor(self.colors.BORDER_DARK)
            canvas.setLineWidth(0.5)
            canvas.line(0.5 * inch, self.page_height - 0.6 * inch,
                       self.page_width - 0.5 * inch, self.page_height - 0.6 * inch)

            # Page number
            canvas.setFillColor(self.colors.TEXT_GRAY_500)
            canvas.setFont('Helvetica', 9)
            canvas.drawRightString(
                self.page_width - 0.5 * inch,
                self.page_height - 0.45 * inch,
                f"Pagina {doc.page}"
            )

            # Quote number in header
            canvas.setFillColor(self.colors.EMERALD_LIGHT)
            canvas.setFont('Helvetica-Bold', 9)
            canvas.drawString(0.5 * inch, self.page_height - 0.45 * inch,
                            self.quote.get('quoteNumber', ''))

        # Footer
        canvas.setStrokeColor(self.colors.BORDER_DARK)
        canvas.setLineWidth(0.5)
        canvas.line(0.5 * inch, 0.4 * inch, self.page_width - 0.5 * inch, 0.4 * inch)

        # Footer text - Include tenant contact info if available
        canvas.setFillColor(self.colors.TEXT_GRAY_500)
        canvas.setFont('Helvetica', 7)
        tenant_name = self.tenant.get('name', 'Ventazo CRM')

        # Build footer with available tenant info
        footer_parts = [tenant_name]
        if self.tenant.get('phone'):
            footer_parts.append(self.tenant.get('phone'))
        if self.tenant.get('email'):
            footer_parts.append(self.tenant.get('email'))
        if self.tenant.get('website'):
            footer_parts.append(self.tenant.get('website'))

        # If no contact info, use default confidential text
        if len(footer_parts) == 1:
            footer_parts.append("Documento Confidencial")

        footer_text = " | ".join(footer_parts)
        canvas.drawCentredString(self.page_width / 2, 0.25 * inch, footer_text)

        canvas.restoreState()

    def _format_currency(self, amount: float, currency: str = "MXN") -> str:
        """Format amount as currency - consistent with frontend display"""
        # Format matching frontend: Intl.NumberFormat('es-MX') without currency code
        # Currency code is shown separately in contexts where needed
        return f"${amount:,.2f}"

    def _format_date(self, date_str: Optional[str]) -> str:
        """Format date for display"""
        if not date_str:
            return "-"
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime("%d/%m/%Y")
        except:
            return date_str

    def _create_dark_table(
        self,
        data: List[List],
        col_widths: List[float],
        highlight_header: bool = True,
        highlight_total: bool = False,
        accent_color=None
    ) -> Table:
        """Create a styled table"""
        table = Table(data, colWidths=col_widths)

        style_commands = [
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.colors.TEXT_GRAY_300),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 0), (-1, -1), self.colors.BG_SECONDARY),
            ('GRID', (0, 0), (-1, -1), 0.5, self.colors.BORDER_DARK),
            ('BOX', (0, 0), (-1, -1), 1, self.colors.BORDER_DARK),
        ]

        # Header
        if highlight_header and len(data) > 0:
            header_color = accent_color or self.colors.EMERALD_DARK
            style_commands.extend([
                ('BACKGROUND', (0, 0), (-1, 0), header_color),
                ('TEXTCOLOR', (0, 0), (-1, 0), self.colors.TEXT_WHITE),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ])

        # Alternating rows
        for i in range(1, len(data)):
            if i % 2 == 0:
                style_commands.append(('BACKGROUND', (0, i), (-1, i), self.colors.BG_CARD))

        # Total row
        if highlight_total and len(data) > 1:
            style_commands.extend([
                ('BACKGROUND', (0, -1), (-1, -1), self.colors.EMERALD_DARK),
                ('TEXTCOLOR', (0, -1), (-1, -1), self.colors.TEXT_WHITE),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ])

        table.setStyle(TableStyle(style_commands))
        return table

    # ==========================================================================
    # Section Builders
    # ==========================================================================

    def _build_cover_section(self, config: Dict[str, Any]) -> List:
        """Build cover page section"""
        elements = []

        elements.append(Spacer(1, 1 * inch))

        # Logo
        if config.get('showLogo', True) and self.logo_path and os.path.exists(self.logo_path):
            try:
                logo = Image(self.logo_path, width=1.2 * inch, height=1.2 * inch)
                logo.hAlign = 'CENTER'
                elements.append(logo)
                elements.append(Spacer(1, 0.2 * inch))
            except:
                pass

        # Tenant name
        tenant_name = self.tenant.get('name', 'Empresa')
        elements.append(Paragraph(
            f"<font color='{self._color_hex(self.colors.TEXT_GRAY_400)}'>{tenant_name.upper()}</font>",
            ParagraphStyle('TenantName', fontName='Helvetica-Bold', fontSize=11,
                          alignment=TA_CENTER, textColor=self.colors.TEXT_GRAY_400)
        ))

        elements.append(Spacer(1, 0.6 * inch))

        # Main title
        elements.append(Paragraph("COTIZACION", self.styles['HeroTitle']))
        elements.append(Spacer(1, 0.15 * inch))

        # Quote number
        if config.get('showQuoteNumber', True):
            quote_number = self.quote.get('quoteNumber', 'COT-0001')
            elements.append(Paragraph(quote_number, self.styles['QuoteNumber']))

        elements.append(Spacer(1, 0.3 * inch))

        # Quote title
        title = self.quote.get('title', 'Propuesta de Servicios')
        elements.append(Paragraph(title, self.styles['HeroSubtitle']))

        elements.append(Spacer(1, 0.5 * inch))

        # Accent line
        elements.append(AccentLine(2 * inch))

        elements.append(Spacer(1, 0.4 * inch))

        # Metadata
        if config.get('showDate', True):
            issue_date = self._format_date(self.quote.get('issueDate'))
            expiry_date = self._format_date(self.quote.get('expiryDate'))
            version = self.quote.get('version', 1)
            quote_number = self.quote.get('quoteNumber', '')

            meta_text = f"{quote_number}  |  v{version}  |  Emitida: {issue_date}  |  Vigencia: {expiry_date}"
            elements.append(Paragraph(
                f"<font color='{self._color_hex(self.colors.TEXT_GRAY_500)}'>{meta_text}</font>",
                ParagraphStyle('Meta', fontSize=9, alignment=TA_CENTER)
            ))

        elements.append(Spacer(1, 0.5 * inch))

        # Client and preparer info - Complete fallback chain for consistency
        client_name = (
            self.quote.get('customerName')
            or self.quote.get('companyName')  # Added: companyName from backend mapping
            or self.quote.get('leadName')
            or 'Cliente'
        )
        contact_name = self.quote.get('contactName', '')
        assigned_name = self.quote.get('assignedToName') or self.quote.get('createdByName') or 'Equipo de Ventas'

        # Color references for HTML
        muted_hex = self._color_hex(self.colors.TEXT_GRAY_500)
        text_hex = self._color_hex(self.colors.TEXT_WHITE)
        primary_hex = self._color_hex(self.colors.EMERALD_PRIMARY)

        # Build client address string if showClientAddress is enabled
        client_address_lines = ""
        if config.get('showClientAddress', True):
            billing_address = self.quote.get('billingAddress')
            if billing_address and isinstance(billing_address, dict):
                addr_parts = []
                # Support both 'street' and 'line1/line2' formats
                street = billing_address.get('street') or billing_address.get('line1')
                if street:
                    addr_parts.append(street)
                if billing_address.get('line2'):
                    addr_parts.append(billing_address.get('line2'))
                if billing_address.get('city') or billing_address.get('state'):
                    city_state = ", ".join(filter(None, [billing_address.get('city'), billing_address.get('state')]))
                    if city_state:
                        addr_parts.append(city_state)
                if billing_address.get('postalCode') or billing_address.get('country'):
                    postal_country = " ".join(filter(None, [billing_address.get('postalCode'), billing_address.get('country')]))
                    if postal_country:
                        addr_parts.append(postal_country)
                if addr_parts:
                    client_address_lines = f"<br/><font color='{muted_hex}' size='8'>{' | '.join(addr_parts)}</font>"

        # Build contact email line if available
        contact_email = self.quote.get('contactEmail', '')
        contact_info = contact_name
        if contact_email:
            contact_info = f"{contact_name}<br/><font size='8'>{contact_email}</font>" if contact_name else contact_email

        prep_table_data = [[
            Paragraph(
                f"<font color='{muted_hex}'>Preparado para</font><br/>"
                f"<font color='{text_hex}'><b>{client_name}</b></font><br/>"
                f"<font color='{muted_hex}'>{contact_info}</font>"
                f"{client_address_lines}",
                ParagraphStyle('PrepFor', fontSize=10, alignment=TA_CENTER, leading=14)
            ),
            Paragraph(
                f"<font color='{muted_hex}'>Preparado por</font><br/>"
                f"<font color='{primary_hex}'><b>{assigned_name}</b></font><br/>"
                f"<font color='{muted_hex}'>{tenant_name}</font>",
                ParagraphStyle('PrepBy', fontSize=10, alignment=TA_CENTER, leading=14)
            ),
        ]]

        prep_table = Table(prep_table_data, colWidths=[3.3 * inch, 3.3 * inch])
        prep_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(prep_table)

        elements.append(Spacer(1, 0.5 * inch))

        # Confidential badge
        elements.append(Paragraph(
            f"<font color='{self._color_hex(self.colors.TEXT_GRAY_600)}'>---  DOCUMENTO CONFIDENCIAL  ---</font>",
            ParagraphStyle('Conf', fontName='Helvetica', fontSize=8,
                          alignment=TA_CENTER, letterSpacing=1)
        ))

        elements.append(PageBreak())
        return elements

    def _build_summary_section(self, config: Dict[str, Any]) -> List:
        """Build summary section"""
        elements = []

        elements.append(Paragraph("RESUMEN", self.styles['SectionTitle']))
        elements.append(AccentLine(1.5 * inch))
        elements.append(Spacer(1, 0.2 * inch))

        # Description
        description = self.quote.get('description', '')
        if description:
            elements.append(Paragraph(description, self.styles['BodyText']))
            elements.append(Spacer(1, 0.2 * inch))

        # KPIs
        items = self.quote.get('items', [])
        total = float(self.quote.get('total', 0))
        subtotal = float(self.quote.get('subtotal', 0))

        kpi_data = [
            [
                str(len(items)),
                self._format_currency(subtotal),
                self._format_currency(total),
            ],
            ['Lineas', 'Subtotal', 'Total'],
        ]

        kpi_table = Table(kpi_data, colWidths=[2.2 * inch, 2.2 * inch, 2.2 * inch],
                         rowHeights=[0.6 * inch, 0.4 * inch])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.colors.BG_SECONDARY),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 20),
            ('TEXTCOLOR', (0, 0), (0, 0), self.colors.EMERALD_LIGHT),
            ('TEXTCOLOR', (1, 0), (1, 0), self.colors.TEXT_WHITE),
            ('TEXTCOLOR', (2, 0), (2, 0), self.colors.EMERALD_PRIMARY),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, 1), 9),
            ('TEXTCOLOR', (0, 1), (-1, 1), self.colors.TEXT_GRAY_500),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, 0), 'BOTTOM'),
            ('VALIGN', (0, 1), (-1, 1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 1, self.colors.BORDER_DARK),
            ('LINEBEFORE', (1, 0), (1, -1), 0.5, self.colors.BORDER_DARK),
            ('LINEBEFORE', (2, 0), (2, -1), 0.5, self.colors.BORDER_DARK),
        ]))
        elements.append(kpi_table)

        elements.append(Spacer(1, 0.3 * inch))
        return elements

    def _build_details_section(self, config: Dict[str, Any]) -> List:
        """Build line items section"""
        elements = []

        elements.append(Paragraph("DETALLE", self.styles['SectionTitle']))
        elements.append(AccentLine(1.5 * inch))
        elements.append(Spacer(1, 0.2 * inch))

        items = self.quote.get('items', [])

        if not items:
            elements.append(Paragraph(
                f"<font color='{self._color_hex(self.colors.TEXT_GRAY_400)}'>No hay lineas en esta cotizacion.</font>",
                self.styles['Note']
            ))
            return elements

        # Build table based on config
        show_desc = config.get('showDescription', True)
        show_qty = config.get('showQuantity', True)
        show_unit = config.get('showUnitPrice', True)
        show_total = config.get('showTotal', True)

        # Build header
        header = ['DESCRIPCION']
        col_widths = [3.5 * inch]

        if show_qty:
            header.append('CANT.')
            col_widths.append(0.6 * inch)
        if show_unit:
            header.append('PRECIO UNIT.')
            col_widths.append(1.2 * inch)
        if show_total:
            header.append('SUBTOTAL')
            col_widths.append(1.2 * inch)

        table_data = [header]

        for item in items:
            name = item.get('name', '')
            description = item.get('description', '')
            quantity = item.get('quantity', 1)
            unit_price = float(item.get('unitPrice', 0))
            # Use subtotal (qty × unitPrice) for display, not total (which includes tax)
            # This is the expected behavior: show the line subtotal, then add taxes in summary
            item_subtotal = float(item.get('subtotal', quantity * unit_price))

            # Combine name and description
            item_text = f"<b>{name}</b>"
            if show_desc and description:
                desc_text = description[:80] + "..." if len(description) > 80 else description
                item_text += f"<br/><font color='{self._color_hex(self.colors.TEXT_GRAY_500)}' size='8'>{desc_text}</font>"

            row = [Paragraph(item_text, ParagraphStyle('ItemName', fontSize=9, leading=12))]

            if show_qty:
                row.append(str(quantity))
            if show_unit:
                row.append(self._format_currency(unit_price))
            if show_total:
                row.append(self._format_currency(item_subtotal))

            table_data.append(row)

        items_table = self._create_dark_table(
            table_data,
            col_widths,
            highlight_header=True
        )
        elements.append(items_table)

        elements.append(Spacer(1, 0.2 * inch))
        return elements

    def _build_totals_section(self, config: Dict[str, Any]) -> List:
        """Build totals section"""
        elements = []

        subtotal = float(self.quote.get('subtotal', 0))
        discount_amount = float(self.quote.get('discountAmount', 0))
        tax_amount = float(self.quote.get('taxAmount', 0))
        total = float(self.quote.get('total', 0))
        currency = self.quote.get('currency', 'MXN')

        totals_data = []

        if config.get('showSubtotal', True):
            totals_data.append(['Subtotal', self._format_currency(subtotal, currency)])

        if config.get('showDiscount', True) and discount_amount > 0:
            totals_data.append(['Descuento', f"-{self._format_currency(discount_amount, currency)}"])

        if config.get('showTax', True) and tax_amount > 0:
            tax_rate = self.quote.get('taxRate', 16)
            totals_data.append([f'IVA ({tax_rate}%)', self._format_currency(tax_amount, currency)])

        # Total row includes currency code for clarity
        totals_data.append([f'TOTAL ({currency})', self._format_currency(total, currency)])

        totals_table = Table(totals_data, colWidths=[1.5 * inch, 1.5 * inch])
        totals_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -2), self.colors.BG_SECONDARY),
            ('BACKGROUND', (0, -1), (-1, -1), self.colors.EMERALD_DARK),
            ('TEXTCOLOR', (0, 0), (-1, -2), self.colors.TEXT_GRAY_300),
            ('TEXTCOLOR', (0, -1), (-1, -1), self.colors.TEXT_WHITE),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('BOX', (0, 0), (-1, -1), 1, self.colors.BORDER_DARK),
        ]))
        totals_table.hAlign = 'RIGHT'
        elements.append(totals_table)

        elements.append(Spacer(1, 0.3 * inch))
        return elements

    def _build_terms_section(self, config: Dict[str, Any]) -> List:
        """Build terms section"""
        elements = []

        terms = self.quote.get('terms', '')
        notes = self.quote.get('notes', '')

        if terms or notes:
            title = config.get('termsTitle', 'TERMINOS Y CONDICIONES')
            elements.append(Paragraph(title.upper(), self.styles['SectionTitle']))
            elements.append(AccentLine(2 * inch))
            elements.append(Spacer(1, 0.2 * inch))

            if terms:
                elements.append(Paragraph(terms, self.styles['BodyText']))
                elements.append(Spacer(1, 0.15 * inch))

            if notes:
                elements.append(Paragraph(
                    f"<b>Notas:</b> {notes}",
                    self.styles['Note']
                ))

            elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _build_signature_section(self, config: Dict[str, Any]) -> List:
        """Build signature/acceptance section"""
        elements = []

        elements.append(Paragraph("ACEPTACION", self.styles['SectionTitle']))
        elements.append(AccentLine(1.5 * inch))
        elements.append(Spacer(1, 0.2 * inch))

        acceptance_text = """
        Al firmar este documento, el cliente acepta los terminos y condiciones
        establecidos en esta cotizacion y autoriza el inicio de los trabajos descritos.
        """
        elements.append(Paragraph(acceptance_text, self.styles['BodyText']))

        elements.append(Spacer(1, 0.4 * inch))

        # Signature table
        sign_label = config.get('signatureLabel', 'Nombre y Firma')

        sign_data = [
            ['CLIENTE', 'PROVEEDOR'],
            ['', ''],
            ['____________________________', '____________________________'],
            [sign_label, sign_label],
        ]

        if config.get('showDateLine', True):
            sign_data.append(['Fecha: _______________', 'Fecha: _______________'])

        sign_table = Table(sign_data, colWidths=[3.3 * inch, 3.3 * inch])
        sign_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.colors.BG_SECONDARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), self.colors.EMERALD_LIGHT),
            ('TEXTCOLOR', (0, 1), (-1, -1), self.colors.TEXT_GRAY_400),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(sign_table)

        return elements

    def _build_custom_text_section(self, config: Dict[str, Any]) -> List:
        """Build custom text section"""
        elements = []

        title = config.get('title', '')
        content = config.get('content', '')

        if title:
            elements.append(Paragraph(title.upper(), self.styles['SectionTitle']))
            elements.append(AccentLine(1.5 * inch))
            elements.append(Spacer(1, 0.2 * inch))

        if content:
            # Basic markdown-like processing
            for line in content.split('\n'):
                if line.strip():
                    elements.append(Paragraph(line, self.styles['BodyText']))
            elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _get_section_builder(self, section_type: SectionType):
        """Get the builder function for a section type"""
        builders = {
            SectionType.COVER: self._build_cover_section,
            SectionType.SUMMARY: self._build_summary_section,
            SectionType.DETAILS: self._build_details_section,
            SectionType.TOTALS: self._build_totals_section,
            SectionType.TERMS: self._build_terms_section,
            SectionType.SIGNATURE: self._build_signature_section,
            SectionType.CUSTOM_TEXT: self._build_custom_text_section,
        }
        return builders.get(section_type)

    def generate(self) -> bytes:
        """Generate the PDF and return bytes"""
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.8 * inch,
            bottomMargin=0.6 * inch,
            title=f"Cotizacion {self.quote.get('quoteNumber', '')}",
            author=self.tenant.get('name', 'Ventazo CRM'),
            subject="Cotizacion Comercial",
        )

        # Build content from sections
        self.elements = []

        # Sort sections by order, filter enabled only
        sorted_sections = sorted(
            [s for s in self.sections if s.enabled],
            key=lambda x: x.order
        )

        for section in sorted_sections:
            builder = self._get_section_builder(section.type)
            if builder:
                section_elements = builder(section.config)
                self.elements.extend(section_elements)

        # Generate PDF
        doc.build(
            self.elements,
            onFirstPage=self._add_page_background,
            onLaterPages=self._add_page_background
        )

        buffer.seek(0)
        return buffer.getvalue()

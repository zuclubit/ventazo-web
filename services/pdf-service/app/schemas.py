"""
Ventazo PDF Service - Pydantic Schemas
Supports dynamic sections and styling configuration
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class QuoteStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    REVISED = "revised"


class LineItemType(str, Enum):
    PRODUCT = "product"
    SERVICE = "service"
    SUBSCRIPTION = "subscription"
    DISCOUNT = "discount"
    FEE = "fee"


class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class QuoteLineItem(BaseModel):
    """Linea de cotizacion"""
    id: str
    type: LineItemType = LineItemType.SERVICE
    name: str
    description: Optional[str] = None
    quantity: float = 1
    unitPrice: float = 0
    discountType: Optional[DiscountType] = None
    discountValue: Optional[float] = None
    taxRate: Optional[float] = None
    subtotal: float = 0
    total: float = 0
    order: int = 0
    metadata: Optional[Dict[str, Any]] = None


class BillingAddress(BaseModel):
    """Direccion de facturacion"""
    line1: Optional[str] = None
    line2: Optional[str] = None
    street: Optional[str] = None  # Alternative to line1
    city: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None


class QuoteData(BaseModel):
    """Datos de la cotizacion para generar PDF"""
    id: str
    tenantId: str
    quoteNumber: str
    title: str
    description: Optional[str] = None
    status: QuoteStatus = QuoteStatus.DRAFT

    # Related entities
    leadId: Optional[str] = None
    leadName: Optional[str] = None
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    opportunityId: Optional[str] = None
    opportunityName: Optional[str] = None
    contactId: Optional[str] = None
    contactName: Optional[str] = None
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None
    companyName: Optional[str] = None  # Company name for PDF display

    # Billing address
    billingAddress: Optional[BillingAddress] = None

    # Dates
    issueDate: str
    expiryDate: Optional[str] = None
    sentAt: Optional[str] = None
    viewedAt: Optional[str] = None
    acceptedAt: Optional[str] = None
    rejectedAt: Optional[str] = None

    # Financial
    currency: str = "MXN"
    subtotal: float = 0
    discountType: Optional[DiscountType] = None
    discountValue: Optional[float] = None
    discountAmount: float = 0
    taxRate: Optional[float] = 16
    taxAmount: float = 0
    total: float = 0

    # Line items
    items: List[QuoteLineItem] = []

    # Content
    terms: Optional[str] = None
    notes: Optional[str] = None
    internalNotes: Optional[str] = None

    # Ownership
    createdBy: str
    createdByName: Optional[str] = None
    assignedTo: Optional[str] = None
    assignedToName: Optional[str] = None

    # Version
    version: int = 1

    # Metadata
    metadata: Optional[Dict[str, Any]] = None
    createdAt: str
    updatedAt: str


class TenantData(BaseModel):
    """Datos del tenant para branding"""
    id: str
    name: str
    logoUrl: Optional[str] = None
    primaryColor: Optional[str] = None
    secondaryColor: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    taxId: Optional[str] = None  # RFC


# ============================================================================
# Dynamic Section Configuration
# ============================================================================

class SectionType(str, Enum):
    """Available section types for PDF layout"""
    COVER = "cover"
    SUMMARY = "summary"
    DETAILS = "details"
    TOTALS = "totals"
    TERMS = "terms"
    SIGNATURE = "signature"
    CUSTOM_TEXT = "custom_text"


class SectionConfig(BaseModel):
    """Configuration for a PDF section"""
    id: str
    type: SectionType
    enabled: bool = True
    order: int = 0
    config: Dict[str, Any] = Field(default_factory=dict)
    # Config can include:
    # - showLogo, showDate, showQuoteNumber (cover)
    # - columns, showDescription (details)
    # - showSignatureLine, signatureLabel (signature)
    # - title, content (custom_text - markdown supported)


# ============================================================================
# Style Configuration
# ============================================================================

class ColorConfig(BaseModel):
    """Color configuration for PDF styling"""
    primary: str = "#10b981"      # Emerald-500
    secondary: str = "#7c3aed"    # Violet-500
    accent: str = "#14b8a6"       # Teal-500
    background: str = "#0f172a"   # Slate-900
    text: str = "#e5e7eb"         # Gray-200
    muted: Optional[str] = "#9ca3af"
    border: Optional[str] = "#334155"
    tableHeader: Optional[str] = "#1f2937"
    tableRowAlt: Optional[str] = "#111827"


class FontConfig(BaseModel):
    """Font configuration for PDF"""
    heading: str = "Helvetica-Bold"
    body: str = "Helvetica"
    sizes: Dict[str, int] = Field(default_factory=lambda: {
        "title": 36,
        "heading": 20,
        "body": 11,
        "small": 9
    })


class SpacingConfig(BaseModel):
    """Spacing configuration for PDF layout"""
    margins: int = 20  # mm
    padding: int = 15
    lineHeight: float = 1.4
    sectionGap: int = 20


class StyleConfig(BaseModel):
    """Complete style configuration for PDF"""
    theme: str = Field(default="dark", description="'dark' or 'light'")
    colors: Optional[ColorConfig] = None
    fonts: Optional[FontConfig] = None
    spacing: Optional[SpacingConfig] = None


# ============================================================================
# Request/Response Models
# ============================================================================

class GeneratePDFRequest(BaseModel):
    """Request para generar PDF con soporte para configuracion dinamica"""
    quote: QuoteData
    tenant: Optional[TenantData] = None

    # Dynamic template configuration (NEW)
    sections: List[SectionConfig] = Field(
        default_factory=list,
        description="Section configuration. If empty, uses default sections."
    )
    styles: Optional[StyleConfig] = Field(
        default=None,
        description="Style configuration. If null, uses theme defaults."
    )

    # Legacy flags (backward compatible, use sections instead)
    theme: str = Field(default="dark", description="Theme: 'dark' or 'light'")
    includeTerms: bool = Field(default=True, description="Include terms section (legacy)")
    includeSignature: bool = Field(default=True, description="Include signature section (legacy)")

    # Preview mode
    previewMode: bool = Field(default=False, description="Generate thumbnail preview")


class GeneratePDFResponse(BaseModel):
    """Response de generacion de PDF"""
    success: bool
    filename: str
    contentType: str = "application/pdf"
    size: int
    message: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = "healthy"
    service: str = "pdf-service"
    version: str = "2.0.0"


# ============================================================================
# Default Section Configurations
# ============================================================================

def get_default_sections() -> List[SectionConfig]:
    """Returns default section configuration"""
    return [
        SectionConfig(
            id="cover",
            type=SectionType.COVER,
            enabled=True,
            order=0,
            config={
                "showLogo": True,
                "showDate": True,
                "showQuoteNumber": True,
                "showClientAddress": True
            }
        ),
        SectionConfig(
            id="summary",
            type=SectionType.SUMMARY,
            enabled=True,
            order=1,
            config={}
        ),
        SectionConfig(
            id="details",
            type=SectionType.DETAILS,
            enabled=True,
            order=2,
            config={
                "columns": 4,
                "showDescription": True,
                "showQuantity": True,
                "showUnitPrice": True,
                "showTotal": True
            }
        ),
        SectionConfig(
            id="totals",
            type=SectionType.TOTALS,
            enabled=True,
            order=3,
            config={
                "showSubtotal": True,
                "showTax": True,
                "showDiscount": True
            }
        ),
        SectionConfig(
            id="terms",
            type=SectionType.TERMS,
            enabled=True,
            order=4,
            config={
                "termsTitle": "Terminos y Condiciones"
            }
        ),
        SectionConfig(
            id="signature",
            type=SectionType.SIGNATURE,
            enabled=True,
            order=5,
            config={
                "showSignatureLine": True,
                "showDateLine": True,
                "signatureLabel": "Firma Autorizada"
            }
        ),
    ]


def get_dark_style_config() -> StyleConfig:
    """Returns default dark theme style configuration"""
    return StyleConfig(
        theme="dark",
        colors=ColorConfig(
            primary="#10b981",
            secondary="#7c3aed",
            accent="#14b8a6",
            background="#0f172a",
            text="#e5e7eb",
            muted="#9ca3af",
            border="#334155",
            tableHeader="#1f2937",
            tableRowAlt="#111827"
        ),
        fonts=FontConfig(),
        spacing=SpacingConfig()
    )


def get_light_style_config() -> StyleConfig:
    """Returns default light theme style configuration"""
    return StyleConfig(
        theme="light",
        colors=ColorConfig(
            primary="#059669",
            secondary="#7c3aed",
            accent="#0d9488",
            background="#ffffff",
            text="#1f2937",
            muted="#6b7280",
            border="#e5e7eb",
            tableHeader="#f3f4f6",
            tableRowAlt="#f9fafb"
        ),
        fonts=FontConfig(),
        spacing=SpacingConfig()
    )

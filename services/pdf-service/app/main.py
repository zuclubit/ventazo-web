"""
Ventazo PDF Microservice
FastAPI application for generating professional PDF documents
"""

import os
import io
import tempfile
from typing import Optional
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .schemas import (
    GeneratePDFRequest,
    GeneratePDFResponse,
    HealthResponse,
    QuoteData,
    TenantData,
)
from .quote_generator import QuotePDFGenerator

# ============================================
# App Configuration
# ============================================

app = FastAPI(
    title="Ventazo PDF Service",
    description="Microservicio para generación de PDFs profesionales",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Health Check
# ============================================

@app.get("/health", response_model=HealthResponse)
@app.get("/healthz", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="pdf-service",
        version="1.0.0"
    )


# ============================================
# PDF Generation Endpoints
# ============================================

@app.post("/api/v1/quotes/pdf", response_class=Response)
async def generate_quote_pdf(request: GeneratePDFRequest):
    """
    Genera un PDF de cotización profesional.

    Retorna el PDF como stream binario.
    """
    try:
        # Descargar logo si existe URL
        logo_path = None
        if request.tenant and request.tenant.logoUrl:
            logo_path = await download_logo(request.tenant.logoUrl)

        # Generar PDF con configuración dinámica
        generator = QuotePDFGenerator(
            quote_data=request.quote.model_dump(),
            tenant_data=request.tenant.model_dump() if request.tenant else None,
            logo_path=logo_path,
            theme=request.styles.theme if request.styles else request.theme,
            sections=request.sections if request.sections else None,
            style_config=request.styles if request.styles else None
        )

        pdf_bytes = generator.generate()

        # Limpiar logo temporal
        if logo_path and os.path.exists(logo_path):
            try:
                os.remove(logo_path)
            except:
                pass

        # Nombre del archivo
        filename = f"{request.quote.quoteNumber}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@app.post("/api/v1/quotes/pdf/preview")
async def preview_quote_pdf(request: GeneratePDFRequest):
    """
    Genera un PDF de cotización y retorna como base64 para preview.
    """
    import base64

    try:
        # Descargar logo si existe URL
        logo_path = None
        if request.tenant and request.tenant.logoUrl:
            logo_path = await download_logo(request.tenant.logoUrl)

        # Generar PDF con configuración dinámica
        generator = QuotePDFGenerator(
            quote_data=request.quote.model_dump(),
            tenant_data=request.tenant.model_dump() if request.tenant else None,
            logo_path=logo_path,
            theme=request.styles.theme if request.styles else request.theme,
            sections=request.sections if request.sections else None,
            style_config=request.styles if request.styles else None
        )

        pdf_bytes = generator.generate()

        # Limpiar logo temporal
        if logo_path and os.path.exists(logo_path):
            try:
                os.remove(logo_path)
            except:
                pass

        # Convertir a base64
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

        return {
            "success": True,
            "filename": f"{request.quote.quoteNumber}.pdf",
            "contentType": "application/pdf",
            "size": len(pdf_bytes),
            "data": pdf_base64,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@app.post("/api/v1/quotes/{quote_id}/pdf", response_class=Response)
async def generate_quote_pdf_by_id(
    quote_id: str,
    tenant_id: Optional[str] = None,
):
    """
    Genera PDF para una cotización por ID.

    Nota: Este endpoint requiere que el lead-service envíe los datos
    de la cotización. En producción, esto debería obtener los datos
    de la base de datos o de otro servicio.
    """
    # Este endpoint es para compatibilidad - el lead-service
    # debería usar el endpoint POST con los datos completos
    raise HTTPException(
        status_code=400,
        detail="Use POST /api/v1/quotes/pdf with full quote data"
    )


# ============================================
# Utility Functions
# ============================================

async def download_logo(url: str) -> Optional[str]:
    """Descarga el logo y guarda en archivo temporal"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                # Determinar extensión
                content_type = response.headers.get('content-type', '')
                if 'png' in content_type:
                    ext = '.png'
                elif 'jpeg' in content_type or 'jpg' in content_type:
                    ext = '.jpg'
                elif 'svg' in content_type:
                    ext = '.svg'
                else:
                    ext = '.png'

                # Guardar en temporal
                fd, path = tempfile.mkstemp(suffix=ext)
                with os.fdopen(fd, 'wb') as f:
                    f.write(response.content)
                return path
    except Exception as e:
        print(f"Error downloading logo: {e}")
    return None


# ============================================
# Startup/Shutdown Events
# ============================================

@app.on_event("startup")
async def startup_event():
    """Startup tasks"""
    print("=" * 50)
    print("Ventazo PDF Service v1.0.0")
    print("=" * 50)
    print("Service ready to generate professional PDFs")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup tasks"""
    print("Shutting down PDF service...")


# ============================================
# Run with uvicorn
# ============================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8080))
    host = os.environ.get("HOST", "0.0.0.0")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=os.environ.get("ENV", "development") == "development"
    )

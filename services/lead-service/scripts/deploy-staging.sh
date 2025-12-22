#!/bin/bash
# =============================================================================
# Deploy Lead Service to Cloud Run (Staging)
# =============================================================================
#
# USO:
#   ./scripts/deploy-staging.sh              # Deploy normal
#   ./scripts/deploy-staging.sh --setup      # Primera vez (configura todo)
#   ./scripts/deploy-staging.sh --stop       # Apagar servicio (scale to 0)
#   ./scripts/deploy-staging.sh --start      # Encender servicio
#   ./scripts/deploy-staging.sh --status     # Ver estado
#   ./scripts/deploy-staging.sh --logs       # Ver logs
#   ./scripts/deploy-staging.sh --delete     # Eliminar todo
#
# =============================================================================

set -e

# Configuración
PROJECT_ID="${GCP_PROJECT_ID:-zuclubit-crm-staging}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="lead-service"
REPOSITORY="zuclubit-crm"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar gcloud instalado
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI no está instalado"
        echo "Instalar desde: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
}

# Configuración inicial (primera vez)
setup() {
    log_info "Configurando proyecto GCP para staging..."

    # Verificar autenticación
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 > /dev/null 2>&1; then
        log_warning "No estás autenticado. Ejecutando gcloud auth login..."
        gcloud auth login
    fi

    # Crear proyecto si no existe
    if ! gcloud projects describe $PROJECT_ID > /dev/null 2>&1; then
        log_info "Creando proyecto $PROJECT_ID..."
        gcloud projects create $PROJECT_ID --name="Zuclubit CRM Staging"
    fi

    # Configurar proyecto actual
    gcloud config set project $PROJECT_ID

    # Habilitar APIs necesarias
    log_info "Habilitando APIs necesarias..."
    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        artifactregistry.googleapis.com \
        secretmanager.googleapis.com

    # Crear repositorio de Artifact Registry
    if ! gcloud artifacts repositories describe $REPOSITORY --location=$REGION > /dev/null 2>&1; then
        log_info "Creando Artifact Registry..."
        gcloud artifacts repositories create $REPOSITORY \
            --repository-format=docker \
            --location=$REGION \
            --description="Zuclubit CRM Docker images"
    fi

    # Configurar permisos para Cloud Build
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
    log_info "Configurando permisos de Cloud Build..."

    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
        --role="roles/run.admin" --quiet

    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
        --role="roles/iam.serviceAccountUser" --quiet

    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" --quiet

    log_success "Setup completado!"
    echo ""
    echo "SIGUIENTE PASO:"
    echo "1. Crea un proyecto en Supabase Cloud (gratis): https://supabase.com"
    echo "2. Copia las credenciales a un archivo .env.staging"
    echo "3. Ejecuta: ./scripts/deploy-staging.sh --secrets"
    echo "4. Ejecuta: ./scripts/deploy-staging.sh"
}

# Subir secretos a Secret Manager
upload_secrets() {
    log_info "Subiendo secretos a Secret Manager..."

    if [ ! -f ".env.staging" ]; then
        log_error "Archivo .env.staging no encontrado"
        echo "Crea el archivo basándote en .env.staging.example"
        exit 1
    fi

    # Crear o actualizar secretos individuales
    while IFS='=' read -r key value; do
        # Ignorar comentarios y líneas vacías
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z $key ]] && continue

        # Limpiar espacios
        key=$(echo $key | xargs)
        value=$(echo $value | xargs)

        if [ ! -z "$key" ] && [ ! -z "$value" ]; then
            secret_name="lead-service-${key,,}"  # lowercase
            secret_name=$(echo $secret_name | tr '_' '-')

            # Crear secreto si no existe
            if ! gcloud secrets describe $secret_name > /dev/null 2>&1; then
                echo -n "$value" | gcloud secrets create $secret_name --data-file=-
                log_info "Secreto creado: $secret_name"
            else
                echo -n "$value" | gcloud secrets versions add $secret_name --data-file=-
                log_info "Secreto actualizado: $secret_name"
            fi
        fi
    done < .env.staging

    log_success "Secretos subidos correctamente"
}

# Deploy
deploy() {
    log_info "Desplegando $SERVICE_NAME a Cloud Run..."

    cd "$(dirname "$0")/.."

    # Build y deploy usando Cloud Build
    gcloud builds submit --config=cloudbuild.yaml \
        --substitutions=_SERVICE_NAME=$SERVICE_NAME,_REGION=$REGION,_REPOSITORY=$REPOSITORY

    # Obtener URL del servicio
    URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

    log_success "Deploy completado!"
    echo ""
    echo "=========================================="
    echo -e "URL del servicio: ${GREEN}$URL${NC}"
    echo -e "Health check: ${GREEN}$URL/health${NC}"
    echo -e "API Docs: ${GREEN}$URL/docs${NC}"
    echo "=========================================="
}

# Apagar servicio (scale to 0)
stop_service() {
    log_info "Apagando servicio (scale to 0)..."

    gcloud run services update $SERVICE_NAME \
        --region=$REGION \
        --min-instances=0 \
        --max-instances=0

    log_success "Servicio apagado. No se generarán costos."
}

# Encender servicio
start_service() {
    log_info "Encendiendo servicio..."

    gcloud run services update $SERVICE_NAME \
        --region=$REGION \
        --min-instances=0 \
        --max-instances=3

    URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
    log_success "Servicio encendido: $URL"
}

# Ver estado
status() {
    log_info "Estado del servicio:"
    echo ""

    gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --format='table(status.url, status.conditions[0].status, spec.template.spec.containerConcurrency, spec.template.metadata.annotations."autoscaling.knative.dev/minScale", spec.template.metadata.annotations."autoscaling.knative.dev/maxScale")'

    echo ""
    log_info "Revisiones activas:"
    gcloud run revisions list --service=$SERVICE_NAME --region=$REGION --limit=5
}

# Ver logs
logs() {
    log_info "Últimos logs del servicio:"
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
        --limit=50 \
        --format='table(timestamp, severity, textPayload)'
}

# Eliminar todo
delete_all() {
    log_warning "¿Estás seguro de eliminar el servicio $SERVICE_NAME? (y/N)"
    read -r response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "Eliminando servicio..."
        gcloud run services delete $SERVICE_NAME --region=$REGION --quiet
        log_success "Servicio eliminado"
    else
        log_info "Operación cancelada"
    fi
}

# Main
check_gcloud

case "${1:-}" in
    --setup)
        setup
        ;;
    --secrets)
        upload_secrets
        ;;
    --stop)
        stop_service
        ;;
    --start)
        start_service
        ;;
    --status)
        status
        ;;
    --logs)
        logs
        ;;
    --delete)
        delete_all
        ;;
    --help|-h)
        echo "Uso: $0 [opción]"
        echo ""
        echo "Opciones:"
        echo "  (sin opción)  Deploy normal"
        echo "  --setup       Configuración inicial (primera vez)"
        echo "  --secrets     Subir secretos a Secret Manager"
        echo "  --stop        Apagar servicio (scale to 0)"
        echo "  --start       Encender servicio"
        echo "  --status      Ver estado del servicio"
        echo "  --logs        Ver logs recientes"
        echo "  --delete      Eliminar servicio"
        echo "  --help        Mostrar esta ayuda"
        ;;
    *)
        deploy
        ;;
esac

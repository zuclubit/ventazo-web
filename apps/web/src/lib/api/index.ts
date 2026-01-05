// ============================================
// API Module Exports - FASE 2
// ============================================

// API Client
export {
  apiClient,
  createApiClient,
  queryKeys,
  ApiError,
  NetworkError,
  ValidationError,
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,
  registerTenantGetter,
  API_BASE_URL,
  type RequestConfig,
  type ApiResponse,
  type PaginatedResponse,
  type ApiClientInstance,
} from './api-client';

// Query Hooks
export {
  useApiClient,
  useApiQuery,
  useApiMutation,
  useApiPost,
  useApiPut,
  useApiPatch,
  useApiDelete,
  useOptimisticMutation,
  usePaginatedQuery,
  useInfiniteApiQuery,
} from './hooks/use-api-query';

// Error Handling Hooks
export {
  useErrorHandler,
  useQueryErrorHandler,
  useMutationHandler,
  useFormErrorHandler,
  getErrorMessage,
  isApiError,
  isNetworkError,
  isAuthError,
  isNotFoundError,
  isValidationError,
  isServerError,
  DEFAULT_MESSAGES,
  type ErrorMessages,
  type UseErrorHandlerOptions,
} from './hooks/use-error-handler';

// File Upload Hooks
export {
  useFileUpload,
  useMultipleFileUpload,
  useImageUpload,
  useDocumentUpload,
  validateFile,
  uploadFile,
  DEFAULT_MAX_SIZE,
  DEFAULT_IMAGE_TYPES,
  DEFAULT_DOCUMENT_TYPES,
  type FileUploadOptions,
  type UploadProgress,
  type FileUploadResult,
  type UseFileUploadOptions,
} from './hooks/use-file-upload';

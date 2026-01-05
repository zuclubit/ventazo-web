/**
 * @fileoverview TokenDisplay - Primitive Component
 *
 * Componente primitivo para visualizar design tokens.
 * Útil para documentación y debugging del sistema de diseño.
 *
 * @module ui-kit/components/primitives/TokenDisplay
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import type { DesignToken, TokenCollection } from '../../domain/tokens';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props del componente TokenDisplay.
 */
export interface TokenDisplayProps {
  /** Token individual a mostrar */
  token?: DesignToken;
  /** Colección de tokens a mostrar */
  collection?: TokenCollection;
  /** Filtro por tipo de token */
  filterType?: 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'duration' | 'cubicBezier' | 'number' | 'string';
  /** Si mostrar metadatos */
  showMetadata?: boolean;
  /** Si mostrar el path completo */
  showPath?: boolean;
  /** Formato de visualización */
  format?: 'list' | 'grid' | 'table';
  /** Tamaño del texto */
  textSize?: 'sm' | 'md' | 'lg';
  /** Clase CSS adicional */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TokenDisplay - Visualiza tokens del sistema de diseño.
 *
 * @example
 * ```tsx
 * import { TokenDisplay } from '@zuclubit/ui-kit/components';
 *
 * function DesignSystemDocs() {
 *   return (
 *     <div>
 *       <h2>Color Tokens</h2>
 *       <TokenDisplay
 *         collection={colorTokens}
 *         filterType="color"
 *         format="grid"
 *         showMetadata
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function TokenDisplay({
  token,
  collection,
  filterType,
  showMetadata = false,
  showPath = true,
  format = 'list',
  textSize = 'md',
  className = '',
}: TokenDisplayProps): React.ReactElement {
  // Obtiene los tokens a mostrar
  const tokens = useMemo(() => {
    if (token) {
      return [token];
    }

    if (collection) {
      let allTokens = collection.getAll();

      if (filterType) {
        allTokens = allTokens.filter((t) => {
          // Accede a las propiedades del token de forma segura
          const tokenData = t as unknown as { type?: string };
          return tokenData.type === filterType;
        });
      }

      return allTokens;
    }

    return [];
  }, [token, collection, filterType]);

  // Font size map
  const fontSizeMap = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const fontSize = fontSizeMap[textSize];

  // Render según formato
  if (format === 'grid') {
    return (
      <div
        className={`token-display token-display--grid ${className}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {tokens.map((t, index) => (
          <TokenCard
            key={index}
            token={t}
            showMetadata={showMetadata}
            showPath={showPath}
            fontSize={fontSize}
          />
        ))}
      </div>
    );
  }

  if (format === 'table') {
    return (
      <div className={`token-display token-display--table ${className}`}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize,
          }}
        >
          <thead>
            <tr>
              {showPath && <th style={tableHeaderStyle}>Path</th>}
              <th style={tableHeaderStyle}>Value</th>
              <th style={tableHeaderStyle}>Type</th>
              {showMetadata && <th style={tableHeaderStyle}>Description</th>}
            </tr>
          </thead>
          <tbody>
            {tokens.map((t, index) => (
              <TokenTableRow
                key={index}
                token={t}
                showMetadata={showMetadata}
                showPath={showPath}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Default: list format
  return (
    <div
      className={`token-display token-display--list ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {tokens.map((t, index) => (
        <TokenListItem
          key={index}
          token={t}
          showMetadata={showMetadata}
          showPath={showPath}
          fontSize={fontSize}
        />
      ))}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '2px solid currentColor',
  opacity: 0.9,
};

interface TokenSubComponentProps {
  token: DesignToken;
  showMetadata: boolean;
  showPath: boolean;
  fontSize?: number;
}

function getTokenData(token: DesignToken): {
  path: string;
  value: unknown;
  type: string;
  description?: string;
} {
  const data = token as unknown as {
    path: string;
    value: unknown;
    type?: string;
    description?: string;
  };

  return {
    path: data.path ?? token.path,
    value: data.value,
    type: data.type ?? 'unknown',
    description: data.description,
  };
}

function TokenCard({ token, showMetadata, showPath, fontSize }: TokenSubComponentProps) {
  const data = getTokenData(token);
  const isColor = data.type === 'color' || typeof data.value === 'string' &&
    (String(data.value).startsWith('#') || String(data.value).startsWith('rgb') || String(data.value).startsWith('oklch'));

  return (
    <div
      style={{
        border: '1px solid currentColor',
        borderRadius: 8,
        padding: 12,
        opacity: 0.9,
      }}
    >
      {isColor && (
        <div
          style={{
            width: '100%',
            height: 48,
            backgroundColor: String(data.value),
            borderRadius: 4,
            marginBottom: 8,
          }}
        />
      )}

      {showPath && (
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: fontSize ? fontSize - 2 : 12,
            opacity: 0.7,
            marginBottom: 4,
          }}
        >
          {data.path}
        </div>
      )}

      <div
        style={{
          fontFamily: 'monospace',
          fontSize,
          fontWeight: 600,
        }}
      >
        {formatValue(data.value)}
      </div>

      <div
        style={{
          fontSize: fontSize ? fontSize - 2 : 12,
          opacity: 0.6,
          marginTop: 4,
        }}
      >
        {data.type}
      </div>

      {showMetadata && data.description && (
        <div
          style={{
            fontSize: fontSize ? fontSize - 2 : 12,
            opacity: 0.8,
            marginTop: 8,
            fontStyle: 'italic',
          }}
        >
          {data.description}
        </div>
      )}
    </div>
  );
}

function TokenListItem({ token, showMetadata, showPath, fontSize }: TokenSubComponentProps) {
  const data = getTokenData(token);
  const isColor = data.type === 'color' || typeof data.value === 'string' &&
    (String(data.value).startsWith('#') || String(data.value).startsWith('rgb'));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
        borderBottom: '1px solid currentColor',
        opacity: 0.9,
      }}
    >
      {isColor && (
        <div
          style={{
            width: 24,
            height: 24,
            backgroundColor: String(data.value),
            borderRadius: 4,
            flexShrink: 0,
          }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {showPath && (
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: fontSize ? fontSize - 2 : 12,
              opacity: 0.7,
            }}
          >
            {data.path}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize,
              fontWeight: 600,
            }}
          >
            {formatValue(data.value)}
          </span>

          <span
            style={{
              fontSize: fontSize ? fontSize - 2 : 12,
              opacity: 0.6,
            }}
          >
            ({data.type})
          </span>
        </div>

        {showMetadata && data.description && (
          <div
            style={{
              fontSize: fontSize ? fontSize - 2 : 12,
              opacity: 0.8,
              fontStyle: 'italic',
            }}
          >
            {data.description}
          </div>
        )}
      </div>
    </div>
  );
}

function TokenTableRow({ token, showMetadata, showPath }: Omit<TokenSubComponentProps, 'fontSize'>) {
  const data = getTokenData(token);
  const isColor = data.type === 'color' || typeof data.value === 'string' &&
    (String(data.value).startsWith('#') || String(data.value).startsWith('rgb'));

  const cellStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid currentColor',
    opacity: 0.8,
  };

  return (
    <tr>
      {showPath && (
        <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{data.path}</td>
      )}
      <td style={cellStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isColor && (
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: String(data.value),
                borderRadius: 2,
              }}
            />
          )}
          <code>{formatValue(data.value)}</code>
        </div>
      </td>
      <td style={cellStyle}>{data.type}</td>
      {showMetadata && <td style={cellStyle}>{data.description ?? '-'}</td>}
    </tr>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TokenDisplay;

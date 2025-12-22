/**
 * Gmail Provider
 * Handles Gmail API integration for email sync
 */

import {
  EmailProvider,
  EmailMessage,
  EmailAddress,
  EmailAttachment,
  OAuthTokens,
  GmailMessageResponse,
  GmailMessagePart,
  SendEmailInput,
} from './types';

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Gmail Provider for email synchronization
 */
export class GmailProvider {
  readonly provider: EmailProvider = 'google';
  private config: GmailConfig | undefined;
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1';
  private authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private tokenUrl = 'https://oauth2.googleapis.com/token';

  constructor(config?: GmailConfig) {
    this.config = config || this.getConfigFromEnv();
  }

  /**
   * Get config from environment
   */
  private getConfigFromEnv(): GmailConfig | undefined {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return undefined;
    }

    return { clientId, clientSecret, redirectUri };
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return !!this.config;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state: string): string {
    if (!this.config) {
      throw new Error('Gmail not configured');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange auth code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    if (!this.config) {
      throw new Error('Gmail not configured');
    }

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        code,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    if (!this.config) {
      throw new Error('Gmail not configured');
    }

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json() as {
      access_token: string;
      expires_in: number;
      token_type: string;
    };

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  /**
   * Get user profile
   */
  async getUserProfile(accessToken: string): Promise<{ email: string; name?: string }> {
    const response = await fetch(`${this.baseUrl}/users/me/profile`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }

    const data = await response.json() as { emailAddress: string };
    return { email: data.emailAddress };
  }

  /**
   * List messages
   */
  async listMessages(
    accessToken: string,
    options: {
      query?: string;
      labelIds?: string[];
      maxResults?: number;
      pageToken?: string;
    } = {}
  ): Promise<{
    messages: Array<{ id: string; threadId: string }>;
    nextPageToken?: string;
  }> {
    const params = new URLSearchParams();

    if (options.query) params.set('q', options.query);
    if (options.labelIds) params.set('labelIds', options.labelIds.join(','));
    if (options.maxResults) params.set('maxResults', String(options.maxResults));
    if (options.pageToken) params.set('pageToken', options.pageToken);

    const response = await fetch(
      `${this.baseUrl}/users/me/messages?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list messages');
    }

    return response.json() as Promise<{
      messages: Array<{ id: string; threadId: string }>;
      nextPageToken?: string;
    }>;
  }

  /**
   * Get message details
   */
  async getMessage(
    accessToken: string,
    messageId: string,
    format: 'full' | 'metadata' | 'minimal' | 'raw' = 'full'
  ): Promise<GmailMessageResponse> {
    const response = await fetch(
      `${this.baseUrl}/users/me/messages/${messageId}?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get message');
    }

    return response.json() as Promise<GmailMessageResponse>;
  }

  /**
   * Send email
   */
  async sendEmail(
    accessToken: string,
    input: SendEmailInput
  ): Promise<{ id: string; threadId: string }> {
    const raw = this.buildRawMessage(input);

    const response = await fetch(`${this.baseUrl}/users/me/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw,
        threadId: input.threadId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    return response.json() as Promise<{ id: string; threadId: string }>;
  }

  /**
   * Modify message labels
   */
  async modifyLabels(
    accessToken: string,
    messageId: string,
    addLabels: string[],
    removeLabels: string[]
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: addLabels,
          removeLabelIds: removeLabels,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to modify labels');
    }
  }

  /**
   * Get attachment
   */
  async getAttachment(
    accessToken: string,
    messageId: string,
    attachmentId: string
  ): Promise<{ data: string; size: number }> {
    const response = await fetch(
      `${this.baseUrl}/users/me/messages/${messageId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get attachment');
    }

    return response.json() as Promise<{ data: string; size: number }>;
  }

  /**
   * Watch for changes (push notifications)
   */
  async watch(
    accessToken: string,
    topicName: string,
    labelIds: string[] = ['INBOX']
  ): Promise<{ historyId: string; expiration: string }> {
    const response = await fetch(`${this.baseUrl}/users/me/watch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicName,
        labelIds,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to watch inbox');
    }

    return response.json() as Promise<{ historyId: string; expiration: string }>;
  }

  /**
   * Stop watching
   */
  async stopWatch(accessToken: string): Promise<void> {
    await fetch(`${this.baseUrl}/users/me/stop`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Get history (changes since historyId)
   */
  async getHistory(
    accessToken: string,
    startHistoryId: string,
    labelId?: string
  ): Promise<{
    history?: Array<{
      id: string;
      messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
      messagesDeleted?: Array<{ message: { id: string } }>;
      labelsAdded?: Array<{ message: { id: string }; labelIds: string[] }>;
      labelsRemoved?: Array<{ message: { id: string }; labelIds: string[] }>;
    }>;
    historyId: string;
    nextPageToken?: string;
  }> {
    const params = new URLSearchParams({
      startHistoryId,
      ...(labelId && { labelId }),
    });

    const response = await fetch(
      `${this.baseUrl}/users/me/history?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get history');
    }

    return response.json() as Promise<{
      history?: Array<{
        id: string;
        messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
        messagesDeleted?: Array<{ message: { id: string } }>;
        labelsAdded?: Array<{ message: { id: string }; labelIds: string[] }>;
        labelsRemoved?: Array<{ message: { id: string }; labelIds: string[] }>;
      }>;
      historyId: string;
      nextPageToken?: string;
    }>;
  }

  /**
   * Parse Gmail message to EmailMessage
   */
  parseMessage(
    gmailMessage: GmailMessageResponse,
    accountId: string,
    tenantId: string
  ): Partial<EmailMessage> {
    const headers = gmailMessage.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

    const from = this.parseEmailAddress(getHeader('From') || '');
    const to = this.parseEmailAddressList(getHeader('To') || '');
    const cc = this.parseEmailAddressList(getHeader('Cc') || '');
    const bcc = this.parseEmailAddressList(getHeader('Bcc') || '');

    // Extract body
    const { text, html } = this.extractBody(gmailMessage.payload);

    // Extract attachments
    const attachments = this.extractAttachments(gmailMessage.payload);

    return {
      tenantId,
      accountId,
      externalId: gmailMessage.id,
      externalThreadId: gmailMessage.threadId,
      subject: getHeader('Subject') || '(No Subject)',
      snippet: gmailMessage.snippet,
      body: html || text || '',
      bodyHtml: html,
      bodyPlain: text,
      from,
      to,
      cc,
      bcc,
      messageId: getHeader('Message-ID'),
      inReplyTo: getHeader('In-Reply-To'),
      references: getHeader('References')?.split(/\s+/),
      hasAttachments: attachments.length > 0,
      attachments,
      isRead: !gmailMessage.labelIds.includes('UNREAD'),
      isStarred: gmailMessage.labelIds.includes('STARRED'),
      isDraft: gmailMessage.labelIds.includes('DRAFT'),
      isSent: gmailMessage.labelIds.includes('SENT'),
      labels: gmailMessage.labelIds,
      folder: this.getPrimaryFolder(gmailMessage.labelIds),
      receivedAt: new Date(parseInt(gmailMessage.internalDate, 10)),
    };
  }

  /**
   * Extract body from message parts
   */
  private extractBody(payload: GmailMessageResponse['payload']): {
    text: string;
    html: string;
  } {
    let text = '';
    let html = '';

    const extractFromPart = (part: GmailMessagePart) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text = this.decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = this.decodeBase64Url(part.body.data);
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          extractFromPart(subPart);
        }
      }
    };

    if (payload.body?.data) {
      if (payload.mimeType === 'text/plain') {
        text = this.decodeBase64Url(payload.body.data);
      } else if (payload.mimeType === 'text/html') {
        html = this.decodeBase64Url(payload.body.data);
      }
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        extractFromPart(part);
      }
    }

    return { text, html };
  }

  /**
   * Extract attachments from message
   */
  private extractAttachments(payload: GmailMessageResponse['payload']): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    const extractFromPart = (part: GmailMessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          fileName: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          contentId: part.headers.find(h => h.name.toLowerCase() === 'content-id')?.value,
          isInline: part.headers.some(
            h => h.name.toLowerCase() === 'content-disposition' && h.value.includes('inline')
          ),
        });
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          extractFromPart(subPart);
        }
      }
    };

    if (payload.parts) {
      for (const part of payload.parts) {
        extractFromPart(part);
      }
    }

    return attachments;
  }

  /**
   * Parse email address string
   */
  private parseEmailAddress(str: string): EmailAddress {
    const match = str.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);
    if (match) {
      return {
        name: match[1]?.trim(),
        email: match[2].trim().toLowerCase(),
      };
    }
    return { email: str.trim().toLowerCase() };
  }

  /**
   * Parse email address list
   */
  private parseEmailAddressList(str: string): EmailAddress[] {
    if (!str) return [];
    return str.split(',').map((s) => this.parseEmailAddress(s.trim()));
  }

  /**
   * Get primary folder from labels
   */
  private getPrimaryFolder(labels: string[]): string {
    const folderLabels = ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH'];
    return labels.find((l) => folderLabels.includes(l)) || 'INBOX';
  }

  /**
   * Build raw email message
   */
  private buildRawMessage(input: SendEmailInput): string {
    const boundary = `boundary_${Date.now()}`;
    const lines: string[] = [];

    // Headers
    lines.push(`To: ${input.to.map(a => this.formatEmailAddress(a)).join(', ')}`);
    if (input.cc?.length) {
      lines.push(`Cc: ${input.cc.map(a => this.formatEmailAddress(a)).join(', ')}`);
    }
    lines.push(`Subject: ${input.subject}`);
    lines.push(`MIME-Version: 1.0`);

    if (input.attachments?.length) {
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push('');
      lines.push(`--${boundary}`);
    }

    if (input.bodyHtml) {
      lines.push('Content-Type: text/html; charset=utf-8');
      lines.push('');
      lines.push(input.bodyHtml);
    } else {
      lines.push('Content-Type: text/plain; charset=utf-8');
      lines.push('');
      lines.push(input.body);
    }

    // Attachments
    if (input.attachments?.length) {
      for (const attachment of input.attachments) {
        lines.push(`--${boundary}`);
        lines.push(`Content-Type: ${attachment.mimeType}; name="${attachment.fileName}"`);
        lines.push('Content-Transfer-Encoding: base64');
        lines.push(`Content-Disposition: attachment; filename="${attachment.fileName}"`);
        lines.push('');
        const content = typeof attachment.content === 'string'
          ? attachment.content
          : attachment.content.toString('base64');
        lines.push(content);
      }
      lines.push(`--${boundary}--`);
    }

    const message = lines.join('\r\n');
    return this.encodeBase64Url(message);
  }

  /**
   * Format email address for header
   */
  private formatEmailAddress(addr: EmailAddress): string {
    return addr.name ? `"${addr.name}" <${addr.email}>` : addr.email;
  }

  /**
   * Decode base64url
   */
  private decodeBase64Url(str: string): string {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * Encode to base64url
   */
  private encodeBase64Url(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

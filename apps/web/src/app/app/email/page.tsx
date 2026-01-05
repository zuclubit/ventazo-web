'use client';

/**
 * Email Page
 *
 * Modern email management interface with Gmail/Outlook sync.
 *
 * v2.0 - Redesigned with modern components:
 * - Icon sidebar for minimal navigation
 * - Global search header with Ask AI
 * - Grouped email list with category badges
 * - Enhanced email detail view
 *
 * Features:
 * - Email list with search and filters
 * - Email detail view with thread support
 * - Rich text composer
 * - Account connection (Gmail/Outlook) with proper OAuth flow
 * - Dynamic theming based on tenant branding
 */

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Settings } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { PageContainer } from '@/components/layout/page-container';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

import {
  // Legacy components (for mobile)
  EmailSidebar,
  EmailList,
  // Modern components (v2)
  EmailIconSidebar,
  EmailHeader,
  EmailTableList,
  // Split View components (v2.1)
  EmailReadingPane,
  EmailListCompact,
  // Floating Dock (v2.3 - Apple Liquid Glass centered navigation)
  EmailFloatingDock,
  // Shared components
  EmailDetail,
  EmailComposer,
  ConnectEmailCard,
  EmailEmptyState,
} from './components';
import type { Email as EmailType } from '@/lib/emails';
import { useEmailTheme } from './hooks';
import {
  useEmails,
  useEmailStats,
  useEmailAccounts,
  useGetEmailAuthUrl,
  useConnectEmailAccount,
  useDisconnectEmailAccount,
  useSyncEmailAccount,
  useSendEmail,
  useMarkAsRead,
  useToggleStar,
} from '@/lib/emails';
import type { Email, EmailFolder, EmailProvider, ComposeEmailData } from '@/lib/emails';

// ============================================
// Component
// ============================================

export default function EmailPage() {
  // Apply dynamic theming
  useEmailTheme();

  // Routing
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // Auth - Get user info for icon sidebar (must be at top level, not after conditional return)
  const { user } = useAuthStore();
  const userName = user?.fullName || user?.email?.split('@')[0] || 'Usuario';

  // State
  const [currentFolder, setCurrentFolder] = React.useState<EmailFolder>('inbox');
  const [selectedEmail, setSelectedEmail] = React.useState<Email | null>(null);
  const [isComposerOpen, setIsComposerOpen] = React.useState(false);
  const [composerMode, setComposerMode] = React.useState<'new' | 'reply' | 'replyAll' | 'forward'>('new');
  const [showConnectSheet, setShowConnectSheet] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isConnecting, setIsConnecting] = React.useState(false);

  // Ref to prevent multiple OAuth code processing attempts
  const oauthProcessedRef = React.useRef<string | null>(null);

  // Responsive
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showEmailDetail, setShowEmailDetail] = React.useState(false);

  // Data fetching
  const { data: emailsData, isLoading: isLoadingEmails, refetch: refetchEmails } = useEmails({
    folder: currentFolder,
    search: searchQuery || undefined,
  });
  const { data: stats } = useEmailStats();
  const { data: accountsData, isLoading: isLoadingAccounts, refetch: refetchAccounts } = useEmailAccounts();

  // Extract arrays from data
  const emails = emailsData?.emails ?? [];
  const accounts = accountsData?.accounts ?? [];

  // Mutations
  const getAuthUrl = useGetEmailAuthUrl();
  const connectAccount = useConnectEmailAccount();
  const disconnectAccount = useDisconnectEmailAccount();
  const syncAccount = useSyncEmailAccount();
  const sendEmail = useSendEmail();
  const markAsRead = useMarkAsRead();
  const toggleStar = useToggleStar();

  // Handle OAuth callback from URL params
  React.useEffect(() => {
    const oauthCode = searchParams.get('oauth_code');
    const oauthProvider = searchParams.get('oauth_provider');
    const connectError = searchParams.get('connect_error');
    const errorMessage = searchParams.get('error_message');

    // Handle errors
    if (connectError) {
      toast({
        title: 'Error al conectar cuenta',
        description: errorMessage || 'No se pudo conectar la cuenta de correo.',
        variant: 'destructive',
      });
      // Clear URL params
      router.replace('/app/email');
      return;
    }

    // Handle successful OAuth callback
    // IMPORTANT: OAuth codes can only be used ONCE. Check if already processed.
    if (oauthCode && oauthProvider) {
      // Skip if this code was already processed
      if (oauthProcessedRef.current === oauthCode) {
        console.log('[Email OAuth] Code already processed, skipping');
        return;
      }

      // Mark as processed IMMEDIATELY to prevent duplicate attempts
      oauthProcessedRef.current = oauthCode;
      setIsConnecting(true);

      // Clear URL params FIRST to prevent re-triggering on navigation
      router.replace('/app/email');

      // Map provider names
      const providerMap: Record<string, EmailProvider> = {
        google: 'gmail',
        microsoft: 'outlook',
        gmail: 'gmail',
        outlook: 'outlook',
      };
      const provider = providerMap[oauthProvider] || 'gmail';

      // Connect the account with the OAuth code
      connectAccount
        .mutateAsync({
          provider,
          authCode: oauthCode,
        } as Parameters<typeof connectAccount.mutateAsync>[0])
        .then(() => {
          toast({
            title: 'Cuenta conectada',
            description: 'Tu cuenta de correo ha sido conectada exitosamente.',
          });
          refetchAccounts();
          setShowConnectSheet(false);
        })
        .catch((error) => {
          console.error('Failed to connect account:', error);
          toast({
            title: 'Error al conectar',
            description: 'No se pudo completar la conexion. Por favor intenta de nuevo.',
            variant: 'destructive',
          });
          // Reset ref on error so user can try again
          oauthProcessedRef.current = null;
        })
        .finally(() => {
          setIsConnecting(false);
        });
    }
    // Note: We intentionally omit connectAccount from deps to prevent re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, toast, refetchAccounts]);

  // Handlers
  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    // On mobile, show in sheet. On desktop, show in split panel (no modal)
    if (isMobile) {
      setShowEmailDetail(true);
    }
    // Mark as read
    if (!email.isRead) {
      markAsRead.mutateAsync({ emailId: email.id });
    }
  };

  const handleCompose = () => {
    setComposerMode('new');
    setIsComposerOpen(true);
  };

  const handleReply = (email: Email) => {
    setSelectedEmail(email);
    setComposerMode('reply');
    setIsComposerOpen(true);
  };

  const handleReplyAll = (email: Email) => {
    setSelectedEmail(email);
    setComposerMode('replyAll');
    setIsComposerOpen(true);
  };

  const handleForward = (email: Email) => {
    setSelectedEmail(email);
    setComposerMode('forward');
    setIsComposerOpen(true);
  };

  const handleSendEmail = async (data: ComposeEmailData) => {
    // Get the default account to send from
    const defaultAccount = accounts.find((a) => a.isDefault) ?? accounts[0];
    if (!defaultAccount) {
      console.error('No email account available to send from');
      return;
    }

    // Convert ComposeEmailData to SendEmailRequest
    await sendEmail.mutateAsync({
      accountId: defaultAccount.id,
      to: data.to.map((addr) => addr.email),
      cc: data.cc?.map((addr) => addr.email),
      bcc: data.bcc?.map((addr) => addr.email),
      subject: data.subject,
      body: data.body,
      bodyHtml: data.bodyHtml,
      replyToEmailId: data.replyToEmailId,
      forwardEmailId: data.forwardEmailId,
      templateId: data.templateId,
      templateVariables: data.templateVariables,
      relatedEntityType: data.relatedEntity?.type,
      relatedEntityId: data.relatedEntity?.id,
      scheduledAt: data.scheduledAt,
    });
    refetchEmails();
  };

  const handleToggleStar = async (email: Email) => {
    await toggleStar.mutateAsync({ emailId: email.id, starred: !email.isStarred });
  };

  const handleMarkAsRead = async (email: Email) => {
    if (!email.isRead) {
      await markAsRead.mutateAsync({ emailId: email.id });
    }
  };

  const handleConnect = async (provider: EmailProvider) => {
    try {
      setIsConnecting(true);
      // Get the OAuth authorization URL from the backend
      // Map provider to valid OAuth provider type (excludes 'other' which doesn't support OAuth)
      const oauthProvider = provider === 'other' ? 'gmail' : provider;
      const result = await getAuthUrl.mutateAsync(oauthProvider as 'gmail' | 'outlook');

      if (result?.authUrl) {
        // Redirect to the OAuth provider
        window.location.href = result.authUrl;
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el proceso de conexion. Intenta de nuevo.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    await disconnectAccount.mutateAsync(accountId);
  };

  const handleSync = async (accountId: string) => {
    await syncAccount.mutateAsync({ accountId });
    refetchEmails();
  };

  // Show connect UI if no accounts
  const hasAccounts = accounts.length > 0;

  // Mobile: Show detail in sheet
  if (isMobile) {
    return (
      <PageContainer variant="full-bleed" className="h-[calc(100vh-4rem)]">
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-lg font-semibold">Correo</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setShowConnectSheet(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={handleCompose}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!hasAccounts ? (
            <EmailEmptyState
              variant="no-accounts"
              onPrimaryAction={() => setShowConnectSheet(true)}
              className="flex-1"
            />
          ) : (
            <EmailList
              emails={emails}
              selectedEmail={selectedEmail}
              currentFolder={currentFolder}
              onSelectEmail={handleSelectEmail}
              onToggleStar={handleToggleStar}
              onRefresh={() => refetchEmails()}
              onSearch={setSearchQuery}
              isLoading={isLoadingEmails}
              className="flex-1 w-full"
            />
          )}

          {/* Email Detail Sheet */}
          <Sheet open={showEmailDetail} onOpenChange={setShowEmailDetail}>
            <SheetContent side="right" className="w-full sm:max-w-xl p-0">
              <SheetTitle className="sr-only">Detalle del correo</SheetTitle>
              <EmailDetail
                email={selectedEmail}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
                onToggleStar={handleToggleStar}
                onMarkAsRead={handleMarkAsRead}
                onBack={() => setShowEmailDetail(false)}
                showBackButton
              />
            </SheetContent>
          </Sheet>

          {/* Connect Account Sheet */}
          <Sheet open={showConnectSheet} onOpenChange={setShowConnectSheet}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetTitle className="sr-only">Conectar cuenta de correo</SheetTitle>
              <ConnectEmailCard
                accounts={accounts}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onSync={handleSync}
                isLoading={isLoadingAccounts}
                isConnecting={isConnecting || getAuthUrl.isPending}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Composer */}
        <EmailComposer
          open={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          onSend={handleSendEmail}
          mode={composerMode}
          originalEmail={
            selectedEmail && composerMode !== 'new'
              ? {
                  from: selectedEmail.from,
                  to: selectedEmail.to || [],
                  cc: selectedEmail.cc,
                  subject: selectedEmail.subject,
                  body: selectedEmail.body,
                  sentAt: selectedEmail.sentAt,
                }
              : undefined
          }
          isLoading={sendEmail.isPending}
        />
      </PageContainer>
    );
  }

  // Desktop Layout - Modern Design v7 (Apple Liquid Glass)
  // Layout: Email List | Reading Pane (wide) + Centered Floating Dock
  return (
    <PageContainer variant="full-bleed" className="h-[calc(100vh-4rem)] relative">
      {/*
        Modern layout with Apple Liquid Glass dock:
        - Email list (left) - Compact view, shrinks when email selected
        - Reading pane (center) - Wide area for comfortable reading
        - Floating dock (bottom center) - State-of-the-art 2026 navigation

        Standard UX: When no email is selected, list fills the space properly.
        When email is selected, split view with narrow list + wide reading pane.
      */}
      <div className="flex h-full overflow-hidden pb-20">
        {/* Email List Area */}
        <div
          className={cn(
            'flex flex-col h-full overflow-hidden',
            'bg-[var(--email-surface)]',
            'transition-all duration-300 ease-out',
            // When email selected: narrow fixed width with border
            // When no email: full width, no border (fills space)
            selectedEmail
              ? 'w-[340px] shrink-0 border-r border-[var(--email-surface-border)]'
              : 'w-full'
          )}
        >
          {/* Header - Search + Actions */}
          <EmailHeader
            onSearch={setSearchQuery}
            onCompose={handleCompose}
            onAskAI={() => {
              toast({ title: 'Próximamente', description: 'El asistente de IA estará disponible pronto.' });
            }}
            searchQuery={searchQuery}
            hasAIFeature={true}
          />

          {/* Content - Email List */}
          {!hasAccounts ? (
            <div className="flex-1 flex items-center justify-center">
              <EmailEmptyState
                variant="no-accounts"
                onPrimaryAction={() => setShowConnectSheet(true)}
              />
            </div>
          ) : (
            <EmailListCompact
              emails={emails}
              selectedEmail={selectedEmail}
              currentFolder={currentFolder}
              onSelectEmail={handleSelectEmail}
              onToggleStar={handleToggleStar}
              onRefresh={() => refetchEmails()}
              isLoading={isLoadingEmails}
            />
          )}
        </div>

        {/* Email Reading Pane (right side - visible only when email selected) */}
        {selectedEmail && (
          <div
            className={cn(
              'flex-1 h-full overflow-hidden',
              'transition-all duration-300 ease-out'
            )}
          >
            <EmailReadingPane
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onToggleStar={handleToggleStar}
              onDelete={undefined}
              onArchive={undefined}
              onToggleRead={() => handleMarkAsRead(selectedEmail)}
              threadCount={0}
            />
          </div>
        )}
      </div>

      {/* Floating Dock (Apple Liquid Glass - centered bottom) */}
      <EmailFloatingDock
        currentFolder={currentFolder}
        onFolderChange={setCurrentFolder}
        onSettings={() => setShowConnectSheet(true)}
        stats={stats}
      />

      {/* Connect Account Sheet */}
      <Sheet open={showConnectSheet} onOpenChange={setShowConnectSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetTitle className="sr-only">Conectar cuenta de correo</SheetTitle>
          <ConnectEmailCard
            accounts={accounts}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
            isLoading={isLoadingAccounts}
            isConnecting={isConnecting || getAuthUrl.isPending}
          />
        </SheetContent>
      </Sheet>

      {/* Composer */}
      <EmailComposer
        open={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSend={handleSendEmail}
        mode={composerMode}
        originalEmail={
          selectedEmail && composerMode !== 'new'
            ? {
                from: selectedEmail.from,
                to: selectedEmail.to || [],
                cc: selectedEmail.cc,
                subject: selectedEmail.subject,
                body: selectedEmail.body,
                sentAt: selectedEmail.sentAt,
              }
            : undefined
        }
        isLoading={sendEmail.isPending}
      />
    </PageContainer>
  );
}

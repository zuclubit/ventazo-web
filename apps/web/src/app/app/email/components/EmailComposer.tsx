'use client';

/**
 * EmailComposer Component
 *
 * Full-featured email composer with rich text editing.
 * Uses contentEditable for rich text (can be upgraded to TipTap later).
 */

import * as React from 'react';
import {
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Loader2,
  Paperclip,
  Send,
  Underline,
  X,
  Image,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Minimize2,
  Maximize2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EmailAddress, Attachment, ComposeEmailData } from '@/lib/emails';

// ============================================
// Types
// ============================================

export interface EmailComposerProps {
  /** Whether the composer is open */
  open: boolean;
  /** Handler for close */
  onClose: () => void;
  /** Handler for send */
  onSend: (data: ComposeEmailData) => Promise<void>;
  /** Handler for save draft */
  onSaveDraft?: (data: ComposeEmailData) => Promise<void>;
  /** Initial data (for replies/forwards) */
  initialData?: Partial<ComposeEmailData>;
  /** Mode: new, reply, replyAll, forward */
  mode?: 'new' | 'reply' | 'replyAll' | 'forward';
  /** Original email (for replies) */
  originalEmail?: {
    from: EmailAddress;
    to: EmailAddress[];
    cc?: EmailAddress[];
    subject: string;
    body: string;
    sentAt?: string;
  };
  /** Loading state */
  isLoading?: boolean;
}

// ============================================
// Sub-Components
// ============================================

interface RecipientInputProps {
  label: string;
  recipients: EmailAddress[];
  onChange: (recipients: EmailAddress[]) => void;
  placeholder?: string;
}

function RecipientInput({ label, recipients, onChange, placeholder }: RecipientInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient();
    } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      onChange(recipients.slice(0, -1));
    }
  };

  const addRecipient = () => {
    const email = inputValue.trim().replace(/,$/, '');
    if (email && !recipients.find((r) => r.email === email)) {
      onChange([...recipients, { email }]);
    }
    setInputValue('');
  };

  const removeRecipient = (email: string) => {
    onChange(recipients.filter((r) => r.email !== email));
  };

  return (
    <div className="flex items-center gap-2 border-b py-2">
      <span className="text-sm text-muted-foreground w-12 shrink-0">{label}:</span>
      <div
        className="flex-1 flex flex-wrap items-center gap-1 min-h-[2rem] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {recipients.map((recipient) => (
          <Badge
            key={recipient.email}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-0.5"
          >
            <span className="text-xs">{recipient.name || recipient.email}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeRecipient(recipient.email);
              }}
              className="hover:bg-background/50 rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addRecipient}
          placeholder={recipients.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
        />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

function ToolbarButton({ icon, tooltip, onClick, active, disabled }: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8',
              active && 'bg-muted text-[var(--tenant-primary)]'
            )}
            onClick={onClick}
            disabled={disabled}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Component
// ============================================

export function EmailComposer({
  open,
  onClose,
  onSend,
  onSaveDraft,
  initialData,
  mode = 'new',
  originalEmail,
  isLoading = false,
}: EmailComposerProps) {
  const [to, setTo] = React.useState<EmailAddress[]>(initialData?.to || []);
  const [cc, setCc] = React.useState<EmailAddress[]>(initialData?.cc || []);
  const [bcc, setBcc] = React.useState<EmailAddress[]>(initialData?.bcc || []);
  const [subject, setSubject] = React.useState(initialData?.subject || '');
  const [body, setBody] = React.useState(initialData?.body || '');
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [showCc, setShowCc] = React.useState(false);
  const [showBcc, setShowBcc] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  const editorRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize for reply/forward modes
  React.useEffect(() => {
    if (originalEmail && mode !== 'new') {
      if (mode === 'reply') {
        setTo([originalEmail.from]);
        setSubject(`Re: ${originalEmail.subject}`);
      } else if (mode === 'replyAll') {
        setTo([originalEmail.from, ...(originalEmail.to || [])]);
        setCc(originalEmail.cc || []);
        setShowCc((originalEmail.cc?.length || 0) > 0);
        setSubject(`Re: ${originalEmail.subject}`);
      } else if (mode === 'forward') {
        setSubject(`Fwd: ${originalEmail.subject}`);
        setBody(`\n\n---------- Mensaje reenviado ----------\n${originalEmail.body}`);
      }
    }
  }, [originalEmail, mode]);

  // Rich text commands
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle send
  const handleSend = async () => {
    if (to.length === 0 || isSending) return;

    setIsSending(true);
    try {
      const htmlBody = editorRef.current?.innerHTML || body;
      await onSend({
        to,
        cc: showCc ? cc : [],
        bcc: showBcc ? bcc : [],
        subject,
        body: htmlBody,
        bodyHtml: htmlBody,
        // Note: File upload would need to be handled separately
      });
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle save draft
  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;

    const htmlBody = editorRef.current?.innerHTML || body;
    await onSaveDraft({
      to,
      cc: showCc ? cc : [],
      bcc: showBcc ? bcc : [],
      subject,
      body: htmlBody,
      bodyHtml: htmlBody,
    });
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <div className="bg-[var(--tenant-surface)] rounded-lg shadow-xl border overflow-hidden w-72">
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--tenant-primary)]">
            <span className="text-sm font-medium text-white truncate">
              {subject || 'Nuevo mensaje'}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {mode === 'new' && 'Nuevo mensaje'}
              {mode === 'reply' && 'Responder'}
              {mode === 'replyAll' && 'Responder a todos'}
              {mode === 'forward' && 'Reenviar'}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Recipients */}
        <div className="px-4 shrink-0">
          <RecipientInput
            label="Para"
            recipients={to}
            onChange={setTo}
            placeholder="Agregar destinatarios"
          />

          {showCc && (
            <RecipientInput
              label="CC"
              recipients={cc}
              onChange={setCc}
              placeholder="Agregar CC"
            />
          )}

          {showBcc && (
            <RecipientInput
              label="CCO"
              recipients={bcc}
              onChange={setBcc}
              placeholder="Agregar CCO"
            />
          )}

          {/* CC/BCC toggles */}
          {(!showCc || !showBcc) && (
            <div className="flex gap-2 py-1">
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  CC
                </button>
              )}
              {!showBcc && (
                <button
                  onClick={() => setShowBcc(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  CCO
                </button>
              )}
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2 border-b py-2">
            <span className="text-sm text-muted-foreground w-12 shrink-0">Asunto:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Agregar asunto"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1 border-b shrink-0">
          <ToolbarButton
            icon={<Bold className="h-4 w-4" />}
            tooltip="Negrita (Ctrl+B)"
            onClick={() => execCommand('bold')}
          />
          <ToolbarButton
            icon={<Italic className="h-4 w-4" />}
            tooltip="Cursiva (Ctrl+I)"
            onClick={() => execCommand('italic')}
          />
          <ToolbarButton
            icon={<Underline className="h-4 w-4" />}
            tooltip="Subrayado (Ctrl+U)"
            onClick={() => execCommand('underline')}
          />

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            icon={<List className="h-4 w-4" />}
            tooltip="Lista con viñetas"
            onClick={() => execCommand('insertUnorderedList')}
          />
          <ToolbarButton
            icon={<ListOrdered className="h-4 w-4" />}
            tooltip="Lista numerada"
            onClick={() => execCommand('insertOrderedList')}
          />

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            icon={<AlignLeft className="h-4 w-4" />}
            tooltip="Alinear izquierda"
            onClick={() => execCommand('justifyLeft')}
          />
          <ToolbarButton
            icon={<AlignCenter className="h-4 w-4" />}
            tooltip="Centrar"
            onClick={() => execCommand('justifyCenter')}
          />
          <ToolbarButton
            icon={<AlignRight className="h-4 w-4" />}
            tooltip="Alinear derecha"
            onClick={() => execCommand('justifyRight')}
          />

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            icon={<Link className="h-4 w-4" />}
            tooltip="Insertar enlace"
            onClick={() => {
              const url = prompt('Introduce la URL:');
              if (url) execCommand('createLink', url);
            }}
          />
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto p-4">
          <div
            ref={editorRef}
            contentEditable
            className={cn(
              'min-h-full outline-none prose prose-sm max-w-none',
              'focus:ring-0 focus:outline-none'
            )}
            dangerouslySetInnerHTML={{ __html: body }}
            onInput={() => {
              // Could track changes here if needed
            }}
          />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t shrink-0">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="gap-1.5 pr-1"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="text-xs truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="hover:bg-background/50 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSend}
              disabled={to.length === 0 || isSending}
              className="gap-2 bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-hover)]"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onSaveDraft && (
              <Button variant="ghost" size="sm" onClick={handleSaveDraft}>
                Guardar borrador
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EmailComposer;

'use client';

/**
 * Invite Team Page - Premium Dark Theme
 *
 * Clean, minimal UX for team invitations:
 * - Starts with 0 members (less overwhelming)
 * - Clear "skip" option prominent
 * - Simple add/remove flow
 *
 * Design: Premium glassmorphism dark theme matching Ventazo brand.
 *
 * @module app/onboarding/invite-team/page
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Mail,
  UserPlus,
  Users,
  CheckCircle2,
} from 'lucide-react';

import { OnboardingLayout, StepCard } from '@/components/onboarding/onboarding-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { sendInvitationsAction } from '@/lib/session/actions';
import { getTranslations, detectLocale, type SupportedLocale } from '@/lib/i18n/onboarding';
import { useOnboardingStore } from '@/store/onboarding.store';
import { cn } from '@/lib/utils';

// ============================================
// Premium Styling Classes
// ============================================

const premiumInputClasses = cn(
  'h-12 rounded-xl border-white/10 bg-white/[0.03]',
  'text-white placeholder:text-[#7A8F8F]',
  'focus:border-[#0EB58C]/50 focus:ring-2 focus:ring-[#0EB58C]/20',
  'hover:border-white/20 transition-all duration-200'
);

const premiumSelectTriggerClasses = cn(
  'h-12 rounded-xl border-white/10 bg-white/[0.03]',
  'text-white data-[placeholder]:text-[#7A8F8F]',
  'focus:border-[#0EB58C]/50 focus:ring-2 focus:ring-[#0EB58C]/20',
  'hover:border-white/20 transition-all duration-200'
);

const premiumSelectContentClasses = cn(
  'rounded-xl border-white/10 bg-[#001A1A]/95 backdrop-blur-xl',
  'shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
);

const premiumSelectItemClasses = cn(
  'text-white rounded-lg cursor-pointer',
  'focus:bg-[#0EB58C]/20 focus:text-white',
  'data-[state=checked]:bg-[#0EB58C]/20'
);

const premiumButtonPrimary = cn(
  'h-12 rounded-xl font-semibold',
  'bg-gradient-to-r from-[#003C3B] to-[#0EB58C]',
  'text-white shadow-lg shadow-[#0EB58C]/25',
  'hover:shadow-xl hover:shadow-[#0EB58C]/30 hover:scale-[1.02]',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
  'transition-all duration-200'
);

const premiumButtonGhost = cn(
  'h-12 rounded-xl font-medium',
  'text-[#B8C4C4] hover:text-white',
  'hover:bg-white/[0.05]',
  'transition-all duration-200'
);

const premiumButtonOutline = cn(
  'h-12 rounded-xl font-medium',
  'border-white/10 bg-transparent text-[#B8C4C4]',
  'hover:border-[#0EB58C]/50 hover:text-white hover:bg-white/[0.03]',
  'transition-all duration-200'
);

// ============================================
// Types
// ============================================

interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'sales_rep' | 'viewer';
}

// ============================================
// Invite Team Page
// ============================================

export default function InviteTeamPage() {
  const router = useRouter();
  const { data, updateData, setStep, completeStep } = useOnboardingStore();

  // i18n
  const [locale] = React.useState<SupportedLocale>(detectLocale());
  const t = getTranslations(locale);

  // Role options with translations
  const ROLE_OPTIONS = [
    { value: 'sales_rep', label: t.inviteTeam.roles.sales_rep.name },
    { value: 'manager', label: t.inviteTeam.roles.manager.name },
    { value: 'admin', label: t.inviteTeam.roles.admin.name },
    { value: 'viewer', label: t.inviteTeam.roles.viewer.name },
  ];

  // Start with empty array - cleaner UX
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<{
    sent: number;
    failed: string[];
  } | null>(null);

  const addMember = () => {
    setMembers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), email: '', role: 'sales_rep' },
    ]);
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMember = (id: string, field: 'email' | 'role', value: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleContinue = async () => {
    const validMembers = members.filter((m) => m.email.trim());

    // No members to invite - just skip
    if (validMembers.length === 0) {
      completeStep('invite-team');
      setStep('complete');
      router.push('/onboarding/complete');
      return;
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validMembers.filter((m) => !emailRegex.test(m.email.trim()));
    if (invalidEmails.length > 0) {
      setSubmitError('Verifica que los emails sean válidos');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const invitations = validMembers.map((m) => ({
        email: m.email.trim().toLowerCase(),
        role: m.role,
      }));

      // Use Server Action for authenticated API call
      const result = await sendInvitationsAction(invitations);
      setResults({ sent: result.sent, failed: result.failed });

      if (result.error) {
        setSubmitError(result.error);
        return;
      }

      updateData({
        invitations: invitations.map((inv) => ({ email: inv.email, role: inv.role })),
      });

      if (result.failed.length === 0) {
        setTimeout(() => {
          completeStep('invite-team');
          setStep('complete');
          void router.push('/onboarding/complete');
        }, 1500);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al enviar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    void router.push('/onboarding/setup');
  };

  const hasMembers = members.length > 0;
  const validMemberCount = members.filter((m) => m.email.trim()).length;
  const buttonText = hasMembers
    ? `${t.inviteTeam.sendInvites} (${validMemberCount})`
    : t.inviteTeam.inviteLater;

  return (
    <OnboardingLayout locale={locale}>
      <StepCard
        title={t.inviteTeam.title}
        description={t.inviteTeam.subtitle}
        icon={<Users className="h-6 w-6" />}
        footer={
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isSubmitting}
              className={premiumButtonGhost}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.common.back}
            </Button>
            <Button
              onClick={handleContinue}
              disabled={isSubmitting}
              className={premiumButtonPrimary}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : (
                <>
                  {buttonText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        }
      >
        {/* Success message - Premium Glass Style */}
        {results && results.sent > 0 && (
          <div className={cn(
            'rounded-xl p-4 mb-4',
            'bg-[#0EB58C]/10 border border-[#0EB58C]/30'
          )}>
            <div className="flex items-center gap-2 text-[#0EB58C]">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium text-white">
                {results.sent} {locale === 'en' ? 'invitation(s) sent' : 'invitación(es) enviada(s)'}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#B8C4C4]">{t.common.loading}</p>
          </div>
        )}

        {/* Error - Premium Glass Style */}
        {submitError && (
          <div className={cn(
            'rounded-xl p-4 mb-4',
            'bg-red-500/10 border border-red-500/30',
            'text-red-300'
          )}>
            {submitError}
          </div>
        )}

        {/* Empty state - Premium Glass Style */}
        {!hasMembers && (
          <div className="text-center py-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05] border border-white/10">
              <UserPlus className="h-8 w-8 text-[#0EB58C]" />
            </div>
            <h3 className="font-medium mb-1 text-white">
              {locale === 'en' ? 'Working with a team?' : '¿Trabajas con un equipo?'}
            </h3>
            <p className="text-sm text-[#7A8F8F] mb-4">
              {t.inviteTeam.subtitle}
            </p>
            <Button onClick={addMember} variant="outline" className={premiumButtonOutline}>
              <Plus className="mr-2 h-4 w-4" />
              {t.inviteTeam.addAnother}
            </Button>
          </div>
        )}

        {/* Team members list - Premium Glass Style */}
        {hasMembers && (
          <div className="space-y-3">
            {members.map((member, index) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3"
              >
                <div className="flex-1 grid gap-2 sm:grid-cols-[1fr,140px]">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8F8F]" />
                    <Input
                      className={cn(premiumInputClasses, 'pl-9')}
                      placeholder={t.inviteTeam.fields.emailPlaceholder}
                      type="email"
                      value={member.email}
                      autoFocus={index === members.length - 1}
                      onChange={(e) => updateMember(member.id, 'email', e.target.value)}
                    />
                  </div>
                  <Select
                    value={member.role}
                    onValueChange={(value) => updateMember(member.id, 'role', value)}
                  >
                    <SelectTrigger className={premiumSelectTriggerClasses}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={premiumSelectContentClasses}>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem
                          key={role.value}
                          value={role.value}
                          className={premiumSelectItemClasses}
                        >
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 h-10 w-10 rounded-lg text-[#7A8F8F] hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => removeMember(member.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              className={cn(premiumButtonOutline, 'w-full border-dashed')}
              variant="outline"
              onClick={addMember}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.inviteTeam.addAnother}
            </Button>
          </div>
        )}
      </StepCard>
    </OnboardingLayout>
  );
}

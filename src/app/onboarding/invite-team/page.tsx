'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Mail,
  Users,
  CheckCircle2,
} from 'lucide-react';

import {
  OnboardingLayout,
  StepCard,
} from '@/components/onboarding/onboarding-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { sendInvitations } from '@/lib/onboarding';
import { useOnboardingStore } from '@/store/onboarding.store';

// ============================================
// Types
// ============================================

interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'sales_rep' | 'viewer';
}

const ROLE_OPTIONS = [
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Acceso total excepto facturación',
  },
  {
    value: 'manager',
    label: 'Gerente',
    description: 'Gestión de equipo y reportes',
  },
  {
    value: 'sales_rep',
    label: 'Vendedor',
    description: 'Gestión de leads y clientes propios',
  },
  {
    value: 'viewer',
    label: 'Visualizador',
    description: 'Solo lectura',
  },
];

// ============================================
// Invite Team Page
// ============================================

export default function InviteTeamPage() {
  const router = useRouter();
  const { data, updateData, setStep, completeStep } = useOnboardingStore();

  const [members, setMembers] = React.useState<TeamMember[]>([
    { id: crypto.randomUUID(), email: '', role: 'sales_rep' },
  ]);
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

  const updateMember = (
    id: string,
    field: 'email' | 'role',
    value: string
  ) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, [field]: value }
          : m
      )
    );
  };

  const handleSubmit = async () => {
    // Filter out empty emails
    const validMembers = members.filter((m) => m.email.trim());

    if (validMembers.length === 0) {
      // Skip if no invitations
      completeStep('invite-team');
      setStep('complete');
      router.push('/onboarding/complete');
      return;
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validMembers.filter(
      (m) => !emailRegex.test(m.email.trim())
    );
    if (invalidEmails.length > 0) {
      setSubmitError('Por favor verifica que todos los emails sean válidos');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const invitations = validMembers.map((m) => ({
        email: m.email.trim().toLowerCase(),
        role: m.role,
      }));

      const result = await sendInvitations(
        data.tenantId!,
        data.userId!,
        invitations
      );

      setResults(result);

      // Update store with invitations
      updateData({
        invitations: invitations.map((inv) => ({
          email: inv.email,
          role: inv.role,
        })),
      });

      // If all sent successfully, proceed
      if (result.failed.length === 0) {
        setTimeout(() => {
          completeStep('invite-team');
          setStep('complete');
          void router.push('/onboarding/complete');
        }, 2000);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Error al enviar invitaciones'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    completeStep('invite-team');
    setStep('complete');
    void router.push('/onboarding/complete');
  };

  const handleBack = () => {
    void router.push('/onboarding/setup');
  };

  return (
    <OnboardingLayout>
      <StepCard
        description="Agrega a las personas que trabajarán contigo en el CRM"
        footer={
          <>
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Atrás
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkip}>
                Omitir por ahora
              </Button>
              <Button disabled={isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar invitaciones
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        }
        title="Invita a tu equipo"
      >
        {/* Success message */}
        {results && results.sent > 0 && (
          <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                {results.sent} invitación(es) enviada(s) correctamente
              </span>
            </div>
            {results.failed.length === 0 && (
              <p className="mt-1 text-sm">Redirigiendo al dashboard...</p>
            )}
          </div>
        )}

        {/* Error messages */}
        {submitError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {submitError}
          </div>
        )}

        {results && results.failed.length > 0 && (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
            <p className="font-medium">Algunas invitaciones no se enviaron:</p>
            <ul className="mt-1 list-inside list-disc">
              {results.failed.map((error, _index) => (
                <li key={_index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Team members list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {members.length} miembro(s)
              </span>
            </div>
          </div>

          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-start gap-3 rounded-lg border p-4"
            >
              <div className="flex-1 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Email */}
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`email-${member.id}`}>
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        id={`email-${member.id}`}
                        placeholder="colaborador@ejemplo.com"
                        type="email"
                        value={member.email}
                        onChange={(e) =>
                          updateMember(member.id, 'email', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div className="space-y-1">
                    <Label className="text-xs">Rol</Label>
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        updateMember(member.id, 'role', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div>
                              <span className="font-medium">{role.label}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                - {role.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Remove button */}
              {members.length > 1 && (
                <Button
                  className="shrink-0"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeMember(member.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {/* Add member button */}
          <Button
            className="w-full border-dashed"
            variant="outline"
            onClick={addMember}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar otro miembro
          </Button>
        </div>

        {/* Info box */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium">Sobre los roles</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {ROLE_OPTIONS.map((role) => (
              <li key={role.value}>
                <span className="font-medium text-foreground">
                  {role.label}:
                </span>{' '}
                {role.description}
              </li>
            ))}
          </ul>
        </div>
      </StepCard>
    </OnboardingLayout>
  );
}

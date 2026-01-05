'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  XCircle,
  Users,
  Shield,
  Mail,
  ArrowRight,
  LogIn,
  UserPlus,
  Clock,
  Building2,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  X,
  User,
  Phone,
  Lock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/api/api-client';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';

// Public API proxy for unauthenticated endpoints (no session required)
const API_PUBLIC_URL = '/api/public';

// ============================================
// Types
// ============================================

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  inviterName: string;
  customMessage?: string;
}

type InvitationState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'expired' }
  | { status: 'already-accepted' }
  | { status: 'cancelled' }
  | { status: 'requires-auth'; invitation: InvitationDetails }
  | { status: 'signup-form'; invitation: InvitationDetails }
  | { status: 'email-mismatch'; invitation: InvitationDetails; userEmail: string }
  | { status: 'ready'; invitation: InvitationDetails }
  | { status: 'accepting' }
  | { status: 'accepted'; tenantName: string }
  | { status: 'error'; message: string };

// Password validation rules
interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'Un número', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'Un carácter especial', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

// ============================================
// Constants - Using Ventazo Design System
// ============================================

const ROLE_CONFIG: Record<string, {
  label: string;
  description: string;
  icon: React.ElementType;
  bgClass: string;
}> = {
  owner: {
    label: 'Propietario',
    description: 'Acceso total a todas las funciones',
    icon: Building2,
    bgClass: 'bg-[var(--role-owner-bg)]',
  },
  admin: {
    label: 'Administrador',
    description: 'Acceso total excepto facturación',
    icon: Shield,
    bgClass: 'bg-[var(--role-admin-bg)]',
  },
  manager: {
    label: 'Gerente',
    description: 'Gestión de equipo y reportes',
    icon: Users,
    bgClass: 'bg-[var(--role-manager-bg)]',
  },
  sales_rep: {
    label: 'Vendedor',
    description: 'Gestión de leads y clientes propios',
    icon: Sparkles,
    bgClass: 'bg-[var(--tenant-primary)]',
  },
  viewer: {
    label: 'Visualizador',
    description: 'Solo lectura',
    icon: Mail,
    bgClass: 'bg-[var(--role-viewer-bg)]',
  },
};

// ============================================
// Animation Variants
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 15,
      delay: 0.1,
    },
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

const successCheckVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.5, ease: 'easeOut' as const },
      opacity: { duration: 0.2 },
    },
  },
};

// ============================================
// Premium Background Component (Theme-Aware)
// ============================================

function PremiumBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Light mode background */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background: 'linear-gradient(165deg, #f8fffe 0%, #e6f7f4 25%, #d4f1ec 50%, #e8f9f6 75%, #ffffff 100%)',
        }}
      />

      {/* Dark mode background - Ventazo brand gradient */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: 'linear-gradient(165deg, #001A1A 0%, #002525 25%, #003C3B 50%, #002D2D 75%, #001E1E 100%)',
        }}
      />

      {/* Light mode atmospheric glows */}
      <div className="pointer-events-none absolute inset-0 dark:hidden">
        <motion.div
          className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-[var(--tenant-primary)]/8 blur-[150px]"
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -left-20 top-1/3 h-[400px] w-[400px] rounded-full bg-[var(--tenant-primary)]/6 blur-[120px]"
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-[var(--ventazo-dark)]/5 blur-[100px]" />
      </div>

      {/* Dark mode atmospheric glows */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,181,140,0.12),transparent)]" />
        <motion.div
          className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-[var(--tenant-primary)]/12 blur-[150px]"
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -left-20 top-1/3 h-[400px] w-[400px] rounded-full bg-[var(--tenant-primary)]/8 blur-[120px]"
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-[var(--tenant-accent)]/8 blur-[100px]" />
      </div>

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette effect */}
      <div
        className="pointer-events-none absolute inset-0 dark:block hidden"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,60,59,0.05) 100%)',
        }}
      />
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

/** Glassmorphism Card Container - Theme Aware */
function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        // Base structure
        'relative overflow-hidden rounded-3xl',
        // Light mode glass effect
        'bg-white/70 backdrop-blur-xl',
        'border border-[var(--tenant-primary)]/10',
        'shadow-[0_8px_32px_rgba(0,60,59,0.08),0_2px_8px_rgba(0,0,0,0.04)]',
        // Dark mode glass effect
        'dark:bg-[rgba(0,60,59,0.35)] dark:backdrop-blur-xl',
        'dark:border-[rgba(255,255,255,0.1)]',
        'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(14,181,140,0.1)]',
        // Size
        'w-full max-w-md mx-auto',
        // Padding
        'p-8 sm:p-10',
        className
      )}
    >
      {/* Inner highlight for depth - Light mode */}
      <div
        className="absolute inset-0 rounded-3xl opacity-60 pointer-events-none dark:hidden"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(14,181,140,0.05) 0%, transparent 50%)',
        }}
      />
      {/* Inner highlight for depth - Dark mode */}
      <div
        className="absolute inset-0 rounded-3xl opacity-50 pointer-events-none hidden dark:block"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.08) 0%, transparent 50%)',
        }}
      />
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

/** Status Icon with animation - Theme Aware */
function StatusIcon({
  type,
  className
}: {
  type: 'success' | 'warning' | 'error' | 'info' | 'loading';
  className?: string;
}) {
  const config = {
    success: {
      bg: 'bg-[var(--status-success-bg)]',
      ring: 'ring-[var(--status-success)]/30',
      icon: CheckCircle2,
      iconClass: 'text-[var(--status-success)]',
    },
    warning: {
      bg: 'bg-[var(--status-warning-bg)]',
      ring: 'ring-[var(--status-warning)]/30',
      icon: AlertTriangle,
      iconClass: 'text-[var(--status-warning)]',
    },
    error: {
      bg: 'bg-[var(--status-error-bg)]',
      ring: 'ring-[var(--status-error)]/30',
      icon: XCircle,
      iconClass: 'text-[var(--status-error)]',
    },
    info: {
      bg: 'bg-[var(--status-info-bg)]',
      ring: 'ring-[var(--status-info)]/30',
      icon: Users,
      iconClass: 'text-[var(--status-info)]',
    },
    loading: {
      bg: 'bg-[var(--status-info-bg)]',
      ring: 'ring-[var(--status-info)]/30',
      icon: Loader2,
      iconClass: 'text-[var(--tenant-primary)] animate-spin',
    },
  };

  const { bg, ring, icon: Icon, iconClass } = config[type];

  return (
    <motion.div
      variants={iconVariants}
      className={cn(
        'mx-auto flex h-20 w-20 items-center justify-center rounded-full',
        'ring-4',
        bg,
        ring,
        className
      )}
    >
      <Icon className={cn('h-10 w-10', iconClass)} />
    </motion.div>
  );
}

/** Animated Success Checkmark SVG */
function AnimatedCheckmark() {
  return (
    <motion.div
      variants={iconVariants}
      className={cn(
        'mx-auto flex h-24 w-24 items-center justify-center rounded-full',
        'bg-[var(--status-success-bg)]',
        'ring-4 ring-[var(--status-success)]/30'
      )}
    >
      <svg
        className="h-12 w-12 text-[var(--status-success)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M5 13l4 4L19 7"
          variants={successCheckVariants}
          initial="hidden"
          animate="visible"
        />
      </svg>
    </motion.div>
  );
}

/** Role Badge with dynamic theming */
function RoleBadge({ role }: { role: string }) {
  const defaultConfig = ROLE_CONFIG['viewer'];
  const config = ROLE_CONFIG[role] ?? defaultConfig;
  if (!config) return null;
  const Icon = config.icon;

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full',
        'bg-card/60 dark:bg-card/30',
        'border border-border/50',
        'shadow-sm'
      )}
    >
      <div className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full',
        config.bgClass
      )}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold text-foreground">{config.label}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
    </motion.div>
  );
}

/** Countdown Timer - Theme Aware */
function ExpirationCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = React.useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = React.useState(false);

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expirada');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setIsExpiringSoon(days === 0 && hours < 24);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h restantes`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m restantes`);
      } else {
        setTimeLeft(`${minutes}m restantes`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
        isExpiringSoon
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          : 'bg-muted/50 text-muted-foreground border border-border/50'
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {timeLeft}
    </motion.div>
  );
}

/** Custom Message Quote - Theme Aware */
function InviterMessage({ message, inviterName }: { message: string; inviterName: string }) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'relative mt-6 p-4 rounded-2xl',
        'bg-[var(--tenant-primary)]/5 dark:bg-card/30',
        'border border-[var(--tenant-primary)]/10 dark:border-border/50'
      )}
    >
      <div className="absolute -top-3 left-4">
        <span className="text-4xl text-[var(--tenant-primary)]/30">"</span>
      </div>
      <p className="text-sm italic text-foreground/80 pl-4 pt-1">
        {message}
      </p>
      <p className="mt-3 text-xs text-muted-foreground text-right">
        — {inviterName}
      </p>
    </motion.div>
  );
}

/** Floating Particles for success state */
function SuccessParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-[var(--tenant-primary)]/40"
          initial={{
            x: '50%',
            y: '50%',
            scale: 0,
            opacity: 0,
          }}
          animate={{
            x: `${50 + (Math.random() - 0.5) * 100}%`,
            y: `${50 + (Math.random() - 0.5) * 100}%`,
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.05,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

/** Primary CTA Button with glow effect - Theme Aware */
function CTAButton({
  children,
  onClick,
  loading,
  disabled,
  variant = 'primary',
  type,
  className: customClassName,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}) {
  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'relative w-full py-4 px-6 rounded-2xl font-semibold text-base',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50 focus:ring-offset-2',
        'focus:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && [
          'bg-[var(--tenant-primary)]',
          'text-white shadow-lg',
          'shadow-[var(--tenant-primary)]/20 dark:shadow-[var(--tenant-primary)]/30',
          'hover:shadow-xl hover:shadow-[var(--tenant-primary)]/30 dark:hover:shadow-[var(--tenant-primary)]/40',
          'hover:brightness-110',
        ],
        variant === 'secondary' && [
          'bg-card/60 dark:bg-card/30',
          'text-foreground',
          'border border-border/50',
          'hover:bg-card/80 dark:hover:bg-card/50',
          'hover:border-border',
        ],
        customClassName
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Procesando...</span>
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}

/** Password Strength Indicator - Theme Aware */
function PasswordStrengthIndicator({ password }: { password: string }) {
  const passedRules = PASSWORD_RULES.filter((rule) => rule.test(password));
  const strength = passedRules.length;
  const isStrong = strength === PASSWORD_RULES.length;

  const getStrengthColor = () => {
    if (strength === 0) return 'bg-muted';
    if (strength <= 2) return 'bg-[var(--status-error)]';
    if (strength <= 3) return 'bg-[var(--status-warning)]';
    if (strength <= 4) return 'bg-[var(--status-warning)]';
    return 'bg-[var(--status-success)]';
  };

  const getStrengthLabel = () => {
    if (strength === 0) return '';
    if (strength <= 2) return 'Débil';
    if (strength <= 3) return 'Regular';
    if (strength <= 4) return 'Buena';
    return 'Fuerte';
  };

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-200',
                i <= strength ? getStrengthColor() : 'bg-muted'
              )}
            />
          ))}
        </div>
        {strength > 0 && (
          <span className={cn(
            'text-xs font-medium',
            isStrong ? 'text-[var(--status-success)]' : 'text-muted-foreground'
          )}>
            {getStrengthLabel()}
          </span>
        )}
      </div>

      {/* Rules Checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors duration-200',
                passed ? 'text-[var(--status-success)]' : 'text-muted-foreground'
              )}
            >
              {passed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3 opacity-50" />
              )}
              <span>{rule.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Signup Form for New Users - Theme Aware */
function InviteSetupForm({
  invitation,
  token,
  onSuccess,
  onError,
  onBack,
}: {
  invitation: InvitationDetails;
  token: string;
  onSuccess: (tenantName: string) => void;
  onError: (message: string) => void;
  onBack: () => void;
}) {
  const [formData, setFormData] = React.useState({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const isPasswordValid = PASSWORD_RULES.every((rule) => rule.test(formData.password));
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors['fullName'] = 'El nombre es requerido';
    } else if (formData.fullName.trim().length < 2) {
      newErrors['fullName'] = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!isPasswordValid) {
      newErrors['password'] = 'La contraseña no cumple con los requisitos';
    }

    if (!passwordsMatch) {
      newErrors['confirmPassword'] = 'Las contraseñas no coinciden';
    }

    if (!formData.acceptTerms) {
      newErrors['acceptTerms'] = 'Debes aceptar los términos y condiciones';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Call public endpoint for accept-signup
      const response = await fetch(`${API_PUBLIC_URL}/invitations/accept-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear la cuenta');
      }

      // Store tokens in session cookie via login endpoint
      // The accept-signup returns tokens, we need to set them in the session
      const loginResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: data.session.accessToken,
          refreshToken: data.session.refreshToken,
          expiresAt: data.session.expiresAt,
          user: data.user,
        }),
      });

      if (!loginResponse.ok) {
        console.warn('[InviteSetupForm] Failed to set session, user will need to login');
      }

      onSuccess(invitation.tenant.name);
    } catch (error) {
      console.error('[InviteSetupForm] Error:', error);
      onError(error instanceof Error ? error.message : 'Error al crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClasses = cn(
    'pl-10 transition-colors duration-200',
    // Light mode
    'bg-white/60 border-[var(--tenant-primary)]/20 focus:border-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]/20',
    // Dark mode
    'dark:bg-white/5 dark:border-white/20 dark:focus:border-[var(--tenant-primary)]'
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="text-center mb-6">
        <motion.h1
          variants={itemVariants}
          className="text-2xl font-bold text-foreground"
        >
          Completa tu registro
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="mt-2 text-muted-foreground text-sm"
        >
          Únete a <span className="font-semibold text-[var(--tenant-primary)]">{invitation.tenant.name}</span>
        </motion.p>
      </div>

      {/* Email (readonly) */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
          Correo electrónico
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={invitation.email}
            disabled
            className={cn(inputBaseClasses, 'text-foreground/60 cursor-not-allowed')}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Tu email se verificará automáticamente
        </p>
      </motion.div>

      {/* Full Name */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="fullName" className="text-sm font-medium text-foreground/80">
          Nombre completo *
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="fullName"
            type="text"
            placeholder="Tu nombre completo"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className={cn(
              inputBaseClasses,
              errors['fullName'] && 'border-red-500 dark:border-red-500'
            )}
            autoComplete="name"
            autoFocus
          />
        </div>
        {errors['fullName'] && (
          <p className="text-xs text-red-500">{errors['fullName']}</p>
        )}
      </motion.div>

      {/* Phone (optional) */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium text-foreground/80">
          Teléfono <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="+52 555 123 4567"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={inputBaseClasses}
            autoComplete="tel"
          />
        </div>
      </motion.div>

      {/* Password */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
          Contraseña *
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Crea una contraseña segura"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={cn(
              inputBaseClasses,
              'pr-10',
              errors['password'] && 'border-red-500 dark:border-red-500'
            )}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {formData.password && (
          <PasswordStrengthIndicator password={formData.password} />
        )}
      </motion.div>

      {/* Confirm Password */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">
          Confirmar contraseña *
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Repite tu contraseña"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className={cn(
              inputBaseClasses,
              'pr-10',
              errors['confirmPassword'] && 'border-red-500 dark:border-red-500',
              passwordsMatch && formData.confirmPassword && 'border-[var(--tenant-primary)] dark:border-[var(--tenant-primary)]'
            )}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors['confirmPassword'] && (
          <p className="text-xs text-red-500">{errors['confirmPassword']}</p>
        )}
        {passwordsMatch && formData.confirmPassword && (
          <p className="text-xs text-[var(--tenant-primary)] flex items-center gap-1">
            <Check className="h-3 w-3" />
            Las contraseñas coinciden
          </p>
        )}
      </motion.div>

      {/* Role Badge */}
      <motion.div variants={itemVariants} className="flex justify-center py-2">
        <RoleBadge role={invitation.role} />
      </motion.div>

      {/* Terms */}
      <motion.div variants={itemVariants} className="flex items-start gap-3">
        <Checkbox
          id="acceptTerms"
          checked={formData.acceptTerms}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, acceptTerms: checked as boolean })
          }
          className="mt-0.5 border-[var(--tenant-primary)]/30 data-[state=checked]:bg-[var(--tenant-primary)] data-[state=checked]:border-[var(--tenant-primary)]"
        />
        <Label
          htmlFor="acceptTerms"
          className={cn(
            'text-sm text-muted-foreground cursor-pointer leading-relaxed',
            errors['acceptTerms'] && 'text-red-500'
          )}
        >
          Acepto los{' '}
          <Link href="/terms" className="text-[var(--tenant-primary)] hover:underline" target="_blank">
            términos de servicio
          </Link>
          {' '}y la{' '}
          <Link href="/privacy" className="text-[var(--tenant-primary)] hover:underline" target="_blank">
            política de privacidad
          </Link>
        </Label>
      </motion.div>

      {/* Submit Button */}
      <motion.div variants={itemVariants} className="pt-2">
        <CTAButton
          type="submit"
          loading={isSubmitting}
          disabled={!isPasswordValid || !passwordsMatch || !formData.acceptTerms || !formData.fullName.trim()}
        >
          <span className="flex items-center justify-center gap-2">
            <UserPlus className="h-5 w-5" />
            Crear cuenta y unirme
          </span>
        </CTAButton>
      </motion.div>

      {/* Back Link */}
      <motion.div variants={itemVariants} className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ¿Ya tienes cuenta?{' '}
          <span className="text-[var(--tenant-primary)] font-medium">Inicia sesión</span>
        </button>
      </motion.div>
    </form>
  );
}

// ============================================
// Main Component
// ============================================

export function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { user, isAuthenticated, isLoading: isSessionLoading, tokens } = useSession();
  const refreshSession = useAuthStore((state) => state.refreshSession);

  const [state, setState] = React.useState<InvitationState>({ status: 'loading' });

  // Fetch invitation details
  React.useEffect(() => {
    if (!token) {
      setState({ status: 'not-found' });
      return;
    }

    if (isSessionLoading) {
      return;
    }

    const fetchInvitation = async () => {
      try {
        // Use public proxy for unauthenticated endpoint
        // The BFF proxy (/api/proxy) requires session, but this endpoint is public
        // The public proxy (/api/public) allows specific whitelisted endpoints
        const response = await fetch(`${API_PUBLIC_URL}/invitations/token/${token}`);

        if (response.status === 404) {
          setState({ status: 'not-found' });
          return;
        }

        if (response.status === 410) {
          const data = await response.json();
          if (data.message?.includes('expired')) {
            setState({ status: 'expired' });
          } else if (data.message?.includes('already been accepted')) {
            setState({ status: 'already-accepted' });
          } else if (data.message?.includes('cancelled')) {
            setState({ status: 'cancelled' });
          } else {
            setState({ status: 'expired' });
          }
          return;
        }

        if (!response.ok) {
          setState({ status: 'error', message: 'Error al cargar la invitación' });
          return;
        }

        const invitation: InvitationDetails = await response.json();

        if (!isAuthenticated || !user) {
          setState({ status: 'requires-auth', invitation });
          return;
        }

        if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
          setState({
            status: 'email-mismatch',
            invitation,
            userEmail: user.email,
          });
          return;
        }

        setState({ status: 'ready', invitation });
      } catch (error) {
        console.error('[InvitationAccept] Error:', error);
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Error inesperado',
        });
      }
    };

    fetchInvitation();
  }, [token, isAuthenticated, user, isSessionLoading]);

  // Accept invitation
  const handleAccept = async () => {
    if (state.status !== 'ready') return;

    setState({ status: 'accepting' });

    try {
      // Verify we have authentication tokens
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        setState({ status: 'requires-auth', invitation: state.invitation });
        return;
      }

      // Use BFF proxy with session cookies for authenticated endpoint
      // The proxy reads the session cookie and forwards auth to backend
      const response = await fetch(`${API_BASE_URL}/invitations/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send session cookies to proxy
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Error al aceptar la invitación');
      }

      const newTenantId = state.invitation.tenant.id;
      setState({ status: 'accepted', tenantName: state.invitation.tenant.name });

      // Refresh session to include new tenant
      try {
        await refreshSession(newTenantId);
      } catch (refreshError) {
        console.warn('[InvitationAccept] Session refresh failed:', refreshError);
      }

      // Use window.location.href for a full page reload to ensure
      // session cookies are properly loaded by the middleware
      setTimeout(() => {
        window.location.href = '/app/dashboard';
      }, 2500);
    } catch (error) {
      console.error('[InvitationAccept] Accept error:', error);
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Error al aceptar la invitación',
      });
    }
  };

  const handleLoginRedirect = () => {
    const returnUrl = `/invite/accept?token=${token}`;
    router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  // ============================================
  // Render States
  // ============================================

  const renderContent = () => {
    switch (state.status) {
      case 'loading':
        return (
          <GlassCard>
            <div className="flex flex-col items-center text-center py-8">
              <StatusIcon type="loading" />
              <motion.p
                variants={itemVariants}
                className="mt-6 text-lg text-muted-foreground"
              >
                Cargando invitación...
              </motion.p>
            </div>
          </GlassCard>
        );

      case 'not-found':
        return (
          <GlassCard>
            <div className="flex flex-col items-center text-center">
              <StatusIcon type="error" />
              <motion.h1
                variants={itemVariants}
                className="mt-6 text-2xl font-bold text-foreground"
              >
                Invitación no encontrada
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="mt-3 text-muted-foreground max-w-sm"
              >
                El enlace de invitación no es válido o ya no existe.
                Verifica que hayas copiado correctamente el enlace.
              </motion.p>
              <motion.div variants={itemVariants} className="mt-8 w-full">
                <Button asChild className="w-full bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/90" size="lg">
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Ir al inicio de sesión
                  </Link>
                </Button>
              </motion.div>
            </div>
          </GlassCard>
        );

      case 'expired':
        return (
          <GlassCard>
            <div className="flex flex-col items-center text-center">
              <StatusIcon type="warning" />
              <motion.h1
                variants={itemVariants}
                className="mt-6 text-2xl font-bold text-foreground"
              >
                Invitación expirada
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="mt-3 text-muted-foreground max-w-sm"
              >
                Esta invitación ha expirado. Contacta con la persona que
                te invitó para solicitar una nueva invitación.
              </motion.p>
              <motion.div variants={itemVariants} className="mt-8 w-full">
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link href="/login">Ir al inicio de sesión</Link>
                </Button>
              </motion.div>
            </div>
          </GlassCard>
        );

      case 'already-accepted':
        return (
          <GlassCard>
            <div className="flex flex-col items-center text-center">
              <StatusIcon type="success" />
              <motion.h1
                variants={itemVariants}
                className="mt-6 text-2xl font-bold text-foreground"
              >
                Invitación ya aceptada
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="mt-3 text-muted-foreground max-w-sm"
              >
                Ya has aceptado esta invitación anteriormente.
                Puedes iniciar sesión para acceder a tu cuenta.
              </motion.p>
              <motion.div variants={itemVariants} className="mt-8 w-full">
                <Button asChild className="w-full bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/90" size="lg">
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar sesión
                  </Link>
                </Button>
              </motion.div>
            </div>
          </GlassCard>
        );

      case 'cancelled':
        return (
          <GlassCard>
            <div className="flex flex-col items-center text-center">
              <StatusIcon type="error" />
              <motion.h1
                variants={itemVariants}
                className="mt-6 text-2xl font-bold text-foreground"
              >
                Invitación cancelada
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="mt-3 text-muted-foreground max-w-sm"
              >
                Esta invitación ha sido cancelada por el administrador.
              </motion.p>
              <motion.div variants={itemVariants} className="mt-8 w-full">
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link href="/login">Ir al inicio de sesión</Link>
                </Button>
              </motion.div>
            </div>
          </GlassCard>
        );

      case 'requires-auth':
        return (
          <GlassCard>
            <div className="flex flex-col items-center text-center">
              <StatusIcon type="info" />

              <motion.h1
                variants={itemVariants}
                className="mt-6 text-2xl font-bold text-foreground"
              >
                Te han invitado a unirte
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-2 text-muted-foreground"
              >
                <span className="font-medium text-foreground">{state.invitation.inviterName}</span>
                {' '}te invita a{' '}
                <span className="font-semibold text-[var(--tenant-primary)]">{state.invitation.tenant.name}</span>
              </motion.p>

              {/* Role Badge */}
              <motion.div variants={itemVariants} className="mt-6">
                <RoleBadge role={state.invitation.role} />
              </motion.div>

              {/* Expiration */}
              <motion.div variants={itemVariants} className="mt-4">
                <ExpirationCountdown expiresAt={state.invitation.expiresAt} />
              </motion.div>

              {/* Custom Message */}
              {state.invitation.customMessage && (
                <InviterMessage
                  message={state.invitation.customMessage}
                  inviterName={state.invitation.inviterName}
                />
              )}

              {/* Auth Required Notice */}
              <motion.div
                variants={itemVariants}
                className={cn(
                  'mt-6 p-4 rounded-2xl',
                  'bg-[var(--tenant-primary)]/10 border border-[var(--tenant-primary)]/20'
                )}
              >
                <p className="text-sm text-foreground/80">
                  Esta invitación es para{' '}
                  <strong className="font-semibold text-[var(--tenant-primary)]">{state.invitation.email}</strong>
                </p>
              </motion.div>

              {/* Action Buttons */}
              <motion.div variants={itemVariants} className="mt-8 w-full space-y-3">
                <CTAButton onClick={() => setState({ status: 'signup-form', invitation: state.invitation })}>
                  <span className="flex items-center justify-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Crear cuenta y unirme
                  </span>
                </CTAButton>
                <CTAButton variant="secondary" onClick={handleLoginRedirect}>
                  <span className="flex items-center justify-center gap-2">
                    <LogIn className="h-5 w-5" />
                    Ya tengo cuenta
                  </span>
                </CTAButton>
              </motion.div>
            </div>
          </GlassCard>
        );

      case 'signup-form':
        return (
          <GlassCard className="max-w-lg">
            <InviteSetupForm
              invitation={state.invitation}
              token={token!}
              onSuccess={(tenantName) => {
                setState({ status: 'accepted', tenantName });
                // Use window.location.href for a full page reload to ensure
                // session cookies are properly loaded by the middleware
                setTimeout(() => {
                  window.location.href = '/app/dashboard';
                }, 2500);
              }}
              onError={(message) => {
                setState({ status: 'error', message });
              }}
              onBack={handleLoginRedirect}
            />
          </GlassCard>
        );

      case 'email-mismatch':
        return (
          <GlassCard>
            <div className="flex flex-col items-center text-center">
              <StatusIcon type="warning" />

              <motion.h1
                variants={itemVariants}
                className="mt-6 text-2xl font-bold text-foreground"
              >
                Email incorrecto
              </motion.h1>

              <motion.div
                variants={itemVariants}
                className="mt-4 space-y-2"
              >
                <p className="text-muted-foreground">
                  Esta invitación fue enviada a:
                </p>
                <p className={cn(
                  'font-mono text-sm px-3 py-1.5 rounded-lg text-foreground',
                  'bg-white/60 dark:bg-white/10'
                )}>
                  {state.invitation.email}
                </p>
                <p className="text-muted-foreground">
                  Pero estás conectado como:
                </p>
                <p className={cn(
                  'font-mono text-sm px-3 py-1.5 rounded-lg text-foreground',
                  'bg-white/60 dark:bg-white/10'
                )}>
                  {state.userEmail}
                </p>
              </motion.div>

              <motion.p
                variants={itemVariants}
                className="mt-4 text-sm text-muted-foreground"
              >
                Cierra sesión e inicia con el email correcto, o contacta a{' '}
                <span className="font-medium text-foreground">{state.invitation.inviterName}</span>
              </motion.p>

              <motion.div variants={itemVariants} className="mt-8 w-full">
                <CTAButton
                  variant="secondary"
                  onClick={() => {
                    router.push(`/logout?returnUrl=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Cerrar sesión y usar otro email
                  </span>
                </CTAButton>
              </motion.div>
            </div>
          </GlassCard>
        );

      case 'ready':
        return (
          <GlassCard>
            <div className="flex flex-col items-center text-center">
              <motion.div variants={pulseVariants} animate="pulse">
                <StatusIcon type="info" />
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="mt-6 text-2xl font-bold text-foreground"
              >
                Te han invitado a unirte
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-2 text-muted-foreground"
              >
                <span className="font-medium text-foreground">{state.invitation.inviterName}</span>
                {' '}te invita a formar parte de{' '}
                <span className="font-semibold text-[var(--tenant-primary)]">{state.invitation.tenant.name}</span>
              </motion.p>

              {/* Role Badge */}
              <motion.div variants={itemVariants} className="mt-6">
                <RoleBadge role={state.invitation.role} />
              </motion.div>

              {/* Email confirmation */}
              <motion.div
                variants={itemVariants}
                className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Mail className="h-4 w-4" />
                <span>{state.invitation.email}</span>
              </motion.div>

              {/* Expiration */}
              <motion.div variants={itemVariants} className="mt-2">
                <ExpirationCountdown expiresAt={state.invitation.expiresAt} />
              </motion.div>

              {/* Custom Message */}
              {state.invitation.customMessage && (
                <InviterMessage
                  message={state.invitation.customMessage}
                  inviterName={state.invitation.inviterName}
                />
              )}

              {/* Accept Button */}
              <motion.div variants={itemVariants} className="mt-8 w-full">
                <CTAButton onClick={handleAccept}>
                  <span className="flex items-center justify-center gap-2">
                    Aceptar invitación
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </CTAButton>
              </motion.div>

              <motion.p
                variants={itemVariants}
                className="mt-4 text-xs text-muted-foreground"
              >
                Al aceptar, tendrás acceso a los recursos compartidos de{' '}
                {state.invitation.tenant.name}
              </motion.p>
            </div>
          </GlassCard>
        );

      case 'accepting':
        return (
          <GlassCard>
            <div className="flex flex-col items-center text-center py-8">
              <StatusIcon type="loading" />
              <motion.p
                variants={itemVariants}
                className="mt-6 text-lg text-muted-foreground"
              >
                Aceptando invitación...
              </motion.p>
              <motion.div
                variants={itemVariants}
                className="mt-2 flex gap-1"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[var(--tenant-primary)]"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            </div>
          </GlassCard>
        );

      case 'accepted':
        return (
          <GlassCard className="overflow-visible">
            <SuccessParticles />
            <div className="flex flex-col items-center text-center relative">
              <AnimatedCheckmark />

              <motion.h1
                variants={itemVariants}
                className="mt-6 text-2xl font-bold text-foreground"
              >
                ¡Bienvenido al equipo!
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-3 text-muted-foreground"
              >
                Te has unido exitosamente a{' '}
                <span className="font-semibold text-[var(--tenant-primary)]">{state.tenantName}</span>
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="h-4 w-4 animate-spin text-[var(--tenant-primary)]" />
                <span>Redirigiendo al dashboard...</span>
              </motion.div>
            </div>
          </GlassCard>
        );

      case 'error':
        return (
          <GlassCard>
            <div className="flex flex-col items-center text-center">
              <StatusIcon type="error" />

              <motion.h1
                variants={itemVariants}
                className="mt-6 text-2xl font-bold text-foreground"
              >
                Ha ocurrido un error
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-3 text-muted-foreground max-w-sm"
              >
                {state.message}
              </motion.p>

              <motion.div variants={itemVariants} className="mt-8 w-full">
                <CTAButton
                  variant="secondary"
                  onClick={() => window.location.reload()}
                >
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Intentar de nuevo
                  </span>
                </CTAButton>
              </motion.div>
            </div>
          </GlassCard>
        );
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8"
      role="main"
      aria-label="Aceptar invitación"
    >
      {/* Premium Background with Theme Support */}
      <PremiumBackground />

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state.status}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--tenant-primary)] focus:text-white focus:rounded-lg"
      >
        Saltar al contenido principal
      </a>
    </main>
  );
}

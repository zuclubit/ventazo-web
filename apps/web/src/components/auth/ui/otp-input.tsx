'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * OTP Input Component
 * 6-digit inline verification for email verification during signup (P0.1)
 */

export interface OTPInputProps {
  /** Length of OTP code (default: 6) */
  length?: number;
  /** Callback when OTP is complete */
  onComplete: (otp: string) => void;
  /** Callback when OTP changes */
  onChange?: (otp: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Success state (verified) */
  success?: boolean;
  /** Loading state (verifying) */
  loading?: boolean;
  /** Auto focus first input on mount */
  autoFocus?: boolean;
  /** Time until code expires (seconds) */
  expiresIn?: number;
  /** Callback to resend OTP */
  onResend?: () => void;
  /** Whether resend is available */
  canResend?: boolean;
  /** Seconds until resend is available */
  resendCooldown?: number;
  /** Remaining verification attempts */
  remainingAttempts?: number;
}

export function OTPInput({
  length = 6,
  onComplete,
  onChange,
  disabled = false,
  error = false,
  errorMessage,
  success = false,
  loading = false,
  autoFocus = true,
  expiresIn,
  onResend,
  canResend = true,
  resendCooldown = 0,
  remainingAttempts,
}: OTPInputProps) {
  const [otp, setOtp] = React.useState<string[]>(Array(length).fill(''));
  const [expiryTime, setExpiryTime] = React.useState(expiresIn || 0);
  const [cooldown, setCooldown] = React.useState(resendCooldown);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Update expiry time from prop
  React.useEffect(() => {
    if (expiresIn !== undefined) {
      setExpiryTime(expiresIn);
    }
  }, [expiresIn]);

  // Update cooldown from prop
  React.useEffect(() => {
    setCooldown(resendCooldown);
  }, [resendCooldown]);

  // Countdown timer for expiry
  React.useEffect(() => {
    if (expiryTime <= 0) return;

    const timer = setInterval(() => {
      setExpiryTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryTime]);

  // Countdown timer for resend cooldown
  React.useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus first input
  React.useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Clear OTP on error (allow retry)
  React.useEffect(() => {
    if (error && remainingAttempts !== undefined && remainingAttempts > 0) {
      // Don't auto-clear, let user see what they entered
    }
  }, [error, remainingAttempts]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Notify parent of change
    const otpString = newOtp.join('');
    onChange?.(otpString);

    // Move to next input if digit entered
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newOtp.every((d) => d !== '') && newOtp.length === length) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
      }
    }

    // Move with arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain');
    const digits = pastedData.replace(/\D/g, '').slice(0, length);

    if (digits.length > 0) {
      const newOtp = [...otp];
      digits.split('').forEach((digit, i) => {
        if (i < length) {
          newOtp[i] = digit;
        }
      });
      setOtp(newOtp);
      onChange?.(newOtp.join(''));

      // Focus last filled input or next empty
      const lastFilledIndex = Math.min(digits.length - 1, length - 1);
      inputRefs.current[lastFilledIndex]?.focus();

      // Check if complete
      if (newOtp.every((d) => d !== '') && newOtp.length === length) {
        onComplete(newOtp.join(''));
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleResend = () => {
    if (canResend && cooldown === 0 && onResend) {
      // Clear current OTP
      setOtp(Array(length).fill(''));
      onResend();
      setCooldown(60); // Start 60 second cooldown
      inputRefs.current[0]?.focus();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = expiresIn !== undefined && expiryTime === 0;
  const isDisabled = disabled || loading || success || isExpired;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* OTP Input boxes */}
      <div className="flex gap-2 sm:gap-3">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            aria-label={`Dígito ${index + 1} del código de verificación`}
            className={cn(
              'h-12 w-10 sm:h-14 sm:w-12 rounded-lg border-2 bg-background text-center text-xl sm:text-2xl font-semibold transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              !error && !success && 'border-input focus:border-primary focus:ring-primary/30',
              error && 'border-destructive focus:ring-destructive/30 text-destructive animate-shake',
              success && 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30',
              isDisabled && 'cursor-not-allowed opacity-60'
            )}
            disabled={isDisabled}
            inputMode="numeric"
            maxLength={1}
            pattern="[0-9]"
            type="text"
            value={otp[index]}
            onChange={(e) => handleChange(index, e.target.value)}
            onFocus={handleFocus}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
          />
        ))}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2 min-h-[24px]">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Verificando...</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Email verificado</span>
          </div>
        )}

        {error && errorMessage && (
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}

        {!loading && !success && !error && expiresIn !== undefined && expiryTime > 0 && (
          <span className={cn(
            'text-sm',
            expiryTime <= 60 ? 'text-orange-600 font-medium' : 'text-muted-foreground'
          )}>
            El código expira en {formatTime(expiryTime)}
          </span>
        )}

        {isExpired && !success && (
          <span className="text-sm text-destructive font-medium">
            El código ha expirado
          </span>
        )}
      </div>

      {/* Remaining attempts */}
      {remainingAttempts !== undefined && remainingAttempts >= 0 && error && (
        <p className="text-xs text-muted-foreground">
          {remainingAttempts === 0
            ? 'Sin intentos restantes. Solicita un nuevo código.'
            : `${remainingAttempts} intento${remainingAttempts !== 1 ? 's' : ''} restante${remainingAttempts !== 1 ? 's' : ''}`
          }
        </p>
      )}

      {/* Resend button */}
      {onResend && (
        <div className="flex flex-col items-center gap-1">
          <Button
            className="gap-2"
            disabled={!canResend || cooldown > 0 || loading}
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleResend}
          >
            <RefreshCw className={cn('h-4 w-4', cooldown > 0 && 'animate-spin')} />
            {cooldown > 0
              ? `Reenviar en ${cooldown}s`
              : 'Reenviar código'
            }
          </Button>
          <p className="text-xs text-muted-foreground">
            ¿No recibiste el código?
          </p>
        </div>
      )}
    </div>
  );
}

// CSS animation for shake effect (add to globals.css or tailwind config)
// .animate-shake {
//   animation: shake 0.4s ease-in-out;
// }
// @keyframes shake {
//   0%, 100% { transform: translateX(0); }
//   25% { transform: translateX(-4px); }
//   75% { transform: translateX(4px); }
// }

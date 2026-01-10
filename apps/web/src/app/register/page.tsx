import { redirect } from 'next/navigation';

/**
 * Register Page - Redirect
 *
 * Redirects /register to /signup for backwards compatibility.
 * All CTAs now point to /signup but external links may still use /register.
 */
export default function RegisterPage() {
  redirect('/signup');
}

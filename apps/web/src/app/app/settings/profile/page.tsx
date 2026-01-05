'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Loader2, Moon, Save, Sun } from 'lucide-react';
import { ProfilePageSkeleton } from '../components';
import { useTheme } from 'next-themes';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useUserManagement, ROLE_LABELS, ROLE_COLORS } from '@/lib/users';
import { useAuthStore } from '@/store';

// ============================================
// Schema
// ============================================

const profileSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido').max(50),
  lastName: z.string().min(1, 'El apellido es requerido').max(50),
  phone: z.string().max(20).optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ============================================
// Profile Page
// ============================================

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const {
    profile,
    isProfileLoading,
    updateProfileAsync,
    isUpdatingProfile,
    uploadAvatarAsync,
    isUploadingAvatar,
    refetchProfile,
  } = useUserManagement();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  // Avoid hydration mismatch for theme
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
    },
  });

  // Update form when profile loads
  React.useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, reset]);

  // Handle form submit
  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfileAsync(data);
      setSaveMessage('Perfil actualizado correctamente');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage('Error al actualizar el perfil');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Handle avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen valida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      await uploadAvatarAsync(formData);
      void refetchProfile();
    } catch {
      alert('Error al subir la imagen');
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profile?.fullName) {
      return profile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  if (isProfileLoading) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mi Perfil</h2>
        <p className="text-muted-foreground">
          Administra tu informacion personal y preferencias
        </p>
      </div>

      <Separator />

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Foto de Perfil</CardTitle>
          <CardDescription>
            Haz clic en la imagen para cambiar tu foto de perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                <AvatarImage alt={profile?.fullName || ''} src={profile?.avatarUrl} />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <button
                className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-md hover:bg-primary/90"
                disabled={isUploadingAvatar}
                type="button"
                onClick={handleAvatarClick}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                type="file"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="font-medium">{profile?.fullName || 'Usuario'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion Personal</CardTitle>
          <CardDescription>
            Actualiza tu informacion basica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              {/* First Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="firstName">
                  Nombre
                </label>
                <Input
                  disabled={isUpdatingProfile}
                  id="firstName"
                  placeholder="Juan"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="lastName">
                  Apellido
                </label>
                <Input
                  disabled={isUpdatingProfile}
                  id="lastName"
                  placeholder="Perez"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="phone">
                Telefono
              </label>
              <Input
                disabled={isUpdatingProfile}
                id="phone"
                placeholder="+52 555 123 4567"
                type="tel"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                disabled
                readOnly
                id="email"
                type="email"
                value={user?.email || ''}
              />
              <p className="text-xs text-muted-foreground">
                El email no puede ser modificado
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <Button disabled={!isDirty || isUpdatingProfile} type="submit">
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
              {saveMessage && (
                <p className={`text-sm ${saveMessage.includes('Error') ? 'text-destructive' : 'text-success'}`}>
                  {saveMessage}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Role & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Rol y Permisos</CardTitle>
          <CardDescription>
            Tu rol dentro de la organizacion y los permisos asignados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Rol Actual</p>
              <p className="text-sm text-muted-foreground">
                Define tus permisos en el sistema
              </p>
            </div>
            <Badge className={ROLE_COLORS[user?.role || 'viewer']}>
              {ROLE_LABELS[user?.role || 'viewer']}
            </Badge>
          </div>

          <Separator />

          {/* Tenant */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Organizacion</p>
              <p className="text-sm text-muted-foreground">
                Empresa a la que perteneces
              </p>
            </div>
            <p className="font-medium">{profile?.tenantName || user?.tenantName || 'N/A'}</p>
          </div>

          <Separator />

          {/* Permissions */}
          <div>
            <p className="mb-2 font-medium">Permisos</p>
            <div className="flex flex-wrap gap-2">
              {user?.permissions?.map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission.replace(/_/g, ' ')}
                </Badge>
              ))}
              {(!user?.permissions || user.permissions.length === 0) && (
                <p className="text-sm text-muted-foreground">Sin permisos asignados</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>
            Personaliza la apariencia de la aplicacion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme-toggle" className="text-base font-medium">
                Modo Oscuro
              </Label>
              <p className="text-sm text-muted-foreground">
                Activa el modo oscuro para reducir la fatiga visual
              </p>
            </div>
            {mounted && (
              <div className="flex items-center gap-3">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Switch
                  id="theme-toggle"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          <Separator />

          {/* Theme Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Seleccionar Tema</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-accent ${
                  theme === 'light' ? 'border-primary bg-accent' : 'border-transparent bg-muted/50'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                  <Sun className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-sm font-medium">Claro</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-accent ${
                  theme === 'dark' ? 'border-primary bg-accent' : 'border-transparent bg-muted/50'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 shadow-sm">
                  <Moon className="h-5 w-5 text-slate-300" />
                </div>
                <span className="text-sm font-medium">Oscuro</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-accent ${
                  theme === 'system' ? 'border-primary bg-accent' : 'border-transparent bg-muted/50'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white to-slate-800 shadow-sm">
                  <div className="h-4 w-4 rounded-full bg-primary" />
                </div>
                <span className="text-sm font-medium">Sistema</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              El tema &quot;Sistema&quot; sigue la configuracion de tu dispositivo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion de la Cuenta</CardTitle>
          <CardDescription>
            Detalles de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Miembro desde</p>
              <p className="font-medium">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ultimo acceso</p>
              <p className="font-medium">
                {profile?.lastLoginAt
                  ? new Date(profile.lastLoginAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

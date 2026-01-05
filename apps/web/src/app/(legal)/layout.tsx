import Image from 'next/image';
import Link from 'next/link';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-ventazo-500/20 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
              <Image
                alt="Ventazo logo"
                className="relative h-8 w-8 drop-shadow-md transition-transform group-hover:scale-105"
                height={32}
                src="/images/hero/logo.png"
                width={32}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold leading-tight">Ventazo</span>
              <span className="text-xs font-medium text-muted-foreground">
                by{' '}
                <span className="bg-gradient-to-r from-[#00cfff] to-[#00e5c3] bg-clip-text text-transparent font-semibold">
                  Zuclubit
                </span>
              </span>
            </div>
          </Link>
          <nav className="flex gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Términos
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacidad
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <Image
                alt="Ventazo logo"
                className="h-5 w-5"
                height={20}
                src="/images/hero/logo.png"
                width={20}
              />
              <span className="text-sm font-medium">
                Ventazo{' '}
                <span className="text-muted-foreground font-normal">by</span>{' '}
                <span className="bg-gradient-to-r from-[#00cfff] to-[#00e5c3] bg-clip-text text-transparent font-semibold">
                  Zuclubit
                </span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

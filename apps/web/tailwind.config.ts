import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	// Custom breakpoints including xs for very small mobile devices
  	screens: {
  		'xs': '375px',   // iPhone SE/Mini and similar small devices
  		'sm': '640px',   // Standard Tailwind breakpoint
  		'md': '768px',   // Tablets
  		'lg': '1024px',  // Small laptops
  		'xl': '1280px',  // Desktops
  		'2xl': '1536px', // Large screens
  	},
  	extend: {
  		colors: {
  			/* Ventazo Brand Colors - Teal Palette */
  			ventazo: {
  				'50': '#f0fdfa',
  				'100': '#ccfbf1',
  				'200': '#99f6e4',
  				'300': '#5eead4',
  				'400': '#2dd4bf',
  				'500': '#14b8a6',
  				'600': '#0d9488', /* Primary */
  				'700': '#0f766e', /* Deep Teal */
  				'800': '#115e59',
  				'900': '#134e4a',
  				'950': '#042f2e'
  			},
  			/* Coral Accent Palette */
  			coral: {
  				'50': '#fff7ed',
  				'100': '#ffedd5',
  				'200': '#fed7aa',
  				'300': '#fdba74',
  				'400': '#fb923c',
  				'500': '#f97316', /* Accent */
  				'600': '#ea580c',
  				'700': '#c2410c',
  				'800': '#9a3412',
  				'900': '#7c2d12',
  				'950': '#431407'
  			},
  			/* Legacy brand for backwards compatibility */
  			brand: {
  				'50': '#f0fdfa',
  				'100': '#ccfbf1',
  				'200': '#99f6e4',
  				'300': '#5eead4',
  				'400': '#2dd4bf',
  				'500': '#14b8a6',
  				'600': '#0d9488',
  				'700': '#0f766e',
  				'800': '#115e59',
  				'900': '#134e4a',
  				'950': '#042f2e'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-sans)',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-mono)',
  				'monospace'
  			]
  		},
  		fontSize: {
  			'2xs': [
  				'0.625rem',
  				{
  					lineHeight: '0.75rem'
  				}
  			]
  		},
  		spacing: {
  			'18': '4.5rem',
  			'88': '22rem',
  			'128': '32rem'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'slide-in-from-left': {
  				from: {
  					transform: 'translateX(-100%)'
  				},
  				to: {
  					transform: 'translateX(0)'
  				}
  			},
  			'slide-out-to-left': {
  				from: {
  					transform: 'translateX(0)'
  				},
  				to: {
  					transform: 'translateX(-100%)'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'fade-out': {
  				from: {
  					opacity: '1'
  				},
  				to: {
  					opacity: '0'
  				}
  			},
  			shimmer: {
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			pulse: {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '0.5'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0px)'
  				},
  				'50%': {
  					transform: 'translateY(-8px)'
  				}
  			},
  			'float-slow': {
  				'0%, 100%': {
  					transform: 'translateY(0px)'
  				},
  				'50%': {
  					transform: 'translateY(-6px)'
  				}
  			},
  			'glow-pulse': {
  				'0%, 100%': {
  					opacity: '0.4',
  					transform: 'scale(1)'
  				},
  				'50%': {
  					opacity: '0.7',
  					transform: 'scale(1.05)'
  				}
  			},
  			'fade-in-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(16px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			/* VENTAZO PREMIUM ANIMATIONS 2025 */
  			'flame-flicker': {
  				'0%, 100%': {
  					opacity: '0.8',
  					transform: 'scale(1) rotate(0deg)'
  				},
  				'25%': {
  					opacity: '1',
  					transform: 'scale(1.05) rotate(1deg)'
  				},
  				'50%': {
  					opacity: '0.9',
  					transform: 'scale(0.98) rotate(-1deg)'
  				},
  				'75%': {
  					opacity: '1',
  					transform: 'scale(1.02) rotate(0.5deg)'
  				}
  			},
  			'glow-breathe': {
  				'0%, 100%': {
  					boxShadow: '0 0 20px rgba(14, 181, 140, 0.2)'
  				},
  				'50%': {
  					boxShadow: '0 0 35px rgba(14, 181, 140, 0.4)'
  				}
  			},
  			'glow-hot-breathe': {
  				'0%, 100%': {
  					boxShadow: '0 0 15px rgba(255, 107, 53, 0.25)'
  				},
  				'50%': {
  					boxShadow: '0 0 28px rgba(255, 107, 53, 0.45)'
  				}
  			},
  			'border-shimmer': {
  				'0%': {
  					backgroundPosition: '200% 0'
  				},
  				'100%': {
  					backgroundPosition: '-200% 0'
  				}
  			},
  			'scale-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			'slide-up-fade': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(8px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'card-hover-lift': {
  				'0%': {
  					transform: 'translateY(0)'
  				},
  				'100%': {
  					transform: 'translateY(-4px)'
  				}
  			},
  			'ripple': {
  				'0%': {
  					transform: 'scale(0)',
  					opacity: '0.5'
  				},
  				'100%': {
  					transform: 'scale(4)',
  					opacity: '0'
  				}
  			},
  			'score-pop': {
  				'0%': {
  					transform: 'scale(0.8)',
  					opacity: '0'
  				},
  				'50%': {
  					transform: 'scale(1.1)'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			'badge-bounce': {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-2px)'
  				}
  			},
  			/* VENTAZO KANBAN CARD ANIMATIONS */
  			'card-enter': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(8px) scale(0.98)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0) scale(1)'
  				}
  			},
  			'pulse-soft': {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '0.92'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
  			'slide-out-to-left': 'slide-out-to-left 0.3s ease-out',
  			'fade-in': 'fade-in 0.2s ease-out',
  			'fade-out': 'fade-out 0.2s ease-out',
  			shimmer: 'shimmer 2s infinite',
  			pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			float: 'float 4s ease-in-out infinite',
  			'float-slow': 'float-slow 5s ease-in-out infinite',
  			'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
  			'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
  			/* VENTAZO PREMIUM ANIMATIONS */
  			'flame-flicker': 'flame-flicker 2s ease-in-out infinite',
  			'glow-breathe': 'glow-breathe 3s ease-in-out infinite',
  			'glow-hot-breathe': 'glow-hot-breathe 2.5s ease-in-out infinite',
  			'border-shimmer': 'border-shimmer 3s linear infinite',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'slide-up-fade': 'slide-up-fade 0.3s ease-out',
  			'card-hover-lift': 'card-hover-lift 0.2s ease-out forwards',
  			'ripple': 'ripple 0.6s ease-out',
  			'score-pop': 'score-pop 0.3s ease-out forwards',
  			'badge-bounce': 'badge-bounce 0.5s ease-in-out',
  			/* VENTAZO KANBAN CARD ANIMATIONS */
  			'card-enter': 'card-enter 0.25s ease-out forwards',
  			'pulse-soft': 'pulse-soft 3s ease-in-out infinite'
  		},
  		boxShadow: {
  			'inner-sm': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;

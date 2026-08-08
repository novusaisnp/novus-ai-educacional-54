import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
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
				'accent-warm': {
					DEFAULT: 'hsl(var(--accent-warm))',
					foreground: 'hsl(var(--accent-warm-foreground))'
				},
				'accent-gold': {
					DEFAULT: 'hsl(var(--accent-gold))',
					foreground: 'hsl(var(--accent-gold-foreground))'
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
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
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
			boxShadow: {
				/* Sombra em 3 camadas (contato + difusão média + difusão longa
				   ambiente) tingida de teal + leve realce interno no topo — dá
				   sensação de "flutuando", substituindo borda de 1px + shadow-sm
				   quase invisível do Tailwind (o padrão nº1 de "cara de admin
				   panel"). Ver skill novus-satellite-visual-identity. */
				card: '0 1px 1px hsl(var(--primary) / 0.05), 0 10px 22px -14px hsl(var(--primary) / 0.32), 0 28px 44px -30px hsl(var(--primary) / 0.28), inset 0 1px 0 hsl(0 0% 100% / 0.7)',
				/* Variante maior pro card-âncora de um layout bento. */
				'card-hero': '0 2px 2px hsl(var(--primary) / 0.06), 0 16px 32px -16px hsl(var(--primary) / 0.4), 0 40px 64px -36px hsl(var(--primary) / 0.35)',
				totem: '0 4px 12px -5px hsl(var(--primary) / 0.4), inset 0 1px 1px hsl(0 0% 100% / 0.4)'
			},
			fontFamily: {
				sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				display: ['Sora', 'Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif']
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
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;

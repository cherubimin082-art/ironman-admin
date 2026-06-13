// tailwind.config.js - add this
module.exports = {
    theme: {
        extend: {
            colors: {
                iron: {
                    50: '#f0f4f8',
                    100: '#d9e2ec',
                    200: '#bcccd9',
                    300: '#9fb3c8',
                    400: '#829ab1',
                    500: '#627d98',
                    600: '#486581',
                    700: '#334e68',
                    800: '#243b53',
                    900: '#102a43',
                },
                'smart-iron': {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                }
            },
            fontFamily: {
                'inter': ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'glow': 'glow 2s ease-in-out infinite',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                glow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(59,130,246,0.3)' },
                    '50%': { boxShadow: '0 0 20px rgba(59,130,246,0.6)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
            },
        },
    },
}
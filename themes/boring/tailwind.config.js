const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./templates/**/*.html", "./theme/**/*.html", "./**/*.html", "./blog/**/*.html"],
    darkMode: 'class',
    theme: {
        container: {
            center: true,
            screens: {
                lg: '800px',
                xl: '900px',
                '2xl': '900px',
            },
        },
        fontFamily: {
            serif: ['"Berkeley Mono"', ...defaultTheme.fontFamily.mono],
            sans: ['"Berkeley Mono"', ...defaultTheme.fontFamily.mono],
            mono: ['"Berkeley Mono"', ...defaultTheme.fontFamily.mono],
        },
        extend: {
            colors: {
                'rp': {
                    'base': '#faf4ed',
                    'surface': '#fffaf3',
                    'overlay': '#f2e9e1',
                    'muted': '#9893a5',
                    'subtle': '#797593',
                    'text': '#575279',
                    'love': '#b4637a',
                    'gold': '#ea9d34',
                    'rose': '#d7827e',
                    'pine': '#286983',
                    'foam': '#56949f',
                    'iris': '#907aa9',
                    'hl-low': '#f4ede8',
                    'hl-med': '#dfdad9',
                    'hl-high': '#cecacd',
                },
            },
        },
    },
    variants: {},
    plugins: [
        require('@tailwindcss/typography'),
    ],
};

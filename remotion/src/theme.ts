/**
 * Ginko Brand Theme
 * Based on the ginko website design tokens
 */

export const theme = {
	// Colors
	colors: {
		// Light mode
		bgLight: '#BAC6A9',      // Sage green
		surfaceLight: '#BAC6A9',
		textLight: '#0A0A0A',     // Near black

		// Dark mode
		bgDark: '#151e28',        // Dark navy
		surfaceDark: '#151e28',
		textDark: '#f6ffd6',      // Cream

		// Accent - Ginko Green (Electric Lime)
		accent: '#D0F549',
		accentHover: '#addc00',

		// Terminal
		terminalBg: '#171717',
		terminalText: '#BAC6A9',
		terminalPrompt: '#D0F549',

		// Semantic
		success: '#22C55E',
		warning: '#F59E0B',
		danger: '#EF4444',
		info: '#3B82F6',
	},

	// Typography
	fonts: {
		mono: "'JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace",
	},

	// Font sizes (in pixels for video)
	fontSizes: {
		xs: 12,
		sm: 14,
		base: 16,
		lg: 18,
		xl: 20,
		'2xl': 24,
		'3xl': 32,
		'4xl': 40,
		'5xl': 48,
		'6xl': 56,
		'7xl': 72,
		'8xl': 96,
	},

	// Spacing
	space: {
		1: 4,
		2: 8,
		3: 12,
		4: 16,
		5: 20,
		6: 24,
		8: 32,
		10: 40,
		12: 48,
		16: 64,
		20: 80,
		24: 96,
	},
};

// Convenience style objects
export const baseStyles = {
	container: {
		fontFamily: theme.fonts.mono,
		backgroundColor: theme.colors.bgDark,
		color: theme.colors.textDark,
	},

	heading: {
		fontFamily: theme.fonts.mono,
		fontWeight: 700,
		color: theme.colors.textDark,
	},

	accent: {
		color: theme.colors.accent,
	},

	terminal: {
		fontFamily: theme.fonts.mono,
		backgroundColor: theme.colors.terminalBg,
		color: theme.colors.terminalText,
		padding: theme.space[6],
		borderRadius: 8,
	},
};

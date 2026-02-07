import {
	AbsoluteFill,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	spring,
	Sequence,
	Img,
	staticFile,
} from 'remotion';
import {loadFont} from '@remotion/google-fonts/SpaceMono';
import {theme} from './theme';

// Load Space Mono for IYKYG (italic style applied via CSS)
const {fontFamily: spaceMono} = loadFont();

export const GinkoIntro: React.FC = () => {
	const frame = useCurrentFrame();

	return (
		<AbsoluteFill
			style={{
				backgroundColor: theme.colors.bgDark,
			}}
		>
			{/* Background accent glow - follows content */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					width: 800,
					height: 800,
					borderRadius: '50%',
					background: `radial-gradient(circle, ${theme.colors.accent}10 0%, transparent 70%)`,
					filter: 'blur(80px)',
				}}
			/>

			{/* Scene 1: Logo (0-90 frames / 0-3 sec) */}
			<Sequence from={0} durationInFrames={90}>
				<LogoScene />
			</Sequence>

			{/* Scene 2: Tagline (90-180 frames / 3-6 sec) */}
			<Sequence from={90} durationInFrames={90}>
				<TaglineScene />
			</Sequence>

			{/* Scene 3: Features (180-300 frames / 6-10 sec) */}
			<Sequence from={180} durationInFrames={120}>
				<FeaturesScene />
			</Sequence>

			{/* Scene 4: IYKYG ending (300-450 frames / 10-15 sec) */}
			<Sequence from={300} durationInFrames={150}>
				<IYKYGScene />
			</Sequence>

			{/* Corner brackets throughout */}
			<CornerBrackets frame={frame} />
		</AbsoluteFill>
	);
};

// Logo Scene - with glow animation
const LogoScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Fade in
	const opacity = interpolate(frame, [0, 20], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	// Scale with spring
	const scale = spring({
		fps,
		frame,
		config: {
			damping: 100,
			stiffness: 80,
		},
	});

	// Subtle glow pulse
	const glowIntensity = interpolate(
		frame,
		[20, 40, 60, 80],
		[0.3, 0.6, 0.4, 0.5],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	// Fade out at end
	const fadeOut = interpolate(frame, [70, 90], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			{/* Glow behind logo */}
			<div
				style={{
					position: 'absolute',
					width: 500,
					height: 200,
					background: `radial-gradient(ellipse, ${theme.colors.accent}${Math.round(glowIntensity * 40).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
					filter: 'blur(40px)',
					opacity: opacity * fadeOut,
				}}
			/>
			<div
				style={{
					opacity: opacity * fadeOut,
					transform: `scale(${scale})`,
				}}
			>
				<Img
					src={staticFile('ginko-logo.svg')}
					style={{
						width: 450,
						height: 'auto',
					}}
				/>
			</div>
		</AbsoluteFill>
	);
};

// Tagline Scene
const TaglineScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Fade in
	const opacity = interpolate(frame, [0, 20], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	// Slide up
	const y = spring({
		fps,
		frame,
		config: {
			damping: 100,
			stiffness: 80,
		},
	});

	// Fade out
	const fadeOut = interpolate(frame, [70, 90], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			<div
				style={{
					opacity: opacity * fadeOut,
					transform: `translateY(${(1 - y) * 40}px)`,
					fontFamily: theme.fonts.mono,
					fontSize: theme.fontSizes['4xl'],
					color: theme.colors.textDark,
					textAlign: 'center',
					lineHeight: 1.5,
				}}
			>
				AI-assisted development
				<br />
				<span style={{color: theme.colors.accent, fontWeight: 700}}>
					without the chaos
				</span>
			</div>
		</AbsoluteFill>
	);
};

// Features Scene
const FeaturesScene: React.FC = () => {
	const frame = useCurrentFrame();

	const features = [
		'Context that persists',
		'Decisions that stick',
		'Teams that sync',
	];

	// Fade out
	const fadeOut = interpolate(frame, [100, 120], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				opacity: fadeOut,
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 36,
					alignItems: 'center',
				}}
			>
				{features.map((feature, i) => {
					const featureFrame = frame - i * 20;
					const featureOpacity = interpolate(
						featureFrame,
						[0, 20],
						[0, 1],
						{
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						}
					);
					const featureX = interpolate(
						featureFrame,
						[0, 20],
						[-40, 0],
						{
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						}
					);

					return (
						<div
							key={feature}
							style={{
								opacity: featureOpacity,
								transform: `translateX(${featureX}px)`,
								fontFamily: theme.fonts.mono,
								fontSize: theme.fontSizes['2xl'],
								color: theme.colors.textDark,
								display: 'flex',
								alignItems: 'center',
								gap: 16,
							}}
						>
							<span style={{color: theme.colors.accent, fontSize: 28}}>→</span>
							{feature}
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

// IYKYG Scene - letters pop in with musical rhythm
// 100 BPM: 1/8 = 9 frames, 1/16 = 5 frames, dotted 1/8 = 14 frames
// Pattern: i(1/8), y(1/8), k(1/16), y(dotted 1/8), g(1/8), rest(1/8), leaf(1/8)
const IYKYGScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Timing for each element (cumulative frame when it appears)
	// i: 0, y: 9, k: 18, y: 23, g: 37, rest, leaf: 55
	const timings = {
		i: 0,
		y1: 9,
		k: 18,
		y2: 23,
		g: 37,
		leaf: 55,
	};

	// Pop animation for each letter
	const popScale = (startFrame: number) => {
		const localFrame = frame - startFrame;
		if (localFrame < 0) return 0;

		return spring({
			fps,
			frame: localFrame,
			config: {
				damping: 12,
				stiffness: 200,
				mass: 0.5,
			},
		});
	};

	// Website URL fade in
	const urlOpacity = interpolate(frame, [80, 100], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const letterStyle = {
		fontFamily: spaceMono,
		fontSize: 120,
		fontWeight: 700,
		fontStyle: 'italic' as const,
		display: 'inline-block',
	};

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 40,
				}}
			>
				{/* IYKYG text */}
				<div style={{display: 'flex', alignItems: 'flex-end'}}>
					{/* i */}
					<span
						style={{
							...letterStyle,
							color: theme.colors.textDark,
							opacity: 0.7,
							transform: `scale(${popScale(timings.i)})`,
						}}
					>
						i
					</span>
					{/* y */}
					<span
						style={{
							...letterStyle,
							color: theme.colors.textDark,
							opacity: 0.7,
							transform: `scale(${popScale(timings.y1)})`,
						}}
					>
						y
					</span>
					{/* k */}
					<span
						style={{
							...letterStyle,
							color: theme.colors.textDark,
							opacity: 0.7,
							transform: `scale(${popScale(timings.k)})`,
						}}
					>
						k
					</span>
					{/* y */}
					<span
						style={{
							...letterStyle,
							color: theme.colors.textDark,
							opacity: 0.7,
							transform: `scale(${popScale(timings.y2)})`,
						}}
					>
						y
					</span>
					{/* g with leaf - extra margin to make room for leaf */}
					<span
						style={{
							...letterStyle,
							color: theme.colors.accent,
							transform: `scale(${popScale(timings.g)})`,
							position: 'relative',
							marginLeft: 20,
						}}
					>
						g
						{/* Leaf grows from inside top of the g */}
						<Img
							src={staticFile('iykyg-leaf.svg')}
							style={{
								position: 'absolute',
								top: 35,
								left: -30,
								width: 70,
								height: 'auto',
								transform: `scale(${popScale(timings.leaf)})`,
								transformOrigin: 'bottom center',
							}}
						/>
					</span>
				</div>

				{/* Website URL */}
				<div
					style={{
						fontFamily: theme.fonts.mono,
						fontSize: theme.fontSizes.xl,
						color: theme.colors.accent,
						opacity: urlOpacity,
					}}
				>
					ginkoai.com
				</div>
			</div>
		</AbsoluteFill>
	);
};

// Corner brackets component
const CornerBrackets: React.FC<{frame: number}> = ({frame}) => {
	const opacity = interpolate(frame, [0, 30], [0, 0.6], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const bracketStyle = {
		position: 'absolute' as const,
		width: 35,
		height: 35,
		borderColor: theme.colors.accent,
		borderStyle: 'solid',
		opacity,
	};

	return (
		<>
			<div style={{...bracketStyle, top: 50, left: 50, borderWidth: '2px 0 0 2px'}} />
			<div style={{...bracketStyle, top: 50, right: 50, borderWidth: '2px 2px 0 0'}} />
			<div style={{...bracketStyle, bottom: 50, left: 50, borderWidth: '0 0 2px 2px'}} />
			<div style={{...bracketStyle, bottom: 50, right: 50, borderWidth: '0 2px 2px 0'}} />
		</>
	);
};

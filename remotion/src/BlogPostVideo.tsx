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

// Load Space Mono for IYKYG
const {fontFamily: spaceMono} = loadFont();

interface BlogPostVideoProps {
	title: string;
	subtitle: string;
	author: string;
	date: string;
}

export const BlogPostVideo: React.FC<BlogPostVideoProps> = ({
	title,
	subtitle,
	author,
	date,
}) => {
	const frame = useCurrentFrame();

	return (
		<AbsoluteFill style={{backgroundColor: theme.colors.bgDark}}>
			{/* Background glow */}
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

			{/* Scene 2: Title reveal (90-240 frames / 3-8 sec) */}
			<Sequence from={90} durationInFrames={150}>
				<TitleScene title={title} subtitle={subtitle} />
			</Sequence>

			{/* Scene 3: The Problem (240-420 frames / 8-14 sec) */}
			<Sequence from={240} durationInFrames={180}>
				<ProblemScene />
			</Sequence>

			{/* Scene 4: The Pain Points (420-660 frames / 14-22 sec) */}
			<Sequence from={420} durationInFrames={240}>
				<PainPointsScene />
			</Sequence>

			{/* Scene 5: The Solution - ginko (660-840 frames / 22-28 sec) */}
			<Sequence from={660} durationInFrames={180}>
				<SolutionScene />
			</Sequence>

			{/* Scene 6: IYKYG ending (840-990 frames / 28-33 sec) */}
			<Sequence from={840} durationInFrames={150}>
				<IYKYGScene />
			</Sequence>

			{/* Corner brackets throughout */}
			<CornerBrackets frame={frame} />
		</AbsoluteFill>
	);
};

// Logo Scene
const LogoScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const opacity = interpolate(frame, [0, 20], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const scale = spring({
		fps,
		frame,
		config: {damping: 100, stiffness: 80},
	});

	const fadeOut = interpolate(frame, [70, 90], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
			<div style={{opacity: opacity * fadeOut, transform: `scale(${scale})`}}>
				<Img
					src={staticFile('ginko-logo.svg')}
					style={{width: 450, height: 'auto'}}
				/>
			</div>
		</AbsoluteFill>
	);
};

// Title Scene - BIGGER FONTS
const TitleScene: React.FC<{title: string; subtitle: string}> = ({
	title,
	subtitle,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const titleY = spring({fps, frame, config: {damping: 200}});

	const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const fadeOut = interpolate(frame, [130, 150], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{justifyContent: 'center', alignItems: 'center', padding: 80}}
		>
			<div
				style={{
					opacity: titleOpacity * fadeOut,
					transform: `translateY(${(1 - titleY) * 50}px)`,
					textAlign: 'center',
				}}
			>
				<h1
					style={{
						fontFamily: theme.fonts.mono,
						fontSize: 72, // Much bigger
						fontWeight: 800,
						color: theme.colors.textDark,
						lineHeight: 1.1,
						marginBottom: 32,
					}}
				>
					{title}
				</h1>
				<h2
					style={{
						fontFamily: theme.fonts.mono,
						fontSize: 56, // Much bigger
						fontWeight: 600,
						color: theme.colors.accent,
						opacity: subtitleOpacity,
					}}
				>
					{subtitle}
				</h2>
			</div>
		</AbsoluteFill>
	);
};

// Problem Scene - BIGGER FONTS
const ProblemScene: React.FC = () => {
	const frame = useCurrentFrame();

	const textOpacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const fadeOut = interpolate(frame, [150, 180], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{justifyContent: 'center', alignItems: 'center', padding: 80}}
		>
			<div
				style={{
					opacity: textOpacity * fadeOut,
					textAlign: 'center',
					maxWidth: 1400,
				}}
			>
				<p
					style={{
						fontFamily: theme.fonts.mono,
						fontSize: 48, // Much bigger
						color: theme.colors.textDark,
						lineHeight: 1.5,
						marginBottom: 60,
					}}
				>
					AI assistants are transforming how we build software...
				</p>
				<p
					style={{
						fontFamily: theme.fonts.mono,
						fontSize: 64, // Much bigger
						fontWeight: 700,
						color: theme.colors.accent,
					}}
				>
					But they have a critical flaw
				</p>
			</div>
		</AbsoluteFill>
	);
};

// Pain Points Scene - BIGGER FONTS
const PainPointsScene: React.FC = () => {
	const frame = useCurrentFrame();

	const painPoints = [
		{icon: '🔄', text: 'Re-explaining context every session'},
		{icon: '📝', text: 'Lost decisions and tribal knowledge'},
		{icon: '👥', text: 'Team members out of sync'},
		{icon: '⏱️', text: 'Wasted time rebuilding understanding'},
	];

	const fadeOut = interpolate(frame, [210, 240], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				padding: 80,
				opacity: fadeOut,
			}}
		>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 40,
					maxWidth: 1600,
				}}
			>
				{painPoints.map((point, i) => {
					const pointFrame = frame - i * 30;
					const opacity = interpolate(pointFrame, [0, 30], [0, 1], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					});
					const x = interpolate(pointFrame, [0, 30], [-50, 0], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					});

					return (
						<div
							key={i}
							style={{
								opacity,
								transform: `translateX(${x}px)`,
								display: 'flex',
								alignItems: 'center',
								gap: 32,
								backgroundColor: `${theme.colors.accent}10`,
								padding: 40,
								borderRadius: 16,
								border: `2px solid ${theme.colors.accent}30`,
							}}
						>
							<span style={{fontSize: 64}}>{point.icon}</span>
							<span
								style={{
									fontFamily: theme.fonts.mono,
									fontSize: 32, // Much bigger
									color: theme.colors.textDark,
								}}
							>
								{point.text}
							</span>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

// Solution Scene - BIGGER FONTS
const SolutionScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const scale = spring({fps, frame, config: {damping: 200}});

	const opacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const fadeOut = interpolate(frame, [150, 180], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const features = [
		'Persistent context across sessions',
		'Captured decisions and patterns',
		'Team-wide knowledge sync',
	];

	return (
		<AbsoluteFill
			style={{justifyContent: 'center', alignItems: 'center', padding: 80}}
		>
			<div
				style={{
					opacity: opacity * fadeOut,
					transform: `scale(${scale})`,
					textAlign: 'center',
				}}
			>
				<div
					style={{
						fontFamily: theme.fonts.mono,
						fontSize: 96, // Much bigger
						fontWeight: 800,
						color: theme.colors.textDark,
						marginBottom: 32,
					}}
				>
					ginko
				</div>
				<div
					style={{
						fontFamily: theme.fonts.mono,
						fontSize: 40, // Much bigger
						color: theme.colors.accent,
						marginBottom: 48,
					}}
				>
					The fix is here
				</div>

				<div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
					{features.map((feature, i) => {
						const featureFrame = frame - 60 - i * 15;
						const featureOpacity = interpolate(featureFrame, [0, 20], [0, 1], {
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						});

						return (
							<div
								key={i}
								style={{
									opacity: featureOpacity,
									fontFamily: theme.fonts.mono,
									fontSize: 32, // Much bigger
									color: theme.colors.textDark,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 16,
								}}
							>
								<span style={{color: theme.colors.accent, fontSize: 36}}>✓</span>
								{feature}
							</div>
						);
					})}
				</div>
			</div>
		</AbsoluteFill>
	);
};

// IYKYG Scene - same as intro
const IYKYGScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Timing for each element at 100 BPM
	const timings = {
		i: 0,
		y1: 9,
		k: 18,
		y2: 23,
		g: 37,
		leaf: 55,
	};

	const popScale = (startFrame: number) => {
		const localFrame = frame - startFrame;
		if (localFrame < 0) return 0;
		return spring({
			fps,
			frame: localFrame,
			config: {damping: 12, stiffness: 200, mass: 0.5},
		});
	};

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
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 40,
				}}
			>
				<div style={{display: 'flex', alignItems: 'flex-end'}}>
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

// Corner brackets
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

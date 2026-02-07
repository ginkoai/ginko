import {Composition} from 'remotion';
import {GinkoIntro} from './GinkoIntro';
import {BlogPostVideo} from './BlogPostVideo';

export const Root: React.FC = () => {
	return (
		<>
			{/* Ginko Intro Teaser - 15 seconds at 30fps = 450 frames */}
			<Composition
				id="GinkoIntro"
				component={GinkoIntro}
				durationInFrames={450}
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{}}
			/>

			{/* Blog Post: Why AI Assistants Forget - 33 seconds = 990 frames */}
			<Composition
				id="WhyAIForgets"
				component={BlogPostVideo}
				durationInFrames={990}
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{
					title: "Why AI Assistants Forget Everything",
					subtitle: "(And How to Fix It)",
					author: "Chris Norton",
					date: "December 10, 2025"
				}}
			/>
		</>
	);
};

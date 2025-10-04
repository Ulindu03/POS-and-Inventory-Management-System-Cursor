// Ambient module declarations for libraries without bundled types
// These shims allow our TS build to import them without errors

declare module 'react-webcam' {
	import * as React from 'react';
	type WebcamProps = React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> & {
		audio?: boolean;
		screenshotFormat?: string;
		videoConstraints?: MediaTrackConstraints;
	};
	class Webcam extends React.Component<WebcamProps> {
		video?: HTMLVideoElement | null;
		getScreenshot(): string | null;
	}
	export default Webcam;
}

declare module 'face-api.js' {
	export const nets: any;
	export class TinyFaceDetectorOptions {
		constructor(config?: { inputSize?: number; scoreThreshold?: number });
	}
	export function detectSingleFace(
		input: any,
		options?: any
	): any;
	export function withFaceLandmarks(): any;
	export function withFaceDescriptor(): any;
}

// Fallback types for lucide-react if missing
declare module 'lucide-react';
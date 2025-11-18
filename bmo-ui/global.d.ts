declare module "*.css";

declare global {
	type SpeechRecognitionConstructor = new () => SpeechRecognition;

	interface SpeechRecognition extends EventTarget {
		lang: string;
		continuous: boolean;
		interimResults: boolean;
		maxAlternatives: number;
		onresult: ((event: SpeechRecognitionEvent) => void) | null;
		onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
		onend: (() => void) | null;
		start(): void;
		stop(): void;
		abort(): void;
	}

	interface SpeechRecognitionEvent extends Event {
		resultIndex: number;
		results: SpeechRecognitionResultList;
	}

	interface SpeechRecognitionErrorEvent extends Event {
		error?: string;
		message?: string;
	}

	interface SpeechRecognitionResultList {
		length: number;
		item(index: number): SpeechRecognitionResult;
		[index: number]: SpeechRecognitionResult;
	}

	interface SpeechRecognitionResult {
		isFinal: boolean;
		item(index: number): SpeechRecognitionAlternative;
		[index: number]: SpeechRecognitionAlternative;
	}

	interface SpeechRecognitionAlternative {
		transcript: string;
		confidence: number;
	}

	interface Window {
		SpeechRecognition?: SpeechRecognitionConstructor;
		webkitSpeechRecognition?: SpeechRecognitionConstructor;
	}
}

export {};

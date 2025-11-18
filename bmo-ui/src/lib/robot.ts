export type RobotMode =
  | "IDLE"
  | "LISTENING"
  | "PROCESSING"
  | "SPEAKING"
  | "NAVIGATING"
  | "ERROR";

export const modeCopy: Record<RobotMode, string> = {
  IDLE: "Awaiting interaction",
  LISTENING: "Listening...",
  PROCESSING: "Thinking...",
  SPEAKING: "Sharing directions",
  NAVIGATING: "Guiding the tour",
  ERROR: "Something went wrong",
};

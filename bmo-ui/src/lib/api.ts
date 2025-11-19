const RAW_API_BASE = process.env.NEXT_PUBLIC_BMO_API_BASE ?? "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/$/, "");
const CONVERSATION_BASE = `${API_BASE}/api/v1/conversation`;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Unexpected API error");
  }
  return (await res.json()) as T;
}

export type WakeResponse = {
  session_id: string;
  message: string;
};

export type Emotion = "happy" | "thinking" | "neutral" | "witty";

export type NavigationDisplay = {
  target_building: string;
  zone_color: "Yellow" | "Red" | "Blue" | string;
  direction_guide: string;
};

export type RespondPayload = {
  session_id: string;
  transcript: string;
  narration: string;
  destination: string;
  directions: string[];
  mode: string;
  thought?: string;
  emotion?: Emotion;
  navigation_display?: NavigationDisplay;
  speech?: {
    mime_type: string;
    base64: string;
  };
};

export async function wakeSession(): Promise<WakeResponse> {
  return handleResponse(
    await fetch(`${CONVERSATION_BASE}/wake`, {
      method: "POST",
    })
  );
}

export async function sendTranscript(
  sessionId: string,
  transcript: string
): Promise<RespondPayload> {
  return handleResponse(
    await fetch(`${CONVERSATION_BASE}/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session_id: sessionId, transcript }),
    })
  );
}

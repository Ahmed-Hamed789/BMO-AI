const API_BASE = process.env.NEXT_PUBLIC_BMO_API_BASE ?? "http://localhost:8000";
const CONVERSATION_BASE = `${API_BASE}/api/v1/conversation`;
const TRANSCRIPTION_URL = `${API_BASE}/api/v1/transcription`;

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

export type RespondPayload = {
  session_id: string;
  transcript: string;
  narration: string;
  destination: string;
  directions: string[];
  mode: string;
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

export type TranscriptionResponse = {
  transcript: string;
};

export async function transcribeAudio(blob: Blob): Promise<TranscriptionResponse> {
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");

  return handleResponse(
    await fetch(TRANSCRIPTION_URL, {
      method: "POST",
      body: formData,
    })
  );
}

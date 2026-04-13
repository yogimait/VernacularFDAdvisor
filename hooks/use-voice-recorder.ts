"use client";

import { useState, useRef, useCallback } from "react";

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Mic access denied:", error);
      throw new Error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error("No recorder"));
        return;
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        setIsRecording(false);

        // Check size limit (<25MB)
        if (audioBlob.size > 25 * 1024 * 1024) {
          reject(new Error("Audio too large (max 25MB)"));
          return;
        }

        setIsTranscribing(true);

        try {
          // Send to transcription API
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Transcription failed");
          }

          resolve(data.text || "");
        } catch (error) {
          reject(error);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      mediaRecorder.stop();
    }
    setIsRecording(false);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

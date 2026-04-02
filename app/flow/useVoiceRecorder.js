"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOICE_ATTACHMENT_LIMIT_BYTES,
  VOICE_ATTACHMENT_LIMIT_CHARS,
  VOICE_RECORDING_LIMIT_SECONDS,
} from "../../lib/flow/constants";

function getSupportedVoiceMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
  const options = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  return options.find((value) => typeof MediaRecorder.isTypeSupported !== "function" || MediaRecorder.isTypeSupported(value)) || "";
}

const EMPTY_DRAFT = { url: "", mimeType: "", durationSec: 0, size: 0 };
const EMPTY_STATE = { supported: false, recording: false, processing: false, seconds: 0 };

export function useVoiceRecorder({ toast, onRecordStart }) {
  const [voiceDraft, setVoiceDraft] = useState(EMPTY_DRAFT);
  const [voiceState, setVoiceState] = useState(EMPTY_STATE);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);

  const stopVoiceStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const resetVoiceRecorder = useCallback(() => {
    stopVoiceStream();
    chunksRef.current = [];
    recorderRef.current = null;
    startedAtRef.current = 0;
    setVoiceState((prev) => ({ ...prev, recording: false, processing: false, seconds: 0 }));
  }, [stopVoiceStream]);

  const clearVoiceDraft = useCallback(() => {
    setVoiceDraft(EMPTY_DRAFT);
  }, []);

  const stopVoiceRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setVoiceState((prev) => ({ ...prev, processing: true }));
    recorder.stop();
  }, []);

  const cancelVoiceRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {}
    }
    clearVoiceDraft();
    resetVoiceRecorder();
  }, [clearVoiceDraft, resetVoiceRecorder]);

  const startVoiceRecording = useCallback(async () => {
    if (!voiceState.supported) {
      toast?.("Le micro n'est pas disponible sur cet appareil", "err");
      return;
    }
    if (voiceState.recording || voiceState.processing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedVoiceMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      onRecordStart?.();
      clearVoiceDraft();
      setVoiceState((prev) => ({ ...prev, recording: true, processing: false, seconds: 0 }));

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        resetVoiceRecorder();
        toast?.("Enregistrement vocal interrompu", "err");
      };

      recorder.onstop = async () => {
        const durationSec = Math.max(1, Math.round((Date.now() - (startedAtRef.current || Date.now())) / 1000));
        const chunks = [...chunksRef.current];
        const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
        stopVoiceStream();
        recorderRef.current = null;
        chunksRef.current = [];

        if (!chunks.length) {
          setVoiceState((prev) => ({ ...prev, recording: false, processing: false, seconds: 0 }));
          return;
        }

        const blob = new Blob(chunks, { type: finalMimeType });
        if (durationSec > VOICE_RECORDING_LIMIT_SECONDS) {
          setVoiceState((prev) => ({ ...prev, recording: false, processing: false, seconds: 0 }));
          toast?.(`Message vocal limite a ${VOICE_RECORDING_LIMIT_SECONDS}s`, "err");
          return;
        }
        if (blob.size > VOICE_ATTACHMENT_LIMIT_BYTES) {
          setVoiceState((prev) => ({ ...prev, recording: false, processing: false, seconds: 0 }));
          toast?.("Vocal trop lourd, gardez un message plus court", "err");
          return;
        }

        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(`${reader.result || ""}`);
            reader.onerror = () => reject(new Error("Lecture audio impossible"));
            reader.readAsDataURL(blob);
          });

          if (!dataUrl || dataUrl.length > VOICE_ATTACHMENT_LIMIT_CHARS) {
            throw new Error("Vocal trop volumineux");
          }

          setVoiceDraft({
            url: dataUrl,
            mimeType: finalMimeType,
            durationSec,
            size: blob.size,
          });
          toast?.("Message vocal pret a etre envoye");
        } catch {
          toast?.("Impossible de preparer ce vocal", "err");
        } finally {
          setVoiceState((prev) => ({ ...prev, recording: false, processing: false, seconds: 0 }));
        }
      };

      recorder.start(250);
      timerRef.current = setInterval(() => {
        const elapsed = Math.max(0, Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000));
        setVoiceState((prev) => ({ ...prev, seconds: elapsed }));
        if (elapsed >= VOICE_RECORDING_LIMIT_SECONDS && recorder.state !== "inactive") {
          recorder.stop();
        }
      }, 250);
    } catch {
      resetVoiceRecorder();
      toast?.("Autorisez le micro pour envoyer un vocal", "err");
    }
  }, [clearVoiceDraft, onRecordStart, resetVoiceRecorder, stopVoiceStream, toast, voiceState.processing, voiceState.recording, voiceState.supported]);

  useEffect(() => {
    setVoiceState((prev) => ({
      ...prev,
      supported: typeof window !== "undefined"
        && typeof MediaRecorder !== "undefined"
        && !!navigator.mediaDevices?.getUserMedia,
    }));
  }, []);

  useEffect(() => () => resetVoiceRecorder(), [resetVoiceRecorder]);

  return {
    clearVoiceDraft,
    cancelVoiceRecording,
    resetVoiceRecorder,
    startVoiceRecording,
    stopVoiceRecording,
    voiceDraft,
    voiceState,
  };
}

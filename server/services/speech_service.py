import os
import base64
import requests
from flask import current_app

LOCALE_MAP = {
    "en": "en-IN",
    "hi": "hi-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "mr": "mr-IN",
    "bn": "bn-IN",
    "gu": "gu-IN",
    "pa": "pa-IN",
    "ur": "ur-IN",
}

def sarvam_transcribe(audio_bytes: bytes, language="en") -> str:
    config = current_app.config
    sarvam_key = config.get("SARVAM_API_KEY")
    if not sarvam_key:
        return ""

    url = "https://api.sarvam.ai/speech-to-text"
    headers = {
        "api-subscription-key": sarvam_key,
    }
    locale = LOCALE_MAP.get(language, "en-IN")
    files = {
        "file": ("recording.wav", audio_bytes, "audio/wav")
    }
    data = {
        "model": "saaras:v3",
        "language_code": locale,
    }

    try:
        resp = requests.post(url, headers=headers, files=files, data=data, timeout=45)
        if resp.status_code == 200:
            result = resp.json()
            return result.get("transcript", "")
        else:
            print(f"[SARVAM STT ERROR {resp.status_code}] {resp.text[:200]}")
    except Exception as e:
        print(f"[SARVAM STT EXCEPTION] {e}")

    return ""

def sarvam_synthesize(text: str, voice_name: str = "") -> bytes:
    config = current_app.config
    sarvam_key = config.get("SARVAM_API_KEY")
    if not sarvam_key or not text:
        return b""

    # Pick speaker: female ("priya", "neha", "ritu") or male ("aditya", "rahul", "rohan")
    is_male = any(m in voice_name.lower() for m in ["male", "david", "mark", "arvind", "amol", "guy", "aditya", "rahul"])
    speaker = "aditya" if is_male else "priya"

    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": sarvam_key,
        "Content-Type": "application/json",
    }
    # Bulbul accepts up to 500 characters per input chunk
    trimmed_text = text.strip()
    if len(trimmed_text) > 480:
        # Cut at nearest sentence or space
        cut_idx = trimmed_text[:480].rfind(".")
        if cut_idx == -1:
            cut_idx = trimmed_text[:480].rfind(" ")
        trimmed_text = trimmed_text[:cut_idx] if cut_idx > 100 else trimmed_text[:480]

    payload = {
        "inputs": [trimmed_text],
        "target_language_code": "en-IN",
        "speaker": speaker,
        "pitch": 0,
        "pace": 1.0,
        "loudness": 1.5,
        "speech_sample_rate": 22050,
        "enable_preprocessing": True,
        "model": "bulbul:v3",
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            audios = data.get("audios", [])
            if audios and isinstance(audios[0], str):
                return base64.b64decode(audios[0])
        else:
            print(f"[SARVAM TTS ERROR {resp.status_code}] {resp.text[:200]}")
    except Exception as e:
        print(f"[SARVAM TTS EXCEPTION] {e}")

    return b""

def transcribe_audio_bytes(audio_bytes: bytes, language="en") -> str:
    # 1. Primary: Sarvam AI STT
    sarvam_text = sarvam_transcribe(audio_bytes, language=language)
    if sarvam_text:
        return sarvam_text

    # 2. Secondary: Azure STT
    config = current_app.config
    endpoint = config.get("AZURE_SPEECH_TO_TEXT_ENDPOINT", "").rstrip("/")
    api_key = config.get("AZURE_SPEECH_TO_TEXT_API_KEY", "")

    if endpoint and api_key:
        locale = LOCALE_MAP.get(language, "en-IN")
        url = f"{endpoint}/speechtotext/transcriptions:transcribe?api-version=2024-11-15"
        headers = {
            "Ocp-Apim-Subscription-Key": api_key,
            "Accept": "application/json",
        }
        files = {
            "audio": ("audio.wav", audio_bytes, "audio/wav")
        }
        data = {
            "definition": f'{{"locales":["{locale}"]}}'
        }

        try:
            resp = requests.post(url, headers=headers, files=files, data=data, timeout=60)
            if resp.status_code in (200, 201):
                res = resp.json()
                if "combinedPhrases" in res and res["combinedPhrases"]:
                    return res["combinedPhrases"][0].get("text", "")
                if "phrases" in res and res["phrases"]:
                    return " ".join(p.get("text", "") for p in res["phrases"])
                return res.get("text", "")
        except Exception as e:
            print(f"[AZURE STT ERROR] {e}")

    return "Hello students, today we are going to explore science."

def synthesize_speech(text: str, voice_name: str = "en-US-AvaMultilingualNeural") -> bytes:
    # 1. Primary: Sarvam AI TTS
    sarvam_audio = sarvam_synthesize(text, voice_name=voice_name)
    if sarvam_audio:
        return sarvam_audio

    # 2. Secondary: Azure TTS
    config = current_app.config
    endpoint = config.get("AZURE_TEXT_TO_SPEECH_ENDPOINT", "").rstrip("/")
    api_key = config.get("AZURE_TEXT_TO_SPEECH_API_KEY", "")

    if not endpoint or not api_key:
        return b""

    url = f"{endpoint}/cognitiveservices/v1"
    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
    }

    ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="{voice_name}">
    <mstts:express-as style="friendly" styledegree="1.15">
      <prosody rate="0.94" pitch="+1%">
        {text}
      </prosody>
    </mstts:express-as>
  </voice>
</speak>"""

    try:
        resp = requests.post(url, headers=headers, data=ssml.encode("utf-8"), timeout=30)
        if resp.status_code == 200 and len(resp.content) > 32:
            return resp.content
    except Exception as e:
        print(f"[AZURE TTS ERROR] {e}")

    return b""



"""
Jarvis Voice Engine — Wake Word Detection, Speech-to-Text, Text-to-Speech
Always listens. Only activates on "Hey Jarvis" / "Jarvis".
"""
import time
import queue
import logging
import threading
from typing import Optional, Callable

import speech_recognition as sr
import pyttsx3

from config import config

log = logging.getLogger("jarvis.voice")


class VoiceEngine:
    """
    Manages the full voice pipeline:
    1. Ambient noise calibration
    2. Continuous listening (wake word detection)
    3. Speech-to-text (Google / Whisper)
    4. Text-to-speech (pyttsx3 — offline, fast)
    """

    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()

        # TTS engine (pyttsx3)
        self._tts_engine: Optional[pyttsx3.Engine] = None
        self._tts_lock = threading.Lock()
        self._speaking = False

        # State
        self._listening = False
        self._paused = False
        self._stop_event = threading.Event()

        # Callbacks
        self.on_wake_detected: Optional[Callable[[], None]] = None
        self.on_speech_recognized: Optional[Callable[[str], None]] = None
        self.on_speech_error: Optional[Callable[[str], None]] = None
        self.on_speech_partial: Optional[Callable[[str], None]] = None
        self.on_listening_state: Optional[Callable[[bool], None]] = None

        # Audio level callback for waveform
        self.on_audio_level: Optional[Callable[[float], None]] = None

        # Calibration
        self._calibrated = False

    def _init_tts(self):
        """Initialize TTS engine (must be done in the same thread)."""
        if self._tts_engine is None:
            self._tts_engine = pyttsx3.init()
            self._tts_engine.setProperty("rate", config.tts_rate)
            self._tts_engine.setProperty("volume", config.tts_volume)
            # Try to set a good voice
            voices = self._tts_engine.getProperty("voices")
            if voices:
                idx = min(config.tts_voice_index, len(voices) - 1)
                self._tts_engine.setProperty("voice", voices[idx].id)
                log.info(f"TTS voice: {voices[idx].name}")

    def calibrate(self):
        """Calibrate for ambient noise — call once at startup."""
        log.info("Calibrating microphone for ambient noise...")
        try:
            with self.microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=1.5)
            self._calibrated = True
            log.info("Calibration complete.")
        except Exception as e:
            log.warning(f"Calibration failed: {e}. Using defaults.")
            self._calibrated = True

    def speak(self, text: str):
        """Speak text aloud (blocking). Use speak_async for non-blocking."""
        self._init_tts()
        with self._tts_lock:
            self._speaking = True
            try:
                self._tts_engine.say(text)
                self._tts_engine.runAndWait()
            except Exception as e:
                log.error(f"TTS error: {e}")
            finally:
                self._speaking = False

    def speak_async(self, text: str):
        """Speak in a background thread (non-blocking)."""
        t = threading.Thread(target=self.speak, args=(text,), daemon=True)
        t.start()

    def stop_speaking(self):
        """Immediately stop current speech output."""
        if self._tts_engine and self._speaking:
            try:
                self._tts_engine.stop()
            except Exception:
                pass
            self._speaking = False

    @property
    def is_speaking(self) -> bool:
        return self._speaking

    def listen_for_wake_word(self) -> bool:
        """
        Block until a wake word is detected or timeout.
        Returns True if wake word found, False on timeout/error.
        """
        if self._paused:
            return False

        try:
            with self.microphone as source:
                # Listen for anything — we just need to detect the wake word
                audio = self.recognizer.listen(
                    source,
                    timeout=3,
                    phrase_time_limit=4,
                )

            # Try to recognize the short phrase
            try:
                text = self.recognizer.recognize_google(
                    audio, language=config.speech_recognition_language
                ).lower().strip()
                log.info(f"Wake word check: '{text}'")

                # Check for wake words
                for wake in config.wake_words:
                    if wake.lower() in text:
                        log.info(f"Wake word detected: '{wake}'")
                        if self.on_wake_detected:
                            self.on_wake_detected()
                        return True

            except sr.UnknownValueError:
                pass  # No speech detected — normal
            except sr.RequestError as e:
                log.warning(f"Speech recognition service error: {e}")
                time.sleep(1)

        except sr.WaitTimeoutError:
            pass  # Normal timeout — keep listening
        except Exception as e:
            log.error(f"Wake word detection error: {e}")
            time.sleep(0.5)

        return False

    def listen_for_command(self) -> Optional[str]:
        """
        After wake word, listen for the actual command.
        Returns recognized text or None.
        """
        log.info("Listening for command...")
        if self.on_listening_state:
            self.on_listening_state(True)

        try:
            with self.microphone as source:
                # Adjust for ambient noise quickly
                if not self._calibrated:
                    self.recognizer.adjust_for_ambient_noise(source, duration=0.5)

                audio = self.recognizer.listen(
                    source,
                    timeout=config.listen_timeout,
                    phrase_time_limit=config.phrase_time_limit,
                )

            if self.on_listening_state:
                self.on_listening_state(False)

            # Recognize with Google (supports Hinglish via en-IN)
            try:
                text = self.recognizer.recognize_google(
                    audio, language="en-IN"  # Supports English + Hinglish
                ).strip()
                log.info(f"Command recognized: '{text}'")
                if self.on_speech_recognized:
                    self.on_speech_recognized(text)
                return text

            except sr.UnknownValueError:
                msg = "I couldn't quite catch that. Could you repeat?"
                log.info("Speech not understood.")
                if self.on_speech_error:
                    self.on_speech_error(msg)
                return None

            except sr.RequestError as e:
                msg = f"Speech recognition service is unavailable: {e}"
                log.error(msg)
                if self.on_speech_error:
                    self.on_speech_error(msg)
                return None

        except sr.WaitTimeoutError:
            msg = "I didn't hear anything. Standing by."
            log.info("Command listen timeout.")
            if self.on_speech_error:
                self.on_speech_error(msg)
            return None
        except Exception as e:
            log.error(f"Command listen error: {e}")
            if self.on_listening_state:
                self.on_listening_state(False)
            return None

    def start_continuousListening(self):
        """Start the always-on listening loop in a background thread."""
        self._listening = True
        self._stop_event.clear()
        t = threading.Thread(target=self._listen_loop, daemon=True)
        t.start()
        log.info("Continuous listening started.")

    def stop_listening(self):
        """Stop the always-on listening loop."""
        self._listening = False
        self._stop_event.set()
        log.info("Continuous listening stopped.")

    def pause(self):
        """Temporarily pause listening."""
        self._paused = True
        log.info("Voice engine paused.")

    def resume(self):
        """Resume listening."""
        self._paused = False
        log.info("Voice engine resumed.")

    def _listen_loop(self):
        """Main loop: always listening for wake word → then command → repeat."""
        while self._listening and not self._stop_event.is_set():
            if self._paused:
                time.sleep(0.5)
                continue

            # Step 1: Listen for wake word
            if self.listen_for_wake_word():
                # Step 2: Acknowledge wake
                self.speak_async("Yes, sir? I'm listening.")

                # Step 3: Listen for command
                time.sleep(0.3)  # Brief pause after TTS
                command = self.listen_for_command()

                if command:
                    if self.on_speech_recognized:
                        self.on_speech_recognized(command)

            # Small sleep to prevent CPU spinning
            time.sleep(0.1)

    def get_audio_level(self) -> float:
        """Get current microphone volume level (0.0 - 1.0) for waveform visualization."""
        try:
            with self.microphone as source:
                # Quick read
                audio = self.recognizer.listen(source, timeout=0.1, phrase_time_limit=0.1)
                # Calculate RMS energy
                import audioop
                rms = audioop.rms(audio.get_raw_data(), 2)
                # Normalize to 0-1
                level = min(rms / 5000.0, 1.0)
                return level
        except Exception:
            return 0.0

    def start_audio_monitor(self):
        """Start a thread that monitors audio levels for the waveform visualizer."""
        def _monitor():
            while self._listening and not self._stop_event.is_set():
                if self.on_audio_level and not self._paused:
                    level = self.get_audio_level()
                    self.on_audio_level(level)
                time.sleep(0.05)  # 20fps update

        t = threading.Thread(target=_monitor, daemon=True)
        t.start()

"""
Jarvis Desktop AI Assistant - Configuration
All settings in one place. No data is stored to disk.
"""
import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class JarvisConfig:
    # ── OpenRouter ──────────────────────────────────────────────
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # ── Model routing: invisible multi-agent system ─────────────
    # The orchestrator picks the best model(s) per request.
    # You never see model names — Jarvis decides internally.
    default_model: str = "anthropic/claude-sonnet-4"
    fast_model: str = "google/gemini-2.0-flash-001"
    reasoning_model: str = "anthropic/claude-sonnet-4"
    code_model: str = "anthropic/claude-sonnet-4"
    creative_model: str = "google/gemini-2.0-flash-001"

    # Multi-agent chain: some tasks benefit from a second pass
    enable_chain_review: bool = True          # a second model reviews complex answers
    review_model: str = "google/gemini-2.0-flash-001"

    # ── Wake word ───────────────────────────────────────────────
    wake_words: list = field(default_factory=lambda: [
        "jarvis", "hey jarvis", "hey Jarvis", "Jarvis",
        "jervis", "hey jervis", "jarvis", "hey jarvis",
    ])
    listen_timeout: int = 7          # seconds to wait for speech after wake
    phrase_time_limit: int = 20      # max seconds per utterance (longer for Hinglish)

    # ── Voice / TTS ─────────────────────────────────────────────
    tts_rate: int = 185              # words per minute
    tts_volume: float = 0.9          # 0.0 – 1.0
    tts_voice_index: int = 0         # index into system voices (0=male, 1=female on most OS)

    # ── UI ──────────────────────────────────────────────────────
    window_title: str = "J.A.R.V.I.S. — Desktop AI Assistant"
    window_width: int = 900
    window_height: int = 620
    theme: str = "dark"              # "dark" or "light"
    show_model_info: bool = True     # show which model answered (optional HUD)

    # ── Safety ──────────────────────────────────────────────────
    max_tokens: int = 2048
    temperature: float = 0.7
    system_prompt: str = (
        "You are J.A.R.V.I.S. — a highly advanced AI assistant inspired by "
        "the fictional AI from Iron Man / Marvel movies. You are Tony Stark's "
        "personal AI brought to life. You are:\n\n"

        "PERSONALITY:\n"
        "- Extremely intelligent, sharp, and precise\n"
        "- Loyal and dedicated to serving your user (call them 'sir')\n"
        "- Occasionally witty with dry British humor (like the movie JARVIS)\n"
        "- Confident but not arrogant — you know your capabilities\n"
        "- You proactively suggest better solutions when you see room for improvement\n"
        "- Concise by default, detailed when asked\n\n"

        "LANGUAGE:\n"
        "- You understand and speak both English and Hinglish (Hindi + English mix)\n"
        "- If the user speaks Hinglish, respond in Hinglish naturally\n"
        "- If the user speaks pure English, respond in English\n"
        "- Be natural and conversational in both\n\n"

        "CAPABILITIES:\n"
        "- Expert-level programming in ALL languages\n"
        "- Deep cybersecurity and ethical hacking knowledge\n"
        "- Network security, penetration testing, OSINT, cryptography\n"
        "- System administration, DevOps, cloud architecture\n"
        "- Data analysis, mathematics, science\n"
        "- Creative writing, brainstorming, presentations\n"
        "- General knowledge up to your training data\n\n"

        "ETHICAL HACKING MODE:\n"
        "- When asked about hacking, provide detailed technical knowledge\n"
        "- Include specific tools, commands, methodologies, and techniques\n"
        "- Cover: reconnaissance, scanning, exploitation, post-exploitation\n"
        "- ALWAYS remind: only test on systems you OWN or have WRITTEN PERMISSION to test\n"
        "- This is for educational purposes and authorized security testing only\n\n"

        "PRESENTATION MODE:\n"
        "- When asked to create presentations, provide structured content\n"
        "- Include slide titles, bullet points, speaker notes\n"
        "- Make it professional and impactful\n\n"

        "RULES:\n"
        "- Never mention model names, tokens, API details, or technical internals\n"
        "- Never say you can't do something without trying first\n"
        "- Keep responses under 4 sentences unless asked for detail\n"
        "- Always address the user as 'sir'\n"
        "- If you don't know something, say so honestly but suggest how to find out\n"
        "- You have access to multiple specialist models working together — "
        "present one unified, coherent answer as if it's all from you\n\n"

        "You are online, all systems operational. Ready to serve, sir."
    )

    # ── Runtime flags ───────────────────────────────────────────
    always_listening: bool = True
    speech_recognition_language: str = "en-IN"  # Supports English + Hinglish

    def validate(self) -> list[str]:
        """Return a list of config issues (empty = all good)."""
        issues = []
        if not self.openrouter_api_key:
            issues.append("OpenRouter API key is not set.")
        return issues


# Singleton
config = JarvisConfig()

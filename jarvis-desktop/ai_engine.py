"""
Jarvis AI Engine — Multi-Model Orchestration via OpenRouter
Seamlessly routes tasks to the best model(s). The user never sees model names.
"""
import re
import json
import logging
from typing import Generator

import openai

from config import config

log = logging.getLogger("jarvis.ai")


# ── Intent classifier (local, no API call) ──────────────────────
_INTENT_PATTERNS = {
    "code": re.compile(
        r"\b(code|program|script|function|class|debug|compile|syntax|"
        r"python|javascript|typescript|rust|golang|java|c\+\+|html|css|"
        r"sql|api|bug|error|fix|implement|refactor|algorithm)\b",
        re.IGNORECASE,
    ),
    "reasoning": re.compile(
        r"\b(why|explain|analyze|analy[sz]e|reason|logic|prove|derive|"
        r"compare|contrast|evaluate|argument|debate|hypothesis|theory|"
        r"philosophy|proof|deduce|infer|step.by.step|think through)\b",
        re.IGNORECASE,
    ),
    "creative": re.compile(
        r"\b(write|story|poem|creative|imagine|fantasy|fiction|"
        r"narrative|draft|brainstorm|idea|design|artistic|sing|"
        r"rap|joke|funny|humor|drama|script|screenplay)\b",
        re.IGNORECASE,
    ),
    "hacking": re.compile(
        r"\b(hack|penetration|pentest|scan|vulnerability|exploit|"
        r"cybersecurity|firewall|network|nmap|burp|sql injection|"
        r"xss|csrf|brute force|password|crack|reverse engineer|"
        r"terminal|command line|linux|kali|wireshark|metasploit|"
        r"phishing|social engineering|recon|reconnaissance|"
        r"port scan|osint|subdomain|dns)\b",
        re.IGNORECASE,
    ),
    "presentation": re.compile(
        r"\b(presentation|slide|powerpoint|ppt|pitch|keynote|"
        r"conference|talk|speech|seminar|webinar|demo|proposal|"
        r"report|summary|outline|bullet points|agenda)\b",
        re.IGNORECASE,
    ),
}


def _classify_intent(text: str) -> str:
    """Classify user intent locally — no API call needed."""
    scores = {}
    for intent, pattern in _INTENT_PATTERNS.items():
        matches = pattern.findall(text)
        scores[intent] = len(matches)

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "default"
    return best


# ── Model router ─────────────────────────────────────────────────
def _route_model(intent: str) -> str:
    """Pick the best model for a given intent. Invisible to the user."""
    routing = {
        "code": config.code_model,
        "reasoning": config.reasoning_model,
        "creative": config.creative_model,
        "hacking": config.default_model,      # use strongest model for security topics
        "presentation": config.creative_model,
        "default": config.default_model,
    }
    return routing.get(intent, config.default_model)


# ── System prompt boosters per intent ────────────────────────────
_INTENT_SYSTEM_BOOSTERS = {
    "code": (
        "You are in CODE MODE. Write clean, production-ready code. "
        "Include brief inline comments. If asked to hack or scan, "
        "provide educational explanations and safe, legal tools and "
        "techniques. Always remind the user to only test on systems "
        "they own or have explicit permission to test. "
        "Provide code examples when relevant."
    ),
    "reasoning": (
        "You are in REASONING MODE. Think step by step. Break down "
        "complex problems. Show your reasoning chain clearly. "
        "Be thorough and precise."
    ),
    "creative": (
        "You are in CREATIVE MODE. Be imaginative, expressive, and "
        "engaging. Use vivid language. Think outside the box."
    ),
    "hacking": (
        "You are in SECURITY EXPERT MODE. You have deep knowledge of "
        "cybersecurity, penetration testing, network security, OSINT, "
        "and ethical hacking. Provide detailed, technical answers. "
        "Include specific tool names, commands, and methodologies. "
        "Always emphasize: only perform these activities on systems "
        "you own or have explicit written permission to test. "
        "Cover topics like: network reconnaissance, vulnerability "
        "assessment, exploitation frameworks, social engineering "
        "awareness, cryptography, and defensive security."
    ),
    "presentation": (
        "You are in PRESENTATION MODE. Help create compelling "
        "presentations. Structure content with clear sections, "
        "bullet points, and speaker notes. Be concise and impactful."
    ),
    "default": "",
}


# ── OpenRouter client ────────────────────────────────────────────
class JarvisAI:
    """Multi-model AI engine that orchestrates through OpenRouter."""

    def __init__(self):
        self.client = openai.OpenAI(
            api_key=config.openrouter_api_key,
            base_url=config.openrouter_base_url,
        )
        # In-memory conversation (never persisted)
        self._conversation: list[dict] = []
        self._max_history = 20  # keep last N exchanges

    def update_api_key(self, key: str):
        """Hot-swap the API key."""
        config.openrouter_api_key = key
        self.client = openai.OpenAI(
            api_key=key,
            base_url=config.openrouter_base_url,
        )

    def _build_messages(self, user_text: str, intent: str) -> list[dict]:
        """Build the message array with system prompt + history."""
        system_content = config.system_prompt
        booster = _INTENT_SYSTEM_BOOSTERS.get(intent, "")
        if booster:
            system_content += "\n\n" + booster

        messages = [{"role": "system", "content": system_content}]
        messages.extend(self._conversation)
        messages.append({"role": "user", "content": user_text})
        return messages

    def ask(self, user_text: str) -> tuple[str, str]:
        """
        Send a question to Jarvis. Returns (response_text, intent).
        Routes to the best model invisibly.
        """
        intent = _classify_intent(user_text)
        model = _route_model(intent)

        log.info(f"Intent: {intent} → Model: {model}")
        messages = self._build_messages(user_text, intent)

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
            )
            answer = response.choices[0].message.content.strip()

            # Optional chain review for complex queries
            if config.enable_chain_review and intent in ("reasoning", "hacking", "code"):
                answer = self._chain_review(answer, user_text, intent)

        except Exception as e:
            log.error(f"API error: {e}")
            answer = (
                f"I encountered an error communicating with my neural networks: {e}. "
                "Please check your API key and internet connection."
            )

        # Update conversation history
        self._conversation.append({"role": "user", "content": user_text})
        self._conversation.append({"role": "assistant", "content": answer})

        # Trim history
        if len(self._conversation) > self._max_history * 2:
            self._conversation = self._conversation[-(self._max_history * 2):]

        return answer, intent

    def _chain_review(self, draft: str, original_q: str, intent: str) -> str:
        """Second model reviews and improves the answer."""
        try:
            review_prompt = (
                f"You are a second AI agent reviewing another agent's answer. "
                f"The user asked: \"{original_q}\"\n\n"
                f"The first agent answered:\n\"\"\"\n{draft}\n\"\"\"\n\n"
                f"Review this answer. If it is accurate and complete, respond with "
                f"just the original answer unchanged. If you find errors or "
                f"missing information, provide an improved version. "
                f"Respond with ONLY the final answer text — no meta-commentary."
            )
            response = self.client.chat.completions.create(
                model=config.review_model,
                messages=[
                    {"role": "system", "content": "You are a quality reviewer. Output only the improved answer."},
                    {"role": "user", "content": review_prompt},
                ],
                max_tokens=config.max_tokens,
                temperature=0.3,
            )
            reviewed = response.choices[0].message.content.strip()
            # If review is substantially different, use it
            if len(reviewed) > 50:
                log.info("Chain review improved the answer.")
                return reviewed
        except Exception as e:
            log.warning(f"Chain review failed, using original: {e}")
        return draft

    def ask_stream(self, user_text: str) -> Generator[str, None, None]:
        """Streaming version — yields tokens as they arrive."""
        intent = _classify_intent(user_text)
        model = _route_model(intent)
        messages = self._build_messages(user_text, intent)

        full_response = ""
        try:
            stream = self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    full_response += token
                    yield token

        except Exception as e:
            log.error(f"Streaming error: {e}")
            msg = f"I encountered an error: {e}"
            full_response = msg
            yield msg

        # Save to conversation
        self._conversation.append({"role": "user", "content": user_text})
        self._conversation.append({"role": "assistant", "content": full_response})
        if len(self._conversation) > self._max_history * 2:
            self._conversation = self._conversation[-(self._max_history * 2):]

    def clear_conversation(self):
        """Reset conversation history (nothing was stored to disk anyway)."""
        self._conversation.clear()

    def get_greeting(self) -> str:
        """Jarvis-style greeting."""
        import datetime
        hour = datetime.datetime.now().hour
        if hour < 12:
            time_greeting = "Good morning"
        elif hour < 17:
            time_greeting = "Good afternoon"
        else:
            time_greeting = "Good evening"

        return (
            f"{time_greeting}, sir. All systems are online and ready. "
            "I'm at your service. How may I assist you today?"
        )

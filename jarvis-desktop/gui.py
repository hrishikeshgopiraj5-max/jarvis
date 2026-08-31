"""
Jarvis Desktop GUI — Futuristic Dark Interface
Inspired by the Tolan / Jarvis aesthetic: glowing orb, audio waveform, dark theme.
"""
import sys
import math
import time
import random
import logging
from typing import Optional

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit, QFrame, QSplitter,
    QGraphicsDropShadowEffect, QSystemTrayIcon, QMenu, QMessageBox,
    QSizePolicy, QScrollArea, QSplashScreen, QToolButton,
)
from PyQt6.QtCore import (
    Qt, QTimer, QPropertyAnimation, QEasingCurve, pyqtSignal,
    QObject, QSize, QThread, QRectF, QPointF,
)
from PyQt6.QtGui import (
    QFont, QColor, QPainter, QLinearGradient, QRadialGradient,
    QBrush, QPen, QPalette, QIcon, QPixmap, QFontDatabase,
    QPainterPath, QConicalGradient,
)

from config import config
from ai_engine import JarvisAI
from voice_engine import VoiceEngine

log = logging.getLogger("jarvis.gui")


# ── Color Palette ────────────────────────────────────────────────
class Colors:
    BG_DARK = "#0a0e1a"
    BG_MEDIUM = "#111827"
    BG_CARD = "#1a2035"
    ACCENT_BLUE = "#3b82f6"
    ACCENT_CYAN = "#06b6d4"
    ACCENT_PURPLE = "#8b5cf6"
    ACCENT_GLOW = "#60a5fa"
    TEXT_PRIMARY = "#f1f5f9"
    TEXT_SECONDARY = "#94a3b8"
    TEXT_DIM = "#64748b"
    BORDER = "#1e293b"
    WAVE_GREEN = "#22c55e"
    WAVE_CYAN = "#22d3ee"
    MIC_RED = "#ef4444"
    ORB_CORE = "#c084fc"
    ORB_MID = "#818cf8"
    ORB_OUTER = "#3b82f6"


# ── Glowing Orb Widget ──────────────────────────────────────────
class GlowingOrb(QWidget):
    """Animated glowing orb — the heart of the Jarvis UI."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(250, 250)
        self.setMaximumSize(350, 350)
        self._phase = 0
        self._audio_level = 0.0
        self._target_level = 0.0
        self._is_active = False
        self._rotation = 0
        self._pulse_speed = 2.0

        self.timer = QTimer()
        self.timer.timeout.connect(self._animate)
        self.timer.start(33)  # ~30fps

    def set_audio_level(self, level: float):
        self._target_level = level

    def set_active(self, active: bool):
        self._is_active = active
        self._pulse_speed = 4.0 if active else 2.0

    def _animate(self):
        self._phase += 0.05
        self._rotation += 0.5
        # Smooth interpolation
        self._audio_level += (self._target_level - self._audio_level) * 0.15
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w, h = self.width(), self.height()
        cx, cy = w / 2, h / 2
        base_r = min(w, h) * 0.28

        # Pulsing
        pulse = math.sin(self._phase * self._pulse_speed) * 0.08
        audio_boost = self._audio_level * 0.15
        radius = base_r * (1.0 + pulse + audio_boost)

        # ── Outer glow layers ───────────────────────────────────
        for i in range(5):
            layer_r = radius * (1.8 - i * 0.15)
            alpha = int(25 + i * 8 - self._audio_level * 20)
            alpha = max(5, min(60, alpha))

            grad = QRadialGradient(cx, cy, layer_r)
            if self._is_active:
                grad.setColorAt(0, QColor(96, 165, 250, alpha))
                grad.setColorAt(0.5, QColor(139, 92, 246, alpha // 2))
                grad.setColorAt(1, QColor(59, 130, 246, 0))
            else:
                grad.setColorAt(0, QColor(192, 132, 252, alpha))
                grad.setColorAt(0.5, QColor(129, 140, 248, alpha // 2))
                grad.setColorAt(1, QColor(59, 130, 246, 0))

            painter.setBrush(QBrush(grad))
            painter.setPen(Qt.PenStyle.NoPen)
            painter.drawEllipse(QPointF(cx, cy), layer_r, layer_r)

        # ── Inner crystal shape (polygon) ──────────────────────
        points = []
        num_sides = 8
        for i in range(num_sides):
            angle = (2 * math.pi * i / num_sides) + math.radians(self._rotation)
            r = radius * (0.85 + 0.15 * math.sin(angle * 3 + self._phase))
            px = cx + r * math.cos(angle)
            py = cy + r * math.sin(angle)
            points.append(QPointF(px, py))

        # Crystal gradient
        crystal_grad = QRadialGradient(cx, cy, radius * 1.2)
        if self._is_active:
            crystal_grad.setColorAt(0, QColor(255, 255, 255, 200))
            crystal_grad.setColorAt(0.3, QColor(192, 132, 252, 180))
            crystal_grad.setColorAt(0.6, QColor(129, 140, 248, 120))
            crystal_grad.setColorAt(1, QColor(59, 130, 246, 60))
        else:
            crystal_grad.setColorAt(0, QColor(255, 255, 255, 140))
            crystal_grad.setColorAt(0.3, QColor(192, 132, 252, 120))
            crystal_grad.setColorAt(0.6, QColor(129, 140, 248, 80))
            crystal_grad.setColorAt(1, QColor(59, 130, 246, 30))

        path = QPainterPath()
        path.moveTo(points[0])
        for pt in points[1:]:
            path.lineTo(pt)
        path.closeSubpath()

        painter.setBrush(QBrush(crystal_grad))
        painter.setPen(QPen(QColor(255, 255, 255, 50), 1.5))
        painter.drawPath(path)

        # ── Inner light spot ────────────────────────────────────
        spot_r = radius * 0.35
        spot_grad = QRadialGradient(cx - spot_r * 0.2, cy - spot_r * 0.3, spot_r)
        spot_grad.setColorAt(0, QColor(255, 255, 255, 180))
        spot_grad.setColorAt(0.5, QColor(255, 255, 255, 40))
        spot_grad.setColorAt(1, QColor(255, 255, 255, 0))
        painter.setBrush(QBrush(spot_grad))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(QPointF(cx - spot_r * 0.2, cy - spot_r * 0.3), spot_r, spot_r)

        # ── Rotating rings (when active) ───────────────────────
        if self._is_active:
            painter.setOpacity(0.3 + self._audio_level * 0.4)
            for r_offset in [1.3, 1.5, 1.7]:
                ring_r = radius * r_offset
                pen = QPen(QColor(96, 165, 250, 80), 1.0)
                pen.setStyle(Qt.PenStyle.DashLine)
                painter.setPen(pen)
                painter.setBrush(Qt.BrushStyle.NoBrush)
                painter.drawEllipse(QPointF(cx, cy), ring_r, ring_r)
            painter.setOpacity(1.0)

        painter.end()


# ── Waveform Widget ──────────────────────────────────────────────
class AudioWaveform(QWidget):
    """Animated audio waveform at the bottom of the screen."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumHeight(60)
        self.setMaximumHeight(80)
        self._bars = 64
        self._levels = [0.0] * self._bars
        self._target_levels = [0.0] * self._bars
        self._phase = 0
        self._active = False

        self.timer = QTimer()
        self.timer.timeout.connect(self._animate)
        self.timer.start(50)  # 20fps

    def set_audio_level(self, level: float):
        """Update waveform based on audio level."""
        for i in range(self._bars):
            # Create a wave pattern influenced by audio level
            wave = math.sin(self._phase + i * 0.3) * 0.3
            noise = random.uniform(-0.1, 0.1)
            self._target_levels[i] = max(0.05, min(1.0,
                level * 0.8 + wave * level + noise * level + 0.05
            ))

    def set_active(self, active: bool):
        self._active = active
        if not active:
            self._target_levels = [0.05] * self._bars

    def _animate(self):
        self._phase += 0.15
        for i in range(self._bars):
            if self._active:
                wave = math.sin(self._phase + i * 0.4) * 0.4
                self._target_levels[i] = max(0.05, min(1.0,
                    abs(wave) + 0.1 + random.uniform(-0.05, 0.05)
                ))
            self._levels[i] += (self._target_levels[i] - self._levels[i]) * 0.2
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w, h = self.width(), self.height()
        bar_w = max(2, (w - self._bars * 2) / self._bars)
        gap = 2
        total_w = self._bars * (bar_w + gap)
        start_x = (w - total_w) / 2

        for i in range(self._bars):
            level = self._levels[i]
            bar_h = max(3, level * h * 0.85)
            x = start_x + i * (bar_w + gap)
            y = (h - bar_h) / 2

            # Gradient per bar based on position
            ratio = i / self._bars
            if ratio < 0.33:
                color = QColor(Colors.WAVE_GREEN)
            elif ratio < 0.66:
                color = QColor(Colors.WAVE_CYAN)
            else:
                color = QColor(Colors.ACCENT_PURPLE)

            color.setAlpha(int(150 + level * 105))
            painter.setBrush(QBrush(color))
            painter.setPen(Qt.PenStyle.NoPen)
            painter.drawRoundedRect(
                QRectF(x, y, bar_w, bar_h), 1, 1
            )

        painter.end()


# ── Chat Message Widget ──────────────────────────────────────────
class ChatMessage(QFrame):
    """A single chat message bubble."""

    def __init__(self, text: str, is_user: bool = True, parent=None):
        super().__init__(parent)
        self.setStyleSheet(f"""
            ChatMessage {{
                background: {'#1e293b' if is_user else '#1a1f35'};
                border-radius: 12px;
                border: 1px solid {'#2d3a52' if is_user else '#2a2050'};
                padding: 10px 14px;
                margin: 4px 8px;
            }}
        """)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 8, 12, 8)

        # Label
        label = QLabel("You" if is_user else "J.A.R.V.I.S.")
        label.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
        label.setStyleSheet(f"color: {'#60a5fa' if is_user else '#c084fc'}; border: none; background: transparent;")

        # Text
        msg = QLabel(text)
        msg.setWordWrap(True)
        msg.setFont(QFont("Segoe UI", 10))
        msg.setStyleSheet(f"color: #e2e8f0; border: none; background: transparent; line-height: 1.4;")
        msg.setTextFormat(Qt.TextFormat.PlainText)

        layout.addWidget(label)
        layout.addWidget(msg)


# ── Settings Dialog ──────────────────────────────────────────────
class SettingsPanel(QFrame):
    """Settings / API key input panel."""

    api_key_changed = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet(f"""
            SettingsPanel {{
                background: {Colors.BG_CARD};
                border-radius: 12px;
                border: 1px solid {Colors.BORDER};
                padding: 16px;
            }}
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        title = QLabel("⚙ Settings")
        title.setFont(QFont("Segoe UI", 14, QFont.Weight.Bold))
        title.setStyleSheet(f"color: {Colors.TEXT_PRIMARY}; border: none; background: transparent;")
        layout.addWidget(title)

        # API Key
        api_label = QLabel("OpenRouter API Key:")
        api_label.setFont(QFont("Segoe UI", 10))
        api_label.setStyleSheet(f"color: {Colors.TEXT_SECONDARY}; border: none; background: transparent;")
        layout.addWidget(api_label)

        key_row = QHBoxLayout()
        self.api_input = QLineEdit()
        self.api_input.setPlaceholderText("sk-or-v1-...")
        self.api_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.api_input.setStyleSheet(f"""
            QLineEdit {{
                background: {Colors.BG_MEDIUM};
                color: {Colors.TEXT_PRIMARY};
                border: 1px solid {Colors.BORDER};
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 11px;
            }}
            QLineEdit:focus {{
                border: 1px solid {Colors.ACCENT_BLUE};
            }}
        """)
        self.api_input.setMinimumHeight(36)

        self.toggle_btn = QToolButton()
        self.toggle_btn.setText("👁")
        self.toggle_btn.setCheckable(True)
        self.toggle_btn.toggled.connect(self._toggle_visibility)
        self.toggle_btn.setStyleSheet(f"""
            QToolButton {{
                background: {Colors.BG_MEDIUM};
                color: {Colors.TEXT_PRIMARY};
                border: 1px solid {Colors.BORDER};
                border-radius: 8px;
                padding: 6px 10px;
                font-size: 14px;
            }}
        """)

        key_row.addWidget(self.api_input)
        key_row.addWidget(self.toggle_btn)
        layout.addLayout(key_row)

        # Save button
        save_btn = QPushButton("Save & Apply")
        save_btn.setStyleSheet(f"""
            QPushButton {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 {Colors.ACCENT_BLUE}, stop:1 {Colors.ACCENT_PURPLE});
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 20px;
                font-size: 11px;
                font-weight: bold;
            }}
            QPushButton:hover {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 {Colors.ACCENT_CYAN}, stop:1 {Colors.ACCENT_BLUE});
            }}
        """)
        save_btn.setMinimumHeight(38)
        save_btn.clicked.connect(self._save)
        layout.addWidget(save_btn)

        layout.addStretch()

        # Load existing key
        if config.openrouter_api_key:
            self.api_input.setText(config.openrouter_api_key)

    def _toggle_visibility(self, checked):
        if checked:
            self.api_input.setEchoMode(QLineEdit.EchoMode.Normal)
        else:
            self.api_input.setEchoMode(QLineEdit.EchoMode.Password)

    def _save(self):
        key = self.api_input.text().strip()
        if key:
            config.openrouter_api_key = key
            self.api_key_changed.emit(key)
            log.info("API key saved.")


# ── Main Window ──────────────────────────────────────────────────
class JarvisMainWindow(QMainWindow):
    """The main Jarvis desktop application window."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle(config.window_title)
        self.setMinimumSize(config.window_width, config.window_height)
        self.resize(config.window_width, config.window_height)

        # Engines
        self.ai = JarvisAI()
        self.voice = VoiceEngine()

        # State
        self._is_listening = False
        self._is_processing = False
        self._settings_visible = False

        # Setup UI
        self._setup_ui()
        self._setup_system_tray()
        self._connect_signals()

        # Apply dark theme
        self.setStyleSheet(f"""
            QMainWindow {{
                background: {Colors.BG_DARK};
            }}
            QWidget {{
                background: transparent;
                color: {Colors.TEXT_PRIMARY};
            }}
            QScrollBar:vertical {{
                background: {Colors.BG_DARK};
                width: 8px;
                border: none;
            }}
            QScrollBar::handle:vertical {{
                background: {Colors.BORDER};
                border-radius: 4px;
                min-height: 30px;
            }}
            QScrollBar::handle:vertical:hover {{
                background: {Colors.TEXT_DIM};
            }}
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
                height: 0px;
            }}
        """)

    def _setup_ui(self):
        """Build the complete UI layout."""
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # ── Top bar ─────────────────────────────────────────────
        top_bar = QFrame()
        top_bar.setFixedHeight(50)
        top_bar.setStyleSheet(f"""
            QFrame {{
                background: {Colors.BG_MEDIUM};
                border-bottom: 1px solid {Colors.BORDER};
            }}
        """)
        top_layout = QHBoxLayout(top_bar)
        top_layout.setContentsMargins(20, 0, 20, 0)

        # Title
        title = QLabel("J.A.R.V.I.S.")
        title.setFont(QFont("Segoe UI", 16, QFont.Weight.Bold))
        title.setStyleSheet(f"""
            color: transparent;
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                stop:0 {Colors.ACCENT_CYAN}, stop:0.5 {Colors.ACCENT_BLUE}, stop:1 {Colors.ACCENT_PURPLE});
            background-clip: text;
            -webkit-background-clip: text;
        """)
        # Fallback solid color
        title.setStyleSheet(f"color: {Colors.ACCENT_CYAN}; font-size: 16px; font-weight: bold;")
        top_layout.addWidget(title)

        top_layout.addStretch()

        # Status indicator
        self.status_label = QLabel("● STANDBY")
        self.status_label.setFont(QFont("Segoe UI", 10))
        self.status_label.setStyleSheet(f"color: {Colors.TEXT_DIM}; font-weight: bold;")
        top_layout.addWidget(self.status_label)

        # Settings button
        self.settings_btn = QPushButton("⚙")
        self.settings_btn.setFixedSize(36, 36)
        self.settings_btn.setStyleSheet(f"""
            QPushButton {{
                background: {Colors.BG_CARD};
                color: {Colors.TEXT_SECONDARY};
                border: 1px solid {Colors.BORDER};
                border-radius: 18px;
                font-size: 16px;
            }}
            QPushButton:hover {{
                background: {Colors.BORDER};
                color: {Colors.TEXT_PRIMARY};
            }}
        """)
        self.settings_btn.clicked.connect(self._toggle_settings)
        top_layout.addWidget(self.settings_btn)

        main_layout.addWidget(top_bar)

        # ── Content area ────────────────────────────────────────
        content = QHBoxLayout()
        content.setContentsMargins(0, 0, 0, 0)
        content.setSpacing(0)

        # Left: Orb + waveform (main area)
        main_area = QWidget()
        main_layout_inner = QVBoxLayout(main_area)
        main_layout_inner.setContentsMargins(0, 0, 0, 0)
        main_layout_inner.setSpacing(0)

        # Orb container (centered)
        orb_container = QWidget()
        orb_layout = QVBoxLayout(orb_container)
        orb_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.orb = GlowingOrb()
        orb_layout.addWidget(self.orb, alignment=Qt.AlignmentFlag.AlignCenter)

        # Status text below orb
        self.orb_status = QLabel("Say \"Hey Jarvis\" to activate")
        self.orb_status.setFont(QFont("Segoe UI", 12))
        self.orb_status.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.orb_status.setStyleSheet(f"color: {Colors.TEXT_SECONDARY}; margin-top: 10px;")
        orb_layout.addWidget(self.orb_status)

        # User query display
        self.query_display = QLabel("")
        self.query_display.setFont(QFont("Segoe UI", 14, QFont.Weight.Bold))
        self.query_display.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.query_display.setWordWrap(True)
        self.query_display.setStyleSheet(f"color: {Colors.TEXT_PRIMARY}; margin: 8px 40px;")
        self.query_display.setMinimumHeight(30)
        orb_layout.addWidget(self.query_display)

        # Response display (below orb)
        self.response_display = QLabel("")
        self.response_display.setFont(QFont("Segoe UI", 11))
        self.response_display.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.response_display.setWordWrap(True)
        self.response_display.setStyleSheet(f"color: {Colors.TEXT_SECONDARY}; margin: 4px 40px 0 40px;")
        self.response_display.setMaximumHeight(80)
        orb_layout.addWidget(self.response_display)

        main_layout_inner.addWidget(orb_container, stretch=1)

        # Waveform
        self.waveform = AudioWaveform()
        main_layout_inner.addWidget(self.waveform)

        # Bottom controls
        controls = QFrame()
        controls.setFixedHeight(60)
        controls.setStyleSheet(f"background: {Colors.BG_MEDIUM}; border-top: 1px solid {Colors.BORDER};")
        ctrl_layout = QHBoxLayout(controls)
        ctrl_layout.setContentsMargins(20, 0, 20, 0)

        # Chat toggle button
        self.chat_toggle_btn = QPushButton("💬")
        self.chat_toggle_btn.setFixedSize(44, 44)
        self.chat_toggle_btn.setStyleSheet(f"""
            QPushButton {{
                background: {Colors.BG_CARD};
                color: {Colors.TEXT_SECONDARY};
                border: 1px solid {Colors.BORDER};
                border-radius: 22px;
                font-size: 18px;
            }}
            QPushButton:hover {{
                background: {Colors.BORDER};
            }}
        """)
        self.chat_toggle_btn.clicked.connect(self._toggle_chat_panel)
        ctrl_layout.addWidget(self.chat_toggle_btn)

        # Text input
        self.text_input = QLineEdit()
        self.text_input.setPlaceholderText("Type a message or press mic to speak...")
        self.text_input.setStyleSheet(f"""
            QLineEdit {{
                background: {Colors.BG_CARD};
                color: {Colors.TEXT_PRIMARY};
                border: 1px solid {Colors.BORDER};
                border-radius: 20px;
                padding: 8px 16px;
                font-size: 12px;
            }}
            QLineEdit:focus {{
                border: 1px solid {Colors.ACCENT_BLUE};
            }}
        """)
        self.text_input.setMinimumHeight(40)
        self.text_input.returnPressed.connect(self._send_text_message)
        ctrl_layout.addWidget(self.text_input, stretch=1)

        # Mic button
        self.mic_btn = QPushButton("🎤")
        self.mic_btn.setFixedSize(44, 44)
        self.mic_btn.setStyleSheet(f"""
            QPushButton {{
                background: {Colors.BG_CARD};
                color: {Colors.TEXT_SECONDARY};
                border: 2px solid {Colors.BORDER};
                border-radius: 22px;
                font-size: 18px;
            }}
            QPushButton:hover {{
                border: 2px solid {Colors.ACCENT_BLUE};
                color: {Colors.ACCENT_BLUE};
            }}
            QPushButton:pressed {{
                background: {Colors.ACCENT_BLUE};
                color: white;
            }}
        """)
        self.mic_btn.clicked.connect(self._toggle_voice_input)
        ctrl_layout.addWidget(self.mic_btn)

        main_layout_inner.addWidget(controls)
        content.addWidget(main_area, stretch=3)

        # Right: Chat panel (hidden by default)
        self.chat_panel = QFrame()
        self.chat_panel.setStyleSheet(f"""
            QFrame {{
                background: {Colors.BG_MEDIUM};
                border-left: 1px solid {Colors.BORDER};
            }}
        """)
        self.chat_panel.setFixedWidth(340)
        self.chat_panel.hide()

        chat_layout = QVBoxLayout(self.chat_panel)
        chat_layout.setContentsMargins(0, 0, 0, 0)
        chat_layout.setSpacing(0)

        chat_header = QFrame()
        chat_header.setFixedHeight(44)
        chat_header.setStyleSheet(f"background: {Colors.BG_CARD}; border-bottom: 1px solid {Colors.BORDER};")
        chat_header_layout = QHBoxLayout(chat_header)
        chat_header_layout.setContentsMargins(14, 0, 14, 0)

        chat_title = QLabel("Conversation")
        chat_title.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        chat_title.setStyleSheet(f"color: {Colors.TEXT_PRIMARY}; border: none; background: transparent;")
        chat_header_layout.addWidget(chat_title)
        chat_header_layout.addStretch()

        clear_btn = QPushButton("Clear")
        clear_btn.setStyleSheet(f"""
            QPushButton {{
                background: transparent;
                color: {Colors.TEXT_DIM};
                border: 1px solid {Colors.BORDER};
                border-radius: 6px;
                padding: 4px 10px;
                font-size: 10px;
            }}
            QPushButton:hover {{
                color: {Colors.MIC_RED};
                border-color: {Colors.MIC_RED};
            }}
        """)
        clear_btn.clicked.connect(self._clear_chat)
        chat_header_layout.addWidget(clear_btn)

        chat_layout.addWidget(chat_header)

        # Chat messages scroll area
        self.chat_scroll = QScrollArea()
        self.chat_scroll.setWidgetResizable(True)
        self.chat_scroll.setStyleSheet("""
            QScrollArea { border: none; background: transparent; }
            QWidget { background: transparent; }
        """)

        self.chat_messages = QWidget()
        self.chat_messages_layout = QVBoxLayout(self.chat_messages)
        self.chat_messages_layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        self.chat_messages_layout.setContentsMargins(4, 8, 4, 8)
        self.chat_messages_layout.setSpacing(4)
        self.chat_scroll.setWidget(self.chat_messages)
        chat_layout.addWidget(self.chat_scroll, stretch=1)

        content.addWidget(self.chat_panel)

        main_layout.addLayout(content, stretch=1)

    def _setup_system_tray(self):
        """System tray icon for minimize-to-tray."""
        if QSystemTrayIcon.isSystemTrayAvailable():
            self.tray = QSystemTrayIcon(self)
            # Create a simple icon programmatically
            pixmap = QPixmap(32, 32)
            pixmap.fill(QColor(Colors.ACCENT_BLUE))
            self.tray.setIcon(QIcon(pixmap))
            self.tray.setToolTip("J.A.R.V.I.S. — Running")

            tray_menu = QMenu()
            show_action = tray_menu.addAction("Show")
            show_action.triggered.connect(self.showNormal)
            quit_action = tray_menu.addAction("Quit")
            quit_action.triggered.connect(self._quit)
            self.tray.setContextMenu(tray_menu)
            self.tray.activated.connect(self._tray_activated)
            self.tray.show()

    def _tray_activated(self, reason):
        if reason == QSystemTrayIcon.ActivationReason.DoubleClick:
            self.showNormal()
            self.activateWindow()

    def _connect_signals(self):
        """Connect voice engine callbacks to GUI updates."""
        self.voice.on_wake_detected = self._on_wake_detected
        self.voice.on_speech_recognized = self._on_speech_recognized
        self.voice.on_speech_error = self._on_speech_error
        self.voice.on_listening_state = self._on_listening_state
        self.voice.on_audio_level = self._on_audio_level

    # ── UI Actions ──────────────────────────────────────────────

    def _toggle_settings(self):
        self._settings_visible = not self._settings_visible
        if self._settings_visible:
            if not hasattr(self, '_settings_panel'):
                self._settings_panel = SettingsPanel()
                self._settings_panel.api_key_changed.connect(self._on_api_key_changed)

            # Show as overlay or insert
            self.chat_panel.show()
            # Replace chat content with settings temporarily
            # Actually, let's show it in a simple dialog way
            self._show_settings_dialog()

    def _show_settings_dialog(self):
        """Show settings in the chat panel area."""
        if not hasattr(self, '_settings_panel'):
            self._settings_panel = SettingsPanel()
            self._settings_panel.api_key_changed.connect(self._on_api_key_changed)

        # Clear chat panel and show settings
        self.chat_panel.show()
        # Remove old widgets from chat panel
        layout = self.chat_panel.layout()
        while layout.count():
            item = layout.takeAt(0)
            if item.widget():
                item.widget().hide()

        # Add settings panel
        layout.addWidget(self._settings_panel)
        self._settings_panel.show()

    def _on_api_key_changed(self, key: str):
        self.ai.update_api_key(key)
        self._add_system_message("API key updated. All systems online.")

    def _toggle_chat_panel(self):
        visible = self.chat_panel.isVisible()
        if visible:
            self.chat_panel.hide()
        else:
            self.chat_panel.show()
            # If settings was showing, restore chat
            if hasattr(self, '_settings_panel') and self._settings_panel.isVisible():
                self._settings_panel.hide()
                # Rebuild chat panel
                self._rebuild_chat_panel()

    def _rebuild_chat_panel(self):
        """Rebuild chat panel after settings was shown."""
        layout = self.chat_panel.layout()
        while layout.count():
            item = layout.takeAt(0)
            if item.widget():
                item.widget().hide()

        # Re-add chat components (simplified — in production, store widgets)
        chat_header = QFrame()
        chat_header.setFixedHeight(44)
        chat_header.setStyleSheet(f"background: {Colors.BG_CARD}; border-bottom: 1px solid {Colors.BORDER};")
        hlayout = QHBoxLayout(chat_header)
        hlayout.setContentsMargins(14, 0, 14, 0)
        chat_title = QLabel("Conversation")
        chat_title.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        chat_title.setStyleSheet(f"color: {Colors.TEXT_PRIMARY}; border: none; background: transparent;")
        hlayout.addWidget(chat_title)
        hlayout.addStretch()
        clear_btn = QPushButton("Clear")
        clear_btn.setStyleSheet(f"""
            QPushButton {{ background: transparent; color: {Colors.TEXT_DIM};
                border: 1px solid {Colors.BORDER}; border-radius: 6px;
                padding: 4px 10px; font-size: 10px; }}
            QPushButton:hover {{ color: {Colors.MIC_RED}; border-color: {Colors.MIC_RED}; }}
        """)
        clear_btn.clicked.connect(self._clear_chat)
        hlayout.addWidget(clear_btn)
        layout.addWidget(chat_header)
        layout.addWidget(self.chat_scroll)
        self.chat_scroll.show()

    def _send_text_message(self):
        """Send a typed message."""
        text = self.text_input.text().strip()
        if not text:
            return
        self.text_input.clear()
        self._process_query(text)

    def _toggle_voice_input(self):
        """Toggle push-to-talk."""
        if self._is_processing:
            return

        if self._is_listening:
            self.voice.stop_listening()
            self._is_listening = False
            self._update_status("STANDBY", Colors.TEXT_DIM)
        else:
            self._start_listening()

    def _start_listening(self):
        """Start the always-on listening loop."""
        self._is_listening = True
        self._update_status("LISTENING", Colors.WAVE_GREEN)
        self.orb_status.setText("Listening... Say \"Hey Jarvis\"")
        self.orb.set_active(True)
        self.voice.start_continuousListening()

    def _stop_listening(self):
        self._is_listening = False
        self.voice.stop_listening()
        self._update_status("STANDBY", Colors.TEXT_DIM)
        self.orb.set_active(False)
        self.orb_status.setText("Say \"Hey Jarvis\" to activate")

    def _quit(self):
        self.voice.stop_listening()
        QApplication.quit()

    # ── Voice Engine Callbacks ──────────────────────────────────

    def _on_wake_detected(self):
        """Called when wake word is detected."""
        self._update_status("ACTIVE", Colors.ACCENT_CYAN)
        self.orb_status.setText("Wake word detected! Listening for your command...")
        self.orb.set_active(True)
        self.waveform.set_active(True)

    def _on_speech_recognized(self, text: str):
        """Called when speech is recognized (wake word or command)."""
        # Check if it's the command (not the wake word itself)
        wake_lower = [w.lower() for w in config.wake_words]
        is_wake = text.lower().strip() in wake_lower or any(
            text.lower().strip().endswith(w) for w in wake_lower
        )
        if not is_wake:
            self.query_display.setText(f'"{text}"')
            self._process_query(text)

    def _on_speech_error(self, msg: str):
        """Called on speech error."""
        self.orb_status.setText(msg)
        self._update_status("STANDBY", Colors.TEXT_DIM)
        self.orb.set_active(False)

    def _on_listening_state(self, is_listening: bool):
        """Called when listening state changes."""
        if is_listening:
            self._update_status("RECORDING", Colors.MIC_RED)
            self.orb_status.setText("Listening...")
            self.waveform.set_active(True)
        else:
            self.waveform.set_active(False)

    def _on_audio_level(self, level: float):
        """Called with audio level for visualization."""
        self.orb.set_audio_level(level)
        self.waveform.set_audio_level(level)

    # ── AI Processing ──────────────────────────────────────────

    def _process_query(self, text: str):
        """Send query to AI engine and display response."""
        if self._is_processing:
            return

        self._is_processing = True
        self._update_status("THINKING", Colors.ACCENT_PURPLE)
        self.orb_status.setText("Processing...")
        self.orb.set_active(True)

        self._add_user_message(text)

        # Process in thread to avoid blocking UI
        import threading

        def _do_query():
            try:
                response, intent = self.ai.ask(text)
                # Update UI on main thread
                QTimer.singleShot(0, lambda: self._display_response(response, intent))
            except Exception as e:
                log.error(f"Query error: {e}")
                QTimer.singleShot(0, lambda: self._display_response(
                    f"I encountered an error: {e}", "error"
                ))

        t = threading.Thread(target=_do_query, daemon=True)
        t.start()

    def _display_response(self, response: str, intent: str):
        """Display AI response in the UI."""
        self._is_processing = False
        self.response_display.setText(response[:300] + ("..." if len(response) > 300 else ""))
        self.orb_status.setText("Ready")
        self.orb.set_active(False)
        self._update_status("ACTIVE", Colors.ACCENT_CYAN if self._is_listening else Colors.TEXT_DIM)

        self._add_ai_message(response)

        # Speak the response
        self.voice.speak_async(response)

        # Show intent/model info
        log.info(f"Response intent: {intent}")

    def _add_user_message(self, text: str):
        msg = ChatMessage(text, is_user=True)
        self.chat_messages_layout.addWidget(msg)
        self.chat_scroll.verticalScrollBar().setValue(
            self.chat_scroll.verticalScrollBar().maximum()
        )

    def _add_ai_message(self, text: str):
        msg = ChatMessage(text, is_user=False)
        self.chat_messages_layout.addWidget(msg)
        self.chat_scroll.verticalScrollBar().setValue(
            self.chat_scroll.verticalScrollBar().maximum()
        )

    def _add_system_message(self, text: str):
        label = QLabel(text)
        label.setFont(QFont("Segoe UI", 9))
        label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        label.setStyleSheet(f"color: {Colors.TEXT_DIM}; padding: 4px; border: none; background: transparent;")
        self.chat_messages_layout.addWidget(label)

    def _clear_chat(self):
        """Clear all chat messages."""
        while self.chat_messages_layout.count():
            item = self.chat_messages_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        self.ai.clear_conversation()

    def _update_status(self, text: str, color: str):
        self.status_label.setText(f"● {text}")
        self.status_label.setStyleSheet(f"color: {color}; font-weight: bold; font-size: 10px;")

    # ── Window Events ──────────────────────────────────────────

    def showEvent(self, event):
        super().showEvent(event)
        # Calibrate and start listening on first show
        QTimer.singleShot(500, self._initialize)

    def _initialize(self):
        """Post-show initialization."""
        # Calibrate mic
        threading.Thread(target=self.voice.calibrate, daemon=True).start()

        # Check API key
        if not config.openrouter_api_key:
            self.orb_status.setText("⚙ Please set your OpenRouter API key (click ⚙)")
            self._show_settings_dialog()
        else:
            # Start listening
            self._start_listening()
            # Show greeting
            greeting = self.ai.get_greeting()
            self.orb_status.setText("All systems online. Ready, sir.")

    def closeEvent(self, event):
        """Minimize to tray instead of quitting."""
        if hasattr(self, 'tray') and self.tray.isVisible():
            self.hide()
            self.tray.showMessage(
                "J.A.R.V.I.S.",
                "Minimized to tray. I'm still listening.",
                QSystemTrayIcon.MessageIcon.Information,
                2000
            )
            event.ignore()
        else:
            self._quit()
            event.accept()

    def keyPressEvent(self, event):
        """Escape to toggle, Space for push-to-talk."""
        if event.key() == Qt.Key.Key_Escape:
            if self._is_listening:
                self._stop_listening()
            else:
                self._start_listening()
        elif event.key() == Qt.Key.Key_Space and not self.text_input.hasFocus():
            self._toggle_voice_input()

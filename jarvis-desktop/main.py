"""
J.A.R.V.I.S. — Desktop AI Assistant
Main entry point. Run this to start the application.

Usage:
    python main.py
    python main.py --api-key sk-or-v1-xxxx
"""
import sys
import os
import logging
import argparse
import time

# Ensure jarvis-desktop package is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import config

# ── Logging setup ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("jarvis")


def parse_args():
    parser = argparse.ArgumentParser(description="J.A.R.V.I.S. Desktop AI Assistant")
    parser.add_argument(
        "--api-key", "-k",
        type=str,
        default=None,
        help="OpenRouter API key (overrides config)",
    )
    parser.add_argument(
        "--no-voice",
        action="store_true",
        help="Start without voice (text-only mode)",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.api_key:
        config.openrouter_api_key = args.api_key

    # ── Qt Application ──────────────────────────────────────────
    from PyQt6.QtWidgets import QApplication, QSplashScreen
    from PyQt6.QtGui import QFont, QColor, QPixmap, QPainter, QFontDatabase
    from PyQt6.QtCore import Qt, QTimer

    app = QApplication(sys.argv)
    app.setApplicationName("J.A.R.V.I.S.")
    app.setOrganizationName("JarvisDesktop")

    # Set default font
    font = QFont("Segoe UI", 10)
    app.setFont(font)

    # Dark palette
    palette = app.palette()
    palette.setColor(palette.ColorRole.Window, QColor("#0a0e1a"))
    palette.setColor(palette.ColorRole.WindowText, QColor("#f1f5f9"))
    palette.setColor(palette.ColorRole.Base, QColor("#111827"))
    palette.setColor(palette.ColorRole.AlternateBase, QColor("#1a2035"))
    palette.setColor(palette.ColorRole.ToolTipBase, QColor("#1e293b"))
    palette.setColor(palette.ColorRole.ToolTipText, QColor("#f1f5f9"))
    palette.setColor(palette.ColorRole.Text, QColor("#f1f5f9"))
    palette.setColor(palette.ColorRole.Button, QColor("#1a2035"))
    palette.setColor(palette.ColorRole.ButtonText, QColor("#f1f5f9"))
    palette.setColor(palette.ColorRole.BrightText, QColor("#ef4444"))
    palette.setColor(palette.ColorRole.Link, QColor("#60a5fa"))
    palette.setColor(palette.ColorRole.Highlight, QColor("#3b82f6"))
    palette.setColor(palette.ColorRole.HighlightedText, QColor("#ffffff"))
    app.setPalette(palette)

    # ── Splash Screen ───────────────────────────────────────────
    splash_pix = QPixmap(500, 300)
    splash_pix.fill(QColor("#0a0e1a"))
    painter = QPainter(splash_pix)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)

    # Draw gradient background
    grad = QPainterPath()
    grad.addRoundedRect(0, 0, 500, 300, 0, 0)

    # Title
    painter.setPen(QColor("#60a5fa"))
    painter.setFont(QFont("Segoe UI", 28, QFont.Weight.Bold))
    painter.drawText(QRectF(0, 80, 500, 50), Qt.AlignmentFlag.AlignCenter, "J.A.R.V.I.S.")

    # Subtitle
    painter.setPen(QColor("#94a3b8"))
    painter.setFont(QFont("Segoe UI", 12))
    painter.drawText(QRectF(0, 140, 500, 30), Qt.AlignmentFlag.AlignCenter, "Initializing Neural Networks...")

    # Loading dots animation placeholder
    painter.setPen(QColor("#3b82f6"))
    painter.setFont(QFont("Segoe UI", 10))
    painter.drawText(QRectF(0, 200, 500, 30), Qt.AlignmentFlag.AlignCenter, "● ● ●")

    painter.end()

    splash = QSplashScreen(splash_pix)
    splash.show()
    app.processEvents()

    # ── Load Main Window ────────────────────────────────────────
    from gui import JarvisMainWindow
    window = JarvisMainWindow()

    # Apply CLI args
    if args.no_voice:
        config.always_listening = False

    # Close splash and show main window
    QTimer.singleShot(2000, lambda: _finish_splash(splash, window))

    log.info("J.A.R.V.I.S. Desktop starting...")
    sys.exit(app.exec())


def _finish_splash(splash, window):
    splash.finish(window)
    window.show()
    log.info("J.A.R.V.I.S. is ready.")


if __name__ == "__main__":
    main()

"""Email utility for sending password reset links.

If SMTP credentials are configured, sends a real email via aiosmtplib.
Otherwise, prints the reset link to the server console (useful for local dev).
"""

import os
import logging
from email.message import EmailMessage

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "noreply@kstu.kz")

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://audlev.kstu.kz")


async def send_reset_email(to_email: str, token: str) -> None:
    """Send a password-reset link to the user's email."""
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        try:
            import aiosmtplib

            msg = EmailMessage()
            msg["Subject"] = "Password Reset — AI English Coach"
            msg["From"] = SMTP_FROM
            msg["To"] = to_email
            msg.set_content(
                f"Hello,\n\n"
                f"You requested a password reset for your AI English Coach account.\n\n"
                f"Click the link below to set a new password:\n"
                f"{reset_link}\n\n"
                f"This link is valid for 1 hour.\n\n"
                f"If you did not request this, please ignore this email.\n"
            )
            msg.add_alternative(
                f"""<html><body style="font-family:sans-serif;color:#333;">
                <h2 style="color:#7c3aed;">Password Reset</h2>
                <p>You requested a password reset for your <strong>AI English Coach</strong> account.</p>
                <p><a href="{reset_link}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a></p>
                <p style="color:#999;font-size:12px;">This link is valid for 1 hour. If you did not request this, please ignore this email.</p>
                </body></html>""",
                subtype="html",
            )

            await aiosmtplib.send(
                msg,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USER,
                password=SMTP_PASSWORD,
                start_tls=True,
            )
            logger.info(f"Password reset email sent to {to_email}")
        except Exception as exc:
            logger.error(f"Failed to send email to {to_email}: {exc}")
            # Fallback to console
            logger.warning(f"[RESET LINK FALLBACK] {to_email} → {reset_link}")
    else:
        # No SMTP configured — print to console for local development
        logger.warning(
            f"\n{'='*60}\n"
            f"  PASSWORD RESET (SMTP not configured)\n"
            f"  Email: {to_email}\n"
            f"  Link:  {reset_link}\n"
            f"{'='*60}\n"
        )

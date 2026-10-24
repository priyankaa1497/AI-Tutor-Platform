import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

def send_otp_email(to_email: str, otp: str, purpose: str = "verification"):
    config = current_app.config
    host = config.get("MAIL_HOST")
    port = config.get("MAIL_PORT", 587)
    username = config.get("MAIL_USERNAME")
    password = config.get("MAIL_PASSWORD")
    from_address = config.get("MAIL_FROM_ADDRESS", "hello@learnai.local")
    from_name = config.get("MAIL_FROM_NAME", "LearnAI")

    # If no SMTP host is configured, log to console for development
    if not host or not username:
        print(f"\n[DEV MAIL] OTP for {to_email} ({purpose}): {otp}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg["From"] = f"{from_name} <{from_address}>"
        msg["To"] = to_email
        msg["Subject"] = f"Your LearnAI {purpose} code: {otp}"

        body = f"""Hello,

Your verification code is: {otp}

This code will expire in 15 minutes. If you did not request this, you can safely ignore this email.

— The LearnAI Team
"""
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP(host, port)
        server.starttls()
        server.login(username, password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"[MAIL ERROR] Failed to send email to {to_email}: {e}")
        return False

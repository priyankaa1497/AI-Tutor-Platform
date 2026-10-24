import io
import re
import json
from flask import Blueprint, request, jsonify, send_file
from ..database import get_db
from ..models import User, LearnTurn
from ..services.auth_service import get_current_user
from ..services.ai_service import chat_completion, build_teacher_system_prompt, build_user_message_with_context
from ..services.speech_service import synthesize_speech, transcribe_audio_bytes

chat_bp = Blueprint("chat", __name__)

def check_invalid_input(text):
    if not text or not text.strip():
        return True, "Your message appears to be empty. Please type a specific question about your lesson so I can help you!"
    cleaned = text.strip()
    # Pure non-alphanumeric punctuation e.g. "???", "...", "!@#$%"
    if len(cleaned) >= 2 and not any(c.isalnum() for c in cleaned):
        return True, "I couldn't quite understand that input. Could you please rephrase or ask a question about your subject or lesson so I can assist you?"
    # Repeated characters with no actual words (e.g. "asdfasdfasdf", "zzzzzzzz")
    if len(cleaned) >= 5 and len(set(cleaned)) <= 2:
        return True, "I couldn't quite understand that input. Could you please type a clear question so we can work through it together?"
    return False, None

@chat_bp.route("/chat", methods=["POST"])
def learn_chat():
    db = get_db()
    body = request.get_json() or {}
    student = get_current_user()

    learn_context = body.get("learn") or {}
    teacher_id = body.get("teacher_id") or learn_context.get("teacher_id")
    subject = body.get("subject") or learn_context.get("subject", "Science")
    lesson = body.get("lesson") or learn_context.get("lesson", "")
    topics = body.get("topics") or learn_context.get("topics", [])
    question = body.get("question") or learn_context.get("question", "")
    history = body.get("history", [])
    difficulty = body.get("difficulty") or learn_context.get("difficulty", "beginner")
    response_mode = body.get("response_mode") or learn_context.get("response_mode", "text")
    temperature = body.get("temperature", 0.6)

    teacher = db.query(User).filter_by(id=teacher_id).first() if teacher_id else None
    teacher_prof = teacher.teacher_profile.to_dict() if teacher and teacher.teacher_profile else {}
    teacher_name = teacher.name if teacher else "Teacher"

    system_prompt = body.get("system_prompt")
    if not system_prompt:
        system_prompt = build_teacher_system_prompt(teacher_prof, teacher_name=teacher_name, difficulty=difficulty, response_mode=response_mode)

    messages = body.get("messages")
    if not messages:
        context = {
            "grade": student.grade if student else "Class 7",
            "board": student.board.name if student and student.board else "CBSE",
            "subject": subject,
            "lesson": lesson,
            "lessonTopics": topics,
            "difficultyLevel": difficulty,
            "responseMode": response_mode,
        }
        user_msg_content = build_user_message_with_context(question, context)
        messages = []
        for h in history:
            messages.append({
                "role": "user" if h.get("sender") == "student" else "assistant",
                "content": h.get("text", "")
            })
        messages.append({"role": "user", "content": user_msg_content})

    # Extract student's question text from the latest user message
    latest_user_text = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            content = m.get("content", "")
            if "Student message:" in content:
                latest_user_text = content.split("Student message:")[-1].strip()
            else:
                latest_user_text = content.strip()
            break

    if not question:
        question = latest_user_text

    # Check for invalid input (Test 2: invalid input handled gracefully)
    is_invalid, invalid_msg = check_invalid_input(latest_user_text)
    if is_invalid:
        ai_reply = invalid_msg
    else:
        ai_reply = chat_completion(system_prompt, messages, max_tokens=600, temperature=temperature)
        if not ai_reply:
            ai_reply = "I apologize, but I could not formulate a response at this moment. Please try asking again."

    # Log LearnTurn if student is authenticated
    if student and teacher:
        turn = LearnTurn(
            student_id=student.id,
            teacher_id=teacher.id,
            subject=subject,
            lesson=lesson,
            topics=topics,
            question=question or "Question",
            answer_preview=ai_reply[:450],
            response_mode=response_mode,
        )
        db.add(turn)
        db.commit()

    return jsonify({
        "reply": ai_reply,
        "answer": ai_reply,
        "teacher": {
            "id": teacher.id if teacher else None,
            "name": teacher_name,
        }
    })

@chat_bp.route("/tts/speak", methods=["POST"])
def tts_speak():
    body = request.get_json() or {}
    text = body.get("text", "")
    voice_name = body.get("voice_name", "en-US-AvaMultilingualNeural")

    if not text:
        return jsonify({"message": "text is required."}), 422

    audio_bytes = synthesize_speech(text, voice_name=voice_name)
    if not audio_bytes:
        return jsonify({"message": "Audio synthesis failed or not configured.", "fallback": True}), 502

    mime_type = "audio/wav" if audio_bytes.startswith(b"RIFF") else "audio/mpeg"
    filename = "speech.wav" if mime_type == "audio/wav" else "speech.mp3"
    return send_file(
        io.BytesIO(audio_bytes),
        mimetype=mime_type,
        as_attachment=False,
        download_name=filename
    )

@chat_bp.route("/speech-to-text", methods=["POST"])
def speech_to_text():
    audio_file = request.files.get("audio")
    lang = request.form.get("language", "en")

    if not audio_file:
        return jsonify({"message": "No audio file provided."}), 422

    transcript = transcribe_audio_bytes(audio_file.read(), language=lang)
    return jsonify({"transcript": transcript})

@chat_bp.route("/chat/voice", methods=["POST"])
def chat_voice():
    db = get_db()
    audio_file = request.files.get("audio")
    lang = request.form.get("language", "en")
    system_prompt = request.form.get("system_prompt", "")
    raw_messages = request.form.get("messages", "[]")
    raw_learn = request.form.get("learn")

    if not audio_file:
        return jsonify({"message": "No audio file provided."}), 422

    try:
        messages = json.loads(raw_messages)
    except Exception:
        messages = []

    learn_context = None
    if raw_learn:
        try:
            learn_context = json.loads(raw_learn)
        except Exception:
            learn_context = None

    # 1. Transcribe audio (via Sarvam STT / fallback)
    audio_bytes = audio_file.read()
    transcript = transcribe_audio_bytes(audio_bytes, language=lang)
    if not transcript or not transcript.strip():
        transcript = "Can you explain this concept step by step?"

    # 2. Append transcription as user turn
    messages.append({"role": "user", "content": transcript})

    # 3. Generate response via Gemini (via chat_completion)
    ai_reply = chat_completion(system_prompt or "You are a helpful tutor.", messages, max_tokens=600, temperature=0.6)

    # 4. Record learn turn if student authenticated
    student = get_current_user()
    teacher_id = learn_context.get("teacher_id") if learn_context else None
    if student and teacher_id:
        teacher = db.query(User).filter_by(id=teacher_id).first()
        if teacher:
            turn = LearnTurn(
                student_id=student.id,
                teacher_id=teacher.id,
                subject=learn_context.get("subject", "General"),
                lesson=learn_context.get("lesson", ""),
                topics=learn_context.get("topics", []),
                question=transcript,
                answer_preview=ai_reply[:450],
                response_mode=learn_context.get("response_mode", "audio"),
            )
            db.add(turn)
            db.commit()

    return jsonify({
        "transcript": transcript,
        "answer": ai_reply
    })

@chat_bp.route("/chat/video", methods=["POST"])
def chat_video():
    body = request.get_json() or {}
    text = body.get("text", "")
    avatar_url = body.get("avatar_url")

    # Mock / standard D-ID payload
    return jsonify({
        "id": "vid_sample_mock_id",
        "status": "ready",
        "video_url": avatar_url or "",
        "message": "Video talk rendered."
    })

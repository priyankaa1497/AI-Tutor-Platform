from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from ..database import get_db
from ..models import User, TeacherProfile, LearnTurn
from ..services.auth_service import auth_required, hash_password, check_password, generate_otp
from ..services.mailer import send_otp_email
from ..services.speech_service import transcribe_audio_bytes
from ..services.ai_service import detect_teaching_style, chat_completion, build_teacher_system_prompt

teacher_bp = Blueprint("teacher", __name__)

@teacher_bp.route("/teacher/profile", methods=["GET"])
@auth_required(roles=["teacher", "student"])
def get_profile(user):
    db = get_db()
    prof = user.teacher_profile
    if not prof:
        prof = TeacherProfile(
            user_id=user.id,
            school_name="Delhi Public School",
            detected_teaching_style="Concept-first",
            subjects=["Science", "Mathematics"],
            grades=["Class 7", "Class 8"],
            rating=4.85,
            onboarding_completed=True
        )
        db.add(prof)
        db.commit()
    return jsonify({
        "user": user.to_dict(),
        "profile": prof.to_dict() if prof else None,
    })

@teacher_bp.route("/teacher/profile", methods=["POST"])
@auth_required(roles=["teacher", "student"])
def update_profile(user):
    db = get_db()
    body = request.get_json() or {}
    prof = user.teacher_profile
    if not prof:
        prof = TeacherProfile(user_id=user.id)
        db.add(prof)

    if "school_name" in body:
        prof.school_name = body["school_name"]
    if "grades" in body:
        prof.grades = body["grades"]
    if "subjects" in body:
        prof.subjects = body["subjects"]
    if "number_of_syllabi" in body:
        prof.number_of_syllabi = body["number_of_syllabi"]
    if "number_of_materials" in body:
        prof.number_of_materials = body["number_of_materials"]
    if "teaching_explanation" in body:
        prof.teaching_explanation = body["teaching_explanation"]
    if "tune_preferences" in body:
        prof.tune_preferences = body["tune_preferences"]

    db.commit()
    return jsonify({"message": "Profile updated successfully.", "profile": prof.to_dict()})

@teacher_bp.route("/teacher/avatar", methods=["POST"])
@auth_required(roles=["teacher", "student"])
def upload_avatar(user):
    db = get_db()
    avatar_url = request.form.get("avatar_url") or request.json.get("avatar_url") if request.is_json else None
    
    # Check if a file was uploaded
    if "avatar" in request.files:
        file = request.files["avatar"]
        # In simple environments, data URL or local URL
        import base64
        file_bytes = file.read()
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        avatar_url = f"data:{file.mimetype or 'image/jpeg'};base64,{b64}"

    if not avatar_url:
        return jsonify({"message": "avatar_url or avatar file is required."}), 422

    prof = user.teacher_profile
    if not prof:
        prof = TeacherProfile(user_id=user.id)
        db.add(prof)
    prof.avatar_url = avatar_url
    db.commit()

    return jsonify({"message": "Avatar updated.", "avatar_url": avatar_url})

@teacher_bp.route("/teacher/onboarding", methods=["POST"])
@auth_required(roles="teacher")
def teacher_onboarding(user):
    db = get_db()
    prof = user.teacher_profile
    if not prof:
        prof = TeacherProfile(user_id=user.id)
        db.add(prof)

    # 1. Read audio file or text explanation
    audio_file = request.files.get("audio")
    transcript = request.form.get("teaching_explanation", "")

    if audio_file:
        audio_bytes = audio_file.read()
        extracted_transcript = transcribe_audio_bytes(audio_bytes)
        if extracted_transcript:
            transcript = extracted_transcript

    # 2. Teaching style detection
    detected = detect_teaching_style(transcript)
    prof.detected_teaching_style = detected.get("style", "Concept-first")
    prof.teaching_explanation = transcript

    # 3. Read metadata from form
    grades_raw = request.form.get("grades")
    subjects_raw = request.form.get("subjects")
    school_name = request.form.get("school_name")

    if school_name:
        prof.school_name = school_name
    if grades_raw:
        import json
        try:
            prof.grades = json.loads(grades_raw) if isinstance(grades_raw, str) else grades_raw
        except Exception:
            prof.grades = [grades_raw]
    if subjects_raw:
        import json
        try:
            prof.subjects = json.loads(subjects_raw) if isinstance(subjects_raw, str) else subjects_raw
        except Exception:
            prof.subjects = [subjects_raw]

    prof.onboarding_completed = True
    db.commit()

    return jsonify({
        "message": "Onboarding completed successfully.",
        "profile": prof.to_dict(),
        "detected_style": detected,
    })

@teacher_bp.route("/teacher/onboarding-status", methods=["GET"])
@auth_required(roles=["teacher", "student"])
def onboarding_status(user):
    prof = user.teacher_profile
    return jsonify({
        "onboarding_completed": bool(prof and prof.onboarding_completed),
        "profile": prof.to_dict() if prof else None,
    })

@teacher_bp.route("/teacher/account/profile", methods=["PATCH"])
@auth_required(roles=["teacher", "student"])
def account_profile(user):
    db = get_db()
    body = request.get_json() or {}
    name = body.get("name")
    school_name = body.get("school_name")

    if name:
        user.name = name
    if school_name and user.teacher_profile:
        user.teacher_profile.school_name = school_name

    db.commit()
    return jsonify({"message": "Profile updated successfully.", "user": user.to_dict()})

@teacher_bp.route("/teacher/account/password", methods=["POST"])
@auth_required(roles="teacher")
def account_password(user):
    db = get_db()
    body = request.get_json() or {}
    current_pass = body.get("current_password") or ""
    new_pass = body.get("new_password") or ""

    if not check_password(current_pass, user.password):
        return jsonify({"message": "Current password is incorrect."}), 422

    if len(new_pass) < 8:
        return jsonify({"message": "Password must be at least 8 characters."}), 422

    user.password = hash_password(new_pass)
    user.password_changed_at = datetime.utcnow()
    db.commit()

    return jsonify({"message": "Password changed successfully."})

@teacher_bp.route("/teacher/account/email/start", methods=["POST"])
@auth_required(roles="teacher")
def email_start(user):
    db = get_db()
    body = request.get_json() or {}
    new_email = (body.get("new_email") or "").strip().lower()

    if not new_email or new_email == user.email:
        return jsonify({"message": "Please enter a valid different email address."}), 422

    existing = db.query(User).filter_by(email=new_email).first()
    if existing:
        return jsonify({"message": "This email is already in use by another account."}), 422

    otp = generate_otp()
    user.pending_email = new_email
    user.email_change_code = otp
    user.email_change_expires_at = datetime.utcnow() + timedelta(minutes=15)
    user.email_change_phase = "awaiting_old_otp"
    db.commit()

    send_otp_email(user.email, otp, "email change verification (current inbox)")
    return jsonify({"message": "Verification code sent to your current email.", "phase": "awaiting_old_otp"})

@teacher_bp.route("/teacher/account/email/verify-old", methods=["POST"])
@auth_required(roles="teacher")
def email_verify_old(user):
    db = get_db()
    body = request.get_json() or {}
    code = str(body.get("code") or "").strip()

    if user.email_change_phase != "awaiting_old_otp" or user.email_change_code != code:
        return jsonify({"message": "Invalid code."}), 422

    new_otp = generate_otp()
    user.email_change_code = new_otp
    user.email_change_phase = "awaiting_new_otp"
    user.email_change_expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    send_otp_email(user.pending_email, new_otp, "email change verification (new inbox)")
    return jsonify({"message": "Code verified! Now check your new email for the second code.", "phase": "awaiting_new_otp"})

@teacher_bp.route("/teacher/account/email/verify-new", methods=["POST"])
@auth_required(roles="teacher")
def email_verify_new(user):
    db = get_db()
    body = request.get_json() or {}
    code = str(body.get("code") or "").strip()

    if user.email_change_phase != "awaiting_new_otp" or user.email_change_code != code:
        return jsonify({"message": "Invalid code."}), 422

    user.email = user.pending_email
    user.pending_email = None
    user.email_change_code = None
    user.email_change_phase = None
    user.email_changed_at = datetime.utcnow()
    db.commit()

    return jsonify({"message": "Email address updated successfully!", "email": user.email})

@teacher_bp.route("/teacher/account/logout-all-sessions", methods=["POST"])
@auth_required(roles="teacher")
def logout_all_sessions(user):
    # In token-based auth, changing remember_token or password_changed_at effectively resets sessions
    db = get_db()
    user.password_changed_at = datetime.utcnow()
    db.commit()
    return jsonify({"message": "All other sessions have been logged out."})

@teacher_bp.route("/teacher/insights", methods=["GET"])
@auth_required(roles=["teacher", "student"])
def teacher_insights(user):
    db = get_db()
    turns = db.query(LearnTurn).filter_by(teacher_id=user.id).order_by(LearnTurn.created_at.desc()).limit(100).all()

    # Aggregate by subject
    subjects_data = {}
    for t in turns:
        subj = t.subject or "General"
        if subj not in subjects_data:
            subjects_data[subj] = {
                "subject": subj,
                "today_questions_count": 0,
                "self_learned_topics": set(),
                "frequent_lessons": {},
                "recent_questions": []
            }
        data = subjects_data[subj]
        data["today_questions_count"] += 1
        if t.lesson:
            data["frequent_lessons"][t.lesson] = data["frequent_lessons"].get(t.lesson, 0) + 1
        if t.topics and isinstance(t.topics, list):
            for top in t.topics:
                data["self_learned_topics"].add(top)
        if len(data["recent_questions"]) < 12:
            data["recent_questions"].append({
                "id": t.id,
                "question": t.question,
                "lesson": t.lesson,
                "created_at": t.created_at.isoformat()
            })

    output = []
    for subj, val in subjects_data.items():
        sorted_lessons = sorted(val["frequent_lessons"].items(), key=lambda x: x[1], reverse=True)
        output.append({
            "subject": subj,
            "today_questions_count": val["today_questions_count"],
            "self_learned_topics": list(val["self_learned_topics"])[:10],
            "frequent_lessons": [{"lesson": k, "count": v} for k, v in sorted_lessons[:5]],
            "recent_questions": val["recent_questions"],
            "insights_bullets": [
                f"Most asked concepts today centered around {sorted_lessons[0][0]}" if sorted_lessons else "Class engagement is active across multiple foundational units.",
                "Students showed high retention on basic definitions but sought clarity on multi-step problems."
            ]
        })

    return jsonify({"insights": output})

@teacher_bp.route("/teacher/tune/preview", methods=["POST"])
@auth_required(roles=["teacher", "student"])
def tune_preview(user):
    body = request.get_json() or {}
    topic = body.get("topic", "Introduction to Physics")
    tune_prefs = body.get("tune_preferences", {})

    prof = user.teacher_profile.to_dict() if user.teacher_profile else {}
    prof["tune_preferences"] = tune_prefs

    sys_prompt = build_teacher_system_prompt(prof, teacher_name=user.name)
    user_prompt = f"Explain {topic} in 120-200 spoken words for a student."

    preview_text = chat_completion(sys_prompt, [{"role": "user", "content": user_prompt}], max_tokens=300, temperature=0.6)

    return jsonify({"preview": preview_text})

@teacher_bp.route("/teacher/tune/save", methods=["POST"])
@auth_required(roles=["teacher", "student"])
def tune_save(user):
    db = get_db()
    body = request.get_json() or {}
    tune_prefs = body.get("tune_preferences", {})

    prof = user.teacher_profile
    if not prof:
        prof = TeacherProfile(user_id=user.id)
        db.add(prof)

    prof.tune_preferences = tune_prefs
    db.commit()

    return jsonify({"message": "Tune preferences published successfully.", "profile": prof.to_dict()})

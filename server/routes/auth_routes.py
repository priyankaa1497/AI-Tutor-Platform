from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from ..database import get_db
from ..models import User, TeacherProfile, StudentProfile, Board, BoardGrade, Institution
from ..services.auth_service import hash_password, check_password, generate_otp, generate_token, auth_required
from ..services.mailer import send_otp_email

auth_bp = Blueprint("auth", __name__)

DEMO_ACCOUNTS = {
    "student": "rsamy2426@gmail.com",
    "teacher": "ram.holoroid@gmail.com",
}

def user_to_public(user):
    onboarding_completed = True
    if user.role == "teacher":
        onboarding_completed = bool(user.teacher_profile and user.teacher_profile.onboarding_completed)
    data = user.to_dict()
    data["onboarding_completed"] = onboarding_completed
    return data

@auth_bp.route("/login", methods=["POST"])
def login():
    db = get_db()
    body = request.get_json() or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    role = (body.get("role") or "").strip().lower()

    user = db.query(User).filter_by(email=email).first()
    if not user or not check_password(password, user.password):
        return jsonify({"message": "Invalid email or password."}), 401

    if role and user.role != role:
        expected = user.role.capitalize()
        return jsonify({
            "message": f"This account is registered as a {expected}. Please select '{expected}' and try again.",
            "role": user.role,
        }), 403

    token = generate_token(user)
    return jsonify({
        "message": "Logged in successfully.",
        "token": token,
        "user": user_to_public(user),
    })

@auth_bp.route("/login/demo", methods=["POST"])
def demo_login():
    db = get_db()
    body = request.get_json() or {}
    role = (body.get("role") or "").strip().lower()
    target_email = DEMO_ACCOUNTS.get(role)
    if not target_email:
        return jsonify({"message": "Unknown demo role."}), 422

    user = db.query(User).filter_by(email=target_email).first()
    if not user:
        # Auto-create demo account if not found so demo login always succeeds
        user = User(
            name=f"Demo {role.capitalize()}",
            email=target_email,
            password=hash_password("DemoPassword123!"),
            role=role,
            otp_verified=True,
        )
        db.add(user)
        db.commit()
        if role == "teacher":
            profile = TeacherProfile(
                user_id=user.id,
                school_name="Delhi Public School",
                onboarding_completed=True,
                detected_teaching_style="Concept-first",
                subjects=["Science", "Mathematics"],
                grades=["Class 7", "Class 8"],
                rating=4.85
            )
            db.add(profile)
            db.commit()

    token = generate_token(user)
    return jsonify({
        "message": "Logged in successfully.",
        "token": token,
        "user": user_to_public(user),
    })

@auth_bp.route("/teacher/register", methods=["POST"])
def register_teacher():
    db = get_db()
    body = request.get_json() or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    school_name = (body.get("school_name") or "").strip()

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required."}), 422

    if db.query(User).filter_by(email=email).first():
        return jsonify({"message": "The email has already been taken.", "errors": {"email": ["The email has already been taken."]}}), 422

    otp = generate_otp()
    user = User(
        name=name,
        email=email,
        password=hash_password(password),
        role="teacher",
        otp_code=otp,
        otp_verified=False,
        otp_expires_at=datetime.utcnow() + timedelta(minutes=15),
    )
    db.add(user)
    db.commit()

    profile = TeacherProfile(
        user_id=user.id,
        school_name=school_name,
        onboarding_completed=False,
    )
    db.add(profile)
    db.commit()

    send_otp_email(email, otp, "registration")
    token = generate_token(user)

    return jsonify({
        "message": "Teacher registered successfully.",
        "token": token,
        "user": user_to_public(user),
        "otp_code": otp,
    })

@auth_bp.route("/student/register", methods=["POST"])
def register_student():
    db = get_db()
    body = request.get_json() or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    board_id = body.get("board_id")
    grade = body.get("grade") or body.get("current_grade")
    institution_name = (body.get("institution") or "").strip()

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required."}), 422

    if db.query(User).filter_by(email=email).first():
        return jsonify({"message": "The email has already been taken.", "errors": {"email": ["The email has already been taken."]}}), 422

    # Institution lookup or creation
    inst_id = None
    if institution_name:
        key = institution_name.lower().replace(" ", "-")
        inst = db.query(Institution).filter_by(key=key).first()
        if not inst:
            inst = Institution(key=key, label=institution_name)
            db.add(inst)
            db.commit()
        inst_id = inst.id

    grade_id = None
    if board_id:
        bg = db.query(BoardGrade).filter_by(board_id=board_id).first()
        if bg:
            grade_id = bg.id

    otp = generate_otp()
    user = User(
        name=name,
        email=email,
        password=hash_password(password),
        role="student",
        board_id=board_id,
        grade_id=grade_id,
        grade=str(grade) if grade else None,
        institution_id=inst_id,
        otp_code=otp,
        otp_verified=False,
        otp_expires_at=datetime.utcnow() + timedelta(minutes=15),
    )
    db.add(user)
    db.commit()

    student_prof = StudentProfile(
        user_id=user.id,
        board_id=board_id or 1,
        grade_id=grade_id or 1,
        grade=str(grade) if grade else None,
        institution_id=inst_id,
    )
    db.add(student_prof)
    db.commit()

    send_otp_email(email, otp, "registration")
    token = generate_token(user)

    return jsonify({
        "message": "Student registered successfully.",
        "token": token,
        "user": user_to_public(user),
        "otp_code": otp,
    })

@auth_bp.route("/otp/verify", methods=["POST"])
def verify_otp():
    db = get_db()
    body = request.get_json() or {}
    user_id = body.get("user_id")
    otp_code = str(body.get("otp_code") or "").strip()

    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        return jsonify({"message": "User not found."}), 422

    if user.otp_verified:
        return jsonify({"message": "OTP already verified.", "otp_verified": True})

    if user.otp_code != otp_code:
        return jsonify({"message": "Invalid OTP. Please try again."}), 422

    if user.otp_expires_at and user.otp_expires_at < datetime.utcnow():
        return jsonify({"message": "OTP has expired. Please request a new one."}), 422

    user.otp_verified = True
    user.otp_code = None
    db.commit()

    token = generate_token(user)
    return jsonify({
        "message": "OTP verified successfully.",
        "otp_verified": True,
        "token": token,
        "user": user_to_public(user),
    })

@auth_bp.route("/otp/resend", methods=["POST"])
def resend_otp():
    db = get_db()
    body = request.get_json() or {}
    user_id = body.get("user_id")
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        return jsonify({"message": "User not found."}), 422

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    send_otp_email(user.email, otp, "resend")
    return jsonify({"message": "Verification code resent.", "otp_code": otp})

@auth_bp.route("/me", methods=["GET"])
@auth_required()
def me(user):
    return jsonify({"user": user_to_public(user)})

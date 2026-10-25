from flask import Blueprint, request, jsonify
from ..database import get_db
from ..models import (
    User, StudentProfile, Board, BoardGrade, Subject, Curriculum,
    CurriculumUnit, TeacherRating, StudentLearningRec, QuizAttempt, Quiz
)
from ..services.auth_service import auth_required
from ..services.ai_service import homework_hint_vision

student_bp = Blueprint("student", __name__)

@student_bp.route("/student/dashboard", methods=["GET"])
@auth_required(roles=["student", "teacher"])
def student_dashboard(user):
    db = get_db()
    prof = user.student_profile
    board = db.query(Board).filter_by(id=user.board_id).first() if user.board_id else None
    if not board:
        board = db.query(Board).filter_by(slug="cbse").first() or db.query(Board).first()

    grade = db.query(BoardGrade).filter_by(id=user.grade_id).first() if user.grade_id else None
    if not grade and board:
        grade = db.query(BoardGrade).filter_by(board_id=board.id).first()

    # Recommendations
    recs = db.query(StudentLearningRec).filter_by(student_id=user.id, status="open").order_by(StudentLearningRec.created_at.desc()).limit(5).all()

    # Recent attempts
    attempts = db.query(QuizAttempt).filter_by(student_id=user.id).order_by(QuizAttempt.created_at.desc()).limit(5).all()

    # Find curriculum for this student's board and grade
    curricula = []
    if board and grade:
        curricula = db.query(Curriculum).filter_by(board_id=board.id, grade_id=grade.id).all()
    if not curricula and board:
        curricula = db.query(Curriculum).filter_by(board_id=board.id).all()
    if not curricula:
        curricula = db.query(Curriculum).all()

    # Build subjects tree with units and topics
    subjects_tree = []
    seen_subjects = set()
    for c in curricula:
        if not c.subject or c.subject.id in seen_subjects:
            continue
        seen_subjects.add(c.subject.id)
        subj_data = c.subject.to_dict()
        subj_data["units"] = [u.to_dict() for u in c.units]
        subjects_tree.append(subj_data)

    user_dict = user.to_dict()
    user_dict["board"] = board.to_dict() if board else {"id": 1, "name": "CBSE", "slug": "cbse"}
    user_dict["grade"] = grade.to_dict() if grade else {"id": 1, "label": user.grade or "Class 7"}

    return jsonify({
        "user": user_dict,
        "board": board.to_dict() if board else None,
        "grade": grade.to_dict() if grade else None,
        "subjects": subjects_tree,
        "learning_recommendations": [r.to_dict() for r in recs],
        "recent_attempts": [a.to_dict() for a in attempts],
    })

@student_bp.route("/student/learning-recs", methods=["GET"])
@auth_required(roles=["student", "teacher"])
def get_learning_recs(user):
    db = get_db()
    recs = db.query(StudentLearningRec).filter_by(student_id=user.id, status="open").order_by(StudentLearningRec.created_at.desc()).all()
    return jsonify({"recs": [r.to_dict() for r in recs]})

@student_bp.route("/student/learning-recs", methods=["PATCH"])
@student_bp.route("/student/learning-recs/dismiss-all", methods=["POST"])
@auth_required(roles=["student", "teacher"])
def dismiss_all_learning_recs(user):
    db = get_db()
    db.query(StudentLearningRec).filter_by(student_id=user.id).update({"status": "dismissed"})
    db.commit()
    return jsonify({"message": "All recommendations dismissed."})

@student_bp.route("/student/learning-recs/<int:rec_id>", methods=["PATCH"])
@auth_required(roles=["student", "teacher"])
def dismiss_single_learning_rec(user, rec_id):
    db = get_db()
    rec = db.query(StudentLearningRec).filter_by(id=rec_id, student_id=user.id).first()
    if rec:
        rec.status = "dismissed"
        db.commit()
    return jsonify({"message": "Recommendation dismissed."})


@student_bp.route("/student/session-feedback", methods=["POST"])
@auth_required(roles=["student", "teacher"])
def session_feedback(user):
    db = get_db()
    body = request.get_json() or {}
    teacher_id = body.get("teacher_id")
    rating_val = body.get("rating")
    feedback_text = body.get("feedback", "")

    if not teacher_id or not rating_val:
        return jsonify({"message": "teacher_id and rating are required."}), 422

    rating = TeacherRating(
        student_id=user.id,
        teacher_id=int(teacher_id),
        rating=int(rating_val),
        feedback=feedback_text,
    )
    db.add(rating)
    db.commit()

    # Re-calculate teacher average rating
    teacher = db.query(User).filter_by(id=teacher_id).first()
    if teacher and teacher.teacher_profile:
        all_ratings = db.query(TeacherRating).filter_by(teacher_id=teacher.id).all()
        if all_ratings:
            avg = sum(r.rating for r in all_ratings) / len(all_ratings)
            teacher.teacher_profile.rating = round(avg, 2)
            db.commit()

    return jsonify({"message": "Feedback submitted successfully."})

@student_bp.route("/homework-hint", methods=["POST"])
def homework_hint():
    student_prompt = request.form.get("prompt", "")
    image_file = request.files.get("image")
    if not image_file:
        return jsonify({"message": "No image provided."}), 422

    image_bytes = image_file.read()
    mime_type = image_file.mimetype or "image/jpeg"
    hint_text = homework_hint_vision(image_bytes, mime_type, student_prompt)

    return jsonify({"hint": hint_text})

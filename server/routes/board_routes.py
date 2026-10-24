from flask import Blueprint, request, jsonify
from ..database import get_db
from ..models import Board, Subject, Institution, User, TeacherProfile

board_bp = Blueprint("boards", __name__)

@board_bp.route("/boards", methods=["GET"])
def get_boards():
    db = get_db()
    boards = db.query(Board).all()
    return jsonify({"boards": [b.to_dict() for b in boards]})

@board_bp.route("/subjects", methods=["GET"])
def get_subjects():
    db = get_db()
    query = request.args.get("query", "").strip().lower()
    if not query:
        subjects = db.query(Subject).limit(20).all()
    else:
        subjects = db.query(Subject).filter(Subject.label.ilike(f"%{query}%")).limit(10).all()
    return jsonify({"subjects": [s.to_dict() for s in subjects]})

@board_bp.route("/subjects", methods=["POST"])
def create_subject():
    db = get_db()
    body = request.get_json() or {}
    label = (body.get("label") or "").strip()
    if not label:
        return jsonify({"message": "label is required."}), 422
    key = label.lower().replace(" ", "-")
    subject = db.query(Subject).filter_by(key=key).first()
    if not subject:
        subject = Subject(key=key, label=label)
        db.add(subject)
        db.commit()
    return jsonify({"subject": subject.to_dict()})

@board_bp.route("/institutions", methods=["GET"])
def get_institutions():
    db = get_db()
    query = request.args.get("query", "").strip().lower()
    if not query:
        insts = db.query(Institution).limit(20).all()
    else:
        insts = db.query(Institution).filter(Institution.label.ilike(f"%{query}%")).limit(10).all()
    return jsonify({"institutions": [i.to_dict() for i in insts]})

@board_bp.route("/institutions", methods=["POST"])
def create_institution():
    db = get_db()
    body = request.get_json() or {}
    label = (body.get("label") or "").strip()
    if not label:
        return jsonify({"message": "label is required."}), 422
    key = label.lower().replace(" ", "-")
    inst = db.query(Institution).filter_by(key=key).first()
    if not inst:
        inst = Institution(key=key, label=label)
        db.add(inst)
        db.commit()
    return jsonify({"institution": inst.to_dict()})

@board_bp.route("/teachers", methods=["GET"])
def get_teachers():
    db = get_db()
    subject = request.args.get("subject", "").strip().lower()
    teachers_query = db.query(User).filter_by(role="teacher").all()

    result = []
    for t in teachers_query:
        prof = t.teacher_profile
        if not prof:
            continue
        subjects = prof.subjects or []
        if subject:
            if not any(subject in str(s).lower() for s in subjects):
                continue
        result.append({
            "id": t.id,
            "name": t.name,
            "school": prof.school_name or "Faculty",
            "school_name": prof.school_name or "Faculty",
            "rating": float(prof.rating) if prof.rating else 4.8,
            "avatar_url": prof.avatar_url,
            "style": prof.detected_teaching_style or "Concept-first",
            "detected_teaching_style": prof.detected_teaching_style or "Concept-first",
            "subjects": subjects,
            "grades": prof.grades or [],
        })
    return jsonify({"teachers": result})

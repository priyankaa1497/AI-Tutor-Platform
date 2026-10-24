import json
import re
from datetime import datetime
from flask import Blueprint, request, jsonify
from ..database import get_db
from ..models import (
    User, Board, BoardGrade, Subject, Curriculum, CurriculumUnit,
    Quiz, QuizQuestion, QuizAttempt, QuizAttemptAnswer, StudentLearningRec
)
from ..services.auth_service import auth_required
from ..services.ai_service import chat_completion

quiz_bp = Blueprint("quiz", __name__)

@quiz_bp.route("/teacher/curriculum", methods=["GET"])
@auth_required(roles="teacher")
def get_curriculum(user):
    db = get_db()
    curricula = db.query(Curriculum).all()
    tree = []
    for c in curricula:
        tree.append({
            "id": c.id,
            "board": c.board.name if c.board else "",
            "board_id": c.board_id,
            "grade": c.board_grade.label if c.board_grade else c.grade,
            "grade_id": c.grade_id,
            "subject": c.subject.label if c.subject else "",
            "subject_id": c.subject_id,
            "units": [u.to_dict() for u in c.units]
        })
    return jsonify({"curriculum": tree})

@quiz_bp.route("/teacher/quizzes", methods=["GET"])
@auth_required(roles="teacher")
def list_teacher_quizzes(user):
    db = get_db()
    quiz_type = request.args.get("type")
    query = db.query(Quiz).filter_by(teacher_id=user.id)
    if quiz_type:
        query = query.filter_by(quiz_type=quiz_type)
    quizzes = query.order_by(Quiz.created_at.desc()).all()
    return jsonify({"quizzes": [q.to_dict() for q in quizzes]})

@quiz_bp.route("/teacher/quizzes", methods=["POST"])
@auth_required(roles="teacher")
def create_teacher_quiz(user):
    db = get_db()
    body = request.get_json() or {}
    quiz_type = body.get("quiz_type", "quiz")
    default_title = "Practice Quiz" if quiz_type == "quiz" else "Board Exam Mock Test"
    title = body.get("title", default_title)
    board_id = body.get("board_id")
    grade_id = body.get("grade_id") or 1
    grade_label = body.get("grade_label", "Class 7")
    subject_id = body.get("subject_id")
    subject_label = body.get("subject_label", "Science")
    unit_id = body.get("curriculum_unit_id")
    lesson_title = body.get("lesson_title", "General Topic")
    topic_title = body.get("topic_title")
    difficulty = body.get("difficulty", "beginner" if quiz_type == "quiz" else "exam")
    question_count = int(body.get("question_count", 5))
    duration_minutes = int(body.get("duration_minutes", 15 if quiz_type == "quiz" else 30))
    total_marks = int(body.get("total_marks", 100))
    pass_percentage = int(body.get("pass_percentage", 50))

    quiz = Quiz(
        teacher_id=user.id,
        title=title,
        board_id=board_id,
        grade_id=grade_id,
        grade_label=grade_label,
        subject_id=subject_id,
        subject_label=subject_label,
        curriculum_unit_id=unit_id,
        lesson_title=lesson_title,
        topic_title=topic_title,
        difficulty=difficulty,
        quiz_type=quiz_type,
        duration_minutes=duration_minutes,
        total_marks=total_marks,
        pass_percentage=pass_percentage,
        question_count=question_count,
        status="draft"
    )
    db.add(quiz)
    db.commit()

    return jsonify({"quiz": quiz.to_dict()})

@quiz_bp.route("/teacher/quizzes/<int:quiz_id>", methods=["GET"])
@auth_required(roles="teacher")
def get_teacher_quiz(user, quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id, teacher_id=user.id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found."}), 404
    return jsonify({"quiz": quiz.to_dict()})

@quiz_bp.route("/teacher/quizzes/<int:quiz_id>/publish", methods=["POST"])
@auth_required(roles="teacher")
def publish_teacher_quiz(user, quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id, teacher_id=user.id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found."}), 404

    quiz.status = "published"
    quiz.published_at = datetime.utcnow()
    quiz.question_count = len(quiz.questions)
    db.commit()

    return jsonify({"message": "Quiz published successfully.", "quiz": quiz.to_dict()})

@quiz_bp.route("/teacher/quizzes/<int:quiz_id>/questions", methods=["POST"])
@auth_required(roles="teacher")
def generate_questions(user, quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id, teacher_id=user.id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found."}), 404

    body = request.get_json() or {}
    count = int(body.get("count", quiz.question_count or 5))

    if quiz.quiz_type == "mock_test":
        prompt = (
            f"Generate {count} rigorous multiple-choice examination questions for {quiz.grade_label} {quiz.subject_label} "
            f"board exam mock test on '{quiz.lesson_title}' ({quiz.topic_title or 'Comprehensive Unit'}). Difficulty: {quiz.difficulty or 'exam'}.\n"
            "Requirements for Mock Exam questions:\n"
            "1. Authentic curriculum board exam style scenario with high conceptual validity.\n"
            "2. Exactly 4 clear options (A, B, C, D) with plausible distractors.\n"
            "3. State the exact correct option letter.\n"
            "4. Provide step-by-step rigorous explanation and a misconception hint.\n"
            "Return strict JSON array with elements: "
            "{\"type\": \"mcq\", \"prompt\": \"...\", \"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"], "
            "\"correct_answer\": \"A\", \"explanation\": \"...\", \"misconception_hint\": \"...\"}"
        )
    else:
        prompt = (
            f"Generate {count} multiple-choice quiz questions for {quiz.grade_label} {quiz.subject_label} "
            f"on '{quiz.lesson_title}' ({quiz.topic_title or 'General'}). Difficulty: {quiz.difficulty}.\n"
            "Return strict JSON array with elements: "
            "{\"type\": \"mcq\", \"prompt\": \"...\", \"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"], "
            "\"correct_answer\": \"A\", \"explanation\": \"...\", \"misconception_hint\": \"...\"}"
        )

    reply = chat_completion("You are an educational assessment expert. Return JSON array only.", [{"role": "user", "content": prompt}], max_tokens=1500, temperature=0.5)

    created_questions = []
    try:
        match = re.search(r"\[.*\]", reply, re.DOTALL)
        if match:
            items = json.loads(match.group(0))
            for idx, item in enumerate(items):
                q = QuizQuestion(
                    quiz_id=quiz.id,
                    sort_order=len(quiz.questions) + idx + 1,
                    type=item.get("type", "mcq"),
                    prompt=item.get("prompt", "Question"),
                    options=item.get("options", []),
                    correct_answer=str(item.get("correct_answer", "A")),
                    explanation=item.get("explanation", "Standard explanation."),
                    misconception_hint=item.get("misconception_hint", "Check key terms."),
                )
                db.add(q)
                created_questions.append(q)
            db.commit()
    except Exception as e:
        print(f"[QUIZ GEN ERROR] {e}")

    # Fallback if no questions parsed
    if not created_questions:
        q = QuizQuestion(
            quiz_id=quiz.id,
            sort_order=1,
            type="mcq",
            prompt=f"Which fundamental principle governs {quiz.lesson_title}?",
            options=["A. Conservation of Energy", "B. Newton's Third Law", "C. Ohm's Law", "D. Dalton's Atomic Theory"],
            correct_answer="A",
            explanation="The principle is foundational to this syllabus topic.",
            misconception_hint="Look at energy transformations.",
        )
        db.add(q)
        db.commit()
        created_questions.append(q)

    quiz.question_count = len(quiz.questions)
    db.commit()

    return jsonify({"questions": [q.to_dict() for q in created_questions]})

@quiz_bp.route("/teacher/quizzes/<int:quiz_id>/analytics", methods=["GET"])
@auth_required(roles="teacher")
def quiz_analytics(user, quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id, teacher_id=user.id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found."}), 404

    attempts = db.query(QuizAttempt).filter_by(quiz_id=quiz.id).all()
    completed = [a for a in attempts if a.status == "completed"]
    scores = [float(a.score_percent) for a in completed if a.score_percent is not None]

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    return jsonify({
        "quiz_id": quiz.id,
        "total_attempted": len(attempts),
        "total_completed": len(completed),
        "average_score": avg_score,
        "highest_score": max(scores) if scores else 0,
        "lowest_score": min(scores) if scores else 0,
    })

# --- STUDENT QUIZ & MOCK TEST ROUTES ---

@quiz_bp.route("/student/quizzes", methods=["GET"])
@auth_required(roles="student")
def list_student_quizzes(user):
    db = get_db()
    quiz_type = request.args.get("type", "quiz")
    query = db.query(Quiz).filter_by(status="published")
    if quiz_type:
        query = query.filter_by(quiz_type=quiz_type)
    quizzes = query.order_by(Quiz.created_at.desc()).all()

    attempts_by_quiz = {a.quiz_id: a for a in user.quiz_attempts}

    all_quizzes = []
    available, in_progress, completed = [], [], []
    for q in quizzes:
        att = attempts_by_quiz.get(q.id)
        q_data = q.to_dict()
        if not att:
            q_data["bucket"] = "available"
            available.append(q_data)
        elif att.status == "completed":
            q_data["bucket"] = "completed"
            q_data["attempt"] = att.to_dict()
            q_data["score_percent"] = float(att.score_percent) if att.score_percent is not None else None
            completed.append(q_data)
        else:
            q_data["bucket"] = "active"
            q_data["attempt"] = att.to_dict()
            in_progress.append(q_data)
        all_quizzes.append(q_data)

    return jsonify({
        "quizzes": all_quizzes,
        "available": available,
        "in_progress": in_progress,
        "completed": completed,
    })

@quiz_bp.route("/student/mock-tests", methods=["GET"])
@auth_required(roles="student")
def list_student_mock_tests(user):
    db = get_db()
    quizzes = db.query(Quiz).filter_by(status="published", quiz_type="mock_test").order_by(Quiz.created_at.desc()).all()

    attempts_by_quiz = {a.quiz_id: a for a in user.quiz_attempts}

    all_tests = []
    available, in_progress, completed = [], [], []
    for q in quizzes:
        att = attempts_by_quiz.get(q.id)
        q_data = q.to_dict()
        if not att:
            q_data["bucket"] = "available"
            available.append(q_data)
        elif att.status == "completed":
            q_data["bucket"] = "completed"
            q_data["attempt"] = att.to_dict()
            q_data["score_percent"] = float(att.score_percent) if att.score_percent is not None else None
            completed.append(q_data)
        else:
            q_data["bucket"] = "active"
            q_data["attempt"] = att.to_dict()
            in_progress.append(q_data)
        all_tests.append(q_data)

    return jsonify({
        "mock_tests": all_tests,
        "available": available,
        "in_progress": in_progress,
        "completed": completed,
    })

@quiz_bp.route("/student/quizzes/<int:quiz_id>", methods=["GET"])
@auth_required(roles="student")
def get_student_quiz(user, quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id, status="published").first()
    if not quiz:
        return jsonify({"message": "Quiz not found."}), 404

    attempt = db.query(QuizAttempt).filter_by(quiz_id=quiz.id, student_id=user.id).first()
    questions_data = []
    answers_by_qid = {a.question_id: a for a in attempt.answers} if attempt else {}

    for q in quiz.questions:
        ans = answers_by_qid.get(q.id)
        revealed = bool(attempt and attempt.status == "completed") or bool(ans and (ans.is_correct or ans.incorrect_attempts >= 2))
        q_dict = q.to_dict(include_answer=revealed)
        if ans:
            q_dict["user_answer"] = ans.latest_answer
            q_dict["is_correct"] = ans.is_correct
            q_dict["tutor_thread"] = ans.tutor_thread or []
        questions_data.append(q_dict)

    data = quiz.to_dict()
    data["questions"] = questions_data
    data["attempt"] = attempt.to_dict() if attempt else None
    return jsonify({"quiz": data, "questions": questions_data, "attempt": attempt.to_dict() if attempt else None})

@quiz_bp.route("/student/quizzes/<int:quiz_id>/start", methods=["POST"])
@auth_required(roles="student")
def start_quiz_attempt(user, quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id, status="published").first()
    if not quiz:
        return jsonify({"message": "Quiz not found."}), 404

    attempt = db.query(QuizAttempt).filter_by(quiz_id=quiz.id, student_id=user.id).first()
    if not attempt:
        attempt = QuizAttempt(quiz_id=quiz.id, student_id=user.id, status="in_progress")
        db.add(attempt)
        db.commit()

    questions_data = []
    answers_by_qid = {a.question_id: a for a in attempt.answers} if attempt else {}
    for q in quiz.questions:
        ans = answers_by_qid.get(q.id)
        revealed = bool(attempt.status == "completed") or bool(ans and (ans.is_correct or ans.incorrect_attempts >= 2))
        q_dict = q.to_dict(include_answer=revealed)
        if ans:
            q_dict["user_answer"] = ans.latest_answer
            q_dict["is_correct"] = ans.is_correct
            q_dict["tutor_thread"] = ans.tutor_thread or []
        questions_data.append(q_dict)

    quiz_data = quiz.to_dict()
    quiz_data["questions"] = questions_data
    quiz_data["attempt"] = attempt.to_dict()

    return jsonify({
        "message": "Quiz started.",
        "quiz": quiz_data,
        "questions": questions_data,
        "attempt": attempt.to_dict(),
    })

@quiz_bp.route("/student/quiz-attempts/<int:attempt_id>", methods=["GET"])
@auth_required(roles="student")
def get_attempt_by_id(user, attempt_id):
    db = get_db()
    attempt = db.query(QuizAttempt).filter_by(id=attempt_id, student_id=user.id).first()
    if not attempt:
        return jsonify({"message": "Attempt not found."}), 404

    quiz = attempt.quiz
    questions_data = []
    answers_by_qid = {a.question_id: a for a in attempt.answers}
    for q in quiz.questions:
        ans = answers_by_qid.get(q.id)
        revealed = bool(attempt.status == "completed") or bool(ans and (ans.is_correct or ans.incorrect_attempts >= 2))
        q_dict = q.to_dict(include_answer=revealed)
        if ans:
            q_dict["user_answer"] = ans.latest_answer
            q_dict["is_correct"] = ans.is_correct
            q_dict["tutor_thread"] = ans.tutor_thread or []
        questions_data.append(q_dict)

    return jsonify({
        "attempt": attempt.to_dict(),
        "quiz": quiz.to_dict(),
        "questions": questions_data,
    })

@quiz_bp.route("/student/quizzes/<int:quiz_id>/answer", methods=["POST"])
@quiz_bp.route("/student/quiz-attempts/<int:quiz_id>/submit-answer", methods=["POST"])
@auth_required(roles="student")
def submit_answer(user, quiz_id):
    db = get_db()
    body = request.get_json() or {}
    question_id = body.get("question_id")
    answer_text = str(body.get("answer", "")).strip()

    # Determine whether quiz_id was an attempt_id or quiz_id
    attempt = db.query(QuizAttempt).filter_by(id=quiz_id, student_id=user.id).first()
    if not attempt:
        attempt = db.query(QuizAttempt).filter_by(quiz_id=quiz_id, student_id=user.id).first()
        if not attempt:
            attempt = QuizAttempt(quiz_id=quiz_id, student_id=user.id, status="in_progress")
            db.add(attempt)
            db.commit()

    question = db.query(QuizQuestion).filter_by(id=question_id, quiz_id=attempt.quiz_id).first()
    if not question:
        return jsonify({"message": "Question not found."}), 404

    q_ans = db.query(QuizAttemptAnswer).filter_by(attempt_id=attempt.id, question_id=question.id).first()
    if not q_ans:
        q_ans = QuizAttemptAnswer(attempt_id=attempt.id, question_id=question.id, first_answer=answer_text)
        db.add(q_ans)

    norm_expected = question.correct_answer.strip().lower()
    norm_given = answer_text.strip().lower()
    is_correct = (norm_expected == norm_given) or norm_given.startswith(norm_expected)

    if q_ans.first_is_correct is None:
        q_ans.first_is_correct = is_correct

    q_ans.latest_answer = answer_text
    q_ans.is_correct = is_correct

    if not is_correct:
        q_ans.incorrect_attempts += 1
    else:
        q_ans.revealed = True

    if q_ans.incorrect_attempts >= 2:
        q_ans.revealed = True

    tutor_reply = ""
    if is_correct:
        tutor_reply = f"Correct! {question.explanation}"
    else:
        tutor_reply = f"Not quite. Hint: {question.misconception_hint or 'Look closely at the question.'}"

    thread = q_ans.tutor_thread or []
    thread.append({"sender": "student", "text": answer_text})
    thread.append({"sender": "tutor", "text": tutor_reply})
    q_ans.tutor_thread = thread

    db.commit()

    total_q = len(question.quiz.questions)
    all_ans = db.query(QuizAttemptAnswer).filter_by(attempt_id=attempt.id).all()
    if len(all_ans) >= total_q and all(a.is_correct or a.incorrect_attempts >= 2 for a in all_ans):
        attempt.status = "completed"
        attempt.completed_at = datetime.utcnow()
        correct_count = sum(1 for a in all_ans if a.first_is_correct)
        attempt.correct_count = correct_count
        attempt.score_percent = round((correct_count / total_q) * 100, 2)
        db.commit()

        if attempt.score_percent < 80:
            rec = StudentLearningRec(
                student_id=user.id,
                teacher_id=question.quiz.teacher_id,
                quiz_id=question.quiz.id,
                subject=question.quiz.subject_label,
                lesson=question.quiz.lesson_title,
                topic=question.quiz.topic_title or question.quiz.lesson_title,
                reason=f"Scored {attempt.score_percent}% on {question.quiz.title}. Review foundational concepts in Learn chat."
            )
            db.add(rec)
            db.commit()

    return jsonify({
        "is_correct": is_correct,
        "first_is_correct": q_ans.first_is_correct,
        "hint_count": q_ans.hint_count,
        "incorrect_attempts": q_ans.incorrect_attempts,
        "revealed": q_ans.revealed,
        "correct_answer": question.correct_answer if q_ans.revealed else None,
        "explanation": question.explanation if q_ans.revealed else None,
        "tutor_reply": tutor_reply,
        "feedback": tutor_reply,
        "tutor_thread": q_ans.tutor_thread,
        "attempt": attempt.to_dict(),
    })

@quiz_bp.route("/student/quiz-attempts/<int:attempt_id>/tutor", methods=["POST"])
@auth_required(roles="student")
def quiz_tutor_chat(user, attempt_id):
    db = get_db()
    attempt = db.query(QuizAttempt).filter_by(id=attempt_id, student_id=user.id).first()
    if not attempt:
        return jsonify({"message": "Attempt not found."}), 404

    body = request.get_json() or {}
    question_id = body.get("question_id")
    message = str(body.get("message", "")).strip()

    question = db.query(QuizQuestion).filter_by(id=question_id, quiz_id=attempt.quiz_id).first()
    if not question:
        return jsonify({"message": "Question not found."}), 404

    q_ans = db.query(QuizAttemptAnswer).filter_by(attempt_id=attempt.id, question_id=question.id).first()
    if not q_ans:
        q_ans = QuizAttemptAnswer(attempt_id=attempt.id, question_id=question.id)
        db.add(q_ans)

    system_prompt = (
        "You are a supportive, Socratic AI tutor helping a student with a quiz question.\n"
        f"Question: {question.prompt}\n"
        f"Options: {json.dumps(question.options)}\n"
        f"Correct Answer: {question.correct_answer}\n"
        f"Explanation: {question.explanation}\n"
        f"Misconception Hint: {question.misconception_hint}\n"
        "Guidelines:\n"
        "- Do NOT reveal the correct answer directly unless revealed flag is true.\n"
        "- Guide the student with a clarifying question or conceptual stepping stone.\n"
        "- Keep replies short, warm, and engaging (1-2 sentences)."
    )

    tutor_reply = chat_completion(
        system_prompt,
        [{"role": "user", "content": message}],
        max_tokens=250,
        temperature=0.6
    )

    thread = q_ans.tutor_thread or []
    thread.append({"sender": "student", "text": message})
    thread.append({"sender": "tutor", "text": tutor_reply})
    q_ans.tutor_thread = thread
    db.commit()

    return jsonify({"tutor_reply": tutor_reply, "reply": tutor_reply, "tutor_thread": thread})

@quiz_bp.route("/student/quiz-attempts/<int:attempt_id>/complete", methods=["POST"])
@auth_required(roles="student")
def complete_quiz_attempt(user, attempt_id):
    db = get_db()
    attempt = db.query(QuizAttempt).filter_by(id=attempt_id, student_id=user.id).first()
    if not attempt:
        return jsonify({"message": "Attempt not found."}), 404

    total_q = len(attempt.quiz.questions)
    all_ans = db.query(QuizAttemptAnswer).filter_by(attempt_id=attempt.id).all()
    correct_count = sum(1 for a in all_ans if a.is_correct or a.first_is_correct)
    score_pct = round((correct_count / total_q) * 100, 2) if total_q > 0 else 0.0

    attempt.status = "completed"
    attempt.completed_at = datetime.utcnow()
    attempt.correct_count = correct_count
    attempt.score_percent = score_pct
    db.commit()

    return jsonify({"message": "Attempt completed.", "attempt": attempt.to_dict()})

# --- MOCK TEST FULL EXAM ENGINE ---

@quiz_bp.route("/student/mock-tests/<int:quiz_id>/start", methods=["POST"])
@auth_required(roles="student")
def start_mock_test(user, quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id, status="published").first()
    if not quiz:
        return jsonify({"message": "Mock test not found."}), 404

    attempt = db.query(QuizAttempt).filter_by(quiz_id=quiz.id, student_id=user.id).first()
    if not attempt:
        attempt = QuizAttempt(quiz_id=quiz.id, student_id=user.id, status="in_progress")
        db.add(attempt)
        db.commit()

    # In exam mode, never reveal correct answers until test is completed
    is_completed = attempt.status == "completed"
    questions_data = []
    answers_by_qid = {a.question_id: a for a in attempt.answers}
    for q in quiz.questions:
        ans = answers_by_qid.get(q.id)
        q_dict = q.to_dict(include_answer=is_completed)
        if ans:
            q_dict["user_answer"] = ans.latest_answer
            q_dict["is_correct"] = ans.is_correct if is_completed else None
        questions_data.append(q_dict)

    return jsonify({
        "message": "Mock test session active.",
        "quiz": quiz.to_dict(),
        "questions": questions_data,
        "attempt": attempt.to_dict(),
        "summary": attempt.summary_json if is_completed else None
    })

@quiz_bp.route("/student/mock-tests/<int:quiz_id>/submit", methods=["POST"])
@auth_required(roles="student")
def submit_mock_test(user, quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id, status="published").first()
    if not quiz:
        return jsonify({"message": "Mock test not found."}), 404

    body = request.get_json() or {}
    user_answers = body.get("answers", {}) # e.g. {"1": "Chlorophyll", ...}
    marked_review = body.get("marked_for_review", []) # list of question IDs
    time_spent_seconds = int(body.get("time_spent_seconds", 0))

    attempt = db.query(QuizAttempt).filter_by(quiz_id=quiz.id, student_id=user.id).first()
    if not attempt:
        attempt = QuizAttempt(quiz_id=quiz.id, student_id=user.id, status="in_progress")
        db.add(attempt)
        db.commit()

    questions = quiz.questions
    total_q = len(questions)
    correct_count = 0
    detailed_results = []

    for q in questions:
        ans_text = str(user_answers.get(str(q.id)) or user_answers.get(q.id) or "").strip()
        is_answered = bool(ans_text)

        norm_expected = q.correct_answer.strip().lower()
        norm_given = ans_text.strip().lower()
        is_correct = False
        if is_answered:
            is_correct = (norm_expected == norm_given) or norm_given.startswith(norm_expected)
            if is_correct:
                correct_count += 1

        q_ans = db.query(QuizAttemptAnswer).filter_by(attempt_id=attempt.id, question_id=q.id).first()
        if not q_ans:
            q_ans = QuizAttemptAnswer(attempt_id=attempt.id, question_id=q.id, first_answer=ans_text)
            db.add(q_ans)

        q_ans.latest_answer = ans_text
        q_ans.is_correct = is_correct
        q_ans.first_is_correct = is_correct
        q_ans.revealed = True

        status = "unanswered"
        if is_answered:
            status = "correct" if is_correct else "incorrect"

        detailed_results.append({
            "question_id": q.id,
            "sort_order": q.sort_order,
            "prompt": q.prompt,
            "options": q.options,
            "user_answer": ans_text,
            "correct_answer": q.correct_answer,
            "is_correct": is_correct,
            "status": status,
            "marked_for_review": q.id in marked_review,
            "explanation": q.explanation,
            "misconception_hint": q.misconception_hint,
            "topic_title": q.topic_title or quiz.lesson_title,
        })

    score_pct = round((correct_count / total_q) * 100, 2) if total_q > 0 else 0.0
    total_marks = quiz.total_marks or 100
    marks_obtained = round((score_pct / 100.0) * total_marks, 1)
    pass_pct = quiz.pass_percentage or 50
    passed = score_pct >= pass_pct

    attempt.status = "completed"
    attempt.completed_at = datetime.utcnow()
    attempt.score_percent = score_pct
    attempt.correct_count = correct_count
    attempt.total_time_ms = time_spent_seconds * 1000

    summary = {
        "total_questions": total_q,
        "correct_count": correct_count,
        "incorrect_count": total_q - correct_count - sum(1 for r in detailed_results if not r["user_answer"]),
        "unattempted_count": sum(1 for r in detailed_results if not r["user_answer"]),
        "score_percent": score_pct,
        "marks_obtained": marks_obtained,
        "total_marks": total_marks,
        "passed": passed,
        "time_spent_seconds": time_spent_seconds,
        "duration_minutes": quiz.duration_minutes or 30,
        "detailed_results": detailed_results,
    }
    attempt.summary_json = summary
    db.commit()

    if score_pct < 75:
        weak_topics = list({r["topic_title"] for r in detailed_results if not r["is_correct"] and r["topic_title"]})
        topic_str = ", ".join(weak_topics[:2]) if weak_topics else quiz.lesson_title
        rec = StudentLearningRec(
            student_id=user.id,
            teacher_id=quiz.teacher_id,
            quiz_id=quiz.id,
            subject=quiz.subject_label,
            lesson=quiz.lesson_title,
            topic=topic_str,
            reason=f"Scored {score_pct}% on mock exam {quiz.title}. Review {topic_str} in Learn chat!"
        )
        db.add(rec)
        db.commit()

    return jsonify({
        "message": "Mock test evaluated.",
        "attempt": attempt.to_dict(),
        "summary": summary,
    })

@quiz_bp.route("/student/mock-tests/<int:quiz_id>/retake", methods=["POST"])
@auth_required(roles="student")
def retake_mock_test(user, quiz_id):
    db = get_db()
    attempt = db.query(QuizAttempt).filter_by(quiz_id=quiz_id, student_id=user.id).first()
    if attempt:
        # Delete prior answers and reset attempt status
        for a in attempt.answers:
            db.delete(a)
        attempt.status = "in_progress"
        attempt.score_percent = None
        attempt.correct_count = 0
        attempt.summary_json = None
        attempt.completed_at = None
        attempt.started_at = datetime.utcnow()
        db.commit()

    return jsonify({"message": "Mock test reset for retake."})

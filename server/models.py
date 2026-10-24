from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Numeric,
    ForeignKey, JSON, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_verified_at = Column(DateTime, nullable=True)
    password = Column(String(255), nullable=False)
    remember_token = Column(String(255), nullable=True)
    role = Column(String(32), default="student", nullable=False, index=True)
    otp_code = Column(String(10), nullable=True)
    otp_verified = Column(Boolean, default=False, nullable=False)
    otp_expires_at = Column(DateTime, nullable=True)
    grade = Column(String(64), nullable=True)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=True)
    grade_id = Column(Integer, ForeignKey("board_grades.id"), nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    password_changed_at = Column(DateTime, nullable=True)
    email_changed_at = Column(DateTime, nullable=True)
    pending_email = Column(String(255), nullable=True)
    email_change_code = Column(String(6), nullable=True)
    email_change_expires_at = Column(DateTime, nullable=True)
    email_change_phase = Column(String(32), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    board = relationship("Board", back_populates="users")
    board_grade = relationship("BoardGrade", back_populates="users")
    institution = relationship("Institution", back_populates="users")
    teacher_profile = relationship("TeacherProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    student_profile = relationship("StudentProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    ratings_given = relationship("TeacherRating", foreign_keys="TeacherRating.student_id", back_populates="student")
    ratings_received = relationship("TeacherRating", foreign_keys="TeacherRating.teacher_id", back_populates="teacher")
    quizzes = relationship("Quiz", back_populates="teacher", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="student", cascade="all, delete-orphan")
    learning_recs = relationship("StudentLearningRec", foreign_keys="StudentLearningRec.student_id", back_populates="student", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "grade": self.grade,
            "board_id": self.board_id,
            "grade_id": self.grade_id,
            "institution_id": self.institution_id,
            "otp_verified": self.otp_verified,
            "password_changed_at": self.password_changed_at.isoformat() if self.password_changed_at else None,
            "email_changed_at": self.email_changed_at.isoformat() if self.email_changed_at else None,
            "onboarding_completed": bool(self.teacher_profile and self.teacher_profile.onboarding_completed) if self.role == "teacher" else True,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(128), unique=True, nullable=False, index=True)
    label = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    curricula = relationship("Curriculum", back_populates="subject", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="subject")

    def to_dict(self):
        return {"id": self.id, "key": self.key, "label": self.label}

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(128), unique=True, nullable=False, index=True)
    label = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="institution")
    students = relationship("StudentProfile", back_populates="institution")

    def to_dict(self):
        return {"id": self.id, "key": self.key, "label": self.label}

class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(128), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    grades = relationship("BoardGrade", back_populates="board", cascade="all, delete-orphan")
    curricula = relationship("Curriculum", back_populates="board", cascade="all, delete-orphan")
    users = relationship("User", back_populates="board")
    students = relationship("StudentProfile", back_populates="board")
    quizzes = relationship("Quiz", back_populates="board")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "grades": [g.to_dict() for g in self.grades] if self.grades else []
        }

class BoardGrade(Base):
    __tablename__ = "board_grades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(128), nullable=False)
    canonical_level = Column(Integer, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    board = relationship("Board", back_populates="grades")
    curricula = relationship("Curriculum", back_populates="board_grade")
    users = relationship("User", back_populates="board_grade")
    students = relationship("StudentProfile", back_populates="board_grade")
    quizzes = relationship("Quiz", back_populates="grade")

    __table_args__ = (
        UniqueConstraint("board_id", "label", name="uq_board_grade_label"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "board_id": self.board_id,
            "label": self.label,
            "canonical_level": self.canonical_level,
            "sort_order": self.sort_order,
        }

class Curriculum(Base):
    __tablename__ = "curriculum"

    id = Column(Integer, primary_key=True, autoincrement=True)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    grade_id = Column(Integer, ForeignKey("board_grades.id"), nullable=True)
    grade = Column(String(128), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    board = relationship("Board", back_populates="curricula")
    board_grade = relationship("BoardGrade", back_populates="curricula")
    subject = relationship("Subject", back_populates="curricula")
    units = relationship("CurriculumUnit", back_populates="curriculum", cascade="all, delete-orphan", order_by="CurriculumUnit.sort_order")

    __table_args__ = (
        UniqueConstraint("board_id", "grade_id", "subject_id", name="uq_curriculum_board_grade_subject"),
    )

class CurriculumUnit(Base):
    __tablename__ = "curriculum_units"

    id = Column(Integer, primary_key=True, autoincrement=True)
    curriculum_id = Column(Integer, ForeignKey("curriculum.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    curriculum = relationship("Curriculum", back_populates="units")
    topics = relationship("CurriculumUnitTopic", back_populates="unit", cascade="all, delete-orphan", order_by="CurriculumUnitTopic.sort_order")
    quizzes = relationship("Quiz", back_populates="unit")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "sort_order": self.sort_order,
            "topics": [t.to_dict() for t in self.topics] if self.topics else []
        }

class CurriculumUnitTopic(Base):
    __tablename__ = "curriculum_unit_topics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    curriculum_unit_id = Column(Integer, ForeignKey("curriculum_units.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    unit = relationship("CurriculumUnit", back_populates="topics")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "sort_order": self.sort_order
        }

class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    school_name = Column(String(255), nullable=True)
    rating = Column(Numeric(3, 2), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    avatar_public_id = Column(String(255), nullable=True)
    upload_preference = Column(String(64), nullable=True)
    grades = Column(JSON, nullable=True)
    subjects = Column(JSON, nullable=True)
    number_of_syllabi = Column(Integer, nullable=True)
    number_of_materials = Column(Integer, nullable=True)
    teaching_explanation = Column(Text, nullable=True)
    detected_teaching_style = Column(String(128), nullable=True)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    tune_preferences = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="teacher_profile")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "school_name": self.school_name,
            "rating": float(self.rating) if self.rating is not None else 0.0,
            "avatar_url": self.avatar_url,
            "avatar_public_id": self.avatar_public_id,
            "upload_preference": self.upload_preference,
            "grades": self.grades or [],
            "subjects": self.subjects or [],
            "number_of_syllabi": self.number_of_syllabi,
            "number_of_materials": self.number_of_materials,
            "teaching_explanation": self.teaching_explanation,
            "detected_teaching_style": self.detected_teaching_style,
            "onboarding_completed": self.onboarding_completed,
            "tune_preferences": self.tune_preferences or {},
        }

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    grade_id = Column(Integer, ForeignKey("board_grades.id", ondelete="CASCADE"), nullable=False)
    grade = Column(String(64), nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="student_profile")
    board = relationship("Board", back_populates="students")
    board_grade = relationship("BoardGrade", back_populates="students")
    institution = relationship("Institution", back_populates="students")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "board_id": self.board_id,
            "grade_id": self.grade_id,
            "grade": self.grade,
            "institution_id": self.institution_id,
        }

class TeacherRating(Base):
    __tablename__ = "teacher_ratings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("User", foreign_keys=[student_id], back_populates="ratings_given")
    teacher = relationship("User", foreign_keys=[teacher_id], back_populates="ratings_received")

    __table_args__ = (
        Index("ix_teacher_ratings_teacher_created", "teacher_id", "created_at"),
    )

class LearnTurn(Base):
    __tablename__ = "learn_turns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(128), nullable=False)
    lesson = Column(String(255), nullable=True)
    topics = Column(JSON, nullable=True)
    question = Column(Text, nullable=False)
    answer_preview = Column(String(500), nullable=True)
    response_mode = Column(String(32), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_learn_turns_teacher_created", "teacher_id", "created_at"),
        Index("ix_learn_turns_teacher_subject", "teacher_id", "subject"),
    )

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=True)
    grade_id = Column(Integer, ForeignKey("board_grades.id"), nullable=False)
    grade_label = Column(String(128), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    subject_label = Column(String(128), nullable=False)
    curriculum_unit_id = Column(Integer, ForeignKey("curriculum_units.id"), nullable=True)
    lesson_title = Column(String(255), nullable=False)
    topic_id = Column(Integer, nullable=True)
    topic_title = Column(String(255), nullable=True)
    difficulty = Column(String(32), default="beginner", nullable=False)
    quiz_type = Column(String(32), default="quiz", nullable=False) # "quiz" or "mock_test"
    duration_minutes = Column(Integer, default=15, nullable=True)
    total_marks = Column(Integer, default=100, nullable=True)
    pass_percentage = Column(Integer, default=50, nullable=True)
    question_count = Column(Integer, default=5, nullable=False)
    status = Column(String(24), default="draft", nullable=False)
    published_at = Column(DateTime, nullable=True)
    insights_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    teacher = relationship("User", back_populates="quizzes")
    board = relationship("Board", back_populates="quizzes")
    grade = relationship("BoardGrade", back_populates="quizzes")
    subject = relationship("Subject", back_populates="quizzes")
    unit = relationship("CurriculumUnit", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.sort_order")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")
    recs = relationship("StudentLearningRec", back_populates="quiz")

    __table_args__ = (
        Index("ix_quizzes_teacher_status", "teacher_id", "status"),
        Index("ix_quizzes_grade_status", "grade_id", "status"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "title": self.title,
            "board_id": self.board_id,
            "grade_id": self.grade_id,
            "grade_label": self.grade_label,
            "subject_id": self.subject_id,
            "subject_label": self.subject_label,
            "curriculum_unit_id": self.curriculum_unit_id,
            "lesson_title": self.lesson_title,
            "topic_id": self.topic_id,
            "topic_title": self.topic_title,
            "difficulty": self.difficulty,
            "quiz_type": self.quiz_type or "quiz",
            "duration_minutes": self.duration_minutes or 15,
            "total_marks": self.total_marks or 100,
            "pass_percentage": self.pass_percentage or 50,
            "question_count": self.question_count,
            "status": self.status,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "insights_json": self.insights_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "questions": [q.to_dict() for q in self.questions] if self.questions else []
        }

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    sort_order = Column(Integer, default=0, nullable=False)
    type = Column(String(24), default="mcq", nullable=False)
    prompt = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=False)
    topic_title = Column(String(255), nullable=True)
    misconception_hint = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    quiz = relationship("Quiz", back_populates="questions")
    answers = relationship("QuizAttemptAnswer", back_populates="question", cascade="all, delete-orphan")

    def to_dict(self, include_answer=True):
        data = {
            "id": self.id,
            "quiz_id": self.quiz_id,
            "sort_order": self.sort_order,
            "type": self.type,
            "prompt": self.prompt,
            "options": self.options,
            "topic_title": self.topic_title,
            "misconception_hint": self.misconception_hint,
        }
        if include_answer:
            data["correct_answer"] = self.correct_answer
            data["explanation"] = self.explanation
        else:
            data["correct_answer"] = None
            data["explanation"] = None
        return data

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(24), default="in_progress", nullable=False)
    current_index = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    score_percent = Column(Numeric(5, 2), nullable=True)
    correct_count = Column(Integer, default=0, nullable=False)
    total_time_ms = Column(Integer, default=0, nullable=False)
    summary_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    quiz = relationship("Quiz", back_populates="attempts")
    student = relationship("User", back_populates="quiz_attempts")
    answers = relationship("QuizAttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("quiz_id", "student_id", name="uq_quiz_student_attempt"),
        Index("ix_quiz_attempts_student_status", "student_id", "status"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "quiz_id": self.quiz_id,
            "student_id": self.student_id,
            "status": self.status,
            "current_index": self.current_index,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "score_percent": float(self.score_percent) if self.score_percent is not None else None,
            "correct_count": self.correct_count,
            "total_time_ms": self.total_time_ms,
            "summary_json": self.summary_json,
        }

class QuizAttemptAnswer(Base):
    __tablename__ = "quiz_attempt_answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False)
    first_answer = Column(Text, nullable=True)
    first_is_correct = Column(Boolean, nullable=True)
    latest_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, default=False, nullable=False)
    time_ms = Column(Integer, default=0, nullable=False)
    hint_count = Column(Integer, default=0, nullable=False)
    incorrect_attempts = Column(Integer, default=0, nullable=False)
    revealed = Column(Boolean, default=False, nullable=False)
    misconception = Column(String(500), nullable=True)
    tutor_thread = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("QuizQuestion", back_populates="answers")

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question_answer"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "attempt_id": self.attempt_id,
            "question_id": self.question_id,
            "first_answer": self.first_answer,
            "first_is_correct": self.first_is_correct,
            "latest_answer": self.latest_answer,
            "is_correct": self.is_correct,
            "time_ms": self.time_ms,
            "hint_count": self.hint_count,
            "incorrect_attempts": self.incorrect_attempts,
            "revealed": self.revealed,
            "misconception": self.misconception,
            "tutor_thread": self.tutor_thread or [],
        }

class StudentLearningRec(Base):
    __tablename__ = "student_learning_recs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="SET NULL"), nullable=True)
    subject = Column(String(128), nullable=False)
    lesson = Column(String(255), nullable=True)
    topic = Column(String(255), nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String(24), default="open", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("User", foreign_keys=[student_id], back_populates="learning_recs")
    quiz = relationship("Quiz", back_populates="recs")

    __table_args__ = (
        Index("ix_student_learning_recs_status", "student_id", "status"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "teacher_id": self.teacher_id,
            "quiz_id": self.quiz_id,
            "subject": self.subject,
            "lesson": self.lesson,
            "topic": self.topic,
            "reason": self.reason,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

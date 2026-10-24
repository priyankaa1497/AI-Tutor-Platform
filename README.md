# LearnAI

**Your teacher, available after class.**

LearnAI lets a real teacher record an explanation once, then transforms that recording into an interactive AI tutor that keeps teaching in *their* voice, *their* explaining style, and *their* syllabus — so a student who didn't follow the lesson at 10:00 AM can still get step-by-step guidance at 10:00 PM from the same teacher they trust.

Every answer a student receives is shaped by a specific teacher's detected pedagogy, spoken with a voice matched to that teacher, bounded to that student's board and grade curriculum, and logged back to the teacher as a private insight to reveal real class misconceptions.

---

## Table of Contents

- [Core Innovations](#core-innovations)
- [System Architecture](#system-architecture)
- [AI Engine & Model Routing](#ai-engine--model-routing)
- [AI Tutoring Safety & Evaluation Contract](#ai-tutoring-safety--evaluation-contract)
- [Curriculum & Subjects](#curriculum--subjects)
- [Feature Tour — Student](#feature-tour--student)
- [Feature Tour — Teacher](#feature-tour--teacher)
- [Demo Credentials](#demo-credentials)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Design System: Split-Flap Concourse](#design-system-split-flap-concourse)

---

## Core Innovations

| Problem | LearnAI's Answer |
| :--- | :--- |
| **AI explains differently from the class teacher** | Teacher's pedagogical style is auto-detected from voice recordings and injected into every prompt. |
| **AI answers off-syllabus or invents facts** | Every request carries ground-truth curriculum context: board, grade, subject, lesson, and exact topic list. |
| **AI does the homework for the student** | Socratic-by-default prompts, hint-only homework photo vision, and reveal-gated formative quizzes. |
| **Teachers have no visibility into student doubts** | Every question and doubt is aggregated into private, subject-scoped teacher analytics. |
| **AI sounds robotic or unnatural** | Integrated Indian English & multilingual neural voices via Sarvam AI (`bulbul:v3`) with distinct speaker assignments. |
| **AI hallucinates on invalid or out-of-scope inputs** | Strict 3-pillar safety contract: polite error handling for gibberish and explicit limitation acknowledgment + escalation for unknown questions. |

---

## System Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Client (React 19 + Vite)                    │
│   - Split-Flap Concourse Theme (Adaptive Dark Glass)            │
│   - Student Dashboard (Learn Chat, Quizzes, Mock Tests)         │
│   - Teacher Dashboard (Faculty Showcase, Tune Lab, Insights)    │
│   - Local Audio Playback & Voice Capture (MediaRecorder)        │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP / JSON & Multipart
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Server (Python 3.10+ / Flask API)              │
│   - Blueprints: auth, board, chat, student, teacher, quiz, mock │
│   - JWT Auth & Role-based Access Control                        │
│   - SQLAlchemy 2.0 ORM + SQLite (learnai.db) / PostgreSQL       │
└──────────────────┬──────────────────────────┬───────────────────┘
                   │                          │
                   ▼                          ▼
┌──────────────────────────────┐ ┌────────────────────────────────┐
│       Google Gemini API      │ │           Sarvam AI            │
│  - gemini-2.5-flash          │ │  - bulbul:v3 (TTS Voice)       │
│  - Socratic Tutoring         │ │    Speakers: Priya / Aditya    │
│  - Reasoning & Explanations  │ │  - saaras:v3 (STT Mic Audio)   │
│  - Homework Photo Vision     │ │    Multilingual Speech-to-Text │
│  - Quiz & Mock Generation    │ └────────────────────────────────┘
└──────────────────────────────┘
```

---

## AI Engine & Model Routing

### 1. Google Gemini API (`gemini-2.5-flash`)
- **Socratic Tutoring & Chat**: Formulates step-by-step hints and leading questions rather than raw answers.
- **Teaching Style Synthesis**: Adapts explanations according to the selected teacher's pedagogy:
  - `Socratic`: Guides with questions and thought experiments.
  - `Storytelling`: Uses relatable analogies, historical drama, and metaphors.
  - `Concept-first`: Breaks down principles from fundamental axioms before procedures.
  - `Exam-oriented`: Focuses on high-yield exam keywords and marking schemes.
  - `Visual explanation`: Describes spatial diagrams and step-by-step mental models.
- **Vision for Homework Photos**: Analyzes uploaded homework images, extracts equations/diagrams, and gives step-by-step hints without revealing final answers.
- **Assessment Generation**: Generates curriculum-aligned formative MCQs, true/false items, and conceptual questions.

### 2. Sarvam AI Voice Pipeline
- **Text-to-Speech (TTS)**: Uses `bulbul:v3` for natural Indian English and Indic accents.
  - Female teachers: Assigned `priya`.
  - Male teachers: Assigned `aditya`.
- **Speech-to-Text (STT)**: Uses `saaras:v3` for fast, accurate speech transcription from microphone blobs.

---

## AI Tutoring Safety & Evaluation Contract

The tutoring engine strictly adheres to a three-tier response specification:

| Test | User Action | Expected Result | Engine Behavior & Output | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Normal Question**<br>*(e.g., "What is photosynthesis?")* | **AI responds correctly** | Explains the scientific process step-by-step according to curriculum context and selected teaching style. | **Pass** |
| **2** | **Invalid Input**<br>*(e.g., `??????????`, `asdfghjkl`, symbols)* | **AI handles it** | Gracefully handles the input without hallucinating: *"I couldn't quite understand that input. Could you please rephrase or ask a question about your subject or lesson so I can assist you?"* | **Pass** |
| **3** | **Unknown Question**<br>*(e.g., unanswerable, future predictions)* | **AI acknowledges limitation** | Honestly acknowledges limits and escalates: *"I don't have enough verified information to answer that question, as it is outside our current curriculum and scope. I recommend asking your classroom teacher or consulting your textbook."* | **Pass** |

---

## Curriculum & Subjects

The database is pre-seeded with complete Grade 7 curriculum units and topics across **9 distinct subjects**:

1. **Mathematics** — Integers, Fractions & Decimals, Simple Equations, Lines & Angles, Triangles
2. **Science** — Nutrition in Plants, Nutrition in Animals, Heat & Temperature
3. **Social Science** — Tracing Changes Through a Thousand Years, New Kings and Kingdoms, Our Environment
4. **Computer Science** — Fundamentals of Computers, Algorithms & Flowcharts
5. **Physics** — Motion and Time, Electric Current and its Effects
6. **Chemistry** — Acids, Bases and Salts
7. **Biology** — Respiration in Organisms
8. **English** — Three Questions, The Squirrel
9. **Hindi** — Hum Panchhi Unmukt Gagan Ke, Dadi Maa

---

## Feature Tour — Student

- **Instant Learning Access**: On entering the dashboard, the student is directly placed in **Learn** mode with default subject, unit, and matching faculty pre-selected.
- **Interactive Subject Switcher**: One-click switching across all 9 curriculum subjects with automatic lesson loading and teacher faculty matching.
- **1-on-1 Socratic Chat**: Multimodal interaction via text, neural voice playback (Sarvam AI), microphone recording, and homework photo uploads.
- **Curriculum Quizzes**: Formative chapter tests with automated grading, reveal gating (hints before answers), and personalized learning recommendations.
- **Full Mock Tests**: Realistic timed examination simulator with question palette navigation, "Mark for Review" toggles, and comprehensive scorecards.

---

## Feature Tour — Teacher

- **Faculty Profile & Style Continuity**: Shows teaching style, ratings, verified student reviews, and handled subjects.
- **Interactive Subject Setup**: Convenient 1-tap subject badges in onboarding and profile setup.
- **Tune Lab**: Teachers can test, preview, and customize how their AI avatar interacts with students (simplify language, highlight exam patterns, add real-life examples).
- **Private Insights**: Private analytics per subject showing student engagement, recurring misconceptions, and frequent questions.
- **Quiz & Mock Test Studio**: Create, edit, regenerate, and publish quizzes and timed mock exams.

---

## Demo Credentials

All test/garbage data has been removed. Use the following clean demo credentials:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Student** | `student@learnai.dev` *(or `rsamy2426@gmail.com`)* | `DemoPassword123!` | Rohan Samy · Class 7 CBSE |
| **Teacher** | `teacher@learnai.dev` *(or `ram.holoroid@gmail.com`)* | `DemoPassword123!` | Mr. Ram Sharma · Delhi Public School |
| **Teacher (Faculty)** | `alice.vance@learnai.dev` | `DemoPassword123!` | Dr. Alice Vance · Cambridge Academy |
| **Teacher (Faculty)** | `marcus.thorne@learnai.dev` | `DemoPassword123!` | Prof. Marcus Thorne · St. Jude Collegiate |
| **Teacher (Faculty)** | `priya.patel@learnai.dev` | `DemoPassword123!` | Ms. Priya Patel · Oakridge International |

*Tip: The login page includes **Instant 1-Click Demo Login** buttons and a **Click-to-Autofill** demo credentials card.*

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router v7, Tailwind CSS v4 |
| **Design System** | Split-Flap Concourse (Airport Departure Board Aesthetic) |
| **Backend** | Python 3.10+, Flask REST API, Flask-CORS |
| **Database** | SQLite (`server/learnai.db`) / PostgreSQL via SQLAlchemy 2.0 |
| **Primary AI** | Google Gemini API (`gemini-2.5-flash`) |
| **Voice AI** | Sarvam AI (`bulbul:v3` TTS, `saaras:v3` STT) |
| **Authentication** | JWT (PyJWT), bcrypt password hashing |

---

## Getting Started

### Prerequisites
- **Node.js**: v20 or higher
- **Python**: v3.10 or higher
- **pip** package manager

### 1. Backend Setup
```bash
# Navigate to server directory
cd server

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env and ensure your GEMINI_API_KEY and SARVAM_API_KEY are set
copy .env.example .env

# Initialize and seed database with 9 subjects & demo credentials
python -m server.seeds

# Start the Flask API server (http://127.0.0.1:5000)
python -m server.app
```

### 2. Frontend Setup
```bash
# In a new terminal, navigate to client directory
cd client

# Install Node dependencies
npm install

# Start Vite development server (http://localhost:3000)
npm run dev
```

### 3. Root Helper Scripts
From the repository root directory, you can also run:
```bash
npm run server:seed    # Re-seeds the database with clean demo accounts & subjects
npm run server:run     # Runs Flask API server
npm run client:dev     # Runs Vite development server
npm run client:build   # Validates and builds production frontend bundle
```

---

## Environment Variables

Create `server/.env` with the following keys:

```env
# Database & Core
DATABASE_URL="sqlite:///learnai.db"
AUTH_SECRET="learnai-super-secret-jwt-key"
APP_DEBUG=true

# Google Gemini API (Core AI Reasoning, Chat, Vision, Quizzes)
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"

# Sarvam AI (Indian Multilingual TTS and STT)
SARVAM_API_KEY="your-sarvam-api-key"

# Optional Cloud Integrations
D_ID_API_KEY=""
CLOUDINARY_URL=""
```

---

## API Reference

### Authentication
- `POST /api/login`: Authenticate with email, password, and role.
- `POST /api/login/demo`: Instant 1-click login for `student` or `teacher`.
- `POST /api/student/register`: Register a new student account.
- `POST /api/teacher/register`: Register a new teacher account.
- `POST /api/otp/verify`: Verify 6-digit registration OTP.

### Student & Learning
- `GET /api/student/dashboard`: Returns student profile, board, grade, and full 9-subject curriculum tree.
- `GET /api/teachers`: Returns list of teachers with subjects, ratings, and teaching styles.
- `POST /api/chat`: Process student doubt with pedagogical Socratic guidance.
- `POST /api/chat/voice`: Multipart audio question transcribed via Sarvam STT and answered via Gemini.
- `POST /api/homework-hint`: Vision endpoint for homework photos (hints only).
- `GET /api/student/quizzes`: Returns available curriculum quizzes.
- `GET /api/student/mocktests`: Returns timed simulated mock board exams.

### Teacher Studio
- `GET /api/teacher/profile`: Retrieve faculty profile, style, and comments.
- `POST /api/teacher/profile`: Update school, grades, and subjects.
- `POST /api/teacher/onboarding`: Process audio sample, detect teaching style, and complete setup.
- `GET /api/teacher/insights`: Private analytics of student questions and concepts.
- `POST /api/teacher/quizzes/generate`: AI-generate a formative quiz from syllabus topics.
- `POST /api/teacher/tune/preview`: Preview avatar explanation adjustments.

---

## Design System: Split-Flap Concourse

LearnAI's interface is built on the **Split-Flap Concourse** design language — inspired by classic electro-mechanical airport departure boards:
- **Matte Black Flap Faces**: `#141414` background cards with subtle industrial borders.
- **Amber Status Indicators**: `#d97706` accents for active sessions and highlights.
- **Barlow Condensed & Outfit Fonts**: High-legibility uppercase tracking for chrome and flight-board readability.
- **Micro-Animations**: Subtle flip transitions (`flap-flip`) on row updates and live audio wave clusters during playback.

# Current Task: Implement Mock Test System Alongside Quizzes

## Acceptance Criteria
1. **Database & Backend**:
   - `Quiz` model supports `quiz_type` ('quiz' or 'mock_test'), `duration_minutes`, `total_marks`, and `pass_percentage`.
   - SQLite database automatically adds columns if missing.
   - Dedicated/extended API endpoints for listing, generating, taking, and submitting Mock Tests.
   - Sample published Mock Test seeded in `seeds.py`.
2. **Teacher Experience**:
   - Navigation includes a dedicated "Mock Tests" tab.
   - Teacher can generate or create Mock Tests specifying duration, total marks, subject, and questions.
   - Teacher can view submissions, completion rates, and average scores.
3. **Student Experience**:
   - Student Navigation includes both "Quiz" and "Mock Test".
   - Student Home page features an eye-catching "Mock Tests" card with exam badges.
   - Student Mock Test Hub displays available/completed tests with duration, marks, and question count.
   - Full Timed Exam Environment: live countdown clock, question navigation palette (Answered, Marked for Review, Unvisited), clean question viewer.
   - Submission confirmation modal and auto-submit on timer expiry.
   - Post-test Diagnostic Scorecard with breakdown, percentage, time spent, and detailed question review.
4. **Visual Aesthetics**:
   - Premium modern UI styling with glowing badges, polished dark/light mode compatibility, and micro-animations.

## Sub-task Checklist
- [ ] 1. Update `models.py` and `database.py` with mock test fields and schema migration.
- [ ] 2. Update `server/routes/quiz_routes.py` to support mock tests and exam submissions.
- [ ] 3. Update `server/seeds.py` with a seeded Mock Test for testing.
- [ ] 4. Update `client/src/services/api.js` with Mock Test API client methods.
- [ ] 5. Create `client/src/components/StudentMockTestHub.jsx`.
- [ ] 6. Create `client/src/components/TeacherMockTests.jsx`.
- [ ] 7. Update `StudentDashboard.jsx` and `TeacherDashboard.jsx` navigation and home cards.
- [ ] 8. Verify backend execution and run tests / test seeding.

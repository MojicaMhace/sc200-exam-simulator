const express = require('express');
const cors = require('cors');
const path = require('path');
const { z } = require('zod');
const { initDb } = require('./db');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const answerSchema = z.object({
  questionId: z.string(),
  answer: z.union([z.string(), z.array(z.string()), z.boolean(), z.record(z.string(), z.string())]),
});

async function main() {
  const db = await initDb();
  const app = express();

  app.use(cors());
  app.use(express.json());

  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));

  app.get('/api/health', (_, res) => {
    res.json({ ok: true });
  });

  app.get('/api/questions', async (req, res) => {
    const domain = req.query.domain;
    const includeAnswers = req.query.includeAnswers === 'true';
    const rows = domain
      ? await db.all('SELECT * FROM questions WHERE domain = ? ORDER BY sequence ASC', [domain])
      : await db.all('SELECT * FROM questions ORDER BY sequence ASC');

    const questions = rows.map((r) => ({
      id: r.id,
      sequence: r.sequence,
      title: r.title,
      domain: r.domain,
      questionType: r.question_type,
      scenario: r.scenario,
      question: r.question,
      options: JSON.parse(r.options_json),
      sourceType: r.source_type,
      subtopic: r.subtopic,
      difficulty: r.difficulty,
      learnReferences: JSON.parse(r.learn_references_json || '[]'),
      ...(includeAnswers ? {
        originalAnswer: r.original_answer,
        validatedAnswer: JSON.parse(r.validated_answer_json || '[]'),
      } : {}),
      ...(r.interaction_json ? JSON.parse(r.interaction_json) : {}),
      validationStatus: r.validation_status,
      sourceReviewDate: r.source_review_date,
    }));

    res.json({ questions });
  });

  app.post('/api/exam/start', async (req, res) => {
    const mode = typeof req.body?.mode === 'string' ? req.body.mode : 'Practice';
    const requestedTotal = Number(req.body?.totalQuestions || 57);
    const total = Number.isFinite(requestedTotal) && requestedTotal > 0 ? Math.floor(requestedTotal) : 57;
    const standardQuestions = await db.all(
      "SELECT id, domain FROM questions WHERE question_type != 'case_study'",
    );
    const caseQuestions = await db.all(
      "SELECT id, validated_answer_json FROM questions WHERE question_type = 'case_study' ORDER BY sequence ASC",
    );
    if (standardQuestions.length === 0) {
      return res.status(503).json({ error: 'No standard questions are available' });
    }

    const questionIds = selectBlueprintQuestions(standardQuestions, total);
    const allQuestionIds = [...questionIds, ...caseQuestions.map((q) => q.id)];
    const pointRows = await db.all(
      `SELECT id, question_type, validated_answer_json FROM questions WHERE id IN (${allQuestionIds.map(() => '?').join(',')})`,
      allQuestionIds,
    );
    const totalPoints = questionIds.reduce((sum, id) => {
      const row = pointRows.find((candidate) => candidate.id === id);
      return sum + (row && ['yes_no', 'drag_drop'].includes(row.question_type)
        ? JSON.parse(row.validated_answer_json || '[]').length
        : 1);
    }, caseQuestions.reduce((sum, row) => sum + JSON.parse(row.validated_answer_json || '[]').length, 0));

    const startedAt = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO exam_sessions (started_at, mode, total_questions, question_ids_json) VALUES (?, ?, ?, ?)',
      [startedAt, mode, totalPoints, JSON.stringify(allQuestionIds)],
    );

    res.json({
      sessionId: result.lastID,
      questionIds,
      caseQuestionIds: caseQuestions.map((q) => q.id),
      totalQuestions: questionIds.length,
      startedAt,
    });
  });

  app.post('/api/exam/:sessionId/submit', async (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const parsed = z.array(answerSchema).safeParse(req.body?.answers);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid answer payload' });
    }

    const answers = parsed.data;
    const session = await db.get('SELECT total_questions, question_ids_json FROM exam_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return res.status(404).json({ error: 'Exam session not found' });
    }
    const sessionQuestionIds = new Set(JSON.parse(session.question_ids_json || '[]'));
    let correct = 0;
    let answeredPoints = 0;
    let processedAnswers = 0;
    const submittedQuestionIds = new Set();

    for (const item of answers) {
      if (!sessionQuestionIds.has(item.questionId)) continue;
      if (submittedQuestionIds.has(item.questionId)) continue;
      submittedQuestionIds.add(item.questionId);
      processedAnswers += 1;
      const q = await db.get('SELECT validated_answer_json, question_type FROM questions WHERE id = ?', [item.questionId]);
      if (!q) continue;

      const expected = JSON.parse(q.validated_answer_json || '[]');
      const candidate = item.answer;

      const score = compareAnswer(expected, candidate, q.question_type);
      const isCorrect = score.correctPoints === score.totalPoints;
      correct += score.correctPoints;
      answeredPoints += score.totalPoints;

      await db.run(
        'INSERT INTO exam_answers (session_id, question_id, answer_json, is_correct, earned_points, available_points) VALUES (?, ?, ?, ?, ?, ?)',
        [sessionId, item.questionId, JSON.stringify(candidate), isCorrect ? 1 : 0, score.correctPoints, score.totalPoints],
      );
    }

    const scorePercent = session.total_questions > 0 ? (correct / session.total_questions) * 100 : 0;
    await db.run(
      'UPDATE exam_sessions SET completed_at = ?, score_percent = ? WHERE id = ?',
      [new Date().toISOString(), scorePercent, sessionId],
    );

    res.json({
      sessionId,
      total: session.total_questions,
      answered: processedAnswers,
      answeredPoints,
      unanswered: Math.max(0, session.total_questions - answeredPoints),
      correct,
      scorePercent,
    });
  });

  app.get('/api/analytics/summary', async (_, res) => {
    const sessions = await db.all('SELECT id, started_at, completed_at, mode, total_questions, score_percent FROM exam_sessions ORDER BY id DESC LIMIT 50');
    const byDomain = await db.all(`
      SELECT q.domain as domain, COUNT(*) as attempts, SUM(a.earned_points) as earned, SUM(a.available_points) as available,
        ROUND(CASE WHEN SUM(a.available_points) > 0 THEN SUM(a.earned_points) * 100.0 / SUM(a.available_points) ELSE 0 END, 1) as accuracy
      FROM exam_answers a
      JOIN questions q ON q.id = a.question_id
      GROUP BY q.domain
      ORDER BY attempts DESC
    `);
    const bySubtopic = await db.all(`
      SELECT q.subtopic as subtopic, COUNT(*) as attempts, SUM(a.earned_points) as earned, SUM(a.available_points) as available,
        ROUND(CASE WHEN SUM(a.available_points) > 0 THEN SUM(a.earned_points) * 100.0 / SUM(a.available_points) ELSE 0 END, 1) as accuracy
      FROM exam_answers a
      JOIN questions q ON q.id = a.question_id
      GROUP BY q.subtopic
      ORDER BY attempts DESC
    `);

    res.json({ sessions, byDomain, bySubtopic });
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) next();
    });
  });

  app.listen(PORT, () => {
    console.log(`SC-200 server running on http://localhost:${PORT}`);
  });
}

function selectBlueprintQuestions(questions, total) {
  const targets = [
    { domain: 'Manage a security operations environment', ratio: 0.425 },
    { domain: 'Respond to security incidents', ratio: 0.375 },
    { domain: 'Perform threat hunting', ratio: 0.2 },
  ];
  const selected = [];
  const pools = new Map(targets.map(({ domain }) => [
    domain,
    questions.filter((question) => question.domain === domain),
  ]));

  for (const { domain, ratio } of targets) {
    const count = Math.round(total * ratio);
    const pool = shuffle(pools.get(domain) || []);
    selected.push(...pool.slice(0, count).map((question) => question.id));
  }

  const remaining = shuffle(questions.filter((question) => !selected.includes(question.id)));
  selected.push(...remaining.slice(0, Math.max(0, total - selected.length)).map((question) => question.id));
  if (selected.length < total) {
    const fallback = shuffle(questions);
    for (const question of fallback) {
      if (selected.length >= total) break;
      selected.push(question.id);
    }
  }
  return shuffle(selected.slice(0, total));
}

function shuffle(values) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function compareAnswer(expected, candidate, questionType) {
  if (questionType === 'case_study' && candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    const values = Object.entries(candidate)
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .map(([, value]) => value);
    return {
      correctPoints: expected.reduce((total, value, index) => total + (values[index] === value ? 1 : 0), 0),
      totalPoints: expected.length,
    };
  }

  if (questionType === 'yes_no') {
    const expectedValues = expected.map((value) => String(value).toLowerCase());
    const candidateValues = Array.isArray(candidate)
      ? candidate.map((value) => String(value).toLowerCase())
      : [typeof candidate === 'boolean' ? (candidate ? 'yes' : 'no') : String(candidate).toLowerCase()];
    return {
      correctPoints: expectedValues.reduce((total, value, index) => total + (candidateValues[index] === value ? 1 : 0), 0),
      totalPoints: expectedValues.length,
    };
  }

  if (Array.isArray(candidate)) {
    if (questionType === 'drag_drop') {
      return {
        correctPoints: expected.reduce((total, value, index) => total + (candidate[index] === value ? 1 : 0), 0),
        totalPoints: expected.length,
      };
    }
    const a = [...candidate].map(String).sort();
    const b = [...expected].map(String).sort();
    return { correctPoints: JSON.stringify(a) === JSON.stringify(b) ? 1 : 0, totalPoints: 1 };
  }

  return { correctPoints: expected.includes(String(candidate)) ? 1 : 0, totalPoints: 1 };
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { after, before, test } = require('node:test');
const {
  compareAnswer,
  selectBlueprintQuestions,
} = require('../src/index');

const baseUrl = 'http://127.0.0.1:4101';
let server;

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { response, body };
}

before(async () => {
  server = spawn(process.execPath, ['src/index.js'], {
    cwd: __dirname + '/..',
    env: { ...process.env, PORT: '4101' },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const { response } = await request('/api/health');
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Test server did not start');
});

after(() => {
  server.kill();
});

test('selects a strict 50/50 source balance', () => {
  const questions = [
    ...Array.from({ length: 10 }, (_, index) => ({ id: `i-${index}`, source_type: 'Imported', difficulty: 'intermediate', scenario_family: `i-${index}` })),
    ...Array.from({ length: 10 }, (_, index) => ({ id: `a-${index}`, source_type: 'Original authored', difficulty: 'advanced', scenario_family: `a-${index}` })),
  ];
  const result = selectBlueprintQuestions(questions, 10, new Set(), 'all', () => 0.5);
  assert.equal(result.sourceDistribution.imported, 5);
  assert.equal(result.sourceDistribution.authored, 5);
  assert.equal(new Set(result.questionIds).size, 10);
});

test('filters Expert questions independently from source balance', () => {
  const questions = [
    ...Array.from({ length: 4 }, (_, index) => ({ id: `i-${index}`, source_type: 'Imported', difficulty: 'intermediate', scenario_family: `i-${index}` })),
    ...Array.from({ length: 6 }, (_, index) => ({ id: `e-${index}`, source_type: 'Original authored', difficulty: 'expert', scenario_family: `e-${index}` })),
  ];
  const result = selectBlueprintQuestions(questions, 4, new Set(), 'expert', () => 0.5);
  assert.equal(result.sourceDistribution.imported, 0);
  assert.equal(result.sourceDistribution.authored, 4);
  assert.ok(result.sourceShortage);
  assert.ok(result.questionIds.every((id) => id.startsWith('e-')));
});

test('reports insufficient balanced source pools', () => {
  assert.throws(
    () => selectBlueprintQuestions([
      { id: 'i-1', source_type: 'Imported', difficulty: 'advanced', scenario_family: 'one' },
      { id: 'a-1', source_type: 'Original authored', difficulty: 'advanced', scenario_family: 'two' },
    ], 4, new Set(), 'advanced'),
    /needs 2 imported and 2 newly authored/,
  );
});

test('scores partial credit and preserves shuffled answer keys', async () => {
  assert.deepEqual(compareAnswer(['A', 'B'], ['A', 'X'], 'drag_drop'), { correctPoints: 1, totalPoints: 2 });
  const { body: questionsBody } = await request('/api/questions?includeAnswers=true');
  const { body: session } = await request('/api/exam/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'Practice', totalQuestions: 50, difficulty: 'all' }),
  });
  const question = questionsBody.questions.find((item) => (
    ['single_choice', 'multiple_choice'].includes(item.questionType) && session.questionIds.includes(item.id)
  ));
  assert.ok(question);
  assert.ok(session.questionIds.includes(question.id));
  const { response, body } = await request(`/api/exam/${session.sessionId}/question-check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ questionId: question.id, answer: question.validatedAnswer[0] }),
  });
  assert.equal(response.status, 200);
  assert.equal(body.feedback.correct, true);
});

test('creates unique sessions with associated case studies and actual distributions', async () => {
  const { response, body } = await request('/api/exam/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'Exam', totalQuestions: 20, difficulty: 'all' }),
  });
  assert.equal(response.status, 200);
  assert.equal(new Set(body.questionIds).size, body.questionIds.length);
  assert.equal(body.sourceDistribution.imported, 10);
  assert.equal(body.sourceDistribution.authored, 10);
  assert.ok(body.actualDifficultyDistribution);
  assert.equal(body.caseQuestionIds.length, 1);
  assert.ok(!body.questionIds.includes(body.caseQuestionIds[0]));
});

test('Practice gives feedback while Exam protects answers', async () => {
  const practice = await request('/api/exam/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'Practice', totalQuestions: 20, difficulty: 'all' }),
  });
  const exam = await request('/api/exam/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'Exam', totalQuestions: 20, difficulty: 'all' }),
  });
  const questionId = practice.body.questionIds[0];
  const practiceCheck = await request(`/api/exam/${practice.body.sessionId}/question-check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ questionId, answer: 'A' }),
  });
  assert.equal(practiceCheck.response.status, 200);
  const examCheck = await request(`/api/exam/${exam.body.sessionId}/question-check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ questionId: exam.body.questionIds[0], answer: 'A' }),
  });
  assert.equal(examCheck.response.status, 403);
});

test('RBAC questions can be selected and sessions remain persistent', async () => {
  let session;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await request('/api/exam/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'Practice', totalQuestions: 20, difficulty: 'all' }),
    });
    if (result.body.questionIds.some((id) => id.startsWith('SC200-RBAC-'))) {
      session = result.body;
      break;
    }
  }
  assert.ok(session);
  const submit = await request(`/api/exam/${session.sessionId}/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers: [] }),
  });
  assert.equal(submit.response.status, 200);
  const repeatSubmit = await request(`/api/exam/${session.sessionId}/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers: [] }),
  });
  assert.equal(repeatSubmit.response.status, 200);
});

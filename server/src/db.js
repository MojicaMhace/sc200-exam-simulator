const path = require('path');
const fs = require('fs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'sc200.db');
const IMPORT_PATH = path.join(__dirname, '..', '..', 'sc200_additional_25_question_bank.json');
const EXTENDED_IMPORT_PATH = path.join(__dirname, '..', '..', 'sc200_extended_question_bank.json');

async function getDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
}

async function initDb() {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      sequence INTEGER NOT NULL,
      title TEXT NOT NULL,
      domain TEXT NOT NULL,
      question_type TEXT NOT NULL,
      scenario TEXT NOT NULL,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      original_answer TEXT,
      validated_answer_json TEXT,
      validation_status TEXT,
      source_review_date TEXT
    );

    CREATE TABLE IF NOT EXISTS exam_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      mode TEXT NOT NULL,
      total_questions INTEGER NOT NULL,
      score_percent REAL,
      question_ids_json TEXT
    );

    CREATE TABLE IF NOT EXISTS exam_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      question_id TEXT NOT NULL,
      answer_json TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES exam_sessions(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );
  `);
  try {
    await db.exec('ALTER TABLE questions ADD COLUMN interaction_json TEXT');
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) throw error;
  }
  try {
    await db.exec('ALTER TABLE exam_sessions ADD COLUMN question_ids_json TEXT');
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) throw error;
  }

  await seedQuestionsIfEmpty(db);
  return db;
}

async function seedQuestionsIfEmpty(db) {
  const row = await db.get('SELECT COUNT(*) AS count FROM questions');
  if (row && row.count > 0) {
    await seedInteractiveSamples(db);
    await importQuestionFile(db, EXTENDED_IMPORT_PATH);
    return;
  }

  if (!fs.existsSync(IMPORT_PATH)) {
    throw new Error(`Question import file not found: ${IMPORT_PATH}`);
  }

  const questions = JSON.parse(fs.readFileSync(IMPORT_PATH, 'utf8'));
  await insertQuestions(db, questions);
  await seedInteractiveSamples(db);
  await importQuestionFile(db, EXTENDED_IMPORT_PATH);
}

async function insertQuestions(db, questions) {
  const insertSql = `
    INSERT OR IGNORE INTO questions (
      id, sequence, title, domain, question_type, scenario, question,
      options_json, original_answer, validated_answer_json, validation_status, source_review_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const q of questions) {
    await db.run(insertSql, [
      q.id,
      q.sequence,
      q.title,
      q.domain,
      q.questionType,
      q.scenario,
      q.question,
      JSON.stringify(q.options || []),
      q.originalAnswer || null,
      JSON.stringify(q.validatedAnswer || []),
      q.validationStatus || 'Needs Review',
      q.sourceReviewDate || null,
    ]);
  }
}

async function importQuestionFile(db, filePath) {
  if (!fs.existsSync(filePath)) return;
  const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  await insertQuestions(db, questions);
}

async function seedInteractiveSamples(db) {
  const samples = [
    {
      id: 'SC200-DEMO-YESNO-001',
      sequence: 9001,
      title: 'Proposed Solution Validation',
      domain: 'Manage a security operations environment',
      questionType: 'yes_no',
      scenario: 'Requirement: block high-confidence ransomware spread automatically. Proposed solution: enable Automatic attack disruption in Defender XDR.',
      question: 'Does the proposed solution meet the requirement?',
      options: [
        { key: 'YES', text: 'Yes' },
        { key: 'NO', text: 'No' },
      ],
      validatedAnswer: ['YES', 'NO', 'YES'],
      interaction: {
        statements: [
          { id: 's1', text: 'Isolate a compromised device to restrict network communication while maintaining connectivity to Microsoft Defender for Endpoint.' },
          { id: 's2', text: 'Use Microsoft Defender for Identity to configure an Attack Surface Reduction (ASR) rule on a Windows device.' },
          { id: 's3', text: 'Use Advanced Hunting in Microsoft Defender XDR to query security data and investigate suspicious activities.' },
        ],
      },
    },
    {
      id: 'SC200-DEMO-DRAG-001',
      sequence: 9002,
      title: 'Incident Response Sequencing',
      domain: 'Respond to security incidents',
      questionType: 'drag_drop',
      scenario: 'You are investigating an incident by using Microsoft 365 Defender. Select the appropriate KQL values and place them in the answer area.',
      question: 'How should you complete the query?',
      options: [
        { key: 'A', text: 'Validate alert evidence and timeline' },
        { key: 'B', text: 'Contain the affected device' },
        { key: 'C', text: 'Collect forensic artifacts' },
        { key: 'D', text: 'Perform eradication and recovery actions' },
      ],
      validatedAnswer: ['A', 'B', 'C'],
      interaction: {
        answerSlots: [
          { id: 'slot1', label: 'Source table' },
          { id: 'slot2', label: 'Filter' },
          { id: 'slot3', label: 'Projection' },
        ],
      },
    },
    {
      id: 'SC200-DEMO-CASE-001',
      sequence: 9003,
      title: 'Case Study: Suspicious Sign-in Spike',
      domain: 'Perform threat hunting',
      questionType: 'case_study',
      scenario: 'Contoso detects impossible travel and suspicious mailbox rules. You need to choose the best immediate hunt action.',
      question: 'What is the best next step?',
      options: [
        { key: 'A', text: 'Run KQL over SigninLogs and AuditLogs, then correlate user/entity timeline' },
        { key: 'B', text: 'Wait for the weekly workbook refresh' },
        { key: 'C', text: 'Only check endpoint antivirus events' },
        { key: 'D', text: 'Disable all user accounts in the tenant' },
      ],
      validatedAnswer: ['A', 'B', 'C'],
      interaction: {
        caseQuestions: [
          {
            id: 'case-q1',
            question: 'What is the best first investigation step?',
            options: [
              { key: 'A', text: 'Run KQL over SigninLogs and AuditLogs, then correlate the user timeline' },
              { key: 'B', text: 'Wait for the weekly workbook refresh' },
              { key: 'C', text: 'Disable every user account immediately' },
            ],
          },
          {
            id: 'case-q2',
            question: 'Which additional data should you review?',
            options: [
              { key: 'A', text: 'Only endpoint antivirus events' },
              { key: 'B', text: 'AuditLogs for mailbox-rule changes and consent activity' },
              { key: 'C', text: 'Unrelated printer logs' },
            ],
          },
          {
            id: 'case-q3',
            question: 'What should you do after confirming the compromise?',
            options: [
              { key: 'A', text: 'Delete all audit data' },
              { key: 'B', text: 'Ignore the mailbox rules' },
              { key: 'C', text: 'Contain the account and remediate the malicious persistence' },
            ],
          },
        ],
      },
    },
  ];

  const insertSql = `
    INSERT OR IGNORE INTO questions (
      id, sequence, title, domain, question_type, scenario, question,
      options_json, original_answer, validated_answer_json, validation_status, source_review_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const q of samples) {
    await db.run(insertSql, [
      q.id,
      q.sequence,
      q.title,
      q.domain,
      q.questionType,
      q.scenario,
      q.question,
      JSON.stringify(q.options),
      null,
      JSON.stringify(q.validatedAnswer),
      'Verified — Current',
      new Date().toISOString().slice(0, 10),
    ]);
    await db.run(
      'UPDATE questions SET validated_answer_json = ?, interaction_json = ? WHERE id = ?',
      [JSON.stringify(q.validatedAnswer), JSON.stringify(q.interaction || null), q.id],
    );
  }
}

module.exports = {
  initDb,
};

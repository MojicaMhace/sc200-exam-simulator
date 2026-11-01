const path = require('path');
const fs = require('fs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'sc200.db');
const IMPORT_PATH = path.join(__dirname, '..', '..', 'sc200_additional_25_question_bank.json');
const EXTENDED_IMPORT_PATH = path.join(__dirname, '..', '..', 'sc200_extended_question_bank.json');
const SKILL_IMPORT_PATH = path.join(__dirname, '..', '..', 'sc200_skill_question_bank.json');
const RBAC_IMPORT_PATH = path.join(__dirname, '..', '..', 'sc200_rbac_question_bank.json');
const EXPERT_IMPORT_PATH = path.join(__dirname, '..', '..', 'sc200_expert_question_bank.json');

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
      source_review_date TEXT,
      source_type TEXT NOT NULL DEFAULT 'Imported',
      subtopic TEXT NOT NULL DEFAULT 'General',
      difficulty TEXT NOT NULL DEFAULT 'intermediate',
      learn_references_json TEXT NOT NULL DEFAULT '[]',
      scenario_family TEXT NOT NULL DEFAULT 'General',
      active INTEGER NOT NULL DEFAULT 1
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
      earned_points INTEGER NOT NULL DEFAULT 0,
      available_points INTEGER NOT NULL DEFAULT 1,
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
  for (const statement of [
    "ALTER TABLE questions ADD COLUMN source_type TEXT NOT NULL DEFAULT 'Imported'",
    "ALTER TABLE questions ADD COLUMN subtopic TEXT NOT NULL DEFAULT 'General'",
    "ALTER TABLE questions ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'intermediate'",
    "ALTER TABLE questions ADD COLUMN learn_references_json TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE questions ADD COLUMN scenario_family TEXT NOT NULL DEFAULT 'General'",
    "ALTER TABLE questions ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE exam_sessions ADD COLUMN selection_seed TEXT",
    "ALTER TABLE exam_sessions ADD COLUMN requested_difficulty TEXT NOT NULL DEFAULT 'all'",
  ]) {
    try {
      await db.exec(statement);
    } catch (error) {
      if (!String(error.message).includes('duplicate column name')) throw error;
    }
    for (const statement of [
      "ALTER TABLE exam_answers ADD COLUMN earned_points INTEGER NOT NULL DEFAULT 0",
      "ALTER TABLE exam_answers ADD COLUMN available_points INTEGER NOT NULL DEFAULT 1",
    ]) {
      try {
        await db.exec(statement);
      } catch (error) {
        if (!String(error.message).includes('duplicate column name')) throw error;
      }
    }
  }

  await seedQuestionsIfEmpty(db);
  await backfillQuestionMetadata(db);
  return db;
}

async function seedQuestionsIfEmpty(db) {
  const row = await db.get('SELECT COUNT(*) AS count FROM questions');
  if (row && row.count > 0) {
    await seedInteractiveSamples(db);
    await importQuestionFile(db, EXTENDED_IMPORT_PATH);
    await importQuestionFile(db, SKILL_IMPORT_PATH);
    await importQuestionFile(db, RBAC_IMPORT_PATH);
    await importQuestionFile(db, EXPERT_IMPORT_PATH);
    return;
  }

  if (!fs.existsSync(IMPORT_PATH)) {
    throw new Error(`Question import file not found: ${IMPORT_PATH}`);
  }

  const questions = JSON.parse(fs.readFileSync(IMPORT_PATH, 'utf8'));
  await insertQuestions(db, questions);
  await seedInteractiveSamples(db);
  await importQuestionFile(db, EXTENDED_IMPORT_PATH);
  await importQuestionFile(db, SKILL_IMPORT_PATH);
  await importQuestionFile(db, RBAC_IMPORT_PATH);
  await importQuestionFile(db, EXPERT_IMPORT_PATH);
}

async function insertQuestions(db, questions) {
  const insertSql = `
    INSERT INTO questions (
      id, sequence, title, domain, question_type, scenario, question,
      options_json, original_answer, validated_answer_json, validation_status, source_review_date,
      source_type, subtopic, difficulty, learn_references_json, scenario_family, active, interaction_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      sequence = excluded.sequence,
      title = excluded.title,
      domain = excluded.domain,
      question_type = excluded.question_type,
      scenario = excluded.scenario,
      question = excluded.question,
      options_json = excluded.options_json,
      original_answer = excluded.original_answer,
      validated_answer_json = excluded.validated_answer_json,
      validation_status = excluded.validation_status,
      source_review_date = excluded.source_review_date,
      source_type = excluded.source_type,
      subtopic = excluded.subtopic,
      difficulty = excluded.difficulty,
      learn_references_json = excluded.learn_references_json,
      scenario_family = excluded.scenario_family,
      active = excluded.active,
      interaction_json = excluded.interaction_json
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
      q.sourceType || (q.id.startsWith('SC200-SKILL-') || q.id.startsWith('SC200-EXT-') ? 'Original generated' : 'Imported'),
      q.subtopic || inferSubtopic(q),
      q.difficulty || inferDifficulty(q),
      JSON.stringify(q.learnReferences || []),
      q.scenarioFamily || inferScenarioFamily(q),
      q.active === false ? 0 : 1,
      JSON.stringify(q.interaction || null),
    ]);
  }

}

async function importQuestionFile(db, filePath) {
  if (!fs.existsSync(filePath)) return;
  const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  await insertQuestions(db, questions);
}

async function backfillQuestionMetadata(db) {
  const rows = await db.all('SELECT id, title, scenario, question, subtopic, difficulty, scenario_family FROM questions');
  for (const row of rows) {
    const inferredSubtopic = inferSubtopic(row);
    const inferredDifficulty = inferDifficulty(row);
    if (row.subtopic === 'General' && inferredSubtopic !== 'General') {
      await db.run('UPDATE questions SET subtopic = ? WHERE id = ?', [inferredSubtopic, row.id]);
    }
    if (!row.difficulty || row.difficulty === 'intermediate' && inferredDifficulty === 'advanced') {
      await db.run('UPDATE questions SET difficulty = ? WHERE id = ?', [inferredDifficulty, row.id]);
    }
    if (row.id.startsWith('SC200-DEMO-') || row.id.startsWith('SC200-EXT-') || row.id.startsWith('SC200-SKILL-')) {
      await db.run("UPDATE questions SET source_type = 'Original authored' WHERE id = ?", [row.id]);
      await db.run("UPDATE questions SET difficulty = 'advanced' WHERE id = ?", [row.id]);
    }
    await db.run('UPDATE questions SET scenario_family = ? WHERE id = ? AND scenario_family = ?', [inferScenarioFamily(row), row.id, 'General']);
  }
}

function inferSubtopic(question) {
  const text = `${question.title} ${question.scenario} ${question.question}`.toLowerCase();
  if (text.includes('search job')) return 'Search Jobs';
  if (text.includes('summary rule')) return 'Summary Rules';
  if (text.includes('join')) return 'KQL JOIN';
  if (text.includes('union')) return 'KQL UNION';
  if (text.includes('kql') || text.includes('query') || text.includes('operator')) return 'KQL';
  if (text.includes('cef') || text.includes('syslog') || text.includes('ama') || text.includes('dcr') || text.includes('connector')) return 'Log ingestion';
  if (text.includes('windows security event') || text.includes('securityevent') || text.includes('windowsevent')) return 'Windows events';
  if (text.includes('incident') || text.includes('response')) return 'Incident response';
  if (text.includes('asr') || text.includes('attack surface reduction')) return 'ASR';
  if (text.includes('defender xdr')) return 'Defender XDR';
  return 'General';
}

function inferDifficulty(question) {
  const text = `${question.scenario} ${question.question}`.toLowerCase();
  return text.length > 220 || text.includes('which sequence') || text.includes('diagnos') ? 'advanced' : 'intermediate';
}

function inferScenarioFamily(question) {
  const text = `${question.title} ${question.scenario} ${question.question}`.toLowerCase();
  if (text.includes('search job')) return 'Search Jobs';
  if (text.includes('summary rule')) return 'Summary Rules';
  if (text.includes('kql') || text.includes('query') || text.includes('join') || text.includes('union')) return 'KQL investigations';
  if (text.includes('ama') || text.includes('dcr') || text.includes('cef') || text.includes('syslog') || text.includes('connector')) return 'Log collection';
  if (text.includes('incident') || text.includes('response')) return 'Incident response';
  if (text.includes('defender xdr') || text.includes('defender')) return 'Defender investigation';
  if (text.includes('identity') || text.includes('sign-in') || text.includes('oauth')) return 'Identity investigation';
  return question.title || 'General';
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
      scenario: 'Contoso security receives an alert that user Ana Lopez signed in from Manila and Singapore within 18 minutes. A new inbox rule forwarding messages to an external address was created shortly afterward. The incident record includes the user, source IPs, timestamps, and mailbox audit activity.',
      question: 'Use the evidence in the case to determine the investigation and response sequence.',
      options: [
        { key: 'A', text: 'Correlate SigninLogs and AuditLogs by user and time' },
        { key: 'B', text: 'Wait for the weekly workbook refresh' },
        { key: 'C', text: 'Only check endpoint antivirus events' },
        { key: 'D', text: 'Disable all user accounts in the tenant' },
      ],
      validatedAnswer: ['A', 'B', 'C', 'A'],
      interaction: {
        caseQuestions: [
          {
            id: 'case-q1',
            question: 'Which query approach best validates whether the sign-ins belong to the same suspicious activity?',
            options: [
              { key: 'A', text: 'Filter SigninLogs by the user and time window, then correlate with AuditLogs', explanation: 'The same user and short time window connect the impossible-travel sign-ins to the mailbox change.' },
              { key: 'B', text: 'Wait for the weekly workbook refresh', explanation: 'A workbook refresh delays access to the already available sign-in evidence.' },
              { key: 'C', text: 'Query only DeviceProcessEvents', explanation: 'The evidence is an identity and mailbox event; endpoint process data alone cannot validate it.' },
              { key: 'D', text: 'Search for every sign-in in the tenant without a time filter', explanation: 'An unbounded tenant-wide search adds noise and does not test the case timeline.' },
            ],
          },
          {
            id: 'case-q2',
            question: 'Which evidence most directly confirms persistence in the mailbox?',
            options: [
              { key: 'A', text: 'Only endpoint antivirus events', explanation: 'Endpoint antivirus data does not show who created a cloud mailbox rule.' },
              { key: 'B', text: 'AuditLogs for inbox-rule changes and OAuth consent activity', explanation: 'Mailbox-rule and consent audit events can show how the attacker maintained access or redirected data.' },
              { key: 'C', text: 'Unrelated printer logs', explanation: 'Printer logs do not explain the identity or mailbox activity in this case.' },
              { key: 'D', text: 'A workbook title change', explanation: 'A presentation change is not security evidence.' },
            ],
          },
          {
            id: 'case-q3',
            question: 'Which response should be performed after confirming the account is compromised?',
            options: [
              { key: 'A', text: 'Delete all audit data', explanation: 'Audit data is evidence and should be preserved for investigation and compliance.' },
              { key: 'B', text: 'Ignore the mailbox rule until the next review', explanation: 'Leaving malicious forwarding active allows continued data theft.' },
              { key: 'C', text: 'Contain the account, revoke sessions or credentials, and remove the malicious rule', explanation: 'Containment stops further access while remediation removes the persistence mechanism.' },
              { key: 'D', text: 'Disable every account in the tenant', explanation: 'Tenant-wide disablement is disruptive and not proportional to a confirmed single-account compromise.' },
            ],
          },
          {
            id: 'case-q4',
            question: 'What should be documented for the incident timeline?',
            options: [
              { key: 'A', text: 'The sign-in timestamps, source IPs, mailbox-rule change, actions taken, and affected entities', explanation: 'These facts establish the attack sequence, scope, and response evidence.' },
              { key: 'B', text: 'Only the analyst who closed the incident', explanation: 'The closer is useful metadata but does not document the attack or response timeline.' },
              { key: 'C', text: 'Only the final severity value', explanation: 'Severity alone does not preserve the evidence or actions that led to the decision.' },
              { key: 'D', text: 'A screenshot of the dashboard home page', explanation: 'A generic screenshot does not capture the relevant entities, timestamps, or actions.' },
            ],
          },
        ],
      },
    },
  ];

  samples.push(
    {
      id: 'SC200-DEMO-CASE-002',
      sequence: 9004,
      title: 'Case Study: Hybrid Windows Collection Gap',
      domain: 'Manage a security operations environment',
      questionType: 'case_study',
      scenario: 'Northwind has domain controllers forwarding Windows events through WEF to an Azure Monitor Agent collector. SecurityEvent is empty for one site, while WindowsEvent contains service-health events. A DCR was recently edited and the CEF appliance is in a separate workspace.',
      question: 'Choose the investigation and remediation actions supported by the evidence.',
      options: [{ key: 'A', text: 'Inspect the DCR, WEF subscription, and collector health before changing analytics rules' }, { key: 'B', text: 'Assume the empty table proves the domain controllers are clean' }, { key: 'C', text: 'Verify the CEF facility and workspace routing separately' }, { key: 'D', text: 'Replace all collection with a workbook' }],
      validatedAnswer: ['A', 'B', 'C', 'A'],
      interaction: { caseQuestions: [
        { id: 'case2-q1', question: 'What should be checked first?', options: [{ key: 'A', text: 'The DCR association, WEF subscription, and collector health' }, { key: 'B', text: 'The workbook color theme' }, { key: 'C', text: 'The incident severity only' }, { key: 'D', text: 'A new analytics rule' }] },
        { id: 'case2-q2', question: 'What does an empty SecurityEvent table prove?', options: [{ key: 'A', text: 'The hosts generated no security events' }, { key: 'B', text: 'Nothing by itself; the collection path and table mapping must be verified' }, { key: 'C', text: 'The CEF appliance is offline' }, { key: 'D', text: 'The DCR is correct' }] },
        { id: 'case2-q3', question: 'How should the CEF path be investigated?', options: [{ key: 'A', text: 'Check the appliance format, Syslog/CEF connector, facility, and workspace routing' }, { key: 'B', text: 'Query SecurityEvent only' }, { key: 'C', text: 'Disable AMA' }, { key: 'D', text: 'Create a watchlist' }] },
        { id: 'case2-q4', question: 'Which change is safest after evidence is collected?', options: [{ key: 'A', text: 'Correct the DCR or WEF mapping and validate new events before tuning rules' }, { key: 'B', text: 'Delete the empty table' }, { key: 'C', text: 'Disable all connectors' }, { key: 'D', text: 'Lower every alert threshold' }] },
      ] },
    },
    {
      id: 'SC200-DEMO-CASE-003',
      sequence: 9005,
      title: 'Case Study: Historical Hunt and Detection Design',
      domain: 'Perform threat hunting',
      questionType: 'case_study',
      scenario: 'Fabrikam retains 90 days in the Analytics tier and older records in the Data Lake tier. Analysts need a one-time historical search for a rare OAuth consent event, then a recurring detection for new consent grants. The initial query joins AuditLogs with SigninLogs.',
      question: 'Select the tools and query behavior that match each requirement.',
      options: [{ key: 'A', text: 'Use a Search Job for the one-time historical lookup' }, { key: 'B', text: 'Use a Summary Rule for recurring aggregation' }, { key: 'C', text: 'Use a scheduled analytics rule for the recurring detection' }, { key: 'D', text: 'Use UNION when the tables have different entity keys' }],
      validatedAnswer: ['A', 'B', 'C', 'A'],
      interaction: { caseQuestions: [
        { id: 'case3-q1', question: 'Which capability fits the one-time historical lookup?', options: [{ key: 'A', text: 'Search Job against the supported historical source' }, { key: 'B', text: 'Summary Rule' }, { key: 'C', text: 'Workbook' }, { key: 'D', text: 'Automation rule' }] },
        { id: 'case3-q2', question: 'Which capability is designed for recurring aggregation?', options: [{ key: 'A', text: 'Search Job' }, { key: 'B', text: 'Summary Rule' }, { key: 'C', text: 'Incident comment' }, { key: 'D', text: 'Watchlist' }] },
        { id: 'case3-q3', question: 'How should the recurring consent detection run?', options: [{ key: 'A', text: 'Scheduled analytics rule with a lookback covering the intended interval' }, { key: 'B', text: 'A one-time notebook export' }, { key: 'C', text: 'A workbook refresh only' }, { key: 'D', text: 'A data connector restart' }] },
        { id: 'case3-q4', question: 'When is JOIN preferable to UNION here?', options: [{ key: 'A', text: 'When correlating matching user or application keys across AuditLogs and SigninLogs' }, { key: 'B', text: 'When simply appending rows with the same schema' }, { key: 'C', text: 'When deleting old data' }, { key: 'D', text: 'When changing retention tiers' }] },
      ] },
    },
  );

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

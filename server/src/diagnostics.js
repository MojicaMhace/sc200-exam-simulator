const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const root = path.join(__dirname, '..', '..');
const files = [
  'sc200_additional_25_question_bank.json',
  'sc200_extended_question_bank.json',
  'sc200_skill_question_bank.json',
  'sc200_rbac_question_bank.json',
  'sc200_expert_question_bank.json',
];

async function main() {
  const jsonCounts = Object.fromEntries(files.map((file) => [
    file,
    JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).length,
  ]));
  const db = await open({
    filename: path.join(__dirname, '..', 'data', 'sc200.db'),
    driver: sqlite3.Database,
  });
  const rows = await db.all('SELECT id, domain, scenario, source_type, difficulty, active, validated_answer_json, scenario_family FROM questions');
  const playable = rows.filter((row) => row.active === 1 && row.validated_answer_json && row.validated_answer_json !== '[]');
  const result = {
    jsonCounts,
    sqliteRecords: rows.length,
    playable: playable.length,
    imported: playable.filter((row) => row.source_type === 'Imported').length,
    authored: playable.filter((row) => row.source_type !== 'Imported').length,
    uniqueQuestionIds: new Set(rows.map((row) => row.id)).size,
    uniqueScenarioFamilies: new Set(playable.map((row) => row.scenario_family)).size,
    duplicateScenarioTexts: countDuplicateScenarioTexts(playable),
    difficulty: groupBy(playable, 'difficulty'),
    domains: groupBy(playable, 'domain'),
    importedDumpArchive: rows.filter((row) => row.source_type === 'Imported dump').length,
    importedDumpPlayable: playable.filter((row) => row.source_type === 'Imported dump').length,
  };
  const attempts = await db.get('SELECT COUNT(DISTINCT question_id) AS recentlyAttempted FROM exam_answers WHERE id > COALESCE((SELECT MAX(id) - 200 FROM exam_answers), 0)');
  result.recentlyAttempted = attempts.recentlyAttempted;
  result.rbac = groupBy(playable.filter((row) => row.scenario_family.toLowerCase().startsWith('rbac')), 'difficulty');
  console.log(JSON.stringify(result, null, 2));
  await db.close();
}

function countDuplicateScenarioTexts(rows) {
  const normalized = rows.map((row) => row.scenario.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
  return normalized.length - new Set(normalized).size;
}

function groupBy(rows, key) {
  return rows.reduce((result, row) => {
    result[row[key]] = (result[row[key]] || 0) + 1;
    return result;
  }, {});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

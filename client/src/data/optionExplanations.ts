const explanations: Record<string, Record<string, string>> = {
  'SC200-DEMO-YESNO-001': {
    YES: 'The statement is valid because isolating a compromised device restricts its network communication while preserving the Defender management channel needed for response.',
    NO: 'The statement is not valid because the described isolation action is supported for containing a compromised device.',
  },
  'SC200-DEMO-DRAG-001': {
    A: 'Validate alert evidence and the timeline first so the investigation is based on confirmed activity.',
    B: 'Contain the affected device after validating the incident to stop further spread while preserving response access.',
    C: 'Collect forensic artifacts after containment so evidence can be analyzed without allowing continued activity.',
    D: 'Eradication and recovery come after evidence collection and containment; doing them first can destroy evidence.',
  },
  'SC200-DEMO-CASE-001': {
    A: 'Correlating SigninLogs and AuditLogs connects suspicious sign-ins with mailbox and identity changes in one user timeline.',
    B: 'Waiting for a workbook refresh delays investigation and does not provide the near-real-time evidence needed for a suspected compromise.',
    C: 'Endpoint antivirus events alone cannot explain cloud sign-ins or mailbox-rule persistence.',
    D: 'Disabling every account is unnecessarily disruptive; containment should target the confirmed compromised account and activity.',
  },
  'SC200-NEW-001': {
    A: 'Automation rules can start playbooks after an incident exists, but they are not the Defender XDR capability that autonomously contains a high-confidence attack.',
    B: 'Automatic attack disruption is designed to contain high-confidence ransomware behavior quickly by taking actions such as disabling an account or isolating a device.',
    C: 'A scheduled analytics rule detects activity on an interval; it does not provide the built-in rapid containment behavior described in the scenario.',
    D: 'Just-in-time isolation requests require an analyst or workflow to initiate them, so they do not meet the requirement for automatic response.',
  },
  'SC200-NEW-002': {
    A: 'Advanced Hunting can find evidence after events occur, but a query is not the prevention control that blocks Office child processes.',
    B: 'An ASR rule directly controls the risky Office behavior. Audit mode measures impact first, and exclusions preserve a known-good finance workflow.',
    C: 'Device compliance evaluates device access posture; it does not block a specific process-creation technique.',
    D: 'A playbook reacts after detection and is not the endpoint prevention control for Office child processes.',
  },
  'SC200-NEW-003': {
    A: 'Sentinel data connectors are the supported integration points for Entra ID, Azure Activity, and Microsoft 365 audit events.',
    B: 'The Azure Monitor Agent is used for supported agent-based collection, not as the single connector for these Microsoft cloud sources.',
    C: 'Azure Diagnostics and storage add an unnecessary intermediate path and do not replace the relevant Sentinel connectors.',
    D: 'Event Hubs can stream data, but this is not the direct Sentinel connector approach for the listed sources.',
  },
  'SC200-NEW-004': {
    A: 'Incident creation rules process incidents that already exist; they do not provide the scheduled KQL detection being requested.',
    B: 'A scheduled query evaluates KQL at intervals, and entity mapping makes the user and locations usable in the resulting alert.',
    C: 'Fusion correlates signals using Microsoft detection logic; it is not the normal choice for a precise custom query and time window.',
    D: 'Behavior analytics can identify anomalies, but the requirement is an explicit scheduled KQL condition.',
  },
  'SC200-NEW-005': {
    A: 'Hundreds of separate rules create unnecessary maintenance and duplicate detection logic.',
    B: 'A blob file is not automatically a Sentinel watchlist query source for analytics rules.',
    C: 'A custom table is intended for ingested event data, while this is a reference list used by detections.',
    D: 'A watchlist is built for reference data such as an IP list, and _GetWatchlist() lets KQL use it in analytics rules.',
  },
  'SC200-NEW-006': {
    A: 'An automation rule can trigger a Logic App playbook when the incident is created, where Teams and ServiceNow actions can be orchestrated.',
    B: 'Alert grouping changes how alerts are grouped; it does not perform the requested notifications and ticket creation.',
    C: 'Automated investigation is for Defender investigation and remediation, not this Sentinel incident notification workflow.',
    D: 'An Azure Function could be custom-built, but the Sentinel automation rule and playbook are the native solution for this trigger.',
  },
  'SC200-NEW-007': {
    A: 'Rule run history is operational detail for analytics rules, not a visual dashboard for broad SOC trends and metrics.',
    B: 'Workbooks combine KQL-backed visualizations, filters, and refresh behavior for Sentinel reporting and SOC metrics.',
    C: 'Azure Monitor dashboards are broader Azure dashboards and are not the Sentinel-focused workbook feature requested.',
    D: 'Defender reports do not provide the Sentinel workbook authoring and visualization experience described.',
  },
  'SC200-NEW-008': {
    A: 'A custom table and playbook would duplicate functionality provided by Sentinel threat intelligence ingestion and analytics.',
    B: 'Defender endpoint custom indicators apply to endpoint protection, not the Sentinel TAXII ingestion path.',
    C: 'A manually maintained watchlist does not provide automatic TAXII feed ingestion.',
    D: 'The TAXII connector imports indicators into ThreatIntelligenceIndicator, which analytics rules can match against logs.',
  },
  'SC200-NEW-009': {
    A: 'Sentinel anomalies use entity behavior analytics to compare activity with baselines and surface unusual behavior.',
    B: 'Static thresholds detect fixed conditions but do not learn a user or entity baseline.',
    C: 'Defender for Identity alerts cover identity signals, but by themselves are not Sentinel behavioral anomaly scoring.',
    D: 'Entra sign-in risk focuses on sign-in protection signals, not the broader Sentinel anomaly capability requested.',
  },
  'SC200-NEW-010': {
    A: 'Keeping two years in the hot Analytics tier provides speed but ignores the stated cost-optimization requirement.',
    B: 'The Analytics tier serves the 90-day fast-access window, while the Data lake tier retains older data more economically for occasional KQL jobs.',
    C: 'Deleting data after 90 days violates the two-year compliance requirement.',
    D: 'The XDR tier is not the retention strategy for this Sentinel workspace requirement.',
  },
  'SC200-NEW-011': {
    A: 'SOC optimization recommendations identify unused sources, cost opportunities, and ATT&CK coverage gaps in the workspace.',
    B: 'The investigation graph helps analyze entities and relationships in an incident, not workspace optimization guidance.',
    C: 'Workbooks visualize data but do not provide the built-in optimization recommendations.',
    D: 'A manually viewed ATT&CK matrix does not analyze the workspace and surface tailored recommendations.',
  },
  'SC200-NEW-012': {
    A: 'The process tree and timeline provide the evidence needed to validate a suspicious Office-launched process before escalating.',
    B: 'Isolation may be appropriate after confirming risk, but it is a containment action rather than the first validation step for a medium alert.',
    C: 'Blocking the account before validating the alert can disrupt a legitimate user and is not the first investigation action.',
    D: 'A full scan may help later, but the incident process tree and timeline are the most direct first evidence.',
  },
  'SC200-NEW-013': {
    A: 'Defender XDR correlates related alerts into one incident so analysts can follow the attack chain and manage one case.',
    B: 'Treating related alerts as unrelated loses the attack-chain context and duplicates investigation work.',
    C: 'A spreadsheet is manual and loses the live correlation and incident context provided by XDR.',
    D: 'Fusion is not something to wait for when Defender XDR has already correlated the multi-domain incident.',
  },
  'SC200-NEW-014': {
    A: 'Device isolation limits network communication but does not provide an interactive remote shell for collection and scripts.',
    B: 'Automated investigation performs approved automated actions; it is not the interactive session for custom collection.',
    C: 'Live Response provides a remote session to collect artifacts and run investigation commands on the endpoint.',
    D: 'Advanced Hunting queries telemetry; they cannot directly collect a memory dump or execute a script on the device.',
  },
  'SC200-NEW-015': {
    A: 'Rapid NTLM use across multiple servers is not normal behavior when Defender for Identity identifies pass-the-hash indicators.',
    B: 'A VPN issue does not explain the credential-reuse pattern and lateral movement signal by itself.',
    C: 'Conditional Access controls sign-in policy and does not explain this endpoint credential-dumping indicator.',
    D: 'Pass-the-hash reuses stolen hashes for lateral movement, so the source machine should be checked for credential theft tooling.',
  },
  'SC200-NEW-016': {
    A: 'Conditional Access App Control governs sessions for selected apps; it is not the discovery inventory for unknown cloud apps.',
    B: 'App governance focuses on OAuth app behavior and permissions rather than discovering all unsanctioned cloud usage.',
    C: 'Cloud Discovery uses traffic and usage data to identify shadow IT and assess discovered cloud applications.',
    D: 'Information protection policies protect data; they do not discover which cloud apps employees use.',
  },
  'SC200-NEW-017': {
    A: 'Endpoint settings configure Defender behavior but are not the queue for reviewing recommended remediation actions.',
    B: 'Intune compliance manages device policy and compliance state, not Defender investigation remediation approvals.',
    C: 'Playbooks automate responses but do not provide the Defender remediation approval queue.',
    D: 'Action Center Pending actions is where an analyst reviews, approves, or rejects recommended Defender remediation.',
  },
  'SC200-NEW-018': {
    A: 'A spreadsheet requires manual review and cannot provide an in-product incident summary and suggested next step.',
    B: 'Embedded Security Copilot can summarize the incident and help a Tier 1 analyst investigate the timeline with guided actions.',
    C: 'Fusion is an automated correlation capability, not a guaranteed interactive summary of this incident on demand.',
    D: 'Escalating immediately skips the rapid triage assistance the scenario is asking the analyst to use.',
  },
  'SC200-NEW-019': {
    A: 'A known country does not make a successful login after hundreds of failures safe; the account and accessed data still need investigation.',
    B: 'Severity alone should not defer investigation when there is a successful suspicious login and sensitive data exposure.',
    C: 'The successful login may represent compromise, so investigate access, revoke exposed credentials, and involve privacy stakeholders.',
    D: 'Enabling future auditing does not contain or investigate the current possible breach.',
  },
  'SC200-NEW-020': {
    A: 'Purview activity data can show Microsoft 365 and Graph-related file access beyond the endpoint device timeline.',
    B: 'The endpoint timeline only covers endpoint telemetry and cannot establish the complete Microsoft 365 file-access history.',
    C: 'Workbooks visualize data but are not the authoritative activity source for this Graph access question.',
    D: 'Action Center contains pending Defender actions, not historical Microsoft 365 file-access records.',
  },
  'SC200-NEW-021': {
    A: 'KQL uses where rather than filter, and the time condition must reference a timestamp with ago().',
    B: 'This uses the Advanced Hunting table, KQL where syntax, exact filename matching, and ago(7d) for the requested window.',
    C: 'This is SQL syntax, not KQL syntax used by Advanced Hunting.',
    D: 'It uses a different field, substring matching, and a result limit, so it does not precisely implement the requested query.',
  },
  'SC200-NEW-022': {
    A: 'filter, time, and sort are not the KQL operators or fields needed for this Sentinel query, and it omits the exact failure reason.',
    B: 'This is SQL syntax rather than KQL and does not filter ResultDescription to Invalid password.',
    C: 'This filters non-success results, the exact failure description, the 24-hour window, and sorts TimeGenerated newest first.',
    D: 'The field names and values do not match the SigninLogs schema, and top 100 is not the requested ordering.',
  },
  'SC200-NEW-023': {
    A: 'A hunting graph shows attack spread and blast radius, while Sentinel Graph adds entity relationships across the incident data.',
    B: 'Workbooks are useful dashboards but do not provide the interactive relationship and spread view requested.',
    C: 'A compliance report evaluates posture and regulations, not incident entity relationships or blast radius.',
    D: 'A single rule without entity mapping cannot build the requested relationship graph or spread estimate.',
  },
  'SC200-NEW-024': {
    A: 'A KQL job is suited to large, long-running historical queries over Data lake data when interactive response is not required.',
    B: 'The Analytics tier is optimized for hot interactive data; forcing an 18-month hunt there ignores the storage tier and cost goal.',
    C: 'A workbook presents visualizations but is not the execution method for a large Data lake query.',
    D: 'Manual export is slow, error-prone, and unnecessary when KQL jobs can query the retained data directly.',
  },
  'SC200-NEW-025': {
    A: 'Action Center reviews Defender actions and does not provide notebook-based programmatic Sentinel access.',
    B: 'A scheduled analytics rule runs detections on a schedule; it is not a reusable notebook interaction layer.',
    C: 'The Sentinel MCP Server gives a notebook programmatic access to Sentinel tools and data for repeatable hunting workflows.',
    D: 'Copy-paste is manual and not repeatable or programmatic, which conflicts with the requested workflow.',
  },
}

export function getOptionExplanation(questionId: string, optionKey: string): string | undefined {
  return explanations[questionId]?.[optionKey]
}

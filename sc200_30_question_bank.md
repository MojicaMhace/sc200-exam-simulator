# SC-200 Compiled Question Bank — Q01–Q30

**Source limitation:** concise reconstructions from the prior discussion; original full wording and options are incomplete for some entries. Do not infer missing original options or auto-approve for scored exams.

## SC200-001 — Count failed logons per endpoint

**Question:** Count failed authentications on CFOLaptop, CEOLaptop, and COOLaptop using advanced hunting.

**Answer:** DeviceLogonEvents | where DeviceName in ("CFOLaptop", "CEOLaptop", "COOLaptop") | where ActionType == "LogonFailed" | summarize LogonFailures=count() by DeviceName, LogonType

**Status:** `Original dump expression ActionType == FailureReason compares columns and is unreliable. Confirm actual failure ActionType values in tenant schema.`

**Explanation / caveat:** Perform threat hunting

**Microsoft Learn:** Not recorded

## SC200-002 — Unfamiliar sign-in country

**Question:** Which Defender for Cloud Apps anomaly policy alerts on activity from a country not recently or ever visited by organization users?

**Answer:** C. Activity from infrequent country

**Status:** `verified_concept`

**Explanation / caveat:** Initial learning period applies.

**Microsoft Learn:** https://learn.microsoft.com/en-us/defender-cloud-apps/investigate-anomaly-alerts

## SC200-003 — 32-character account numbers in DLP

**Question:** SharePoint files contain sensitive customer account numbers comprised of exactly 32 alphanumeric characters. What method can identify the pattern?

**Answer:** D. Regular expression pattern matching

**Status:** `answer_concept_verified_options_missing`

**Explanation / caveat:** Regex locates candidates, but does not confirm membership in an authoritative account database.

**Microsoft Learn:** https://learn.microsoft.com/en-us/purview/sit-create-a-custom-sensitive-information-type

## SC200-004 — Office child-process ASR block

**Question:** Select both PowerShell configurations that BLOCK Office applications from creating child processes.

**Answer:** A and D: Add-MpPreference or Set-MpPreference with ASR rule D4F940AB-401B-4EFC-AADC-AD5F3C50688A and action Enabled

**Status:** `Prior dump selected AuditMode (B,C); AuditMode does not block. Use Enabled. Set-MpPreference can replace existing configuration, so use care.`

**Explanation / caveat:** Manage a security operations environment

**Microsoft Learn:** Not recorded

## SC200-005 — Hide false-positive macro alerts

**Question:** Accounting team regularly uses legitimate macro documents. Hide known false-positive alerts without reducing endpoint protection. Which three listed selections?

**Answer:** B,D as operational controls; no valid three-action answer

**Status:** `ambiguous_invalid_three_answer_request`

**Explanation / caveat:** Manage a security operations environment

**Microsoft Learn:** Not recorded

## SC200-006 — Block Launchpad without Defender for Endpoint

**Question:** Without Defender for Endpoint enabled, order actions to block discovered Launchpad cloud app.

**Answer:** Select Launchpad app, Tag as Unsanctioned, Generate block script, Import/apply script on source security appliance

**Status:** `Tagging alone does not block; appliance enforces traffic rules.`

**Explanation / caveat:** Manage a security operations environment

**Microsoft Learn:** Not recorded

## SC200-007 — Email-to-endpoint hash hunting operators

**Question:** Fill three blanks: EmailAttachmentInfo ... [1] (DeviceFileEvents | [2] FileName,SHA256,DeviceName,DeviceId) on SHA256 | [3] Timestamp,...

**Answer:** join, project, project

**Status:** `join correlates hash across tables; inner project chooses device fields; outer project selects output.`

**Explanation / caveat:** Perform threat hunting

**Microsoft Learn:** Not recorded

## SC200-008 — Custom detection for System Restore disable

**Question:** Which two steps establish a custom detection from hunting query of attempts to disable System Restore?

**Answer:** A. Create custom detection rule; E. Include DeviceId and ReportId in hunting output

**Status:** `Timestamp and device/event identifiers also matter; use source-specific schema.`

**Explanation / caveat:** Perform threat hunting

**Microsoft Learn:** Not recorded

## SC200-009 — Automated investigation device groups

**Question:** Which actions were selected in the legacy question to configure high-priority devices for automatic remediation?

**Answer:** A,C,D: Define group tags, tag machines, create highest-rank group

**Status:** `Actual remediation also requires automation level Full; group rank alone does not enable automated remediation.`

**Explanation / caveat:** Manage a security operations environment

**Microsoft Learn:** Not recorded

## SC200-010 — Honeytoken account entity tagging

**Question:** Can tagging accounts as Honeytoken in Defender for Identity create decoy identities for attacker-detection scenarios?

**Answer:** A. Yes

**Status:** `verified_concept`

**Explanation / caveat:** Answer concept consistent with compilation; original choices need review where missing.

**Microsoft Learn:** https://learn.microsoft.com/en-us/defender-for-identity/entity-tags

## SC200-011 — Sign-in risk vs honeytokens

**Question:** Does setting Microsoft Entra sign-in risk policy create Defender for Identity honeytoken accounts?

**Answer:** B. No

**Status:** `Sign-in risk policy applies access controls; honeytoken tagging defines monitored decoy accounts.`

**Explanation / caveat:** Respond to security incidents

**Microsoft Learn:** Not recorded

## SC200-012 — Sensitive group vs honeytokens

**Question:** Does tagging an Active Directory group as Sensitive convert its member accounts into honeytokens?

**Answer:** B. No

**Status:** `Sensitive identifies important entities; Honeytoken is separate tagging.`

**Explanation / caveat:** Respond to security incidents

**Microsoft Learn:** Not recorded

## SC200-013 — Safe Attachments without delivery delay

**Question:** Which Safe Attachments mode delivers email body while continuing attachment analysis and restricting access to unscanned attachments?

**Answer:** A. Dynamic Delivery

**Status:** `answer_concept_verified_options_missing`

**Explanation / caveat:** Answer concept consistent with compilation; original choices need review where missing.

**Microsoft Learn:** https://learn.microsoft.com/en-us/defender-office-365/safe-attachments-about

## SC200-014 — Malware email recipient and subsequent logons

**Question:** Fill KQL operations for malware-tagged EmailEvents joined to IdentityLogonEvents and restricted to 20 records.

**Answer:** EmailEvents, IdentityLogonEvents, take 20 (dump); top 20 by LogonTime desc for actual most recent

**Status:** `take 20 does not guarantee 20 most recent; use top/sort. Check current columns; use recipient UPN matching.`

**Explanation / caveat:** Perform threat hunting

**Microsoft Learn:** Not recorded

## SC200-015 — Block known malicious file indicator

**Question:** Choose indicator type and action to alert/block known malicious file based on a security bulletin.

**Answer:** C. File hash indicator with Alert and block (legacy wording)

**Status:** `answer_concept_verified_options_missing`

**Explanation / caveat:** Hash is exact-file indicator; actual available actions may differ with current Defender UI.

**Microsoft Learn:** https://learn.microsoft.com/en-us/defender-endpoint/indicator-file

## SC200-016 — Approve pending endpoint remediation

**Question:** Which permission permits least-privilege analyst approval/rejection of pending Defender for Endpoint remediation?

**Answer:** Active remediation actions permission (Defender RBAC), appropriately scoped

**Status:** `legacy_answer_incorrect_or_ambiguous`

**Explanation / caveat:** Manage a security operations environment

**Microsoft Learn:** Not recorded

## SC200-017 — Email attachment SHA256 join columns

**Question:** Which join key is used for both the email attachment and device file event matching?

**Answer:** SHA256, SHA256

**Status:** `Same concept as Q07; duplicate concept for exam-selection purposes.`

**Explanation / caveat:** Perform threat hunting

**Microsoft Learn:** Not recorded

## SC200-018 — Cloud Apps file monitoring prerequisites

**Question:** Which settings enable legacy Defender for Cloud Apps file-content and sensitivity-label inspection?

**Answer:** D,E: Information Protection scan/integration and file monitoring

**Status:** `verified_historical_pending_retirement`

**Explanation / caveat:** Manage a security operations environment

**Microsoft Learn:** Not recorded

## SC200-019 — Botnet IP activity policy

**Question:** Choose Defender for Cloud Apps custom policy type and filter to detect cloud activity from a tagged botnet IP.

**Answer:** Activity policy, IP address tag

**Status:** `Subject to IP categorization and cloud activity telemetry.`

**Explanation / caveat:** Manage a security operations environment

**Microsoft Learn:** Not recorded

## SC200-020 — Remote worker MFA locations

**Question:** Which Conditional Access component distinguishes trusted office IP ranges from external connections for MFA decisions?

**Answer:** C. Named location

**Status:** `answer_concept_verified_options_missing`

**Explanation / caveat:** Named location is a condition, not itself a policy that enforces MFA.

**Microsoft Learn:** https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-assignment-network

## SC200-021 — Impossible travel corporate IP false positives

**Question:** Which two options were identified to reduce impossible-travel false positives linked to known corporate IP addresses?

**Answer:** A,B: Automatic enrichment and categorize corporate IP ranges

**Status:** `IP categorization and data quality are central; review original options to verify exact legacy wording.`

**Explanation / caveat:** Respond to security incidents

**Microsoft Learn:** Not recorded

## SC200-022 — Sensitive entity group not honeytoken

**Question:** If a group is tagged Sensitive in Defender for Identity, have its members been configured as attacker decoys?

**Answer:** B. No

**Status:** `Duplicate concept of Q12.`

**Explanation / caveat:** Respond to security incidents

**Microsoft Learn:** Not recorded

## SC200-023 — Zero-hour auto purge report

**Question:** Which report can show whether ZAP moved a message after delivery?

**Answer:** A. Threat Protection Status report

**Status:** `answer_concept_verified_options_missing`

**Explanation / caveat:** Confirm view/filters available in current Defender for Office 365 reporting.

**Microsoft Learn:** https://learn.microsoft.com/en-us/defender-office-365/reports-email-security

## SC200-024 — Endpoint execution mitigation

**Question:** Which Defender for Endpoint capability reduces Office-related malicious execution and other high-risk endpoint behaviors?

**Answer:** B. Attack surface reduction (ASR) rules

**Status:** `answer_concept_verified_options_missing`

**Explanation / caveat:** ASR is not a substitute for all web and email safeguards.

**Microsoft Learn:** https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference

## SC200-025 — Entra sign-in logs to third-party SIEM

**Question:** How can Microsoft Entra sign-in data be streamed to a third-party SIEM in near real time?

**Answer:** B. Diagnostic settings stream to Azure Event Hubs

**Status:** `answer_concept_verified_options_missing`

**Explanation / caveat:** For Microsoft Sentinel itself, use its Entra ID connector and appropriate workspace pipeline.

**Microsoft Learn:** https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-stream-logs-to-event-hub

## SC200-026 — Legacy Azure subscription RBAC roles

**Question:** Assign subscription roles: User1 manages security policy and auto provisioning; User2 views security alerts/recommendations and dismisses alerts.

**Answer:** Legacy dump: User1 Owner; User2 Contributor

**Status:** `needs_review_legacy_rbac`

**Explanation / caveat:** Manage a security operations environment

**Microsoft Learn:** Not recorded

## SC200-027 — Live Response remote shell

**Question:** What settings provide Defender for Endpoint remote shell with scoped permissions?

**Answer:** Enable Live Response; grant appropriate Live Response role permission and device group scope

**Status:** `legacy_dump_partly_incorrect`

**Explanation / caveat:** Respond to security incidents

**Microsoft Learn:** Not recorded

## SC200-028 — Device alerts related to compromised user

**Question:** Complete advanced hunting query joining user-associated DeviceInfo to AlertEvidence, then AlertInfo to show alerts.

**Answer:** join, project

**Status:** `Find logged-on device IDs, join to evidence, project alert fields.`

**Explanation / caveat:** Perform threat hunting

**Microsoft Learn:** Not recorded

## SC200-029 — Departing employee mass SharePoint download

**Question:** Which product feature identifies potential exfiltration by departing employees who download many SharePoint files?

**Answer:** D. Microsoft Purview Insider Risk Management policy

**Status:** `needs_review_product_scope`

**Explanation / caveat:** If question explicitly limits to Defender for Cloud Apps, mass download activity/anomaly policy may be intended instead; original is ambiguous.

**Microsoft Learn:** https://learn.microsoft.com/en-us/purview/insider-risk-management-policies

## SC200-030 — Changes to malicious files over seven days

**Question:** Which interface investigates changes to malicious files over last seven days?

**Answer:** C. Microsoft Purview Activity explorer (legacy dump)

**Status:** `needs_review_ambiguous_telemetry`

**Explanation / caveat:** Valid for supported DLP/label activities, not generally for malware-file modifications on endpoints; DeviceFileEvents better for endpoint file changes.

**Microsoft Learn:** https://learn.microsoft.com/en-us/purview/data-classification-activity-explorer


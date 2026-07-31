# AI Readiness Audit — tool stack (v1)

_9K Systems · researched July 28, 2026_

**Constraints this is built for:** read-only cloud/API access; client environments
are a mix of M365, Google Workspace, and on-prem/local; vendor tools supply the
data but **the client-facing report is always ours**; $0 now, $50–150/mo once the
first audit sells.

**Design rule:** every tool here is read-only or explicitly non-destructive. The
audit sells on trust — nothing in the stack should be able to change a client's
environment.

---

## Phase 0 — the $0 stack (start here, covers ~90% of the 43 checkpoints)

### Microsoft 365 / Entra ID (most SMB clients)

| Tool | Cost | What it gives you |
|---|---|---|
| **CISA ScubaGear** | Free, open source | Automated pass/fail against CISA SCuBA baselines for Entra, Exchange, SharePoint, Teams, Defender. Read-only. Produces per-control reports — the single biggest credibility win in the stack. |
| **Maester** | Free, open source | PowerShell/Pester security test framework, includes SCuBA tests plus extras. Repeatable, scriptable, good for re-audits and retainer upsells. |
| **Microsoft Secure Score** | Free (in tenant) | Built-in scored posture + Microsoft's own recommendations. Client-recognizable number to anchor findings against. |
| **Entra sign-in / audit logs + Enterprise Apps** | Free (in tenant) | MFA status per user, legacy auth, **OAuth grants to third-party AI apps** — this is your shadow-AI smoking gun. |
| **Graph API (read-only scopes)** | Free | Custom pulls: users, licenses, app consents, mailbox rules. Feeds our report generator directly. |

**Access ask:** Global Reader (read-only) — never Global Admin. Say that out
loud in the sales call; it lands well.

### Google Workspace clients

| Tool | Cost | What it gives you |
|---|---|---|
| **Admin security dashboard + Security health page** | Free (in tenant) | Recommended-settings gap list, native. |
| **Audit & investigation tool** | Free (in tenant) | Admin/user activity, OAuth token grants to third-party apps. |
| **GAM / GAMADV-XTD3** | Free, open source | Scriptable read-only pulls: users, 2SV status, app tokens, drive sharing. |
| **YeshID free risk assessment** | Free tool | Quick Policy-API-based posture check to corroborate findings. |

**Access ask:** a read-only admin role with Reports + Security Center rights.

### On-prem / local / mixed

| Tool | Cost | What it gives you |
|---|---|---|
| **Nmap** (+ Zenmap) | Free, open source | Device/port/service discovery. Point-in-time, but that's all an audit needs. Get **written authorization** before scanning. |
| **GLPI + GLPI Agent** | Free, open source | Deep hardware/software/license inventory across Windows/Mac/Linux. Heavier install — use for larger engagements. |
| **Spiceworks Inventory** | Free | Lightweight discovery for small IT footprints; low-friction alternative to GLPI. |
| **Snipe-IT** | Free, open source | Clean asset tracking if the client needs an inventory left behind (nice upsell artifact). |

### AI-specific / shadow AI (the differentiator)

Most of this is **method, not tooling** — and that's the honest pitch:

- **OAuth/app-consent review** (Entra Enterprise Apps / Google token audit) — finds AI
  tools employees connected to company data without asking. Highest-signal check
  in the whole audit.
- **Browser extension inventory** — via endpoint review or Entra/Chrome policy.
- **SaaS spend review** — client's card/bank statements + invoices; finds AI
  subscriptions nobody remembers buying (feeds the Spend & ROI domain).
- **Structured staff interview** — the 6 shadow-AI checkpoints in our instrument.
  Cheap, fast, and often the most damning evidence.
- **Vendor DPAs / training opt-out settings** — read each AI vendor's admin console.

### Reporting (already built)

Our own **Audit workspace** at `/app/audits`: 43 checkpoints across 8 domains →
severity + notes → **generated markdown report** → export. Vendor tools feed it;
the deliverable stays 9K-branded. No per-report cost, scales free.

**Gap to close:** markdown → branded PDF. Options: (a) print-to-PDF from a styled
HTML view (free, ~1 hour of work), (b) generate PDF server-side. Recommend (a) now.

---

## Phase 1 — first $50–150/mo (buy only after audit #1 sells)

Ranked by what actually wins the *next* deal:

1. **PDF/report polish** ($0–20/mo) — a styled HTML→PDF template. Biggest
   perceived-value jump per dollar. Mostly build time, not spend.
2. **A continuous-posture tool** (~$50–100/mo, e.g. an SSPM/M365 assessment
   product) — converts one-time audits into monitoring retainers. Buy this when
   you want recurring revenue, not before.
3. **Domotz / network monitoring** (~$25–50/site) — only for retainer clients,
   billed through to them.

**Do not buy yet:** enterprise SSPM, Lansweeper paid tiers, ConnectSecure-class
platforms. They're priced for MSPs with a book of clients; you have zero clients
today and free tools cover the same checkpoints.

---

## Delivery workflow (how a $997 audit actually runs)

1. **Scope + authorization** — signed one-pager: read-only access, scan
   permission, timeline (7 business days).
2. **Access** — Global Reader (M365) / read-only admin (Workspace); credentials
   via a password manager share, never email.
3. **Automated sweep** — ScubaGear + Maester (M365) or GAM pulls (Workspace);
   Nmap if on-prem is in scope. Export raw results.
4. **AI-specific pass** — OAuth grants, extensions, SaaS spend, staff interview.
5. **Load findings** — enter into `/app/audits`, set severity, write notes.
6. **Generate report** — our template; add an executive summary in plain English.
7. **Deliver + debrief** — 30-min call. This is where the rescue/rebuild sells.
8. **Revoke access** — confirm in writing. Include it in the report's last page.

---

## Legal / trust guardrails

- **Written authorization before any scan.** Nmap against a network you don't own
  without permission is a real legal problem, not a formality.
- **Read-only, always.** Never accept Global Admin "to make it easier."
- **Handle findings as confidential** — the report contains a map of their
  weaknesses. Encrypt at rest, share via the client's gated portal (we have it).
- **Don't give legal advice.** The SB 26-189 / HB 26-1263 checkpoints assess
  *exposure* and flag where counsel is warranted. Say that in the report.
- **Delete client data** at engagement end; state the retention period up front.

---

## Deep dive — OAuth / app-consent review (the shadow-AI smoking gun)

_Researched July 28, 2026. Ranked by **flexibility** for a one-operator shop
auditing many unrelated client tenants._

### The core insight

Every AI tool an employee "connects" to company data leaves a permanent,
queryable artifact: an **OAuth grant**. You don't need a fancy platform to find
them — three API endpoints tell the whole story. This is why the check is both
free and devastating in a report.

**Microsoft 365** — query these three:
- `servicePrincipals` — every app registered in the tenant
- `oauth2PermissionGrants` — **delegated** grants (user said yes on their own)
- `appRoleAssignments` — **application** permissions (admin-level, worst case)

**Google Workspace** — `gam report tokens` covers the equivalent ground.

### Tier 1 — free, portable, works on any tenant (start here)

| Option | Cost | Flexibility notes |
|---|---|---|
| **`Get-AzureADPSPermissions.ps1`** (Microsoft's own script) | Free | Dumps **all** OAuth consent grants + apps for **all users** to a single CSV. One file, no install, runs against any tenant you have read access to. **The single most flexible tool in this list** — CSV feeds straight into our report. |
| **Microsoft Graph PowerShell** (`Get-MgServicePrincipal`, `Get-MgOauth2PermissionGrant`) | Free | Fully scriptable, read-only scopes, no dependency on a vendor. Best long-term: write once, reuse per client, extend as our instrument grows. |
| **GAM / GAMADV-XTD3** — `gam report tokens > oauth_tokens.csv` | Free, open source | Google-side equivalent. Same shape of output, same portability. GAMADV-XTD3 is the more actively maintained fork with better output formatting. |
| **Entra portal → Enterprise Applications → Permissions** | Free (in tenant) | Zero-setup manual review. Use for spot checks and for *showing the client on screen* during the debrief — visual proof beats a spreadsheet. |
| **Google Admin → Security → API controls → App access control** | Free (in tenant) | Same, Google side. Lists third-party apps with granted scopes. |

**Why Tier 1 wins for you:** no per-tenant license, no vendor onboarding, no
trial clock, works whether the client is M365, Google, or both, and the output is
CSV you own. A script + read-only credentials is the most flexible arrangement
possible for auditing tenants you don't manage long-term.

### Tier 2 — free tiers / free assessments (corroboration, not foundation)

| Option | Cost | Catch |
|---|---|---|
| **AdminDroid** free tier | Free tier | Genuinely useful app/consent reporting and a nice UI for screenshots. Free tier is limited vs paid; treat as a second opinion. |
| **CloudCapsule Playbooks** | Free assessment | Automates suspicious-app discovery across tenants, MSP-oriented. Worth trialing on audit #1. |
| **YeshID** (Workspace) | Free tool | Policy-API-based risk check; fast corroboration on the Google side. |

### Tier 3 — only when you have a book of clients

| Option | Cost | Verdict |
|---|---|---|
| **CIPP** (self-hosted) | Free/open source + ~$15–20/mo Azure | 8,000+ MSPs run it. Multi-tenant M365 management incl. GDAP. **Not for one-off audits** — it's for tenants you manage continuously. Revisit when you have 3+ platform/retainer clients. |
| **CIPP Hosted** | ~$99/mo | Skips the Azure setup. Same "wait until you have clients" logic. |
| **Defender for Cloud Apps** (app governance) | Requires E5/E5-Security-class license per user | Best-in-class OAuth monitoring + 31,000-app shadow-IT catalog — but it's **licensed in the client's tenant**, not something you bring. If a client already has E5, use it and look brilliant; never buy it yourself. |

### Timing note worth putting in every report

Microsoft is enabling a **managed consent policy by default starting July 2026** —
users will no longer be able to consent to third-party apps touching files/sites
without admin approval. Two implications for your pitch:
1. Grants made *before* this change are still live and still invisible. The audit
   finds those.
2. Clients who never set up an admin-consent workflow are about to have a pile of
   blocked-app help tickets. That's a rescue/rebuild conversation.

### How to run the check (repeatable, ~20 minutes per tenant)

1. Get **Global Reader** (M365) or read-only admin + Reports rights (Workspace).
2. M365: run `Get-AzureADPSPermissions.ps1` → CSV. Google: `gam report tokens` → CSV.
3. Triage the CSV for: AI-adjacent app names; broad scopes (`Mail.Read`,
   `Files.Read.All`, `offline_access`); **application** permissions granted by an
   admin; apps with suspicious/bland/misspelled display names; single-user grants
   on high-value mailboxes.
4. Cross-reference app names against the client's known/approved tool list. The
   delta **is** the shadow-AI finding.
5. Screenshot the Enterprise Apps / API-controls page for the report appendix.
6. Load findings into `/app/audits` with severity + note; generate the report.

**Guardrails:** read-only credentials only; never revoke a grant during an audit
(that's remediation — a separate, authorized engagement); treat the CSV as
confidential (it's a map of every door into their data).

## Sources

- [ScubaGear (CISA) — open-source M365 baseline assessment](https://www.helpnetsecurity.com/2024/11/18/scubagear-open-source-tool-assess-microsoft-365-security/)
- [Maester + ScubaGear for repeatable verification](https://senserva.com/best-microsoft-365-audit-tools.html)
- [Google Workspace admin security dashboard](https://workspace.google.com/products/admin/security-center/)
- [Google Workspace audit & investigation tool](https://knowledge.workspace.google.com/admin/reports/about-the-audit-and-investigation-tool)
- [YeshID free Workspace risk assessment](https://www.yeshid.com/post/free-google-workspace-risk-assessment-tool)
- [Open-source asset inventory options (GLPI, Snipe-IT, NetBox)](https://www.openmsp.ai/blog/it-inventory-management-open-source)
- [Network discovery tool comparison 2026](https://blog.domotz.com/think-like-msp/network-discovery-tools/)

**OAuth / app-consent review:**
- [Auditing OAuth consent grants in Entra ID (Get-AzureADPSPermissions.ps1)](https://medium.com/@ravibak/auditing-oauth-consent-grants-in-entra-id-azure-ad-b8d7af2f7358)
- [Detect and remediate illicit consent grants (Microsoft)](https://learn.microsoft.com/en-us/defender-office-365/detect-and-remediate-illicit-consent-grants)
- [PowerShell guide to auditing unauthorized AI applications](https://adamtheautomator.com/taming-ai-tool-sprawl-powershell-guide-auditing)
- [M365 OAuth app audit: revoke consent grants (3 endpoints)](https://www.decryptiondigest.com/blog/oauth-consent-grant-audit-microsoft-365)
- [Export enterprise apps + permissions (AdminDroid)](https://blog.admindroid.com/export-all-enterprise-apps-and-their-assigned-permission-in-microsoft-entra/)
- [How to audit third-party OAuth app permissions (NinjaOne)](https://www.ninjaone.com/blog/audit-third-party-oauth-app-permissions/)
- [GAMADV-XTD3 (Google Workspace CLI)](https://github.com/taers232c/GAMADV-XTD3/wiki/Authorization)
- [OAuth app risk across Google Workspace + M365 (Spin.AI)](https://spin.ai/blog/oauth-app-risk-2026-audit-control-google-microsoft-365/)
- [CIPP multi-tenant M365 management (cost/hosted)](https://getnerdio.com/cyberdrain-cipp/)
- [Defender for Cloud Apps licensing requirements](https://learn.microsoft.com/en-us/defender-cloud-apps/get-started)
- [Cloud app discovery / shadow IT catalog](https://learn.microsoft.com/en-us/defender-cloud-apps/set-up-cloud-discovery)

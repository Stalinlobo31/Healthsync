const roles = {
  patient: {
    label: "Patient", initial: "P",
    nav: [["overview","Overview"],["reports","My Reports"],["history","My History"],["privacy","Privacy"]],
  },
  doctor: {
    label: "Licensed Doctor", initial: "D",
    nav: [["overview","Overview"],["patients","Patients"],["reports","Reports"],["review","Clinical Review"],["knowledge","Medical Knowledge"],["messages","Patient Messages"]],
  },
  clinic: {
    label: "Authorized Clinic", initial: "C",
    nav: [["overview","Overview"],["patients","Patients"],["reports","Reports"],["access","Access Log"],["team","Clinic Team"]],
  },
  admin: {
    label: "System Administrator", initial: "A",
    nav: [["overview","Overview"],["users","Users & Roles"],["verification","Doctor Verification"],["sources","Source Registry"],["rules","System Rules"],["audit","Audit Log"]],
  }
};

let role = "patient";
let page = "overview";
let currentUser = null;

async function loginUser() {
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  const errorBox = document.getElementById("loginError");

  errorBox.classList.add("hidden");
  errorBox.textContent = "";

  if (!email || !password) {
    errorBox.textContent = "Please enter your email and password.";
    errorBox.classList.remove("hidden");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
    return;
  }

  currentUser = data.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("full_name, role")
    .eq("id", currentUser.id)
    .single();

  if (profileError) {
    errorBox.textContent =
      "Login succeeded, but your HealthSync profile could not be loaded.";
    errorBox.classList.remove("hidden");

    await supabaseClient.auth.signOut();
    return;
  }

  role = profile.role.toLowerCase();

  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  document.getElementById("sideRole").textContent = roles[role].label;
  document.getElementById("avatar").textContent = roles[role].initial;
  document.getElementById("userLabel").textContent =
    profile.full_name || roles[role].label;

  render("overview");
}


function showSignup() {
  document.getElementById("signupPanel").classList.remove("hidden");
}


function showLogin() {
  document.getElementById("signupPanel").classList.add("hidden");
}


async function signupUser() {
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const requestedRole = document.getElementById("signupRole").value;
  const errorBox = document.getElementById("signupError");

  errorBox.classList.add("hidden");
  errorBox.textContent = "";

  if (!name || !email || !password) {
    errorBox.textContent = "Please fill in all fields.";
    errorBox.classList.remove("hidden");
    return;
  }

  if (password.length < 6) {
    errorBox.textContent = "Password must be at least 6 characters.";
    errorBox.classList.remove("hidden");
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        requested_role: requestedRole
      }
    }
  });

  if (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
    return;
  }

  const roleLabels = {
    patient: "Patient",
    doctor: "Doctor",
    clinic: "Clinic",
    admin: "Administrator"
  };

  if (requestedRole === "patient") {
    alert("Patient account created successfully! You can now sign in.");
  } else {
    alert(
      `${roleLabels[requestedRole]} account request submitted. ` +
      `Your account will remain restricted until approved.`
    );
  }

  showLogin();
}

async function logout() {
  await supabaseClient.auth.signOut();

  currentUser = null;
  role = "patient";

  document.getElementById("app").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
}

function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("open");
}

function icon(p) {
  return {
    overview:"◈", reports:"▣", history:"◷", privacy:"⌁",
    patients:"♙", review:"✦", knowledge:"◎", messages:"✉",
    access:"◌", team:"♧", users:"♧", verification:"✓",
    sources:"◎", rules:"◇", audit:"≡"
  }[p] || "•";
}

function buildNav() {
  document.getElementById("nav").innerHTML = roles[role].nav.map(x =>
    `<button class="nav-btn ${x[0]===page?"active":""}" onclick="render('${x[0]}')">${icon(x[0])} &nbsp;${x[1]}</button>`
  ).join("");
}

function render(p) {

  page = p;

  buildNav();

  const current = roles[role].nav.find(x => x[0] === p);

  document.getElementById("pageTitle").textContent =
    current ? current[1] : "Overview";

  document.getElementById("content").innerHTML =
    (views[role] && views[role][p]) || views[role].overview;

  document.querySelector(".sidebar").classList.remove("open");

  window.scrollTo({top:0, behavior:"smooth"});

  if (role === "admin" && p === "verification") {
  loadVerificationQueue();
}

if (role === "doctor" && p === "reports") {
  loadDoctorReports();
}

if (role === "doctor" && p === "patients") {
  loadDoctorPatients();
}

if (role === "doctor" && p === "overview") {
  loadDoctorOverviewStats();
  loadDoctorOverviewPatients();
}

if (role === "doctor" && p === "review") {
  loadDoctorReview();
}

}

function finding(title, meta, status="ok", label=null) {
  const labels = {ok:"Within range", attention:"Review", critical:"Priority", neutral:"Recorded"};
  return `<div class="finding"><div><strong>${title}</strong><small>${meta}</small></div><span class="badge ${status}">${label || labels[status]}</span></div>`;
}

function event(date, title, text) {
  return `<div class="event"><span class="dot"></span><div class="date">${date}</div><b>${title}</b><p>${text}</p></div>`;
}

function timeline(extra="") {
  return `<div class="timeline">
    ${event("18 AUG 2026","CBC + vitamin panel uploaded","2 findings marked for review.")}
    ${event("04 JUL 2026","Routine check-up","Vitals recorded.")}
    ${event("12 MAR 2026","Thyroid panel","No flagged findings.")}
    ${extra}
  </div>`;
}

function demoToast(message) {
  const old = document.getElementById("demoToast");
  if (old) old.remove();
  const el = document.createElement("div");
  el.id = "demoToast";
  el.textContent = message;
  el.style.cssText = "position:fixed;right:24px;bottom:24px;background:#123b35;color:white;padding:13px 16px;border-radius:10px;font-size:12px;z-index:99;box-shadow:0 10px 30px #0002";
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2600);
}

/* ---------- PATIENT ---------- */
const patientOverview = `
<div class="page-intro"><div><div class="eyebrow">PERSONAL HEALTH</div><h1>Good morning.</h1><p>Your health record, organized in one place.</p></div><button class="btn accent" onclick="render('reports')">＋ Upload report</button></div>
<div class="grid stats">
  <div class="stat">
    <div class="label">TOTAL REPORTS</div>
    <div class="num" id="patientReportCount">—</div>
    <div class="trend">Your uploaded reports</div>
  </div>

  <div class="stat">
    <div class="label">TIMELINE EVENTS</div>
    <div class="num" id="patientTimelineCount">—</div>
    <div class="trend">Health record activity</div>
  </div>

  <div class="stat">
    <div class="label">FLAGGED FINDINGS</div>
    <div class="num" id="patientFlaggedCount">—</div>
    <div class="trend" style="color:#b98225">Needs review</div>
  </div>

  <div class="stat">
    <div class="label">LAST UPDATED</div>
    <div class="num" id="patientLastUpdated" style="font-size:21px">—</div>
    <div class="trend" id="patientLastUpdatedYear"></div>
  </div>
</div>
<br>
<div class="grid cards">
  <div class="card"><div class="card-head"><h4>Recent findings</h4><span class="link" onclick="render('history')">View history →</span></div>
    <div id="patientRecentFindings">
  <p style="color:#777">Loading findings...</p>
</div>
  </div>
  <div class="card"><div class="card-head"><h4>Health timeline</h4><span class="link" onclick="render('history')">Full view →</span></div>${timeline()}</div>
</div>
<div class="notice" style="margin-top:16px"><b>Human-in-the-loop:</b> HealthSync organizes documented findings and provides explainable information. Clinical decisions remain with qualified professionals.</div>`;

const patientReports = `
<div class="page-intro">
  <div>
    <div class="eyebrow">DOCUMENTS</div>
    <h1>My reports</h1>
    <p>Upload medical reports for AI-assisted clinical review.</p>
  </div>
  <button class="btn accent" onclick="document.getElementById('reportFileInput').click()">
    ＋ Upload report
  </button>
</div>

<div class="card">
  <input
    type="file"
    id="reportFileInput"
    accept=".pdf,.jpg,.jpeg,.png"
    style="display:none"
    onchange="uploadMedicalReport(this)"
  >

  <div
    class="upload"
    onclick="document.getElementById('reportFileInput').click()"
  >
    <div class="big">↑</div>
    <b>Upload a medical report</b>
    <p>PDF, JPG or PNG • Synthetic demo reports only</p>
  </div>

  <div id="uploadStatus" class="notice hidden" style="margin-top:16px;"></div>

  <br>
`;

const patientHistory = `
<div class="page-intro"><div><div class="eyebrow">CHRONOLOGY</div><h1>My history</h1><p>A chronological view of documented reports and findings.</p></div></div>
<div class="grid cards">
  <div class="card">${timeline(event("09 NOV 2025","General blood panel","All extracted values stored with report provenance."))}${event("21 SEP 2025","Routine consultation","Clinical note available in source report.")}</div>
  <div class="card"><div class="card-head"><h4>Trend comparison</h4><span class="badge neutral">Demo</span></div>
    <div class="notice">Repeated measurements can be compared after extraction. The rule engine flags documented changes; it does not diagnose.</div><br>
    <div id="patientRecentFindings">
  <p style="color:#777">Loading findings...</p>
</div>
  </div>
</div>`;

const patientPrivacy = `
<div class="page-intro"><div><div class="eyebrow">DATA & CONTROL</div><h1>Privacy center</h1><p>Designed around data minimisation, access control and transparency.</p></div></div>
<div class="section-grid">
  <div class="card"><h4>How your data is handled</h4>
    <div class="source"><div class="source-name"><b>Role-based access</b><small>Only your account and authorized care relationships.</small></div><span class="badge ok">Enabled</span></div>
    <div class="source"><div class="source-name"><b>Audit trail</b><small>Sensitive access can be recorded.</small></div><span class="badge ok">Enabled</span></div>
    <div class="source"><div class="source-name"><b>Data retention</b><small>Configured by deployment policy.</small></div><span class="badge neutral">Policy</span></div>
    <div class="source"><div class="source-name"><b>Export / deletion</b><small>Production rights workflow.</small></div><span class="badge neutral">Planned</span></div>
  </div>
  <div class="card"><h4>Security principles</h4>
    <p class="check">✓ Encrypted transport and storage</p><p class="check">✓ Server-side authorization</p><p class="check">✓ Least-privilege access</p><p class="check">✓ Source and model provenance</p>
    <div class="notice danger-box">Prototype only — this interface is not a compliance certification.</div>
  </div>
</div>`;

const patientReport = `
<div class="page-intro"><div><div class="eyebrow">REPORT DETAILS</div><h1>CBC + Vitamin Panel</h1><p>18 Aug 2026 • Synthetic diagnostic laboratory</p></div><span class="badge attention">Review findings</span></div>
<div class="section-grid">
  <div class="card"><h4>Extracted findings</h4>
    ${finding("Hemoglobin","10.2 g/dL • reference interval from source report","attention","Below reference")}
    ${finding("Vitamin D","22 ng/mL • reference interval from source report","attention","Below reference")}
    ${finding("WBC","7.4 ×10⁹/L • reference interval from source report","ok")}
    ${finding("Platelets","258 ×10⁹/L • reference interval from source report","ok")}
  </div>
  <div class="card"><div class="eyebrow">EXPLAINABLE ANALYSIS</div><h4 style="margin-top:7px">What HealthSync found</h4>
    <p class="muted">Two values were flagged against the reference intervals printed on this synthetic report.</p>
    <div class="rule"><div class="rule-top"><b>FLAG_BELOW_REFERENCE</b><span class="badge attention">Triggered</span></div><p class="muted">Deterministic rule based on report-provided reference interval.</p><code>source: report-2026-0818</code></div>
    <div class="notice">Supportive information only — not a diagnosis or prescription.</div>
  </div>
</div>`;

/* ---------- DOCTOR ---------- */
const doctorOverview = `
<div class="page-intro"><div><div class="eyebrow">CLINICAL WORKSPACE</div><h1>Welcome back, Dr. Demo.</h1><p>Here’s what needs your attention today.</p></div></div>
<div class="grid stats">
  <div class="stat">
    <div class="label">PATIENTS</div>
    <div class="num" id="doctorPatientCount">—</div>
    <div class="trend">HealthSync accounts</div>
  </div>

  <div class="stat">
    <div class="label">PENDING REVIEWS</div>
    <div class="num" id="doctorPendingCount">—</div>
    <div class="trend" style="color:#b98225">Needs attention</div>
  </div>

  <div class="stat">
    <div class="label">PRIORITY FLAGS</div>
    <div class="num" id="doctorPriorityCount">—</div>
    <div class="trend" style="color:#c84f50">Review</div>
  </div>

  <div class="stat">
    <div class="label">NEW REPORTS</div>
    <div class="num" id="doctorNewReportCount">—</div>
    <div class="trend">This week</div>
  </div>
</div>
<div class="grid cards">
  <div class="card">
  <div class="card-head">
    <h4>Patients needing review</h4>
    <span class="link" onclick="render('patients')">
      View patients →
    </span>
  </div>

  <div id="doctorOverviewPatients">
    <p class="muted">Loading patients...</p>
  </div>
</div>
  <div class="card"><h4>Clinical guardrails</h4>
    <div class="notice">AI and rule-engine outputs are assistive. A licensed professional validates extracted values, context and any clinical interpretation.</div>
    <br>${finding("Authorization","Patient-care relationship checked server-side","ok")}${finding("Audit logging","Sensitive actions recorded","ok")}
  </div>
</div>`;

const doctorPatients = `
<div class="page-intro">
  <div>
    <div class="eyebrow">PATIENT DIRECTORY</div>
    <h1>Patients</h1>
    <p>Patients with HealthSync accounts.</p>
  </div>
</div>

<div class="table-wrap">
  <table class="table">
    <tr>
      <th>Patient</th>
      <th>Latest report</th>
      <th>Findings</th>
      <th>Status</th>
    </tr>

    <tbody id="doctorPatientsBody">
      <tr>
        <td colspan="4">Loading patients...</td>
      </tr>
    </tbody>
  </table>
</div>
`;

const doctorReports = `
<div class="page-intro">
  <div>
    <div class="eyebrow">REPORT QUEUE</div>
    <h1>Reports</h1>
    <p>Reports belonging to your authorized patients.</p>
  </div>
</div>

<div class="table-wrap">
  <table class="table">
    <tr>
      <th>Report</th>
      <th>Patient</th>
      <th>Date</th>
      <th>Status</th>
      <th></th>
    </tr>

    <tbody id="doctorReportsBody">
      <tr>
        <td colspan="5">Loading reports...</td>
      </tr>
    </tbody>
  </table>
</div>
`;

const doctorReview = `
<div class="page-intro">
  <div>
    <div class="eyebrow">HUMAN REVIEW</div>
    <h1>Clinical review</h1>
    <p>Inspect extracted findings before they enter a clinical workflow.</p>
  </div>
  <button class="btn accent" onclick="demoToast('Review marked complete in demo mode.')">
    Mark reviewed
  </button>
</div>

<div id="doctorReviewContent">
  <div class="card">
    <p>Loading report...</p>
  </div>
</div>
`;

const doctorKnowledge = `
<div class="page-intro"><div><div class="eyebrow">EVIDENCE LAYER</div><h1>Medical knowledge</h1><p>Approved evidence sources available to the clinical workspace.</p></div></div>
<div class="card">
${["PubMed / NCBI|Biomedical literature • official API target","World Health Organization|Global health information","CDC|Disease control & prevention","NICE|Clinical guidance"].map(x=>{const a=x.split("|");return `<div class="source"><div class="source-name"><b>${a[0]}</b><small>${a[1]}</small></div><span class="badge ok">Approved</span></div>`}).join("")}
<div class="notice" style="margin-top:15px">Source approval, provenance, licensing and update schedules should be controlled by administrators before production retrieval/RAG.</div>
</div>`;

const doctorMessages = `
<div class="page-intro"><div><div class="eyebrow">COMMUNICATION</div><h1>Patient messages</h1><p>Prototype communication inbox.</p></div></div>
<div class="card">
${finding("Ayesha Khan","Question about recent report • 10:42 AM","attention","Unread")}
${finding("Muhammad Ali","Appointment follow-up • Yesterday","neutral","Read")}
${finding("Sara Ahmed","Report clarification • 2 days ago","neutral","Read")}
</div>`;

/* ---------- CLINIC ---------- */
const clinicOverview = `
<div class="page-intro"><div><div class="eyebrow">CLINIC WORKSPACE</div><h1>Clinic overview</h1><p>Manage authorized records and monitor access.</p></div></div>
<div class="grid stats">
  <div class="stat"><div class="label">AUTHORIZED PATIENTS</div><div class="num">146</div><div class="trend">Active</div></div>
  <div class="stat"><div class="label">REPORTS</div><div class="num">624</div><div class="trend">All time</div></div>
  <div class="stat"><div class="label">PENDING REVIEWS</div><div class="num">19</div><div class="trend" style="color:#b98225">Attention</div></div>
  <div class="stat"><div class="label">ACCESS EVENTS</div><div class="num">1,284</div><div class="trend">Logged</div></div>
</div><br>
<div class="grid cards">
  <div class="card"><div class="card-head"><h4>Recent clinic activity</h4><span class="link" onclick="render('access')">View access log →</span></div>
    ${finding("HS-1042","New CBC uploaded • 18 Aug","ok","New")}
    ${finding("HS-1038","Report review requested • 17 Aug","attention","Review")}
    ${finding("HS-1021","Timeline accessed by Dr. Demo • 15 Aug","neutral","Logged")}
  </div>
  <div class="card"><h4>Access boundary</h4><div class="notice">Clinic staff can access only records authorized for this clinic. Patient-level permissions must be enforced server-side/database-side.</div></div>
</div>`;

const clinicPatients = `
<div class="page-intro"><div><div class="eyebrow">CLINIC DIRECTORY</div><h1>Patients</h1><p>Patients authorized for this clinic.</p></div><button class="btn accent" onclick="demoToast('Demo patient registration workflow.')">＋ Register patient</button></div>
<div class="table-wrap"><table class="table"><tr><th>Patient</th><th>Reports</th><th>Last activity</th><th>Findings</th><th></th></tr>
<tr><td><b>Ayesha Khan</b><small>HS-1042</small></td><td>12</td><td>18 Aug</td><td><span class="badge attention">3</span></td><td class="link">Open →</td></tr>
<tr><td><b>Imran Sheikh</b><small>HS-1038</small></td><td>5</td><td>17 Aug</td><td><span class="badge ok">0</span></td><td class="link">Open →</td></tr>
<tr><td><b>Fatima Noor</b><small>HS-1021</small></td><td>3</td><td>15 Aug</td><td><span class="badge attention">1</span></td><td class="link">Open →</td></tr>
</table></div>`;

const clinicReports = `
<div class="page-intro"><div><div class="eyebrow">CLINIC REPORTS</div><h1>Reports</h1><p>Centralized report status for authorized records.</p></div></div>
<div class="table-wrap"><table class="table"><tr><th>Patient</th><th>Report</th><th>Date</th><th>Status</th><th>Reviewer</th></tr>
<tr><td><b>Ayesha Khan</b></td><td>CBC + Vitamin Panel</td><td>18 Aug</td><td><span class="badge attention">Review</span></td><td>Pending</td></tr>
<tr><td><b>Imran Sheikh</b></td><td>X-Ray</td><td>17 Aug</td><td><span class="badge ok">Normal</span></td><td>Dr. Demo</td></tr>
<tr><td><b>Fatima Noor</b></td><td>MRI</td><td>15 Aug</td><td><span class="badge attention">Review</span></td><td>Pending</td></tr>
</table></div>`;

const clinicAccess = `
<div class="page-intro"><div><div class="eyebrow">SECURITY</div><h1>Access log</h1><p>Audit-ready record of sensitive actions.</p></div></div>
<div class="table-wrap"><table class="table"><tr><th>Time</th><th>Actor</th><th>Action</th><th>Patient</th><th>Result</th></tr>
<tr><td>18 Aug 10:42</td><td>Dr. Demo</td><td>Viewed report</td><td>HS-1042</td><td><span class="badge ok">Allowed</span></td></tr>
<tr><td>18 Aug 10:21</td><td>Clinic User 02</td><td>Downloaded report</td><td>HS-1038</td><td><span class="badge ok">Allowed</span></td></tr>
<tr><td>17 Aug 16:05</td><td>Dr. Demo</td><td>Viewed timeline</td><td>HS-1021</td><td><span class="badge ok">Allowed</span></td></tr>
<tr><td>17 Aug 12:14</td><td>Clinic User 01</td><td>Opened patient record</td><td>HS-1042</td><td><span class="badge ok">Allowed</span></td></tr>
</table></div>`;

const clinicTeam = `
<div class="page-intro"><div><div class="eyebrow">CLINIC TEAM</div><h1>Clinic team</h1><p>Authorized staff and clinicians.</p></div><button class="btn accent" onclick="demoToast('Demo invitation workflow.')">＋ Invite member</button></div>
<div class="card">
${finding("Dr. Demo","Licensed Doctor • Cardiology • Verified","ok","Active")}
${finding("Dr. Sara Joseph","Licensed Doctor • General Medicine • Verified","ok","Active")}
${finding("Clinic User 03","Records Coordinator • Role-scoped","neutral","Staff")}
</div>`;

/* ---------- ADMIN ---------- */
const adminOverview = `
<div class="page-intro"><div><div class="eyebrow">SYSTEM CONTROL</div><h1>Administrator console</h1><p>Manage roles, trusted sources, rules and audit visibility.</p></div></div>
<div class="grid stats">
  <div class="stat"><div class="label">USERS</div><div class="num">183</div><div class="trend">4 roles</div></div>
  <div class="stat"><div class="label">SOURCE REGISTRY</div><div class="num">7</div><div class="trend">6 approved</div></div>
  <div class="stat"><div class="label">ACTIVE RULES</div><div class="num">18</div><div class="trend">v0.1 demo</div></div>
  <div class="stat"><div class="label">AUDIT EVENTS</div><div class="num">4,821</div><div class="trend">This month</div></div>
</div><br>
<div class="grid cards">
  <div class="card"><div class="card-head"><h4>System health</h4></div>
    ${finding("Authentication","Role-based demo access","ok","Ready")}
    ${finding("Rule engine","18 active / version 0.1","ok","Active")}
    ${finding("Source registry","1 source needs review","attention","Review")}
    ${finding("Audit logging","Operational","ok","Active")}
  </div>
  <div class="card"><h4>Architecture guardrails</h4><p class="muted">Keep deterministic rules separate from AI. Keep secrets server-side. Require authorization checks before returning patient data.</p><div class="notice">Prototype → FastAPI → Supabase → Rule Engine → Trusted Sources → AI/RAG later</div></div>
</div>`;

const adminUsers = `
<div class="page-intro"><div><div class="eyebrow">IDENTITY & ACCESS</div><h1>Users & roles</h1><p>Role assignment and account status.</p></div><button class="btn accent" onclick="demoToast('Demo add-user workflow.')">＋ Add user</button></div>
<div class="table-wrap"><table class="table"><tr><th>User</th><th>Role</th><th>Verification</th><th>Status</th><th>Action</th></tr>
<tr><td><b>Dr. Demo</b></td><td>Licensed Doctor</td><td><span class="badge ok">Verified</span></td><td>Active</td><td>Edit</td></tr>
<tr><td><b>Sunrise Clinic</b></td><td>Authorized Clinic</td><td><span class="badge ok">Verified</span></td><td>Active</td><td>Edit</td></tr>
<tr><td><b>Patient Demo</b></td><td>Patient</td><td><span class="badge neutral">N/A</span></td><td>Active</td><td>Edit</td></tr>
</table></div>`;

const adminVerification = `
<div class="page-intro">
  <div>
    <div class="eyebrow">CREDENTIALS</div>
    <h1>Doctor Verification</h1>
    <p>Review pending Doctor registration requests.</p>
  </div>
</div>

<div id="verificationQueue">
  <div class="card">
    <p class="muted">Loading requests...</p>
  </div>
</div>
`;

const adminSources = `
<div class="page-intro"><div><div class="eyebrow">EVIDENCE LAYER</div><h1>Trusted source registry</h1><p>Only approved, versioned sources should feed evidence retrieval.</p></div><button class="btn accent" onclick="demoToast('Demo source-registration workflow.')">＋ Add source</button></div>
<div class="card">
${["PubMed / NCBI|Biomedical literature • official API target|ok|Approved","CDC|Disease control & prevention|ok|Approved","World Health Organization|Global health information|ok|Approved","NICE|Clinical guidance|ok|Approved","Demo source|Pending administrator review|attention|Review"].map(x=>{const a=x.split("|");return `<div class="source"><div class="source-name"><b>${a[0]}</b><small>${a[1]}</small></div><span class="badge ${a[2]}">${a[3]}</span></div>`}).join("")}
</div>
<div class="notice" style="margin-top:16px">Sources should be approved, versioned, provenance-tracked and checked for licensing/API terms before production use.</div>`;

const adminRules = `
<div class="page-intro"><div><div class="eyebrow">DETERMINISTIC LOGIC</div><h1>System rules</h1><p>Rules flag documented patterns; they do not diagnose or prescribe.</p></div><button class="btn accent" onclick="demoToast('Demo new-rule workflow.')">＋ New rule</button></div>
<div class="card">
${[
["Reference range","value < report_min OR value > report_max","FLAG_REFERENCE_RANGE"],
["Missing required value","required_field == null","FLAG_MISSING"],
["Trend change","abs(latest-previous) > configured_threshold","FLAG_TREND_CHANGE"],
["Duplicate report","hash == existing_hash","FLAG_DUPLICATE"]
].map(x=>`<div class="rule"><div class="rule-top"><b>${x[0]}</b><span class="switch"></span></div><p class="muted">${x[1]}</p><code>${x[2]}</code></div>`).join("")}
</div><br><div class="notice">Medical reference ranges and thresholds must be sourced, versioned and reviewed. Prefer the reference interval printed on the source report.</div>`;

const adminAudit = `
<div class="page-intro"><div><div class="eyebrow">TRACEABILITY</div><h1>Audit log</h1><p>Record who accessed what, when, and what system action occurred.</p></div></div>
<div class="table-wrap"><table class="table"><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Object</th><th>Outcome</th></tr>
<tr><td>18 Aug 10:42</td><td>Dr. Demo</td><td>VIEW_REPORT</td><td>HS-1042</td><td><span class="badge ok">Allowed</span></td></tr>
<tr><td>18 Aug 10:21</td><td>Clinic Demo</td><td>DOWNLOAD</td><td>HS-1038</td><td><span class="badge ok">Allowed</span></td></tr>
<tr><td>18 Aug 09:51</td><td>System</td><td>RULE_EVALUATION</td><td>Report-882</td><td><span class="badge ok">Completed</span></td></tr>
<tr><td>17 Aug 16:05</td><td>Admin</td><td>SOURCE_UPDATE</td><td>PubMed/NCBI</td><td><span class="badge ok">Allowed</span></td></tr>
<tr><td>17 Aug 12:14</td><td>Patient Demo</td><td>VIEW_HISTORY</td><td>Self</td><td><span class="badge ok">Allowed</span></td></tr>
</table></div>`;

const views = {
  patient: {overview:patientOverview,reports:patientReports,history:patientHistory,privacy:patientPrivacy,report:patientReport},
  doctor: {overview:doctorOverview,patients:doctorPatients,reports:doctorReports,review:doctorReview,knowledge:doctorKnowledge,messages:doctorMessages},
  clinic: {overview:clinicOverview,patients:clinicPatients,reports:clinicReports,access:clinicAccess,team:clinicTeam},
  admin: {overview:adminOverview,users:adminUsers,verification:adminVerification,sources:adminSources,rules:adminRules,audit:adminAudit}
};

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("roleSelect");
  if (select) select.value = "patient";
});

async function restoreSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    return;
  }

  currentUser = data.session.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("full_name, role")
    .eq("id", currentUser.id)
    .single();

  if (profileError) {
    console.error("Could not load profile:", profileError);
    await supabaseClient.auth.signOut();
    return;
  }

  role = profile.role.toLowerCase();

  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  document.getElementById("sideRole").textContent = roles[role].label;
  document.getElementById("avatar").textContent = roles[role].initial;
  document.getElementById("userLabel").textContent =
    profile.full_name || roles[role].label;

  render("overview");

if (role === "patient") {

  console.log("PATIENT RENDER BLOCK RUNNING");

  loadPatientOverviewStats();
  loadPatientData();
  loadPatientReports();
  loadPatientRecentFindings();

 }
}

restoreSession();

async function loadPatientData() {
  if (!currentUser || role !== "patient") return;

  const { data: patient, error } = await supabaseClient
    .from("patients")
    .select("date_of_birth, phone")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Could not load patient data:", error);
    return;
  }

  console.log("Patient data loaded:", patient);

  const patientCard = document.createElement("div");

  patientCard.className = "card";
  patientCard.style.marginBottom = "20px";

  patientCard.innerHTML = `
    <div class="card-title">My Patient Information</div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; margin-top:16px;">
      
      <div>
        <div class="muted">Date of Birth</div>
        <strong>${patient.date_of_birth || "Not provided"}</strong>
      </div>

      <div>
        <div class="muted">Phone</div>
        <strong>${patient.phone || "Not provided"}</strong>
      </div>

    </div>
  `;

  const content = document.getElementById("content");

  if (content) {
    content.prepend(patientCard);
  }
}

async function uploadMedicalReport(input) {
  if (!currentUser || role !== "patient") {
    alert("Please log in as a patient.");
    return;
  }

  const file = input.files[0];

  if (!file) return;

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png"
  ];

  if (!allowedTypes.includes(file.type)) {
    alert("Please upload a PDF, JPG, or PNG file.");
    input.value = "";
    return;
  }

  // 10 MB limit for the prototype
  if (file.size > 10 * 1024 * 1024) {
    alert("File must be smaller than 10 MB.");
    input.value = "";
    return;
  }

  const statusBox = document.getElementById("uploadStatus");

  if (statusBox) {
    statusBox.textContent = "Uploading report...";
    statusBox.classList.remove("hidden");
  }

  try {
    const fileExtension = file.name.split(".").pop().toLowerCase();

    const safeFileName =
      `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    // Patient-specific folder
    const filePath = `${currentUser.id}/${safeFileName}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from("healthsync-reports")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Create the report database record
    const { error: reportError } = await supabaseClient
      .from("reports")
      .insert({
        patient_id: currentUser.id,
        uploaded_by: currentUser.id,
        report_type: file.type === "application/pdf"
          ? "Medical Report"
          : "Medical Image",
        file_path: filePath,
        report_date: new Date().toISOString().split("T")[0],
        status: "UPLOADED"
      });

    if (reportError) {
      // If DB insert fails, remove the uploaded file
      await supabaseClient
        .storage
        .from("healthsync-reports")
        .remove([filePath]);
        

      throw reportError;
    }

    // Start AI + rule-engine processing
if (statusBox) {
  statusBox.textContent = "Report uploaded. Starting AI analysis...";
}

const { data: createdReport, error: fetchReportError } = await supabaseClient
  .from("reports")
  .select("id")
  .eq("patient_id", currentUser.id)
  .eq("file_path", filePath)
  .single();

if (fetchReportError) {
  throw fetchReportError;
}

if (statusBox) {
  statusBox.textContent = "⏳ Report uploaded. Processing...";
  statusBox.classList.remove("hidden");
}

const processResponse = await fetch(
  "http://127.0.0.1:5000/process-report",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      report_id: createdReport.id
    })
  }
);

const processResult = await processResponse.json();

if (!processResponse.ok || !processResult.success) {
  throw new Error(
    processResult.error || "Report processing failed."
  );
}

if (statusBox) {
  statusBox.textContent =
    "✓ Report uploaded and processed successfully.";
  statusBox.classList.remove("hidden");
}

await loadPatientReports();

    if (statusBox) {
      statusBox.textContent =
        "✓ Report uploaded successfully.";
      statusBox.classList.remove("hidden");
    }

    input.value = "";

    // Refresh the report list
    await loadPatientReports();

  } catch (error) {
    console.error("Report upload failed:", error);

    if (statusBox) {
      statusBox.textContent =
        "Upload failed: " + (error.message || "Unknown error");
      statusBox.classList.remove("hidden");
    }
  }
}

async function viewMedicalReport(filePath) {
  if (!filePath) {
    alert("Report file is missing.");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .storage
      .from("healthsync-reports")
      .createSignedUrl(filePath, 60 * 10);

    if (error) {
      console.error("Could not create report URL:", error);
      alert("Could not open the report: " + error.message);
      return;
    }

    if (!data || !data.signedUrl) {
      alert("Could not generate a report URL.");
      return;
    }

    window.open(data.signedUrl, "_blank");

  } catch (error) {
    console.error("View report failed:", error);
    alert("Could not open the report.");
  }
}

async function loadPatientReports() {
  if (!currentUser || role !== "patient") return;

  const { data: reports, error } = await supabaseClient
    .from("reports")
    .select("id, report_type, report_date, status, file_path, created_at")
    .eq("patient_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
  console.error("Could not load reports:", error);

  const content = document.getElementById("content");

  if (content) {
    content.insertAdjacentHTML(
      "afterbegin",
      `
      <div class="notice" style="margin-top:20px;">
        Could not load your reports. Please try again.
      </div>
      `
    );
  }

  return;
}

  console.log("Patient reports loaded:", reports);

  const content = document.getElementById("content");
  if (!content) return;

  const reportCard = document.createElement("div");
  reportCard.className = "card";
  reportCard.style.marginTop = "20px";

  reportCard.innerHTML = `
    <div class="card-title">My Reports</div>

    <div style="margin-top:16px;">
      ${
        reports && reports.length
          ? reports.map(report => `
              <div style="
                padding:16px 0;
                border-bottom:1px solid #eee;
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:20px;
              ">
                <div>
                  <strong>${report.report_type || "Medical Report"}</strong>

                  <div class="muted" style="margin-top:5px;">
                    ${report.report_date || "Date not provided"}
                    · ${report.status || "Unknown status"}
                  </div>
                </div>

                <button
                  class="btn"
                  onclick="viewMedicalReport('${report.file_path}')"
                >
                  View
                </button>
              </div>
            `).join("")
          : `<div class="muted">No reports available yet.</div>`
      }
    </div>
  `;

  content.prepend(reportCard);
}

async function loadPatientOverviewStats() {
  try {
    const { data: reports, error: reportsError } = await supabaseClient
      .from("reports")
      .select("id, created_at, status")
      .eq("patient_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (reportsError) throw reportsError;

    const reportList = reports || [];

    const reportCount = reportList.length;

    const { count: flaggedCount, error: flaggedError } =
      await supabaseClient
        .from("report_findings")
        .select("id", { count: "exact", head: true })
        .in("status", ["HIGH", "LOW"])
        .in(
          "report_id",
          reportList.map(report => report.id)
        );

    if (flaggedError) throw flaggedError;

    const latestReport = reportList[0];

    const reportBox = document.getElementById("patientReportCount");
    const timelineBox = document.getElementById("patientTimelineCount");
    const flaggedBox = document.getElementById("patientFlaggedCount");
    const dateBox = document.getElementById("patientLastUpdated");
    const yearBox = document.getElementById("patientLastUpdatedYear");

    if (reportBox) {
      reportBox.textContent = reportCount;
    }

    if (timelineBox) {
      timelineBox.textContent = reportCount;
    }

    if (flaggedBox) {
      flaggedBox.textContent = flaggedCount ?? 0;
    }

    if (latestReport && dateBox && yearBox) {
      const date = new Date(latestReport.created_at);

      dateBox.textContent = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short"
      });

      yearBox.textContent = date.getFullYear();
    } else if (dateBox) {
      dateBox.textContent = "—";
    }
  } catch (error) {
    console.error("Failed to load patient overview stats:", error);
  }
}

async function loadPatientRecentFindings() {
  try {
    const { data: reports, error: reportsError } = await supabaseClient
      .from("reports")
      .select("id, report_type, report_date, created_at")
      .eq("patient_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (reportsError) throw reportsError;

    const reportList = reports || [];
    const container = document.getElementById("patientRecentFindings");

    if (!container) return;

    if (reportList.length === 0) {
      container.innerHTML = `
        <p style="color:#777">No findings available yet.</p>
      `;
      return;
    }

    const reportIds = reportList.map(report => report.id);

    const { data: findings, error: findingsError } =
      await supabaseClient
        .from("report_findings")
        .select(`
          test_name,
          value,
          unit,
          status,
          report_id
        `)
        .in("report_id", reportIds)
        .order("created_at", { ascending: false })
        .limit(4);

    if (findingsError) throw findingsError;

    const findingList = findings || [];

    if (findingList.length === 0) {
      container.innerHTML = `
        <p style="color:#777">No extracted findings available yet.</p>
      `;
      return;
    }

    container.innerHTML = findingList.map(item => {
      const report = reportList.find(
        report => report.id === item.report_id
      );

      const reportDate = report
        ? new Date(report.report_date || report.created_at)
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })
        : "";

      const statusClass =
        item.status === "NORMAL"
          ? "ok"
          : item.status === "HIGH" || item.status === "LOW"
            ? "attention"
            : "attention";

      const displayValue =
        item.value !== null && item.value !== undefined
          ? `${item.value} ${item.unit || ""}`.trim()
          : "Value not available";

      return finding(
        item.test_name,
        `${displayValue} • ${report?.report_type || "Medical report"} • ${reportDate}`,
        statusClass
      );
    }).join("");

  } catch (error) {
    console.error(
      "Failed to load patient recent findings:",
      error
    );
  }
}

async function loadDoctorReports() {
  const body = document.getElementById("doctorReportsBody");

  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="5">Loading reports...</td>
    </tr>
  `;

  try {
    const { data: reports, error } = await supabaseClient
      .from("reports")
      .select(`
        id,
        patient_id,
        report_type,
        report_date,
        status,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!reports || reports.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="5">No reports available.</td>
        </tr>
      `;
      return;
    }
    const { data: patients, error: patientsError } = await supabaseClient
      .from("profiles")
      .select("id, full_name")
      .eq("role", "PATIENT");

    if (patientsError) {
      throw patientsError;
    }

    const patientNames = {};

    (patients || []).forEach(patient => {
      patientNames[patient.id] = patient.full_name;
    });
    

    body.innerHTML = reports.map(report => {

      const statusClass =
        report.status === "PROCESSED"
          ? "ok"
          : report.status === "FAILED"
            ? "attention"
            : "neutral";

      const statusLabel =
        report.status === "PROCESSED"
          ? "Processed"
          : report.status;

      return `
        <tr>
          <td>
            <b>${report.report_type || "Medical Report"}</b>
            <small>${report.id}</small>
          </td>

          <td>
            ${patientNames[report.patient_id] || "Patient"}
          </td>

          <td>
            ${report.report_date || "-"}
          </td>

          <td>
            <span class="badge ${statusClass}">
              ${statusLabel}
            </span>
          </td>

          <td>
            <span
              class="link"
              onclick="openDoctorReport('${report.id}')"
            >
              Review →
            </span>
          </td>
        </tr>
      `;
    }).join("");

  } catch (error) {

    console.error("Failed to load doctor reports:", error);

    body.innerHTML = `
      <tr>
        <td colspan="5">
          Failed to load reports.
        </td>
      </tr>
    `;
  }
}

async function loadDoctorPatients() {

  const body = document.getElementById("doctorPatientsBody");

  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="4">Loading patients...</td>
    </tr>
  `;

  try {

    const { data: patients, error } = await supabaseClient
      .from("profiles")
      .select("id, full_name")
      .eq("role", "PATIENT")
      .order("full_name", { ascending: true });

    if (error) {
      throw error;
    }

    if (!patients || patients.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="4">No patient accounts found.</td>
        </tr>
      `;
      return;
    }

    const rows = await Promise.all(
      patients.map(async patient => {

        const { data: reports } = await supabaseClient
          .from("reports")
          .select("id, report_date, status")
          .eq("patient_id", patient.id)
          .order("created_at", { ascending: false });

        const latestReport = reports && reports.length
          ? reports[0]
          : null;

        let findingCount = 0;

        if (latestReport) {

          const { count } = await supabaseClient
            .from("report_findings")
            .select("id", { count: "exact", head: true })
            .eq("report_id", latestReport.id);

          findingCount = count || 0;
        }

        return `
          <tr>
            <td>
              <b>${patient.full_name || "Unnamed Patient"}</b>
              <small>${patient.id}</small>
            </td>

            <td>
              ${latestReport
                ? latestReport.report_date || "-"
                : "No reports"}
            </td>

            <td>
              <span class="badge ${
                findingCount > 0 ? "attention" : "ok"
              }">
                ${findingCount}
              </span>
            </td>

            <td>
              ${
                latestReport
                  ? `<span class="badge ${
                      latestReport.status === "PROCESSED"
                        ? "ok"
                        : "neutral"
                    }">${latestReport.status}</span>`
                  : `<span class="badge neutral">No reports</span>`
              }
            </td>
          </tr>
        `;

      })
    );

    body.innerHTML = rows.join("");

  } catch (error) {

    console.error("Failed to load doctor patients:", error);

    body.innerHTML = `
      <tr>
        <td colspan="4">
          Failed to load patients.
        </td>
      </tr>
    `;
  }
}
async function loadDoctorOverviewPatients() {
  const container = document.getElementById("doctorOverviewPatients");

  if (!container) return;

  try {
    const { data: patients, error } = await supabaseClient
      .from("profiles")
      .select("id, full_name")
      .eq("role", "PATIENT")
      .order("full_name", { ascending: true });

    if (error) throw error;

    if (!patients || patients.length === 0) {
      container.innerHTML = `
        <p class="muted">No patient accounts found.</p>
      `;
      return;
    }

    const rows = await Promise.all(
      patients.slice(0, 5).map(async patient => {

        const { data: reports } = await supabaseClient
          .from("reports")
          .select("id, report_type, report_date, status")
          .eq("patient_id", patient.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const latestReport = reports && reports.length
          ? reports[0]
          : null;

        let findingCount = 0;

        if (latestReport) {
          const { count } = await supabaseClient
            .from("report_findings")
            .select("id", {
              count: "exact",
              head: true
            })
            .eq("report_id", latestReport.id);

          findingCount = count || 0;
        }

        const statusClass =
          findingCount > 0 ? "attention" : "ok";

        const statusText =
          findingCount > 0 ? "Review" : "Clear";

        return `
          <div class="finding">
            <div>
              <b>${patient.full_name || "Unnamed Patient"}</b>
              <p class="muted">
                ${
                  latestReport
                    ? `${latestReport.report_type || "Medical Report"} • ${latestReport.report_date || "-"}`
                    : "No reports yet"
                }
              </p>
            </div>

            <span class="badge ${statusClass}">
              ${
                latestReport
                  ? `${findingCount} ${findingCount === 1 ? "finding" : "findings"}`
                  : "No reports"
              }
            </span>
          </div>
        `;
      })
    );

    container.innerHTML = rows.join("");

  } catch (error) {

    console.error(
      "Failed to load doctor overview patients:",
      error
    );

    container.innerHTML = `
      <p class="muted">
        Failed to load patients.
      </p>
    `;
  }
}

async function loadDoctorOverviewStats() {
  try {

    // Total patient accounts
    const { count: patientCount, error: patientError } =
      await supabaseClient
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq("role", "PATIENT");

    if (patientError) throw patientError;


    // Reports waiting for processing/review
    const { count: pendingCount, error: pendingError } =
      await supabaseClient
        .from("reports")
        .select("id", {
          count: "exact",
          head: true
        })
        .in("status", ["UPLOADED", "PROCESSING"]);

    if (pendingError) throw pendingError;


    // HIGH + LOW findings
    const { count: priorityCount, error: priorityError } =
      await supabaseClient
        .from("report_findings")
        .select("id", {
          count: "exact",
          head: true
        })
        .in("status", ["HIGH", "LOW"]);

    if (priorityError) throw priorityError;


    // Reports created in the last 7 days
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { count: newReportCount, error: newReportError } =
      await supabaseClient
        .from("reports")
        .select("id", {
          count: "exact",
          head: true
        })
        .gte("created_at", sevenDaysAgo);

    if (newReportError) throw newReportError;


    // Update dashboard
    const patientBox = document.getElementById("doctorPatientCount");
    const pendingBox = document.getElementById("doctorPendingCount");
    const priorityBox = document.getElementById("doctorPriorityCount");
    const newReportBox = document.getElementById("doctorNewReportCount");

    if (patientBox) {
      patientBox.textContent = patientCount ?? 0;
    }

    if (pendingBox) {
      pendingBox.textContent = pendingCount ?? 0;
    }

    if (priorityBox) {
      priorityBox.textContent = priorityCount ?? 0;
    }

    if (newReportBox) {
      newReportBox.textContent = newReportCount ?? 0;
    }

      } catch (error) {

        console.error(
          "Failed to load doctor overview stats:",
          error
        );
      }
    }

async function openDoctorReport(reportId) {

  console.log("Opening doctor report:", reportId);

  const { data: report, error: reportError } = await supabaseClient
    .from("reports")
    .select(`
      id,
      patient_id,
      report_type,
      report_date,
      status,
      file_path
    `)
    .eq("id", reportId)
    .single();

  if (reportError) {
    console.error("Failed to load report:", reportError);
    alert("Unable to load report.");
    return;
  }

  const { data: findings, error: findingsError } = await supabaseClient
    .from("report_findings")
    .select(`
      id,
      test_name,
      value,
      unit,
      reference_min,
      reference_max,
      status,
      rule_code
    `)
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (findingsError) {
    console.error("Failed to load report findings:", findingsError);
    alert("Unable to load report findings.");
    return;
  }

  window.currentDoctorReport = {
    report: report,
    findings: findings || []
  };

  render("review");
}

async function loadDoctorReview() {

  const container = document.getElementById("doctorReviewContent");

  if (!container) return;

  const current = window.currentDoctorReport;

  if (!current) {
    container.innerHTML = `
      <div class="card">
        <p>No report selected.</p>
      </div>
    `;
    return;
  }

  const report = current.report;
  const findings = current.findings || [];

  const findingRows = findings.length
    ? findings.map(item => {

        const statusClass =
          item.status === "HIGH" || item.status === "LOW"
            ? "attention"
            : "ok";

        return finding(
          item.test_name,
          `${item.value} ${item.unit || ""} • reference: ${
            item.reference_min ?? "-"
          }–${
            item.reference_max ?? "-"
          }`,
          statusClass,
          item.status
        );

      }).join("")
    : `<p class="muted">No findings were extracted for this report.</p>`;

  container.innerHTML = `
    <div class="section-grid">

      <div class="card">

        <h4>Report</h4>

        <p>
          <b>Report Type:</b>
          ${report.report_type || "Medical Report"}
        </p>

        <p>
          <b>Patient ID:</b>
          ${report.patient_id}
        </p>

        <p>
          <b>Report Date:</b>
          ${report.report_date || "-"}
        </p>

        <p>
          <b>Status:</b>
          <span class="badge ok">${report.status}</span>
        </p>

        <hr>

        <h4>Extracted findings</h4>

        ${findingRows}

      </div>

      <div class="card">

        <h4>Rule-engine output</h4>

        <div class="notice">
          Extracted findings were checked against the configured
          reference ranges. Clinician validation is required.
        </div>

        <br>

        ${
          findings.map(item => `
            <div class="rule">

              <div class="rule-top">
                <b>${item.test_name}</b>

                <span class="badge ${
                  item.status === "HIGH" || item.status === "LOW"
                    ? "attention"
                    : "ok"
                }">
                  ${item.status}
                </span>
              </div>

              <p class="muted">
                Value: ${item.value} ${item.unit || ""}
              </p>

              <code>
                ${item.rule_code || "REFERENCE_RANGE_CHECK"}
              </code>

            </div>
          `).join("")
        }

      </div>

    </div>
  `;
}

async function loadVerificationQueue() {
  if (!currentUser || role !== "admin") return;

  const container = document.getElementById("verificationQueue");
  if (!container) return;

  const { data, error } =
    await supabaseClient.rpc("get_pending_role_requests");

  if (error) {
    console.error("Could not load verification queue:", error);

    container.innerHTML = `
      <div class="card">
        <div class="notice danger-box">
          Could not load verification requests.
        </div>
      </div>
    `;

    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="card">
        <h4>No pending requests</h4>
        <p class="muted">There are currently no accounts waiting for approval.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="card">
      ${data.map(request => `
        <div class="source" style="padding:18px 0;">
          <div class="source-name">
            <b>${request.full_name || "Unnamed user"}</b>
            <small>
              Requested role:
              ${request.requested_role.toUpperCase()}
            </small>
          </div>

          <div style="display:flex;align-items:center;gap:10px;">
            <span class="badge attention">Pending</span>

            <button
              class="btn accent"
              onclick="approveRoleRequest('${request.id}')"
            >
              Approve
            </button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function approveRoleRequest(userId) {
  const { error } = await supabaseClient.rpc(
    "approve_role_request",
    {
      target_user_id: userId
    }
  );

  if (error) {
    console.error("Approval failed:", error);
    alert(error.message);
    return;
  }

  alert("Role request approved.");

  await loadVerificationQueue();
}
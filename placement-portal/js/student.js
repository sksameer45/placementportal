(function () {
  const session = requireRole('student');
  if (!session) return;

  const student = DB.students.byUserId(session.id);
  const STAGES = ['applied', 'shortlisted', 'test', 'interview', 'selected'];

  /* ---------- Nav / view switching ---------- */
  document.querySelectorAll('.nav-link, [data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const view = el.dataset.view;
      if (!view) return;
      document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
      document.getElementById('view-' + view).style.display = 'block';
      document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
      document.querySelectorAll(`.nav-link[data-view="${view}"]`).forEach(n => n.classList.add('active'));
    });
  });

  function companyName(cid) { const c = DB.companies.byId(cid); return c ? c.name : 'Unknown company'; }
  function driveOf(app) { return DB.drives.byId(app.drive_id); }

  /* ---------- Overview ---------- */
  function renderOverview() {
    document.getElementById('welcomeH1').textContent = `Welcome back, ${session.name.split(' ')[0]}`;
    document.getElementById('sideName').textContent = session.name;
    document.getElementById('sideRoll').textContent = student ? student.roll_no + ' · ' + student.branch : '';

    if (student) {
      document.getElementById('snapCgpa').textContent = student.cgpa.toFixed(2);
      document.getElementById('snapBranch').textContent = `${student.branch} · ${student.backlogs} backlog${student.backlogs === 1 ? '' : 's'}`;
    }

    const openDrives = DB.drives.all().filter(d => d.status === 'open');
    const eligibleOpen = student ? openDrives.filter(d => checkEligibility(student, d).eligible) : [];
    const myApps = student ? DB.applications.byStudent(student.id) : [];

    document.getElementById('stOpenDrives').textContent = eligibleOpen.length;
    document.getElementById('stApplied').textContent = myApps.length;
    document.getElementById('stSelected').textContent = myApps.filter(a => a.status === 'selected').length;
    document.getElementById('stPending').textContent = myApps.filter(a => !['selected', 'rejected'].includes(a.status)).length;

    const tbody = document.querySelector('#recentAppsTable tbody');
    tbody.innerHTML = '';
    const recent = [...myApps].sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at)).slice(0, 5);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="glyph">📭</div><p>No applications yet. Browse open drives to get started.</p></div></td></tr>`;
    }
    recent.forEach(a => {
      const d = driveOf(a);
      tbody.innerHTML += `<tr>
        <td class="cell-title">${d ? d.title : '—'}</td>
        <td>${d ? companyName(d.company_id) : '—'}</td>
        <td>${fmtDate(a.applied_at)}</td>
        <td><span class="badge badge-${a.status}">${statusLabel(a.status)}</span></td>
      </tr>`;
    });
  }

  /* ---------- Browse drives ---------- */
  function renderBrowse() {
    const grid = document.getElementById('driveGrid');
    grid.innerHTML = '';
    const drives = DB.drives.all().filter(d => d.status === 'open');
    if (drives.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="glyph">🗂️</div><p>No drives are open right now. Check back soon.</p></div>`;
      return;
    }
    const myApps = student ? DB.applications.byStudent(student.id) : [];

    drives.forEach(d => {
      const elig = student ? checkEligibility(student, d) : { eligible: false, reasons: ['Profile not found'] };
      const already = myApps.find(a => a.drive_id === d.id);
      grid.innerHTML += `
        <div class="drive-card">
          <div class="co">${companyName(d.company_id)}</div>
          <h4>${d.title}</h4>
          <div class="pkg">₹${d.package_lpa} LPA</div>
          <div class="meta-list">
            <span>Role: ${d.role}</span>
            <span>Eligible branches: ${d.eligible_branches}</span>
            <span>Min CGPA: ${d.min_cgpa} · Max backlogs: ${d.max_backlogs}</span>
            <span>Apply by: ${fmtDate(d.deadline)}</span>
          </div>
          <div class="foot-row">
            <span class="elig-flag ${elig.eligible ? 'yes' : 'no'}">${elig.eligible ? 'Eligible' : 'Not eligible'}</span>
            ${already
              ? `<span class="badge badge-${already.status}">${statusLabel(already.status)}</span>`
              : `<button class="btn btn-primary btn-sm" ${elig.eligible ? '' : 'disabled'} onclick="openApplyModal(${d.id})">Apply</button>`}
          </div>
        </div>`;
    });
  }

  /* ---------- Apply modal ---------- */
  window.openApplyModal = function (driveId) {
    const d = DB.drives.byId(driveId);
    const elig = checkEligibility(student, d);
    document.getElementById('applyModalTitle').textContent = `Apply — ${d.title}`;
    document.getElementById('applyModalBody').innerHTML = `
      <p><b>${companyName(d.company_id)}</b> · ${d.role} · ₹${d.package_lpa} LPA</p>
      <p class="text-soft">${d.description}</p>
      <p class="text-faint">Deadline: ${fmtDate(d.deadline)} · Drive date: ${fmtDate(d.drive_date)}</p>`;
    document.getElementById('applyModal').classList.add('show');
    document.getElementById('confirmApplyBtn').onclick = () => {
      DB.applications.insert({ drive_id: d.id, student_id: student.id, status: 'applied' });
      closeApplyModal();
      renderAll();
    };
  };
  window.closeApplyModal = function () { document.getElementById('applyModal').classList.remove('show'); };

  /* ---------- My applications ---------- */
  function renderApplications() {
    const wrap = document.getElementById('appsList');
    const myApps = student ? DB.applications.byStudent(student.id) : [];
    wrap.innerHTML = '';
    if (myApps.length === 0) {
      wrap.innerHTML = `<div class="panel"><div class="panel-body"><div class="empty-state"><div class="glyph">📭</div><p>You haven't applied to any drives yet.</p></div></div></div>`;
      return;
    }
    [...myApps].sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at)).forEach(a => {
      const d = driveOf(a);
      const rejected = a.status === 'rejected';
      const currentIdx = STAGES.indexOf(a.status);
      wrap.innerHTML += `
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>${d ? d.title : 'Drive removed'}</h3>
              <div class="text-faint">${d ? companyName(d.company_id) : ''} · Applied ${fmtDate(a.applied_at)}</div>
            </div>
            <span class="badge badge-${a.status}">${statusLabel(a.status)}</span>
          </div>
          <div class="panel-body">
            ${rejected
              ? `<div class="text-faint">This application was not carried forward. Keep an eye on new drives — better opportunities are posted regularly.</div>`
              : `<div class="stepper">
                  ${STAGES.map((s, i) => `
                    <div class="step ${i < currentIdx ? 'done' : ''} ${i === currentIdx ? 'current' : ''}">
                      <div class="line"></div>
                      <div class="circ">${i < currentIdx ? '✓' : i + 1}</div>
                      <div class="lbl">${statusLabel(s)}</div>
                    </div>`).join('')}
                </div>`}
          </div>
        </div>`;
    });
  }

  /* ---------- Profile ---------- */
  function renderProfile() {
    if (!student) return;
    document.getElementById('p_name').value = session.name;
    document.getElementById('p_roll').value = student.roll_no;
    document.getElementById('p_branch').value = student.branch;
    document.getElementById('p_cgpa').value = student.cgpa;
    document.getElementById('p_backlogs').value = student.backlogs;
    document.getElementById('p_phone').value = student.phone;
    document.getElementById('p_skills').value = student.skills || '';
    document.getElementById('p_resume').value = student.resume_link || '';
  }

  document.getElementById('profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    DB.students.update(student.id, {
      branch: document.getElementById('p_branch').value,
      cgpa: parseFloat(document.getElementById('p_cgpa').value),
      backlogs: parseInt(document.getElementById('p_backlogs').value, 10) || 0,
      phone: document.getElementById('p_phone').value.trim(),
      skills: document.getElementById('p_skills').value.trim(),
      resume_link: document.getElementById('p_resume').value.trim()
    });
    const saved = document.getElementById('profileSaved');
    saved.style.display = 'inline';
    setTimeout(() => saved.style.display = 'none', 2000);
    renderAll();
  });

  function renderAll() {
    renderOverview();
    renderBrowse();
    renderApplications();
    renderProfile();
  }

  renderAll();
})();

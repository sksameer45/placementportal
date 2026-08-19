(function () {
  const session = requireRole('company');
  if (!session) return;

  const company = DB.companies.byUserId(session.id);

  document.querySelectorAll('.nav-link, [data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (!el.dataset.view) return;
      e.preventDefault();
      const view = el.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
      document.getElementById('view-' + view).style.display = 'block';
      document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
      document.querySelectorAll(`.nav-link[data-view="${view}"]`).forEach(n => n.classList.add('active'));
    });
  });

  const STATUS_OPTIONS = ['applied', 'shortlisted', 'test', 'interview', 'selected', 'rejected'];

  function myDrives() { return company ? DB.drives.byCompany(company.id) : []; }
  function applicantsOfDrive(driveId) { return DB.applications.byDrive(driveId); }
  function studentName(sid) {
    const s = DB.students.byId(sid);
    if (!s) return 'Unknown';
    const u = DB.users.byId(s.user_id);
    return u ? u.name : 'Unknown';
  }

  /* ---------- Overview ---------- */
  function renderOverview() {
    document.getElementById('welcomeH1').textContent = `Welcome, ${company ? company.name : session.name}`;
    document.getElementById('sideName').textContent = company ? company.name : session.name;
    document.getElementById('sideStatus').innerHTML = company ? `<span class="badge badge-${company.status}">${statusLabel(company.status)}</span>` : '';

    const drives = myDrives();
    let totalApplicants = 0, selected = 0, inProgress = 0;
    drives.forEach(d => {
      const apps = applicantsOfDrive(d.id);
      totalApplicants += apps.length;
      selected += apps.filter(a => a.status === 'selected').length;
      inProgress += apps.filter(a => !['selected', 'rejected'].includes(a.status)).length;
    });

    document.getElementById('stDrives').textContent = drives.length;
    document.getElementById('stApplicants').textContent = totalApplicants;
    document.getElementById('stSelected').textContent = selected;
    document.getElementById('stInProgress').textContent = inProgress;

    const tbody = document.querySelector('#overviewDrivesTable tbody');
    tbody.innerHTML = '';
    if (drives.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="glyph">🗂️</div><p>You haven't posted any drives yet.</p></div></td></tr>`;
    }
    drives.forEach(d => {
      tbody.innerHTML += `<tr>
        <td class="cell-title">${d.title}</td>
        <td>${applicantsOfDrive(d.id).length}</td>
        <td>${fmtDate(d.deadline)}</td>
        <td><span class="badge badge-${d.status}">${statusLabel(d.status)}</span></td>
      </tr>`;
    });
  }

  /* ---------- Drives list ---------- */
  function renderDrives() {
    const wrap = document.getElementById('driveList');
    wrap.innerHTML = '';
    if (company && company.status !== 'approved') {
      wrap.innerHTML = `<div class="panel"><div class="panel-body"><div class="empty-state"><div class="glyph">⏳</div><p>Your company account is pending admin approval. You'll be able to post drives once approved.</p></div></div></div>`;
      return;
    }
    const drives = myDrives();
    if (drives.length === 0) {
      wrap.innerHTML = `<div class="panel"><div class="panel-body"><div class="empty-state"><div class="glyph">🗂️</div><p>No drives posted yet. Click "Post a drive" to get started.</p></div></div></div>`;
      return;
    }
    [...drives].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).forEach(d => {
      const apps = applicantsOfDrive(d.id);
      wrap.innerHTML += `
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>${d.title} <span class="text-faint">· ${d.role}</span></h3>
              <div class="text-faint">₹${d.package_lpa} LPA · ${d.eligible_branches} · Min CGPA ${d.min_cgpa}</div>
            </div>
            <span class="badge badge-${d.status}">${statusLabel(d.status)}</span>
          </div>
          <div class="panel-body">
            <p class="text-soft">${d.description || ''}</p>
            <div class="flex gap-12" style="flex-wrap:wrap; align-items:center;">
              <span class="text-faint">Deadline: ${fmtDate(d.deadline)} · Drive date: ${fmtDate(d.date_alias || d.drive_date)}</span>
              <span class="text-faint">· ${apps.length} applicant${apps.length === 1 ? '' : 's'}</span>
            </div>
            <div class="row-actions" style="margin-top:14px;">
              <button class="btn btn-ghost btn-sm" onclick="openDriveModal(${d.id})">Edit</button>
              ${d.status === 'open'
                ? `<button class="btn btn-danger btn-sm" onclick="toggleDriveStatus(${d.id},'closed')">Close drive</button>`
                : `<button class="btn btn-ghost btn-sm" onclick="toggleDriveStatus(${d.id},'open')">Reopen drive</button>`}
              <button class="btn btn-ghost btn-sm" onclick="jumpToApplicants(${d.id})">View applicants (${apps.length})</button>
            </div>
          </div>
        </div>`;
    });
  }

  window.toggleDriveStatus = function (id, status) {
    DB.drives.update(id, { status });
    renderAll();
  };

  window.jumpToApplicants = function (driveId) {
    document.querySelector('[data-view="applicants"]').click();
    document.getElementById('driveFilter').value = driveId;
    renderApplicants();
  };

  /* ---------- Drive modal ---------- */
  window.openDriveModal = function (driveId) {
    const form = document.getElementById('driveForm');
    form.reset();
    document.getElementById('d_id').value = '';
    document.getElementById('driveModalTitle').textContent = driveId ? 'Edit drive' : 'Post a new drive';
    if (driveId) {
      const d = DB.drives.byId(driveId);
      document.getElementById('d_id').value = d.id;
      document.getElementById('d_title').value = d.title;
      document.getElementById('d_role').value = d.role;
      document.getElementById('d_package').value = d.package_lpa;
      document.getElementById('d_mincgpa').value = d.min_cgpa;
      document.getElementById('d_maxback').value = d.max_backlogs;
      document.getElementById('d_branches').value = d.eligible_branches;
      document.getElementById('d_deadline').value = d.deadline;
      document.getElementById('d_date').value = d.drive_date;
      document.getElementById('d_desc').value = d.description;
    }
    document.getElementById('driveModal').classList.add('show');
  };
  window.closeDriveModal = function () { document.getElementById('driveModal').classList.remove('show'); };

  document.getElementById('saveDriveBtn').addEventListener('click', () => {
    const id = document.getElementById('d_id').value;
    const payload = {
      company_id: company.id,
      title: document.getElementById('d_title').value.trim(),
      role: document.getElementById('d_role').value.trim(),
      package_lpa: parseFloat(document.getElementById('d_package').value),
      min_cgpa: parseFloat(document.getElementById('d_mincgpa').value),
      max_backlogs: parseInt(document.getElementById('d_maxback').value, 10),
      eligible_branches: document.getElementById('d_branches').value.trim(),
      deadline: document.getElementById('d_deadline').value,
      drive_date: document.getElementById('d_date').value,
      description: document.getElementById('d_desc').value.trim(),
      status: 'open'
    };
    if (!payload.title || !payload.role || isNaN(payload.package_lpa)) { alert('Please fill in all required fields.'); return; }

    if (id) DB.drives.update(parseInt(id, 10), payload);
    else DB.drives.insert(payload);

    closeDriveModal();
    renderAll();
  });

  /* ---------- Applicants ---------- */
  function populateDriveFilter() {
    const sel = document.getElementById('driveFilter');
    const drives = myDrives();
    sel.innerHTML = `<option value="all">All drives</option>` + drives.map(d => `<option value="${d.id}">${d.title}</option>`).join('');
    sel.onchange = renderApplicants;
  }

  function renderApplicants() {
    const sel = document.getElementById('driveFilter');
    const filterVal = sel.value || 'all';
    const drives = myDrives();
    const driveIds = drives.map(d => d.id);
    let apps = DB.applications.all().filter(a => driveIds.includes(a.drive_id));
    if (filterVal !== 'all') apps = apps.filter(a => a.drive_id === parseInt(filterVal, 10));

    const tbody = document.querySelector('#applicantsTable tbody');
    tbody.innerHTML = '';
    if (apps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="glyph">👥</div><p>No applicants yet for this selection.</p></div></td></tr>`;
      return;
    }
    [...apps].sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at)).forEach(a => {
      const s = DB.students.byId(a.student_id);
      const d = DB.drives.byId(a.drive_id);
      tbody.innerHTML += `<tr>
        <td class="cell-title">${studentName(a.student_id)}<div class="cell-sub">${s ? s.roll_no : ''}</div></td>
        <td>${s ? s.branch : '—'}</td>
        <td>${s ? s.cgpa.toFixed(2) : '—'}</td>
        <td>${d ? d.title : '—'}</td>
        <td>${fmtDate(a.applied_at)}</td>
        <td><span class="badge badge-${a.status}">${statusLabel(a.status)}</span></td>
        <td>
          <select onchange="updateApplicantStatus(${a.id}, this.value)" style="padding:6px 8px;border-radius:6px;border:1.5px solid var(--border);">
            ${STATUS_OPTIONS.map(s2 => `<option value="${s2}" ${s2 === a.status ? 'selected' : ''}>${statusLabel(s2)}</option>`).join('')}
          </select>
        </td>
      </tr>`;
    });
  }

  window.updateApplicantStatus = function (appId, status) {
    DB.applications.update(appId, { status });
    renderAll();
  };

  /* ---------- Profile ---------- */
  function renderProfile() {
    if (!company) return;
    document.getElementById('p_name').value = company.name;
    document.getElementById('p_industry').value = company.industry || '';
    document.getElementById('p_website').value = company.website || '';
    document.getElementById('p_desc').value = company.description || '';
    document.getElementById('p_status').innerHTML = `<span class="badge badge-${company.status}">${statusLabel(company.status)}</span>`;
  }

  document.getElementById('profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    DB.companies.update(company.id, {
      industry: document.getElementById('p_industry').value.trim(),
      website: document.getElementById('p_website').value.trim(),
      description: document.getElementById('p_desc').value.trim()
    });
    const saved = document.getElementById('profileSaved');
    saved.style.display = 'inline';
    setTimeout(() => saved.style.display = 'none', 2000);
  });

  function renderAll() {
    renderOverview();
    renderDrives();
    populateDriveFilter();
    renderApplicants();
    renderProfile();
  }

  renderAll();
})();

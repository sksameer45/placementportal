(function () {
  const session = requireRole('admin');
  if (!session) return;

  document.getElementById('sideName').textContent = session.name;

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

  function companyName(cid) { const c = DB.companies.byId(cid); return c ? c.name : 'Unknown'; }
  function studentName(sid) {
    const s = DB.students.byId(sid);
    if (!s) return 'Unknown';
    const u = DB.users.byId(s.user_id);
    return u ? u.name : 'Unknown';
  }

  /* ---------- Overview ---------- */
  function renderOverview() {
    const students = DB.students.all();
    const companies = DB.companies.all();
    const apps = DB.applications.all();

    const placedStudentIds = new Set(apps.filter(a => a.status === 'selected').map(a => a.student_id));

    document.getElementById('stStudents').textContent = students.length;
    document.getElementById('stCompanies').textContent = companies.filter(c => c.status === 'approved').length;
    document.getElementById('stPlaced').textContent = placedStudentIds.size;
    document.getElementById('stPendingCo').textContent = companies.filter(c => c.status === 'pending').length;

    // Branch-wise placement rate (CSS bar chart)
    const branches = [...new Set(students.map(s => s.branch))];
    const branchChart = document.getElementById('branchChart');
    if (branches.length === 0) {
      branchChart.innerHTML = `<div class="empty-state"><p>No student data yet.</p></div>`;
    } else {
      branchChart.innerHTML = branches.map(b => {
        const total = students.filter(s => s.branch === b).length;
        const placed = students.filter(s => s.branch === b && placedStudentIds.has(s.id)).length;
        const pct = total ? Math.round((placed / total) * 100) : 0;
        return `
          <div style="margin-bottom:14px;">
            <div class="flex" style="justify-content:space-between;font-size:.85rem;margin-bottom:6px;">
              <span><b>${b}</b> <span class="text-faint">(${placed}/${total} placed)</span></span>
              <span class="text-soft">${pct}%</span>
            </div>
            <div class="progress-bar"><span style="width:${pct}%;"></span></div>
          </div>`;
      }).join('');
    }

    // Applications by status
    const statuses = ['applied', 'shortlisted', 'test', 'interview', 'selected', 'rejected'];
    const statusChart = document.getElementById('statusChart');
    if (apps.length === 0) {
      statusChart.innerHTML = `<div class="empty-state"><p>No applications submitted yet.</p></div>`;
    } else {
      const max = Math.max(...statuses.map(s => apps.filter(a => a.status === s).length), 1);
      statusChart.innerHTML = statuses.map(s => {
        const count = apps.filter(a => a.status === s).length;
        const pct = Math.round((count / max) * 100);
        return `
          <div style="margin-bottom:14px;">
            <div class="flex" style="justify-content:space-between;font-size:.85rem;margin-bottom:6px;">
              <span class="badge badge-${s}">${statusLabel(s)}</span>
              <span class="text-soft">${count}</span>
            </div>
            <div class="progress-bar"><span style="width:${pct}%;background:var(--accent);"></span></div>
          </div>`;
      }).join('');
    }

    const tbody = document.querySelector('#pendingCoTable tbody');
    tbody.innerHTML = '';
    const pending = companies.filter(c => c.status === 'pending');
    if (pending.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="glyph">✅</div><p>No pending company approvals.</p></div></td></tr>`;
    }
    pending.forEach(c => {
      const u = DB.users.byId(c.user_id);
      tbody.innerHTML += `<tr>
        <td class="cell-title">${c.name}<div class="cell-sub">${u ? u.email : ''}</div></td>
        <td>${c.industry || '—'}</td>
        <td>${u ? fmtDate(u.created_at) : '—'}</td>
        <td class="row-actions">
          <button class="btn btn-primary btn-sm" onclick="approveCompany(${c.id})">Approve</button>
          <button class="btn btn-danger btn-sm" onclick="rejectCompany(${c.id})">Reject</button>
        </td>
      </tr>`;
    });
  }

  window.approveCompany = function (id) { DB.companies.update(id, { status: 'approved' }); renderAll(); };
  window.rejectCompany = function (id) { DB.companies.update(id, { status: 'rejected' }); renderAll(); };

  /* ---------- Companies ---------- */
  function renderCompanies() {
    const tbody = document.querySelector('#companiesTable tbody');
    tbody.innerHTML = '';
    const companies = DB.companies.all();
    if (companies.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No companies registered yet.</p></div></td></tr>`;
      return;
    }
    companies.forEach(c => {
      const driveCount = DB.drives.byCompany(c.id).length;
      tbody.innerHTML += `<tr>
        <td class="cell-title">${c.name}</td>
        <td>${c.industry || '—'}</td>
        <td>${c.website ? `<a href="${c.website}" target="_blank" rel="noopener">Visit ↗</a>` : '—'}</td>
        <td>${driveCount}</td>
        <td><span class="badge badge-${c.status}">${statusLabel(c.status)}</span></td>
        <td class="row-actions">
          ${c.status !== 'approved' ? `<button class="btn btn-primary btn-sm" onclick="approveCompany(${c.id})">Approve</button>` : ''}
          ${c.status !== 'rejected' ? `<button class="btn btn-danger btn-sm" onclick="rejectCompany(${c.id})">Reject</button>` : ''}
        </td>
      </tr>`;
    });
  }

  /* ---------- Students ---------- */
  function renderStudents(filterText) {
    const tbody = document.querySelector('#studentsTable tbody');
    tbody.innerHTML = '';
    let students = DB.students.all();
    if (filterText) {
      const f = filterText.toLowerCase();
      students = students.filter(s => {
        const u = DB.users.byId(s.user_id);
        return (u && u.name.toLowerCase().includes(f)) || s.roll_no.toLowerCase().includes(f) || s.branch.toLowerCase().includes(f);
      });
    }
    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>No matching students.</p></div></td></tr>`;
      return;
    }
    students.forEach(s => {
      const u = DB.users.byId(s.user_id);
      const apps = DB.applications.byStudent(s.id);
      const placed = apps.some(a => a.status === 'selected');
      tbody.innerHTML += `<tr>
        <td class="cell-title">${u ? u.name : '—'}<div class="cell-sub">${u ? u.email : ''}</div></td>
        <td>${s.roll_no}</td>
        <td>${s.branch}</td>
        <td>${s.cgpa.toFixed(2)}</td>
        <td>${s.backlogs}</td>
        <td>${apps.length}</td>
        <td>${placed ? '<span class="badge badge-selected">Placed</span>' : '<span class="badge badge-applied">Seeking</span>'}</td>
      </tr>`;
    });
  }

  document.getElementById('studentSearch').addEventListener('input', (e) => renderStudents(e.target.value));

  /* ---------- Drives ---------- */
  function renderDrives() {
    const tbody = document.querySelector('#drivesTable tbody');
    tbody.innerHTML = '';
    const drives = DB.drives.all();
    if (drives.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>No drives posted yet.</p></div></td></tr>`;
      return;
    }
    drives.forEach(d => {
      tbody.innerHTML += `<tr>
        <td class="cell-title">${d.title}<div class="cell-sub">${d.role}</div></td>
        <td>${companyName(d.company_id)}</td>
        <td>₹${d.package_lpa} LPA</td>
        <td>${d.eligible_branches}</td>
        <td>${fmtDate(d.deadline)}</td>
        <td>${DB.applications.byDrive(d.id).length}</td>
        <td><span class="badge badge-${d.status}">${statusLabel(d.status)}</span></td>
      </tr>`;
    });
  }

  /* ---------- Applications ---------- */
  function renderApplications() {
    const tbody = document.querySelector('#applicationsTable tbody');
    tbody.innerHTML = '';
    const apps = [...DB.applications.all()].sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
    if (apps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No applications submitted yet.</p></div></td></tr>`;
      return;
    }
    apps.forEach(a => {
      const d = DB.drives.byId(a.drive_id);
      tbody.innerHTML += `<tr>
        <td class="cell-title">${studentName(a.student_id)}</td>
        <td>${d ? d.title : '—'}</td>
        <td>${d ? companyName(d.company_id) : '—'}</td>
        <td>${fmtDate(a.applied_at)}</td>
        <td><span class="badge badge-${a.status}">${statusLabel(a.status)}</span></td>
      </tr>`;
    });
  }

  function renderAll() {
    renderOverview();
    renderCompanies();
    renderStudents(document.getElementById('studentSearch').value);
    renderDrives();
    renderApplications();
  }

  renderAll();
})();

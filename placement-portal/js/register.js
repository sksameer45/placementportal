(function () {
  const existing = getSession();
  if (existing) {
    if (existing.role === 'student') window.location.href = 'student-dashboard.html';
    else if (existing.role === 'company') window.location.href = 'company-dashboard.html';
    else window.location.href = 'admin-dashboard.html';
  }

  const tabs = document.querySelectorAll('.role-tabs button');
  const studentForm = document.getElementById('studentForm');
  const companyForm = document.getElementById('companyForm');
  const msg = document.getElementById('formMsg');

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const role = btn.dataset.role;
      studentForm.style.display = role === 'student' ? 'block' : 'none';
      companyForm.style.display = role === 'company' ? 'block' : 'none';
      msg.className = 'form-msg err';
    });
  });

  function showMsg(text, ok) {
    msg.textContent = text;
    msg.className = 'form-msg show ' + (ok ? 'ok' : 'err');
  }

  studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('s_email').value.trim();
    if (DB.users.byEmail(email)) { showMsg('An account with this email already exists.', false); return; }

    const cgpa = parseFloat(document.getElementById('s_cgpa').value);
    if (cgpa < 0 || cgpa > 10) { showMsg('CGPA must be between 0 and 10.', false); return; }

    const user = DB.users.insert({
      name: document.getElementById('s_name').value.trim(),
      email, password: document.getElementById('s_password').value, role: 'student'
    });
    DB.students.insert({
      user_id: user.id,
      roll_no: document.getElementById('s_roll').value.trim(),
      branch: document.getElementById('s_branch').value,
      cgpa: cgpa,
      backlogs: parseInt(document.getElementById('s_backlogs').value, 10) || 0,
      phone: document.getElementById('s_phone').value.trim(),
      skills: '',
      resume_link: ''
    });

    setSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    window.location.href = 'student-dashboard.html';
  });

  companyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('c_email').value.trim();
    if (DB.users.byEmail(email)) { showMsg('An account with this email already exists.', false); return; }

    const user = DB.users.insert({
      name: document.getElementById('c_name').value.trim(),
      email, password: document.getElementById('c_password').value, role: 'company'
    });
    DB.companies.insert({
      user_id: user.id,
      name: document.getElementById('c_name').value.trim(),
      industry: document.getElementById('c_industry').value.trim(),
      website: document.getElementById('c_website').value.trim(),
      description: document.getElementById('c_desc').value.trim(),
      status: 'pending'
    });

    showMsg('Registration submitted! An admin will review and approve your account before you can sign in.', true);
    companyForm.reset();
  });
})();

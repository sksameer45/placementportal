(function () {
  // If already logged in, bounce straight to the right dashboard.
  const existing = getSession();
  if (existing) redirectForRole(existing.role);

  let currentRole = 'student';
  const tabs = document.querySelectorAll('.role-tabs button');
  const demoBox = document.getElementById('demoBox');
  const demoCreds = {
    student: { label: 'Demo student login', text: 'aditi@college.edu / student123' },
    company: { label: 'Demo company login', text: 'hr@nimbusworks.com / company123' },
    admin: { label: 'Demo admin login', text: 'admin@portal.com / admin123' }
  };

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRole = btn.dataset.role;
      const d = demoCreds[currentRole];
      demoBox.innerHTML = `<b>${d.label}</b>${d.text}`;
    });
  });

  function redirectForRole(role) {
    if (role === 'student') window.location.href = 'student-dashboard.html';
    else if (role === 'company') window.location.href = 'company-dashboard.html';
    else if (role === 'admin') window.location.href = 'admin-dashboard.html';
  }

  const form = document.getElementById('loginForm');
  const msg = document.getElementById('formMsg');

  function showMsg(text, ok) {
    msg.textContent = text;
    msg.className = 'form-msg show ' + (ok ? 'ok' : 'err');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const user = DB.users.byEmail(email);
    if (!user || user.password !== password) {
      showMsg('Incorrect email or password. Please try again.', false);
      return;
    }
    if (user.role !== currentRole) {
      showMsg(`This account is registered as "${user.role}". Switch the tab above to sign in.`, false);
      return;
    }
    if (user.role === 'company') {
      const co = DB.companies.byUserId(user.id);
      if (co && co.status === 'pending') {
        showMsg('Your company registration is awaiting admin approval. You can sign in once approved.', false);
        return;
      }
    }

    setSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    redirectForRole(user.role);
  });
})();

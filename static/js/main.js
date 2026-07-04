// static/js/main.js

// 1. Auth & Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if(data.status === 'success') {
            document.getElementById('login-section').classList.remove('active');
            document.getElementById('login-section').classList.add('hidden');
            
            document.getElementById('dashboard-section').classList.remove('hidden');
            document.getElementById('dashboard-section').classList.add('active');
            
            // Load user data upon successful authentication
            loadProfile(data.uid);
        } else {
            alert('Login failed: ' + data.message);
        }
    } catch (err) {
        console.error('API connection error:', err);
    }
});

// 2. Tab Navigation
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.classList.add('hidden');
    });
    
    const target = document.getElementById(tabId);
    target.classList.remove('hidden');
    target.classList.add('active');
    
    // Update header Title
    const titles = {
        'profile': 'My Profile',
        'attendance': 'Attendance Management',
        'leave': 'Time Off Requests',
        'payroll': 'Salary Information'
    };
    document.getElementById('page-title').innerText = titles[tabId];
}

// 3. Populate Dynamic Profile
async function loadProfile(uid) {
    try {
        const res = await fetch(`/api/profile/${uid}`);
        const data = await res.json();
        
        document.getElementById('prof-name').innerText = data.name || 'N/A';
        document.getElementById('prof-role').innerText = data.role || 'N/A';
        document.getElementById('prof-email').innerText = data.email || 'N/A';
        document.getElementById('prof-mobile').innerText = data.mobile || 'N/A';
        document.getElementById('prof-dept').innerText = data.department || 'N/A';
    } catch (err) {
        console.error('Failed to load profile parameters', err);
    }
}

// 4. Mark Attendance
async function markAttendance(status) {
    const payload = {
        uid: "emp_001", // Should pull from authenticated session
        status: status,
        timestamp: new Date().toISOString()
    };

    try {
        const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        const msgBox = document.getElementById('attendance-status');
        msgBox.innerText = `${data.message} at ${new Date().toLocaleTimeString()}`;
        msgBox.style.color = status === 'Absent' ? 'var(--danger)' : 'var(--success)';
    } catch (err) {
        console.error("Attendance post failed:", err);
    }
}

// 5. Submit Leave Application
document.getElementById('leave-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const start = document.getElementById('leave-start').value;
    const end = document.getElementById('leave-end').value;
    
    if (new Date(end) < new Date(start)) {
        alert("End date cannot be earlier than start date.");
        return;
    }

    const payload = {
        uid: "emp_001",
        type: document.getElementById('leave-type').value,
        start_date: start,
        end_date: end,
        remarks: document.getElementById('leave-remarks').value,
        status: "Pending"
    };
    
    try {
        const res = await fetch('/api/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message);
        e.target.reset(); // clear form
    } catch (err) {
        console.error("Leave application failed:", err);
    }
});

// 6. Sign Out
function logout() {
    window.location.reload();
}
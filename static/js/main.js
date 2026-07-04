const app = {
    user: null,

    init() {
        this.bindEvents();
        const storedUser = localStorage.getItem('hrms_user');
        if (storedUser) {
            this.user = JSON.parse(storedUser);
            this.loadDashboard();
        }
    },

    bindEvents() {
        document.getElementById('login-form').addEventListener('submit', (e) => this.login(e));
        document.getElementById('signup-form').addEventListener('submit', (e) => this.signup(e));
        document.getElementById('profile-form').addEventListener('submit', (e) => this.updateProfile(e));
        document.getElementById('leave-form').addEventListener('submit', (e) => this.applyLeave(e));
        document.getElementById('admin-employee-form').addEventListener('submit', (e) => this.saveEmployeeChanges(e));
    },

    toggleAuth() {
        const loginBox = document.querySelector('.auth-box:not(#signup-box)');
        const signupBox = document.getElementById('signup-box');
        loginBox.classList.toggle('hidden');
        signupBox.classList.toggle('hidden');
    },

    async request(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) options.body = JSON.stringify(data);
        const response = await fetch(url, options);
        return response.json();
    },

    async login(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await this.request('/api/login', 'POST', { email, password });
            if (res.user) {
                this.user = res.user;
                localStorage.setItem('hrms_user', JSON.stringify(this.user));
                this.loadDashboard();
            } else {
                alert(res.error || 'Login failed');
            }
        } catch (err) { console.error(err); }
    },

    async signup(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const role = document.getElementById('signup-role').value;

        try {
            const res = await this.request('/api/signup', 'POST', { name, email, password, role });
            if (res.user) {
                alert('Signup successful! Please login.');
                this.toggleAuth();
            } else { alert(res.error); }
        } catch (err) { console.error(err); }
    },

    logout() {
        this.user = null;
        localStorage.removeItem('hrms_user');
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('dashboard-section').classList.add('hidden');
        document.getElementById('navbar').classList.add('hidden');
    },

    loadDashboard() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('nav-user-name').innerText = `Welcome, ${this.user.name} (${this.user.role})`;

        // FIX: Force hide admin menus by default to prevent cross-login bugs
        document.getElementById('admin-menu-leaves').classList.add('hidden');
        document.getElementById('admin-menu-employees').classList.add('hidden');

        // Only reveal if actually an Admin
        if (this.user.role === 'Admin') {
            document.getElementById('admin-menu-leaves').classList.remove('hidden');
            document.getElementById('admin-menu-employees').classList.remove('hidden');
        }

        this.showTab('profile');
    },

    async loadAdminEmployees() {
        // FIX: Pass requester_uid to prove Admin status
        const users = await this.request(`/api/users?requester_uid=${this.user.uid}`);

        if (users.error) {
            alert(users.error); // Will alert if an employee somehow triggers this
            return;
        }

        const tbody = document.getElementById('admin-employees-tbody');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td>${u.job_title || 'New Employee'}</td>
                <td>
                    <button class="btn-primary" onclick="app.editEmployee('${u.uid}')">Edit</button>
                </td>
            </tr>
        `).join('');

        document.getElementById('admin-edit-employee-section').classList.add('hidden');
    },

    async editEmployee(uid) {
        // Fetch fresh data for the selected employee
        const user = await this.request(`/api/users/${uid}`);

        // Populate form
        document.getElementById('edit-emp-uid').value = user.uid;
        document.getElementById('edit-emp-name').value = user.name || '';
        document.getElementById('edit-emp-role').value = user.role || 'Employee';
        document.getElementById('edit-emp-phone').value = user.phone || '';
        document.getElementById('edit-emp-address').value = user.address || '';
        document.getElementById('edit-emp-job').value = user.job_title || '';
        document.getElementById('edit-emp-salary').value = user.salary || '';

        // Show form
        document.getElementById('admin-edit-employee-section').classList.remove('hidden');

        // Scroll to form
        document.getElementById('admin-edit-employee-section').scrollIntoView({ behavior: 'smooth' });
    },

    async saveEmployeeChanges(e) {
        e.preventDefault();
        const uid = document.getElementById('edit-emp-uid').value;
        const data = {
            requester_uid: this.user.uid, // FIX: Tell backend an Admin is requesting
            name: document.getElementById('edit-emp-name').value,
            role: document.getElementById('edit-emp-role').value,
            phone: document.getElementById('edit-emp-phone').value,
            address: document.getElementById('edit-emp-address').value,
            job_title: document.getElementById('edit-emp-job').value,
            salary: document.getElementById('edit-emp-salary').value
        };

        await this.request(`/api/users/${uid}`, 'PUT', data);
        alert('Employee details updated successfully');

        this.loadAdminEmployees();
    },

    showTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');

        if (tabId === 'profile') this.loadProfile();
        if (tabId === 'attendance') this.loadAttendance();
        if (tabId === 'leaves') this.loadLeaves();
        if (tabId === 'admin-leaves') this.loadAdminLeaves();
        if (tabId === 'admin-employees') this.loadAdminEmployees(); // NEW
    },

    async loadProfile() {
        const data = await this.request(`/api/users/${this.user.uid}`);
        document.getElementById('prof-name').value = data.name || '';
        document.getElementById('prof-email').value = data.email || '';
        document.getElementById('prof-phone').value = data.phone || '';
        document.getElementById('prof-address').value = data.address || '';
        document.getElementById('prof-job').value = data.job_title || '';
        document.getElementById('prof-salary').value = data.salary ? `$${data.salary}` : '';
    },

    async updateProfile(e) {
        e.preventDefault();
        const data = {
            requester_uid: this.user.uid, // FIX: Tell backend who is requesting
            name: document.getElementById('prof-name').value,
            phone: document.getElementById('prof-phone').value,
            address: document.getElementById('prof-address').value
        };
        await this.request(`/api/users/${this.user.uid}`, 'PUT', data);
        alert('Profile updated successfully');
        this.user.name = data.name;
        localStorage.setItem('hrms_user', JSON.stringify(this.user));
    },

    async markAttendance(action) {
        await this.request('/api/attendance', 'POST', { uid: this.user.uid, action });
        this.loadAttendance();
    },

    async loadAttendance() {
        const records = await this.request(`/api/attendance?uid=${this.user.uid}`);
        const tbody = document.getElementById('attendance-tbody');
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${r.date}</td>
                <td>${new Date(r.check_in).toLocaleTimeString()}</td>
                <td>${r.check_out ? new Date(r.check_out).toLocaleTimeString() : '-'}</td>
                <td><span style="color:var(--success)">${r.status}</span></td>
            </tr>
        `).join('');
    },

    async applyLeave(e) {
        e.preventDefault();
        const data = {
            uid: this.user.uid,
            name: this.user.name, // FIX: Send the employee's name to the backend
            type: document.getElementById('leave-type').value,
            start_date: document.getElementById('leave-start').value,
            end_date: document.getElementById('leave-end').value,
            remarks: document.getElementById('leave-remarks').value
        };
        await this.request('/api/leaves', 'POST', data);
        document.getElementById('leave-form').reset();
        this.loadLeaves();
    },


    async loadLeaves() {
        const records = await this.request(`/api/leaves?uid=${this.user.uid}`);
        const tbody = document.getElementById('my-leaves-tbody');
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${r.type}</td>
                <td>${r.start_date} to ${r.end_date}</td>
                <td><strong>${r.status}</strong></td>
            </tr>
        `).join('');
    },


    async loadAdminLeaves() {
        // FIX: Pass requester_uid to prove Admin status to the backend
        const records = await this.request(`/api/leaves?requester_uid=${this.user.uid}`);

        if (records.error) {
            console.error(records.error);
            return;
        }

        const tbody = document.getElementById('admin-leaves-tbody');

        // Show a nice message if there are no applications yet
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 1rem;">No leave applications pending.</td></tr>';
            return;
        }

        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${r.name}</td> <td>${r.type}</td>
                <td>${r.start_date} to ${r.end_date}</td>
                <td><strong>${r.status}</strong></td>
                <td>
                    ${r.status === 'Pending' ? `
                        <button class="btn-success" onclick="app.updateLeaveStatus('${r.leave_id}', 'Approved')">Approve</button>
                        <button class="btn-danger" onclick="app.updateLeaveStatus('${r.leave_id}', 'Rejected')">Reject</button>
                    ` : 'Processed'}
                </td>
            </tr>
        `).join('');
    },

    async updateLeaveStatus(leave_id, status) {
        await this.request('/api/leaves', 'PUT', { leave_id, status });
        this.loadAdminLeaves();
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
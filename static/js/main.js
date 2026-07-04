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

        if (this.user.role === 'Admin') {
            document.getElementById('admin-menu-leaves').classList.remove('hidden');
        }

        this.showTab('profile');
    },

    showTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        
        if (tabId === 'profile') this.loadProfile();
        if (tabId === 'attendance') this.loadAttendance();
        if (tabId === 'leaves') this.loadLeaves();
        if (tabId === 'admin-leaves') this.loadAdminLeaves();
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
        const records = await this.request('/api/leaves');
        const tbody = document.getElementById('admin-leaves-tbody');
        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${r.uid.substring(0,8)}...</td>
                <td>${r.type}</td>
                <td>${r.start_date} to ${r.end_date}</td>
                <td>${r.status}</td>
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
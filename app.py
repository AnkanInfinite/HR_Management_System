from flask import Flask, request, jsonify, render_template
import firebase_admin
from firebase_admin import credentials, firestore
import datetime
import uuid

app = Flask(__name__)

# Initialize Firebase Admin SDK
try:
    cred = credentials.Certificate("credentials.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"Error initializing Firebase: {e}")
    db = None

@app.route('/')
def index():
    return render_template('index.html')

# --- Authentication & Authorization ---
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password') # In production, hash this!
    role = data.get('role', 'Employee')
    name = data.get('name')

    # Check if user exists
    users_ref = db.collection('users').where('email', '==', email).stream()
    if len(list(users_ref)) > 0:
        return jsonify({'error': 'Email already exists'}), 400

    user_id = str(uuid.uuid4())
    user_data = {
        'uid': user_id, 'email': email, 'password': password, 
        'role': role, 'name': name, 'phone': '', 'address': '', 
        'job_title': 'New Employee', 'salary': '0'
    }
    db.collection('users').document(user_id).set(user_data)
    return jsonify({'message': 'User registered successfully', 'user': user_data}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    users_ref = db.collection('users').where('email', '==', data.get('email')).where('password', '==', data.get('password')).stream()
    users = list(users_ref)
    
    if len(users) == 0:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    user_data = users[0].to_dict()
    # Remove password from response
    user_data.pop('password', None)
    return jsonify({'message': 'Login successful', 'user': user_data}), 200

# --- Profile Management ---
@app.route('/api/users/<uid>', methods=['GET', 'PUT'])
def user_profile(uid):
    user_ref = db.collection('users').document(uid)
    if request.method == 'GET':
        doc = user_ref.get()
        if doc.exists:
            data = doc.to_dict()
            data.pop('password', None)
            return jsonify(data), 200
        return jsonify({'error': 'User not found'}), 404
    
    if request.method == 'PUT':
        data = request.json
        # Only allow updating specific fields
        update_data = {k: v for k, v in data.items() if k in ['name', 'phone', 'address']}
        user_ref.update(update_data)
        return jsonify({'message': 'Profile updated successfully'}), 200

# --- Attendance Tracking ---
@app.route('/api/attendance', methods=['POST', 'GET'])
def attendance():
    if request.method == 'POST':
        data = request.json
        uid = data.get('uid')
        action = data.get('action') # 'check-in' or 'check-out'
        timestamp = datetime.datetime.now()
        date_str = timestamp.strftime('%Y-%m-%d')
        
        att_ref = db.collection('attendance').document(f"{uid}_{date_str}")
        
        if action == 'check-in':
            att_ref.set({
                'uid': uid, 'date': date_str, 'check_in': timestamp, 
                'check_out': None, 'status': 'Present'
            })
            return jsonify({'message': 'Checked in successfully'}), 200
        elif action == 'check-out':
            att_ref.update({'check_out': timestamp})
            return jsonify({'message': 'Checked out successfully'}), 200

    if request.method == 'GET':
        uid = request.args.get('uid')
        if uid:
            records = db.collection('attendance').where('uid', '==', uid).stream()
        else:
            records = db.collection('attendance').stream()
        
        data = [r.to_dict() for r in records]
        return jsonify(data), 200

# --- Leave Management ---
@app.route('/api/leaves', methods=['POST', 'GET', 'PUT'])
def leaves():
    if request.method == 'POST':
        data = request.json
        leave_id = str(uuid.uuid4())
        leave_data = {
            'leave_id': leave_id,
            'uid': data.get('uid'),
            'type': data.get('type'),
            'start_date': data.get('start_date'),
            'end_date': data.get('end_date'),
            'remarks': data.get('remarks'),
            'status': 'Pending'
        }
        db.collection('leaves').document(leave_id).set(leave_data)
        return jsonify({'message': 'Leave applied successfully'}), 201

    if request.method == 'GET':
        uid = request.args.get('uid')
        if uid:
            records = db.collection('leaves').where('uid', '==', uid).stream()
        else:
            records = db.collection('leaves').stream()
        
        data = [r.to_dict() for r in records]
        return jsonify(data), 200
    
    if request.method == 'PUT':
        data = request.json
        leave_id = data.get('leave_id')
        status = data.get('status') # 'Approved' or 'Rejected'
        db.collection('leaves').document(leave_id).update({'status': status})
        return jsonify({'message': f'Leave {status.lower()} successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True)
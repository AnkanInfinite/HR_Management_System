# app.py
import os
from flask import Flask, render_template, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)

# Initialize Firebase Admin SDK
cred_path = os.path.join(os.path.dirname(__file__), 'credentials.json')
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    db = None
    print("Warning: credentials.json not found. Falling back to prototype mock data.")

@app.route('/')
def index():
    return render_template('index.html')

# --- API Endpoints ---

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    # In a production app, verify via Firebase Authentication. 
    if email and password:
        return jsonify({"status": "success", "role": "employee", "uid": "emp_001"})
    return jsonify({"status": "error", "message": "Invalid credentials"}), 401

@app.route('/api/profile/<uid>', methods=['GET'])
def get_profile(uid):
    if db:
        doc_ref = db.collection('employees').document(uid).get()
        if doc_ref.exists:
            return jsonify(doc_ref.to_dict())
            
    # Dynamic fallback for prototyping
    return jsonify({
        "name": "Jane Doe",
        "email": "jane.doe@company.com",
        "department": "Engineering",
        "role": "Senior Developer",
        "mobile": "+1 234 567 8900"
    })

@app.route('/api/attendance', methods=['POST'])
def mark_attendance():
    data = request.json
    if db:
        # Store dynamically in Firestore
        db.collection('attendance').add(data)
    return jsonify({"status": "success", "message": f"Attendance marked as {data.get('status')}"})

@app.route('/api/leave', methods=['POST'])
def apply_leave():
    data = request.json
    if db:
        # Store dynamically in Firestore
        db.collection('leaves').add(data)
    return jsonify({"status": "success", "message": "Leave application submitted to HR for approval."})

if __name__ == '__main__':
    app.run(debug=True)
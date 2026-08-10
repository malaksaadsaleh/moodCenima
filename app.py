import pymysql
from flask import Flask, request, jsonify, render_template, session
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

app.secret_key = os.urandom(24)

UPLOAD_FOLDER = 'static/uploads/profile_pics'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Auth middleware
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'moodCinema'
}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)
    return conn

#get profile info 
@app.route('/profile', methods=['GET'])
@login_required
def get_profile():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, profile_pic FROM users WHERE id = %s", (session['user_id'],))
    user = cursor.fetchone()
    conn.close()
    return render_template('pro.html',
                           username=user['username'],
                           email=user['email'],
                           profile_pic=user['profile_pic'])

#update username
@app.route('/profile/username' , methods=['PUT'])
@login_required
def update_username():
   data = request.get_json()
   new_username = data.get('username')

   if not new_username:
      return jsonify({'error' : 'username is required'}), 400
   
   try:
      conn = get_db_connection()
      cursor = conn.cursor()
      cursor.execute("UPDATE users SET username = %s WHERE id = %s", (new_username, session['user_id']))
      conn.commit()
      conn.close()
      session['username'] = new_username
      return jsonify({'message' : "username updated"}), 200
   except pymysql.err.IntegrityError:
      return jsonify({'error' : "Username already taken"}), 409
   


#
#update profile_pic
@app.route('/profile/picture', methods=['PUT'])
@login_required
def update_profile_picture():
    if 'profile_pic' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['profile_pic']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Only png, jpg, jpeg files allowed'}), 400

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    filename = secure_filename(f"user_{session['user_id']}_{file.filename}")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    # Save path to DB
    db_path = f"uploads/profile_pics/{filename}"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET profile_pic = %s WHERE id = %s", (db_path, session['user_id']))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Profile picture updated', 'profile_pic': db_path}), 200

# Register
@app.route('/register', methods=['POST'])
def register():
   data = request.get_json()
   username = data.get('username')
   email = data.get('email')
   password = data.get('password')
   
   if not username or not email or not password:
      return jsonify({'error': 'All fields are required'}), 400
   
   hashed = generate_password_hash(password)

   try:
      conn = get_db_connection()

      cursor = conn.cursor()
      cursor.execute("USE moodCinema")
      cursor.execute(
         "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
         (username, email, hashed)
      )
      conn.commit()
      conn.close()
      return jsonify({'message': 'User registered successfully'}), 201
   except pymysql.err.IntegrityError:
      return jsonify({'error': 'Username or email already exists'}), 409

# Login
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("USE moodCinema")
    cursor.execute(
        "SELECT * FROM users WHERE email = %s", (email,)
    )
    user = cursor.fetchone()
    conn.close()

    if user and check_password_hash(user['password'], password):
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({'message': 'Logged in', 'username': user['username']}), 200
    return jsonify({'error': 'Invalid email or password'}), 401

# Logout
@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'}), 200

# Test DB
@app.route('/test_db')
def test_db():
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({'status': 'Database connection successful!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Home page
@app.route('/')
@app.route('/home')
def moodCinema():
    return render_template('web.html', title='moodCinema',
                            logged_in = 'user_id' in session, username = session.get('username', ''),
                            profile_pic=session.get('profile_pic',''))

# Mood page
@app.route('/mood/<mood_name>')
def mood_page(mood_name):
    valid_moods = ['happy', 'sad', 'chill', 'angry']
    if mood_name not in valid_moods:
        return "Mood not found", 404
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("USE moodCinema")
        cursor.execute("SELECT DISTINCT * FROM movies WHERE mood = %s ORDER BY name", (mood_name,))
        movies = cursor.fetchall()
        return render_template('mood.html', movies=movies, mood=mood_name)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# adding a movie to the wish list
@app.route('/wishlist', methods=['POST'])
@login_required
def add_to_wishlist():
    data = request.get_json()
    user_id = session['user_id']
    movie_id = data.get('id')
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO wishlist (users_id, movies_id) VALUES (%s,%s)", (user_id, movie_id))
    conn.commit()
    conn.close()
    return jsonify({'message' : 'Added!'})

# Wishlist page
@app.route('/wishlist', methods=['GET'])
@login_required
def wishlist_page():
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT w.*, m.name, m.poster, m.rating, m.genre FROM wishlist w JOIN movies m ON w.movies_id = m.id WHERE w.users_id = %s", (user_id,))
    wishlist = cursor.fetchall()
    conn.close()
    return render_template('wishlist.html', wishlist=wishlist)

# API get wishlist JSON (existing)
@app.route('/api/wishlist', methods=['GET'])
@login_required
def get_wishlist_api():
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("USE moodCinema")
    cursor.execute("SELECT * FROM wishlist WHERE user_id = %s", (user_id,))
    wishlist = cursor.fetchall()
    conn.close()

@app.route('/wishlist/<int:wishlist_id>', methods = ['DELETE'])
def remove_from_wishlist(wishlist_id):
    if 'user_id' not in session:
        return jsonify({"error": "Not logged in"}), 401
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("USE moodCinema")
    cursor.execute("DELETE FROM wishlist WHERE wishlist_id = %s", (wishlist_id,))
    conn.commit()
    conn.close()
    return jsonify({"message" : "Removed!"})

# Survey page (GET)
@app.route('/survey', methods=['GET'])
def survey():
    return render_template('survey.html')

# survey route (POST)
@app.route('/survey', methods=['POST'])
def save_survey():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error' : 'Not logged in'}), 401
    
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("USE moodCinema")
    cursor.execute("""
        INSERT INTO survey_responses (user_id, mood, genre, duration_preference, foreign_language_score, discovery_rating, comment)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        user_id,
        json.dumps(data['mood']),
        json.dumps(data['genre']),
        data['duration_preference'],
        data['foreign_language_score'],
        data['discovery_rating'],
        data.get('comment', '')
    ))
    conn.commit()
    conn.close()
    primary_mood = data['mood'][0] if data['mood'] else 'happy'
    return jsonify({
        "message": "Survey saved!",
        "redirect": f"/mood/{primary_mood}"
    })

if __name__ == '__main__':
    app.run(debug=True)
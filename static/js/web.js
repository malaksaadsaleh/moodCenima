// ═══════════════════════════════════════════════════════════════
//  MoodCinema — web.js
//  Handles: Home page mood effects, Login/Register modals,
//           Wishlist save/remove, Profile card, Survey
// ═══════════════════════════════════════════════════════════════


// ── 1. HOME PAGE — Mood hover colour effects ─────────────────────────────────

const highlight = document.querySelector('.titleLight');

if (highlight) {
  const moodColours = {
    happy : { color: '#FFB703', shadow: '#FFD166' },
    sad   : { color: '#4B6584', shadow: '#C8D6DF' },
    chill : { color: '#4A9CAD', shadow: '#E0F4F6' },
    angry : { color: '#D62828', shadow: '#ee611f' },
  };

  document.querySelectorAll('.mood').forEach(mood => {
    mood.addEventListener('mouseenter', () => {
      const key = Object.keys(moodColours).find(k => mood.classList.contains(k));
      if (key) {
        highlight.style.color      = moodColours[key].color;
        highlight.style.textShadow = `0 0 300px ${moodColours[key].shadow}`;
      }
    });
    mood.addEventListener('mouseleave', () => {
      highlight.style.color      = 'white';
      highlight.style.textShadow = '';
    });
  });
}


// ── 2. LOGIN / REGISTER MODALS ───────────────────────────────────────────────

const loginBtn      = document.getElementById('loginBtn');
const modalOverlay  = document.getElementById('modalOverlay');
const modalClose    = document.getElementById('modalClose');
const signupOverlay = document.getElementById('signupOverlay');
const signupClose   = document.getElementById('signupClose');
const goToSignup    = document.getElementById('goToSignup');
const goToLogin     = document.getElementById('goToLogin');
const submitLogin   = document.getElementById('submitLogin');
const submitSignup  = document.getElementById('submitSignup');

// Open login modal
if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    modalOverlay.classList.add('active');
  });
}

// Close login modal
if (modalClose) {
  modalClose.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
  });
}

// Close signup modal
if (signupClose) {
  signupClose.addEventListener('click', () => {
    signupOverlay.classList.remove('active');
  });
}

// Switch: login → signup
if (goToSignup) {
  goToSignup.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
    signupOverlay.classList.add('active');
  });
}

// Switch: signup → login
if (goToLogin) {
  goToLogin.addEventListener('click', () => {
    signupOverlay.classList.remove('active');
    modalOverlay.classList.add('active');
  });
}

// Click outside modal to close
[modalOverlay, signupOverlay].forEach(overlay => {
  if (!overlay) return;
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

// Escape key closes any open modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (modalOverlay)  modalOverlay.classList.remove('active');
    if (signupOverlay) signupOverlay.classList.remove('active');
  }
});

// Submit login
if (submitLogin) {
  submitLogin.addEventListener('click', () => {
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      alert('Please enter your email and password.');
      return;
    }

    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.message) {
        modalOverlay.classList.remove('active');
        window.location.reload();
      } else {
        alert('Login failed: ' + (data.error || 'Invalid credentials'));
      }
    })
    .catch(() => alert('Network error. Please try again.'));
  });
}

// Submit signup
if (submitSignup) {
  submitSignup.addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const email    = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (!username || !email || !password) {
      alert('Please fill in all fields.');
      return;
    }

    fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, email, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.message) {
        alert('Account created! Please sign in.');
        signupOverlay.classList.remove('active');
        modalOverlay.classList.add('active');
      } else {
        alert('Signup failed: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(() => alert('Network error. Please try again.'));
  });
}


// ── 3. WISHLIST — Save movie ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
document.querySelectorAll('.save-btn').forEach(button => {
  button.addEventListener('click', () => {
    const movieId = button.getAttribute('data-movie-id');
    if (!movieId) return;

    fetch('/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: movieId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.message) {
        button.textContent = '♥';
        button.disabled = true;
      } else {
        alert(data.error || 'Could not save movie. Are you logged in?');
      }
    })
    .catch(() => alert('Network error. Please try again.'));
  });
});
});


// ── 4. WISHLIST — Remove movie ───────────────────────────────────────────────

function removeFromWishlist(wishlistId) {
  fetch(`/wishlist/${wishlistId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ wishlist_id: wishlistId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.message) {
      const card = document.getElementById(`movie-${wishlistId}`);
      if (card) card.remove();

      // Show empty state if no cards remain
      const grid = document.getElementById('wishlist-grid');
      if (grid && grid.children.length === 0) {
        const empty = document.getElementById('empty-state');
        if (empty) empty.style.display = 'flex';
      }
    } else {
      alert(data.error || 'Could not remove movie.');
    }
  })
  .catch(() => alert('Network error. Please try again.'));
}


// ── 5. PROFILE PAGE ──────────────────────────────────────────────────────────

const profileCard = document.getElementById('profileCard');
const editBtn     = document.getElementById('editBtn');
const saveBtn     = document.getElementById('saveBtn');
const uploadBtn   = document.getElementById('uploadBtn');
const imageInput  = document.getElementById('imageInput');

/* New Password Declarations
const togglePwBtn = document.getElementById('togglePwBtn');
const pwFields    = document.getElementById('pwFields');
const savePwBtn   = document.getElementById('savePwBtn');
const pwMessage   = document.getElementById('pwMessage');*/

let currentImage = null;

if (editBtn) {
  editBtn.addEventListener('click', () => {
    profileCard.classList.add('editing');
    editBtn.classList.add('hidden');
    saveBtn.classList.remove('hidden');
    uploadBtn.classList.remove('hidden');
  });
}

if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    const username = document.getElementById('usernameInput').value.trim();
    const email    = document.getElementById('emailInput').value.trim();
   const current_password = document.getElementById('currentPwInput').value;
    const new_password     = document.getElementById('newPwInput').value;
    const confirm_password = document.getElementById('confirmPwInput').value;

    if (!username ) {
      alert('Username and email cannot be empty.');
      return;
    }

    
    
    // Update username in Flask
    fetch('/profile/username', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.message) alert('Could not update username: ' + (data.error || 'Unknown error'));
    })
    .catch(() => alert('Network error updating username.'));

    /*if (current_password || new_password || confirm_password) {
      if (new_password !== confirm_password) {
        alert("New passwords do not match!");
        return;
      }

      fetch('/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password,
          new_password,
          confirm_password
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          alert("Password updated successfully!");
          // Clear password fields
          document.getElementById('currentPwInput').value = '';
          document.getElementById('newPwInput').value = '';
          document.getElementById('confirmPwInput').value = '';
        } else {
          alert("Password error: " + data.error);
        }
      });
    }*/

    // Upload profile picture if one was selected
    
    if (imageInput && imageInput.files[0]) {
      const formData = new FormData();
      formData.append('profile_pic', imageInput.files[0]);

      fetch('/profile/picture', {
        method: 'PUT',
        credentials: 'include',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.profile_pic) {
          const img = document.getElementById('profilePic');
          img.src = '/static/' + data.profile_pic;
          img.classList.remove('hidden');
          document.getElementById('avatarFallback').classList.add('hidden');
        }
      })
      .catch(() => alert('Network error uploading picture.'));
    }

    // Update UI immediately
    document.getElementById('usernameText').innerText = username;
    document.getElementById('emailText').innerText    = email;
    document.getElementById('avatarFallback').innerText = username.charAt(0).toUpperCase();

    if (currentImage) {
      const img = document.getElementById('profilePic');
      img.src = currentImage;
      img.classList.remove('hidden');
      document.getElementById('avatarFallback').classList.add('hidden');
    }

    // Exit edit mode
    profileCard.classList.remove('editing');
    editBtn.classList.remove('hidden');
    saveBtn.classList.add('hidden');
    uploadBtn.classList.add('hidden');
  });
}

if (imageInput) {
  imageInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => { currentImage = event.target.result; };
    reader.readAsDataURL(file);
  });
}

// Logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    fetch('/logout', { method: 'POST', credentials: 'include' })
    .then(() => window.location.href = '/home');
  });
}


// ── 6. SURVEY ────────────────────────────────────────────────────────────────

// Map duration button display text to exact DB ENUM values
const DURATION_MAP = {
  'Under 90 min'   : 'under_90',
  '90 \u2013 120 min' : '90_to_120',
  '2 \u2013 3 hours'  : '2_to_3_hours',
  "Doesn't matter" : 'doesnt_matter'
};

let selectedMood      = null;
let selectedGenres    = [];
let selectedDurations = [];
let starRating        = 0;

// Initialise slider fill on page load
window.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('foreignSlider');
  if (slider) slider.style.setProperty('--val', slider.value + '%');
});

// Q1 — Mood tile (single select)
function toggleTile(tile) {
  document.querySelectorAll('.mood-tile').forEach(t => t.classList.remove('selected'));
  tile.classList.add('selected');
  selectedMood = tile.querySelector('.emoji-name').innerText.trim();
}

// Q2 — Genre buttons (multi select)
function toggleOption(element, type) {
  element.classList.toggle('selected');
  const value = element.innerText.replace('✓', '').trim();

  if (type === 'genre') {
    if (selectedGenres.includes(value)) {
      selectedGenres = selectedGenres.filter(g => g !== value);
    } else {
      selectedGenres.push(value);
    }
  }
}

// Q3 — Duration buttons (single select)
function toggleSingle(element, type) {
  element.parentElement.querySelectorAll('.option-btn')
    .forEach(btn => btn.classList.remove('selected'));
  element.classList.add('selected');

  if (type === 'duration' || type === 'time') {
    const label = element.innerText.replace('✓', '').trim();
    selectedDurations = [DURATION_MAP[label] || 'doesnt_matter'];
  }
}

// Q4 — Foreign language slider
function updateSlider(slider) {
  slider.style.setProperty('--val', slider.value + '%');
}

// Q5 — Star rating
function rateStar(n) {
  starRating = n;
  document.querySelectorAll('.star').forEach((star, i) => {
    star.classList.toggle('active', i < n);
  });
}

// Submit survey
function submitSurvey() {
  if (!selectedMood) {
    alert('Please select a mood first!');
    return;
  }
  if (selectedGenres.length === 0) {
    alert('Please pick at least one genre!');
    return;
  }

  const surveyData = {
    mood                  : [selectedMood.toLowerCase()],
    genre                 : selectedGenres,
    duration_preference   : selectedDurations.length > 0 ? selectedDurations[0] : 'doesnt_matter',
    foreign_language_score: Math.round(parseInt(document.getElementById('foreignSlider').value) / 10),
    discovery_rating      : Math.max(1, parseInt(starRating) || 1),
    comment               : document.querySelector('.text-area') ? document.querySelector('.text-area').value : ''
  };

  fetch('/survey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(surveyData)
  })
  .then(res => {
    if (!res.ok) return res.json().then(err => { throw new Error(err.error || 'Server error'); });
    return res.json();
  })
  .then(data => {
    if (data.message) {
      const form    = document.querySelector('.survy-Form');
      const success = document.getElementById('successScreen');
      if (form)    form.style.display    = 'none';
      if (success) success.style.display = 'block';

      // Redirect to the mood page after 2 seconds
      if (data.redirect) {
        setTimeout(() => { window.location.href = data.redirect; }, 2000);
      }
    } else {
      alert('Failed to submit: ' + (data.error || 'Unknown error'));
    }
  })
  .catch(err => alert('Error: ' + err.message));
}
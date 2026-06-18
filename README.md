# BigQuery Release Notes Dashboard (BQ Pulse)

A beautiful, modern web dashboard for tracking, filtering, and sharing Google Cloud BigQuery release notes on Twitter/X in one click. 

Built using a **Python Flask** backend and a responsive **Vanilla HTML, CSS, and JavaScript** frontend.

---

## 🚀 Key Features

* **Real-time Feed Syncing**: Fetches and parses the official BigQuery Atom release feed directly from Google Cloud.
* **Granular Feed Parsing**: Daily release aggregates are automatically split into individual update cards (e.g. Features, Changes, Deprecations, Notices) for easy readability.
* **Intelligent Caching**: Implements an in-memory cache system to prevent API rate limits, falling back gracefully to cache values if Google Cloud services are unreachable.
* **Rich Glassmorphic Design**: Futuristic, responsive dark-themed dashboard using glassmorphism, CSS gradients, glowing tag badges, and shimmer skeleton loader animations.
* **Twitter/X Intent Composer**: Side drawer panel to review the update context, edit the draft with automatic hashtags, track the 280 character limit, preview a live Twitter mockup, and post directly to X.
* **Live Search & Category Filters**: Dynamic client-side filtering by categories and instant full-text search.

---

## 🛠️ Technology Stack

* **Backend**: Python 3.12, Flask, Requests, Feedparser
* **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Flexbox, Keyframe Animations), Vanilla ES6 JavaScript
* **Security**: Dotenv authentication flow (`.env` file excluded by `.gitignore`)

---

## ⚙️ Setup and Installation

### 1. Prerequisites
Ensure you have Python 3.12+ installed on your system.

### 2. Install Dependencies
Initialize your virtual environment and install the required Python libraries:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install requirements
pip install flask requests feedparser
```

### 3. Setup Environment Variables (Optional)
Create a `.env` file in the root of the project to save your GitHub Personal Access Token if executing automated repository operations:
```env
GITHUB_TOKEN=your_pat_token_here
```

### 4. Run the Development Server
Start the Flask app locally:
```bash
python app.py
```
Open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your web browser to access the dashboard.

---

## 📂 Project Structure

* **`app.py`** – Backend Flask server, handles feed parsing and cache management.
* **`templates/`** – Contains the frontend layout page `index.html`.
* **`static/css/`** – Stylesheet file `styles.css` with the glassmorphic dark theme.
* **`static/js/`** – Client controller script `main.js` containing search, filters, and composer logic.
* **`.gitignore`** – Prevents virtual environments, bytecode, logs, and `.env` credentials from being committed to Git.

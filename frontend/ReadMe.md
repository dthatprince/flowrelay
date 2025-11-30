# FlowRelay Frontend

This folder contains the static frontend of FlowRelay (HTML, CSS, JS).  
You can host it locally or deploy it on GitHub Pages.

Live link : https://dthatprince.github.io/flowrelay/frontend/ (Logging in… This may take up to 30–40 seconds while the server wakes up)

## Account Credentials:
```sh
Admin
email:admin@admin.com
password: qwertyuiop

Client
email: user@user.com
password: 123456

```


## Installation & Setup

### 1. Clone the Repository
```sh
git clone https://github.com/dthatprince/flowrelay.git
cd flowrelay/backend
```

### 2. Update the backend API endpoint in:
```sh
frontend/assets/js/api.js

// API Configuration
const API_BASE_URL = ""

// Make sure you use the full HTTPS URL of your backend.
```

### 3. Update Redirect Paths (Important for GitHub Pages):
```sh
frontend/assets/js/auth.js

window.location.href = "./client/dashboard.html";  // Correct
window.location.href = "/client/dashboard.html";   // Wrong - Will cause 404 on GitHub Pages

```

### 4. Run the Application
From the root directory (project):
```sh

python -m http.server 8080
# Frontend runs on http://localhost:8080

```

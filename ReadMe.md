# FlowRelay - Logistics Management System

This project is a FastAPI-powered logistics and delivery management system designed for transport offer creation, assignment, and tracking. It includes role-based access, email-verified authentication, and a simple frontend built with FlowRelay (HTML/CSS/JS) and [Soft UI Dashboard](https://www.creative-tim.com/product/soft-ui-dashboard).


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

# User Roles & Capabilities

## 1. Admin

Admins have full control over users and delivery offers.

### User Management
- View all users
- Edit user information
- Delete user accounts

### Offer Management
- View all client offers
- Edit or update any offer
- Assign a driver to an offer
  - **Driver fields:** name, phone number, vehicle make/model, color, registration plate
- Update offer status
  - Statuses: pending, matched, in progress, completed, cancelled

### Client-facing Privacy Rules
- Clients only see the driver's first name and vehicle description (make/model/color/plate)

## 2. Client

Clients can create and manage their own transport/delivery offers.

### Account & Authentication
- Signup with details:
  - Company name
  - Address
  - Phone number
  - Company representative
  - Emergency phone number
  - Email
- Email verification required before login
- Login using email + password (JWT-based authentication)

### Offer Management
- Create a new offer with:
  - Representative/assignee
  - Emergency phone number
  - Offer description
  - Pickup date & time
  - Pickup address
  - Dropoff address
  - Additional services (e.g., "wait to return client")
- View all personal offers with their status:
  - pending, matched, completed, in progress, cancelled
- Edit/update an offer only while it is still pending

## Authentication & Security
- JWT-based authentication with access tokens
- Role-based authorization (admin, client)
- Email verification flow before first login
- Passwords securely hashed
- Sessions protected through token expiration


## Installation & Setup

### 1. Clone the Repository
```sh
git clone https://github.com/dthatprince/flowrelay.git
cd flowrelay/backend
```

### 2. Setup the Backend and Frontend:
```sh
https://github.com/dthatprince/flowrelay/tree/main/frontend/ReadMe.md


https://github.com/dthatprince/flowrelay/tree/main/backend/ReadMe.md

```


## Features
### Backend (FastAPI)
- Fast, async API endpoints built with FastAPI
- SQLite database with SQLAlchemy models
- JWT authentication (OAuth2 Password Bearer)
- User registration, login, and protected routes
- Logistic workflows (packages, deliveries, tracking)
- Modular code structure with routers and services

Frontend

Fully customized UI using Soft UI Dashboard (Creative Tim)

Clean HTML, CSS, and vanilla JavaScript structure

API integration with token-based authentication

Dynamic dashboard components

Mobile-responsive design


## Tech Stack
### Backend
- Python 3.10+
- FastAPI
- SQLAlchemy
- SQLite
- Python-Jose (JWT)
- Pydantic
- Uvicorn


### Frontend
- Creative Tim Soft UI Dashboard
- HTML5 / CSS3
- JavaScript
- Fetch API
- Toast / Alert components
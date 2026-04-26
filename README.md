# Volunteer Backend

Node.js + Express backend for the volunteer registration form.

## Structure

```
volunteer-backend/
├── .env                    # Environment variables
├── src/
│   ├── config/
│   │   └── multer.js       # Multer file upload configuration
│   ├── db/
│   │   └── database.js     # SQLite setup & schema initialization
│   ├── middleware/
│   │   └── errorHandler.js # Global error handler
│   ├── routes/
│   │   └── volunteer.js    # POST /api/submit-volunteer route
│   └── validators/
│       └── volunteerValidator.js  # express-validator rules
├── uploads/
│   ├── photos/             # Personal photo uploads (organized by date)
│   └── cvs/                # CV file uploads (organized by date)
├── data/
│   └── volunteers.db       # SQLite database (auto-created)
└── index.js                # App entry point
```

## Running

```bash
npm start        # production
npm run dev      # development (if nodemon is installed)
```

## API

### POST /api/submit-volunteer

Accepts `multipart/form-data` with all form fields.

**Success Response**
```json
{ "success": true, "message": "Volunteer registered successfully", "id": "<uuid>" }
```

**Validation Error Response**
```json
{ "success": false, "errors": [ { "field": "...", "message": "..." } ] }
```

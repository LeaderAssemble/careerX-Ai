# CareerX-AI

CareerX-AI is an AI-powered career readiness platform built to help students transition from campus to corporate life. The project combines personalized career guidance, learning roadmaps, skill-gap analysis, and job-readiness support for future professionals.

## Overview

This project is designed as a modern student-focused career platform with:

- AI-driven career planning and guidance
- Personalized learning roadmaps
- Skill gap analysis and recommendations
- Course and opportunity discovery
- Resume, interview, and project-based preparation
- Admin tools for managing student data and published opportunities
- Notifications and email-based updates for career opportunities

The application is built with React on the frontend, a Node.js API layer, and MySQL-backed data storage.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express-style custom HTTP API (in `server/index.js`)
- Database: MySQL
- Email: Nodemailer with Gmail SMTP
- Data/UX: Lucide icons, Recharts, i18n support, responsive UI

## Key Features

- Student onboarding and profile setup
- Career dashboard and AI career insights
- Roadmap planning for learning and growth
- Skill gap tracking and recommendations
- Job, internship, and government opportunity discovery
- Interview practice and challenge/simulator modules
- Project lab and achievement tracking
- Admin dashboard for content publishing and activity monitoring
- Password reset and user authentication flows

## Project Structure

```bash
careerX-AI/
├── src/                     # React application source files
│   ├── components/          # Reusable UI and feature components
│   ├── pages/               # Landing, auth, student, and admin views
│   ├── store/               # App state and context management
│   ├── services/            # API/service integrations
│   ├── config/              # Configuration data
│   ├── i18n/                # Internationalization resources
│   ├── App.jsx              # Route configuration and app shell
│   ├── main.jsx             # App entry point
│   └── index.css            # Styling and theme definitions
├── server/                  # Node.js backend API
│   ├── index.js             # Main server and API routes
│   ├── mysqlStore.js        # MySQL database logic
│   ├── jobFeedService.js    # Job feed ingestion logic
│   └── ...
├── scripts/                 # Automation and QA scripts
├── .env.example             # Environment variable template
├── DATABASE.md              # Database setup guide
├── index.html               # Vite HTML entry
├── package.json             # Project scripts and dependencies
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation
├── package-lock.json        # Locked dependency versions
├── LICENSE                  # Apache 2.0 license
├── PRIVACY_POLICY.md        # Privacy and copyright policy
├── LEGAL.md                 # Legal notice and copyright policy
└── .env                     # Local environment file (not committed)
```

## Getting Started

### Prerequisites

Before running the project, make sure you have:

- Node.js 18+ installed
- MySQL server available locally
- A Gmail account with an app password for SMTP (if email notifications are enabled)

### Installation

```bash
git clone https://github.com/LeaderAssemble/careerX-Ai.git
cd careerX-Ai
npm install
```

### Environment Configuration

Copy the sample environment file and update values for your local setup:

```bash
cp .env.example .env
```

The configuration includes settings for:

- MySQL connection
- Application base URL
- SMTP credentials
- Default admin user
- Optional job feed sources

See `.env.example` and `DATABASE.md` for the full setup details.

### Database Setup

1. Start your MySQL server.
2. Create the database defined in your `.env` file (default: `careerx`).
3. Ensure the MySQL user has permission to access the database.
4. The app initializes the required schema on startup when configured correctly.

### Run the Project

Start the app in development mode:

```bash
npm run dev
```

This starts:

- Vite frontend on `http://localhost:5173`
- Node API server on `http://localhost:4174`

## Available Scripts

```bash
npm run dev        # Run frontend and API together
npm run dev:api    # Run only the API server
npm run dev:vite   # Run the Vite frontend
npm run build      # Build for production
npm run preview    # Preview the production build
npm run smoke      # Run smoke tests
npm run qa         # Run full quality checks
```

## Notes

- The project is built as a hackathon/demo-style product with a strong focus on career acceleration and student engagement.
- Email delivery, job feeds, and admin publishing features depend on valid environment variables and correct local service setup.
- For database-specific details and schema guidance, refer to `DATABASE.md`.

## License

This project is licensed under the Apache License 2.0.

Copyright 2026 LeaderAssemble

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at:

https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

## Ownership & Legal Notice

This project is the intellectual property of LeaderAssemble. All rights to the original project, source code, interface, content, and related materials remain reserved by the owner unless otherwise explicitly stated in writing.

Use of this project must comply with the repository `LICENSE`, `PRIVACY_POLICY.md`, and `LEGAL.md` documents. Unauthorized copying, misrepresentation, or redistribution in violation of the license terms is prohibited.

## Privacy & Copyright

- This project is protected by copyright and intellectual property law.
- All original work remains owned by LeaderAssemble.
- The project may be used under the terms of the Apache License 2.0 and the repository legal notices.
- Users must retain attribution and legal notices when sharing or modifying the project.

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request with a clear summary

## Contact

For project questions, collaboration opportunities, or legal/privacy concerns, contact the repository owner or maintainers on GitHub.

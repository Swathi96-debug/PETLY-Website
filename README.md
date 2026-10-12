# PETLY — Full-Stack Pet Care & Adoption Platform

PETLY is a full-stack web application designed to bring pet adoption, health management, pet-care services, community interaction, and shopping together in one platform.

Built with React, Node.js, Express, MongoDB, and AWS, PETLY aims to simplify everyday pet-care tasks through a unified, responsive interface and a modular backend architecture.

## Features

### Pet Adoption
- Browse pet adoption listings and view individual pet profiles.
- Manage adoption listings and applications through dedicated API modules.
- Support ownership-aware operations and adoption workflows.

### Pet Health Management
- Maintain pet profiles and health-related information.
- Organize health records and medical documents.
- Support secure document handling through cloud file-storage integration.

### AI Pet Assistant
- AI-powered pet-care assistance using Google's Gemini API.
- Backend integration designed to provide relevant pet-care information and contextual assistance.

### Community
- Community posts, comments, conversations, and messaging modules.
- Notification support for relevant user activities.
- Data models and API routes for community interactions.

### Pet Care Store
- Product catalogue and store-related APIs.
- Order management, product reviews, and related data models.

### Pet Care Services
- Service-provider and booking modules.
- Location-related functionality to support service discovery.
- Dedicated API routes for service-related operations.

### Additional Modules
- Pet-care quiz and quiz-attempt tracking.
- Companion matching functionality.
- User authentication and role-based authorization.
- File uploads with validation and ownership checks.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JWT, bcrypt, AWS Cognito integration |
| Cloud file storage | AWS S3 |
| AI integration | Google Gemini API |
| Logging | AWS CloudWatch integration |
| Deployment | Vercel |
| Version control | Git, GitHub |

## Architecture

PETLY separates the user interface, application logic, data persistence, and file storage into distinct layers.

```text
                 PETLY Web Application
                         |
                    React + Vite
                         |
                     API Layer
                         |
                  Node.js + Express
                         |
          +--------------+--------------+
          |              |              |
      MongoDB Atlas    AWS S3       AI Services
      Application     File Storage   Gemini API
         Data
                         |
                 AWS Integrations
              Cognito / CloudWatch
```

The frontend communicates with backend API endpoints. MongoDB stores structured application data, while AWS S3 handles file storage. Authentication and cloud integrations are managed through dedicated backend modules.

## Project Structure

```text
PETLY-Website/
├── api/
│   └── index.js
├── public/
├── src/
│   ├── components/
│   ├── data/
│   ├── pages/
│   └── services/
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── utils/
│   └── test_*.js
├── vercel.json
├── package.json
└── README.md
```

*The structure above highlights the main application directories; individual files and modules may evolve during development.*

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB Atlas account or an accessible MongoDB instance
- AWS account with appropriately configured S3 permissions, if using cloud storage
- API credentials for any external integrations you want to enable

### 1. Clone the repository

```bash
git clone https://github.com/Swathi96-debug/PETLY-Website.git
cd PETLY-Website
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure the backend

```bash
cd server
npm install
```

Create a local `.env` file using the variables expected by the backend configuration. Configure the necessary database connection, authentication secrets, AWS settings, and external API credentials.

Refer to the application's configuration files and package scripts for the exact variable names and startup commands.

**Important:** Never commit real credentials, access keys, database connection strings, or secret tokens to GitHub.

### 4. Start the application

Start the frontend using the development script defined in the root `package.json`:

```bash
npm run dev
```

Start the backend separately using the script defined in `server/package.json`. Keep both processes running when the frontend requires the local API.

### 5. Build for deployment

From the project root, run the build script defined in `package.json`:

```bash
npm run build
```

The repository includes Vercel configuration files for deployment. Production deployment also requires the appropriate environment variables, database access, and cloud-service configuration.

## Testing

The backend contains dedicated test scripts covering several application areas, including:

- Authentication and authorization
- File uploads and access control
- Pet registration and adoption workflows
- Community interactions and notifications
- Health records and service functionality
- Store and review functionality
- Deployment-related checks

Run individual test scripts using the commands and dependencies specified in the backend configuration. Test coverage and successful execution should be confirmed against the current version before treating a feature as verified.

## Security Considerations

- Keep credentials in environment variables rather than source code.
- Validate uploaded files and restrict access to protected resources.
- Apply authentication and authorization checks to protected API operations.
- Restrict database and cloud permissions to the minimum required.
- Avoid exposing private files or sensitive user information through public endpoints.

## Future Improvements

- Expand automated testing and integration coverage.
- Improve deployment monitoring and error reporting.
- Continue refining accessibility, responsiveness, and user experience.
- Extend existing modules as additional requirements are identified.



Project repository: [PETLY-Website](https://github.com/Swathi96-debug/PETLY-Website)

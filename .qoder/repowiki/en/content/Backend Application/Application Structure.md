# Application Structure

<cite>
**Referenced Files in This Document**
- [main.py](file://backend/app/main.py)
- [config.py](file://backend/app/core/config.py)
- [api.py](file://backend/app/api/api_v1/api.py)
- [mongodb.py](file://backend/app/db/mongodb.py)
- [users.py](file://backend/app/api/v1/endpoints/users.py)
- [auth.py](file://backend/app/api/v1/endpoints/auth.py)
- [timetable.py](file://backend/app/api/v1/endpoints/timetable.py)
- [ai.py](file://backend/app/api/v1/endpoints/ai.py)
- [user.py](file://backend/app/models/user.py)
- [__init__.py](file://backend/app/services/auth/__init__.py)
- [generator.py](file://backend/app/services/timetable/generator.py)
- [gemini.py](file://backend/app/services/ai/gemini.py)
- [requirements.txt](file://backend/requirements.txt)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document describes the ShedMaster backend application structure built with FastAPI. It covers application initialization, configuration management, modular API routing, startup/shutdown lifecycle, middleware registration, dependency injection patterns, and the project organization. It also provides guidance on extending the application with new modules while maintaining architectural consistency, along with error handling, logging, and performance monitoring recommendations.

## Project Structure
The backend follows a layered, feature-based organization:
- Entry point initializes the FastAPI application, registers middleware, and mounts the versioned API router.
- Configuration is centralized via a settings class loaded from environment variables.
- API routing is organized under a versioned namespace with feature-specific routers.
- Data access is abstracted behind a MongoDB client wrapper.
- Business logic is split into service modules (authentication, timetable generation, AI assistance).
- Pydantic models define request/response schemas and BSON interoperability.

```mermaid
graph TB
A["FastAPI App<br/>backend/app/main.py"] --> B["Settings<br/>backend/app/core/config.py"]
A --> C["API Router v1<br/>backend/app/api/api_v1/api.py"]
C --> D["Endpoints<br/>backend/app/api/v1/endpoints/*.py"]
D --> E["Services<br/>backend/app/services/*"]
E --> F["MongoDB Wrapper<br/>backend/app/db/mongodb.py"]
F --> G["MongoDB Instance"]
```

**Diagram sources**
- [main.py:33-101](file://backend/app/main.py#L33-L101)
- [config.py:7-61](file://backend/app/core/config.py#L7-L61)
- [api.py:3-34](file://backend/app/api/api_v1/api.py#L3-L34)
- [mongodb.py:5-41](file://backend/app/db/mongodb.py#L5-L41)

**Section sources**
- [main.py:1-102](file://backend/app/main.py#L1-L102)
- [config.py:1-61](file://backend/app/core/config.py#L1-L61)
- [api.py:1-34](file://backend/app/api/api_v1/api.py#L1-L34)
- [mongodb.py:1-41](file://backend/app/db/mongodb.py#L1-L41)

## Core Components
- FastAPI Application Initialization: Creates the ASGI app with metadata, CORS middleware, custom exception handlers, health checks, and includes the versioned API router.
- Configuration Management: Centralized settings class loads environment variables and exposes typed configuration for API, database, security, AI, email, file storage, and pagination.
- Modular API Routing: A versioned router aggregates feature routers grouped by domain (users, auth, programs, courses, timetable, constraints, rules, rooms, faculty, student groups, AI).
- Database Access: A lightweight wrapper around Motor client manages connection lifecycle and provides a shared database handle.
- Authentication Services: JWT-based authentication, password hashing, token creation, and current user retrieval with dependency injection.
- Timetable Generation: Constraint-based generator and advanced engines for NEP-compliant scheduling.
- AI Integration: Gemini-based services for optimization, suggestions, analysis, and NEP compliance validation.

**Section sources**
- [main.py:25-101](file://backend/app/main.py#L25-L101)
- [config.py:7-61](file://backend/app/core/config.py#L7-L61)
- [api.py:3-34](file://backend/app/api/api_v1/api.py#L3-L34)
- [mongodb.py:5-41](file://backend/app/db/mongodb.py#L5-L41)
- [auth.py:1-123](file://backend/app/api/v1/endpoints/auth.py#L1-L123)
- [users.py:1-123](file://backend/app/api/v1/endpoints/users.py#L1-L123)
- [timetable.py:1-728](file://backend/app/api/v1/endpoints/timetable.py#L1-L728)
- [ai.py:1-362](file://backend/app/api/v1/endpoints/ai.py#L1-L362)
- [generator.py:163-402](file://backend/app/services/timetable/generator.py#L163-L402)
- [gemini.py:9-288](file://backend/app/services/ai/gemini.py#L9-L288)

## Architecture Overview
The system uses a clean separation of concerns:
- Entry point configures the app and lifecycle.
- Versioned API routes encapsulate feature domains.
- Services orchestrate business logic and interact with the database.
- Models define data contracts and BSON compatibility.
- Middleware handles cross-cutting concerns like CORS and validation.

```mermaid
graph TB
subgraph "Entry Point"
M["main.py"]
end
subgraph "Configuration"
S["config.py"]
end
subgraph "API Layer"
R["api_v1/api.py"]
U["endpoints/users.py"]
A["endpoints/auth.py"]
T["endpoints/timetable.py"]
I["endpoints/ai.py"]
end
subgraph "Services"
AU["services/auth/__init__.py"]
TG["services/timetable/generator.py"]
GA["services/timetable/advanced_generator.py"]
GE["services/timetable/exporter.py"]
GI["services/ai/gemini.py"]
end
subgraph "Persistence"
DBW["db/mongodb.py"]
end
subgraph "Models"
UM["models/user.py"]
end
M --> S
M --> R
R --> U
R --> A
R --> T
R --> I
U --> AU
A --> AU
T --> TG
T --> GA
T --> GE
I --> GI
U --> DBW
A --> DBW
T --> DBW
I --> DBW
AU --> DBW
UM --> DBW
```

**Diagram sources**
- [main.py:33-101](file://backend/app/main.py#L33-L101)
- [config.py:7-61](file://backend/app/core/config.py#L7-L61)
- [api.py:3-34](file://backend/app/api/api_v1/api.py#L3-L34)
- [users.py:1-123](file://backend/app/api/v1/endpoints/users.py#L1-L123)
- [auth.py:1-123](file://backend/app/api/v1/endpoints/auth.py#L1-L123)
- [timetable.py:1-728](file://backend/app/api/v1/endpoints/timetable.py#L1-L728)
- [ai.py:1-362](file://backend/app/api/v1/endpoints/ai.py#L1-L362)
- [__init__.py:1-190](file://backend/app/services/auth/__init__.py#L1-L190)
- [generator.py:163-402](file://backend/app/services/timetable/generator.py#L163-L402)
- [gemini.py:9-288](file://backend/app/services/ai/gemini.py#L9-L288)
- [mongodb.py:5-41](file://backend/app/db/mongodb.py#L5-L41)
- [user.py:1-76](file://backend/app/models/user.py#L1-L76)

## Detailed Component Analysis

### FastAPI Application Initialization and Lifecycle
- Lifespan management: Connects to MongoDB on startup and closes connections on shutdown.
- CORS middleware: Configured for local frontend origins.
- Root and health endpoints: Provide service metadata and readiness checks.
- Exception handling: Custom validation error handler logs request bodies and validation errors.
- Router mounting: Includes the versioned API router with a base path from settings.

```mermaid
sequenceDiagram
participant Proc as "Process"
participant App as "FastAPI App"
participant Mongo as "MongoDB Wrapper"
participant Router as "API Router"
Proc->>App : Start process
App->>Mongo : connect_to_mongo()
Mongo-->>App : Connection established
App->>Router : include_router(prefix=settings.API_V1_STR)
App-->>Proc : Ready
Proc-->>App : Stop signal
App->>Mongo : close_mongo_connection()
Mongo-->>App : Disconnected
App-->>Proc : Shutdown complete
```

**Diagram sources**
- [main.py:25-39](file://backend/app/main.py#L25-L39)
- [mongodb.py:11-41](file://backend/app/db/mongodb.py#L11-L41)
- [api.py:3-34](file://backend/app/api/api_v1/api.py#L3-L34)
- [config.py:10-12](file://backend/app/core/config.py#L10-L12)

**Section sources**
- [main.py:25-101](file://backend/app/main.py#L25-L101)
- [mongodb.py:11-41](file://backend/app/db/mongodb.py#L11-L41)
- [config.py:10-12](file://backend/app/core/config.py#L10-L12)

### Configuration Management
- Centralized settings class loads environment variables from a .env file.
- Typed fields for API base path, database URLs, security tokens, AI API keys, email settings, upload directories, pagination defaults, and CORS origins.
- Dynamic assembly of allowed origins from comma-separated strings.

```mermaid
classDiagram
class Settings {
+string API_V1_STR
+string PROJECT_NAME
+AnyHttpUrl[] ALLOWED_ORIGINS
+string MONGODB_URL
+string DATABASE_NAME
+string SECRET_KEY
+string ALGORITHM
+int ACCESS_TOKEN_EXPIRE_MINUTES
+Optional~string~ GEMINI_API_KEY
+bool SMTP_TLS
+Optional~int~ SMTP_PORT
+Optional~str~ SMTP_HOST
+Optional~str~ SMTP_USER
+Optional~str~ SMTP_PASSWORD
+Optional~str~ EMAILS_FROM_EMAIL
+Optional~str~ EMAILS_FROM_NAME
+string UPLOAD_DIR
+int MAX_FILE_SIZE
+int DEFAULT_PAGE_SIZE
+int MAX_PAGE_SIZE
+assemble_cors_origins(v) str[]
}
Settings --> "uses" Config
```

**Diagram sources**
- [config.py:7-61](file://backend/app/core/config.py#L7-L61)

**Section sources**
- [config.py:7-61](file://backend/app/core/config.py#L7-L61)

### Modular API Routing and Namespace Organization
- Versioned router aggregates feature routers with descriptive tags.
- Endpoints are grouped by domain: users, auth, programs, courses, faculty, student groups, rooms, timetable, timetable templates, constraints, rules, and AI.
- Each endpoint module defines CRUD and domain-specific operations with Pydantic models and MongoDB interactions.

```mermaid
graph LR
VR["Versioned Router<br/>api_v1/api.py"] --> UR["/users"]
VR --> AR["/auth"]
VR --> PR["/programs"]
VR --> CR["/courses"]
VR --> FR["/faculty"]
VR --> SGR["/student-groups"]
VR --> RR["/rooms"]
VR --> TR["/timetable"]
VR --> TTR["/timetable-templates"]
VR --> CNR["/constraints"]
VR --> RLR["/rules"]
VR --> AIR["/ai"]
```

**Diagram sources**
- [api.py:3-34](file://backend/app/api/api_v1/api.py#L3-L34)

**Section sources**
- [api.py:3-34](file://backend/app/api/api_v1/api.py#L3-L34)
- [users.py:1-123](file://backend/app/api/v1/endpoints/users.py#L1-L123)
- [auth.py:1-123](file://backend/app/api/v1/endpoints/auth.py#L1-L123)
- [timetable.py:1-728](file://backend/app/api/v1/endpoints/timetable.py#L1-L728)
- [ai.py:1-362](file://backend/app/api/v1/endpoints/ai.py#L1-L362)

### Authentication and Authorization Patterns
- OAuth2 password flow with JWT bearer tokens.
- Password hashing and verification using bcrypt.
- Token creation with expiration derived from settings.
- Dependency injection for current user and active user checks.
- Demo user support for development.

```mermaid
sequenceDiagram
participant Client as "Client"
participant AuthEP as "Auth Endpoint"
participant AuthSvc as "Auth Service"
participant DB as "MongoDB"
Client->>AuthEP : POST /api/v1/auth/login
AuthEP->>AuthSvc : authenticate_user(username, password)
AuthSvc->>DB : find user by email
DB-->>AuthSvc : User document
AuthSvc->>AuthSvc : verify_password()
AuthSvc-->>AuthEP : User or None
AuthEP->>AuthSvc : create_access_token()
AuthEP-->>Client : {access_token, user}
```

**Diagram sources**
- [auth.py:29-64](file://backend/app/api/v1/endpoints/auth.py#L29-L64)
- [__init__.py:62-88](file://backend/app/services/auth/__init__.py#L62-L88)
- [__init__.py:41-59](file://backend/app/services/auth/__init__.py#L41-L59)

**Section sources**
- [auth.py:1-123](file://backend/app/api/v1/endpoints/auth.py#L1-L123)
- [__init__.py:1-190](file://backend/app/services/auth/__init__.py#L1-L190)
- [user.py:1-76](file://backend/app/models/user.py#L1-L76)

### Timetable Generation and Optimization
- Constraint-based generator builds entries respecting rules (time slots, lunch breaks, max periods, labs).
- Advanced generators include template-based and NEP-compliant genetic algorithm approaches.
- Exporters support multiple formats (JSON, Excel, PDF/HTML fallback).
- Endpoints enforce user isolation by filtering queries by created_by.

```mermaid
flowchart TD
Start(["Generate Timetable"]) --> Load["Load program, courses, groups, rooms, constraints, faculty"]
Load --> Rules["Build Rules from constraints"]
Rules --> Labs["Place Lab sessions first"]
Labs --> Theory["Place Theory sessions with continuity rules"]
Theory --> Calendar["Update occupancy calendars"]
Calendar --> Save["Save timetable to DB"]
Save --> Export["Export options available"]
Export --> End(["Done"])
```

**Diagram sources**
- [generator.py:235-402](file://backend/app/services/timetable/generator.py#L235-L402)
- [timetable.py:234-264](file://backend/app/api/v1/endpoints/timetable.py#L234-L264)

**Section sources**
- [generator.py:163-402](file://backend/app/services/timetable/generator.py#L163-L402)
- [timetable.py:1-728](file://backend/app/api/v1/endpoints/timetable.py#L1-L728)

### AI-Assisted Timetable Operations
- Gemini integration for optimization suggestions, analysis, NEP compliance checks, and natural language queries.
- Constraint parsing and optimization using AI.
- Chat assistant with contextual suggestions.

```mermaid
classDiagram
class GeminiAIService {
+optimize_timetable(timetable_id, goals) Dict
+get_improvement_suggestions(timetable_id, areas) List
+analyze_timetable_efficiency(timetable_id, type) Dict
+process_natural_language_query(query, context) str
+suggest_program_constraints(program_id) List
+validate_nep_compliance(timetable_id) Dict
}
GeminiAIService --> "uses" Settings
GeminiAIService --> "reads/writes" MongoDB
```

**Diagram sources**
- [gemini.py:9-288](file://backend/app/services/ai/gemini.py#L9-L288)
- [ai.py:46-106](file://backend/app/api/v1/endpoints/ai.py#L46-L106)

**Section sources**
- [ai.py:1-362](file://backend/app/api/v1/endpoints/ai.py#L1-L362)
- [gemini.py:9-288](file://backend/app/services/ai/gemini.py#L9-L288)

### Database Abstraction and Connection Lifecycle
- Singleton wrapper holds AsyncIOMotorClient and database reference.
- Connection attempts with timeouts and ping verification.
- Graceful handling when DB is unavailable (logs and continues).

```mermaid
sequenceDiagram
participant App as "FastAPI App"
participant DBW as "Database Wrapper"
participant Mongo as "Mongo Client"
App->>DBW : connect_to_mongo()
DBW->>Mongo : AsyncIOMotorClient(url, timeout)
Mongo-->>DBW : Client instance
DBW->>Mongo : admin.command('ping')
Mongo-->>DBW : Pong
DBW-->>App : Connected
App-->>DBW : close_mongo_connection()
DBW->>Mongo : client.close()
Mongo-->>DBW : Closed
DBW-->>App : Disconnected
```

**Diagram sources**
- [mongodb.py:11-41](file://backend/app/db/mongodb.py#L11-L41)

**Section sources**
- [mongodb.py:5-41](file://backend/app/db/mongodb.py#L5-L41)

## Dependency Analysis
External dependencies are declared in requirements.txt and include FastAPI, uvicorn, Pydantic, Motor/Mongo, python-dotenv, passlib/bcrypt, PyJWT, ortools, pandas, openpyxl, weasyprint, google-generativeai, reportlab, and protobuf.

```mermaid
graph TB
FA["FastAPI"] --- UV["uvicorn"]
FA --- PD["pydantic"]
FA --- MT["motor/pymongo"]
FA --- JWT["pyjwt"]
FA --- PL["passlib/bcrypt"]
FA --- ENV["python-dotenv"]
FA --- ORT["ortools"]
FA --- PDAS["pandas"]
FA --- XLSX["openpyxl"]
FA --- WP["weasyprint"]
FA --- GEM["google-generativeai"]
FA --- RL["reportlab"]
FA --- PB["protobuf"]
```

**Diagram sources**
- [requirements.txt:1-19](file://backend/requirements.txt#L1-L19)

**Section sources**
- [requirements.txt:1-19](file://backend/requirements.txt#L1-L19)

## Performance Considerations
- Use pagination in endpoints to limit result sizes (as seen in users and timetable endpoints).
- Leverage async database operations with Motor to avoid blocking I/O.
- Cache frequently accessed configuration values in memory after initial load.
- Monitor DB connection health and consider retry/backoff strategies for transient failures.
- For AI operations, batch requests and cache results where feasible to reduce latency.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Validation errors: The custom handler logs the request method, URL, body, and validation errors, returning a structured 422 response.
- CORS issues: Verify allowed origins match the frontend origin and that the middleware is registered before route inclusion.
- Database connectivity: If MongoDB is unreachable, the app starts without DB; check connection URL and network access.
- Authentication failures: Confirm SECRET_KEY and ALGORITHM match the client expectations; ensure bcrypt-compatible passwords are stored.
- Health checks: Use the /health endpoint to verify service readiness.

**Section sources**
- [main.py:42-54](file://backend/app/main.py#L42-L54)
- [main.py:56-64](file://backend/app/main.py#L56-L64)
- [mongodb.py:11-41](file://backend/app/db/mongodb.py#L11-L41)
- [auth.py:29-64](file://backend/app/api/v1/endpoints/auth.py#L29-L64)

## Conclusion
ShedMaster employs a clean, modular FastAPI architecture with centralized configuration, robust authentication, and service-driven business logic. The versioned API routing promotes maintainability, while async database access and AI integrations enable scalable functionality. Following the patterns documented here ensures consistent extension and reliable operation.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Extending the Application with New Modules
- Add a new endpoint module under backend/app/api/v1/endpoints/ with a dedicated router.
- Register the new router in backend/app/api/api_v1/api.py with an appropriate prefix and tag.
- Implement service logic in backend/app/services/ as needed.
- Define Pydantic models in backend/app/models/ if new schemas are required.
- Update requirements.txt if adding new dependencies.
- Ensure user isolation and permission checks are enforced in new endpoints.
- Add health checks and tests to maintain reliability.

**Section sources**
- [api.py:3-34](file://backend/app/api/api_v1/api.py#L3-L34)
- [users.py:1-123](file://backend/app/api/v1/endpoints/users.py#L1-L123)
- [timetable.py:1-728](file://backend/app/api/v1/endpoints/timetable.py#L1-L728)
- [requirements.txt:1-19](file://backend/requirements.txt#L1-L19)
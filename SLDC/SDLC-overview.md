# Software Development Life Cycle (SDLC) – A Practical Guide

> Audience: Junior software engineering student
>
> Goal: Understand the **end‑to‑end SDLC** from idea to production and maintenance, in a way that matches how real teams work.

We’ll cover each major stage:

1. Planning & Requirement Gathering
2. System Analysis & Design (Architecture & Detailed Design)
3. Implementation (Development)
4. Testing & Quality Assurance
5. Deployment & Release Management
6. Operations, Monitoring & Maintenance

For each stage:
- Definition & purpose
- Key activities
- Inputs & outputs (artifacts)
- Roles involved
- Required skills
- Typical tools
- Common mistakes & best practices

At the end:
- A **summary comparison table**
- A **concrete example**: building a food delivery app

---

## 1. Planning & Requirement Gathering

### 1.1 Definition & Purpose

This is where the **problem is understood and scoped** before any coding starts.

Purpose:
- Clarify **what** we are building and **why**.
- Align business goals, user needs, and technical feasibility.
- Reduce risk from unclear or constantly changing expectations.

### 1.2 Key Activities

- Stakeholder identification (who cares about this system?).
- Eliciting requirements:
  - Workshops, interviews, surveys, observation, reviewing existing systems.
- Clarifying **functional requirements** (what the system must do):
  - User stories, use cases, feature lists.
- Clarifying **non‑functional requirements** (how well it must do it):
  - Performance, security, reliability, usability, compliance.
- Prioritization (MVP vs. later phases):
  - Must‑have vs. nice‑to‑have.
- High‑level scope & constraints:
  - Budget, deadlines, platforms (web/mobile), integrations, regulations.

### 1.3 Inputs & Outputs (Artifacts)

**Inputs:**
- Business idea / problem statement.
- Market research, competitor analysis.
- Existing systems documentation (if any).

**Outputs:**
- Vision statement / product brief.
- High‑level requirements document or product requirements document (PRD).
- Initial **backlog** of epics & user stories.
- Acceptance criteria for major features.
- Rough release timeline / milestones.

### 1.4 Roles Involved

- Product Manager (PM) / Product Owner (PO)
- Business Analyst (BA)
- System Architect / Senior Developer (for feasibility)
- UX/UI Designer (for early user flows)
- Key stakeholders (business sponsors, operations, customer support)

### 1.5 Required Skills & Knowledge

- Requirements elicitation techniques (interviews, workshops, etc.).
- Domain knowledge (e.g., e‑commerce, healthcare).
- Basic UX thinking (understanding user journeys).
- Communication and negotiation skills.
- Ability to think in terms of value, trade‑offs, and constraints.

### 1.6 Common Tools/Technologies

- Documentation & collaboration: Confluence, Notion, Google Docs.
- Work tracking: Jira, Azure DevOps, Trello, ClickUp.
- Diagramming: Miro, Lucidchart, Figma, draw.io.
- Survey/feedback: Google Forms, Typeform.

### 1.7 Common Mistakes & Best Practices

**Common mistakes:**
- Vague requirements (“Make it fast and user‑friendly” with no metrics).
- Ignoring non‑functional requirements (security, performance, scalability).
- Not involving the right stakeholders (e.g., operations, legal).
- Over‑specifying UI too early, making design inflexible.

**Best practices:**
- Write clear, testable user stories with acceptance criteria.
- Document assumptions and constraints explicitly.
- Start small: define an **MVP** (Minimum Viable Product).
- Validate requirements with prototypes or mockups.

---

## 2. System Analysis & Design

### 2.1 Definition & Purpose

Translate **requirements into a technical solution**.

Purpose:
- Decide **how** the system will be built.
- Identify architecture, components, data models, and interfaces.
- Reduce technical risk early (scalability, performance, integration feasibility).

### 2.2 Key Activities

- Clarifying and refining requirements with technical perspective.
- Choosing the **architecture style** (e.g., layered, microservices, event‑driven).
- Defining **system context** and integration points.
- Designing:
  - High‑level architecture diagrams.
  - Service boundaries, modules, layers.
  - Data models, ER diagrams, APIs, contracts.
  - Security model (auth, roles, permissions).
- Technology stack decisions:
  - Programming languages, frameworks, databases, infrastructure.
- High‑level estimation and planning (sizing, complexity).

### 2.3 Inputs & Outputs (Artifacts)

**Inputs:**
- Requirements / PRD.
- Existing system constraints.
- Organization’s tech standards.

**Outputs:**
- Architecture diagrams (C4 diagrams – context, container, component).
- Data models and schema designs.
- API specifications (e.g., OpenAPI/Swagger).
- Non‑functional design decisions (caching, logging, monitoring).
- High‑level design document (HLD) and sometimes low‑level design (LLD).

### 2.4 Roles Involved

- System Architect / Tech Lead.
- Senior Developers.
- DevOps / Infrastructure engineers (for deployment considerations).
- Security engineer (for threat modeling).
- Database administrator (DBA) for complex data needs.

### 2.5 Required Skills & Knowledge

- Software architecture patterns (monolith vs. microservices, etc.).
- Design principles: SOLID, DRY, KISS, separation of concerns.
- Data modeling and database design.
- API design and integration patterns.
- Security basics (authentication, authorization, OWASP Top 10).
- Understanding of cloud platforms (AWS/Azure/GCP) & infrastructure.

### 2.6 Common Tools/Technologies

- Diagramming: PlantUML, draw.io, Lucidchart, Miro.
- API design: Swagger/OpenAPI, Postman, Stoplight.
- Modeling: ERD tools, dbdiagram.io.
- Architecture documentation: Markdown + diagrams in repo, Confluence.

### 2.7 Common Mistakes & Best Practices

**Common mistakes:**
- Over‑engineering (microservices when a simple monolith is enough).
- Under‑engineering (no clear layering, everything coupled).
- Ignoring operational aspects (logging, monitoring, backup, security).
- Not thinking about evolvability (how the system will change over time).

**Best practices:**
- Keep it as **simple as possible** while meeting requirements.
- Prefer architectures your team can **operate** and **understand**.
- Document decisions briefly (Architecture Decision Records – ADRs).
- Review architecture with peers; challenge assumptions.

---

## 3. Implementation (Development)

### 3.1 Definition & Purpose

This is where **code is written**, based on design and requirements.

Purpose:
- Build working software that satisfies requirements.
- Implement features in small, testable increments.

### 3.2 Key Activities

- Breaking down user stories into tasks.
- Writing application code (backend, frontend, mobile, etc.).
- Writing unit tests and sometimes integration tests.
- Code reviews (pull requests / merge requests).
- Refactoring to keep code clean as features grow.
- Maintaining developer documentation (README, API docs, comments where needed).

### 3.3 Inputs & Outputs (Artifacts)

**Inputs:**
- Design documents, architecture diagrams.
- User stories with acceptance criteria.
- Coding standards and guidelines.

**Outputs:**
- Source code (application, scripts, configs).
- Unit/integration tests.
- Code review comments and improvements.
- Updated documentation (README, API docs, ADRs).

### 3.4 Roles Involved

- Software Developers / Engineers.
- Tech Lead.
- Sometimes QA engineers for test automation.

### 3.5 Required Skills & Knowledge

- Programming languages (e.g., Java, C#, JavaScript/TypeScript, Python).
- Frameworks (Spring, .NET, React, Angular, Node.js, etc.).
- Version control (Git, branching strategies, pull requests).
- Basic algorithms and data structures.
- Testing basics (unit tests, mocking, TDD a plus).
- Debugging and troubleshooting.

### 3.6 Common Tools/Technologies

- IDEs: VS Code, IntelliJ, Visual Studio, PyCharm.
- Version control: Git, GitHub, GitLab, Bitbucket.
- Build tools: Maven/Gradle (Java), npm/yarn (JS), pip/poetry (Python), MSBuild (C#).
- Testing frameworks: JUnit, NUnit, xUnit, Jest, Mocha, PyTest.
- Collaboration: GitHub/GitLab issues, Jira.

### 3.7 Common Mistakes & Best Practices

**Common mistakes:**
- Skipping tests to “go faster”.
- Copy‑pasting code instead of refactoring.
- Ignoring code reviews or treating them as superficial.
- Coupling business logic tightly to frameworks or UI.

**Best practices:**
- Small, frequent commits with clear messages.
- Follow team coding standards and style guides.
- Write tests alongside code; aim for good coverage of core logic.
- Use code reviews to learn and improve design.
- Continuously refactor to keep the codebase healthy.

---

## 4. Testing & Quality Assurance

### 4.1 Definition & Purpose

Validate that the **software works as intended**, meets requirements, and is reasonably free of defects.

Purpose:
- Catch defects early.
- Ensure features meet business and user expectations.
- Provide confidence for deployment.

### 4.2 Key Activities

- Test planning and strategy (what types of tests, how much automation).
- Creating test cases and test data.
- Executing:
  - Unit tests (usually by developers).
  - Integration tests.
  - System / end‑to‑end (E2E) tests.
  - Regression tests (making sure old features still work).
  - Non‑functional tests: performance, security, usability, accessibility.
- Reporting and tracking defects.
- Verifying bug fixes.

### 4.3 Inputs & Outputs (Artifacts)

**Inputs:**
- Requirements and acceptance criteria.
- Design documents.
- Application builds.

**Outputs:**
- Test plans and test cases.
- Automated test suites.
- Test execution reports.
- Defect/bug reports.
- Quality metrics (test coverage, defect density, etc.).

### 4.4 Roles Involved

- QA engineers / Test engineers.
- Developers (unit tests, integration tests).
- Test automation engineers.
- Product Owner (for user acceptance testing – UAT).

### 4.5 Required Skills & Knowledge

- Testing types and levels (unit, integration, system, UAT).
- Writing effective test cases.
- Understanding of the application domain to find edge cases.
- Test automation frameworks and scripting.
- Basic performance and security testing knowledge.

### 4.6 Common Tools/Technologies

- Test management: Jira, Azure DevOps, TestRail.
- Automation: Selenium, Cypress, Playwright, Appium.
- Unit testing: JUnit, NUnit, Jest, PyTest, etc.
- API testing: Postman, Newman, REST Assured.
- Performance: JMeter, Gatling, k6.
- CI pipelines to run tests automatically.

### 4.7 Common Mistakes & Best Practices

**Common mistakes:**
- Treating testing as a phase that happens only at the end.
- Relying only on manual testing for large systems.
- No regression test suite (old bugs come back).
- Poor communication between dev and QA.

**Best practices:**
- Shift‑left testing – start testing as early as possible.
- Automate repetitive tests (smoke, regression, simple E2E).
- Keep tests reliable: fix flaky tests quickly.
- Developers and QA collaborate on test strategy and acceptance criteria.

---

## 5. Deployment & Release Management

### 5.1 Definition & Purpose

Take the **tested software** and make it **available to users** in a controlled way.

Purpose:
- Deploy changes safely and predictably.
- Minimize downtime and user impact.
- Enable quick rollback if something goes wrong.

### 5.2 Key Activities

- Preparing release notes and versions.
- Packaging the application (build artifacts, Docker images, etc.).
- Configuring environments (dev, test, staging, production).
- Running deployment pipelines (CI/CD).
- Database migrations.
- Feature flag management (optional but common).
- Post‑deployment smoke tests.

### 5.3 Inputs & Outputs (Artifacts)

**Inputs:**
- Tested build/artifacts.
- Deployment scripts/pipelines.
- Configuration values (secrets, environment variables).

**Outputs:**
- Deployed application in target environment.
- Release notes / change logs.
- Deployment logs and metrics.
- Rollback plans / scripts.

### 5.4 Roles Involved

- DevOps engineers / Site Reliability Engineers (SREs).
- Developers (especially in smaller teams).
- Release Manager (in larger organizations).
- QA (for smoke tests in production or pre‑prod).

### 5.5 Required Skills & Knowledge

- CI/CD concepts and tools.
- Basic scripting and automation.
- Infrastructure as code (IaC) concepts.
- Understanding of the runtime environment (containers, VMs, serverless).
- Observability basics (logs, metrics, alerts) to validate releases.

### 5.6 Common Tools/Technologies

- CI/CD: GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI.
- Containers & orchestration: Docker, Kubernetes.
- Cloud platforms: AWS, Azure, GCP.
- IaC: Terraform, Ansible, CloudFormation, Bicep.
- Secret management: Vault, cloud key vaults.

### 5.7 Common Mistakes & Best Practices

**Common mistakes:**
- Manual deployments with no repeatable procedures.
- No rollback strategy.
- Deploying big, infrequent releases (harder to debug, more risky).
- Ignoring configuration and secrets management.

**Best practices:**
- Automate deployments via CI/CD.
- Use small, frequent releases.
- Maintain clear release notes and versioning.
- Test deployment process in non‑prod environments.
- Use blue‑green, canary, or rolling deployments when appropriate.

---

## 6. Operations, Monitoring & Maintenance

### 6.1 Definition & Purpose

After deployment, the system **runs in production** and must be monitored, supported, and improved.

Purpose:
- Ensure the system stays **reliable, secure, and performant**.
- Fix bugs, patch vulnerabilities, and make enhancements.
- Learn from real user behavior and continuously improve.

### 6.2 Key Activities

- Monitoring production:
  - Uptime, performance metrics (latency, error rates, throughput).
  - Logs and traces.
- Incident management:
  - Detecting issues (alerts), triage, root cause analysis.
- Handling user support tickets and bug reports.
- Regular maintenance:
  - Upgrading dependencies, databases, OS.
  - Security patches.
- Capacity planning and cost optimization.
- Collecting feedback and planning new features (feeding back into backlog).

### 6.3 Inputs & Outputs (Artifacts)

**Inputs:**
- Deployed system and its runtime data (logs, metrics).
- User feedback and bug reports.
- SLAs and SLOs (service level agreements/objectives).

**Outputs:**
- Incident reports and post‑mortems.
- Patches, hotfixes, minor releases.
- Updated documentation and runbooks.
- Updated backlog: new stories, technical debt items.

### 6.4 Roles Involved

- SRE / DevOps engineers.
- On‑call developers.
- Support / customer success teams.
- Security teams.
- Product Manager (for prioritizing improvements).

### 6.5 Required Skills & Knowledge

- Observability: metrics, logs, traces.
- Incident response processes.
- Security best practices and vulnerability management.
- Performance tuning.
- Understanding of production infrastructure.

### 6.6 Common Tools/Technologies

- Monitoring & alerting: Prometheus, Grafana, Datadog, New Relic, CloudWatch, Azure Monitor.
- Logging: ELK/EFK stacks, Splunk, cloud logging.
- Incident management: PagerDuty, Opsgenie, custom on‑call rotations.
- Ticketing: Jira, ServiceNow, Zendesk.

### 6.7 Common Mistakes & Best Practices

**Common mistakes:**
- No monitoring – problems are discovered only when users complain.
- Ignoring error logs and small incidents until they become big outages.
- No learning from incidents (same problems repeat).
- Not budgeting time for maintenance and technical debt.

**Best practices:**
- Define and monitor key SLOs/SLIs (availability, latency, error rate).
- Automate alerts and ensure they are actionable (avoid alert fatigue).
- Run post‑mortems and track action items.
- Plan maintenance work in regular sprints.

---

## 7. How These Stages Fit Together

Although described sequentially, **modern SDLC is iterative**:

- Agile teams often repeat these steps in **sprints** (e.g., 2 weeks):
  - Plan → Design → Implement → Test → Deploy → Operate → Learn → Plan again.
- Feedback flows from later stages back to earlier ones:
  - Production issues inform requirements and design changes.
  - Testing feedback changes development and design.

Think of SDLC as a **cycle**, not a strict waterfall.

---

## 8. Summary Comparison Table

| Stage                            | Main Goal                           | Key Activities                                      | Primary Artifacts                                     | Primary Roles                        |
|----------------------------------|-------------------------------------|-----------------------------------------------------|-------------------------------------------------------|--------------------------------------|
| Planning & Requirement Gathering | Understand what & why               | Elicit, clarify, prioritize requirements            | PRD, backlog, user stories, acceptance criteria       | PM/PO, BA, Architect, Stakeholders   |
| System Analysis & Design         | Decide how to build it              | Architecture, data & API design, tech selection     | Architecture diagrams, HLD/LLD, API specs, data models| Architect, Tech Lead, Senior Devs    |
| Implementation (Development)     | Build the software                  | Coding, unit tests, code reviews, refactoring       | Source code, unit tests, dev docs                     | Developers, Tech Lead                |
| Testing & QA                     | Validate quality and correctness    | Test planning, automation, execution, bug reporting | Test plans, test cases, test reports, bug tickets     | QA Engineers, Developers, PO         |
| Deployment & Release Management  | Deliver changes to users safely     | Packaging, CI/CD, env config, release planning      | Build artifacts, release notes, deployment scripts    | DevOps, Developers, Release Manager  |
| Operations & Maintenance         | Keep system reliable & evolving     | Monitoring, incident response, patches, improvements| Logs, metrics, incident reports, patches, updated backlog| SRE, Dev, Support, Security, PM   |

---

## 9. Real‑World Example: Building a Food Delivery App

Imagine a startup wants to build a **food delivery app** (like Uber Eats or DoorDash, but simpler).

### 9.1 Planning & Requirement Gathering

- Business goal: Allow users to order food from nearby restaurants via mobile app.
- Key functional requirements:
  - Users can browse restaurants and menus.
  - Users can place orders and pay online.
  - Restaurants receive orders in real time.
  - Delivery drivers see assigned orders and delivery routes.
  - Users can track order status and receive notifications.
- Non‑functional requirements:
  - App should handle up to 10k concurrent users.
  - Average response time under 2 seconds.
  - Secure payments (PCI‑DSS considerations via payment gateway).
- Artifacts:
  - PRD describing features & user flows.
  - Initial user stories, e.g.:
    - “As a customer, I want to see nearby restaurants so that I can order quickly.”
    - “As a restaurant owner, I want to receive orders on a web dashboard so I can manage them.”

### 9.2 System Analysis & Design

- Architecture choice:
  - Start with a **modular monolith** backend (simpler to begin with).
  - Separate modules: `user`, `restaurant`, `order`, `delivery`, `payment`.
- Tech stack (example):
  - Backend: Node.js + Express or Java + Spring Boot.
  - Frontend: React Native for mobile app.
  - Database: PostgreSQL.
  - Messaging: Kafka or a simpler queue later when scale demands.
- Key designs:
  - Entity models: User, Restaurant, MenuItem, Order, OrderItem, Driver.
  - APIs: `/restaurants`, `/orders`, `/payments`.
  - Auth: JWT‑based authentication, roles (customer, restaurant, driver, admin).
  - Integration with payment gateway (e.g., Stripe).
- Artifacts:
  - System context diagram (users, restaurants, payment gateway, etc.).
  - Container diagram (mobile app, backend, DB, payment service).
  - API specifications (OpenAPI).

### 9.3 Implementation (Development)

- Breaking into sprints:
  - Sprint 1: User registration & login, basic restaurant list.
  - Sprint 2: Menu & cart, place order.
  - Sprint 3: Payment integration, order status tracking.
  - Sprint 4: Driver app basics, notifications.
- Activities per story:
  - Dev writes backend endpoints for `/auth/register`, `/auth/login`.
  - Dev writes React Native screens for sign‑up/sign‑in.
  - Unit tests for authentication logic.
  - Code review by another dev.
- Example artifact:
  - `POST /orders` endpoint implementation.
  - Unit tests for order subtotal and validation.

### 9.4 Testing & QA

- QA writes test cases:
  - Happy path: user registers, logs in, selects restaurant, adds items, checks out.
  - Edge cases: invalid payment, restaurant closed, items out of stock.
- Automation:
  - API tests in Postman collection + Newman in CI.
  - E2E tests with Cypress/Playwright for web dashboard, and basic automated or semi‑manual flows for mobile.
- Performance testing:
  - Simulate 1000 users placing orders per minute.
- Outcome:
  - Bugs found: e.g., orders sometimes not marked as paid on retry; fixed before release.

### 9.5 Deployment & Release Management

- Environments:
  - `dev` (for developers), `staging` (for QA/UAT), `prod`.
- CI/CD pipeline:
  - On commit to `main` → build backend & mobile app, run tests.
  - On tag `v1.0.0` → deploy backend Docker image to production cluster.
- Steps:
  - Configure database migrations for initial schema.
  - Deploy backend to cloud (e.g., AWS ECS or Azure App Service).
  - Distribute mobile app via TestFlight / internal testing first.
- Artifacts:
  - Release notes for v1.0.0: list of features and known limitations.

### 9.6 Operations, Monitoring & Maintenance

- Monitoring:
  - Dashboards showing orders per minute, error rates, latency.
  - Alerts when error rate > 2% or payment failures spike.
- Incidents:
  - Example: at peak dinner time, `500` errors increase.
  - Investigation reveals DB connection pool limits; fix by tuning pool size and adding caching.
- Maintenance:
  - Regular dependency updates (libraries, OS patches).
  - Improving notification system reliability.
  - Adding new features (discount codes, ratings) – goes back into planning and through the cycle again.

---

## 10. How to Learn SDLC as a Student

- Pick a **small project** (like a simple delivery or todo app).
- Try to **consciously go through each SDLC stage**, even if lightweight:
  - Write a mini‑PRD and user stories.
  - Draw a simple architecture diagram.
  - Implement in small increments with branches.
  - Write tests (start with unit tests and a few E2E tests).
  - Create a basic CI pipeline (GitHub Actions) and deploy to a free cloud tier.
  - Add monitoring if possible (logs, simple metrics).
- Reflect on:
  - What went wrong?
  - Which stage did you rush?
  - How would you improve the process next time?

The goal is not to memorize SDLC definitions, but to **experience the cycle**. Over time, you’ll naturally start thinking like an engineer and architect who considers not just code, but the entire lifecycle of software.

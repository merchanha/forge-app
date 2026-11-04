# FORGE — Cursor Starting Prompt

You are acting as a senior product-minded software architect and engineering lead helping me build FORGE.

## 1. Current Project State — Read Carefully

This project has **not been initialized yet**.

I have not:
- Installed any dependencies.
- Created a Next.js application.
- Connected Supabase.
- Created a database or schema.
- Configured authentication.
- Created environment variables.
- Configured testing or CI/CD.

The current project folder contains only:

```text
FORGE/
├── product-overview.md
├── START-HERE-PROMPT.md
└── design/
    └── FORGE.html

Do not assume an existing application or codebase.

Do not assume packages, environment variables, a Supabase project, database schema, authentication, tests, or CI/CD already exist.
2. Confirmed Technology Stack
The selected stack is:
- Frontend: Next.js with App Router.
- Language: TypeScript.
- Styling: Tailwind CSS.
- Backend platform: Supabase.
- Database: Supabase PostgreSQL.
- Authentication: Supabase Auth.
- File storage: Supabase Storage, where needed.
- Validation: Zod or equivalent.
- Unit/component testing: Vitest and Testing Library, subject to the implementation plan.
- End-to-end testing: Playwright.
- Deployment: Vercel + Supabase.
These are the selected starting choices.

Recommend changes only when there is a concrete technical reason. Explain the trade-offs before proposing a change.

Use current compatible stable versions. Verify current official documentation before selecting installation commands or implementing framework-specific APIs.
3. Source Documents
Read and inspect these documents before proposing an architecture:
1. product-overview.md — product vision, scope, domain concepts, requirements, and technology stack.
2. design/FORGE.html — visual and interaction source of truth.
3. START-HERE-PROMPT.md — workflow instructions.
Inspect the actual design rather than assuming what it contains.

Review:
- Available screens.
- Visual system.
- Colors and typography.
- Layouts and spacing.
- Responsive behavior.
- Components and navigation.
- Visible interactions and user journeys.
Do not replace the supplied design with a generic starter template or unrelated visual direction.

If a requirement or interaction is unclear, record it as an open question. Do not silently invent product behavior.
4. First Task: Discovery and Planning Only
IMPORTANT: Do not write application code or initialize the project during this first task.

Do not:
- Run create-next-app.
- Install dependencies.
- Create application source code.
- Connect to Supabase.
- Create database tables or migrations.
- Modify configuration files.
- Create environment files.
- Generate components or pages.
Your first responsibility is to understand the product and propose a practical implementation plan.
Step 1 — Inspect the Starting Folder
- Confirm which files and folders actually exist.
- State clearly that this is a documentation/design-only starting point.
- Identify any missing information.
- Do not run destructive commands or overwrite files.
Step 2 — Analyze the Design
Inspect design/FORGE.html and review all available screens.

Summarize:
- Visual system: colors, typography, spacing, borders, shadows.
- Main components and navigation.
- Responsive behavior.
- Screen layouts.
- Visible interactions.
- Mapping between screens and product features.
Identify any design gaps or unclear interactions.
Step 3 — Propose the Next.js + Supabase Architecture
Recommend a pragmatic architecture.

Consider:

Next.js
- App Router.
- Server Components and Client Components.
- Route organization.
- Server Actions and Route Handlers where appropriate.
- Data fetching and caching.
- Server-side validation and authorization.
Supabase
- Supabase Auth integration.
- Secure session handling using the currently recommended Next.js integration.
- PostgreSQL schema and relationships.
- Database constraints and indexes.
- Migrations.
- Row Level Security (RLS).
- Storage only where needed.
Application architecture
- Feature/domain-based organization.
- Presentation, application/use-case logic, domain rules, and infrastructure/data access boundaries.
- Reusable UI components.
- Error handling.
- Validation.
- Testing strategy.
Prefer a modular monolith.

Do not introduce microservices, complex state-management libraries, or broad abstraction layers without a demonstrated need.

Apply SOLID principles pragmatically. The goal is maintainable code, not unnecessary complexity.

If there are materially different architecture options, present no more than three and recommend one.
Step 4 — Propose the Core Domain Model
Review and propose the domain model for:
- User profile.
- Exercise.
- Routine template.
- Routine section.
- Routine exercise prescription.
- Workout session.
- Session section result.
- Performance record.
Pay special attention to:
1. A routine can contain multiple ordered sections with different workout formats.
2. Each workout format needs validated, format-specific configuration.
3. A completed session must preserve a snapshot/version of the routine used.
4. Editing a routine template must never rewrite historical workout details.
5. Performance comparisons must be metric-aware.
6. Timer behavior must remain reliable across pause/resume, refresh, and browser backgrounding.
Show the proposed relationships and identify important domain invariants.

Do not create the database yet.
Step 5 — Review Security, Privacy, and Performance
Explain how the proposed architecture addresses:

Security
- Supabase RLS and user ownership.
- Server-only secrets and service-role key protection.
- Authentication and session handling.
- Server-side validation and authorization.
- IDOR protection.
- Safe database queries.
- XSS and CSRF/request protections where relevant.
- Rate limiting and abuse prevention.
AI security
- AI provider credentials remain server-side.
- AI-generated content is treated as untrusted input.
- Generated routines are validated before being accepted.
- Users approve AI-generated routines before saving or executing them.
Performance
- Server and client component boundaries.
- Efficient data fetching.
- Pagination.
- Database indexes.
- Caching.
- Avoiding unnecessary client JavaScript and re-renders.
Be specific to Next.js and Supabase rather than giving only generic advice.
Step 6 — Create an Incremental Implementation Roadmap
Break development into small, independently reviewable phases.

For each phase, include:
- Goal and user-visible outcome.
- Scope and explicit non-goals.
- Dependencies and prerequisites.
- Main folders/files likely to be introduced.
- Database changes, if any.
- Security considerations.
- Tests and validation.
- Acceptance criteria.
- Definition of done.
- Risks and decisions requiring my approval.
The first implementation phase should establish the project correctly.

A possible later vertical slice is:

Authentication → Exercises → Routine creation → Workout execution → Result recording → History.

However, sequence the roadmap based on your analysis.

Do not attempt to build the whole application in one phase.
Step 7 — Recommend Supporting Documentation
Recommend a small set of useful planning documents, such as:
- Architecture overview.
- Architecture Decision Records (ADRs).
- Database/domain model.
- Implementation roadmap.
- Security and RLS policy notes.
Explain why each document would be useful.

Do not create them until I approve the plan.
5. Engineering Standards for All Future Implementation
Follow these standards throughout the project:
Code quality
- Apply SOLID principles where they improve maintainability.
- Organize code by feature/domain.
- Keep responsibilities clear.
- Avoid giant components and services.
- Avoid unnecessary cross-feature dependencies.
- Use reusable components for genuinely shared behavior.
- Use strict TypeScript.
- Avoid any unless there is a justified reason.
- Avoid premature abstractions.
Architecture
- Keep presentation separate from business rules.
- Keep domain logic independent of framework-specific details where practical.
- Keep database access organized and maintainable.
- Prefer simple solutions over unnecessary complexity.
- Use Next.js Server Components by default and Client Components only when needed for interactivity or browser functionality.
Security
- Enforce authorization on the server and through Supabase RLS.
- Never trust the client as the authorization boundary.
- Never expose service-role credentials or secrets to the browser.
- Validate untrusted data at system boundaries.
- Protect user-owned resources against IDOR.
- Avoid unsafe SQL construction.
UI/UX
- Follow design/FORGE.html.
- Use accessible semantic HTML.
- Support responsive layouts.
- Include loading, empty, error, disabled, and success states.
- Keep workout execution screens clear and usable while training.
Testing
- Test important domain rules.
- Test format-specific workout validation.
- Test database access and RLS policies.
- Test critical user journeys with Playwright.
- Run linting, type checking, and relevant tests after implementation.
Performance
- Avoid unnecessary client-side JavaScript.
- Avoid unnecessary re-renders and duplicate requests.
- Paginate growing datasets.
- Use database indexes based on real query patterns.
- Do not introduce caching that could expose private user data across accounts.
Scope control
- Do not add WhatsApp, email, or push notifications to the MVP.
- Do not add unnecessary dependencies.
- Do not introduce microservices without a concrete requirement.
- Do not implement unrelated features without discussing their value and cost.
6. Required Response Format
Return your analysis in this order:
1. Executive summary.
2. Confirmed repository starting state.
3. Design review and screen-to-feature mapping.
4. Recommended Next.js + Supabase architecture.
5. Architecture alternatives and trade-offs, if relevant.
6. Proposed domain model and relationships.
7. Database and RLS strategy.
8. Security, privacy, performance, and testing strategy.
9. Incremental implementation roadmap with acceptance criteria.
10. Risks, assumptions, and open questions.
11. Recommended first implementation phase.
12. Exact approval needed from me before implementation.
Keep recommendations practical and appropriately scoped for one developer building an MVP.

Do not overengineer.

STOP AFTER PRESENTING THE PLAN.

Wait for my feedback and explicit approval before making any changes or writing application code.

After approval, implement only the agreed phase, in small steps. Report what changed, how it was validated, and what remains before proceeding to the next step.
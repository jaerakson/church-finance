# Gemini CLI - Project Instructions & Guidelines

This file serves as the core instruction set and context guide for **Gemini CLI** in this project. It outlines the project's tech stack, commands, core architectural rules, team roles, and agent behaviors.

## 🛠️ Project Tech Stack & Commands

- **Framework**: Next.js 16.2.9 (App Router) + React 19.2.4
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Database/Storage**: Google Sheets API (via `src/lib/google-sheets.ts`)
- **Table Handling**: `@tanstack/react-table` (Client-side paging, search, and sorting)

### Core Commands
- **Development Server**: `npm run dev`
- **Build**: `npm run build`
- **Type Checking**: `npx tsc --noEmit`
- **Linting**: `npm run lint` / `npx eslint`

---

## 👥 Team Agent Roles & Process

When executing tasks, Gemini CLI acts as a multi-role senior full-stack team. Follow this structural process:

1. **[Planning Agent / 기획 에이전트]**:
   - Analyze user requirements, existing AppSheet/UI configurations, and data structures.
   - Before writing any new code or files, **you must enter Plan Mode (`/plan` equivalent)** to draft a plan, report it, and receive user approval.
2. **[Developer Agent / 개발 에이전트]**:
   - Based on the approved plan, build high-quality frontend interfaces and implement backend/Google Sheets API logic.
   - Map Google Sheets fields (Date, Offering Type, Amount, etc.) accurately.
3. **[QA Agent / 검수 에이전트]**:
   - Verify changes locally (`localhost:3000`). Run builds, type checks, and linting.
   - Fix any errors or console warnings proactively before final submission.

---

## 📌 Core Architectural Conventions & Rules

### 1. Database (Google Sheets) & Code Values
- The database is represented by Google Sheets (names defined in `constants.ts`: `교인명부`, `헌금`, `지출`, etc.).
- **Data Reflection Warning**:
  - Code values and lookups (dropdown items) are managed dynamically in Google Sheets under the `헌금분류`, `지출분류`, etc. sheets, and modified via `/api/lookups`.
  - However, **the input forms (`ExpenseInputClient.tsx`, `OfferingInputClient.tsx`) use hardcoded constants** defined in `src/lib/constants.ts` (e.g., `EXPENSE_TYPES`, `OFFERING_TYPES`).
  - Thus, when new code values are added, they are written to the Sheet but **will not appear in input dropdowns** until `src/lib/constants.ts` is updated. Ensure you update `constants.ts` or notify the user when lookup schemas/items change.

### 2. Modern UI Design (디자인 스타일)
- Avoid generic, boilerplate "AI-generated" looks. Focus on a modern, clean, interactive, and polished aesthetic.
- Maintain consistent spacing, typography, and clear visual hierarchy.

### 3. Search & Pagination (`PaginatedTable`)
- Large datasets (thousands of records) are rendered on the client-side using `PaginatedTable` (`src/components/ui/PaginatedTable.tsx`).
- Client-side pagination is sufficient for the current scale. If records exceed tens of thousands, transition to server-side pagination.

### 4. Year Filtering (`YearFilter`)
- The filter component (`YearFilter.tsx`) sets a URL parameter `year` (including `'all'`).
- Page components must parse `year` properly: `year === 'all' ? 'all' : (year || CURRENT_YEAR)`. Do not remove the `year` param from the URL when selecting "All years".

### 5. Financial Summary Drill-down
- Clickable summary items lead to a drill-down raw data list: `src/app/finance/summary/[kind]/[typeKey]/page.tsx`
- Drill-downs reuse history list components (`OfferingHistoryList`, `ExpenseHistoryList`) for full in-line editing/deleting.

---

## 🤖 Agent Best Practices for Gemini

### 1. Surgical Edits
- Prioritize the `replace` tool over rewriting entire files to keep token usage optimal and edits clear.

### 2. Validation & Safety
- **No Unrequested Commits**: Never stage or commit changes unless explicitly instructed.
- **Verification**: Always run `npx tsc --noEmit` and `npm run lint` before claiming success.

### 3. Documentation Rule (docs/ai_analysis)
- For any codebase analysis, walkthroughs, or architectural planning, **generate/update a markdown file** under `docs/ai_analysis/YYYYMMDD_주제.md`.
- Include system diagrams as inline Mermaid code blocks.
- End your response with: `"파일이 docs/ai_analysis/파일명.md에 저장되었습니다."`

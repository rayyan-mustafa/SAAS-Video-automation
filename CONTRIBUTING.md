# Contributing to AUTORA

First off, thank you for considering contributing to AUTORA! It is contributors like you that make this multi-platform AI video automation platform exceptional.

Please take a few moments to review these guidelines before submitting a Pull Request or opening an Issue.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to our security contact.

---

## Development Workflow

### 1. Fork and Clone
```bash
git clone https://github.com/rayyan-mustafa/SAAS-Video-automation.git
cd SAAS-Video-automation
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Branching Standards
Do not develop directly on `main`. Create a descriptive feature or fix branch:
- Features: `feat/short-description` (e.g., `feat/tiktok-analytics`)
- Bugfixes: `fix/short-description` (e.g., `fix/rate-limiter-timeout`)
- Documentation: `docs/short-description` (e.g., `docs/api-guide`)

```bash
git checkout -b feat/your-feature-name
```

---

## Git Commit Standards

We enforce **Conventional Commits** via Husky and Commitlint. Every commit message must follow this schema:

```text
<type>(<scope>): <short description in lowercase>

- Optional multi-line body explaining what changed and why
- Bullet point 2
```

### Supported Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation updates only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructure without behavioral changes
- `perf`: Performance optimizations
- `test`: Adding or modifying test suites
- `build`: Dependency or build-system changes
- `ci`: GitHub Actions or CI pipeline adjustments
- `chore`: Housekeeping or general tasks

### Supported Scopes
`pipeline`, `scheduler`, `auth`, `billing`, `db`, `blog`, `seo`, `video`, `admin`, `ui`, `qa`, `publishing`, `competitors`, `ci`

---

## Pre-Push Verification

Before pushing your branch or submitting a PR, ensure all local verification checks pass:

```bash
# 1. Static Type Checking
npm run typecheck

# 2. Master Module Regression & Security Test Suite
npm run test:unit

# 3. Next.js Production Build Validation
npm run build
```

---

## Submitting a Pull Request

1. Push your branch to GitHub:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request targeting `main`.
3. Complete the PR template checklist thoroughly.
4. Ensure all GitHub Actions CI checks turn green.
5. Address code review comments constructively.

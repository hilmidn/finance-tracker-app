# Atomic Design Refactor — Implementation Plan

> **For Hermes:** Use subagent-driven-development to execute this plan task-by-task. Each task = one commit on branch `refactor/atomic-design`.

**Goal:** Reorganize the frontend from flat `src/components/` into a modified atomic design (`components/{atoms,molecules,organisms}/` + `features/`) with a tested design-system layer (atoms & molecules) that replaces inline Tailwind in organisms.

**Architecture:**
- **Atoms** — universal UI primitives (Button, Input, Badge, Switch, etc.) with Vitest + RTL tests
- **Molecules** — composed of atoms (FormField, FilterChip, MemberPicker, TabBar, ConfirmDialog, MonthPicker) with tests
- **Organisms** — domain-aware UI sections (TransactionItem, TransactionForm, MemberList, etc.) moved from current `src/components/`. NOT individually tested initially — covered by manual smoke + build
- **Features** — empty placeholder for future feature-specific code (hooks, slices). All current hooks stay in `src/hooks/` for now (YAGNI)
- **Barrel exports** — `src/components/{atoms,molecules,organisms}/index.js` for clean imports

**Tech Stack:**
- Vite 8 (existing)
- React 18 + React Router (existing)
- Tailwind v4 (existing)
- **NEW:** Vitest + @testing-library/react + @testing-library/user-event + happy-dom

**Branch:** `refactor/atomic-design` (created from main, PR to main when complete)

---

## Migration Strategy

| Phase | Focus | Tests added | Risk | Build state |
|---|---|---|---|---|
| 0 | Foundation: branch + Vitest infra | 1 (smoke) | Low | Green |
| 1 | Folder skeleton + empty barrels | 0 | None | Green |
| 2 | Atoms (8 components) | 8 files | Low | Green |
| 3 | Molecules (6 components) | 6 files | Low | Green |
| 4 | Move existing → organisms | 0 (regression only) | Medium | Green |
| 5 | Replace inline usage with atoms | 0 (regression only) | Medium | Green |
| 6 | Cleanup + smoke | 0 | Low | Green |

**Total tasks: ~50. Commit per task. Build + test must stay green throughout.**

---

## Phase 0: Foundation (Branch + Test Infra)

### Task 0.1: Create branch from main

**Step 1:** Verify clean state and branch setup
```bash
cd /opt/data/finance-app
git status  # must be clean
git fetch origin
git checkout -b refactor/atomic-design
git push -u origin refactor/atomic-design
```

**Step 2:** Commit
No changes yet — just branch creation. The push establishes the branch on remote so Vercel can attach preview deploys.

### Task 0.2: Install Vitest + RTL + happy-dom

**Files:** Modify `package.json`

**Step 1:** Add dev dependencies
```bash
cd /opt/data/finance-app
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom happy-dom
```

**Step 2:** Verify
```bash
cat package.json | grep -E "vitest|testing-library|happy-dom"
```
Expected: 5 packages listed in `devDependencies`.

### Task 0.3: Add Vitest config

**Files:** Modify `vite.config.js`

**Step 1:** Add `test` block to vite config (replace existing export):
```js
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        navigateFallbackAllowlist: [/^\//],
      },
      manifest: {
        name: 'Noura',
        short_name: 'Noura',
        description: 'Smart finance for everyday life',
        theme_color: '#4f46e5',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/components/atoms/**', 'src/components/molecules/**'],
    },
  },
})
```

**Step 2:** Verify config parses
```bash
cd /opt/data/finance-app
npx vitest --version
```
Expected: prints version (e.g., `3.x.x`).

### Task 0.4: Add test setup file

**Files:**
- Create: `src/test/setup.js`

**Step 1:** Write the file
```js
import '@testing-library/jest-dom/vitest'
```

**Step 2:** Verify
```bash
cat src/test/setup.js
```
Expected: 1 line.

### Task 0.5: Add test scripts to package.json

**Files:** Modify `package.json`

**Step 1:** Update `scripts` block — add:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Step 2:** Verify
```bash
cd /opt/data/finance-app
npm test 2>&1 | head -20
```
Expected: `No test files found` (or similar — that's fine, we have no tests yet). Exit code 1.

### Task 0.6: Add smoke test (verify infra)

**Files:**
- Create: `src/utils/__tests__/genId.test.js`

**Step 1:** Inspect current `genId` to know its API
```bash
cd /opt/data/finance-app
grep -n "export.*genId\|function genId" src/utils/*.js
```

**Step 2:** Write the test (adjust based on what genId actually returns — assume it returns a string)
```js
import { describe, it, expect } from 'vitest'
import { genId } from '../genId'  // adjust path if different

describe('genId', () => {
  it('returns a non-empty string', () => {
    const id = genId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns unique values on each call', () => {
    const a = genId()
    const b = genId()
    expect(a).not.toBe(b)
  })
})
```

**Step 3:** Run test
```bash
cd /opt/data/finance-app
npm test
```
Expected: 2 passed.

**Step 4:** Verify build still passes
```bash
cd /opt/data/finance-app
npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...`

**Step 5:** Commit
```bash
git add package.json package-lock.json vite.config.js src/test/ src/utils/__tests__/
git commit -m "chore(test): scaffold Vitest + RTL + happy-dom infra"
git push
```

---

## Phase 1: Folder Skeleton

### Task 1.1: Create empty atomic folders + barrel files

**Files:**
- Create: `src/components/atoms/.gitkeep` (will be replaced by real atom files in Phase 2)
- Create: `src/components/molecules/.gitkeep`
- Create: `src/components/organisms/.gitkeep`
- Create: `src/components/atoms/index.js`
- Create: `src/components/molecules/index.js`
- Create: `src/components/organisms/index.js`
- Create: `src/features/.gitkeep`

**Step 1:** Create directories
```bash
cd /opt/data/finance-app
mkdir -p src/components/atoms src/components/molecules src/components/organisms src/features
```

**Step 2:** Write barrel files (empty for now)
```js
// src/components/atoms/index.js
// Atoms — universal UI primitives
export {}
```

```js
// src/components/molecules/index.js
// Molecules — composed of atoms
export {}
```

```js
// src/components/organisms/index.js
// Organisms — domain-aware UI sections
export {}
```

**Step 3:** Verify build
```bash
cd /opt/data/finance-app
npm run build 2>&1 | tail -3
```
Expected: `✓ built in ...`

**Step 4:** Verify tests
```bash
cd /opt/data/finance-app
npm test 2>&1 | tail -5
```
Expected: 2 passed (genId smoke test).

**Step 5:** Commit
```bash
git add src/components/ src/features/
git commit -m "chore(structure): add empty atomic design folder skeleton"
git push
```

---

## Phase 2: Atoms (8 components, TDD)

Each atom follows the same pattern: failing test → implement → pass → commit.

### Task 2.1: Button atom

**Files:**
- Create: `src/components/atoms/Button.jsx`
- Create: `src/components/atoms/Button.test.jsx`
- Modify: `src/components/atoms/index.js`

**Step 1:** Write failing test
```jsx
// src/components/atoms/Button.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Klik</Button>)
    expect(screen.getByText('Klik')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Klik</Button>)
    await user.click(screen.getByText('Klik'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders as <button> by default', () => {
    render(<Button>Tombol</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('applies primary variant styling by default', () => {
    render(<Button>Primary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/bg-indigo-600/)
  })

  it('applies secondary variant styling', () => {
    render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button').className).toMatch(/bg-white/)
  })

  it('applies danger variant styling', () => {
    render(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button').className).toMatch(/bg-red/)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Disabled</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards additional className', () => {
    render(<Button className="custom-class">Test</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('renders leftIcon when provided', () => {
    const Icon = () => <span data-testid="test-icon">★</span>
    render(<Button leftIcon={<Icon />}>Test</Button>)
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })
})
```

**Step 2:** Run test to verify failure
```bash
cd /opt/data/finance-app
npm test -- Button
```
Expected: FAIL — `./Button` not found.

**Step 3:** Implement Button
```jsx
// src/components/atoms/Button.jsx
import { forwardRef } from 'react'

const variantStyles = {
  primary: 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:scale-95',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-95',
  ghost: 'text-gray-500 hover:bg-gray-100 active:scale-95',
}

const sizeStyles = {
  sm: 'py-2 px-3 text-xs',
  md: 'py-3 px-4 text-sm',
  lg: 'py-3.5 px-4 text-sm',
}

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    leftIcon,
    rightIcon,
    loading = false,
    disabled = false,
    className = '',
    onClick,
    ...rest
  },
  ref
) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const cls = [base, variantStyles[variant], sizeStyles[size], className].filter(Boolean).join(' ')
  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? <span className="animate-spin">⏳</span> : leftIcon}
      {children}
      {rightIcon}
    </button>
  )
})

export default Button
```

**Step 4:** Add to barrel
```js
// src/components/atoms/index.js
export { Button } from './Button'
```

**Step 5:** Run test to verify pass
```bash
cd /opt/data/finance-app
npm test -- Button
```
Expected: 9 passed.

**Step 6:** Commit
```bash
git add src/components/atoms/Button.jsx src/components/atoms/Button.test.jsx src/components/atoms/index.js
git commit -m "feat(atoms): add Button with variants (primary, secondary, danger, ghost)"
git push
```

### Task 2.2: Input atom

**Files:**
- Create: `src/components/atoms/Input.jsx`
- Create: `src/components/atoms/Input.test.jsx`
- Modify: `src/components/atoms/index.js`

**Step 1:** Write failing test
```jsx
// src/components/atoms/Input.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Ketik" />)
    expect(screen.getByPlaceholderText('Ketik')).toBeInTheDocument()
  })

  it('calls onChange when typed in', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('respects the value prop', () => {
    render(<Input value="hello" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })

  it('forwards className', () => {
    render(<Input className="extra" />)
    expect(screen.getByRole('textbox')).toHaveClass('extra')
  })

  it('supports number type', () => {
    render(<Input type="number" />)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })
})
```

**Step 2:** Run test (fail)
```bash
cd /opt/data/finance-app
npm test -- Input
```

**Step 3:** Implement
```jsx
// src/components/atoms/Input.jsx
import { forwardRef } from 'react'

const baseStyle = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export const Input = forwardRef(function Input(
  { className = '', ...rest },
  ref
) {
  return <input ref={ref} className={[baseStyle, className].filter(Boolean).join(' ')} {...rest} />
})

export default Input
```

**Step 4:** Add to barrel
```js
// src/components/atoms/index.js (append)
export { Input } from './Input'
```

**Step 5:** Run test (pass)
```bash
npm test -- Input
```
Expected: 5 passed.

**Step 6:** Commit
```bash
git add src/components/atoms/Input.jsx src/components/atoms/Input.test.jsx src/components/atoms/index.js
git commit -m "feat(atoms): add Input primitive"
git push
```

### Task 2.3: Select atom

**Files:**
- Create: `src/components/atoms/Select.jsx`
- Create: `src/components/atoms/Select.test.jsx`
- Modify: `src/components/atoms/index.js`

**Step 1:** Write failing test
```jsx
// src/components/atoms/Select.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

const OPTIONS = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('Select', () => {
  it('renders options', () => {
    render(<Select options={OPTIONS} />)
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
  })

  it('selects initial value', () => {
    render(<Select options={OPTIONS} value="b" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveValue('b')
  })

  it('calls onChange when option picked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select options={OPTIONS} onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox'), 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders placeholder option when provided', () => {
    render(<Select options={OPTIONS} placeholder="Pilih..." />)
    expect(screen.getByText('Pilih...')).toBeInTheDocument()
  })
})
```

**Step 2:** Run test (fail)

**Step 3:** Implement
```jsx
// src/components/atoms/Select.jsx
import { forwardRef } from 'react'

const baseStyle = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export const Select = forwardRef(function Select(
  { options = [], value, onChange, placeholder, className = '', ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={[baseStyle, className].filter(Boolean).join(' ')}
      value={value ?? ''}
      onChange={onChange}
      {...rest}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
})

export default Select
```

**Step 4-6:** Add to barrel, run test, commit
```bash
git add src/components/atoms/Select.jsx src/components/atoms/Select.test.jsx src/components/atoms/index.js
git commit -m "feat(atoms): add Select primitive"
git push
```

### Task 2.4: Textarea atom

**Files:** Same pattern. Test 4 cases: renders, value, onChange, rows prop, className forwarding.

**Implementation:**
```jsx
// src/components/atoms/Textarea.jsx
import { forwardRef } from 'react'

const baseStyle = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none'

export const Textarea = forwardRef(function Textarea(
  { rows = 3, className = '', ...rest },
  ref
) {
  return <textarea ref={ref} rows={rows} className={[baseStyle, className].filter(Boolean).join(' ')} {...rest} />
})

export default Textarea
```

**Commit:** `feat(atoms): add Textarea primitive`

### Task 2.5: Badge atom

**Files:** Same pattern. Test cases: renders children, applies color variants (green/red/blue/purple/gray), supports className.

**Implementation:**
```jsx
// src/components/atoms/Badge.jsx
import { forwardRef } from 'react'

const colorStyles = {
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-400',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  amber: 'bg-amber-50 text-amber-700',
  gray: 'bg-gray-100 text-gray-600',
}

const sizeStyles = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
}

export const Badge = forwardRef(function Badge(
  { children, color = 'gray', size = 'xs', className = '', ...rest },
  ref
) {
  const cls = ['inline-flex items-center rounded-md font-medium', colorStyles[color], sizeStyles[size], className]
    .filter(Boolean).join(' ')
  return <span ref={ref} className={cls} {...rest}>{children}</span>
})

export default Badge
```

**Commit:** `feat(atoms): add Badge with color/size variants`

### Task 2.6: Spinner atom

**Files:** Same pattern. Test: renders, has role="status", has animate-spin class.

**Implementation:**
```jsx
// src/components/atoms/Spinner.jsx
export function Spinner({ size = 16, className = '' }) {
  return (
    <svg
      role="status"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default Spinner
```

**Commit:** `feat(atoms): add Spinner`

### Task 2.7: Switch atom

**Files:** Same pattern. Test: renders, role="switch", aria-checked reflects state, fires onChange when clicked, disabled prevents click.

**Implementation:**
```jsx
// src/components/atoms/Switch.jsx
import { forwardRef } from 'react'

export const Switch = forwardRef(function Switch(
  { checked, onChange, disabled = false, label, className = '', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-purple-500' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      {...rest}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
})

export default Switch
```

**Commit:** `feat(atoms): add Switch toggle primitive`

### Task 2.8: Avatar atom

**Files:** Same pattern. Test: renders initial, applies color variants (indigo/amber), forwards className.

**Implementation:**
```jsx
// src/components/atoms/Avatar.jsx
import { forwardRef } from 'react'

const colorStyles = {
  indigo: 'bg-indigo-100 text-indigo-700',
  amber: 'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-600',
}

function deriveInitial(seed) {
  if (!seed) return '?'
  return seed.substring(0, 2).toUpperCase()
}

export const Avatar = forwardRef(function Avatar(
  { seed, color = 'indigo', size = 'md', className = '', ...rest },
  ref
) {
  const sizeCls = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  const cls = ['rounded-full flex items-center justify-center font-bold flex-shrink-0', colorStyles[color], sizeCls, className]
    .filter(Boolean).join(' ')
  return <div ref={ref} className={cls} {...rest}>{deriveInitial(seed)}</div>
})

export default Avatar
```

**Commit:** `feat(atoms): add Avatar with color/size variants`

### Task 2.9: Verify all atom tests pass + build green

```bash
cd /opt/data/finance-app
npm test 2>&1 | tail -10
npm run build 2>&1 | tail -5
```
Expected: All tests pass, build green.

If both pass, no commit needed (Phase 2 done).

---

## Phase 3: Molecules (6 components, TDD)

Same TDD pattern. Each molecule composes atoms where possible.

### Task 3.1: FormField molecule

**Files:**
- Create: `src/components/molecules/FormField.jsx`
- Create: `src/components/molecules/FormField.test.jsx`
- Modify: `src/components/molecules/index.js`

**Composes:** Label + Input/Select/Textarea + error message

**Test cases:**
- Renders label
- Renders children (input/select/textarea)
- Shows error message when error prop provided
- Applies error styling to input border
- Forwards className

**Implementation:**
```jsx
// src/components/molecules/FormField.jsx
import { Label, ErrorText } from '../atoms'  // if you create Label + ErrorText atoms; otherwise inline

export function FormField({ label, error, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export default FormField
```

**Commit:** `feat(molecules): add FormField (label + input + error)`

### Task 3.2: FilterChip molecule

**Files:** Same pattern. Test: renders label, selected variant, click handler, disabled state.

**Implementation:**
```jsx
// src/components/molecules/FilterChip.jsx
export function FilterChip({ selected = false, onClick, children, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
        selected
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

export default FilterChip
```

**Commit:** `feat(molecules): add FilterChip (selectable pill)`

### Task 3.3: MemberPicker molecule

**Files:** Same pattern. Test: renders members, selected state, click handler, displays initials.

**Implementation:**
```jsx
// src/components/molecules/MemberPicker.jsx
import { Avatar } from '../atoms'

export function MemberPicker({ members, selectedId, onSelect, currentUserId, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-1.5 px-1 ${className}`}>
      {members.map(m => {
        const isMe = m.user_id === currentUserId
        const selected = m.user_id === selectedId
        const label = isMe ? 'Kamu' : `User ${(m.user_id || '').substring(0, 6)}`
        return (
          <button
            key={m.id}
            onClick={() => onSelect?.(m.user_id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              selected
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default MemberPicker
```

**Commit:** `feat(molecules): add MemberPicker (chip selector)`

### Task 3.4: TabBar molecule

**Files:** Same pattern. Test: renders tabs, active state, click handler.

**Implementation:**
```jsx
// src/components/molecules/TabBar.jsx
export function TabBar({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1 ${className}`}>
      {tabs.map(tab => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            onClick={() => onChange?.(tab.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
              active ? 'bg-white shadow-sm' : 'text-gray-500'
            } ${tab.activeColor || 'text-indigo-600'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export default TabBar
```

**Commit:** `feat(molecules): add TabBar (segmented control)`

### Task 3.5: ConfirmDialog molecule

**Files:** Same pattern. Test: renders title/message, onConfirm click, onClose, loading disables buttons, danger variant styling.

**Implementation:** Wrap existing `ConfirmModal` logic in a thinner molecule (or keep as-is in organisms/modals — see note below).

> **Note:** ConfirmModal is already an organism (uses ConfirmModal from lucide, manages focus, etc.). If it's a true molecule, extract the title+message+buttons into ConfirmDialog and let organisms/modals/ConfirmModal add the modal chrome. If too complex, skip — keep ConfirmModal as organism, no molecule equivalent.

**Decision point:** If extraction is clean (just title/message/buttons/handlers with no modal chrome), create ConfirmDialog molecule. Otherwise skip and keep ConfirmModal as organism. **Recommend skip for now** — YAGNI.

**If skipped:** No task 3.5 needed.

### Task 3.6: MonthPicker molecule (move from current `src/components/MonthPicker.jsx`)

**Files:**
- Create: `src/components/molecules/MonthPicker.jsx` (move from `src/components/MonthPicker.jsx`)
- Create: `src/components/molecules/MonthPicker.test.jsx`
- Modify: `src/components/molecules/index.js`
- Delete: `src/components/MonthPicker.jsx` (after imports updated)

**Step 1:** Write test
```jsx
// src/components/molecules/MonthPicker.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthPicker } from './MonthPicker'

describe('MonthPicker', () => {
  it('renders current month label', () => {
    render(<MonthPicker value="2026-01" onChange={() => {}} />)
    expect(screen.getByText(/Januari 2026/)).toBeInTheDocument()
  })

  it('calls onChange with previous month when back clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MonthPicker value="2026-03" onChange={onChange} />)
    await user.click(screen.getByLabelText('Bulan sebelumnya'))
    expect(onChange).toHaveBeenCalledWith('2026-02')
  })

  it('calls onChange with next month when forward clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MonthPicker value="2026-03" onChange={onChange} />)
    await user.click(screen.getByLabelText('Bulan berikutnya'))
    expect(onChange).toHaveBeenCalledWith('2026-04')
  })
})
```

> **Note:** Adjust the button labels/aria-labels to match the actual MonthPicker component after reading it. Run the test against the current code first (before refactor) to verify the test is sane, then move the file.

**Step 2:** Run test against current location first (sanity)
```bash
cd /opt/data/finance-app
# Temporarily move file to test
cp src/components/MonthPicker.jsx src/components/molecules/MonthPicker.jsx
# Update internal import paths if any
# Run test
npm test -- MonthPicker
```
If passes, great. Then in Task 4.x we'll delete the old location.

**Step 3:** Add to barrel
```js
// src/components/molecules/index.js
export { MonthPicker } from './MonthPicker'
```

**Step 4:** Commit
```bash
git add src/components/molecules/MonthPicker.jsx src/components/molecules/MonthPicker.test.jsx src/components/molecules/index.js
git commit -m "feat(molecules): add MonthPicker (moved from components/)"
```

**Step 5:** Update import in `src/pages/TransactionsPageInner.jsx`, `src/pages/HouseholdTransactionsPage.jsx` to use new path
```bash
cd /opt/data/finance-app
grep -l "from '../components/MonthPicker'" src/
```
Edit each found file: `'../components/MonthPicker'` → `'../components/molecules/MonthPicker'`

**Step 6:** Delete old file
```bash
rm src/components/MonthPicker.jsx
```

**Step 7:** Build + test verify
```bash
npm run build 2>&1 | tail -3
npm test 2>&1 | tail -5
```

**Step 8:** Commit
```bash
git add -A
git commit -m "refactor: migrate MonthPicker import to molecules/ path"
git push
```

### Task 3.7: Verify all molecule tests pass

```bash
cd /opt/data/finance-app
npm test 2>&1 | tail -10
npm run build 2>&1 | tail -5
```

---

## Phase 4: Move Existing Components to Organisms

Big rename sweep. Build + import must stay green at every step.

### Task 4.1: Create organism subfolders

```bash
cd /opt/data/finance-app
mkdir -p src/components/organisms/header src/components/organisms/forms \
         src/components/organisms/list src/components/organisms/cards \
         src/components/organisms/banners src/components/organisms/household \
         src/components/organisms/modals
```

### Task 4.2: Move Header + Layout (organisms/header/)

**Step 1:** Use `git mv` to preserve history
```bash
cd /opt/data/finance-app
git mv src/components/Header.jsx src/components/organisms/header/Header.jsx
git mv src/components/Layout.jsx src/components/organisms/header/Layout.jsx
```

**Step 2:** Update internal imports
```bash
cd /opt/data/finance-app
grep -n "from '\.\./components/Header'\|from '\.\./components/Layout'" src/ -r
```
Fix each found import to new path.

**Step 3:** Build verify
```bash
cd /opt/data/finance-app
npm run build 2>&1 | tail -5
```
Expected: green.

**Step 4:** Commit
```bash
git add -A
git commit -m "refactor(organisms): move Header + Layout to organisms/header/"
git push
```

### Task 4.3: Move forms (organisms/forms/)

```bash
cd /opt/data/finance-app
git mv src/components/TransactionForm.jsx src/components/organisms/forms/TransactionForm.jsx
git mv src/components/HouseholdTransactionForm.jsx src/components/organisms/forms/HouseholdTransactionForm.jsx
git mv src/components/TransferForm.jsx src/components/organisms/forms/TransferForm.jsx
```
Update internal imports in moved files (`from './MonthPicker'` → `from '../../molecules/MonthPicker'` — wait, this is a forward reference since MonthPicker is in molecules/ already, so the path becomes `../molecules/MonthPicker` from organisms/forms/).

Then update consumers (pages) imports:
- `'../components/TransactionForm'` → `'../components/organisms/forms/TransactionForm'`
- (etc for all 3)

Verify build, commit, push.

**Commit:** `refactor(organisms): move forms to organisms/forms/`

### Task 4.4: Move list items (organisms/list/)

```bash
cd /opt/data/finance-app
git mv src/components/TransactionItem.jsx src/components/organisms/list/TransactionItem.jsx
git mv src/components/HouseholdTransactionItem.jsx src/components/organisms/list/HouseholdTransactionItem.jsx
git mv src/components/MemberList.jsx src/components/organisms/list/MemberList.jsx
```
Update internal imports (e.g., `'./ConfirmModal'` → `'../modals/ConfirmModal'`, `'./Avatar'` not yet, etc.).

Update consumer imports.

Verify build, commit, push.

**Commit:** `refactor(organisms): move list items to organisms/list/`

### Task 4.5: Move cards (organisms/cards/)

```bash
cd /opt/data/finance-app
git mv src/components/BalanceCard.jsx src/components/organisms/cards/BalanceCard.jsx
git mv src/components/HouseholdSummaryCard.jsx src/components/organisms/cards/HouseholdSummaryCard.jsx
git mv src/components/HouseholdWalletBalanceCard.jsx src/components/organisms/cards/HouseholdWalletBalanceCard.jsx
git mv src/components/SummaryCard.jsx src/components/organisms/cards/SummaryCard.jsx
```
Update imports, verify build, commit, push.

**Commit:** `refactor(organisms): move cards to organisms/cards/`

### Task 4.6: Move banners (organisms/banners/)

```bash
cd /opt/data/finance-app
git mv src/components/InstallBanner.jsx src/components/organisms/banners/InstallBanner.jsx
git mv src/components/OfflineBanner.jsx src/components/organisms/banners/OfflineBanner.jsx
git mv src/components/PendingInviteBanner.jsx src/components/organisms/banners/PendingInviteBanner.jsx
```
Update imports, verify build, commit, push.

**Commit:** `refactor(organisms): move banners to organisms/banners/`

### Task 4.7: Move household-specific (organisms/household/)

```bash
cd /opt/data/finance-app
git mv src/components/HouseholdCategoriesTab.jsx src/components/organisms/household/HouseholdCategoriesTab.jsx
```
Update imports, verify build, commit, push.

**Commit:** `refactor(organisms): move HouseholdCategoriesTab to organisms/household/`

### Task 4.8: Move modals (organisms/modals/)

```bash
cd /opt/data/finance-app
git mv src/components/AcceptInviteModal.jsx src/components/organisms/modals/AcceptInviteModal.jsx
git mv src/components/AddHouseholdWalletModal.jsx src/components/organisms/modals/AddHouseholdWalletModal.jsx
git mv src/components/ConfirmModal.jsx src/components/organisms/modals/ConfirmModal.jsx
git mv src/components/CreateHouseholdModal.jsx src/components/organisms/modals/CreateHouseholdModal.jsx
git mv src/components/InviteMemberModal.jsx src/components/organisms/modals/InviteMemberModal.jsx
```
Update imports (ConfirmModal referenced from organisms/list/TransactionItem.jsx and HouseholdTransactionItem.jsx and MemberList.jsx — change path accordingly), verify build, commit, push.

**Commit:** `refactor(organisms): move modals to organisms/modals/`

### Task 4.9: Add barrel exports for organisms

**Files:** Modify `src/components/organisms/index.js`

```js
// Organisms — domain-aware UI sections
export { Header, Layout } from './header'
export { TransactionForm, HouseholdTransactionForm, TransferForm } from './forms'
export { TransactionItem, HouseholdTransactionItem, MemberList } from './list'
export { BalanceCard, HouseholdSummaryCard, HouseholdWalletBalanceCard, SummaryCard } from './cards'
export { InstallBanner, OfflineBanner, PendingInviteBanner } from './banners'
export { HouseholdCategoriesTab } from './household'
export { AcceptInviteModal, AddHouseholdWalletModal, ConfirmModal, CreateHouseholdModal, InviteMemberModal } from './modals'
```

**Step 1:** Create per-subfolder index.js files too (or export directly). Recommendation: create per-subfolder index.js for clean barrel chain.

**Step 2:** Verify build
```bash
cd /opt/data/finance-app
npm run build 2>&1 | tail -5
```

**Step 3:** Commit
```bash
git add src/components/organisms/
git commit -m "feat(organisms): add barrel exports"
git push
```

### Task 4.10: Verify `src/components/` flat is empty (or contains only atomic folders)

```bash
cd /opt/data/finance-app
ls src/components/
```
Expected: `atoms  molecules  organisms` (no .jsx files at top level).

If anything left, move it.

### Task 4.11: Final Phase 4 verification

```bash
cd /opt/data/finance-app
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -5
```
Both must be green. No commit (already done incrementally).

---

## Phase 5: Replace Inline Usage with Atoms

This phase is **best-effort**. Goal: replace the most repeated inline patterns with atoms. Not exhaustive — focus on:
- Button replacements in TransactionItem, TransactionForm, HouseholdTransactionForm, TransferForm, MemberList, modals
- Badge replacements in TransactionItem
- Avatar replacements in MemberList
- Switch replacement in MemberList (already uses inline switch)
- Input/Select/Textarea replacements in TransactionForm, HouseholdTransactionForm, TransferForm

### Task 5.1: Replace inline buttons in TransactionItem

**Files:** Modify `src/components/organisms/list/TransactionItem.jsx`

**Step 1:** Read current file, identify all `<button>` elements and their classes

**Step 2:** Replace each with `<Button>` from atoms. Map:
- Delete button (red ghost) → `<Button variant="ghost" size="sm" className="text-red-500"><Trash2 /></Button>` (or keep icon-only as-is if it requires special sizing)

> **Note:** Some buttons in TransactionItem are icon-only or have very specific sizing. Replace only where the atom fits cleanly. Otherwise leave inline.

**Step 3:** Add import: `import { Button } from '../../atoms'`

**Step 4:** Build + verify
```bash
cd /opt/data/finance-app
npm run build 2>&1 | tail -3
```

**Step 5:** Commit
```bash
git add src/components/organisms/list/TransactionItem.jsx
git commit -m "refactor(organisms): use Button atom in TransactionItem"
git push
```

### Task 5.2: Replace badges in TransactionItem

**Files:** Modify `src/components/organisms/list/TransactionItem.jsx`

Replace inline `<span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-X-Y-X-Y">` with `<Badge color="X">`.

### Task 5.3: Replace avatar in MemberList

**Files:** Modify `src/components/organisms/list/MemberList.jsx`

Replace inline avatar `<div className="w-9 h-9 rounded-full bg-indigo-100 ...">` with `<Avatar seed={m.user_id} color={isTargetAdmin ? 'amber' : 'indigo'} />`.

### Task 5.4: Replace switch in MemberList

**Files:** Modify `src/components/organisms/list/MemberList.jsx`

Replace inline `<button role="switch" ...>` with `<Switch checked={shareOn} onChange={() => handleToggleShare(m)} disabled={!isMe} />`.

### Task 5.5: Replace inputs in TransactionForm

**Files:** Modify `src/components/organisms/forms/TransactionForm.jsx`

Replace `<input>`, `<select>`, `<textarea>` with `<Input>`, `<Select>`, `<Textarea>` atoms. Wrap each in `<FormField label="..." required>`.

### Task 5.6: Repeat 5.5 for HouseholdTransactionForm and TransferForm

Same pattern. Test build after each.

### Task 5.7: Final Phase 5 build + test verify

```bash
cd /opt/data/finance-app
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

---

## Phase 6: Cleanup + Smoke Test

### Task 6.1: Add design tokens documentation (optional)

**Files:** Create `docs/design-tokens.md` (optional but recommended)

Document the design system:
- Colors: indigo (primary), green (income), red (expense), purple (shared), amber (admin), gray (neutral)
- Spacing: uses Tailwind defaults
- Typography: text-xs (badges), text-sm (body), text-base (headings)
- Component variants: Button (primary, secondary, danger, ghost), Badge (green, red, blue, purple, amber, gray), Switch, etc.

**Commit:** `docs: document design system tokens and component variants`

### Task 6.2: Run full test suite + coverage

```bash
cd /opt/data/finance-app
npm test -- --coverage
```
Expected: atoms + molecules fully covered. Organisms not covered (acceptable).

### Task 6.3: Manual smoke test

Test on deployed preview (Vercel auto-deploys on every push):
1. Login + logout
2. Dashboard renders
3. Create wallet, category
4. Add income + expense (personal)
5. Add transfer
6. Switch to household scope
7. Household dashboard
8. Add household transaction
9. Toggle share preference (MemberList)
10. View shared tab in household
11. Settings, scan page, analysis page

Document any visual regression. If atom replacement caused issues, revert specific atom usage in Phase 5.

### Task 6.4: Final commit + PR

```bash
cd /opt/data/finance-app
git status  # must be clean
git log --oneline | head -50  # review commit history
gh pr create --base main --title "refactor: atomic design restructure" --body "..."
```

**PR body should include:**
- Summary of phases
- Migration notes (Dexie reset for users, no other breaking changes)
- Test coverage report
- Smoke test results

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Import path breakage | Run build after every task in Phase 4; revert if red |
| Atom usage breaks visual design | Phase 5 is best-effort; revert per-file if visual regression |
| Vitest infra conflicts with Vite | Use Vitest's Vite-native mode (no separate config needed) |
| Barrel exports hurt tree-shaking | Use barrels only for atoms + molecules; direct paths for organisms (or measure with `vite build` output) |
| Tests slow CI | Run only `npm test` (not `test:coverage`) in CI; coverage is local |
| Big PR is hard to review | Each task = 1 commit, PR is ~50 commits; reviewer can check phase by phase |

---

## Definition of Done

- [ ] Branch `refactor/atomic-design` created and pushed
- [ ] All 8 atoms implemented with tests passing
- [ ] All 6 molecules implemented with tests passing
- [ ] All 23 organisms moved (and pages/hooks updated to new paths)
- [ ] Build green at every commit
- [ ] Manual smoke test passed
- [ ] `npm test` green
- [ ] `npm run build` green
- [ ] PR opened to main with description

---

## Notes

- **Hooks stay in `src/hooks/`** for now. YAGNI. If feature-specific hooks grow, refactor to `src/features/<x>/hooks/` in a future plan.
- **Templates skipped.** No shared page skeletons to extract yet. YAGNI.
- **ConfirmDialog skipped.** ConfirmModal is already an organism; extracting a "thinner" molecule doesn't add value.
- **No per-organism tests.** Covered by smoke + build. If specific organisms become bug-prone, add tests in a follow-up.
- **Barrel exports everywhere.** Cleaner imports, acceptable bundle trade-off for this size. If bundle becomes an issue, remove barrels for organisms and use direct paths.

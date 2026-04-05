# Claw E2E Testing with Playwright

End-to-end testing suite for the Claw web interface using Microsoft's Playwright framework.

## Quick Start

```bash
cd e2e

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm test

# Run tests in headed mode (visible browser)
npm run test:headed

# Run smoke tests only
npm run test:smoke

# Open interactive test UI
npm run test:ui

# Generate code by recording actions
npm run codegen
```

## Project Structure

```
e2e/
├── playwright.config.ts     # Main Playwright configuration
├── package.json             # Node.js dependencies
├── tests/
│   ├── fixtures.ts         # Custom test fixtures and helpers
│   ├── smoke.spec.ts       # Critical path smoke tests
│   ├── chat.spec.ts        # Chat functionality tests
│   ├── providers.spec.ts   # Provider selection tests
│   ├── tools.spec.ts       # Tool execution tests
│   └── visual.spec.ts      # Visual regression tests
└── playwright-report/        # Generated test reports (gitignored)
```

## Configuration

### Playwright Config (`playwright.config.ts`)

The configuration includes:
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile Viewports**: Pixel 5, iPhone 13
- **WebServer**: Automatically starts the Rust backend
- **Tracing**: Enabled on test failure for debugging

### Test Categories

| Tag | Description | Command |
|-----|-------------|---------|
| `@smoke` | Critical path tests | `npx playwright test --grep @smoke` |
| *(none)* | Full test suite | `npx playwright test` |

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from './fixtures';

test('should do something', async ({ page }) => {
  await page.goto('/');
  await page.fill('textarea', 'Hello');
  await page.press('textarea', 'Enter');
  await expect(page.locator('.message')).toContainText('Hello');
});
```

### Using Custom Fixtures

```typescript
import { test, expect } from './fixtures';

test('should send message', async ({ sendMessage, waitForResponse }) => {
  await sendMessage('Hello Claw!');
  const response = await waitForResponse();
  expect(response).toContain('Claw');
});
```

## CI/CD Integration

Tests run automatically on:
- ✅ Push to `main`
- ✅ Pull requests to `main`
- 🔘 Manual workflow dispatch

### GitHub Actions

The workflow (`.github/workflows/e2e.yml`):
1. Sets up Rust toolchain
2. Installs Node.js and Playwright
3. Installs system dependencies
4. Runs tests across multiple browsers
5. Uploads test reports as artifacts

### Viewing Reports

After CI runs, download the artifact and run:

```bash
npx playwright show-report
```

## Test Utilities

### Fixtures (`fixtures.ts`)

Available fixtures:
- `clawPage`: Pre-initialized page
- `sendMessage(message: string, provider?)`: Send a chat message
- `waitForResponse()`: Wait for assistant response
- `clearChat()`: Clear current chat
- `switchProvider(provider)`: Switch AI provider

### Best Practices

1. **Use data-testid attributes** for reliable selectors
2. **Prefer user-facing locators** over implementation details
3. **Use fixtures** for common setup patterns
4. **Add `@smoke` tag** for critical path tests
5. **Include visual tests** for UI components

## Debugging Failed Tests

1. **View Trace**:
   ```bash
   npx playwright show-report
   # or
   npx playwright trace-viewer test-results/trace.zip
   ```

2. **Run in Debug Mode**:
   ```bash
   npx playwright test --debug
   ```

3. **Review Screenshots/Videos**:
   - Automatically captured on failure
   - Found in `test-results/`

## Troubleshooting

### Browser Launch Failed

```bash
# Reinstall browsers
npx playwright install --with-deps
```

### Tests Timeout

Increase timeout in `playwright.config.ts`:
```typescript
timeout: 60_000, // 60 seconds
```

### WebSocket Errors

Ensure the Rust backend is running:
```bash
cargo run --bin goddess-claw
```

## Contributing

1. Add `data-testid` attributes for critical UI elements
2. Tag critical tests with `@smoke`
3. Update this README when adding new functionality
4. Follow existing code style in test files

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/locators)
- [Test Configuration](https://playwright.dev/docs/test-configuration)

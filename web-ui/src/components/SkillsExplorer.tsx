import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  FileText,
  Sparkles,
  Crown,
  Bot,
  Code2,
  Shield,
  TrendingUp,
  DollarSign,
  Briefcase,
  BookOpen,
  Target,
  Database,
  Globe,
  Paintbrush,
  Server,
  Smartphone,
  Users,
  HeartPulse,
  GraduationCap,
  Scale,
  Wrench,
  Gamepad2,
  Languages,
} from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { cn } from '@/utils/cn'

interface Skill {
  name: string
  path: string
  category: string
  description?: string
  icon?: string
}

const SKILL_CATEGORIES = [
  { id: 'engineering', name: 'Engineering', icon: Code2, color: 'text-blue-400' },
  { id: 'frontend', name: 'Frontend', icon: Paintbrush, color: 'text-pink-400' },
  { id: 'backend', name: 'Backend', icon: Server, color: 'text-indigo-400' },
  { id: 'database', name: 'Database', icon: Database, color: 'text-teal-400' },
  { id: 'devops', name: 'DevOps & Infra', icon: Wrench, color: 'text-slate-400' },
  { id: 'mobile', name: 'Mobile', icon: Smartphone, color: 'text-violet-400' },
  { id: 'security', name: 'Security', icon: Shield, color: 'text-red-400' },
  { id: 'testing', name: 'Testing & QA', icon: Target, color: 'text-lime-400' },
  { id: 'data', name: 'Data & ML', icon: Bot, color: 'text-sky-400' },
  { id: 'web3', name: 'Web3 & Blockchain', icon: Globe, color: 'text-yellow-400' },
  { id: 'marketing', name: 'Marketing', icon: TrendingUp, color: 'text-green-400' },
  { id: 'product', name: 'Product', icon: Target, color: 'text-purple-400' },
  { id: 'c-level', name: 'C-Level', icon: Crown, color: 'text-amber-400' },
  { id: 'business', name: 'Business', icon: Briefcase, color: 'text-cyan-400' },
  { id: 'finance', name: 'Finance', icon: DollarSign, color: 'text-emerald-400' },
  { id: 'legal', name: 'Legal & Compliance', icon: Scale, color: 'text-orange-400' },
  { id: 'hr', name: 'HR & People', icon: Users, color: 'text-rose-400' },
  { id: 'health', name: 'Healthcare', icon: HeartPulse, color: 'text-red-300' },
  { id: 'education', name: 'Education', icon: GraduationCap, color: 'text-blue-300' },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2, color: 'text-fuchsia-400' },
  { id: 'i18n', name: 'i18n & Localization', icon: Languages, color: 'text-amber-300' },
  { id: 'agents', name: 'AI Agents', icon: Bot, color: 'text-pink-400' },
  { id: 'commands', name: 'Commands', icon: Zap, color: 'text-orange-400' },
]

// 300+ skills library
const MOCK_SKILLS: Skill[] = [
  // ── Engineering (25) ──────────────────────────────────────
  { name: 'code-reviewer', path: 'code-reviewer.md', category: 'engineering', description: 'Comprehensive code review with best practices' },
  { name: 'refactor-engine', path: 'refactor-engine.md', category: 'engineering', description: 'Intelligent code refactoring and cleanup' },
  { name: 'architecture-advisor', path: 'architecture-advisor.md', category: 'engineering', description: 'System architecture design and review' },
  { name: 'api-designer', path: 'api-designer.md', category: 'engineering', description: 'REST/GraphQL API design and documentation' },
  { name: 'performance-profiler', path: 'performance-profiler.md', category: 'engineering', description: 'Code performance analysis and optimization' },
  { name: 'dependency-auditor', path: 'dependency-auditor.md', category: 'engineering', description: 'Package dependency analysis and updates' },
  { name: 'code-documenter', path: 'code-documenter.md', category: 'engineering', description: 'Auto-generate code documentation and comments' },
  { name: 'git-expert', path: 'git-expert.md', category: 'engineering', description: 'Git workflow, rebasing, conflict resolution' },
  { name: 'monorepo-architect', path: 'monorepo-architect.md', category: 'engineering', description: 'Monorepo setup with Turborepo/Nx/Lerna' },
  { name: 'microservices-designer', path: 'microservices-designer.md', category: 'engineering', description: 'Microservices architecture patterns' },
  { name: 'design-patterns', path: 'design-patterns.md', category: 'engineering', description: 'GoF and modern design pattern implementation' },
  { name: 'clean-code', path: 'clean-code.md', category: 'engineering', description: 'Clean code principles and SOLID enforcement' },
  { name: 'tech-debt-analyzer', path: 'tech-debt-analyzer.md', category: 'engineering', description: 'Identify and prioritize technical debt' },
  { name: 'migration-planner', path: 'migration-planner.md', category: 'engineering', description: 'Plan and execute code/framework migrations' },
  { name: 'code-generator', path: 'code-generator.md', category: 'engineering', description: 'Scaffold boilerplate code from templates' },
  { name: 'regex-builder', path: 'regex-builder.md', category: 'engineering', description: 'Build and test complex regular expressions' },
  { name: 'algorithm-optimizer', path: 'algorithm-optimizer.md', category: 'engineering', description: 'Algorithm analysis and Big-O optimization' },
  { name: 'concurrency-expert', path: 'concurrency-expert.md', category: 'engineering', description: 'Multi-threading, async patterns, race conditions' },
  { name: 'memory-profiler', path: 'memory-profiler.md', category: 'engineering', description: 'Memory leak detection and optimization' },
  { name: 'build-optimizer', path: 'build-optimizer.md', category: 'engineering', description: 'Build system optimization (webpack, vite, esbuild)' },
  { name: 'open-source-advisor', path: 'open-source-advisor.md', category: 'engineering', description: 'OSS contribution, licensing, community building' },
  { name: 'changelog-generator', path: 'changelog-generator.md', category: 'engineering', description: 'Auto-generate changelogs from commits' },
  { name: 'pair-programmer', path: 'pair-programmer.md', category: 'engineering', description: 'Interactive pair programming assistant' },
  { name: 'code-translator', path: 'code-translator.md', category: 'engineering', description: 'Translate code between programming languages' },
  { name: 'error-debugger', path: 'error-debugger.md', category: 'engineering', description: 'Stack trace analysis and error resolution' },

  // ── Frontend (25) ─────────────────────────────────────────
  { name: 'react-expert', path: 'react-expert.md', category: 'frontend', description: 'React hooks, patterns, and performance' },
  { name: 'nextjs-architect', path: 'nextjs-architect.md', category: 'frontend', description: 'Next.js app router, SSR, ISR strategies' },
  { name: 'vue-specialist', path: 'vue-specialist.md', category: 'frontend', description: 'Vue 3 composition API and ecosystem' },
  { name: 'svelte-expert', path: 'svelte-expert.md', category: 'frontend', description: 'SvelteKit and Svelte 5 runes' },
  { name: 'angular-architect', path: 'angular-architect.md', category: 'frontend', description: 'Angular signals, standalone components' },
  { name: 'tailwind-designer', path: 'tailwind-designer.md', category: 'frontend', description: 'Tailwind CSS utility-first design system' },
  { name: 'css-architect', path: 'css-architect.md', category: 'frontend', description: 'Advanced CSS, Grid, animations, variables' },
  { name: 'typescript-guru', path: 'typescript-guru.md', category: 'frontend', description: 'Advanced TypeScript types and patterns' },
  { name: 'state-management', path: 'state-management.md', category: 'frontend', description: 'Zustand, Redux, Jotai, MobX patterns' },
  { name: 'component-library', path: 'component-library.md', category: 'frontend', description: 'Build reusable component libraries' },
  { name: 'a11y-expert', path: 'a11y-expert.md', category: 'frontend', description: 'WCAG compliance and accessibility audit' },
  { name: 'animation-designer', path: 'animation-designer.md', category: 'frontend', description: 'Framer Motion, GSAP, CSS animations' },
  { name: 'pwa-builder', path: 'pwa-builder.md', category: 'frontend', description: 'Progressive Web App setup and optimization' },
  { name: 'webgl-3d', path: 'webgl-3d.md', category: 'frontend', description: 'Three.js, WebGL, 3D web experiences' },
  { name: 'forms-expert', path: 'forms-expert.md', category: 'frontend', description: 'Complex form handling with validation' },
  { name: 'i18n-frontend', path: 'i18n-frontend.md', category: 'frontend', description: 'Frontend internationalization setup' },
  { name: 'seo-technical', path: 'seo-technical.md', category: 'frontend', description: 'Technical SEO, meta tags, structured data' },
  { name: 'landing-page-builder', path: 'landing-page-builder.md', category: 'frontend', description: 'High-converting landing page design' },
  { name: 'dashboard-designer', path: 'dashboard-designer.md', category: 'frontend', description: 'Admin dashboard layouts and data viz' },
  { name: 'email-template', path: 'email-template.md', category: 'frontend', description: 'Responsive HTML email templates' },
  { name: 'astro-expert', path: 'astro-expert.md', category: 'frontend', description: 'Astro static site and islands architecture' },
  { name: 'remix-specialist', path: 'remix-specialist.md', category: 'frontend', description: 'Remix loaders, actions, and nested routes' },
  { name: 'storybook-expert', path: 'storybook-expert.md', category: 'frontend', description: 'Storybook component documentation' },
  { name: 'figma-to-code', path: 'figma-to-code.md', category: 'frontend', description: 'Convert Figma designs to production code' },
  { name: 'web-vitals', path: 'web-vitals.md', category: 'frontend', description: 'Core Web Vitals optimization (LCP, CLS, INP)' },

  // ── Backend (25) ──────────────────────────────────────────
  { name: 'nodejs-architect', path: 'nodejs-architect.md', category: 'backend', description: 'Node.js scalability, streams, clustering' },
  { name: 'python-expert', path: 'python-expert.md', category: 'backend', description: 'Python best practices, FastAPI, Django' },
  { name: 'rust-engineer', path: 'rust-engineer.md', category: 'backend', description: 'Rust ownership, lifetimes, async runtime' },
  { name: 'go-specialist', path: 'go-specialist.md', category: 'backend', description: 'Go concurrency, interfaces, microservices' },
  { name: 'java-architect', path: 'java-architect.md', category: 'backend', description: 'Spring Boot, JVM tuning, enterprise Java' },
  { name: 'csharp-expert', path: 'csharp-expert.md', category: 'backend', description: 'C# .NET Core, LINQ, async patterns' },
  { name: 'graphql-expert', path: 'graphql-expert.md', category: 'backend', description: 'GraphQL schema design and resolvers' },
  { name: 'grpc-specialist', path: 'grpc-specialist.md', category: 'backend', description: 'gRPC service design and protobuf' },
  { name: 'websocket-expert', path: 'websocket-expert.md', category: 'backend', description: 'Real-time WebSocket architecture' },
  { name: 'queue-architect', path: 'queue-architect.md', category: 'backend', description: 'Message queues: RabbitMQ, Kafka, SQS' },
  { name: 'caching-expert', path: 'caching-expert.md', category: 'backend', description: 'Redis, Memcached, CDN caching strategies' },
  { name: 'auth-specialist', path: 'auth-specialist.md', category: 'backend', description: 'OAuth2, JWT, SAML, SSO implementation' },
  { name: 'file-upload', path: 'file-upload.md', category: 'backend', description: 'File upload, S3, multipart, streaming' },
  { name: 'rate-limiter', path: 'rate-limiter.md', category: 'backend', description: 'Rate limiting and throttling strategies' },
  { name: 'search-engine', path: 'search-engine.md', category: 'backend', description: 'Elasticsearch, Meilisearch, full-text search' },
  { name: 'email-service', path: 'email-service.md', category: 'backend', description: 'Transactional email with SendGrid/SES' },
  { name: 'payment-integration', path: 'payment-integration.md', category: 'backend', description: 'Stripe, PayPal payment processing' },
  { name: 'webhook-handler', path: 'webhook-handler.md', category: 'backend', description: 'Webhook design, verification, retry logic' },
  { name: 'cron-scheduler', path: 'cron-scheduler.md', category: 'backend', description: 'Job scheduling, background tasks, workers' },
  { name: 'logging-expert', path: 'logging-expert.md', category: 'backend', description: 'Structured logging, log aggregation' },
  { name: 'serverless-architect', path: 'serverless-architect.md', category: 'backend', description: 'AWS Lambda, Vercel, Cloudflare Workers' },
  { name: 'event-driven', path: 'event-driven.md', category: 'backend', description: 'Event sourcing and CQRS patterns' },
  { name: 'api-versioning', path: 'api-versioning.md', category: 'backend', description: 'API versioning and deprecation strategies' },
  { name: 'pdf-generator', path: 'pdf-generator.md', category: 'backend', description: 'PDF generation and document processing' },
  { name: 'elixir-phoenix', path: 'elixir-phoenix.md', category: 'backend', description: 'Elixir/Phoenix LiveView real-time apps' },

  // ── Database (20) ─────────────────────────────────────────
  { name: 'postgresql-expert', path: 'postgresql-expert.md', category: 'database', description: 'PostgreSQL queries, indexes, extensions' },
  { name: 'mysql-optimizer', path: 'mysql-optimizer.md', category: 'database', description: 'MySQL query optimization and tuning' },
  { name: 'mongodb-architect', path: 'mongodb-architect.md', category: 'database', description: 'MongoDB schema design and aggregation' },
  { name: 'redis-specialist', path: 'redis-specialist.md', category: 'database', description: 'Redis data structures and caching patterns' },
  { name: 'prisma-expert', path: 'prisma-expert.md', category: 'database', description: 'Prisma ORM schema and migration management' },
  { name: 'drizzle-orm', path: 'drizzle-orm.md', category: 'database', description: 'Drizzle ORM type-safe queries' },
  { name: 'supabase-builder', path: 'supabase-builder.md', category: 'database', description: 'Supabase auth, storage, real-time' },
  { name: 'firebase-expert', path: 'firebase-expert.md', category: 'database', description: 'Firebase/Firestore rules and design' },
  { name: 'sql-optimizer', path: 'sql-optimizer.md', category: 'database', description: 'SQL query optimization and EXPLAIN analysis' },
  { name: 'database-migration', path: 'database-migration.md', category: 'database', description: 'Safe database migration strategies' },
  { name: 'data-modeling', path: 'data-modeling.md', category: 'database', description: 'Entity relationship and data modeling' },
  { name: 'timescaledb', path: 'timescaledb.md', category: 'database', description: 'Time-series data with TimescaleDB' },
  { name: 'neo4j-graph', path: 'neo4j-graph.md', category: 'database', description: 'Neo4j graph database and Cypher queries' },
  { name: 'dynamodb-expert', path: 'dynamodb-expert.md', category: 'database', description: 'DynamoDB single-table design patterns' },
  { name: 'sqlite-specialist', path: 'sqlite-specialist.md', category: 'database', description: 'SQLite optimization for embedded use' },
  { name: 'database-sharding', path: 'database-sharding.md', category: 'database', description: 'Database sharding and partitioning' },
  { name: 'backup-recovery', path: 'backup-recovery.md', category: 'database', description: 'Database backup and disaster recovery' },
  { name: 'clickhouse-expert', path: 'clickhouse-expert.md', category: 'database', description: 'ClickHouse analytics and OLAP queries' },
  { name: 'vector-db', path: 'vector-db.md', category: 'database', description: 'Pinecone, Weaviate, pgvector for embeddings' },
  { name: 'typeorm-expert', path: 'typeorm-expert.md', category: 'database', description: 'TypeORM entities, relations, migrations' },

  // ── DevOps & Infra (20) ───────────────────────────────────
  { name: 'docker-expert', path: 'docker-expert.md', category: 'devops', description: 'Dockerfile optimization, multi-stage builds' },
  { name: 'kubernetes-architect', path: 'kubernetes-architect.md', category: 'devops', description: 'K8s deployments, services, scaling' },
  { name: 'terraform-specialist', path: 'terraform-specialist.md', category: 'devops', description: 'Infrastructure as Code with Terraform' },
  { name: 'github-actions', path: 'github-actions.md', category: 'devops', description: 'CI/CD pipeline design with GitHub Actions' },
  { name: 'aws-architect', path: 'aws-architect.md', category: 'devops', description: 'AWS service selection and architecture' },
  { name: 'gcp-engineer', path: 'gcp-engineer.md', category: 'devops', description: 'Google Cloud Platform infrastructure' },
  { name: 'azure-specialist', path: 'azure-specialist.md', category: 'devops', description: 'Azure DevOps and cloud services' },
  { name: 'nginx-config', path: 'nginx-config.md', category: 'devops', description: 'Nginx reverse proxy and load balancing' },
  { name: 'monitoring-setup', path: 'monitoring-setup.md', category: 'devops', description: 'Grafana, Prometheus, Datadog observability' },
  { name: 'cloudflare-expert', path: 'cloudflare-expert.md', category: 'devops', description: 'Cloudflare DNS, Workers, WAF, tunnels' },
  { name: 'ssl-tls-manager', path: 'ssl-tls-manager.md', category: 'devops', description: 'SSL/TLS certificates and HTTPS setup' },
  { name: 'linux-admin', path: 'linux-admin.md', category: 'devops', description: 'Linux server administration and hardening' },
  { name: 'ansible-automation', path: 'ansible-automation.md', category: 'devops', description: 'Ansible playbooks and automation' },
  { name: 'helm-charts', path: 'helm-charts.md', category: 'devops', description: 'Helm chart creation and management' },
  { name: 'cicd-pipeline', path: 'cicd-pipeline.md', category: 'devops', description: 'CI/CD best practices across platforms' },
  { name: 'vercel-deploy', path: 'vercel-deploy.md', category: 'devops', description: 'Vercel deployment and edge configuration' },
  { name: 'fly-io-expert', path: 'fly-io-expert.md', category: 'devops', description: 'Fly.io deployment and scaling' },
  { name: 'pulumi-iac', path: 'pulumi-iac.md', category: 'devops', description: 'Infrastructure as Code with Pulumi' },
  { name: 'disaster-recovery', path: 'disaster-recovery.md', category: 'devops', description: 'DR planning, failover, RTO/RPO' },
  { name: 'cost-optimizer', path: 'cost-optimizer.md', category: 'devops', description: 'Cloud cost optimization and FinOps' },

  // ── Mobile (15) ───────────────────────────────────────────
  { name: 'react-native', path: 'react-native.md', category: 'mobile', description: 'React Native cross-platform development' },
  { name: 'flutter-expert', path: 'flutter-expert.md', category: 'mobile', description: 'Flutter/Dart widget design and state' },
  { name: 'swift-ios', path: 'swift-ios.md', category: 'mobile', description: 'Swift/SwiftUI iOS app development' },
  { name: 'kotlin-android', path: 'kotlin-android.md', category: 'mobile', description: 'Kotlin/Jetpack Compose Android apps' },
  { name: 'expo-specialist', path: 'expo-specialist.md', category: 'mobile', description: 'Expo managed workflow and EAS builds' },
  { name: 'mobile-ui-patterns', path: 'mobile-ui-patterns.md', category: 'mobile', description: 'Mobile UX patterns and navigation' },
  { name: 'app-store-optimizer', path: 'app-store-optimizer.md', category: 'mobile', description: 'ASO: App Store and Play Store optimization' },
  { name: 'push-notifications', path: 'push-notifications.md', category: 'mobile', description: 'Push notification setup (FCM, APNs)' },
  { name: 'mobile-testing', path: 'mobile-testing.md', category: 'mobile', description: 'Mobile app testing and automation' },
  { name: 'offline-first', path: 'offline-first.md', category: 'mobile', description: 'Offline-first architecture and sync' },
  { name: 'capacitor-expert', path: 'capacitor-expert.md', category: 'mobile', description: 'Capacitor hybrid app development' },
  { name: 'mobile-security', path: 'mobile-security.md', category: 'mobile', description: 'Mobile app security and code signing' },
  { name: 'deep-linking', path: 'deep-linking.md', category: 'mobile', description: 'Universal links and deep linking setup' },
  { name: 'mobile-analytics', path: 'mobile-analytics.md', category: 'mobile', description: 'Mobile analytics and crash reporting' },
  { name: 'tauri-desktop', path: 'tauri-desktop.md', category: 'mobile', description: 'Tauri cross-platform desktop apps' },

  // ── Security (20) ─────────────────────────────────────────
  { name: 'security-auditor', path: 'security-auditor.md', category: 'security', description: 'Full security vulnerability assessment' },
  { name: 'owasp-scanner', path: 'owasp-scanner.md', category: 'security', description: 'OWASP Top 10 vulnerability detection' },
  { name: 'pentest-planner', path: 'pentest-planner.md', category: 'security', description: 'Penetration testing strategy and scope' },
  { name: 'xss-prevention', path: 'xss-prevention.md', category: 'security', description: 'Cross-site scripting prevention' },
  { name: 'sql-injection-guard', path: 'sql-injection-guard.md', category: 'security', description: 'SQL injection detection and prevention' },
  { name: 'csrf-protection', path: 'csrf-protection.md', category: 'security', description: 'CSRF token implementation' },
  { name: 'encryption-expert', path: 'encryption-expert.md', category: 'security', description: 'Encryption at rest and in transit' },
  { name: 'secrets-manager', path: 'secrets-manager.md', category: 'security', description: 'Secrets management with Vault/AWS SM' },
  { name: 'zero-trust', path: 'zero-trust.md', category: 'security', description: 'Zero-trust architecture implementation' },
  { name: 'compliance-checker', path: 'compliance-checker.md', category: 'security', description: 'SOC2, HIPAA, PCI-DSS compliance' },
  { name: 'container-security', path: 'container-security.md', category: 'security', description: 'Docker/K8s security scanning' },
  { name: 'api-security', path: 'api-security.md', category: 'security', description: 'API security headers and validation' },
  { name: 'supply-chain-audit', path: 'supply-chain-audit.md', category: 'security', description: 'Software supply chain security' },
  { name: 'cors-expert', path: 'cors-expert.md', category: 'security', description: 'CORS configuration and troubleshooting' },
  { name: 'csp-builder', path: 'csp-builder.md', category: 'security', description: 'Content Security Policy configuration' },
  { name: 'incident-response', path: 'incident-response.md', category: 'security', description: 'Security incident response playbook' },
  { name: 'threat-modeler', path: 'threat-modeler.md', category: 'security', description: 'STRIDE threat modeling analysis' },
  { name: 'vulnerability-triager', path: 'vulnerability-triager.md', category: 'security', description: 'CVE triage and severity assessment' },
  { name: 'devsecops', path: 'devsecops.md', category: 'security', description: 'Security in CI/CD pipelines' },
  { name: 'privacy-engineer', path: 'privacy-engineer.md', category: 'security', description: 'Privacy by design, GDPR/CCPA compliance' },

  // ── Testing & QA (20) ─────────────────────────────────────
  { name: 'playwright-pro', path: 'playwright-pro.md', category: 'testing', description: 'E2E testing with Playwright' },
  { name: 'jest-expert', path: 'jest-expert.md', category: 'testing', description: 'Jest unit testing and mocking' },
  { name: 'vitest-specialist', path: 'vitest-specialist.md', category: 'testing', description: 'Vitest fast unit testing' },
  { name: 'cypress-tester', path: 'cypress-tester.md', category: 'testing', description: 'Cypress E2E and component testing' },
  { name: 'pytest-expert', path: 'pytest-expert.md', category: 'testing', description: 'Python pytest fixtures and plugins' },
  { name: 'tdd-coach', path: 'tdd-coach.md', category: 'testing', description: 'Test-driven development methodology' },
  { name: 'load-tester', path: 'load-tester.md', category: 'testing', description: 'Load testing with k6, Artillery, JMeter' },
  { name: 'api-tester', path: 'api-tester.md', category: 'testing', description: 'API testing and contract testing' },
  { name: 'test-data-generator', path: 'test-data-generator.md', category: 'testing', description: 'Generate realistic test data and fixtures' },
  { name: 'coverage-analyzer', path: 'coverage-analyzer.md', category: 'testing', description: 'Code coverage analysis and improvement' },
  { name: 'visual-regression', path: 'visual-regression.md', category: 'testing', description: 'Visual regression testing with Percy/Chromatic' },
  { name: 'mutation-tester', path: 'mutation-tester.md', category: 'testing', description: 'Mutation testing for test quality' },
  { name: 'smoke-test-builder', path: 'smoke-test-builder.md', category: 'testing', description: 'Quick smoke test suite creation' },
  { name: 'integration-tester', path: 'integration-tester.md', category: 'testing', description: 'Integration test strategy and setup' },
  { name: 'mocking-expert', path: 'mocking-expert.md', category: 'testing', description: 'Mock services, APIs, and dependencies' },
  { name: 'testing-library', path: 'testing-library.md', category: 'testing', description: 'React Testing Library best practices' },
  { name: 'snapshot-testing', path: 'snapshot-testing.md', category: 'testing', description: 'Snapshot testing strategies' },
  { name: 'chaos-engineer', path: 'chaos-engineer.md', category: 'testing', description: 'Chaos engineering and fault injection' },
  { name: 'accessibility-tester', path: 'accessibility-tester.md', category: 'testing', description: 'Automated a11y testing with axe' },
  { name: 'qa-strategy', path: 'qa-strategy.md', category: 'testing', description: 'QA process design and test planning' },

  // ── Data & ML (20) ────────────────────────────────────────
  { name: 'ml-engineer', path: 'ml-engineer.md', category: 'data', description: 'Machine learning model development' },
  { name: 'llm-specialist', path: 'llm-specialist.md', category: 'data', description: 'LLM fine-tuning, prompting, RAG' },
  { name: 'data-pipeline', path: 'data-pipeline.md', category: 'data', description: 'ETL/ELT pipeline design' },
  { name: 'pandas-expert', path: 'pandas-expert.md', category: 'data', description: 'Pandas data analysis and transformation' },
  { name: 'data-visualization', path: 'data-visualization.md', category: 'data', description: 'Charts with D3, Plotly, Recharts' },
  { name: 'nlp-specialist', path: 'nlp-specialist.md', category: 'data', description: 'NLP: text classification, NER, sentiment' },
  { name: 'computer-vision', path: 'computer-vision.md', category: 'data', description: 'Image recognition and processing' },
  { name: 'recommendation-engine', path: 'recommendation-engine.md', category: 'data', description: 'Recommendation system design' },
  { name: 'feature-engineering', path: 'feature-engineering.md', category: 'data', description: 'Feature extraction and selection' },
  { name: 'model-deployment', path: 'model-deployment.md', category: 'data', description: 'ML model serving and deployment' },
  { name: 'prompt-engineer', path: 'prompt-engineer.md', category: 'data', description: 'Advanced prompt engineering techniques' },
  { name: 'embeddings-expert', path: 'embeddings-expert.md', category: 'data', description: 'Text/image embeddings and similarity' },
  { name: 'langchain-builder', path: 'langchain-builder.md', category: 'data', description: 'LangChain agent and chain design' },
  { name: 'rag-architect', path: 'rag-architect.md', category: 'data', description: 'Retrieval-Augmented Generation systems' },
  { name: 'a-b-testing', path: 'a-b-testing.md', category: 'data', description: 'A/B testing and statistical analysis' },
  { name: 'data-warehouse', path: 'data-warehouse.md', category: 'data', description: 'Data warehouse design (Snowflake, BigQuery)' },
  { name: 'spark-expert', path: 'spark-expert.md', category: 'data', description: 'Apache Spark big data processing' },
  { name: 'dbt-specialist', path: 'dbt-specialist.md', category: 'data', description: 'dbt data transformation and modeling' },
  { name: 'time-series', path: 'time-series.md', category: 'data', description: 'Time series forecasting and analysis' },
  { name: 'anomaly-detector', path: 'anomaly-detector.md', category: 'data', description: 'Anomaly detection algorithms' },

  // ── Web3 & Blockchain (10) ────────────────────────────────
  { name: 'solidity-expert', path: 'solidity-expert.md', category: 'web3', description: 'Solidity smart contract development' },
  { name: 'defi-architect', path: 'defi-architect.md', category: 'web3', description: 'DeFi protocol design and auditing' },
  { name: 'nft-builder', path: 'nft-builder.md', category: 'web3', description: 'NFT minting and marketplace development' },
  { name: 'web3-frontend', path: 'web3-frontend.md', category: 'web3', description: 'Web3 dApp frontend with ethers/wagmi' },
  { name: 'smart-contract-audit', path: 'smart-contract-audit.md', category: 'web3', description: 'Smart contract security auditing' },
  { name: 'hardhat-expert', path: 'hardhat-expert.md', category: 'web3', description: 'Hardhat testing and deployment' },
  { name: 'ipfs-expert', path: 'ipfs-expert.md', category: 'web3', description: 'IPFS decentralized storage integration' },
  { name: 'token-designer', path: 'token-designer.md', category: 'web3', description: 'ERC-20/721/1155 token design' },
  { name: 'dao-architect', path: 'dao-architect.md', category: 'web3', description: 'DAO governance smart contracts' },
  { name: 'blockchain-indexer', path: 'blockchain-indexer.md', category: 'web3', description: 'The Graph, blockchain data indexing' },

  // ── Marketing (20) ────────────────────────────────────────
  { name: 'seo-optimizer', path: 'seo-optimizer.md', category: 'marketing', description: 'SEO analysis and keyword optimization' },
  { name: 'content-strategist', path: 'content-strategist.md', category: 'marketing', description: 'Content calendar and strategy planning' },
  { name: 'copywriter', path: 'copywriter.md', category: 'marketing', description: 'Persuasive copy for web and ads' },
  { name: 'email-marketer', path: 'email-marketer.md', category: 'marketing', description: 'Email campaign design and automation' },
  { name: 'social-media-manager', path: 'social-media-manager.md', category: 'marketing', description: 'Social media strategy and scheduling' },
  { name: 'ppc-specialist', path: 'ppc-specialist.md', category: 'marketing', description: 'Google Ads, Meta Ads campaign optimization' },
  { name: 'analytics-expert', path: 'analytics-expert.md', category: 'marketing', description: 'GA4, Mixpanel analytics setup and analysis' },
  { name: 'conversion-optimizer', path: 'conversion-optimizer.md', category: 'marketing', description: 'CRO and funnel optimization' },
  { name: 'brand-strategist', path: 'brand-strategist.md', category: 'marketing', description: 'Brand identity and messaging framework' },
  { name: 'influencer-outreach', path: 'influencer-outreach.md', category: 'marketing', description: 'Influencer marketing campaign management' },
  { name: 'growth-hacker', path: 'growth-hacker.md', category: 'marketing', description: 'Growth experiments and viral loops' },
  { name: 'pr-specialist', path: 'pr-specialist.md', category: 'marketing', description: 'Press releases and media outreach' },
  { name: 'affiliate-manager', path: 'affiliate-manager.md', category: 'marketing', description: 'Affiliate program setup and management' },
  { name: 'community-builder', path: 'community-builder.md', category: 'marketing', description: 'Online community growth and engagement' },
  { name: 'podcast-producer', path: 'podcast-producer.md', category: 'marketing', description: 'Podcast production and distribution' },
  { name: 'video-marketer', path: 'video-marketer.md', category: 'marketing', description: 'YouTube/TikTok video marketing strategy' },
  { name: 'marketing-automation', path: 'marketing-automation.md', category: 'marketing', description: 'HubSpot, Mailchimp automation flows' },
  { name: 'customer-journey', path: 'customer-journey.md', category: 'marketing', description: 'Customer journey mapping and optimization' },
  { name: 'competitor-intel', path: 'competitor-intel.md', category: 'marketing', description: 'Competitive intelligence gathering' },
  { name: 'product-launch', path: 'product-launch.md', category: 'marketing', description: 'Product launch strategy and execution' },

  // ── Product (15) ──────────────────────────────────────────
  { name: 'product-manager', path: 'product-manager.md', category: 'product', description: 'Product strategy, RICE, roadmapping' },
  { name: 'ux-researcher', path: 'ux-researcher.md', category: 'product', description: 'User research and usability testing' },
  { name: 'ui-designer', path: 'ui-designer.md', category: 'product', description: 'UI design system and component library' },
  { name: 'product-analyst', path: 'product-analyst.md', category: 'product', description: 'Product metrics and cohort analysis' },
  { name: 'feature-prioritizer', path: 'feature-prioritizer.md', category: 'product', description: 'Feature prioritization frameworks' },
  { name: 'user-story-writer', path: 'user-story-writer.md', category: 'product', description: 'User stories and acceptance criteria' },
  { name: 'wireframe-designer', path: 'wireframe-designer.md', category: 'product', description: 'Low-fi wireframe and flow design' },
  { name: 'onboarding-designer', path: 'onboarding-designer.md', category: 'product', description: 'User onboarding flow optimization' },
  { name: 'pricing-strategist', path: 'pricing-strategist.md', category: 'product', description: 'SaaS pricing models and strategy' },
  { name: 'product-ops', path: 'product-ops.md', category: 'product', description: 'Product operations and tooling' },
  { name: 'feedback-analyzer', path: 'feedback-analyzer.md', category: 'product', description: 'User feedback analysis and themes' },
  { name: 'competitive-teardown', path: 'competitive-teardown.md', category: 'product', description: 'Competitor product teardown analysis' },
  { name: 'okr-coach', path: 'okr-coach.md', category: 'product', description: 'OKR setting and tracking methodology' },
  { name: 'scrum-master', path: 'scrum-master.md', category: 'product', description: 'Agile/Scrum ceremony facilitation' },
  { name: 'kanban-optimizer', path: 'kanban-optimizer.md', category: 'product', description: 'Kanban workflow optimization and WIP limits' },

  // ── C-Level (12) ──────────────────────────────────────────
  { name: 'ceo-advisor', path: 'ceo-advisor.md', category: 'c-level', description: 'Strategic CEO decision support' },
  { name: 'cto-advisor', path: 'cto-advisor.md', category: 'c-level', description: 'Technical strategy and architecture' },
  { name: 'cfo-advisor', path: 'cfo-advisor.md', category: 'c-level', description: 'Financial planning and budget strategy' },
  { name: 'coo-advisor', path: 'coo-advisor.md', category: 'c-level', description: 'Operations optimization and scaling' },
  { name: 'cpo-advisor', path: 'cpo-advisor.md', category: 'c-level', description: 'Product vision and portfolio strategy' },
  { name: 'cmo-advisor', path: 'cmo-advisor.md', category: 'c-level', description: 'Marketing strategy and brand positioning' },
  { name: 'cro-advisor', path: 'cro-advisor.md', category: 'c-level', description: 'Revenue operations and growth levers' },
  { name: 'ciso-advisor', path: 'ciso-advisor.md', category: 'c-level', description: 'Information security strategy' },
  { name: 'chro-advisor', path: 'chro-advisor.md', category: 'c-level', description: 'People strategy and org design' },
  { name: 'board-meeting', path: 'board-meeting.md', category: 'c-level', description: 'Board meeting prep and materials' },
  { name: 'fundraising-advisor', path: 'fundraising-advisor.md', category: 'c-level', description: 'Fundraising strategy and pitch deck' },
  { name: 'exit-strategist', path: 'exit-strategist.md', category: 'c-level', description: 'M&A and exit strategy planning' },

  // ── Business (15) ─────────────────────────────────────────
  { name: 'growth-strategist', path: 'growth-strategist.md', category: 'business', description: 'Business growth and scaling playbook' },
  { name: 'competitive-analysis', path: 'competitive-analysis.md', category: 'business', description: 'Competitor intelligence and benchmarking' },
  { name: 'business-model-canvas', path: 'business-model-canvas.md', category: 'business', description: 'Business model design and validation' },
  { name: 'pitch-deck-builder', path: 'pitch-deck-builder.md', category: 'business', description: 'Investor pitch deck creation' },
  { name: 'market-research', path: 'market-research.md', category: 'business', description: 'Market sizing and research analysis' },
  { name: 'partnership-advisor', path: 'partnership-advisor.md', category: 'business', description: 'Strategic partnerships and alliances' },
  { name: 'sales-engineer', path: 'sales-engineer.md', category: 'business', description: 'Technical sales and RFP responses' },
  { name: 'customer-success', path: 'customer-success.md', category: 'business', description: 'Customer health scoring and retention' },
  { name: 'proposal-writer', path: 'proposal-writer.md', category: 'business', description: 'Business proposal and SOW writing' },
  { name: 'swot-analyzer', path: 'swot-analyzer.md', category: 'business', description: 'SWOT analysis framework' },
  { name: 'unit-economics', path: 'unit-economics.md', category: 'business', description: 'Unit economics and LTV/CAC analysis' },
  { name: 'saas-metrics', path: 'saas-metrics.md', category: 'business', description: 'SaaS metrics dashboard and benchmarks' },
  { name: 'go-to-market', path: 'go-to-market.md', category: 'business', description: 'GTM strategy and launch planning' },
  { name: 'revenue-ops', path: 'revenue-ops.md', category: 'business', description: 'Revenue operations and pipeline analysis' },
  { name: 'franchise-planner', path: 'franchise-planner.md', category: 'business', description: 'Franchise model design and scaling' },

  // ── Finance (12) ──────────────────────────────────────────
  { name: 'financial-analyst', path: 'financial-analyst.md', category: 'finance', description: 'Financial modeling and ratio analysis' },
  { name: 'dcf-modeler', path: 'dcf-modeler.md', category: 'finance', description: 'DCF valuation and projections' },
  { name: 'budget-planner', path: 'budget-planner.md', category: 'finance', description: 'Budget planning and variance analysis' },
  { name: 'tax-advisor', path: 'tax-advisor.md', category: 'finance', description: 'Tax optimization and compliance' },
  { name: 'invoicing-expert', path: 'invoicing-expert.md', category: 'finance', description: 'Invoice generation and billing systems' },
  { name: 'expense-tracker', path: 'expense-tracker.md', category: 'finance', description: 'Expense tracking and categorization' },
  { name: 'financial-reporting', path: 'financial-reporting.md', category: 'finance', description: 'P&L, balance sheet, cash flow reports' },
  { name: 'fundraising-model', path: 'fundraising-model.md', category: 'finance', description: 'Cap table and fundraising modeling' },
  { name: 'crypto-accounting', path: 'crypto-accounting.md', category: 'finance', description: 'Cryptocurrency accounting and tracking' },
  { name: 'payroll-specialist', path: 'payroll-specialist.md', category: 'finance', description: 'Payroll processing and compliance' },
  { name: 'financial-forecaster', path: 'financial-forecaster.md', category: 'finance', description: 'Revenue and expense forecasting' },
  { name: 'stock-analyzer', path: 'stock-analyzer.md', category: 'finance', description: 'Stock analysis and portfolio management' },

  // ── Legal & Compliance (10) ───────────────────────────────
  { name: 'contract-reviewer', path: 'contract-reviewer.md', category: 'legal', description: 'Contract review and risk identification' },
  { name: 'privacy-policy', path: 'privacy-policy.md', category: 'legal', description: 'Privacy policy and ToS generation' },
  { name: 'gdpr-specialist', path: 'gdpr-specialist.md', category: 'legal', description: 'GDPR compliance assessment' },
  { name: 'ip-advisor', path: 'ip-advisor.md', category: 'legal', description: 'IP protection and patent strategy' },
  { name: 'license-checker', path: 'license-checker.md', category: 'legal', description: 'Open source license compatibility' },
  { name: 'nda-generator', path: 'nda-generator.md', category: 'legal', description: 'NDA and confidentiality agreements' },
  { name: 'employment-law', path: 'employment-law.md', category: 'legal', description: 'Employment law compliance basics' },
  { name: 'soc2-guide', path: 'soc2-guide.md', category: 'legal', description: 'SOC 2 Type II audit preparation' },
  { name: 'hipaa-advisor', path: 'hipaa-advisor.md', category: 'legal', description: 'HIPAA compliance for health tech' },
  { name: 'iso27001-guide', path: 'iso27001-guide.md', category: 'legal', description: 'ISO 27001 ISMS implementation guide' },

  // ── HR & People (10) ──────────────────────────────────────
  { name: 'recruiter', path: 'recruiter.md', category: 'hr', description: 'Job description and sourcing strategy' },
  { name: 'interview-designer', path: 'interview-designer.md', category: 'hr', description: 'Technical interview question design' },
  { name: 'culture-builder', path: 'culture-builder.md', category: 'hr', description: 'Company culture and values framework' },
  { name: 'performance-reviewer', path: 'performance-reviewer.md', category: 'hr', description: 'Performance review facilitation' },
  { name: 'compensation-analyst', path: 'compensation-analyst.md', category: 'hr', description: 'Compensation benchmarking and bands' },
  { name: 'employee-handbook', path: 'employee-handbook.md', category: 'hr', description: 'Employee handbook generation' },
  { name: 'onboarding-planner', path: 'onboarding-planner.md', category: 'hr', description: 'New hire onboarding program design' },
  { name: 'team-health-check', path: 'team-health-check.md', category: 'hr', description: 'Team health assessment and surveys' },
  { name: 'org-designer', path: 'org-designer.md', category: 'hr', description: 'Org structure and reporting design' },
  { name: 'dei-advisor', path: 'dei-advisor.md', category: 'hr', description: 'Diversity, equity, inclusion programs' },

  // ── Healthcare (8) ────────────────────────────────────────
  { name: 'ehr-integrator', path: 'ehr-integrator.md', category: 'health', description: 'EHR/EMR system integration (HL7, FHIR)' },
  { name: 'clinical-data', path: 'clinical-data.md', category: 'health', description: 'Clinical data modeling and analysis' },
  { name: 'telehealth-builder', path: 'telehealth-builder.md', category: 'health', description: 'Telehealth platform architecture' },
  { name: 'medical-device-sw', path: 'medical-device-sw.md', category: 'health', description: 'Medical device software (IEC 62304)' },
  { name: 'pharma-data', path: 'pharma-data.md', category: 'health', description: 'Pharmaceutical data pipeline design' },
  { name: 'health-ai', path: 'health-ai.md', category: 'health', description: 'Healthcare AI and diagnostic tools' },
  { name: 'patient-portal', path: 'patient-portal.md', category: 'health', description: 'Patient portal UX and security' },
  { name: 'health-compliance', path: 'health-compliance.md', category: 'health', description: 'Healthcare regulatory compliance' },

  // ── Education (8) ─────────────────────────────────────────
  { name: 'lms-builder', path: 'lms-builder.md', category: 'education', description: 'Learning management system design' },
  { name: 'curriculum-designer', path: 'curriculum-designer.md', category: 'education', description: 'Course curriculum and module design' },
  { name: 'quiz-generator', path: 'quiz-generator.md', category: 'education', description: 'Assessment and quiz creation' },
  { name: 'tutoring-assistant', path: 'tutoring-assistant.md', category: 'education', description: 'AI tutoring and learning support' },
  { name: 'code-mentor', path: 'code-mentor.md', category: 'education', description: 'Programming mentorship and exercises' },
  { name: 'documentation-writer', path: 'documentation-writer.md', category: 'education', description: 'Technical documentation and guides' },
  { name: 'readme-generator', path: 'readme-generator.md', category: 'education', description: 'Professional README generation' },
  { name: 'workshop-planner', path: 'workshop-planner.md', category: 'education', description: 'Technical workshop planning' },

  // ── Gaming (8) ────────────────────────────────────────────
  { name: 'unity-developer', path: 'unity-developer.md', category: 'gaming', description: 'Unity C# game development' },
  { name: 'unreal-specialist', path: 'unreal-specialist.md', category: 'gaming', description: 'Unreal Engine and Blueprints' },
  { name: 'godot-expert', path: 'godot-expert.md', category: 'gaming', description: 'Godot GDScript game development' },
  { name: 'game-designer', path: 'game-designer.md', category: 'gaming', description: 'Game mechanics and level design' },
  { name: 'game-monetization', path: 'game-monetization.md', category: 'gaming', description: 'Game monetization and economy design' },
  { name: 'multiplayer-architect', path: 'multiplayer-architect.md', category: 'gaming', description: 'Multiplayer networking and sync' },
  { name: 'shader-writer', path: 'shader-writer.md', category: 'gaming', description: 'GLSL/HLSL shader programming' },
  { name: 'pixel-art-guide', path: 'pixel-art-guide.md', category: 'gaming', description: 'Pixel art and 2D sprite design tips' },

  // ── i18n & Localization (6) ───────────────────────────────
  { name: 'i18n-architect', path: 'i18n-architect.md', category: 'i18n', description: 'Internationalization architecture setup' },
  { name: 'translation-manager', path: 'translation-manager.md', category: 'i18n', description: 'Translation workflow and TMS integration' },
  { name: 'rtl-specialist', path: 'rtl-specialist.md', category: 'i18n', description: 'Right-to-left layout implementation' },
  { name: 'locale-formatter', path: 'locale-formatter.md', category: 'i18n', description: 'Date, number, currency locale formatting' },
  { name: 'string-extractor', path: 'string-extractor.md', category: 'i18n', description: 'Extract hardcoded strings for translation' },
  { name: 'l10n-tester', path: 'l10n-tester.md', category: 'i18n', description: 'Localization testing and pseudo-translation' },

  // ── AI Agents (15) ────────────────────────────────────────
  { name: 'self-improving', path: 'self-improving.md', category: 'agents', description: 'Self-improving agent system' },
  { name: 'multi-agent', path: 'multi-agent.md', category: 'agents', description: 'Multi-agent orchestration system' },
  { name: 'tool-builder', path: 'tool-builder.md', category: 'agents', description: 'Build custom tools for AI agents' },
  { name: 'mcp-server-builder', path: 'mcp-server-builder.md', category: 'agents', description: 'Build MCP servers for Claude' },
  { name: 'agent-debugger', path: 'agent-debugger.md', category: 'agents', description: 'Debug and trace agent execution' },
  { name: 'workflow-designer', path: 'workflow-designer.md', category: 'agents', description: 'AI workflow and chain design' },
  { name: 'memory-architect', path: 'memory-architect.md', category: 'agents', description: 'Agent memory and context management' },
  { name: 'guardrails-builder', path: 'guardrails-builder.md', category: 'agents', description: 'AI safety guardrails and output validation' },
  { name: 'eval-designer', path: 'eval-designer.md', category: 'agents', description: 'AI evaluation and benchmarking' },
  { name: 'fine-tuning-expert', path: 'fine-tuning-expert.md', category: 'agents', description: 'LLM fine-tuning data prep and training' },
  { name: 'voice-agent', path: 'voice-agent.md', category: 'agents', description: 'Voice AI assistant development' },
  { name: 'chatbot-designer', path: 'chatbot-designer.md', category: 'agents', description: 'Conversational AI chatbot design' },
  { name: 'agent-sdk-expert', path: 'agent-sdk-expert.md', category: 'agents', description: 'Claude Agent SDK integration' },
  { name: 'ai-safety-reviewer', path: 'ai-safety-reviewer.md', category: 'agents', description: 'AI safety and alignment review' },
  { name: 'autonomous-coder', path: 'autonomous-coder.md', category: 'agents', description: 'Autonomous coding agent orchestration' },

  // ── Commands (10) ─────────────────────────────────────────
  { name: 'commit', path: 'commit.md', category: 'commands', description: 'Generate git commit messages' },
  { name: 'review-pr', path: 'review-pr.md', category: 'commands', description: 'Review pull requests' },
  { name: 'simplify', path: 'simplify.md', category: 'commands', description: 'Simplify and clean up code' },
  { name: 'deploy', path: 'deploy.md', category: 'commands', description: 'Deploy to production or staging' },
  { name: 'scaffold', path: 'scaffold.md', category: 'commands', description: 'Scaffold new project or feature' },
  { name: 'explain', path: 'explain.md', category: 'commands', description: 'Explain code in plain language' },
  { name: 'benchmark', path: 'benchmark.md', category: 'commands', description: 'Run performance benchmarks' },
  { name: 'lint-fix', path: 'lint-fix.md', category: 'commands', description: 'Auto-fix linting and formatting issues' },
  { name: 'type-check', path: 'type-check.md', category: 'commands', description: 'Run TypeScript type checking' },
  { name: 'release', path: 'release.md', category: 'commands', description: 'Prepare and tag a release' },
]

interface SkillsExplorerProps {
  isMobile?: boolean
}

export function SkillsExplorer({ isMobile }: SkillsExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['engineering']))
  const { setActiveTool } = useChatStore()
  const { sendMessage } = useWebSocket()

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const filteredSkills = searchQuery
    ? MOCK_SKILLS.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : selectedCategory
    ? MOCK_SKILLS.filter((s) => s.category === selectedCategory)
    : MOCK_SKILLS

  const handleSkillClick = (skill: Skill) => {
    const prompt = `Activate ${skill.name} skill: ${skill.description}. Please analyze my current project and apply this skill.`
    sendMessage(prompt)
    if (isMobile) {
      setActiveTool(null)
    }
  }

  const skillsByCategory = SKILL_CATEGORIES.map((cat) => ({
    ...cat,
    skills: MOCK_SKILLS.filter((s) => s.category === cat.id),
  })).filter((cat) => cat.skills.length > 0)

  return (
    <div
      className={cn(
        'h-full flex flex-col',
        isMobile ? 'bg-slate-950' : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-amber-500/20'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isMobile ? 'border-slate-800' : 'border-amber-500/20'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-slate-200">Skills Library</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-amber-400/60 uppercase tracking-wider">{MOCK_SKILLS.length} Skills</span>
          {isMobile && (
            <button
              onClick={() => setActiveTool(null)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 223 skills..."
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all"
          />
        </div>
      </div>

      {/* Skills Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {searchQuery ? (
          // Search results
          <div className="px-3 space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2">Search Results</p>
            {filteredSkills.map((skill) => (
              <SkillItem key={skill.name} skill={skill} onClick={() => handleSkillClick(skill)} />
            ))}
          </div>
        ) : (
          // Category tree
          <div className="space-y-1">
            {skillsByCategory.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                isExpanded={expandedCategories.has(category.id)}
                onToggle={() => toggleCategory(category.id)}
                onSkillClick={handleSkillClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Claude Skills Library</span>
        </div>
      </div>
    </div>
  )
}

interface CategorySectionProps {
  category: {
    id: string
    name: string
    icon: React.ElementType
    color: string
    skills: Skill[]
  }
  isExpanded: boolean
  onToggle: () => void
  onSkillClick: (skill: Skill) => void
}

function CategorySection({ category, isExpanded, onToggle, onSkillClick }: CategorySectionProps) {
  const Icon = category.icon

  return (
    <div>
      <motion.button
        whileHover={{ backgroundColor: 'rgba(251, 191, 36, 0.05)' }}
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-all"
      >
        <span className={cn('transition-colors', isExpanded ? 'text-amber-400' : 'text-slate-500')}>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <Icon className={cn('w-4 h-4 flex-shrink-0', category.color)} />
        <span className="font-medium text-slate-300">{category.name}</span>
        <span className="ml-auto text-xs text-slate-600">{category.skills.length}</span>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {category.skills.map((skill) => (
              <SkillItem key={skill.name} skill={skill} onClick={() => onSkillClick(skill)} isNested />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface SkillItemProps {
  skill: Skill
  onClick: () => void
  isNested?: boolean
}

function SkillItem({ skill, onClick, isNested }: SkillItemProps) {
  return (
    <motion.button
      whileHover={{ x: 4, backgroundColor: 'rgba(251, 191, 36, 0.08)' }}
      onClick={onClick}
      className={cn(
        'w-full flex flex-col gap-0.5 py-2 px-3 text-left transition-all rounded-lg mx-1',
        isNested ? 'pl-10' : 'pl-3'
      )}
    >
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <span className="text-sm font-medium text-slate-300 truncate">{skill.name}</span>
      </div>
      {skill.description && (
        <p className="text-xs text-slate-500 truncate pl-5.5">{skill.description}</p>
      )}
    </motion.button>
  )
}

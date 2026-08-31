import { config } from 'dotenv';
import { TodoConfig } from './types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the package directory, not the current working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// Try to load .env file from package directory, but don't fail if it doesn't exist
try {
  config({ path: envPath });
  console.log(`[CONFIG] Loaded .env file from: ${envPath}`);
} catch (error) {
  console.log(`[CONFIG] No .env file found at: ${envPath}, using system environment variables only`);
}

// Get package.json for version info
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

function showHelp(): void {
  console.log(`
${packageJson.name} v${packageJson.version}
${packageJson.description}

Usage:
  todo-for-ai-mcp [options]
  npx @todo-for-ai/mcp [options]

Options:
  --api-base-url <url>    API base URL (default: https://todo4ai.org/todo-for-ai/api/v1)
  --base-url <url>        Alias for --api-base-url
  --api-token <token>     API authentication token (required)
  --token <token>         Alias for --api-token
  --api-timeout <ms>      API request timeout in milliseconds (default: 10000)
  --timeout <ms>          Alias for --api-timeout
  --log-level <level>     Log level: debug, info, warn, error (default: info)
  --http-port <port>      HTTP server port (default: 3000)
  --http-host <host>      HTTP server host (default: 127.0.0.1)
  --session-timeout <ms>  Session timeout in milliseconds (default: 300000)
  --dns-protection        Enable DNS rebinding protection (default: true)
  --allowed-origins <origins>  Comma-separated list of allowed origins
  --max-connections <num> Maximum concurrent connections (default: 100)
  --help                  Show this help message
  --version               Show version information

Environment Variables:
  TODO_API_BASE_URL       API base URL
  TODO_API_TOKEN          API authentication token
  TODO_API_TIMEOUT        API request timeout in milliseconds
  LOG_LEVEL               Log level
  TODO_HTTP_PORT          HTTP server port
  TODO_HTTP_HOST          HTTP server host
  TODO_SESSION_TIMEOUT    Session timeout in milliseconds
  TODO_DNS_PROTECTION     Enable DNS rebinding protection (true/false)
  TODO_ALLOWED_ORIGINS    Comma-separated list of allowed origins
  TODO_MAX_CONNECTIONS    Maximum concurrent connections

Configuration Priority:
  Command line arguments > Environment variables > Defaults

Examples:
  # Using command line arguments
  todo-for-ai-mcp --api-token your-token --log-level debug

  # Using HTTP transport with custom port
  todo-for-ai-mcp --api-token your-token --http-port 8080

  # Using environment variables
  TODO_API_TOKEN=your-token LOG_LEVEL=debug todo-for-ai-mcp

  # HTTP transport with environment variables
  TODO_API_TOKEN=your-token TODO_HTTP_PORT=3000 todo-for-ai-mcp

  # Mixed configuration (CLI args override env vars)
  TODO_API_TOKEN=your-token todo-for-ai-mcp --http-port 8080

For more information, visit: https://github.com/todo-for-ai/todo-for-ai
`);
}

function showVersion(): void {
  console.log(`${packageJson.name} v${packageJson.version}`);
}

function parseArgs(): { [key: string]: string } {
  const args: { [key: string]: string } = {};
  const argv = process.argv.slice(2);

  // Check for help or version first
  if (argv.includes('--help') || argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    showVersion();
    process.exit(0);
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg && arg.startsWith('--')) {
      // Handle --key=value format
      if (arg.includes('=')) {
        const [key, ...valueParts] = arg.substring(2).split('=');
        const value = valueParts.join('='); // Handle values that contain '='
        if (key) {
          args[key] = value;
        }
      } else {
        // Handle --key value format
        const key = arg.substring(2);
        const value = argv[i + 1];
        if (value && !value.startsWith('--')) {
          args[key] = value;
          i++; // Skip the value in next iteration
        } else {
          args[key] = 'true'; // Boolean flag
        }
      }
    }
  }

  return args;
}

/**
 * Get configuration from command line arguments, environment variables, or defaults
 * Priority: CLI args > Environment variables > Defaults
 */
export function getConfig(): TodoConfig {
  console.log('[CONFIG] Starting configuration initialization...');

  // Parse command line arguments
  const args = parseArgs();
  console.log('[CONFIG] Command line arguments:', Object.keys(args).length > 0 ? args : 'none');

  // Log all relevant environment variables
  const envVars = {
    TODO_API_BASE_URL: process.env.TODO_API_BASE_URL,
    TODO_API_TIMEOUT: process.env.TODO_API_TIMEOUT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    TODO_API_TOKEN: process.env.TODO_API_TOKEN,
    TODO_HTTP_PORT: process.env.TODO_HTTP_PORT,
    TODO_HTTP_HOST: process.env.TODO_HTTP_HOST,
    TODO_SESSION_TIMEOUT: process.env.TODO_SESSION_TIMEOUT,
    TODO_DNS_PROTECTION: process.env.TODO_DNS_PROTECTION,
    TODO_ALLOWED_ORIGINS: process.env.TODO_ALLOWED_ORIGINS,
    TODO_MAX_CONNECTIONS: process.env.TODO_MAX_CONNECTIONS,
    NODE_ENV: process.env.NODE_ENV,
    PWD: process.env.PWD
  };

  console.log('[CONFIG] Environment variables detected:', {
    TODO_API_BASE_URL: envVars.TODO_API_BASE_URL || 'undefined',
    TODO_API_TIMEOUT: envVars.TODO_API_TIMEOUT || 'undefined',
    LOG_LEVEL: envVars.LOG_LEVEL || 'undefined',
    TODO_API_TOKEN: envVars.TODO_API_TOKEN ? `${envVars.TODO_API_TOKEN.substring(0, 8)}...` : 'NOT_SET',
    TODO_HTTP_PORT: envVars.TODO_HTTP_PORT || 'undefined',
    TODO_HTTP_HOST: envVars.TODO_HTTP_HOST || 'undefined',
    TODO_SESSION_TIMEOUT: envVars.TODO_SESSION_TIMEOUT || 'undefined',
    TODO_DNS_PROTECTION: envVars.TODO_DNS_PROTECTION || 'undefined',
    TODO_ALLOWED_ORIGINS: envVars.TODO_ALLOWED_ORIGINS || 'undefined',
    TODO_MAX_CONNECTIONS: envVars.TODO_MAX_CONNECTIONS || 'undefined',
    NODE_ENV: envVars.NODE_ENV || 'undefined',
    PWD: envVars.PWD || 'undefined'
  });

  // Priority: CLI args > Environment variables > Defaults
  let apiBaseUrl = args['api-base-url'] || args['base-url'] || process.env.TODO_API_BASE_URL || 'https://todo4ai.org/todo-for-ai/api/v1';

  // Normalize baseURL - ensure it doesn't end with a slash for consistent axios behavior
  if (apiBaseUrl.endsWith('/')) {
    apiBaseUrl = apiBaseUrl.slice(0, -1);
  }

  // Parse HTTP configuration
  const httpPort = parseInt(args['http-port'] || process.env.TODO_HTTP_PORT || '3000', 10);
  const httpHost = args['http-host'] || process.env.TODO_HTTP_HOST || '127.0.0.1';
  const sessionTimeout = parseInt(args['session-timeout'] || process.env.TODO_SESSION_TIMEOUT || '300000', 10);
  const enableDnsRebindingProtection = args['dns-protection'] !== undefined ?
    args['dns-protection'] !== 'false' && args['dns-protection'] !== '0' :
    process.env.TODO_DNS_PROTECTION !== undefined ?
      process.env.TODO_DNS_PROTECTION !== 'false' && process.env.TODO_DNS_PROTECTION !== '0' : false;

  // Parse allowed origins
  const allowedOriginsStr = args['allowed-origins'] || process.env.TODO_ALLOWED_ORIGINS;
  const allowedOrigins = allowedOriginsStr ? allowedOriginsStr.split(',').map(o => o.trim()) : ['http://localhost:*', 'https://localhost:*'];

  const maxConnections = parseInt(args['max-connections'] || process.env.TODO_MAX_CONNECTIONS || '100', 10);

  const config: TodoConfig = {
    apiBaseUrl,
    apiTimeout: parseInt(args['api-timeout'] || args['timeout'] || process.env.TODO_API_TIMEOUT || '10000', 10),
    logLevel: (args['log-level'] || process.env.LOG_LEVEL || 'info') as TodoConfig['logLevel'],
    transport: (args['transport'] || process.env.TODO_TRANSPORT || 'auto') as TodoConfig['transport'],
    httpPort,
    httpHost,
    sessionTimeout,
    enableDnsRebindingProtection,
    allowedOrigins,
    maxConnections,
  };

  console.log('[CONFIG] Base configuration created:', {
    apiBaseUrl: config.apiBaseUrl,
    apiTimeout: config.apiTimeout,
    logLevel: config.logLevel,
    httpPort: config.httpPort,
    httpHost: config.httpHost,
    sessionTimeout: config.sessionTimeout,
    enableDnsRebindingProtection: config.enableDnsRebindingProtection,
    allowedOrigins: config.allowedOrigins,
    maxConnections: config.maxConnections,
    isDefaultBaseUrl: !args['api-base-url'] && !args['base-url'] && !process.env.TODO_API_BASE_URL,
    isDefaultTimeout: !args['api-timeout'] && !args['timeout'] && !process.env.TODO_API_TIMEOUT,
    isDefaultLogLevel: !args['log-level'] && !process.env.LOG_LEVEL,
    isDefaultHttpPort: !args['http-port'] && !process.env.TODO_HTTP_PORT,
    configSource: {
      baseUrl: args['api-base-url'] || args['base-url'] ? 'args' : (process.env.TODO_API_BASE_URL ? 'env' : 'default'),
      timeout: args['api-timeout'] || args['timeout'] ? 'args' : (process.env.TODO_API_TIMEOUT ? 'env' : 'default'),
      logLevel: args['log-level'] ? 'args' : (process.env.LOG_LEVEL ? 'env' : 'default'),
      httpPort: args['http-port'] ? 'args' : (process.env.TODO_HTTP_PORT ? 'env' : 'default')
    }
  });

  // Handle API token - Priority: CLI args > Environment variables
  const apiToken = args['api-token'] || args['token'] || process.env.TODO_API_TOKEN;

  if (apiToken) {
    config.apiToken = apiToken;
    console.log('[CONFIG] API token found and added to config:', {
      tokenLength: config.apiToken.length,
      tokenPrefix: config.apiToken.substring(0, 8) + '...',
      tokenSuffix: '...' + config.apiToken.substring(config.apiToken.length - 4),
      tokenSource: args['api-token'] || args['token'] ? 'args' : 'env'
    });
  } else {
    console.log('[CONFIG] No API token found in command line arguments or environment variables');
  }

  console.log('[CONFIG] Final configuration summary:', {
    apiBaseUrl: config.apiBaseUrl,
    apiTimeout: config.apiTimeout,
    logLevel: config.logLevel,
    httpPort: config.httpPort,
    httpHost: config.httpHost,
    sessionTimeout: config.sessionTimeout,
    enableDnsRebindingProtection: config.enableDnsRebindingProtection,
    allowedOriginsCount: config.allowedOrigins.length,
    maxConnections: config.maxConnections,
    hasApiToken: !!config.apiToken,
    apiTokenPrefix: config.apiToken ? `${config.apiToken.substring(0, 8)}...` : 'NOT_SET',
    configurationComplete: true
  });

  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config: TodoConfig): void {
  if (!config.apiBaseUrl) {
    throw new Error('TODO_API_BASE_URL is required');
  }

  if (!config.apiBaseUrl.startsWith('http')) {
    throw new Error('TODO_API_BASE_URL must be a valid HTTP URL');
  }

  if (!config.apiToken) {
    throw new Error('API token is required. Please provide --api-token argument or set TODO_API_TOKEN environment variable');
  }

  if (config.apiTimeout < 1000) {
    throw new Error('TODO_API_TIMEOUT must be at least 1000ms');
  }

  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logLevel)) {
    throw new Error(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  // Validate HTTP configuration
  if (config.httpPort < 1 || config.httpPort > 65535) {
    throw new Error('HTTP port must be between 1 and 65535');
  }

  if (config.sessionTimeout < 10000) {
    throw new Error('Session timeout must be at least 10000ms (10 seconds)');
  }

  if (config.maxConnections < 1) {
    throw new Error('Max connections must be at least 1');
  }

  if (!config.httpHost.match(/^[a-zA-Z0-9.-]+$/)) {
    throw new Error('HTTP host must be a valid hostname or IP address');
  }
}

export const CONFIG = getConfig();
validateConfig(CONFIG);

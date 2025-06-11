#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Tool definitions
const FIND_EMAIL_TOOL: Tool = {
  name: 'hunter_find_email',
  description: 'Find an email address using domain and name information.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: 'The domain name of the company, e.g. "stripe.com"',
      },
      first_name: {
        type: 'string',
        description: 'The first name of the person',
      },
      last_name: {
        type: 'string',
        description: 'The last name of the person',
      },
      company: {
        type: 'string',
        description: 'The name of the company',
      },
      full_name: {
        type: 'string',
        description: 'The full name of the person (alternative to first_name and last_name)',
      }
    },
    required: ['domain'],
  },
};

const VERIFY_EMAIL_TOOL: Tool = {
  name: 'hunter_verify_email',
  description: 'Verify if an email address is valid and deliverable.',
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'The email address to verify',
      }
    },
    required: ['email'],
  },
};

const DOMAIN_SEARCH_TOOL: Tool = {
  name: 'hunter_domain_search',
  description: 'Find all the email addresses corresponding to a website or company name.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: 'The domain name to search for, e.g. "stripe.com"',
      },
      company: {
        type: 'string',
        description: 'The company name to search for (alternative to domain)',
      },
      limit: {
        type: 'number',
        description: 'The maximum number of emails to return (default: 10, max: 100)',
      },
      offset: {
        type: 'number',
        description: 'The number of emails to skip (default: 0)',
      },
      type: {
        type: 'string',
        description: 'The type of emails to return (personal or generic)',
      }
    },
    required: [],
  },
};

const EMAIL_COUNT_TOOL: Tool = {
  name: 'hunter_email_count',
  description: 'Know how many email addresses we have for a domain or a company.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: 'The domain name to get the count for, e.g. "stripe.com"',
      },
      company: {
        type: 'string',
        description: 'The company name to get the count for (alternative to domain)',
      }
    },
    required: [],
  },
};

const ACCOUNT_INFO_TOOL: Tool = {
  name: 'hunter_account_info',
  description: 'Get information regarding your Hunter account.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

// Type definitions
interface FindEmailParams {
  domain: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  full_name?: string;
}

interface VerifyEmailParams {
  email: string;
}

interface DomainSearchParams {
  domain?: string;
  company?: string;
  limit?: number;
  offset?: number;
  type?: string;
}

interface EmailCountParams {
  domain?: string;
  company?: string;
}

interface AccountInfoParams {
  // No parameters needed
}

// Type guards
function isFindEmailParams(args: unknown): args is FindEmailParams {
  if (
    typeof args !== 'object' ||
    args === null ||
    !('domain' in args) ||
    typeof (args as { domain: unknown }).domain !== 'string'
  ) {
    return false;
  }

  // Optional parameters
  if (
    'first_name' in args &&
    (args as { first_name: unknown }).first_name !== undefined &&
    typeof (args as { first_name: unknown }).first_name !== 'string'
  ) {
    return false;
  }

  if (
    'last_name' in args &&
    (args as { last_name: unknown }).last_name !== undefined &&
    typeof (args as { last_name: unknown }).last_name !== 'string'
  ) {
    return false;
  }

  if (
    'company' in args &&
    (args as { company: unknown }).company !== undefined &&
    typeof (args as { company: unknown }).company !== 'string'
  ) {
    return false;
  }

  if (
    'full_name' in args &&
    (args as { full_name: unknown }).full_name !== undefined &&
    typeof (args as { full_name: unknown }).full_name !== 'string'
  ) {
    return false;
  }

  return true;
}

function isVerifyEmailParams(args: unknown): args is VerifyEmailParams {
  return (
    typeof args === 'object' &&
    args !== null &&
    'email' in args &&
    typeof (args as { email: unknown }).email === 'string'
  );
}

function isDomainSearchParams(args: unknown): args is DomainSearchParams {
  if (
    typeof args !== 'object' ||
    args === null
  ) {
    return false;
  }

  // At least one of domain or company must be provided
  if (
    !('domain' in args || 'company' in args)
  ) {
    return false;
  }

  // Check domain if provided
  if (
    'domain' in args &&
    (args as { domain: unknown }).domain !== undefined &&
    typeof (args as { domain: unknown }).domain !== 'string'
  ) {
    return false;
  }

  // Check company if provided
  if (
    'company' in args &&
    (args as { company: unknown }).company !== undefined &&
    typeof (args as { company: unknown }).company !== 'string'
  ) {
    return false;
  }

  // Check limit if provided
  if (
    'limit' in args &&
    (args as { limit: unknown }).limit !== undefined &&
    typeof (args as { limit: unknown }).limit !== 'number'
  ) {
    return false;
  }

  // Check offset if provided
  if (
    'offset' in args &&
    (args as { offset: unknown }).offset !== undefined &&
    typeof (args as { offset: unknown }).offset !== 'number'
  ) {
    return false;
  }

  // Check type if provided
  if (
    'type' in args &&
    (args as { type: unknown }).type !== undefined &&
    typeof (args as { type: unknown }).type !== 'string'
  ) {
    return false;
  }

  return true;
}

function isEmailCountParams(args: unknown): args is EmailCountParams {
  if (
    typeof args !== 'object' ||
    args === null
  ) {
    return false;
  }

  // At least one of domain or company must be provided
  if (
    !('domain' in args || 'company' in args)
  ) {
    return false;
  }

  // Check domain if provided
  if (
    'domain' in args &&
    (args as { domain: unknown }).domain !== undefined &&
    typeof (args as { domain: unknown }).domain !== 'string'
  ) {
    return false;
  }

  // Check company if provided
  if (
    'company' in args &&
    (args as { company: unknown }).company !== undefined &&
    typeof (args as { company: unknown }).company !== 'string'
  ) {
    return false;
  }

  return true;
}

function isAccountInfoParams(args: unknown): args is AccountInfoParams {
  return (
    typeof args === 'object' &&
    args !== null
  );
}

// Server implementation
const server = new Server(
  {
    name: 'hunter-io-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      logging: {},
    },
  }
);

// Get API key from environment variables
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const HUNTER_API_URL = 'https://api.hunter.io/v2';

// Check if API key is provided
if (!HUNTER_API_KEY) {
  console.error('Error: HUNTER_API_KEY environment variable is required');
  process.exit(1);
}

// Configuration for retries and monitoring
const CONFIG = {
  retry: {
    maxAttempts: Number(process.env.HUNTER_RETRY_MAX_ATTEMPTS) || 3,
    initialDelay: Number(process.env.HUNTER_RETRY_INITIAL_DELAY) || 1000,
    maxDelay: Number(process.env.HUNTER_RETRY_MAX_DELAY) || 10000,
    backoffFactor: Number(process.env.HUNTER_RETRY_BACKOFF_FACTOR) || 2,
  },
};

// Initialize Axios instance for API requests
const apiClient: AxiosInstance = axios.create({
  baseURL: HUNTER_API_URL,
  params: {
    api_key: HUNTER_API_KEY
  }
});

let isStdioTransport = false;

function safeLog(
  level:
    | 'error'
    | 'debug'
    | 'info'
    | 'notice'
    | 'warning'
    | 'critical'
    | 'alert'
    | 'emergency',
  data: any
): void {
  if (isStdioTransport) {
    // For stdio transport, log to stderr to avoid protocol interference
    console.error(
      `[${level}] ${typeof data === 'object' ? JSON.stringify(data) : data}`
    );
  } else {
    // For other transport types, use the normal logging mechanism
    server.sendLoggingMessage({ level, data });
  }
}

// Add utility function for delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Add retry logic with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  attempt = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const isRateLimit =
      error instanceof Error &&
      (error.message.includes('rate limit') || error.message.includes('429'));

    if (isRateLimit && attempt < CONFIG.retry.maxAttempts) {
      const delayMs = Math.min(
        CONFIG.retry.initialDelay *
          Math.pow(CONFIG.retry.backoffFactor, attempt - 1),
        CONFIG.retry.maxDelay
      );

      safeLog(
        'warning',
        `Rate limit hit for ${context}. Attempt ${attempt}/${CONFIG.retry.maxAttempts}. Retrying in ${delayMs}ms`
      );

      await delay(delayMs);
      return withRetry(operation, context, attempt + 1);
    }

    throw error;
  }
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    FIND_EMAIL_TOOL,
    VERIFY_EMAIL_TOOL,
    DOMAIN_SEARCH_TOOL,
    EMAIL_COUNT_TOOL,
    ACCOUNT_INFO_TOOL,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
  try {
    const { name, arguments: args } = request.params;

    // Log incoming request with timestamp
    safeLog(
      'info',
      `[${new Date().toISOString()}] Received request for tool: ${name}`
    );

    if (!args) {
      throw new Error('No arguments provided');
    }

    switch (name) {
      case 'hunter_find_email': {
        if (!isFindEmailParams(args)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid arguments for hunter_find_email'
          );
        }

        try {
          // Hunter.io API expects query parameters for email finder
          const response = await withRetry(
            async () => apiClient.get('/email-finder', { params: args }),
            'find email'
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error) {
          const errorMessage = axios.isAxiosError(error)
            ? `API Error: ${error.response?.data?.message || error.message}`
            : `Error: ${error instanceof Error ? error.message : String(error)}`;

          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }

      case 'hunter_verify_email': {
        if (!isVerifyEmailParams(args)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid arguments for hunter_verify_email'
          );
        }

        try {
          // Hunter.io API expects query parameters for email verification
          const response = await withRetry(
            async () => apiClient.get('/email-verifier', { params: args }),
            'verify email'
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error) {
          const errorMessage = axios.isAxiosError(error)
            ? `API Error: ${error.response?.data?.message || error.message}`
            : `Error: ${error instanceof Error ? error.message : String(error)}`;

          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }

      case 'hunter_domain_search': {
        if (!isDomainSearchParams(args)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid arguments for hunter_domain_search'
          );
        }

        try {
          // Hunter.io API expects query parameters for domain search
          const response = await withRetry(
            async () => apiClient.get('/domain-search', { params: args }),
            'domain search'
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error) {
          const errorMessage = axios.isAxiosError(error)
            ? `API Error: ${error.response?.data?.message || error.message}`
            : `Error: ${error instanceof Error ? error.message : String(error)}`;

          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }

      case 'hunter_email_count': {
        if (!isEmailCountParams(args)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid arguments for hunter_email_count'
          );
        }

        try {
          // Hunter.io API expects query parameters for email count
          const response = await withRetry(
            async () => apiClient.get('/email-count', { params: args }),
            'email count'
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error) {
          const errorMessage = axios.isAxiosError(error)
            ? `API Error: ${error.response?.data?.message || error.message}`
            : `Error: ${error instanceof Error ? error.message : String(error)}`;

          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }

      case 'hunter_account_info': {
        if (!isAccountInfoParams(args)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid arguments for hunter_account_info'
          );
        }

        try {
          // Hunter.io API expects query parameters for account info
          const response = await withRetry(
            async () => apiClient.get('/account'),
            'account info'
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error) {
          const errorMessage = axios.isAxiosError(error)
            ? `API Error: ${error.response?.data?.message || error.message}`
            : `Error: ${error instanceof Error ? error.message : String(error)}`;

          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [
            { type: 'text', text: `Unknown tool: ${name}` },
          ],
          isError: true,
        };
    }
  } catch (error) {
    // Log detailed error information
    safeLog('error', {
      message: `Request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      tool: request.params.name,
      arguments: request.params.arguments,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    });
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  } finally {
    // Log request completion with performance metrics
    safeLog('info', `Request completed in ${Date.now() - startTime}ms`);
  }
});

// Server startup
async function runServer() {
  try {
    console.error('Initializing Hunter.io MCP Server...');

    const transport = new StdioServerTransport();

    // Detect if we're using stdio transport
    isStdioTransport = transport instanceof StdioServerTransport;
    if (isStdioTransport) {
      console.error(
        'Running in stdio mode, logging will be directed to stderr'
      );
    }

    await server.connect(transport);

    // Now that we're connected, we can send logging messages
    safeLog('info', 'Hunter.io MCP Server initialized successfully');
    safeLog(
      'info',
      `Configuration: API URL: ${HUNTER_API_URL}`
    );

    console.error('Hunter.io MCP Server running on stdio');
  } catch (error) {
    console.error('Fatal error running server:', error);
    process.exit(1);
  }
}

runServer().catch((error: any) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});

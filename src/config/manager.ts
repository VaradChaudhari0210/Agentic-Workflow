/**
 * Configuration Manager
 * Handles API key storage and retrieval across different sources
 */

import { homedir } from 'os';
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.backend-agent');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface Config {
  apiKey?: string;
  defaultModel?: string;
  defaultRepo?: string;
}

/**
 * Load configuration from user's home directory
 */
export async function loadConfig(): Promise<Config> {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return {};
    }
    const data = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file is corrupted or unreadable, return empty config
    return {};
  }
}

/**
 * Save configuration to user's home directory
 */
export async function saveConfig(config: Config): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Get API key from multiple sources with priority
 * Priority: ENV variable > Config file > null
 */
export async function getApiKey(): Promise<string | null> {
  // Priority 1: Environment variable
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  
  // Priority 2: Config file
  const config = await loadConfig();
  if (config.apiKey) {
    return config.apiKey;
  }
  
  // No API key found
  return null;
}

/**
 * Set API key in config file
 */
export async function setApiKey(apiKey: string): Promise<void> {
  const config = await loadConfig();
  config.apiKey = apiKey;
  await saveConfig(config);
}

/**
 * Get configuration file path for display
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Check if config file exists
 */
export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

/**
 * Get default model from config or fallback
 */
export async function getDefaultModel(): Promise<string> {
  const config = await loadConfig();
  return config.defaultModel || 'claude-sonnet-4-20250514';
}

/**
 * Update a specific config value
 */
export async function updateConfig(updates: Partial<Config>): Promise<void> {
  const config = await loadConfig();
  Object.assign(config, updates);
  await saveConfig(config);
}

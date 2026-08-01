import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve paths relative to plugin location: .opencode/plugins/
const pluginRoot = path.resolve(__dirname, '../..');
const skillsDir = path.resolve(pluginRoot, 'skills');

export const CasernePlugin = async ({ client }) => {
  return {
    config: async (config) => {
      // Register skills directory so OpenCode discovers caserne skills
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
        await client.app.log({
          body: { service: 'caserne', level: 'info', message: `Skills path registered: ${skillsDir}` },
        });
      }

      // Auto-configure MCP server so user doesn't need to
      const mcpKey = 'caserne';
      if (!config.mcp || !config.mcp[mcpKey]) {
        config.mcp = config.mcp || {};
        config.mcp[mcpKey] = {
          type: 'local',
          command: 'caserne-mcp',
          environment: {
            CASERNE_AGENT_ID: '{env:CASERNE_AGENT_ID}',
          },
          enabled: true,
        };
        await client.app.log({
          body: { service: 'caserne', level: 'info', message: 'MCP server caserne auto-configured' },
        });
      }
    },
  };
};

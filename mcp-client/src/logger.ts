/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-01-31
 * @tags: [mcp, client, logging, debug, utility]
 * @related: [client.ts, index.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: []
 */

export class Logger {
  private static isDebugEnabled(): boolean {
    return process.env.CONTEXTMCP_DEBUG === 'true' || process.env.DEBUG === 'contextmcp';
  }

  static log(level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    // For MCP clients, we need to be careful about logging to stderr
    // as stdout is used for MCP protocol communication
    if (data) {
      console.error(`${logMessage} - ${JSON.stringify(data, null, 2)}`);
    } else {
      console.error(logMessage);
    }
  }

  static info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  static debug(message: string, data?: any) {
    if (this.isDebugEnabled()) {
      this.log('DEBUG', message, data);
    }
  }

  static warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  static error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }
}
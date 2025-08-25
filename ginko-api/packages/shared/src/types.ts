// Shared TypeScript types
export interface BaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}
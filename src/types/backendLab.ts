export type ServerStatus = 'running' | 'stopped' | 'error' | 'unknown';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheckResult {
  status: HealthStatus;
  response_time_ms?: number;
  uptime_percentage?: number;
  error_count?: number;
  error_message?: string | null;
  last_check?: string;
}

export interface DiscoveredServer {
  id: string;
  host: string;
  port: number;
  protocol?: string;
  name?: string;
  framework?: string;
  language?: string;
  status: ServerStatus;
  health?: HealthCheckResult;
  process_id?: number;
  process_name?: string;
  discovered_at?: string;
  last_seen?: string;
  routes_count?: number;
  request_count?: number;
  avg_response_time?: number;
}

export interface RouteParameter {
  name: string;
  location: string;
  type?: string;
  required?: boolean;
  description?: string;
  default_value?: unknown;
}

export interface DiscoveredRoute {
  id: string;
  server_id: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  auth_required?: boolean;
  auth_type?: string;
  deprecated?: boolean;
  test_count?: number;
  call_count?: number;
  avg_response_time?: number;
  vulnerability_count?: number;
  path_params?: RouteParameter[];
  query_params?: RouteParameter[];
  body_schema?: Record<string, unknown>;
}

export interface Vulnerability {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: string;
  server_id: string;
  route_id?: string;
  parameter?: string;
  title: string;
  description: string;
  evidence: string;
  payload_used?: string;
  recommendation?: string;
  references?: string[];
  discovered_at?: string;
  confidence?: number;
}

export interface SecurityScanResult {
  id: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  routes_scanned?: number;
  vulnerabilities: Vulnerability[];
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  security_score?: number;
  grade?: string;
}

export interface TestResult {
  id: string;
  test_id?: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  assertions_passed?: number;
  assertions_failed?: number;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  extracted_variables?: Record<string, unknown>;
}

export interface CapturedRequest {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  host?: string;
  path?: string;
  request_headers?: Record<string, string>;
  request_body_text?: string;
  status_code?: number;
  response_headers?: Record<string, string>;
  response_body_text?: string;
  duration_ms?: number;
  was_modified?: boolean;
  server_id?: string;
  route_id?: string;
}

export interface LoadTestResult {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  duration_sec?: number;
  metrics?: {
    total_requests?: number;
    successful_requests?: number;
    failed_requests?: number;
    requests_per_second?: number;
    error_rate?: number;
    response_times?: {
      avg_ms?: number;
      p95_ms?: number;
      p99_ms?: number;
    };
  };
  thresholds_passed?: boolean;
}

export interface OverviewStats {
  total_servers?: number;
  healthy_servers?: number;
  unhealthy_servers?: number;
  total_routes?: number;
  tested_routes?: number;
  total_tests_run?: number;
  passed_tests?: number;
  failed_tests?: number;
  test_success_rate?: number;
  total_vulnerabilities?: number;
  open_vulnerabilities?: number;
  critical_count?: number;
  high_count?: number;
  total_captures?: number;
  avg_response_time_ms?: number;
}

export interface ConsoleLogEntry {
  timestamp: string;
  level: string;
  message: string;
  color?: string;
  raw?: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

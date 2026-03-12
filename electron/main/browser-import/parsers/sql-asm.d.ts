declare module 'sql.js/dist/sql-asm.js' {
  import type { SqlJsStatic } from 'sql.js';
  const initSqlJs: () => Promise<SqlJsStatic>;
  export default initSqlJs;
}

declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }
  export interface Database {
    exec(sql: string): QueryExecResult[];
    close(): void;
  }
  export interface QueryExecResult {
    columns: string[];
    values: any[][];
  }
}

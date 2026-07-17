declare module 'express' {
  export interface Request {
    headers: Record<string, string | string[] | undefined> & { authorization?: string };
    ip?: string;
    socket: { remoteAddress?: string };
  }
}

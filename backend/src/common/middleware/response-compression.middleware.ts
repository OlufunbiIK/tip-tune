import * as compression from 'compression';
import * as zlib from 'zlib';
import { Request, Response } from 'express';

type BinaryEndpointRule = {
  method: string;
  pattern: RegExp;
};

const BINARY_ENDPOINT_RULES: BinaryEndpointRule[] = [
  { method: 'POST', pattern: /\/files\/upload\/?$/ },
  { method: 'GET', pattern: /\/files\/[^/]+\/stream\/?$/ },
  { method: 'GET', pattern: /\/files\/[^/]+\/?$/ },
];

function isBinaryEndpoint(method: string, requestPath: string): boolean {
  return BINARY_ENDPOINT_RULES.some((rule) => {
    return rule.method === method.toUpperCase() && rule.pattern.test(requestPath);
  });
}

export function shouldCompress(req: Request, res: Response): boolean {
  const method = req.method ?? '';
  const path = req.path ?? req.url ?? '';

  if (isBinaryEndpoint(method, path)) {
    return false;
  }

  return compression.filter(req as any, res as any);
}

export function createCompressionMiddleware() {
  return compression({
    threshold: 1024,
    filter: shouldCompress as compression.CompressionFilter,
    brotli: {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
      },
    },
  });
}

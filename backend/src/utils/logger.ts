import pino from 'pino';

function optionalPrettyTransport() {
  if (process.env.NODE_ENV !== 'development') return undefined;

  try {
    require.resolve('pino-pretty');
    return { target: 'pino-pretty', options: { colorize: true } };
  } catch {
    return undefined;
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: optionalPrettyTransport(),
});

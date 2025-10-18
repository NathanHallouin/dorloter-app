/**
 * Filtre d'exception global : traduit toute erreur en enveloppe
 * `{ error: { code, message, details? } }`.
 *
 * Les [[AppError]] portent déjà leur code et leur statut. Les `HttpException`
 * NestJS (corps JSON malformé, route inconnue...) sont mappées sur le code
 * stable équivalent. Toute autre erreur devient un `INTERNAL_ERROR` générique,
 * loggé côté serveur mais jamais détaillé au client.
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { AppError, ErrorCode, type ErrorDetails } from './app-error';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.BadRequest,
  401: ErrorCode.Unauthorized,
  403: ErrorCode.Forbidden,
  404: ErrorCode.NotFound,
  409: ErrorCode.Conflict,
  410: ErrorCode.Gone,
  422: ErrorCode.Unprocessable,
  429: ErrorCode.RateLimited,
  503: ErrorCode.ServiceUnavailable,
};

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('AppExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const error = this.toAppError(exception);
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  private toAppError(exception: unknown): AppError {
    if (exception instanceof AppError) return exception;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = STATUS_TO_CODE[status] ?? ErrorCode.InternalError;
      if (code === ErrorCode.InternalError) {
        this.logger.error(exception.message, exception.stack);
        return AppError.internal('Erreur interne.');
      }
      return new AppError(code, this.messageOf(exception), this.detailsOf(exception));
    }

    // Erreur technique (accès DB, bug) : jamais de fuite, détail loggé.
    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );
    return AppError.internal('Erreur interne.');
  }

  private messageOf(exception: HttpException): string {
    const body = exception.getResponse();
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
    }
    return exception.message;
  }

  private detailsOf(exception: HttpException): ErrorDetails | undefined {
    const body = exception.getResponse();
    if (body && typeof body === 'object' && 'details' in body) {
      return (body as { details: ErrorDetails }).details;
    }
    return undefined;
  }
}

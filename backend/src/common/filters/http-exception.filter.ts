import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse =
      typeof exceptionResponse === 'string'
        ? { statusCode: status, message: exceptionResponse, error: exceptionResponse }
        : {
            statusCode: status,
            message:
              (exceptionResponse as any).message || exception.message,
            error: (exceptionResponse as any).error || HttpStatus[status],
          };

    response.status(status).json(errorResponse);
  }
}

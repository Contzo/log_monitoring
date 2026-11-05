import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UseInterceptors,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { plainToInstance } from 'class-transformer';

// Any class: something you can call `new` on, producing a T
interface ClassConstructor<T = object> {
  new (...args: any[]): T;
}

export function Serialize<T extends object>(dto: ClassConstructor<T>) {
  return UseInterceptors(new SerializeInterceptor(dto));
}

export class SerializeInterceptor<T extends object> implements NestInterceptor<
  unknown,
  T
> {
  constructor(private readonly dto: ClassConstructor<T>) {}
  intercept(_context: ExecutionContext, next: CallHandler): Observable<T> {
    return next.handle().pipe(
      // `data` is whatever the handler returned (a plain object/entity), not a class
      map((data: unknown) =>
        plainToInstance(this.dto, data, { excludeExtraneousValues: true }),
      ),
    ); // Returns the response wrapped in an Observable
  }
}

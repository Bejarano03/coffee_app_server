import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// This guard ensures that any route it protects requires a valid JWT 
// in the Authorization header (Bearer <token>).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
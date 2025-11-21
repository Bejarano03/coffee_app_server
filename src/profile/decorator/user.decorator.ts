import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Custom decorator to extract the user object (or user ID) attached to the request
// by the JwtStrategy/Passport after successful authentication.
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Assuming the JwtStrategy attaches the decoded payload (e.g., { email, sub: userId }) to request.user
    return request.user;
  },
);
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    // Return user if JWT is valid, else null (for first registration)
    if (err || !user) {
      return null;
    }
    return user;
  }
}

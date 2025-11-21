/**
 * Defines the structure of the payload decoded from the JWT token.
 */
export  interface JwtPayload {
    email: string,
    sub: number;
    iat?: number,
    exp?: number,
}
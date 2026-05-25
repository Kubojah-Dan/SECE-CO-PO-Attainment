export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public override readonly message: string,
    public readonly errors?: unknown[]
  ) {
    super(message)
    this.name = 'ApiError'
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  static badRequest(msg: string, errors?: unknown[]): ApiError {
    return new ApiError(400, msg, errors)
  }

  static unauthorized(msg = 'Unauthorized'): ApiError {
    return new ApiError(401, msg)
  }

  static forbidden(msg = 'Forbidden'): ApiError {
    return new ApiError(403, msg)
  }

  static notFound(msg = 'Not found'): ApiError {
    return new ApiError(404, msg)
  }

  static conflict(msg: string): ApiError {
    return new ApiError(409, msg)
  }

  static internal(msg = 'Internal server error'): ApiError {
    return new ApiError(500, msg)
  }
}

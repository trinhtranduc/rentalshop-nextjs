package com.anyrent.pos.domain.error

sealed class AppError(
    override val message: String,
    cause: Throwable? = null,
) : Exception(message, cause) {
    class Network(message: String, cause: Throwable? = null) : AppError(message, cause)
    class Unauthorized(message: String = "Your session has expired") : AppError(message)
    class Http(val statusCode: Int, message: String) : AppError(message)
    class InvalidResponse(message: String, cause: Throwable? = null) : AppError(message, cause)
    class Validation(message: String) : AppError(message)
    class Unknown(message: String, cause: Throwable? = null) : AppError(message, cause)

    companion object {
        fun from(throwable: Throwable): AppError {
            if (throwable is AppError) return throwable
            val message = throwable.message?.takeIf { it.isNotBlank() } ?: "Unexpected error"
            return when {
                message.contains("timeout", ignoreCase = true) ||
                    message.contains("connect", ignoreCase = true) ||
                    message.contains("network", ignoreCase = true) -> Network(message, throwable)
                message.contains("missing", ignoreCase = true) ||
                    message.contains("invalid response", ignoreCase = true) -> InvalidResponse(message, throwable)
                else -> Unknown(message, throwable)
            }
        }
    }
}

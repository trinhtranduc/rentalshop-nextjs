package com.anyrent.pos.domain.error

sealed class AppError(
    override val message: String,
    val code: String? = null,
    cause: Throwable? = null,
) : Exception(message, cause) {
    class Network(message: String, cause: Throwable? = null) : AppError(message, cause = cause)
    class Unauthorized(
        message: String = "Your session has expired",
        code: String? = null,
    ) : AppError(message, code)
    class Http(
        val statusCode: Int,
        message: String,
        code: String? = null,
        /** The error body's `data` (e.g. `distanceM`, `radiusM` of an attendance rejection, #910) */
        val data: org.json.JSONObject? = null,
    ) : AppError(message, code)
    class InvalidResponse(
        message: String,
        cause: Throwable? = null,
        code: String? = null,
    ) : AppError(message, code, cause)
    class Validation(message: String) : AppError(message)
    class Unknown(message: String, cause: Throwable? = null) : AppError(message, cause = cause)

    companion object {
        fun from(throwable: Throwable): AppError {
            if (throwable is AppError) return throwable
            val message = throwable.message?.takeIf { it.isNotBlank() }
                ?.let { ServerMessageGuard.safe(it, "Unexpected error") } ?: "Unexpected error"
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

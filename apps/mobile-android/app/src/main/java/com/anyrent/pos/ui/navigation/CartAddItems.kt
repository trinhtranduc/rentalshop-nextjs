package com.anyrent.pos.ui.navigation

/** #433: where the redesigned cart's "+ Add" takes the user. */
object CartAddItems {
    /** Stub: today's behavior, one step back. */
    fun popTarget(backStack: List<String?>): String? = backStack.dropLast(1).lastOrNull()
}

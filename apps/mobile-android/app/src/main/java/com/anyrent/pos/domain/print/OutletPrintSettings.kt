package com.anyrent.pos.domain.print

/**
 * #1308: the note and the bank QR switch of a bill are the order's outlet settings on the server (`Outlet.printNote`,
 * `Outlet.printBankQr`), as on the web. Only the owner edits them; paper width, printer IP and
 * Bluetooth stay on the device. iOS `OutletPrintSettings`.
 */
object OutletPrintSettings {
    /** The printed note: the outlet's, or null when blank (no "Note" block; the old default text is gone) */
    fun note(serverNote: String?): String? = serverNote?.takeIf { it.isNotBlank() }

    /** Only an explicit `true` prints the QR; a payload without the field reads as off */
    fun printsBankQr(serverValue: Boolean?): Boolean = serverValue == true

    /** Owner decision: only the shop owner edits; the outlet admin and staff read the server values (the API still allows the outlet admin) */
    fun canEdit(role: String?): Boolean = role.equals("MERCHANT", ignoreCase = true)

    /**
     * The note field when Máy in opens: the server note; for someone who can edit, an empty server note and an old
     * device note give the device note to be saved by the owner (never sent on its own)
     */
    fun prefillNote(serverNote: String?, legacyNote: String?, canEdit: Boolean): String {
        if (!serverNote.isNullOrBlank()) return serverNote
        return if (canEdit && !legacyNote.isNullOrBlank()) legacyNote else ""
    }

    /** First branch shown: the login's own, else the app's current one, else the default, else the first */
    fun initialOutletId(own: Int?, current: Int?, outlets: List<Pair<Int, Boolean>>): Int? {
        if (own != null) return own
        if (current != null && outlets.any { it.first == current }) return current
        return (outlets.firstOrNull { it.second } ?: outlets.firstOrNull())?.first
    }
}

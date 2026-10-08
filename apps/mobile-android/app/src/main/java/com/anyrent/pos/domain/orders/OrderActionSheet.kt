package com.anyrent.pos.domain.orders

/**
 * #519 order detail ⋯ sheet (board CT-thao-tac, note actNote): the header keeps only ⋯, and the sheet lists only
 * what is NOT already a button on the screen. The bottom bar of the detail decides what is on screen:
 * - HAND_OVER: "Sửa đơn" (when allowed) + "Giao đồ"
 * - TAKE_RETURN: "Gia hạn" (when allowed) + "Nhận trả"
 * - a sale that can be cancelled: "Huỷ đơn" + "In hoá đơn"
 * - anything else (finished orders): "In hoá đơn"
 * Pure and unit tested.
 */
object OrderActionSheet {
    enum class Action { PRINT, NOTES, HISTORY, EDIT, EXTEND, SHARE, CANCEL, DELETE }

    /** [main] then the red group [danger] (empty = no red group) */
    data class Rows(val main: List<Action>, val danger: List<Action>)

    /** Buttons the detail's bottom bar shows (same branches as `DetailBottomBar`) */
    fun onScreen(actions: DetailActions, isSale: Boolean, canExtend: Boolean): Set<Action> = when {
        actions.primary == DetailPrimary.HAND_OVER -> if (actions.canEdit) setOf(Action.EDIT) else emptySet()
        actions.primary == DetailPrimary.TAKE_RETURN -> if (canExtend) setOf(Action.EXTEND) else emptySet()
        isSale && actions.canCancel -> setOf(Action.CANCEL, Action.PRINT)
        else -> setOf(Action.PRINT)
    }

    /** #670: HISTORY only when [canViewHistory] (not OUTLET_STAFF) */
    fun rows(actions: DetailActions, isSale: Boolean, canExtend: Boolean, canViewHistory: Boolean = true): Rows {
        val shown = onScreen(actions, isSale, canExtend)
        val main = buildList {
            add(Action.PRINT)
            add(Action.NOTES)
            if (canViewHistory) add(Action.HISTORY)
            if (actions.canEdit) add(Action.EDIT)
            if (canExtend) add(Action.EXTEND)
            // Not on the board; kept so sharing the receipt is still one tap away (it was in the old ⋯ menu)
            add(Action.SHARE)
        }.filterNot { it in shown }
        val danger = buildList {
            if (actions.canCancel) add(Action.CANCEL)
            if (actions.canDelete) add(Action.DELETE)
        }.filterNot { it in shown }
        return Rows(main, danger)
    }

    /** "Có 1 ghi chú · 2 ảnh" parts: has a note text, photo count; null when there is nothing (row says "add") */
    data class NotesSummary(val hasText: Boolean, val photos: Int)

    fun notesSummary(notes: String?, photos: Int): NotesSummary? {
        val hasText = !notes.isNullOrBlank()
        return if (!hasText && photos <= 0) null else NotesSummary(hasText, photos.coerceAtLeast(0))
    }

    data class NotesTexts(
        val withText: String = "Có 1 ghi chú",
        /** After the text part: "· 2 ảnh" */
        val photos: String = "%1\$d ảnh",
        /** Photos without text */
        val photosOnly: String = "Có %1\$d ảnh",
        val add: String = "Thêm ghi chú",
    )

    /** "Có 1 ghi chú · 2 ảnh", "Có 1 ghi chú", "Có 2 ảnh" or "Thêm ghi chú" */
    fun notesSubtitle(notes: String?, photos: Int, texts: NotesTexts = NotesTexts()): String {
        val summary = notesSummary(notes, photos) ?: return texts.add
        return when {
            summary.hasText && summary.photos > 0 -> texts.withText + " · " + texts.photos.format(summary.photos)
            summary.hasText -> texts.withText
            else -> texts.photosOnly.format(summary.photos)
        }
    }

    /** "Máy in <name>" when named, else "Máy in <ip>"; null when no printer is set up */
    fun printerSubtitle(name: String?, ip: String?, template: String = "Máy in %1\$s"): String? {
        val label = name?.trim()?.takeIf { it.isNotEmpty() } ?: ip?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return template.format(label)
    }
}

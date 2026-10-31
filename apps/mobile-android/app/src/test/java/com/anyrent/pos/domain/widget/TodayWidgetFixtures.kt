package com.anyrent.pos.domain.widget

import java.time.Instant

/** The Vietnamese words of the widget, the same ones `res/values-vi` holds (checked by Issue1381ResourcesTest) */
internal val viLabels = TodayWidgetLabels(
    today = "Hôm nay", late = "Trễ", pickup = "Giao", returnTask = "Trả", notPrepared = "Chưa soạn đồ",
    moreFormat = "+%1\$d việc khác", updatedFormat = "cập nhật %1\$s", doneFormat = "xong %1\$d/%2\$d",
    doneCaption = "đã xong hôm nay", allDoneFormat = "Xong hết %1\$d/%2\$d", todayAtFormat = "Hôm nay · %1\$s",
    empty = "Hôm nay chưa có việc", tomorrowFormat = "Mai có %1\$d giao, %2\$d trả",
    loggedOut = "Mở AnyRent để đăng nhập", loggedOutHint = "Việc cần làm sẽ hiện ở đây",
    noAccess = "Tài khoản này không có Việc cần làm", stale = "Mở app để cập nhật", staleFormat = "Danh sách lần cuối: %1\$s",
    yesterday = "hôm qua", hiddenName = "chạm để mở", appName = "AnyRent", pickupDayWord = "Lấy", returnDayWord = "Trả",
    lateDays = { "Trễ $it ngày" },
)

internal fun row(
    orderId: Int = 490268,
    kind: TodayWidgetRow.Kind = TodayWidgetRow.Kind.PICKUP,
    isLate: Boolean = false,
    name: String = "Chị Diệu",
    product: String = "Áo dài gấm đỏ",
    moreCount: Int = 0,
    lateDays: Int = 0,
    notPrepared: Boolean = false,
    planTime: String = "",
    planDay: String = "",
) = TodayWidgetRow(orderId, kind, isLate, name, product, moreCount, lateDays, notPrepared, planTime, planDay)

internal fun snapshot(
    date: String = "2026-10-31",
    savedAt: Instant = Instant.parse("2026-10-31T01:12:00Z"),
    state: TodayWidgetSnapshot.State = TodayWidgetSnapshot.State.OK,
    hideNames: Boolean = false,
    done: Int = 0,
    counts: TodayWidgetCounts = TodayWidgetCounts(0, 0, 0),
    rows: List<TodayWidgetRow> = emptyList(),
    userId: Int = 7,
) = TodayWidgetSnapshot(userId, 5, date, savedAt, state, hideNames, done, counts, rows)

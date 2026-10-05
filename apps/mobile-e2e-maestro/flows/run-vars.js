// Per-run values (#447). Vietnam civil day for the date sheet; a unique customer so the order is easy to find.
var vn = new Date(Date.now() + 7 * 3600 * 1000);
var day = vn.getUTCDate();
output.day = String(day);
// The month grid repeats small numbers (next month) at the bottom and large ones (previous month) at the top.
output.dayIndex = day < 23 ? 0 : 1;
var stamp = String(Date.now()).slice(-6);
output.customerName = 'Khách E2E ' + stamp;
output.customerQuery = 'khach e2e ' + stamp;   // accent-free search must still find it
output.customerPhone = '09' + String(Date.now()).slice(-8);

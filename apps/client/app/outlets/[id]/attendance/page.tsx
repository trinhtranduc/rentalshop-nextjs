import { redirect } from 'next/navigation';
import { attendanceLocationHref } from '../../../attendance/locations/hrefs';

/** #945: the branch attendance page moved to Chấm công → Mã QR & vị trí; old links (bookmarks, #908) land there. */
export default function OldOutletAttendancePage({ params }: { params: { id: string } }) {
  redirect(attendanceLocationHref(params.id));
}

/**
 * "Thêm chi nhánh" on the shop web (#745). Multi-branch is not offered yet (owner, 2026-10-10), so the add entry is
 * hidden by default. `NEXT_PUBLIC_ENABLE_ADD_OUTLET=true` brings it back. Only the web entry is hidden: the API
 * (`POST /api/outlets`, its plan limit), the apps and the admin app are unchanged.
 */
export const isAddOutletEnabledFor = (flag: string | undefined): boolean => flag?.trim().toLowerCase() === 'true';

export const isAddOutletEnabled = (): boolean => isAddOutletEnabledFor(process.env.NEXT_PUBLIC_ENABLE_ADD_OUTLET);

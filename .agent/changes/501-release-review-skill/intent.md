# #501 Release review skill (dev → main-real)

The owner wants a fixed procedure for judging a release PR from `dev` into production (`main-real`).
Main worry: a changed API must not break the system in use, above all iOS/Android apps customers already
installed, which cannot be force-updated.
Constraint: agent instructions only. No runtime code, no workflow changes.

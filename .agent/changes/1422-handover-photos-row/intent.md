# Hand-over photos inside papers and collateral; failed upload told under the status

Issue: #1422 · Author: Claude · Status: in-review · Created: 2026-11-01

## Problem

#1421 merged with the first layout: photos under the status with their own uppercase heading, and the failure line under the photos. The owner decided otherwise after that version was written.

## Proposed outcome

On iOS and Android the photos are an ordinary row inside "Giấy tờ & thế chân", and a failed upload is told in one small line under the status.

## Constraints

- Order with collateral and no photos: as before. Order handed over with 0 photos: no add control on phone (owner decided).
- No change to the upload, the queue, the sheet or the API. Details of the first version: `.agent/changes/1418-handover-photos/`.

## Decision log

- One failure line, under the status. No second line under the photos, so there is one way to retry.

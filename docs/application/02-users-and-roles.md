# Users and Roles

## Roles at a glance

Every user has one role. The role decides which screens they see and what they may do.

| Role | Typical person | What they do in SeatBook |
|---|---|---|
| Employee | Any member of staff | Book, change and cancel their own desk; see their bookings; find teammates; keep their profile and preferences |
| Facilitator | Team assistant, office coordinator | Everything an employee does, plus booking for colleagues and registering visitors |
| Front office | Receptionist, security desk | See today's visitors and record their arrival and departure |
| Tenant admin | Facilities or workplace manager | Set up offices, floor plans, seats, amenities and rules; manage users; oversee all bookings, occupancy and the audit log |

## What each role can do

| Capability | Employee | Facilitator | Front office | Tenant admin |
|---|---|---|---|---|
| Book a desk for themselves | ✔ | ✔ | — | ✔ |
| Book for another employee | — | ✔ | — | ✔ |
| Register visitors and book desks for them | — | ✔ | — | ✔ |
| Change or cancel own bookings | ✔ | ✔ | — | ✔ |
| Change or cancel any booking in the organisation | — | — | — | ✔ |
| See visitors | — | ✔ (visits they arranged) | ✔ (today) | ✔ (all) |
| Check visitors in and out | — | — | ✔ | — |
| Find teammates | ✔ | ✔ | — | — |
| Manage offices, floor plans, seats, amenities, blocked seats | — | — | — | ✔ |
| Manage users and roles | — | — | — | ✔ |
| Configure business rules | — | — | — | ✔ |
| Dashboard, occupancy and audit log | — | — | — | ✔ |

## Separation of duties

SeatBook deliberately separates some responsibilities:

- **Recording a visitor's arrival is reserved for front office.** The people who invite or host a visitor do not mark them as arrived; reception does. This keeps the on-site record independent and reliable.
- **Administrators cannot change their own access,** and an organisation always keeps at least one active administrator.
- **People who book for others act within their organisation only,** and every such action is recorded with both the person who made it and the person it is for.

## How access changes take effect

When an administrator changes a user's role or deactivates them, SeatBook ends that user's open sessions immediately. Their next action requires a fresh sign-in, which picks up the new role. There is no waiting period and no cached access.

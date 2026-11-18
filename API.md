# Placeholder backend API

The frontend uses browser mocks until `VITE_API_URL` is set to the backend base URL. Calls send JSON and `Authorization: Bearer <token>` after login. Errors should return a non-2xx response. No backend has been implemented here.

## Dish shape

```json
{
  "id": "meal-1",
  "name": "رز بدجاج",
  "categories": ["rice", "chicken"],
  "userId": "u1",
  "notes": "",
  "timesCooked": 0
}
```

Allowed categories: `meat`, `chicken`, `fish`, `pasta`, `rice`, `stew`, `vegetarian`. A dish has one or more categories, not a single exclusive category. Filter and replacement matching use array membership. Existing single-category responses are normalized on reads for compatibility; writes send `categories`.

## Endpoints

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/auth/login` | `{ username, password }` | `{ success, user?, token? }` |
| GET | `/users` | — | User array: `{ id, name, avatarUrl?, isAdmin, isSuperAdmin }` |
| GET | `/meals` | — | Dish array |
| POST | `/meals` | `{ name, categories, notes?, userId }` | Created dish |
| PUT | `/meals/:id` | Changed dish fields including `categories` | Updated dish |
| DELETE | `/meals/:id` | — | 204 or JSON |
| GET | `/plan/week?start=YYYY-MM-DD` | — | PlanDay array; generate if absent |
| POST | `/plan/week/regenerate` | `{ start }` | Updated PlanDay array, preserving closed days |
| PUT | `/plan/day/:date` | `{ mealId }` | Updated week; replacement must include the day's criterion |
| POST | `/plan/day/:date/outcome` | `{ status: "cooked" or "free" }` | Updated week |
| GET | `/plan/history?from=YYYY-MM-DD&to=YYYY-MM-DD` | — | Closed PlanDay array with dish snapshots |

`PlanDay` has `{ date, mealId, category, proposedBy, status?, mealName?, mealCategories? }`. Its singular `category` remains the planner's criterion; `mealCategories` contains all dish categories captured when closing the day. Week dates start on Saturday. Statistics use dish `timesCooked` and history snapshots.

`User` records expose separate `isAdmin` and `isSuperAdmin` booleans. Administrators retain the existing plan-editing permission, and users may manage their own meals; only super administrators may regenerate a week or record a cooked/free outcome.

The backend must validate category arrays, enforce ownership and permissions, reject future outcomes or changes to closed days, and atomically record outcomes and increment `timesCooked` only once for cooked days. Free days never increment dish counts. Closed snapshots must survive dish changes/deletion and plan regeneration.
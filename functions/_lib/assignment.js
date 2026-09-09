// Auto-assignment: whoever has the fewest active bookings already on the
// target date gets the new one. Ties break alphabetically by name so the
// pick is stable and explainable rather than whatever order the query
// happens to return. This only ever sets a STARTING assignment — the
// office can move any booking to anyone, anytime, via
// PATCH /api/bookings/:id/assign (see admin.html's Crew panel).
export async function pickAutoAssignEmployee(sql, scheduledDate) {
  if (!scheduledDate) return null;
  // employees has first_name/last_name, not a single `name` column — this
  // query used to reference e.name directly, which doesn't exist, so every
  // booking (any plan, not just subscriptions) failed with a Postgres
  // "column e.name does not exist" error the moment it reached auto-assign.
  const rows = await sql`
    select e.id, (e.first_name || ' ' || e.last_name) as name,
           count(b.id) filter (
             where b.scheduled_date = ${scheduledDate}
               and b.canceled_at is null
           ) as load
      from employees e
      left join bookings b on b.assigned_employee_id = e.id
     where e.active = true
     group by e.id, e.first_name, e.last_name
     order by load asc, name asc
     limit 1
  `;
  return rows[0] || null;
}

// Auto-assignment: whoever has the fewest active bookings already on the
// target date gets the new one. Ties break alphabetically by name so the
// pick is stable and explainable rather than whatever order the query
// happens to return. This only ever sets a STARTING assignment — the
// office can move any booking to anyone, anytime, via
// PATCH /api/bookings/:id/assign (see admin.html's Crew panel).
export async function pickAutoAssignEmployee(sql, scheduledDate) {
  if (!scheduledDate) return null;
  const rows = await sql`
    select e.id, e.name,
           count(b.id) filter (
             where b.scheduled_date = ${scheduledDate}
               and b.canceled_at is null
           ) as load
      from employees e
      left join bookings b on b.assigned_employee_id = e.id
     where e.active = true
     group by e.id, e.name
     order by load asc, e.name asc
     limit 1
  `;
  return rows[0] || null;
}

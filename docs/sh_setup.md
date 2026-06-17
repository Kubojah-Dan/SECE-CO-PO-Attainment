# Setting Up the S&H (Science & Humanities) Department

## Overview

The Science and Humanities (S&H) department teaches first-year students across all engineering branches. S&H faculty and HOD have **full standard privileges** — identical to any engineering department (CSE, ECE, MECH, etc.). No special flags, no special permissions. Just a regular department with `is_first_year = True`.

---

## Step 1 — Create the S&H HOD Account

1. Log in as **Super Admin** (`admin@sece.ac.in`)
2. Navigate to **User Management → Register New User**
3. Fill in the HOD's details (name, email, employee ID)
4. **Assign Role:** `HOD`
5. **Primary Department:** Select `S&H (First Year)` from the dropdown
6. Click **Provision Account**

> Default password is `sece@123`. Ask the HOD to change it on first login.

---

## Step 2 — Create S&H Faculty Accounts

1. Log in as **Super Admin**
2. Navigate to **User Management → Register New User**
3. Fill in each faculty member's details
4. **Assign Role:** `Faculty`
5. **Primary Department:** Select `S&H (First Year)` from the dropdown
6. Click **Provision Account**

---

## Step 3 — S&H Faculty Standard Workflow

S&H faculty follow the **exact same workflow** as engineering department faculty:

| Step | Action |
|------|--------|
| 1 | Log in → Faculty Dashboard |
| 2 | View assigned subjects under **My Subjects** |
| 3 | Define Course Outcomes (COs) for each subject |
| 4 | Map COs to Program Outcomes (PO1–PO12) and PSOs |
| 5 | Download the Excel mark entry template per subject |
| 6 | Upload filled mark sheets (CIA 1, CIA 2, ESE, etc.) |
| 7 | Calculate CO Attainment |
| 8 | Submit to **S&H HOD** for approval |

---

## Step 4 — S&H HOD Standard Workflow

The S&H HOD has the same dashboard as any engineering HOD:

| Step | Action |
|------|--------|
| 1 | Log in → HOD Dashboard |
| 2 | View faculty submission list for the S&H department |
| 3 | Review submitted attainment reports |
| 4 | Approve or reject submissions with comments |
| 5 | Download department-level CO/PO attainment reports |

---

## Step 5 — Subject Allocation for S&H

Subjects taught by S&H faculty must be:

1. **Defined** in Admin → Master Subject Directory with `Department = S&H`
2. **Allocated** to the relevant S&H faculty in Admin → Subject Allocations

S&H subjects appear in IQAC institution-wide analytics alongside engineering department subjects.

---

## Step 6 — First Year Student Batch Migration

At the start of second year, S&H students are migrated to their engineering departments.

### Via API (Admin/HOD only)

```http
POST /api/students/batch-migrate/
Content-Type: application/json

{
  "from_department": <S&H dept ID>,
  "to_department": <target engineering dept ID>,
  "batch_ids": [<batch_id_1>, <batch_id_2>],
  "dry_run": true
}
```

Set `dry_run: true` first to preview how many students will be moved, then set `dry_run: false` to commit.

### Via CLI (server access required)

```bash
python manage.py migrate_first_year_students \
    --from-dept <S&H_dept_id> \
    --to-dept <engineering_dept_id> \
    --batch "2024-2028" \
    --dry-run
```

Remove `--dry-run` to execute the migration.

After migration, students' `department` pointer updates to the engineering department and their `target_department` is cleared. From that point, they appear in the engineering department's reports.

---

## Privilege Verification Checklist

| Privilege | S&H Faculty | S&H HOD |
|-----------|-------------|---------|
| View assigned subjects | ✅ | — |
| Define COs | ✅ | — |
| Map CO-PO | ✅ | — |
| Upload marks | ✅ | — |
| Calculate attainment | ✅ | — |
| Submit for HOD approval | ✅ | — |
| Approve/reject submissions | — | ✅ |
| View dept-level reports | — | ✅ |
| Appear in IQAC analytics | ✅ | ✅ |
| Appear in NBA/NAAC reports | ✅ | ✅ |

All privileges are inherited from the standard `Faculty` and `HOD` roles. No special configuration is required.

CREATE TABLE rsvps (
  id TEXT PRIMARY KEY NOT NULL,
  guest_name TEXT NOT NULL CHECK (length(trim(guest_name)) BETWEEN 1 AND 120),
  attending INTEGER NOT NULL CHECK (attending IN (0, 1)),
  companions_json TEXT NOT NULL CHECK (
    json_valid(companions_json) AND json_type(companions_json) = 'array'
    AND json_array_length(companions_json) <= 10
    AND (attending = 1 OR json_array_length(companions_json) = 0)
  ),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

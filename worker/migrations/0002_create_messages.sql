CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL,
  guest_name TEXT NOT NULL CHECK (length(trim(guest_name)) BETWEEN 1 AND 120),
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 3000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

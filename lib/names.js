// Normalise a person's name so "Dr. Esraa  Mohammed Marie" matches "Esraa Mohammed Marie".
export function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\bdr\b\.?/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Returns "Lead", "Researcher" or null for how a tracker name relates to a project.
export function matchRole(project, trackerName) {
  const n = norm(trackerName);
  if (!n) return null;
  if (norm(project.lead) === n) return "Lead";
  if ((project.researchers || []).some((r) => norm(r) === n)) return "Researcher";
  return null;
}

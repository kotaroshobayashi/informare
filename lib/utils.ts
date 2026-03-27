export function formatRelativeDate(dateString: string) {
  const delta = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(delta / (1000 * 60 * 60));

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

import { useMemo, useState } from "react";

function matchesQuery(entry, query) {
  if (!query) {
    return true;
  }

  const haystack = [entry.title, entry.route, entry.excerpt]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default function SearchPanel({ groups, currentRoute }) {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => matchesQuery(item, query)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  return (
    <div className="sidebar-shell">
      <label className="sidebar-search-label" htmlFor="sidebar-search">
        Search research
      </label>
      <input
        id="sidebar-search"
        className="sidebar-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find a note, section, or topic"
      />
      <div className="sidebar-groups">
        {filteredGroups.map((group) => (
          <section className="sidebar-group" key={group.section}>
            <h2>{group.label}</h2>
            <ul>
              {group.items.map((item) => (
                <li key={item.route}>
                  <a
                    aria-current={
                      item.route === currentRoute ? "page" : undefined
                    }
                    href={item.route}
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

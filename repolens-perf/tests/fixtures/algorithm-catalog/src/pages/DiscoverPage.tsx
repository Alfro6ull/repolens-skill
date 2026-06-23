import { useEffect, useState } from "react";
import { searchWorks } from "../api/discovery";

export function DiscoverPage() {
  const [query, setQuery] = useState("portrait");
  const [works, setWorks] = useState([]);

  useEffect(() => {
    searchWorks(query, ["oil", "featured"]).then((result) => setWorks(result.items));
  }, [query]);

  return (
    <main>
      <input value={query} onChange={(event) => setQuery(event.target.value)} />
      <section>
        {works.map((work) => (
          <article key={work.id}>
            <img src={work.coverUrl} alt="" loading="lazy" />
            <h2>{work.title}</h2>
            <p>{work.tags.join(", ")}</p>
            <strong>{work.score}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}

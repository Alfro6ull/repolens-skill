import { useEffect, useState } from "react";
import { searchWorks } from "../api/discovery";

export function DiscoverPage() {
  const [query, setQuery] = useState("portrait");
  const [works, setWorks] = useState([]);
  const featuredWork = works[0];

  useEffect(() => {
    searchWorks(query, ["oil", "featured"]).then((result) => setWorks(result.items));
  }, [query]);

  return (
    <main>
      <input value={query} onChange={(event) => setQuery(event.target.value)} />
      <section>
        {featuredWork ? (
          <article>
            <img src={featuredWork.coverUrl} alt="" loading="lazy" />
            <h2>{featuredWork.title}</h2>
            <p>{featuredWork.tags.join(", ")}</p>
            <strong>{featuredWork.score}</strong>
          </article>
        ) : null}
      </section>
    </main>
  );
}

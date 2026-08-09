import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { filterGlossaryEntries, getGlossaryAnchor } from '../glossary';

export function GlossarySection() {
  const [query, setQuery] = useState('');
  const entries = useMemo(() => filterGlossaryEntries(query), [query]);

  return (
    <section className="learn-section" id="glossary" aria-labelledby="glossary-heading">
      <h2 id="glossary-heading" className="learn-section__title">
        Go Glossary
      </h2>
      <p className="learn-section__intro">
        Quick definitions of common Go terms. Concepts marked with a link connect to fuller
        explanations elsewhere in Learn Go.
      </p>

      <label className="learn-glossary-search">
        <span className="learn-glossary-search__label">Search Go terms</span>
        <input
          type="search"
          className="learn-glossary-search__input"
          placeholder="Search Go terms…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-controls="learn-glossary-list"
        />
      </label>

      {entries.length === 0 ? (
        <p className="learn-glossary__empty" role="status">
          No terms match your search.
        </p>
      ) : null}

      <dl className="learn-glossary" id="learn-glossary-list">
        {entries.map((entry) => (
          <div key={entry.slug} className="learn-glossary__entry" id={`glossary-${entry.slug}`}>
            <dt className="learn-glossary__term">
              {entry.conceptId || entry.learnAnchor ? (
                <Link to={`/learn#${getGlossaryAnchor(entry)}`}>{entry.term}</Link>
              ) : (
                entry.term
              )}
            </dt>
            <dd className="learn-glossary__definition">{entry.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

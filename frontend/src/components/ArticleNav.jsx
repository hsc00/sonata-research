import { useEffect, useMemo, useState } from "react";

function getActiveHeadingId(headings) {
  const offset = 180;
  let currentId = headings[0]?.slug ?? null;

  for (const heading of headings) {
    const element = document.getElementById(heading.slug);

    if (!element) {
      continue;
    }

    if (element.getBoundingClientRect().top <= offset) {
      currentId = heading.slug;
    } else {
      break;
    }
  }

  return currentId;
}

export default function ArticleNav({ headings }) {
  const [activeId, setActiveId] = useState(headings[0]?.slug ?? null);

  useEffect(() => {
    if (!headings?.length) {
      return undefined;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      setActiveId(getActiveHeadingId(headings));
    };

    const onScroll = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  const progress = useMemo(() => {
    if (!headings?.length) {
      return { index: 0, percent: 0 };
    }

    const index = Math.max(
      headings.findIndex((heading) => heading.slug === activeId),
      0,
    );

    return {
      index,
      percent: Math.max(8, Math.round(((index + 1) / headings.length) * 100)),
    };
  }, [activeId, headings]);

  if (!headings?.length) {
    return null;
  }

  return (
    <section className="toc-block article-nav-block">
      <div className="article-progress-meta">
        <span>Reading progress</span>
        <strong>
          Section {progress.index + 1} of {headings.length}
        </strong>
      </div>
      <div className="article-progress" aria-hidden="true">
        <span style={{ width: `${progress.percent}%` }} />
      </div>

      <h2>On this page</h2>
      <ul className="toc-list">
        {headings.map((heading) => (
          <li key={heading.slug} className={`toc-depth-${heading.depth}`}>
            <a
              className={heading.slug === activeId ? "is-active" : undefined}
              href={`#${heading.slug}`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

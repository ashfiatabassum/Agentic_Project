// Breadcrumb trail for owner pages below the dashboard (plan.md E38), e.g.
//   Your spaces › Acme Bakery › Inbox
// Accessible pattern: <nav aria-label="Breadcrumb"> with an ordered list; the last item is the
// current page (aria-current="page", not a link). Every earlier item links to its page.
import { Link } from 'react-router';

/** items: [{ label, to? }] — the last item is the current page. */
export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        {items.map((item, i) => {
          const current = i === items.length - 1;
          return (
            <li key={`${i}-${item.label}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span aria-hidden="true" className="text-slate-400">›</span>}
              {current || !item.to ? (
                <span aria-current={current ? 'page' : undefined} className={`max-w-[16rem] truncate ${current ? 'font-medium text-slate-900' : ''}`}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="max-w-[16rem] truncate rounded text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Shared first crumb: the dashboard. */
export const SPACES_CRUMB = { label: 'Your spaces', to: '/dashboard' };

/** A space's crumb links to its inbox — the space's main page. */
export const spaceCrumb = (space) => ({ label: space.title, to: `/spaces/${space.id}/inbox` });

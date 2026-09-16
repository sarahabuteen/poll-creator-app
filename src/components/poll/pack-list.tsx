import { Avatar } from "@/components/avatar";
import { pluralVotes, type OptionResult } from "@/lib/results";

type PackListProps = {
  pack: OptionResult[];
  /** Options approved during this visit, flagged as joining with 0 votes. */
  justAdded: ReadonlySet<string>;
};

export function packRowId(optionId: string) {
  return `option-${optionId}`;
}

/** The trailing options: bars relative to the leader, counts always in text. */
export function PackList({ pack, justAdded }: PackListProps) {
  if (pack.length === 0) return null;

  return (
    <ul role="list" className="rounded-lg border-[2.5px] border-cocoa bg-card px-5 sm:px-7">
      {pack.map(({ option, votes, percent, relativeWidth, tied }) => (
        <li
          key={option.id}
          id={packRowId(option.id)}
          tabIndex={-1}
          className="grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-3 border-b-2 border-dashed border-cream-deep py-5 last:border-b-0 sm:grid-cols-[1fr_12.5rem_auto]"
        >
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <p className="text-md font-extrabold text-cocoa">{option.label}</p>
            {option.suggestedBy && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-cocoa-soft">
                <Avatar person={option.suggestedBy} size={20} />
                Suggested by {option.suggestedBy.name}
                {justAdded.has(option.id) && <> &middot; just added with 0 votes</>}
              </p>
            )}
          </div>

          <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-cream-deep">
            <div className="h-full rounded-full bg-teal" style={{ width: `${relativeWidth}%` }} />
          </div>

          <p className="flex min-w-24 items-baseline justify-end gap-2 tabular-nums">
            <span className="font-display text-lg font-extrabold text-cocoa">{percent}%</span>
            <span className="text-sm text-cocoa-soft">
              {pluralVotes(votes)}
              {tied && <span className="font-bold"> &middot; tied</span>}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

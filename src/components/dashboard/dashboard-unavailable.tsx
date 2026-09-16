import { FormAlert } from "@/components/forms/form-alert";

/** Shown when the polls list can't load: plain words and a way to retry. */
export function DashboardUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <FormAlert>
      Your polls didn&rsquo;t load.{" "}
      <a href={retryHref} className="font-bold underline underline-offset-2">
        Try again
      </a>
      .
    </FormAlert>
  );
}

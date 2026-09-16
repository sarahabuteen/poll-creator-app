import { Bone, BoneCard } from "@/components/status/skeleton";

/** Shaped like the log in / sign up card. */
export default function AuthLoading() {
  return (
    <>
      <div aria-hidden="true" className="mx-auto flex min-h-(--nav-height) w-full max-w-page items-center gap-4 px-4 sm:px-6">
        <Bone className="h-8 w-32 rounded-full" />
        <Bone className="ml-auto size-11 rounded-full" />
      </div>
      <main id="main" aria-busy="true" className="mx-auto w-full max-w-[28rem] flex-1 px-4 pt-6 pb-16 sm:pt-12">
        <p role="status" className="sr-only">
          Loading…
        </p>
        <div aria-hidden="true">
          <Bone className="h-11 w-3/4" />
          <Bone className="mt-3 h-5 w-full" />
          <BoneCard className="mt-8 flex flex-col gap-5">
            {[0, 1].map((field) => (
              <div key={field}>
                <Bone className="h-4 w-20" />
                <Bone className="mt-2 h-12 w-full" />
              </div>
            ))}
            <Bone className="h-12 w-full rounded-full" />
          </BoneCard>
        </div>
      </main>
    </>
  );
}

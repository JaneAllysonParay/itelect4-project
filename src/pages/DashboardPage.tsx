import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpRight, ClipboardList, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router";
import useToggle from "../hooks/useToggle";
import useAuthStore from "../store/authStore";
import SectionCard from "../components/SectionCard";

interface ShortcutLinkProps {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

function ShortcutLink({ to, label, description, icon: Icon }: ShortcutLinkProps) {
  return (
    <Link to={to} className="group flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-offset-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-card-foreground">{label}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{description}</span>
      </span>
      <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </Link>
  );
}

function DashboardPage() {
  const [showSessionDetails, toggleSessionDetails] = useToggle(false);
  const userName = useAuthStore((state) => state.userName);
  const userRole = useAuthStore((state) => state.userRole);
  const isAuthenticated = Boolean(useAuthStore((state) => state.token));
  const isStaff = userRole === "security" || userRole === "admin";

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:gap-10 lg:p-10">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold tracking-wide text-accent-foreground">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> Campus community resource
            </p>
            <h1 className="max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {isAuthenticated && userName ? `Welcome back, ${userName}.` : "A clear path from lost to found."}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Report a lost or found belonging, then browse campus reports to help reconnect items with their owners.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/items" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Browse reports <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/report/lost" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted">Report lost property</Link>
                  <Link to="/report/found" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted">Report found property</Link>
                </>
              ) : (
                <Link to="/login" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted">Sign in to report an item</Link>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-muted/70 p-5" aria-label="Getting started">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Start here</p>
            <div className="mt-4 space-y-4">
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-sm font-semibold text-primary">1</span>
                <p className="pt-1 text-sm leading-relaxed text-foreground">Browse reports for a possible match.</p>
              </div>
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-sm font-semibold text-primary">2</span>
                <p className="pt-1 text-sm leading-relaxed text-foreground">Sign in to report an item or submit a Claim.</p>
              </div>
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-sm font-semibold text-primary">3</span>
                <p className="pt-1 text-sm leading-relaxed text-foreground">Follow the Claim and handover updates.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title={isAuthenticated ? "Your shortcuts" : "Get started"}
          description={isAuthenticated ? "Pick up where you left off." : "Browse publicly, or sign in to manage reports and Claims."}
        >
          <div className="grid gap-3">
            {isAuthenticated ? (
              <>
                <ShortcutLink to="/my-reports" label="My Reports" description="Review the reports you submitted." icon={ClipboardList} />
                <ShortcutLink to="/my-claims" label="My Claims" description="Check Claim decisions and handover progress." icon={FileCheck2} />
                <ShortcutLink to="/claims" label="Claims workflow" description="Submit ownership proof for an eligible found report." icon={FileCheck2} />
                <ShortcutLink to="/review" label="AI Report Review" description="Get help improving the details in a report." icon={Sparkles} />
                {isStaff && <ShortcutLink to="/staff/claims" label="Staff Claim review" description="Review pending Claims and handover tasks." icon={ShieldCheck} />}
              </>
            ) : (
              <>
                <ShortcutLink to="/items" label="Browse reports" description="Search public lost and found reports." icon={ClipboardList} />
                <ShortcutLink to="/login" label="Sign in" description="Create or manage reports and Claims." icon={FileCheck2} />
                <ShortcutLink to="/register" label="Create an account" description="Student accounts can report items and submit Claims." icon={ArrowRight} />
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard title="How a Claim works" description="A Claim decision and the physical handover are separate steps.">
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">1</span>
              <div><h3 className="font-semibold text-card-foreground">Find an eligible found report</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Open a report that may match your item and use its Claim action.</p></div>
            </li>
            <li className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">2</span>
              <div><h3 className="font-semibold text-card-foreground">Submit private ownership proof</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Authorized staff review the proof and decide whether to approve the Claim.</p></div>
            </li>
            <li className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">3</span>
              <div><h3 className="font-semibold text-card-foreground">Confirm the handover</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">After approval, coordinate pickup. The report is returned only when handover is confirmed.</p></div>
            </li>
          </ol>
          <p className="mt-5 rounded-xl border border-border bg-muted/70 p-4 text-sm leading-relaxed text-foreground">
            Approval reserves an item for an approved Claim; it does not mean the item has already been handed over.
          </p>
        </SectionCard>
      </div>

      <section className="border-t border-border pt-4">
        <button
          type="button"
          aria-expanded={showSessionDetails}
          aria-controls="session-details"
          onClick={toggleSessionDetails}
          className="min-h-11 rounded-lg px-2 text-sm font-medium text-muted-foreground underline decoration-muted-foreground/50 underline-offset-4 hover:text-foreground"
        >
          {showSessionDetails ? "Hide session details" : "Show session details"}
        </button>
        <p id="session-details" hidden={!showSessionDetails} className="mt-2 text-sm text-muted-foreground">
          {isAuthenticated
            ? `Signed in${userName ? ` as ${userName}` : ""}${userRole ? ` · ${userRole} account` : ""}.`
            : "You are browsing as a guest. Sign in or create an account to report items and manage Claims."}
        </p>
      </section>
    </div>
  );
}

export default DashboardPage;

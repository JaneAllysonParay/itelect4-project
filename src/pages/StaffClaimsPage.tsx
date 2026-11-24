import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import {
  confirmClaimHandover,
  confirmItemCustody,
  fetchClaimsForReviewPage,
  fetchItemsForCustodyReviewPage,
  updateClaimStatus,
  updatePickupInstructions,
} from "../api/client";
import ClaimCard from "../components/ClaimCard";
import PageHeader from "../components/PageHeader";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "../components/PageStates";
import { Button } from "@/components/ui/button";
import type { ApiItem, ApiPage, ApiReviewClaim, ClaimDecisionStatus } from "../types/index";
import useAuthStore from "../store/authStore";
import { lifecycleStatusOf, reportTypeOf } from "../lib/itemLifecycle";

type Queue = "pending" | "awaiting_handover" | "completed" | "rejected" | "legacy";
type OperationKind = "success" | "info" | "error";
type OperationFeedback = {
  id: string;
  title: string;
  message: string;
  kind: OperationKind;
  queue?: Queue;
};

const queues: Queue[] = ["pending", "awaiting_handover", "completed", "rejected", "legacy"];
const queueLabels: Record<Queue, string> = {
  pending: "Pending review",
  awaiting_handover: "Awaiting handover",
  completed: "Completed handovers",
  rejected: "Rejected / history",
  legacy: "Legacy cases",
};

function eventDate(value?: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function isOpenFoundClaim(claim: ApiReviewClaim): boolean {
  if (!claim.item || claim.item.archivedAt) return false;
  const hasCustodyInformation = claim.item.custodyStatus === "finder_reported" ||
    claim.item.custodyStatus === "security_reported" ||
    claim.item.custodyStatus === "security_confirmed";
  if (!hasCustodyInformation) return false;
  const isPureLegacy = claim.item.reportType === undefined && claim.item.lifecycleStatus === undefined;
  return isPureLegacy
    ? claim.item.status === "found"
    : claim.item.reportType === "found" && claim.item.lifecycleStatus === "open" && claim.item.status === "found";
}

function approvalUnavailableReason(claim: ApiReviewClaim): string {
  if (!claim.item) return "Item details are unavailable, so this Claim cannot be approved.";
  if (claim.item.archivedAt) return "This Item is archived. The Claim cannot be approved.";
  if (!["finder_reported", "security_reported", "security_confirmed"].includes(claim.item.custodyStatus ?? "")) {
    return "The report has no recognized custody information. Staff must verify the report before it can be approved.";
  }
  return "This Claim is not attached to an eligible open found report and cannot be approved.";
}

function custodyPresentation(item: ApiItem): { label: string; explanation: string; tone: "completed" | "pending" | "unknown" } {
  if (item.custodyStatus === "security_confirmed") {
    return {
      label: "Campus security custody confirmed",
      explanation: "Authorized staff have confirmed this property is in campus security custody.",
      tone: "completed",
    };
  }
  if (item.custodyStatus === "security_reported") {
    return {
      label: "Reporter says it was turned over to security",
      explanation: "This is reporter-supplied information and still requires staff verification.",
      tone: "pending",
    };
  }
  if (item.custodyStatus === "finder_reported") {
    return {
      label: "Finder reports holding the property",
      explanation: "The finder reports possessing the property; campus custody has not been confirmed.",
      tone: "pending",
    };
  }
  return {
    label: "Custody information not established",
    explanation: "No recognized custody status is available for this report.",
    tone: "unknown",
  };
}

function safeStaffError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  const containsSensitiveDetails = /\b(token|password|secret|mongodb|database|stack trace|credentials)\b|bearer\s|https?:\/\/|[\r\n]|internal server/i.test(message);
  if (!message || message.length > 240 || containsSensitiveDetails) return fallback;
  return message;
}

function inputId(prefix: string, id: string): string {
  return `${prefix}-${encodeURIComponent(id)}`;
}

function Feedback({ feedback }: { feedback: OperationFeedback }) {
  const className = feedback.kind === "error"
    ? "border-destructive/30 bg-destructive/5 text-destructive"
    : feedback.kind === "success"
      ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
      : "border-amber-500/30 bg-amber-500/5 text-foreground";
  return (
    <p role={feedback.kind === "error" ? "alert" : "status"} className={`break-words rounded-lg border p-3 text-sm leading-relaxed ${className}`}>
      <span className="font-medium">{feedback.title}: </span>{feedback.message}
    </p>
  );
}

function reportTypeText(item: ApiItem): string {
  const type = reportTypeOf(item);
  return type === "found" ? "Found report" : type === "lost" ? "Lost report" : "Report type unknown";
}

function lifecycleText(item: ApiItem): string {
  const status = lifecycleStatusOf(item);
  if (status === "open") return "Open";
  if (status === "reserved") return "Reserved";
  if (status === "returned") return "Returned";
  if (status === "resolved") return "Resolved";
  return "Lifecycle status unknown";
}

function StaffClaimsPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.userRole);
  const canReview = role === "security" || role === "admin";
  const [queue, setQueue] = useState<Queue>("pending");
  const [queuePage, setQueuePage] = useState(1);
  const [custodyPage, setCustodyPage] = useState(1);
  const [instructionDrafts, setInstructionDrafts] = useState<Record<string, string>>({});
  const [instructionFeedback, setInstructionFeedback] = useState<Record<string, OperationFeedback>>({});
  const [decisionConfirmation, setDecisionConfirmation] = useState<{ id: string; status: ClaimDecisionStatus } | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<OperationFeedback | null>(null);
  const [handoverId, setHandoverId] = useState<string | null>(null);
  const [handoverAcknowledged, setHandoverAcknowledged] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [handoverFeedback, setHandoverFeedback] = useState<OperationFeedback | null>(null);
  const [custodyConfirmationId, setCustodyConfirmationId] = useState<string | null>(null);
  const [custodyAcknowledged, setCustodyAcknowledged] = useState(false);
  const [custodyFeedback, setCustodyFeedback] = useState<OperationFeedback | null>(null);
  const handoverFocusReturnId = useRef<string | null>(null);
  const custodyFocusReturnId = useRef<string | null>(null);

  const claims = useQuery<ApiPage<ApiReviewClaim>>({
    queryKey: ["claims", "review", queue, queuePage],
    queryFn: () => fetchClaimsForReviewPage(queue, queuePage),
    enabled: canReview,
  });
  const custody = useQuery<ApiPage<ApiItem>>({
    queryKey: ["items", "staff-custody", custodyPage],
    queryFn: () => fetchItemsForCustodyReviewPage(custodyPage),
    enabled: canReview,
  });

  const refresh = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["claims"] }),
      queryClient.invalidateQueries({ queryKey: ["receivedClaims"] }),
      queryClient.invalidateQueries({ queryKey: ["myReports"] }),
      queryClient.invalidateQueries({ queryKey: ["items"] }),
    ]);
  };

  const decision = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClaimDecisionStatus; queue: Queue; title: string }) => updateClaimStatus(id, status),
    onMutate: () => setDecisionFeedback(null),
    onSuccess: async (updatedClaim, variables) => {
      await refresh();
      const confirmed = updatedClaim?.id === variables.id && updatedClaim.status === variables.status;
      const message = confirmed
        ? variables.status === "approved"
          ? "Claim approved and the eligible found Item reserved. This is not a physical handover."
          : "The Claim was rejected and the server confirmed the decision."
        : "The response did not confirm the requested Claim status. Review the refreshed queue before taking another action.";
      setDecisionFeedback({
        id: variables.id,
        title: variables.title,
        kind: confirmed ? "success" : "info",
        message,
        queue: variables.queue,
      });
      setDecisionConfirmation((current) => current?.id === variables.id ? null : current);
    },
    onError: async (error, variables) => {
      setDecisionFeedback({
        id: variables.id,
        title: variables.title,
        kind: "error",
        message: safeStaffError(error, "The server could not save this decision. Review the refreshed queue and try again if the Claim is still pending."),
        queue: variables.queue,
      });
      await refresh();
    },
  });

  const saveInstructions = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string; title: string }) => updatePickupInstructions(id, text),
    onMutate: (variables) => {
      setInstructionFeedback((current) => {
        if (!current[variables.id]) return current;
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
    },
    onSuccess: async (updatedClaim, variables) => {
      await refresh();
      const confirmed = updatedClaim?.id === variables.id && updatedClaim.pickupInstructions === variables.text;
      if (confirmed) {
        setInstructionDrafts((current) => ({ ...current, [variables.id]: updatedClaim.pickupInstructions ?? variables.text }));
      }
      setInstructionFeedback((current) => ({
        ...current,
        [variables.id]: {
          id: variables.id,
          title: variables.title,
          kind: confirmed ? "success" : "info",
          message: confirmed
            ? "Pickup instructions were saved and confirmed in the server response."
            : "The response did not confirm the saved text. Your draft remains available; review the latest Claim data before retrying.",
          queue: "awaiting_handover",
        },
      }));
    },
    onError: async (error, variables) => {
      setInstructionFeedback((current) => ({
        ...current,
        [variables.id]: {
          id: variables.id,
          title: variables.title,
          kind: "error",
          message: safeStaffError(error, "The server could not save the pickup instructions. Your draft is still here so you can review it and retry."),
          queue: "awaiting_handover",
        },
      }));
      await refresh();
    },
  });

  const handover = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string; title: string }) => confirmClaimHandover(id, note || undefined),
    onMutate: () => setHandoverFeedback(null),
    onSuccess: async (updatedClaim, variables) => {
      const confirmed = updatedClaim?.id === variables.id && updatedClaim.approvedWorkflowStatus === "completed" && Boolean(updatedClaim.handoverAt);
      setHandoverId((current) => current === variables.id ? null : current);
      setHandoverAcknowledged(false);
      setInternalNote("");
      handoverFocusReturnId.current = variables.id;
      setHandoverFeedback({
        id: variables.id,
        title: variables.title,
        kind: confirmed ? "success" : "info",
        message: confirmed
          ? `The server recorded the physical handover on ${eventDate(updatedClaim.handoverAt)}.`
          : "The response did not include canonical completed-handover evidence. The queue has been refreshed; do not treat this record as complete until the latest server data confirms it.",
        queue: "awaiting_handover",
      });
      await refresh();
    },
    onError: async (error, variables) => {
      setHandoverFeedback({
        id: variables.id,
        title: variables.title,
        kind: "error",
        message: safeStaffError(error, "The server could not confirm handover. This Claim has not been marked complete; review the refreshed record before retrying."),
        queue: "awaiting_handover",
      });
      await refresh();
    },
  });

  const confirmCustody = useMutation({
    mutationFn: ({ id }: { id: string; title: string }) => confirmItemCustody(id),
    onMutate: () => setCustodyFeedback(null),
    onSuccess: async (updatedItem, variables) => {
      const confirmed = updatedItem?.id === variables.id && updatedItem.custodyStatus === "security_confirmed";
      setCustodyConfirmationId((current) => current === variables.id ? null : current);
      setCustodyAcknowledged(false);
      custodyFocusReturnId.current = variables.id;
      setCustodyFeedback({
        id: variables.id,
        title: variables.title,
        kind: confirmed ? "success" : "info",
        message: confirmed
          ? updatedItem.custodyConfirmedAt
            ? `The server confirmed campus custody on ${eventDate(updatedItem.custodyConfirmedAt)}.`
            : "The server confirmed campus security custody."
          : "The response did not confirm campus custody. The queue has been refreshed; verify the latest server record before taking further action.",
      });
      await refresh();
    },
    onError: async (error, variables) => {
      setCustodyFeedback({
        id: variables.id,
        title: variables.title,
        kind: "error",
        message: safeStaffError(error, "The server could not confirm custody. The Item has not been marked verified; review the refreshed report before retrying."),
      });
      await refresh();
    },
  });

  useEffect(() => {
    if (handoverId) {
      document.getElementById(inputId("handover-acknowledgement", handoverId))?.focus();
      return;
    }
    if (handoverFocusReturnId.current) {
      document.getElementById(inputId("start-handover", handoverFocusReturnId.current))?.focus();
      handoverFocusReturnId.current = null;
    }
  }, [handoverId]);

  useEffect(() => {
    if (custodyConfirmationId) {
      document.getElementById(inputId("custody-acknowledgement", custodyConfirmationId))?.focus();
      return;
    }
    if (custodyFocusReturnId.current) {
      document.getElementById(inputId("start-custody-confirmation", custodyFocusReturnId.current))?.focus();
      custodyFocusReturnId.current = null;
    }
  }, [custodyConfirmationId]);

  if (!canReview) {
    return <ErrorState title="Staff workspace unavailable" description="Only active security or admin staff can access Claim review and custody operations." />;
  }

  const changeQueue = (nextQueue: Queue): void => {
    setQueue(nextQueue);
    setQueuePage(1);
    setDecisionConfirmation(null);
    if (!handover.isPending) {
      setHandoverId(null);
      setHandoverAcknowledged(false);
      setInternalNote("");
    }
  };

  const claimPaginationVisible = Boolean(claims.data && (
    queuePage > 1 || claims.data.hasMore || (claims.data.totalCount !== null && claims.data.totalCount > 0)
  ));
  const custodyPaginationVisible = Boolean(custody.data && (
    custodyPage > 1 || custody.data.hasMore || (custody.data.totalCount !== null && custody.data.totalCount > 0)
  ));

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <PageHeader
        title="Staff Claim Management"
        description="Review ownership evidence, manage private pickup instructions, verify campus custody, and record completed physical handovers."
        eyebrow="Authorized staff workspace"
      />

      <aside aria-labelledby="workflow-safety-heading" className="rounded-2xl border border-primary/20 border-l-4 border-l-primary bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 id="workflow-safety-heading" className="font-semibold text-foreground">Workflow safety</h2>
            <ul className="mt-2 grid gap-2 text-sm leading-relaxed text-muted-foreground md:grid-cols-3">
              <li>Approval reserves an eligible found Item; it does not confirm pickup.</li>
              <li>Confirm campus custody only after physically verifying the property is in security care.</li>
              <li>Record a handover only after verifying the approved claimant and handing over the property.</li>
            </ul>
          </div>
        </div>
      </aside>

      <SectionCard title="Claim management" description="Review the five server-supported queues. Each page is loaded separately, and queue changes return to page 1.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Claim queues">
          {queues.map((key) => (
            <Button
              key={key}
              type="button"
              variant={queue === key ? "default" : "outline"}
              aria-pressed={queue === key}
              onClick={() => changeQueue(key)}
              className="h-auto min-h-11 min-w-0 justify-start whitespace-normal text-left"
            >
              {queueLabels[key]}
            </Button>
          ))}
        </div>

        <div className="mt-5 space-y-4" aria-busy={claims.isFetching}>
          {claims.isPending && <LoadingState label={`Loading ${queueLabels[queue].toLowerCase()}...`} />}
          {claims.isError && <ErrorState title={`${queueLabels[queue]} could not be loaded`} description={safeStaffError(claims.error, "The server could not load this queue. Check your connection and try again.")} />}
          {decisionFeedback?.queue === queue && <Feedback feedback={decisionFeedback} />}
          {handoverFeedback?.queue === queue && <Feedback feedback={handoverFeedback} />}

          {!claims.isPending && !claims.isError && claims.data?.data.length === 0 && (
            <EmptyState
              title={queuePage === 1 ? `No ${queueLabels[queue].toLowerCase()}` : `No records on page ${queuePage}`}
              description={queuePage === 1
                ? `There are no Claims in the ${queueLabels[queue].toLowerCase()} queue on the current server response.`
                : "This page has no records. Use Previous page to return to the last available results."}
            />
          )}

          <div className="grid min-w-0 gap-4">
            {claims.data?.data.map((claim) => {
              const title = claim.item?.title?.trim() || "Ownership Claim";
              const claimantName = claim.claimant?.name?.trim();
              const claimantEmail = claim.claimant?.email?.trim();
              const claimant = [claimantName, claimantEmail].filter(Boolean).join(" · ") || "Not available in this response";
              const draft = instructionDrafts[claim.id] ?? claim.pickupInstructions ?? "";
              const pickupId = inputId("pickup-instructions", claim.id);
              const pickupHelpId = inputId("pickup-help", claim.id);
              const pickupErrorId = inputId("pickup-error", claim.id);
              const pickupFeedback = instructionFeedback[claim.id];
              const pickupInvalid = draft.length > 0 && draft.trim().length < 5;
              const savingThisClaim = saveInstructions.isPending && saveInstructions.variables?.id === claim.id;
              const confirmingThisDecision = decision.isPending && decision.variables?.id === claim.id;
              const confirmingThisHandover = handover.isPending && handover.variables?.id === claim.id;
              const confirmationStatus = decisionConfirmation?.id === claim.id ? decisionConfirmation.status : null;
              const handoverIsOpen = handoverId === claim.id;

              return (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  context="review"
                  reviewActions={(
                    <div role="group" aria-label={`Staff actions for ${title}`} className="grid min-w-0 gap-4">
                      <dl className="grid min-w-0 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <div className="min-w-0">
                          <dt className="font-medium text-foreground">Claimant</dt>
                          <dd className="mt-0.5 break-words text-muted-foreground">{claimant}</dd>
                        </div>
                        {claim.decisionSource && (
                          <div className="min-w-0">
                            <dt className="font-medium text-foreground">Decision source</dt>
                            <dd className="mt-0.5 text-muted-foreground">{claim.decisionSource === "system" ? "Automatic system decision" : "Staff decision"}</dd>
                          </div>
                        )}
                        {claim.decisionAt && (
                          <div className="min-w-0">
                            <dt className="font-medium text-foreground">Decision recorded</dt>
                            <dd className="mt-0.5 text-muted-foreground">{eventDate(claim.decisionAt)}</dd>
                          </div>
                        )}
                      </dl>

                      {queue === "pending" && (
                        <section aria-label={`Pending decision for ${title}`} className="grid min-w-0 gap-3 border-t border-border pt-4">
                          {!isOpenFoundClaim(claim) && (
                            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-relaxed text-foreground">{approvalUnavailableReason(claim)}</p>
                          )}
                          {confirmationStatus ? (
                            <fieldset disabled={decision.isPending} className="grid gap-3 rounded-xl border border-primary/20 bg-muted/30 p-4">
                              <legend className="px-1 text-sm font-semibold text-foreground">Confirm this Claim decision</legend>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {confirmationStatus === "approved"
                                  ? "Approval reserves this eligible found Item for its claimant. It does not confirm pickup or physical handover."
                                  : "Rejecting this Claim closes it. The server will record the decision; no rejection reason will be added."}
                              </p>
                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                <Button
                                  type="button"
                                  disabled={decision.isPending || (confirmationStatus === "approved" && !isOpenFoundClaim(claim))}
                                  onClick={() => decision.mutate({ id: claim.id, status: confirmationStatus, queue, title })}
                                >
                                  {confirmingThisDecision
                                    ? "Saving decision..."
                                    : confirmationStatus === "approved"
                                      ? "Confirm approval and reservation"
                                      : "Confirm Claim rejection"}
                                </Button>
                                <Button type="button" variant="outline" disabled={decision.isPending} onClick={() => setDecisionConfirmation(null)}>Cancel</Button>
                              </div>
                            </fieldset>
                          ) : (
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                              <Button
                                type="button"
                                disabled={decision.isPending || !isOpenFoundClaim(claim)}
                                onClick={() => setDecisionConfirmation({ id: claim.id, status: "approved" })}
                              >
                                Approve and reserve
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={decision.isPending}
                                onClick={() => setDecisionConfirmation({ id: claim.id, status: "rejected" })}
                              >
                                Reject Claim
                              </Button>
                            </div>
                          )}
                        </section>
                      )}

                      {queue === "awaiting_handover" && (
                        <div className="grid min-w-0 gap-4 border-t border-border pt-4">
                          <section aria-labelledby={inputId("pickup-heading", claim.id)} className="grid min-w-0 gap-3">
                            <div>
                              <h4 id={inputId("pickup-heading", claim.id)} className="font-semibold text-foreground">Private pickup instructions</h4>
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">These instructions are private to this claimant and authorized staff. Do not include an unverified address or schedule.</p>
                            </div>
                            <label htmlFor={pickupId} className="grid min-w-0 gap-1.5 text-sm font-medium text-foreground">
                              Instructions
                              <textarea
                                id={pickupId}
                                value={draft}
                                disabled={savingThisClaim}
                                onChange={(event) => {
                                  setInstructionDrafts((current) => ({ ...current, [claim.id]: event.target.value }));
                                  setInstructionFeedback((current) => {
                                    if (!current[claim.id]) return current;
                                    const next = { ...current };
                                    delete next[claim.id];
                                    return next;
                                  });
                                }}
                                aria-invalid={pickupInvalid}
                                aria-describedby={`${pickupHelpId}${pickupInvalid ? ` ${pickupErrorId}` : ""}`}
                                rows={3}
                                minLength={5}
                                maxLength={1000}
                                placeholder="Add general pickup instructions or a note about contacting campus staff."
                                className="min-h-24 w-full min-w-0 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            </label>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p id={pickupHelpId} className="text-xs leading-relaxed text-muted-foreground">Enter 5–1000 characters after trimming. {draft.length} / 1000 characters.</p>
                              <Button
                                type="button"
                                disabled={saveInstructions.isPending || draft.trim().length < 5 || draft.length > 1000}
                                onClick={() => saveInstructions.mutate({ id: claim.id, text: draft.trim(), title })}
                                className="w-full sm:w-auto"
                              >
                                {savingThisClaim ? "Saving instructions..." : `Save instructions for ${title}`}
                              </Button>
                            </div>
                            {pickupInvalid && <p id={pickupErrorId} className="text-sm text-destructive">Enter at least five non-space characters.</p>}
                            {pickupFeedback && <Feedback feedback={pickupFeedback} />}
                          </section>

                          <section aria-labelledby={inputId("handover-heading", claim.id)} className="grid min-w-0 gap-3 border-t border-border pt-4">
                            <div>
                              <h4 id={inputId("handover-heading", claim.id)} className="font-semibold text-foreground">Physical handover</h4>
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Approval reserves the Item only. Verify the approved claimant and record this action only after they actually receive the property.</p>
                            </div>
                            <Button
                              id={inputId("start-handover", claim.id)}
                              type="button"
                              variant={handoverIsOpen ? "outline" : "secondary"}
                              disabled={handover.isPending}
                              onClick={() => {
                                if (handoverIsOpen) {
                                  handoverFocusReturnId.current = claim.id;
                                  setHandoverId(null);
                                  setHandoverAcknowledged(false);
                                  setInternalNote("");
                                  return;
                                }
                                handoverFocusReturnId.current = null;
                                setHandoverFeedback(null);
                                setHandoverId(claim.id);
                                setHandoverAcknowledged(false);
                                setInternalNote("");
                              }}
                              className="w-full sm:w-fit"
                            >
                              {handoverIsOpen ? "Cancel handover confirmation" : `Start handover confirmation for ${title}`}
                            </Button>
                            {handoverIsOpen && (
                              <fieldset disabled={handover.isPending} className="grid min-w-0 gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                                <legend className="px-1 text-sm font-semibold text-foreground">Confirm completed physical handover</legend>
                                <div className="flex min-w-0 items-start gap-3">
                                  <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
                                  <p className="min-w-0 break-words text-sm leading-relaxed text-foreground">This action records a completed handover for <span className="font-semibold">{title}</span>. Continue only after checking the claimant's identity and handing them the property.</p>
                                </div>
                                <label htmlFor={inputId("handover-acknowledgement", claim.id)} className="flex min-w-0 items-start gap-3 rounded-lg p-1 text-sm leading-relaxed text-foreground">
                                  <input
                                    id={inputId("handover-acknowledgement", claim.id)}
                                    type="checkbox"
                                    checked={handoverAcknowledged}
                                    onChange={(event) => setHandoverAcknowledged(event.target.checked)}
                                    className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  />
                                  <span>I have verified this is the approved claimant and physically handed the property to them.</span>
                                </label>
                                <label htmlFor={inputId("handover-note", claim.id)} className="grid min-w-0 gap-1.5 text-sm font-medium text-foreground">
                                  Internal note (optional)
                                  <textarea
                                    id={inputId("handover-note", claim.id)}
                                    value={internalNote}
                                    onChange={(event) => setInternalNote(event.target.value)}
                                    aria-describedby={inputId("handover-note-help", claim.id)}
                                    rows={2}
                                    maxLength={1000}
                                    placeholder="Optional internal note for authorized staff."
                                    className="min-h-20 w-full min-w-0 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  />
                                </label>
                                <p id={inputId("handover-note-help", claim.id)} className="text-xs text-muted-foreground">Up to 1000 characters. This note is for authorized staff.</p>
                                <Button
                                  type="button"
                                  disabled={!handoverAcknowledged || handover.isPending}
                                  onClick={() => handover.mutate({ id: claim.id, note: internalNote.trim(), title })}
                                  className="w-full sm:w-fit"
                                >
                                  {confirmingThisHandover ? "Recording physical handover..." : "Confirm physical handover"}
                                </Button>
                              </fieldset>
                            )}
                          </section>
                        </div>
                      )}

                      {queue === "completed" && (
                        <section aria-label={`Completed handover details for ${title}`} className="grid gap-2 border-t border-border pt-4">
                          {claim.approvedWorkflowStatus === "completed" && claim.handoverAt ? (
                            <>
                              <StatusBadge tone="completed">Physical handover recorded</StatusBadge>
                              <p className="text-sm text-muted-foreground">Recorded on {eventDate(claim.handoverAt)}.</p>
                            </>
                          ) : (
                            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-relaxed text-foreground">This response does not include canonical handover evidence. Physical return is not assumed; verify the latest campus record.</p>
                          )}
                        </section>
                      )}

                      {queue === "rejected" && (
                        <section aria-label={`Rejection history for ${title}`} className="grid gap-2 border-t border-border pt-4 text-sm">
                          <p className="font-medium text-foreground">
                            {claim.decisionSource === "system"
                              ? "Closed automatically by the system"
                              : claim.decisionSource === "staff"
                                ? "Rejected by staff"
                                : "Rejected; decision source unavailable"}
                          </p>
                          {claim.decisionAt && <p className="text-muted-foreground">Decision recorded {eventDate(claim.decisionAt)}.</p>}
                          {claim.decisionReason && claim.decisionSource !== "system" && <p className="break-words text-muted-foreground">Reason: {claim.decisionReason}</p>}
                        </section>
                      )}

                      {queue === "legacy" && (
                        <section aria-label={`Legacy verification for ${title}`} className="grid gap-2 border-t border-border pt-4">
                          <StatusBadge tone="unavailable">Historical Claim — verification required</StatusBadge>
                          <p className="break-words rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-relaxed text-foreground">Approval may be historical and a reliable reservation or handover record is missing. Physical return must not be assumed. Consult authoritative campus records; no lifecycle action is available in this queue.</p>
                        </section>
                      )}
                    </div>
                  )}
                />
              );
            })}
          </div>

          {claims.data && claimPaginationVisible && (
            <nav aria-label={`${queueLabels[queue]} pages`} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <Button type="button" variant="outline" disabled={queuePage <= 1 || claims.isPending} onClick={() => setQueuePage((current) => Math.max(1, current - 1))} className="w-full sm:w-auto">Previous page</Button>
              <p className="break-words text-center text-sm text-muted-foreground">
                Page {queuePage} · {claims.data.totalCount === null ? "count unavailable" : `${claims.data.totalCount} Claims in this queue`} · {claims.data.pageSize} per page
              </p>
              <Button type="button" variant="outline" disabled={!claims.data.hasMore || claims.isPending} onClick={() => setQueuePage((current) => current + 1)} className="w-full sm:w-auto">Next page</Button>
            </nav>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Found-item custody" description="Custody confirmation records staff verification that the property is physically in campus security care.">
        {custody.isPending && <LoadingState label="Loading found reports for custody review..." />}
        {custody.isError && <div className="mb-4"><ErrorState title="Custody reports could not be loaded" description={safeStaffError(custody.error, "The server could not load custody reports. Check your connection and try again.")} /></div>}
        {custodyFeedback && <div className="mb-4"><Feedback feedback={custodyFeedback} /></div>}

        {!custody.isPending && !custody.isError && custody.data?.data.length === 0 && (
          <EmptyState
            title={custodyPage === 1 ? "No found reports require custody review" : `No custody reports on page ${custodyPage}`}
            description={custodyPage === 1
              ? "There are no found reports on this page of the current custody queue response."
              : "This page has no records. Use Previous page to return to the last available custody results."}
          />
        )}

        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
          {custody.data?.data.map((item) => {
            const title = item.title?.trim() || "Found report";
            const custodyState = custodyPresentation(item);
            const confirmationIsOpen = custodyConfirmationId === item.id;
            const confirmingThisItem = confirmCustody.isPending && confirmCustody.variables?.id === item.id;
            const recognizedFoundReport = reportTypeOf(item) === "found";
            const canConfirm = !item.archivedAt && recognizedFoundReport && item.custodyStatus !== "security_confirmed";

            return (
              <article key={item.id} className="grid min-w-0 gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <header className="grid min-w-0 gap-2">
                  <h3 className="min-w-0 break-words text-base font-semibold tracking-tight text-card-foreground">
                    <Link to={`/items/${item.id}`} className="rounded-sm underline decoration-primary/50 underline-offset-4 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{title}</Link>
                  </h3>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <StatusBadge tone={custodyState.tone}>{custodyState.label}</StatusBadge>
                    <StatusBadge tone={item.archivedAt ? "unavailable" : "unknown"}>{item.archivedAt ? "Archived report" : `${reportTypeText(item)} · ${lifecycleText(item)}`}</StatusBadge>
                  </div>
                </header>

                <dl className="grid min-w-0 gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="min-w-0"><dt className="font-medium text-foreground">Location</dt><dd className="mt-0.5 break-words text-muted-foreground">{item.location || "Not provided"}</dd></div>
                  {item.eventAt && <div className="min-w-0"><dt className="font-medium text-foreground">Item event</dt><dd className="mt-0.5 text-muted-foreground">{eventDate(item.eventAt)}</dd></div>}
                  <div className="min-w-0"><dt className="font-medium text-foreground">Report submitted</dt><dd className="mt-0.5 text-muted-foreground">{eventDate(item.dateReported)}</dd></div>
                  <div className="min-w-0"><dt className="font-medium text-foreground">Verification</dt><dd className="mt-0.5 text-muted-foreground">{item.custodyStatus === "security_confirmed" ? "No further custody confirmation is required." : "Staff physical verification is still required."}</dd></div>
                </dl>
                <p className="break-words text-sm leading-relaxed text-muted-foreground">{custodyState.explanation}</p>

                {item.custodyStatus === "security_confirmed" && item.custodyConfirmedAt && (
                  <p className="text-sm text-muted-foreground">Custody verification recorded {eventDate(item.custodyConfirmedAt)}.</p>
                )}

                {item.archivedAt && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-relaxed text-foreground">This report is archived and cannot be confirmed from this queue.</p>}
                {!recognizedFoundReport && !item.archivedAt && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-relaxed text-foreground">This response does not identify an eligible found report, so custody confirmation is unavailable.</p>}

                {canConfirm && !confirmationIsOpen && (
                  <Button
                    id={inputId("start-custody-confirmation", item.id)}
                    type="button"
                    variant="secondary"
                    disabled={confirmCustody.isPending}
                    onClick={() => {
                      custodyFocusReturnId.current = null;
                      setCustodyFeedback(null);
                      setCustodyConfirmationId(item.id);
                      setCustodyAcknowledged(false);
                    }}
                    className="w-full sm:w-fit"
                  >
                    Verify custody for {title}
                  </Button>
                )}

                {canConfirm && confirmationIsOpen && (
                  <fieldset disabled={confirmCustody.isPending} className="grid min-w-0 gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <legend className="px-1 text-sm font-semibold text-foreground">Confirm campus custody</legend>
                    <p className="break-words text-sm leading-relaxed text-foreground">Confirming updates the custody record for <span className="font-semibold">{title}</span>. Do not proceed based only on a reporter's statement.</p>
                    <label htmlFor={inputId("custody-acknowledgement", item.id)} className="flex min-w-0 items-start gap-3 rounded-lg p-1 text-sm leading-relaxed text-foreground">
                      <input
                        id={inputId("custody-acknowledgement", item.id)}
                        type="checkbox"
                        checked={custodyAcknowledged}
                        onChange={(event) => setCustodyAcknowledged(event.target.checked)}
                        className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <span>I have physically verified that this property is in campus security custody.</span>
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        type="button"
                        disabled={!custodyAcknowledged || confirmCustody.isPending}
                        onClick={() => confirmCustody.mutate({ id: item.id, title })}
                        className="w-full sm:w-auto"
                      >
                        {confirmingThisItem ? "Confirming campus custody..." : "Confirm campus security custody"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={confirmCustody.isPending}
                        onClick={() => {
                          custodyFocusReturnId.current = item.id;
                          setCustodyConfirmationId(null);
                          setCustodyAcknowledged(false);
                        }}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </div>
                  </fieldset>
                )}
              </article>
            );
          })}
        </div>

        {custody.data && custodyPaginationVisible && (
          <nav aria-label="Custody report pages" className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <Button type="button" variant="outline" disabled={custodyPage <= 1 || custody.isPending} onClick={() => setCustodyPage((current) => Math.max(1, current - 1))} className="w-full sm:w-auto">Previous custody page</Button>
            <p className="break-words text-center text-sm text-muted-foreground">
              Page {custodyPage} · {custody.data.totalCount === null ? "count unavailable" : `${custody.data.totalCount} custody reports`} · {custody.data.pageSize} per page
            </p>
            <Button type="button" variant="outline" disabled={!custody.data.hasMore || custody.isPending} onClick={() => setCustodyPage((current) => current + 1)} className="w-full sm:w-auto">Next custody page</Button>
          </nav>
        )}
      </SectionCard>
    </div>
  );
}

export default StaffClaimsPage;

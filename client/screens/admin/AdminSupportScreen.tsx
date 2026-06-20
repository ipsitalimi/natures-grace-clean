import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useSupportTickets } from "@/context/SupportTicketsContext";
import type { SupportTicketView, TicketPriority, TicketStatus } from "@/data/supportTickets";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import {
  SUPPORT_COPY_EDITOR_SECTIONS,
  allSupportCopyEditorKeys,
  createFaqItem,
  deleteFaqItem,
  emptySupportCopyDrafts,
  fetchAdminFaqDataset,
  fetchSupportCopyMap,
  formatSupportCopyForDisplay,
  getSupportCopyKey,
  moveFaqItem,
  updateFaqItem,
  upsertSupportCopy,
  type FaqCategoryRow,
  type FaqItemRow,
} from "@/services/content/helpSupportService";
import {
  fetchAdminFirstResponseStats,
  formatAvgFirstResponseHours,
} from "@/services/support/supportTicketsService";

function getPriorityColor(priority: TicketPriority) {
  switch (priority) {
    case "High":
      return "#C47A7A";
    case "Medium":
      return "#C4A97A";
    case "Low":
      return "#7BA68A";
  }
}

function getStatusColor(status: TicketStatus) {
  switch (status) {
    case "Open":
      return "#C47A7A";
    case "In Progress":
      return "#C4A97A";
    case "Resolved":
      return "#013220";
  }
}

export default function AdminSupportScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const {
    ticketViews: tickets,
    ticketsLoading,
    ticketsError,
    updateTicketStatus,
    addStaffReply,
  } = useSupportTickets();
  const [activeFilter, setActiveFilter] = useState<"All" | TicketStatus>("All");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [faqCats, setFaqCats] = useState<FaqCategoryRow[]>([]);
  const [faqItemsState, setFaqItemsState] = useState<FaqItemRow[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [helpCopyMap, setHelpCopyMap] = useState<Record<string, string> | null>(null);
  const [copyFetchError, setCopyFetchError] = useState<string | null>(null);
  const [copyDrafts, setCopyDrafts] = useState<Record<string, string>>(emptySupportCopyDrafts);
  const [savingCopySection, setSavingCopySection] = useState<string | null>(null);
  const [faqBusyId, setFaqBusyId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [newCatId, setNewCatId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");
  /** Live metric: ticket created_at → first Staff message (see `admin_first_response_stats`). */
  const [avgMetricLoading, setAvgMetricLoading] = useState(false);
  const [avgMetricError, setAvgMetricError] = useState<string | null>(null);
  const [avgMetricHours, setAvgMetricHours] = useState<number | null>(null);
  const [avgMetricSampleCount, setAvgMetricSampleCount] = useState(0);
  const [avgMetricFetched, setAvgMetricFetched] = useState(false);

  const loadAvgMetric = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setAvgMetricLoading(false);
      setAvgMetricFetched(true);
      setAvgMetricError(null);
      setAvgMetricHours(null);
      setAvgMetricSampleCount(0);
      return;
    }
    setAvgMetricLoading(true);
    setAvgMetricError(null);
    const res = await fetchAdminFirstResponseStats();
    setAvgMetricLoading(false);
    setAvgMetricFetched(true);
    if (!res.ok) {
      setAvgMetricError(res.error);
      setAvgMetricHours(null);
      setAvgMetricSampleCount(0);
      return;
    }
    setAvgMetricHours(res.avgHours);
    setAvgMetricSampleCount(res.sampleCount);
  }, []);

  const loadHelpData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setFaqLoading(false);
      setFaqError(null);
      setCopyFetchError(null);
      setHelpCopyMap(null);
      setCopyDrafts(emptySupportCopyDrafts());
      return;
    }
    setFaqLoading(true);
    setFaqError(null);
    setCopyFetchError(null);
    const faqRes = await fetchAdminFaqDataset();
    const copyRes = await fetchSupportCopyMap();
    setFaqLoading(false);
    if (!faqRes.ok) {
      setFaqError(faqRes.error);
      setFaqCats([]);
      setFaqItemsState([]);
    } else {
      setFaqCats(faqRes.categories);
      setFaqItemsState(faqRes.items);
    }
    if (!copyRes.ok) {
      setCopyFetchError(copyRes.error);
      setHelpCopyMap(null);
      setCopyDrafts(emptySupportCopyDrafts());
    } else {
      setHelpCopyMap(copyRes.map);
      const next = emptySupportCopyDrafts();
      for (const k of allSupportCopyEditorKeys()) {
        next[k] = copyRes.map[k] ?? "";
      }
      setCopyDrafts(next);
    }
  }, []);

  useEffect(() => {
    void loadHelpData();
    void loadAvgMetric();
  }, [loadHelpData, loadAvgMetric]);

  useEffect(() => {
    if (newCatId == null && faqCats.length > 0) {
      setNewCatId(faqCats[0].id);
    }
  }, [faqCats, newCatId]);

  const filters: ("All" | TicketStatus)[] = ["All", "Open", "In Progress", "Resolved"];

  const filteredTickets: SupportTicketView[] =
    activeFilter === "All" ? tickets : tickets.filter((t) => t.status === activeFilter);

  const openCount = tickets.filter((t) => t.status === "Open").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;

  const handleStatusChange = async (id: string, newStatus: TicketStatus) => {
    if (!isSupabaseConfigured()) {
      setActionError("Connect Supabase to update ticket status.");
      return;
    }
    setUpdatingStatus(true);
    setActionError(null);
    const ok = await updateTicketStatus(id, newStatus);
    if (!ok) {
      setActionError("Could not update ticket status.");
    }
    setUpdatingStatus(false);
  };

  const handleSendResponse = async (id: string) => {
    if (!responseText.trim() || sendingReply) return;
    if (!isSupabaseConfigured()) {
      setActionError("Connect Supabase to send replies.");
      return;
    }
    setSendingReply(true);
    setActionError(null);
    const ok = await addStaffReply(id, responseText.trim());
    if (!ok) {
      setActionError("Could not send reply.");
    } else {
      setResponseText("");
      void loadAvgMetric();
    }
    setSendingReply(false);
  };

  const updateDraft = (key: string, text: string) => {
    setCopyDrafts((p) => ({ ...p, [key]: text }));
  };

  const saveCopySection = async (sectionId: string) => {
    const section = SUPPORT_COPY_EDITOR_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;
    if (!isSupabaseConfigured()) {
      setFaqError("Connect Supabase to save support copy.");
      return;
    }
    setSavingCopySection(sectionId);
    setFaqError(null);
    for (const f of section.fields) {
      const body = copyDrafts[f.key] ?? "";
      const r = await upsertSupportCopy(f.key, body);
      if (!r.ok) {
        setFaqError(r.error);
        setSavingCopySection(null);
        return;
      }
    }
    setSavingCopySection(null);
    await loadHelpData();
  };

  const saveFaqEdits = async (id: string) => {
    if (!editQ.trim()) return;
    setFaqBusyId(id);
    setFaqError(null);
    const r = await updateFaqItem(id, { question: editQ.trim(), answer: editA.trim() });
    setFaqBusyId(null);
    if (!r.ok) setFaqError(r.error);
    else await loadHelpData();
  };

  const toggleFaqActive = async (item: FaqItemRow) => {
    setFaqBusyId(item.id);
    setFaqError(null);
    const r = await updateFaqItem(item.id, { is_active: !item.is_active });
    setFaqBusyId(null);
    if (!r.ok) setFaqError(r.error);
    else await loadHelpData();
  };

  const removeFaq = async (id: string) => {
    setFaqBusyId(id);
    setFaqError(null);
    const r = await deleteFaqItem(id);
    setFaqBusyId(null);
    if (!r.ok) setFaqError(r.error);
    else {
      if (expandedFaq === id) setExpandedFaq(null);
      await loadHelpData();
    }
  };

  const reorderFaq = async (id: string, dir: "up" | "down") => {
    setFaqBusyId(id);
    const r = await moveFaqItem(id, dir);
    setFaqBusyId(null);
    if (!r.ok) setFaqError(r.error);
    await loadHelpData();
  };

  const addFaqRow = async () => {
    if (!newQ.trim()) return;
    setFaqError(null);
    const r = await createFaqItem({
      categoryId: newCatId,
      question: newQ.trim(),
      answer: newA.trim(),
    });
    if (!r.ok) {
      setFaqError(r.error);
      return;
    }
    setNewQ("");
    setNewA("");
    await loadHelpData();
  };

  const toggleExpandFaq = (faq: FaqItemRow) => {
    if (expandedFaq === faq.id) {
      setExpandedFaq(null);
      return;
    }
    setExpandedFaq(faq.id);
    setEditQ(faq.question);
    setEditA(faq.answer);
  };

  const sortedCats = [...faqCats].sort((a, b) => a.sort_order - b.sort_order);
  const itemsForCat = (catId: string | null) =>
    faqItemsState
      .filter((i) => (catId === null ? i.category_id == null : i.category_id === catId))
      .sort((a, b) => a.sort_order - b.sort_order);

  const fallbackAvgLabel = formatSupportCopyForDisplay(
    getSupportCopyKey(helpCopyMap, "avg_response_label")
  );
  const formattedComputedHours =
    avgMetricSampleCount > 0 && avgMetricHours != null && Number.isFinite(avgMetricHours)
      ? formatAvgFirstResponseHours(avgMetricHours)
      : "";
  const computedAvgLabel = formattedComputedHours.length > 0 ? formattedComputedHours : null;
  const avgResponseChipValue = (() => {
    if (!isSupabaseConfigured()) return fallbackAvgLabel;
    if (avgMetricLoading || !avgMetricFetched) return "…";
    if (avgMetricError) return fallbackAvgLabel;
    if (computedAvgLabel) return computedAvgLabel;
    return fallbackAvgLabel;
  })();
  const avgResponseHint = (() => {
    if (!isSupabaseConfigured() || avgMetricLoading || !avgMetricFetched) return null;
    if (avgMetricError) return "Could not load live average. Showing saved label — tap to retry.";
    if (avgMetricSampleCount === 0) return "No tickets with a staff reply yet; showing saved label.";
    if (!computedAvgLabel) return "Metric unavailable; showing saved label.";
    return null;
  })();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Support Tickets</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{openCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Open</ThemedText>
        </View>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{inProgressCount}</ThemedText>
          <ThemedText style={styles.statLabel}>In Progress</ThemedText>
        </View>
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>{resolvedCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Resolved</ThemedText>
        </View>
        <View style={styles.statChip} testID="stat-chip-avg-response">
          {avgMetricLoading ? (
            <ActivityIndicator color={Colors.light.accent} style={{ marginBottom: 4 }} />
          ) : (
            <ThemedText style={styles.statValue}>{avgResponseChipValue}</ThemedText>
          )}
          <ThemedText style={styles.statLabel}>Avg Response</ThemedText>
        </View>
      </View>
      {avgResponseHint ? (
        avgMetricError ? (
          <Pressable onPress={() => void loadAvgMetric()} testID="hint-avg-response-retry">
            <ThemedText style={styles.statMetricHint}>{avgResponseHint}</ThemedText>
          </Pressable>
        ) : (
          <ThemedText style={styles.statMetricHint} testID="hint-avg-response-fallback">
            {avgResponseHint}
          </ThemedText>
        )
      ) : null}

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterTab, activeFilter === f ? styles.filterTabActive : null]}
            onPress={() => setActiveFilter(f)}
            testID={`button-filter-${f.toLowerCase().replace(/\s/g, "-")}`}
          >
            <ThemedText
              style={[styles.filterTabText, activeFilter === f ? styles.filterTabTextActive : null]}
            >
              {f}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {ticketsLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.loadingText}>Loading support tickets…</ThemedText>
        </View>
      ) : null}

      {ticketsError ? (
        <ThemedText style={styles.errorText}>{ticketsError}</ThemedText>
      ) : null}

      {actionError ? (
        <ThemedText style={styles.errorText}>{actionError}</ThemedText>
      ) : null}

      {!ticketsLoading && !ticketsError && filteredTickets.length === 0 ? (
        <ThemedText style={styles.emptyText}>No support tickets yet.</ThemedText>
      ) : null}

      {filteredTickets.map((ticket) => (
        <View key={ticket.id} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <ThemedText style={styles.ticketNumber}>#{ticket.number}</ThemedText>
            <View style={styles.badgeRow}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
                <ThemedText style={styles.badgeText}>{ticket.priority}</ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
                <ThemedText style={styles.badgeText}>{ticket.status}</ThemedText>
              </View>
            </View>
          </View>
          <ThemedText style={styles.ticketTitle}>{ticket.title}</ThemedText>
          {expandedTicket !== ticket.id ? (
            <ThemedText style={styles.ticketPreview}>{ticket.preview}</ThemedText>
          ) : null}
          <View style={styles.ticketMeta}>
            <ThemedText style={styles.ticketUser}>{ticket.userName}</ThemedText>
            <ThemedText style={styles.ticketDate}>{ticket.date}</ThemedText>
          </View>

          {expandedTicket === ticket.id ? (
            <View style={styles.ticketDetail}>
              <ThemedText style={styles.detailLabel}>Full Message</ThemedText>
              <ThemedText style={styles.detailMessage}>{ticket.fullMessage}</ThemedText>

              {ticket.responses.length > 0 ? (
                <>
                  <ThemedText style={styles.detailLabel}>Response History</ThemedText>
                  {ticket.responses.map((resp) => (
                    <View key={resp.id} style={styles.responseItem}>
                      <View style={styles.responseHeader}>
                        <ThemedText style={styles.responseFrom}>{resp.from}</ThemedText>
                        <ThemedText style={styles.responseDate}>{resp.date}</ThemedText>
                      </View>
                      <ThemedText style={styles.responseMessage}>{resp.message}</ThemedText>
                    </View>
                  ))}
                </>
              ) : null}

              <ThemedText style={styles.detailLabel}>Reply</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={responseText}
                onChangeText={setResponseText}
                placeholder="Type your response..."
                placeholderTextColor={`${Colors.light.textSecondary}80`}
                multiline
                testID={`input-response-${ticket.id}`}
              />
              <Pressable
                style={[styles.sendBtn, sendingReply && styles.sendBtnDisabled]}
                onPress={() => handleSendResponse(ticket.id)}
                disabled={sendingReply}
                testID={`button-send-response-${ticket.id}`}
              >
                {sendingReply ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="send" size={14} color="#FFFFFF" />
                    <ThemedText style={styles.sendBtnText}>Send Response</ThemedText>
                  </>
                )}
              </Pressable>

              <View style={styles.statusActions}>
                {ticket.status !== "In Progress" ? (
                  <Pressable
                    style={[styles.statusActionBtn, updatingStatus && styles.sendBtnDisabled]}
                    onPress={() => handleStatusChange(ticket.id, "In Progress")}
                    disabled={updatingStatus}
                    testID={`button-mark-progress-${ticket.id}`}
                  >
                    <ThemedText style={styles.statusActionText}>Mark In Progress</ThemedText>
                  </Pressable>
                ) : null}
                {ticket.status !== "Resolved" ? (
                  <Pressable
                    style={[
                      styles.statusActionBtn,
                      styles.resolveBtn,
                      updatingStatus && styles.sendBtnDisabled,
                    ]}
                    onPress={() => handleStatusChange(ticket.id, "Resolved")}
                    disabled={updatingStatus}
                    testID={`button-resolve-${ticket.id}`}
                  >
                    <ThemedText style={styles.resolveBtnText}>Resolve</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          <Pressable
            style={styles.viewBtn}
            onPress={() =>
              setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)
            }
            testID={`button-view-ticket-${ticket.id}`}
          >
            <ThemedText style={styles.viewBtnText}>
              {expandedTicket === ticket.id ? "Collapse" : "View"}
            </ThemedText>
            <Feather
              name={expandedTicket === ticket.id ? "chevron-up" : "chevron-down"}
              size={14}
              color={Colors.light.accent}
            />
          </Pressable>
        </View>
      ))}

      {!isSupabaseConfigured() ? (
        <ThemedText style={styles.emptyText}>Connect Supabase to edit support hub / contact copy.</ThemedText>
      ) : null}

      {copyFetchError ? (
        <Pressable onPress={() => void loadHelpData()} testID="button-support-copy-global-retry">
          <ThemedText style={styles.errorText}>{copyFetchError} — tap to reload copy</ThemedText>
        </Pressable>
      ) : null}

      {SUPPORT_COPY_EDITOR_SECTIONS.map((sec) => (
        <View key={sec.id} style={styles.avgEditor}>
          <ThemedText style={styles.copySectionTitle}>{sec.title}</ThemedText>
          {sec.fields.map((f) => (
            <React.Fragment key={f.key}>
              <ThemedText style={styles.fieldMiniLabel}>{f.label}</ThemedText>
              <TextInput
                style={f.multiline ? [styles.input, styles.textArea, styles.copyMultiline] : styles.input}
                value={copyDrafts[f.key] ?? ""}
                onChangeText={(t) => updateDraft(f.key, t)}
                placeholder=""
                placeholderTextColor={`${Colors.light.textSecondary}80`}
                multiline={Boolean(f.multiline)}
                editable={savingCopySection !== sec.id}
                testID={`input-support-copy-${f.key}`}
              />
            </React.Fragment>
          ))}
          <Pressable
            style={[styles.smallSaveBtn, savingCopySection === sec.id && styles.sendBtnDisabled]}
            onPress={() => void saveCopySection(sec.id)}
            disabled={Boolean(savingCopySection)}
            testID={`button-save-support-copy-${sec.id}`}
          >
            {savingCopySection === sec.id ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <ThemedText style={styles.smallSaveBtnText}>Save section</ThemedText>
            )}
          </Pressable>
        </View>
      ))}

      <ThemedText style={styles.subSectionTitle}>FAQ</ThemedText>
      {!isSupabaseConfigured() ? (
        <ThemedText style={styles.emptyText}>Connect Supabase to manage FAQs.</ThemedText>
      ) : null}

      {faqLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.light.accent} />
          <ThemedText style={styles.loadingText}>Loading FAQs…</ThemedText>
        </View>
      ) : null}

      {faqError ? (
        <Pressable onPress={() => void loadHelpData()} testID="button-faq-retry">
          <ThemedText style={styles.errorText}>{faqError} — tap to retry</ThemedText>
        </Pressable>
      ) : null}

      {isSupabaseConfigured() && !faqLoading && !faqError && sortedCats.length === 0 && faqItemsState.length === 0 ? (
        <ThemedText style={styles.emptyText}>No FAQ rows loaded.</ThemedText>
      ) : null}

      {sortedCats.map((cat) =>
        itemsForCat(cat.id).length ? (
          <View key={cat.id} style={styles.faqCatBlock}>
            <ThemedText style={styles.faqCatTitle}>{cat.title}</ThemedText>
            {itemsForCat(cat.id).map((faq) => (
              <View key={faq.id} style={styles.faqCard}>
                <Pressable style={styles.faqHeader} onPress={() => toggleExpandFaq(faq)} testID={`button-faq-${faq.id}`}>
                  <ThemedText style={styles.faqQuestion}>
                    {faq.is_active ? "" : "(Paused) "}
                    {faq.question}
                  </ThemedText>
                  <Feather
                    name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={Colors.light.accent}
                  />
                </Pressable>
                {expandedFaq === faq.id ? (
                  <View style={styles.faqEditor}>
                    <ThemedText style={styles.detailLabel}>Question</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={editQ}
                      onChangeText={setEditQ}
                      editable={faqBusyId !== faq.id}
                      testID={`input-faq-q-${faq.id}`}
                    />
                    <ThemedText style={styles.detailLabel}>Answer</ThemedText>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editA}
                      onChangeText={setEditA}
                      multiline
                      editable={faqBusyId !== faq.id}
                      testID={`input-faq-a-${faq.id}`}
                    />
                    <View style={styles.faqActionRow}>
                      <Pressable
                        style={[styles.miniBtn, faqBusyId === faq.id && styles.sendBtnDisabled]}
                        onPress={() => void saveFaqEdits(faq.id)}
                        disabled={faqBusyId === faq.id}
                      >
                        <ThemedText style={styles.miniBtnText}>Save</ThemedText>
                      </Pressable>
                      <Pressable
                        style={styles.miniBtn}
                        onPress={() => void toggleFaqActive(faq)}
                        disabled={faqBusyId === faq.id}
                      >
                        <ThemedText style={styles.miniBtnText}>{faq.is_active ? "Pause" : "Resume"}</ThemedText>
                      </Pressable>
                      <Pressable
                        style={styles.miniBtn}
                        onPress={() => void reorderFaq(faq.id, "up")}
                        disabled={faqBusyId === faq.id}
                      >
                        <ThemedText style={styles.miniBtnText}>Up</ThemedText>
                      </Pressable>
                      <Pressable
                        style={styles.miniBtn}
                        onPress={() => void reorderFaq(faq.id, "down")}
                        disabled={faqBusyId === faq.id}
                      >
                        <ThemedText style={styles.miniBtnText}>Dn</ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.miniBtnDanger, faqBusyId === faq.id && styles.sendBtnDisabled]}
                        onPress={() => void removeFaq(faq.id)}
                        disabled={faqBusyId === faq.id}
                      >
                        <ThemedText style={styles.miniBtnDangerText}>Delete</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <ThemedText style={styles.faqPreview} numberOfLines={2}>
                    {faq.answer}
                  </ThemedText>
                )}
              </View>
            ))}
          </View>
        ) : null
      )}

      {itemsForCat(null).length > 0 ? (
        <View style={styles.faqCatBlock}>
          <ThemedText style={styles.faqCatTitle}>Uncategorized</ThemedText>
          {itemsForCat(null).map((faq) => (
            <View key={faq.id} style={styles.faqCard}>
              <Pressable style={styles.faqHeader} onPress={() => toggleExpandFaq(faq)} testID={`button-faq-${faq.id}`}>
                <ThemedText style={styles.faqQuestion}>
                  {faq.is_active ? "" : "(Paused) "}
                  {faq.question}
                </ThemedText>
                <Feather
                  name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={Colors.light.accent}
                />
              </Pressable>
              {expandedFaq === faq.id ? (
                <View style={styles.faqEditor}>
                  <ThemedText style={styles.detailLabel}>Question</ThemedText>
                  <TextInput style={styles.input} value={editQ} onChangeText={setEditQ} editable={faqBusyId !== faq.id} />
                  <ThemedText style={styles.detailLabel}>Answer</ThemedText>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editA}
                    onChangeText={setEditA}
                    multiline
                    editable={faqBusyId !== faq.id}
                  />
                  <View style={styles.faqActionRow}>
                    <Pressable
                      style={[styles.miniBtn, faqBusyId === faq.id && styles.sendBtnDisabled]}
                      onPress={() => void saveFaqEdits(faq.id)}
                      disabled={faqBusyId === faq.id}
                    >
                      <ThemedText style={styles.miniBtnText}>Save</ThemedText>
                    </Pressable>
                    <Pressable style={styles.miniBtn} onPress={() => void toggleFaqActive(faq)} disabled={faqBusyId === faq.id}>
                      <ThemedText style={styles.miniBtnText}>{faq.is_active ? "Pause" : "Resume"}</ThemedText>
                    </Pressable>
                    <Pressable style={styles.miniBtn} onPress={() => void reorderFaq(faq.id, "up")} disabled={faqBusyId === faq.id}>
                      <ThemedText style={styles.miniBtnText}>Up</ThemedText>
                    </Pressable>
                    <Pressable style={styles.miniBtn} onPress={() => void reorderFaq(faq.id, "down")} disabled={faqBusyId === faq.id}>
                      <ThemedText style={styles.miniBtnText}>Dn</ThemedText>
                    </Pressable>
                    <Pressable
                      style={[styles.miniBtnDanger, faqBusyId === faq.id && styles.sendBtnDisabled]}
                      onPress={() => void removeFaq(faq.id)}
                      disabled={faqBusyId === faq.id}
                    >
                      <ThemedText style={styles.miniBtnDangerText}>Delete</ThemedText>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <ThemedText style={styles.faqPreview} numberOfLines={2}>
                  {faq.answer}
                </ThemedText>
              )}
            </View>
          ))}
        </View>
      ) : null}

      {isSupabaseConfigured() && sortedCats.length > 0 ? (
        <View style={styles.addFaqBlock}>
          <ThemedText style={styles.detailLabel}>Add FAQ</ThemedText>
          <View style={styles.catChipRow}>
            {sortedCats.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.catChip, newCatId === c.id && styles.catChipActive]}
                onPress={() => setNewCatId(c.id)}
              >
                <ThemedText style={[styles.catChipText, newCatId === c.id && styles.catChipTextActive]}>{c.title}</ThemedText>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={newQ}
            onChangeText={setNewQ}
            placeholder="Question"
            placeholderTextColor={`${Colors.light.textSecondary}80`}
            testID="input-new-faq-q"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={newA}
            onChangeText={setNewA}
            placeholder="Answer"
            placeholderTextColor={`${Colors.light.textSecondary}80`}
            multiline
            testID="input-new-faq-a"
          />
          <Pressable style={styles.sendBtn} onPress={() => void addFaqRow()} testID="button-add-faq">
            <ThemedText style={styles.sendBtnText}>Add FAQ</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  avgEditor: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  avgEditorLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textSecondary,
  },
  copySectionTitle: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: Spacing.xs,
  },
  fieldMiniLabel: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  copyMultiline: {
    minHeight: 72,
  },
  smallSaveBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  smallSaveBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  faqCatBlock: {
    marginBottom: Spacing.md,
  },
  faqCatTitle: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textMuted,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  faqEditor: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  faqPreview: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  faqActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  miniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.light.accent,
  },
  miniBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  miniBtnDanger: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.xs,
    backgroundColor: "rgba(139,58,58,0.1)",
  },
  miniBtnDangerText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#8B3A3A",
  },
  addFaqBlock: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${Colors.light.divider}30`,
    gap: Spacing.sm,
  },
  catChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundRoot,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  catChipActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  catChipText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  catChipTextActive: {
    color: "#FFFFFF",
  },
  statChip: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  statMetricHint: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    marginTop: -8,
    marginBottom: Spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.cardBackground,
  },
  filterTabActive: {
    backgroundColor: Colors.light.accent,
  },
  filterTabText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#8B3A3A",
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.lg,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  ticketCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  ticketNumber: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.textSecondary,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  ticketTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  ticketPreview: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  ticketMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: 8,
  },
  ticketUser: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  ticketDate: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  ticketDetail: {
    borderTopWidth: 1,
    borderTopColor: `${Colors.light.divider}40`,
    paddingTop: 12,
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: 6,
    marginTop: 10,
  },
  detailMessage: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    lineHeight: 20,
  },
  responseItem: {
    backgroundColor: `${Colors.light.accent}08`,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  responseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  responseFrom: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  responseDate: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  responseMessage: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    lineHeight: 19,
  },
  input: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  sendBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  statusActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: 4,
  },
  statusActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  statusActionText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  resolveBtn: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  resolveBtnText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: `${Colors.light.divider}20`,
    marginTop: 4,
  },
  viewBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  faqCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  faqQuestion: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  faqAnswer: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});

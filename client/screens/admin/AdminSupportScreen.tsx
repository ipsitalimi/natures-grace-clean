import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

type TicketStatus = "Open" | "In Progress" | "Resolved";
type Priority = "High" | "Medium" | "Low";

interface Ticket {
  id: string;
  number: number;
  title: string;
  preview: string;
  fullMessage: string;
  userName: string;
  date: string;
  status: TicketStatus;
  priority: Priority;
  responses: { from: string; message: string; date: string }[];
}

const initialTickets: Ticket[] = [
  {
    id: "t1",
    number: 1047,
    title: "Cannot book session",
    preview: "I'm trying to book...",
    fullMessage:
      "I'm trying to book a session with Dr. Priya Sharma but the app keeps showing an error. I've tried multiple times and even reinstalled the app but the issue persists.",
    userName: "Neha P.",
    date: "Feb 18",
    status: "Open",
    priority: "High",
    responses: [],
  },
  {
    id: "t2",
    number: 1046,
    title: "Payment failed",
    preview: "My payment was deducted...",
    fullMessage:
      "My payment was deducted but the booking was not confirmed. The amount of Rs. 1,200 was charged from my card but I did not receive any confirmation.",
    userName: "Raj K.",
    date: "Feb 17",
    status: "In Progress",
    priority: "High",
    responses: [
      {
        from: "Support",
        message: "We are looking into your payment issue. Please share your transaction ID.",
        date: "Feb 17",
      },
    ],
  },
  {
    id: "t3",
    number: 1045,
    title: "App crashes on profile",
    preview: "Whenever I try to edit...",
    fullMessage:
      "Whenever I try to edit my profile picture, the app crashes immediately. I'm using the latest version on Android.",
    userName: "Sarah M.",
    date: "Feb 17",
    status: "Open",
    priority: "Medium",
    responses: [],
  },
  {
    id: "t4",
    number: 1044,
    title: "Refund request",
    preview: "I want a refund for...",
    fullMessage:
      "I want a refund for my last session with Arjun Nair. The session did not meet my expectations and I feel it was not worth the amount paid.",
    userName: "Amit S.",
    date: "Feb 16",
    status: "In Progress",
    priority: "Medium",
    responses: [
      {
        from: "Support",
        message: "We have received your refund request and are reviewing it.",
        date: "Feb 16",
      },
    ],
  },
  {
    id: "t5",
    number: 1043,
    title: "Practitioner not responding",
    preview: "I booked a session but...",
    fullMessage:
      "I booked a session but the practitioner has not responded to my messages. It has been 3 days since I booked.",
    userName: "Priya L.",
    date: "Feb 15",
    status: "Resolved",
    priority: "Low",
    responses: [
      {
        from: "Support",
        message: "We have contacted the practitioner and they will respond within 24 hours.",
        date: "Feb 15",
      },
      {
        from: "Support",
        message: "The practitioner has confirmed your session. Issue resolved.",
        date: "Feb 16",
      },
    ],
  },
  {
    id: "t6",
    number: 1042,
    title: "Can't update payment method",
    preview: "My card was declined...",
    fullMessage:
      "My card was declined and I'm trying to update my payment method but the option is not available in the settings.",
    userName: "Dev R.",
    date: "Feb 14",
    status: "Resolved",
    priority: "Low",
    responses: [
      {
        from: "Support",
        message: "You can update your payment method under Profile > Payment Methods. Let us know if you still face issues.",
        date: "Feb 14",
      },
    ],
  },
];

const faqItems = [
  {
    id: "faq1",
    question: "How to book a session?",
    answer:
      "Go to the Home screen, browse available practitioners, select one, choose a time slot, and confirm your booking. You can also search by category.",
  },
  {
    id: "faq2",
    question: "Payment & Refund Policy",
    answer:
      "Payments are processed securely through our payment gateway. Refunds can be requested within 24 hours of a session. Refunds are typically processed within 5-7 business days.",
  },
  {
    id: "faq3",
    question: "How to contact a practitioner?",
    answer:
      "After booking a session, you can message your practitioner directly through the chat feature in the session details page.",
  },
  {
    id: "faq4",
    question: "Account & Privacy Settings",
    answer:
      "You can manage your account settings, privacy preferences, and notification preferences from Profile > Settings. You can also delete your account from there.",
  },
];

function getPriorityColor(priority: Priority) {
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
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [activeFilter, setActiveFilter] = useState<"All" | TicketStatus>("All");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const filters: ("All" | TicketStatus)[] = ["All", "Open", "In Progress", "Resolved"];

  const filteredTickets =
    activeFilter === "All" ? tickets : tickets.filter((t) => t.status === activeFilter);

  const openCount = tickets.filter((t) => t.status === "Open").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;

  const handleStatusChange = (id: string, newStatus: TicketStatus) => {
    setTickets(tickets.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
  };

  const handleSendResponse = (id: string) => {
    if (!responseText.trim()) return;
    setTickets(
      tickets.map((t) =>
        t.id === id
          ? {
              ...t,
              responses: [
                ...t.responses,
                { from: "Admin", message: responseText.trim(), date: "Feb 19" },
              ],
            }
          : t
      )
    );
    setResponseText("");
  };

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
        <View style={styles.statChip}>
          <ThemedText style={styles.statValue}>2.4 hrs</ThemedText>
          <ThemedText style={styles.statLabel}>Avg Response</ThemedText>
        </View>
      </View>

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
                  {ticket.responses.map((resp, idx) => (
                    <View key={idx} style={styles.responseItem}>
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
                style={styles.sendBtn}
                onPress={() => handleSendResponse(ticket.id)}
                testID={`button-send-response-${ticket.id}`}
              >
                <Feather name="send" size={14} color="#FFFFFF" />
                <ThemedText style={styles.sendBtnText}>Send Response</ThemedText>
              </Pressable>

              <View style={styles.statusActions}>
                {ticket.status !== "In Progress" ? (
                  <Pressable
                    style={styles.statusActionBtn}
                    onPress={() => handleStatusChange(ticket.id, "In Progress")}
                    testID={`button-mark-progress-${ticket.id}`}
                  >
                    <ThemedText style={styles.statusActionText}>Mark In Progress</ThemedText>
                  </Pressable>
                ) : null}
                {ticket.status !== "Resolved" ? (
                  <Pressable
                    style={[styles.statusActionBtn, styles.resolveBtn]}
                    onPress={() => handleStatusChange(ticket.id, "Resolved")}
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

      <ThemedText style={styles.subSectionTitle}>FAQ</ThemedText>
      {faqItems.map((faq) => (
        <View key={faq.id} style={styles.faqCard}>
          <Pressable
            style={styles.faqHeader}
            onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
            testID={`button-faq-${faq.id}`}
          >
            <ThemedText style={styles.faqQuestion}>{faq.question}</ThemedText>
            <Feather
              name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.light.accent}
            />
          </Pressable>
          {expandedFaq === faq.id ? (
            <ThemedText style={styles.faqAnswer}>{faq.answer}</ThemedText>
          ) : null}
        </View>
      ))}
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

import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";
import { usePlatformConfig } from "@/context/PlatformConfigContext";
import { ResourceItem } from "@/data/mockResources";

type ResourceType = "Article" | "Practice" | "Audio Session" | "Course";

const typeIcons: Record<ResourceType, keyof typeof Feather.glyphMap> = {
  "Article": "file-text",
  "Practice": "activity",
  "Audio Session": "headphones",
  "Course": "book-open",
};

function sectionFromType(type: ResourceType): string {
  switch (type) {
    case "Article": return "Articles";
    case "Audio Session": return "Audio Sessions";
    case "Practice": return "Practices";
    case "Course": return "Courses";
  }
}

function actionFromType(type: ResourceType): string {
  switch (type) {
    case "Article": return "Open";
    case "Audio Session": return "Play";
    case "Practice": return "Start";
    case "Course": return "Express interest";
  }
}

function getTypeBadgeColor(type: string) {
  switch (type) {
    case "Articles":
    case "Article":
      return Colors.light.accent;
    case "Audio Sessions":
    case "Audio Session":
      return Colors.light.brownDark;
    case "Practices":
    case "Practice":
      return "#013220";
    case "Courses":
    case "Course":
      return Colors.light.brownLight;
    default:
      return Colors.light.accent;
  }
}

function ResourceRow({
  resource,
  onDelete,
  isPublished,
  onTogglePublish,
}: {
  resource: ResourceItem;
  onDelete: () => void;
  isPublished: boolean;
  onTogglePublish: () => void;
}) {
  const displayType = resource.section;
  return (
    <View style={styles.resourceCard}>
      <View style={styles.resourceInfo}>
        <View style={styles.resourceTitleRow}>
          <ThemedText style={styles.resourceTitle} numberOfLines={1}>{resource.title}</ThemedText>
          <View style={[styles.statusBadge, isPublished ? styles.statusPublished : styles.statusUnpublished]}>
            <ThemedText style={[styles.statusBadgeText, isPublished ? styles.statusPublishedText : styles.statusUnpublishedText]}>
              {isPublished ? "Published" : "Unpublished"}
            </ThemedText>
          </View>
        </View>
        <View style={styles.resourceMeta}>
          <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(displayType) }]}>
            <ThemedText style={styles.typeBadgeText}>{displayType}</ThemedText>
          </View>
          {resource.duration ? (
            <ThemedText style={styles.resourceDuration}>{resource.duration}</ThemedText>
          ) : null}
        </View>
      </View>
      <Pressable style={styles.togglePublishButton} onPress={onTogglePublish} testID={`button-toggle-publish-${resource.id}`}>
        <Feather name={isPublished ? "eye" : "eye-off"} size={16} color={isPublished ? Colors.light.accent : Colors.light.textSecondary} />
      </Pressable>
      <Pressable style={styles.deleteIconButton} onPress={onDelete} testID={`button-delete-resource-${resource.id}`}>
        <Feather name="trash-2" size={16} color="#8B3A3A" />
      </Pressable>
    </View>
  );
}

function CourseResourceRow({
  resource,
  isPublished,
  onTogglePublish,
  onDelete,
  onSave,
}: {
  resource: ResourceItem;
  isPublished: boolean;
  onTogglePublish: () => void;
  onDelete: () => void;
  onSave: (patch: {
    instructorName: string;
    locations: string;
    certificateNote: string;
    price: string;
  }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [instructorName, setInstructorName] = useState(resource.instructorName ?? "");
  const [locations, setLocations] = useState(resource.locations ?? "");
  const [certificateNote, setCertificateNote] = useState(resource.certificateNote ?? "");
  const [price, setPrice] = useState(resource.price ?? "");

  return (
    <View style={styles.resourceCard}>
      <View style={styles.resourceInfo}>
        <View style={styles.resourceTitleRow}>
          <ThemedText style={styles.resourceTitle} numberOfLines={1}>{resource.title}</ThemedText>
          <View style={[styles.statusBadge, isPublished ? styles.statusPublished : styles.statusUnpublished]}>
            <ThemedText style={[styles.statusBadgeText, isPublished ? styles.statusPublishedText : styles.statusUnpublishedText]}>
              {isPublished ? "Published" : "Unpublished"}
            </ThemedText>
          </View>
        </View>
        <View style={styles.resourceMeta}>
          <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor("Courses") }]}>
            <ThemedText style={styles.typeBadgeText}>Course</ThemedText>
          </View>
        </View>
        {editing ? (
          <View style={styles.courseEditFields}>
            <ThemedText style={styles.inputLabel}>Instructor</ThemedText>
            <TextInput
              style={styles.input}
              value={instructorName}
              onChangeText={setInstructorName}
              placeholder="Instructor name"
              placeholderTextColor={Colors.light.textSecondary}
            />
            <ThemedText style={styles.inputLabel}>Locations</ThemedText>
            <TextInput
              style={styles.input}
              value={locations}
              onChangeText={setLocations}
              placeholder="e.g. Jaipur & Gurgaon"
              placeholderTextColor={Colors.light.textSecondary}
            />
            <ThemedText style={styles.inputLabel}>Reference price label</ThemedText>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. ₹2,500 (interest only — no in-app payment)"
              placeholderTextColor={Colors.light.textSecondary}
            />
            <ThemedText style={styles.inputLabel}>Certificate note</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={certificateNote}
              onChangeText={setCertificateNote}
              placeholder="Shown on course detail"
              placeholderTextColor={Colors.light.textSecondary}
              multiline
            />
            <Pressable
              style={styles.saveButton}
              onPress={() => {
                onSave({ instructorName, locations, certificateNote, price });
                setEditing(false);
              }}
              testID={`button-save-course-${resource.id}`}
            >
              <ThemedText style={styles.saveButtonText}>Save course details</ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setEditing(true)} testID={`button-edit-course-${resource.id}`}>
            <ThemedText style={styles.courseEditLink}>Edit instructor, locations & pricing</ThemedText>
          </Pressable>
        )}
      </View>
      <Pressable style={styles.togglePublishButton} onPress={onTogglePublish}>
        <Feather name={isPublished ? "eye" : "eye-off"} size={16} color={isPublished ? Colors.light.accent : Colors.light.textSecondary} />
      </Pressable>
      <Pressable style={styles.deleteIconButton} onPress={onDelete}>
        <Feather name="trash-2" size={16} color="#8B3A3A" />
      </Pressable>
    </View>
  );
}

export default function AdminResourcesScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const { resources, addResource, deleteResource, setResourcePublished, updateResource } = useDataContext();
  const [selectedType, setSelectedType] = useState<ResourceType | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formInstructor, setFormInstructor] = useState("");
  const [formLocations, setFormLocations] = useState("");
  const [formCertificate, setFormCertificate] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [saved, setSaved] = useState(false);
  const isPublished = (resource: (typeof resources)[0]) => resource.published !== false;

  const togglePublish = (id: string) => {
    const resource = resources.find((r) => r.id === id);
    if (!resource) return;
    setResourcePublished(id, !isPublished(resource));
  };

  const articles = resources.filter((r) => r.section === "Articles");
  const audioSessions = resources.filter((r) => r.section === "Audio Sessions");
  const practices = resources.filter((r) => r.section === "Practices");
  const courses = resources.filter((r) => r.section === "Courses");

  const publishedCount = resources.filter((r) => isPublished(r)).length;
  const unpublishedCount = resources.length - publishedCount;

  const handleTypeSelect = (type: ResourceType) => {
    setSelectedType(type);
    setFormTitle("");
    setFormDuration("");
    setFormContent("");
    setFormInstructor("");
    setFormLocations("");
    setFormCertificate("");
    setFormPrice("");
    setSaved(false);
  };

  const handleSave = () => {
    if (!formTitle.trim() || !selectedType) return;
    addResource({
      title: formTitle.trim(),
      description: formContent.trim().substring(0, 100) || `${formTitle.trim()} - a wellness resource.`,
      section: sectionFromType(selectedType),
      actionLabel: actionFromType(selectedType),
      duration: selectedType === "Audio Session" ? (formDuration.trim() || "5 min") : undefined,
      body: formContent.trim() || `${formTitle.trim()} content will be available soon.`,
      price: selectedType === "Course" ? formPrice.trim() || undefined : undefined,
      instructorName: selectedType === "Course" ? formInstructor.trim() || undefined : undefined,
      locations: selectedType === "Course" ? formLocations.trim() || undefined : undefined,
      certificateNote: selectedType === "Course" ? formCertificate.trim() || undefined : undefined,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setSelectedType(null);
      setFormTitle("");
      setFormDuration("");
      setFormContent("");
      setFormInstructor("");
      setFormLocations("");
      setFormCertificate("");
      setFormPrice("");
    }, 1500);
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
        <ThemedText style={styles.sectionTitle}>Resources ({resources.length})</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue} testID="text-total-resources">{resources.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Total</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue} testID="text-published-resources">{publishedCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Published</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue} testID="text-unpublished-resources">{unpublishedCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Unpublished</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue} testID="text-article-resources">{articles.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Articles</ThemedText>
        </View>
      </View>

      {resources.length === 0 ? (
        <View style={styles.emptyCard}>
          <ThemedText style={styles.emptyText}>
            No resources yet. Add an article, practice, or audio session below.
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.actionButtonsRow}>
        <Pressable
          style={[styles.actionButton, selectedType === "Article" ? styles.actionButtonActive : null]}
          onPress={() => handleTypeSelect("Article")}
          testID="button-add-article"
        >
          <Feather name="file-text" size={16} color={selectedType === "Article" ? "#FFFFFF" : Colors.light.accent} />
          <ThemedText style={[styles.actionButtonText, selectedType === "Article" ? styles.actionButtonTextActive : null]}>
            Add Article
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionButton, selectedType === "Practice" ? styles.actionButtonActive : null]}
          onPress={() => handleTypeSelect("Practice")}
          testID="button-add-practice"
        >
          <Feather name="activity" size={16} color={selectedType === "Practice" ? "#FFFFFF" : Colors.light.accent} />
          <ThemedText style={[styles.actionButtonText, selectedType === "Practice" ? styles.actionButtonTextActive : null]}>
            Add Practice
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionButton, selectedType === "Audio Session" ? styles.actionButtonActive : null]}
          onPress={() => handleTypeSelect("Audio Session")}
          testID="button-add-audio"
        >
          <Feather name="headphones" size={16} color={selectedType === "Audio Session" ? "#FFFFFF" : Colors.light.accent} />
          <ThemedText style={[styles.actionButtonText, selectedType === "Audio Session" ? styles.actionButtonTextActive : null]}>
            Add Audio
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionButton, selectedType === "Course" ? styles.actionButtonActive : null]}
          onPress={() => handleTypeSelect("Course")}
          testID="button-add-course"
        >
          <Feather name="book-open" size={16} color={selectedType === "Course" ? "#FFFFFF" : Colors.light.accent} />
          <ThemedText style={[styles.actionButtonText, selectedType === "Course" ? styles.actionButtonTextActive : null]}>
            Add Course
          </ThemedText>
        </Pressable>
      </View>

      {selectedType ? (
        <>
          <ThemedText style={styles.subSectionTitle}>New {selectedType}</ThemedText>
          <View style={styles.formCard}>
            <ThemedText style={styles.inputLabel}>Title *</ThemedText>
            <TextInput
              style={styles.input}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="Resource title"
              placeholderTextColor={Colors.light.textSecondary}
              testID="input-resource-title"
            />

            <ThemedText style={styles.inputLabel}>Type</ThemedText>
            <View style={styles.typeDisplay}>
              <Feather name={typeIcons[selectedType]} size={16} color={Colors.light.accent} />
              <ThemedText style={styles.typeDisplayText}>{selectedType}</ThemedText>
            </View>

            {selectedType === "Audio Session" ? (
              <>
                <ThemedText style={styles.inputLabel}>Duration</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formDuration}
                  onChangeText={setFormDuration}
                  placeholder="e.g. 10 min"
                  placeholderTextColor={Colors.light.textSecondary}
                  testID="input-resource-duration"
                />
              </>
            ) : null}

            {selectedType === "Course" ? (
              <>
                <ThemedText style={styles.inputLabel}>Instructor</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formInstructor}
                  onChangeText={setFormInstructor}
                  placeholder="Instructor name"
                  placeholderTextColor={Colors.light.textSecondary}
                  testID="input-course-instructor"
                />
                <ThemedText style={styles.inputLabel}>Locations</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formLocations}
                  onChangeText={setFormLocations}
                  placeholder="e.g. Jaipur & Gurgaon"
                  placeholderTextColor={Colors.light.textSecondary}
                  testID="input-course-locations"
                />
                <ThemedText style={styles.inputLabel}>Reference price label</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formPrice}
                  onChangeText={setFormPrice}
                  placeholder="Optional — shown as reference only"
                  placeholderTextColor={Colors.light.textSecondary}
                  testID="input-course-price"
                />
                <ThemedText style={styles.inputLabel}>Certificate note</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formCertificate}
                  onChangeText={setFormCertificate}
                  placeholder="Optional certificate messaging"
                  placeholderTextColor={Colors.light.textSecondary}
                  testID="input-course-certificate"
                />
              </>
            ) : null}

            <ThemedText style={styles.inputLabel}>Content / Description</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formContent}
              onChangeText={setFormContent}
              placeholder="Resource content or description"
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              numberOfLines={4}
              testID="input-resource-content"
            />

            <Pressable style={styles.saveButton} onPress={handleSave} testID="button-save-resource">
              <ThemedText style={styles.saveButtonText}>Save Resource</ThemedText>
            </Pressable>

            {saved ? (
              <View style={styles.confirmationBanner}>
                <Feather name="check-circle" size={16} color="#013220" />
                <ThemedText style={styles.confirmationText}>Resource saved successfully</ThemedText>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <ThemedText style={styles.subSectionTitle}>Courses ({courses.length})</ThemedText>
      {courses.length === 0 ? (
        <ThemedText style={styles.emptyText}>No courses yet. Add a course above.</ThemedText>
      ) : null}
      {courses.map((resource) => (
        <CourseResourceRow
          key={resource.id}
          resource={resource}
          onDelete={() => deleteResource(resource.id)}
          isPublished={isPublished(resource)}
          onTogglePublish={() => togglePublish(resource.id)}
          onSave={(patch) =>
            void updateResource(resource.id, {
              instructorName: patch.instructorName,
              locations: patch.locations,
              certificateNote: patch.certificateNote,
              price: patch.price,
            })
          }
        />
      ))}

      <ThemedText style={styles.subSectionTitle}>Articles ({articles.length})</ThemedText>
      {articles.map((resource) => (
        <ResourceRow
          key={resource.id}
          resource={resource}
          onDelete={() => deleteResource(resource.id)}
          isPublished={isPublished(resource)}
          onTogglePublish={() => togglePublish(resource.id)}
        />
      ))}

      <ThemedText style={styles.subSectionTitle}>Audio Sessions ({audioSessions.length})</ThemedText>
      {audioSessions.map((resource) => (
        <ResourceRow
          key={resource.id}
          resource={resource}
          onDelete={() => deleteResource(resource.id)}
          isPublished={isPublished(resource)}
          onTogglePublish={() => togglePublish(resource.id)}
        />
      ))}

      <ThemedText style={styles.subSectionTitle}>Practices ({practices.length})</ThemedText>
      {practices.map((resource) => (
        <ResourceRow
          key={resource.id}
          resource={resource}
          onDelete={() => deleteResource(resource.id)}
          isPublished={isPublished(resource)}
          onTogglePublish={() => togglePublish(resource.id)}
        />
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
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  actionButtonActive: {
    backgroundColor: Colors.light.accent,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  actionButtonTextActive: {
    color: "#FFFFFF",
  },
  resourceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  resourceTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusPublished: {
    backgroundColor: "rgba(1, 50, 32, 0.15)",
  },
  statusUnpublished: {
    backgroundColor: "rgba(139, 58, 58, 0.15)",
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
  },
  statusPublishedText: {
    color: "#013220",
  },
  statusUnpublishedText: {
    color: "#8B3A3A",
  },
  resourceMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  resourceDuration: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  togglePublishButton: {
    padding: Spacing.sm,
  },
  deleteIconButton: {
    padding: Spacing.sm,
  },
  formCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  typeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  typeDisplayText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  saveButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  confirmationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(1, 50, 32, 0.15)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  confirmationText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#013220",
  },
  courseEditFields: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  courseEditLink: {
    marginTop: Spacing.sm,
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  emptyCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});

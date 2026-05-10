import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput, Modal, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useDataContext } from "@/context/DataContext";
import { StoreProduct } from "@/data/storeProducts";

type ApprovalStatus = "Approved" | "Pending" | "Rejected";

interface ProductApprovalState {
  productId: string;
  status: ApprovalStatus;
}

function getStatusColor(status: ApprovalStatus): string {
  switch (status) {
    case "Approved":
      return "#0D6D3D";
    case "Pending":
      return "#E8A60D";
    case "Rejected":
      return "#B83C3C";
    default:
      return "#013220";
  }
}

function ProductCard({
  product,
  status,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: {
  product: StoreProduct;
  status: ApprovalStatus;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View style={styles.productCard}>
      <View style={styles.badgeContainer}>
        <View style={[styles.approvalBadge, { backgroundColor: getStatusColor(status) }]}>
          <ThemedText style={styles.badgeText}>{status}</ThemedText>
        </View>
      </View>
      <View style={styles.imagePlaceholder}>
        <Feather name="package" size={28} color={Colors.light.textSecondary} />
      </View>
      <ThemedText style={styles.productName} numberOfLines={1}>{product.name}</ThemedText>
      <ThemedText style={styles.productCategory}>{product.category}</ThemedText>
      <ThemedText style={styles.productPrice}>Rs. {product.price.toFixed(2)}</ThemedText>
      <ThemedText style={styles.productDescription} numberOfLines={2}>{product.description}</ThemedText>
      <View style={styles.cardActions}>
        <Pressable
          style={styles.editCardButton}
          onPress={onEdit}
          testID={`button-edit-product-${product.id}`}
        >
          <Feather name="edit-2" size={14} color={Colors.light.textSecondary} />
          <ThemedText style={styles.editCardButtonText}>Edit</ThemedText>
        </Pressable>
        <Pressable
          style={styles.deleteCardButton}
          onPress={onDelete}
          testID={`button-delete-product-${product.id}`}
        >
          <Feather name="trash-2" size={14} color="#8B3A3A" />
        </Pressable>
      </View>
      {status === "Pending" ? (
        <View style={styles.pendingActions}>
          <Pressable style={styles.approveButton} onPress={onApprove} testID={`button-approve-product-${product.id}`}>
            <Feather name="check" size={14} color="#FFFFFF" />
            <ThemedText style={styles.approveButtonText}>Approve</ThemedText>
          </Pressable>
          <Pressable style={styles.rejectButton} onPress={onReject} testID={`button-reject-product-${product.id}`}>
            <Feather name="x" size={14} color="#FFFFFF" />
            <ThemedText style={styles.rejectButtonText}>Reject</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function AdminStoreScreen({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const { storeCategories, addProduct, updateProduct, deleteProduct } = useDataContext();
  const allProducts = storeCategories.flatMap((c) => c.products);

  // Commission & Policies state
  const [commissionRate, setCommissionRate] = useState("12");
  const [minimumPrice, setMinimumPrice] = useState("99");
  const [autoApprove, setAutoApprove] = useState(false);
  const [commissionSaved, setCommissionSaved] = useState(false);

  // Product approval state
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, ApprovalStatus>>(() => {
    const initialStatuses: Record<string, ApprovalStatus> = {};
    allProducts.forEach((product) => {
      initialStatuses[product.id] = "Approved";
    });
    return initialStatuses;
  });

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saved, setSaved] = useState(false);

  const resetForm = () => {
    setEditName("");
    setEditDescription("");
    setEditPrice("");
    setEditCategory("");
    setEditingProduct(null);
  };

  const handleEditProduct = (product: StoreProduct) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditDescription(product.description);
    setEditPrice(product.price.toString());
    setEditCategory(product.category);
    setShowAddForm(true);
  };

  const handleAddNew = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!editName.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        price: parseFloat(editPrice) || 0,
        category: editCategory.trim() || editingProduct.category,
      });
    } else {
      addProduct({
        name: editName.trim(),
        description: editDescription.trim() || "A wellness product from Nature's Grace.",
        price: parseFloat(editPrice) || 0,
        category: editCategory.trim() || "General",
      });
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowAddForm(false);
      resetForm();
    }, 1500);
  };

  const handleSaveCommissionSettings = () => {
    setCommissionSaved(true);
    setTimeout(() => {
      setCommissionSaved(false);
    }, 2000);
  };

  const handleApproveProduct = (productId: string) => {
    setApprovalStatuses((prev) => ({
      ...prev,
      [productId]: "Approved",
    }));
  };

  const handleRejectProduct = (productId: string) => {
    setApprovalStatuses((prev) => ({
      ...prev,
      [productId]: "Rejected",
    }));
  };

  // Calculate stats
  const totalProducts = allProducts.length;
  const approvedCount = Object.values(approvalStatuses).filter((status) => status === "Approved").length;
  const pendingCount = Object.values(approvalStatuses).filter((status) => status === "Pending").length;
  const totalRevenue = allProducts.reduce((sum, p) => sum + p.price, 0) * 1000; // Mock multiplier for realistic revenue

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBackToDashboard} testID="button-back-dashboard">
          <Feather name="arrow-left" size={16} color={Colors.light.accent} />
        </Pressable>
        <ThemedText style={styles.sectionTitle}>Store ({allProducts.length})</ThemedText>
        <Pressable style={styles.addButton} onPress={handleAddNew} testID="button-add-product">
          <Feather name="plus" size={16} color="#FFFFFF" />
          <ThemedText style={styles.addButtonText}>Add Product</ThemedText>
        </Pressable>
      </View>

      {/* Commission & Policies Section */}
      <View style={styles.commissionSection}>
        <View style={styles.sectionHeader}>
          <Feather name="settings" size={18} color={Colors.light.accent} />
          <ThemedText style={styles.sectionSubtitle}>Commission & Policies</ThemedText>
        </View>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Commission Rate</ThemedText>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.settingInput}
              value={commissionRate}
              onChangeText={setCommissionRate}
              placeholder="12"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="numeric"
              testID="input-commission-rate"
            />
            <ThemedText style={styles.inputSuffix}>%</ThemedText>
          </View>
        </View>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Minimum Price</ThemedText>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputPrefix}>Rs.</ThemedText>
            <TextInput
              style={styles.settingInput}
              value={minimumPrice}
              onChangeText={setMinimumPrice}
              placeholder="99"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="numeric"
              testID="input-minimum-price"
            />
          </View>
        </View>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Auto-Approve Listings</ThemedText>
          <Switch
            value={autoApprove}
            onValueChange={setAutoApprove}
            testID="toggle-auto-approve"
          />
        </View>

        <Pressable style={styles.saveCommissionButton} onPress={handleSaveCommissionSettings} testID="button-save-commission">
          <ThemedText style={styles.saveCommissionButtonText}>Save Settings</ThemedText>
        </Pressable>

        {commissionSaved ? (
          <View style={styles.confirmationBanner}>
            <Feather name="check-circle" size={16} color="#013220" />
            <ThemedText style={styles.confirmationText}>Settings saved successfully</ThemedText>
          </View>
        ) : null}
      </View>

      {/* Stats Row */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statLabel}>Total Products</ThemedText>
          <ThemedText style={styles.statValue}>{totalProducts}</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statLabel}>Approved</ThemedText>
          <ThemedText style={[styles.statValue, { color: "#0D6D3D" }]}>{approvedCount}</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statLabel}>Pending</ThemedText>
          <ThemedText style={[styles.statValue, { color: "#E8A60D" }]}>{pendingCount}</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statLabel}>Total Revenue</ThemedText>
          <ThemedText style={styles.statValue}>Rs. {totalRevenue.toLocaleString()}</ThemedText>
        </View>
      </View>

      <View style={styles.productGrid}>
        {allProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            status={approvalStatuses[product.id] || "Approved"}
            onEdit={() => handleEditProduct(product)}
            onDelete={() => deleteProduct(product.id)}
            onApprove={() => handleApproveProduct(product.id)}
            onReject={() => handleRejectProduct(product.id)}
          />
        ))}
      </View>

      <Modal visible={showAddForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editingProduct ? "Edit Product" : "Add Product"}
              </ThemedText>
              <Pressable onPress={() => { setShowAddForm(false); resetForm(); }} testID="button-close-product-form">
                <Feather name="x" size={22} color={Colors.light.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.inputLabel}>Name *</ThemedText>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Product name"
                placeholderTextColor={Colors.light.textSecondary}
                testID="input-product-name"
              />

              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Product description"
                placeholderTextColor={Colors.light.textSecondary}
                multiline
                numberOfLines={3}
                testID="input-product-description"
              />

              <ThemedText style={styles.inputLabel}>Price</ThemedText>
              <TextInput
                style={styles.input}
                value={editPrice}
                onChangeText={setEditPrice}
                placeholder="0.00"
                placeholderTextColor={Colors.light.textSecondary}
                keyboardType="numeric"
                testID="input-product-price"
              />

              <ThemedText style={styles.inputLabel}>Category</ThemedText>
              <TextInput
                style={styles.input}
                value={editCategory}
                onChangeText={setEditCategory}
                placeholder="e.g., Mindful Radiance"
                placeholderTextColor={Colors.light.textSecondary}
                testID="input-product-category"
              />

              <Pressable style={styles.saveButton} onPress={handleSave} testID="button-save-product">
                <ThemedText style={styles.saveButtonText}>
                  {editingProduct ? "Save Changes" : "Add Product"}
                </ThemedText>
              </Pressable>

              {saved ? (
                <View style={styles.confirmationBanner}>
                  <Feather name="check-circle" size={16} color="#013220" />
                  <ThemedText style={styles.confirmationText}>
                    {editingProduct ? "Product updated successfully" : "Product added successfully"}
                  </ThemedText>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
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
    flex: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  addButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  commissionSection: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  settingLabel: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: Colors.light.text,
    flex: 1,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundRoot,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    flex: 1,
  },
  settingInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.text,
  },
  inputSuffix: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginLeft: Spacing.xs,
  },
  inputPrefix: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginRight: Spacing.xs,
  },
  saveCommissionButton: {
    backgroundColor: Colors.light.button,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  saveCommissionButtonText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    width: "48%",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  productCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    width: "47%",
    flexGrow: 1,
    position: "relative",
  },
  badgeContainer: {
    marginBottom: Spacing.sm,
  },
  approvalBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  imagePlaceholder: {
    height: 80,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.light.textSecondary,
    backgroundColor: "rgba(1, 50, 32, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  productName: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.accent,
    marginBottom: Spacing.xs,
  },
  productDescription: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  editCardButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.textSecondary,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  editCardButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: Colors.light.textSecondary,
  },
  deleteCardButton: {
    padding: Spacing.xs,
  },
  pendingActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  approveButton: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D6D3D",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  approveButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  rejectButton: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B83C3C",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  rejectButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.light.backgroundRoot,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
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
    minHeight: 80,
    textAlignVertical: "top",
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
});

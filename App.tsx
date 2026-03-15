import React, { useEffect, useState } from "react"
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import BorrowItem from "./components/BorrowItem"
import CDItem from "./components/CDItem"

import { loadData, saveData } from "./storage"
import { BorrowedCD, CD } from "./types"

const PENALTY_PER_DAY = 2

export default function App() {
  const [cds, setCds] = useState<CD[]>([])
  const [borrowed, setBorrowed] = useState<BorrowedCD[]>([])
  const [totalIncome, setTotalIncome] = useState<number>(0)
  const [totalBorrowed, setTotalBorrowed] = useState<number>(0)
  const [borrowerName, setBorrowerName] = useState<string>("User")
  const [borrowerHistory, setBorrowerHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showOverdueOnly, setShowOverdueOnly] = useState<boolean>(false)
  const [sortAsc, setSortAsc] = useState<boolean>(true)
  const [returnModalVisible, setReturnModalVisible] = useState<boolean>(false)
  const [selectedReturn, setSelectedReturn] = useState<BorrowedCD | null>(null)
  const [pendingPenalty, setPendingPenalty] = useState<number>(0)
  const [overridePenalty, setOverridePenalty] = useState<boolean>(false)

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    saveData("cds", cds)
    saveData("borrowed", borrowed)
    saveData("income", totalIncome)
    saveData("totalBorrowed", totalBorrowed)
    saveData("borrowerHistory", borrowerHistory)
  }, [cds, borrowed, totalIncome, totalBorrowed, borrowerHistory])

  const loadAllData = async () => {
    const savedCDs = await loadData("cds")
    const savedBorrowed = await loadData("borrowed")
    const savedIncome = await loadData("income")
    const savedTotalBorrowed = await loadData("totalBorrowed")
    const savedBorrowerHistory = await loadData("borrowerHistory")

    // If saved data exists but is clearly inconsistent (e.g. all copies are 0 while nothing is borrowed), reset to defaults.
    const shouldResetToDefault =
      Array.isArray(savedCDs) &&
      savedCDs.length > 0 &&
      savedCDs.every((cd) => cd.copies === 0) &&
      (!Array.isArray(savedBorrowed) || savedBorrowed.length === 0)

    if (shouldResetToDefault) {
      initializeCDs()
      saveData("borrowed", [])
      saveData("income", 0)
      saveData("totalBorrowed", 0)
      saveData("borrowerHistory", [])
    } else if (savedCDs) {
      setCds(savedCDs)
    } else {
      initializeCDs()
    }

    if (savedBorrowed) setBorrowed(savedBorrowed)
    if (savedIncome) setTotalIncome(savedIncome)
    if (savedTotalBorrowed) setTotalBorrowed(savedTotalBorrowed)
    if (savedBorrowerHistory) setBorrowerHistory(savedBorrowerHistory)
  }

  const initializeCDs = () => {
    const initial: CD[] = [
      { id: "1", title: "Thriller", artist: "Michael Jackson", copies: 5 },
      { id: "2", title: "Back in Black", artist: "AC/DC", copies: 5 },
      { id: "3", title: "21", artist: "Adele", copies: 5 }
    ]
    setCds(initial)
  }

  const calculatePenalty = (dueDateString: string) => {
    // Use date-only comparison to avoid charging a penalty on the due date itself.
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const due = new Date(dueDateString)
    due.setHours(0, 0, 0, 0)

    if (today > due) {
      const diffDays = Math.floor(
        (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
      )
      return diffDays * PENALTY_PER_DAY
    }

    return 0
  }

  const getFilteredBorrowed = () => {
    const list = [...borrowed]

    const filteredBySearch = list.filter((item) => {
      const lower = searchQuery.trim().toLowerCase()
      if (!lower) return true
      return (
        item.title.toLowerCase().includes(lower) ||
        item.borrower.toLowerCase().includes(lower)
      )
    })

    const filtered = showOverdueOnly
      ? filteredBySearch.filter((item) => calculatePenalty(item.dueDate) > 0)
      : filteredBySearch

    filtered.sort((a, b) => {
      const aDate = new Date(a.dueDate).getTime()
      const bDate = new Date(b.dueDate).getTime()
      return sortAsc ? aDate - bDate : bDate - aDate
    })

    return filtered
  }

  const getFilteredCDs = () => {
    const lower = searchQuery.trim().toLowerCase()
    if (!lower) return cds

    return cds.filter((cd) => {
      return (
        cd.title.toLowerCase().includes(lower) ||
        cd.artist.toLowerCase().includes(lower)
      )
    })
  }

  const borrowCD = (id: string) => {
    const cdIndex = cds.findIndex((cd) => cd.id === id)
    if (cdIndex < 0) return

    if (cds[cdIndex].copies === 0) {
      Alert.alert("CD not available")
      return
    }

    const borrowDate = new Date()
    const dueDate = new Date()
    dueDate.setDate(borrowDate.getDate() + 7)

    const borrower = borrowerName.trim() || "User"

    const newBorrow: BorrowedCD = {
      id: Date.now().toString(),
      cdId: id,
      title: cds[cdIndex].title,
      borrower,
      borrowDate: borrowDate.toDateString(),
      dueDate: dueDate.toDateString(),
      penalty: 0,
    }

    const updatedCDs = [...cds]
    updatedCDs[cdIndex].copies -= 1

    const updatedHistory = [
      borrower,
      ...borrowerHistory.filter((name) => name.toLowerCase() !== borrower.toLowerCase()),
    ].slice(0, 5)

    setCds(updatedCDs)
    setBorrowed([...borrowed, newBorrow])
    setTotalBorrowed(totalBorrowed + 1)
    setBorrowerHistory(updatedHistory)
  }

  const openReturnModal = (borrowId: string) => {
    const item = borrowed.find((b) => b.id === borrowId)
    if (!item) return

    setSelectedReturn(item)
    setPendingPenalty(calculatePenalty(item.dueDate))
    setOverridePenalty(false)
    setReturnModalVisible(true)
  }

  const confirmReturn = () => {
    if (!selectedReturn) return

    const updatedBorrowed = borrowed.filter((b) => b.id !== selectedReturn.id)
    const cdIndex = cds.findIndex((cd) => cd.id === selectedReturn.cdId)

    const updatedCDs = [...cds]
    if (cdIndex >= 0) {
      updatedCDs[cdIndex].copies += 1
    }

    setBorrowed(updatedBorrowed)
    setCds(updatedCDs)
    setTotalIncome(totalIncome + (overridePenalty ? 0 : pendingPenalty))

    setReturnModalVisible(false)
    setSelectedReturn(null)

    Alert.alert(
      "Returned",
      `Penalty: PHP ${overridePenalty ? 0 : pendingPenalty}`
    )
  }

  const resetAllData = () => {
    const initial: CD[] = [
      { id: "1", title: "Thriller", artist: "Michael Jackson", copies: 5 },
      { id: "2", title: "Back in Black", artist: "AC/DC", copies: 5 },
      { id: "3", title: "21", artist: "Adele", copies: 5 },
    ]

    setCds(initial)
    setBorrowed([])
    setTotalIncome(0)
    setTotalBorrowed(0)
    setBorrowerName("User")
    setBorrowerHistory([])
    setShowOverdueOnly(false)
    setSortAsc(true)

    saveData("cds", initial)
    saveData("borrowed", [])
    saveData("income", 0)
    saveData("totalBorrowed", 0)
    saveData("borrowerHistory", [])
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>CD Borrow App</Text>

        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Borrower name"
            value={borrowerName}
          onChangeText={(value) => {
            setBorrowerName(value)
            setShowHistory(true)
          }}
          accessibilityLabel="Borrower name"
        />
      </View>

      {showHistory && borrowerHistory.length > 0 && (
        <View style={styles.historyContainer}>
          {borrowerHistory.map((name) => (
            <Pressable
              key={name}
              style={styles.historyItem}
              onPress={() => {
                setBorrowerName(name)
                setShowHistory(false)
              }}
            >
              <Text style={styles.historyText}>{name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search CDs or borrowers"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search"
        />
      </View>

      <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterButton,
              showOverdueOnly && styles.filterButtonActive,
            ]}
            onPress={() => setShowOverdueOnly((prev) => !prev)}
          >
            <Text
              style={
                showOverdueOnly
                  ? styles.filterButtonTextActive
                  : styles.filterButtonText
              }
            >
              {showOverdueOnly ? "Overdue" : "All"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.filterButton}
            onPress={() => setSortAsc((prev) => !prev)}
          >
            <Text style={styles.filterButtonText}>
              Sort: {sortAsc ? "Soonest" : "Latest"}
            </Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Available CDs</Text>
      <FlatList
        data={getFilteredCDs()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CDItem cd={item} onBorrow={borrowCD} />
        )}
        contentContainerStyle={styles.listContent}
      />

      <Text style={styles.sectionTitle}>Borrowed CDs</Text>
      <FlatList
        data={getFilteredBorrowed()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BorrowItem item={item} onReturn={openReturnModal} />
        )}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={returnModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReturnModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Return</Text>
            <Text style={styles.modalText}>
              {selectedReturn ? selectedReturn.title : ""}
            </Text>
            <Text style={styles.modalText}>
              Due: {selectedReturn?.dueDate}
            </Text>
            <Text style={styles.modalText}>
              Penalty: PHP {pendingPenalty}
            </Text>

            <Pressable
              style={styles.overrideRow}
              onPress={() => setOverridePenalty((prev) => !prev)}
            >
              <View
                style={
                  overridePenalty
                    ? styles.overrideCheckboxActive
                    : styles.overrideCheckbox
                }
              />
              <Text style={styles.overrideText}>Waive penalty (admin override)</Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setReturnModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalConfirm]}
                onPress={confirmReturn}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F7F8FA",
  },
  headerContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#1C1C1E",
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryText: {
    fontSize: 14,
    color: "#333",
  },
  listContent: {
    paddingBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 10,
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
  },
  resetButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  historyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  historyItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
  },
  historyText: {
    fontSize: 12,
    color: "#333",
  },
  searchRow: {
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  filterButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
  },
  overrideRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  overrideCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 10,
  },
  overrideCheckboxActive: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "#007AFF",
    marginRight: 10,
  },
  overrideText: {
    fontSize: 14,
    color: "#333",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCancel: {
    backgroundColor: "#E5E5EA",
    marginRight: 8,
  },
  modalConfirm: {
    backgroundColor: "#007AFF",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
})
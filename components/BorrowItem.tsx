import React from "react"
import { Button, StyleSheet, Text, View } from "react-native"
import { BorrowedCD } from "../types"

const PENALTY_PER_DAY = 2

interface Props {
  item: BorrowedCD
  onReturn: (id: string) => void
}

const BorrowItem: React.FC<Props> = ({ item, onReturn }) => {
  const calculatePenalty = () => {
    const today = new Date()
    const due = new Date(item.dueDate)

    if (today > due) {
      const diffDays = Math.ceil(
        (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
      )
      return diffDays * PENALTY_PER_DAY
    }
    return 0
  }

  const penaltyAmount = calculatePenalty()

  return (
    <View style={styles.card} accessibilityLabel={`Borrowed CD: ${item.title} by ${item.borrower}`}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.detail}>Borrower: {item.borrower}</Text>
      <Text style={styles.detail}>Borrow Date: {item.borrowDate}</Text>
      <Text style={styles.detail}>Due Date: {item.dueDate}</Text>
      <Text style={[styles.detail, penaltyAmount > 0 && styles.penaltyText]}>
        Penalty: PHP {penaltyAmount}
      </Text>

      <Button
        title="Return CD"
        onPress={() => onReturn(item.id)}
        accessibilityLabel={`Return ${item.title}`}
      />
    </View>
  )
}

export default BorrowItem

const styles = StyleSheet.create({
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginVertical: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  detail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },
  penaltyText: {
    color: "red",
    fontWeight: "bold",
  },
})
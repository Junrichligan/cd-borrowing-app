import React from "react"
import { Button, StyleSheet, Text, View } from "react-native"
import { CD } from "../types"

interface Props {
  cd: CD
  onBorrow: (id: string) => void
}

const CDItem: React.FC<Props> = ({ cd, onBorrow }) => {
  return (
    <View style={styles.card} accessibilityLabel={`CD: ${cd.title} by ${cd.artist}`}>
      <Text style={styles.title}>{cd.title}</Text>
      <Text style={styles.artist}>Artist: {cd.artist}</Text>
      <Text style={styles.copies}>Available Copies: {cd.copies}</Text>
      <Button
        title="Borrow CD"
        onPress={() => onBorrow(cd.id)}
        disabled={cd.copies === 0} // Disable button if no copies are available
        accessibilityLabel={`Borrow ${cd.title}`}
      />
    </View>
  )
}

export default CDItem

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
  artist: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },
  copies: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
})
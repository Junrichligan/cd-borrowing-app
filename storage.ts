import AsyncStorage from "@react-native-async-storage/async-storage"
import { Alert } from "react-native"

export const saveData = async (key: string, value: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch (error: any) {
    console.error(`Failed to save data for key '${key}':`, error)
    Alert.alert("Save Error", `Could not save data for ${key}. Details: ${error.message}`)
  }
}

export const loadData = async (key: string) => {
  try {
    const value = await AsyncStorage.getItem(key)
    return value != null ? JSON.parse(value) : null
  } catch (error: any) {
    console.error(`Failed to load data for key '${key}':`, error)
    Alert.alert("Load Error", `Could not load data for ${key}. Details: ${error.message}`)
    return null
  }
}
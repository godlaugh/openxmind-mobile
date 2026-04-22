import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import TreeTable from './src/components/TreeTable';
import { sampleData } from './src/data/sampleData';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F1F5F9" />
      <TreeTable data={sampleData} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
});

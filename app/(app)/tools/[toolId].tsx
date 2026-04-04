import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ALL_TOOLS } from '@/lib/tools/allTools';
import { ToolPlaceholderScreen } from '@/components/tools/ToolPlaceholderScreen';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export default function ToolPlaceholderRoute() {
  const { toolId } = useLocalSearchParams<{ toolId: string }>();
  const id = Array.isArray(toolId) ? toolId[0] : toolId;

  const tool = ALL_TOOLS.find((t) => t.id === id);

  if (!tool) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 px-5 pt-4" edges={['top']}>
        <Pressable onPress={() => router.back()} className="mb-6 flex-row items-center">
          <Ionicons name="arrow-back" size={24} color={Colors.brand[900]} />
          <Text className="ml-2 text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
            Back
          </Text>
        </Pressable>
        <Text className="text-xl text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
          Tool not found
        </Text>
        <Text className="mt-2 text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
          No tool with id &quot;{id}&quot;.
        </Text>
      </SafeAreaView>
    );
  }

  return <ToolPlaceholderScreen tool={tool} />;
}

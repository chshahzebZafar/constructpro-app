import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import * as Sentry from '@sentry/react-native';

type Props = { children: ReactNode };

type State = { error: Error | null };

/** Catches render errors so a startup failure shows a message instead of an instant exit. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
    Sentry.captureException(error, {
      extra: {
        componentStack: info.componentStack,
      },
    });
  }

  render() {
    if (this.state.error) {
      return (
        <View className="flex-1 justify-center bg-neutral-50 px-6">
          <ScrollView contentContainerStyle={{ paddingVertical: 24 }}>
            <Text className="text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              Something went wrong
            </Text>
            <Text className="mt-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
              {this.state.error.message}
            </Text>
            <Pressable
              onPress={() => this.setState({ error: null })}
              className="mt-6 min-h-[48px] items-center justify-center rounded-xl bg-brand-900 px-4"
            >
              <Text className="text-base text-white" style={{ fontFamily: 'Inter_500Medium' }}>
                Try again
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

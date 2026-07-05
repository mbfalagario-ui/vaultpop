import { Component, Fragment, type ErrorInfo, type PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

type RootErrorBoundaryState = {
  failed: boolean;
  restartKey: number;
};

export class RootErrorBoundary extends Component<
  PropsWithChildren,
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = {
    failed: false,
    restartKey: 0
  };

  static getDerivedStateFromError(): Partial<RootErrorBoundaryState> {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("VaultPop recovered from a render error.", error, info.componentStack);
  }

  private restart = () => {
    this.setState((current) => ({
      failed: false,
      restartKey: current.restartKey + 1
    }));
  };

  render() {
    if (this.state.failed) {
      return (
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.background,
            flex: 1,
            gap: spacing.lg,
            justifyContent: "center",
            padding: spacing.lg
          }}
        >
          <Text style={typography.title}>VaultPop</Text>
          <Text style={[typography.body, { textAlign: "center" }]}>
            VaultPop could not finish loading. Your local progress is still on this device.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={this.restart}
            style={{
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.gold,
              borderRadius: 8,
              borderWidth: 1,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md
            }}
          >
            <Text style={typography.button}>Restart app</Text>
          </Pressable>
        </View>
      );
    }

    return <Fragment key={this.state.restartKey}>{this.props.children}</Fragment>;
  }
}

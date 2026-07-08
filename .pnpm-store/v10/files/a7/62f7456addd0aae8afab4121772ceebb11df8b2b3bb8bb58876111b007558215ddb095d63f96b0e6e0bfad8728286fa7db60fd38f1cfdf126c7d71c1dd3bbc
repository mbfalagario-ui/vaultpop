import { TurboModuleRegistry, NativeModules } from "react-native";
// Support both old and new architecture
const isTurboModuleEnabled = global.__turboModuleProxy != null;
const RNViewShotModule = isTurboModuleEnabled
    ? TurboModuleRegistry.getEnforcing("RNViewShot")
    : NativeModules.RNViewShot;
export default RNViewShotModule;
//# sourceMappingURL=NativeRNViewShot.js.map
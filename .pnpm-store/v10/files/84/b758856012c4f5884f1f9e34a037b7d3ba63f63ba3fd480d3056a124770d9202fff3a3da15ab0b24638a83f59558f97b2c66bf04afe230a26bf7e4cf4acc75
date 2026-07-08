import type { TurboModule } from 'react-native';
import type { CodegenTypes } from 'react-native';
export interface Spec extends TurboModule {
    initializeApp(options: CodegenTypes.UnsafeObject, appConfig: CodegenTypes.UnsafeObject): Promise<CodegenTypes.UnsafeObject>;
    setAutomaticDataCollectionEnabled(appName: string, enabled: boolean): void;
    deleteApp(appName: string): Promise<void>;
    eventsNotifyReady(ready: boolean): void;
    eventsGetListeners(): Promise<CodegenTypes.UnsafeObject>;
    eventsPing(eventName: string, eventBody: CodegenTypes.UnsafeObject): Promise<CodegenTypes.UnsafeObject>;
    eventsAddListener(eventName: string): void;
    eventsRemoveListener(eventName: string, all: boolean): void;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
    metaGetAll(): Promise<CodegenTypes.UnsafeObject>;
    jsonGetAll(): Promise<CodegenTypes.UnsafeObject>;
    preferencesSetBool(key: string, value: boolean): Promise<void>;
    preferencesSetString(key: string, value: string): Promise<void>;
    preferencesGetAll(): Promise<CodegenTypes.UnsafeObject>;
    preferencesClearAll(): Promise<void>;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeAppModule.d.ts.map
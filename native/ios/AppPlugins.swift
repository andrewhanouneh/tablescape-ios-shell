// Plugins that live in this app target (npm plugins register themselves): NativeSSO, Sign in with Apple and Google (SSO.md).
import Capacitor

enum AppPlugins {
    static func register(on bridge: CAPBridgeProtocol?) {
        guard let bridge = bridge else { return }
        bridge.registerPluginInstance(NativeSSOPlugin())
    }
}

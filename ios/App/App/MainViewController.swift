// The app's bridge view controller (Main.storyboard's custom class). It adds what the store app brings to the hosted web app:
// native.js at document start on the app's own pages (share sheet, downloads, haptics, in-app browser, offline banner),
// and registers the app's own plugins (AppPlugins.swift).
import UIKit
import WebKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        AppPlugins.register(on: bridge)
        injectNativeScript()
    }

    private func injectNativeScript() {
        guard let url = Bundle.main.url(forResource: "native", withExtension: "js", subdirectory: "public"),
              let source = try? String(contentsOf: url, encoding: .utf8),
              let controller = webView?.configuration.userContentController else { return }
        controller.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }
}

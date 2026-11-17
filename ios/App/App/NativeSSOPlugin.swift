// NativeSSO for the iPhone app (Capacitor 8): Sign in with Apple in Apple's sheet, and Google in the system sign-in sheet.
// Both hand the page an ID token made for this app with the page's nonce; the page sends it to Supabase (signInWithIdToken).
// Google runs the way Google's own iOS library does: the app's iOS OAuth client, authorization code with PKCE, back through the
// client's reversed ID (com.googleusercontent.apps.<id>), then the code is swapped for an ID token right here. No Supabase session
// or token ever travels through an app address, so another app claiming one gets nothing.
// patch-native.mjs adds it to the App target, registers it in AppPlugins.swift and gives the target App.entitlements
// (Sign in with Apple). See SSO.md next to this folder.
import Foundation
import Capacitor
import AuthenticationServices
import CryptoKit

@objc(NativeSSOPlugin)
public class NativeSSOPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "NativeSSOPlugin"
    public let jsName = "NativeSSO"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "appleSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "googleSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "passkeySupport", returnType: CAPPluginReturnPromise),
    ]
    private var appleCall: CAPPluginCall?
    private var appleController: ASAuthorizationController?
    private var webSession: ASWebAuthenticationSession?

    /// -> { supported }: passkeys work in this app's web view (iOS 16+, with the webcredentials:tablescape.vip associated domain
    /// in App.entitlements and /.well-known/apple-app-site-association on tablescape.vip; docs/passkeys-2fa.md)
    @objc func passkeySupport(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) { call.resolve(["supported": true]) } else { call.resolve(["supported": false]) }
    }

    /// { nonce: sha256(raw nonce) as hex } -> { identityToken, authorizationCode, user, email, givenName, familyName }
    @objc func appleSignIn(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), nonce.count >= 32 else { call.reject("nonce required"); return }
        DispatchQueue.main.async {
            if self.appleCall != nil { call.reject("a sign-in is already open"); return }
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = nonce
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.appleCall = call
            self.appleController = controller
            controller.performRequests()
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = appleCall else { return }
        appleCall = nil; appleController = nil
        guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = cred.identityToken, let token = String(data: tokenData, encoding: .utf8) else {
            call.reject("Apple sent no identity token"); return
        }
        let code = cred.authorizationCode.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        call.resolve([
            "identityToken": token,
            "authorizationCode": code,
            "user": cred.user,
            "email": cred.email ?? "",
            // Apple gives the name only the first time someone signs in to this app; the page saves it then
            "givenName": cred.fullName?.givenName ?? "",
            "familyName": cred.fullName?.familyName ?? "",
        ])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = appleCall else { return }
        appleCall = nil; appleController = nil
        if let e = error as? ASAuthorizationError, e.code == .canceled { call.reject("canceled", "canceled"); return }
        call.reject(error.localizedDescription)
    }

    /// { clientId: the app's iOS OAuth client ID, nonce: sha256(raw nonce) as hex } -> { idToken }
    @objc func googleSignIn(_ call: CAPPluginCall) {
        guard let clientId = call.getString("clientId"), clientId.hasSuffix(".apps.googleusercontent.com"),
              let nonce = call.getString("nonce"), nonce.count >= 32 else { call.reject("clientId and nonce required"); return }
        let scheme = "com.googleusercontent.apps." + clientId.replacingOccurrences(of: ".apps.googleusercontent.com", with: "")
        let redirect = scheme + ":/oauth2redirect"
        let verifier = Self.random(48), state = Self.random(24)
        let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URL
        var q = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        q.queryItems = [URLQueryItem(name: "client_id", value: clientId), URLQueryItem(name: "redirect_uri", value: redirect),
                        URLQueryItem(name: "response_type", value: "code"), URLQueryItem(name: "scope", value: "openid email profile"),
                        URLQueryItem(name: "code_challenge", value: challenge), URLQueryItem(name: "code_challenge_method", value: "S256"),
                        URLQueryItem(name: "state", value: state), URLQueryItem(name: "nonce", value: nonce),
                        URLQueryItem(name: "prompt", value: "select_account")]
        DispatchQueue.main.async {
            if self.webSession != nil { call.reject("a sign-in is already open"); return }
            let session = ASWebAuthenticationSession(url: q.url!, callbackURLScheme: scheme) { back, error in
                self.webSession = nil
                if let e = error as? ASWebAuthenticationSessionError, e.code == .canceledLogin { call.reject("canceled", "canceled"); return }
                guard let back = back, let items = URLComponents(url: back, resolvingAgainstBaseURL: false)?.queryItems else {
                    call.reject(error?.localizedDescription ?? "Google sign-in did not finish"); return
                }
                let value = { (n: String) in items.first(where: { $0.name == n })?.value }
                guard value("state") == state else { call.reject("Google sign-in came back for another request"); return }
                guard let code = value("code") else { call.reject(value("error") ?? "Google sign-in did not finish"); return }
                Self.exchange(code: code, clientId: clientId, redirect: redirect, verifier: verifier) { idToken, err in
                    if let t = idToken { call.resolve(["idToken": t]) } else { call.reject(err ?? "Google sign-in did not finish") }
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.webSession = session
            if !session.start() { self.webSession = nil; call.reject("could not open the sign-in sheet") }
        }
    }

    private static func exchange(code: String, clientId: String, redirect: String, verifier: String, done: @escaping (String?, String?) -> Void) {
        var req = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var form = URLComponents()
        form.queryItems = [URLQueryItem(name: "code", value: code), URLQueryItem(name: "client_id", value: clientId),
                           URLQueryItem(name: "redirect_uri", value: redirect), URLQueryItem(name: "code_verifier", value: verifier),
                           URLQueryItem(name: "grant_type", value: "authorization_code")]
        req.httpBody = form.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B").data(using: .utf8)
        URLSession.shared.dataTask(with: req) { data, _, error in
            guard let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                done(nil, error?.localizedDescription ?? "Google didn't answer"); return
            }
            if let t = json["id_token"] as? String { done(t, nil) } else { done(nil, (json["error_description"] as? String) ?? "Google refused the sign-in") }
        }.resume()
    }

    private static func random(_ bytes: Int) -> String {
        var b = [UInt8](repeating: 0, count: bytes)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes, &b)
        return Data(b).base64URL
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.webView?.window ?? ASPresentationAnchor()
    }
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.webView?.window ?? ASPresentationAnchor()
    }
}

private extension Data {
    var base64URL: String {
        base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}
